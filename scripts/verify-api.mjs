import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { PrismaClient } from '../server/node_modules/@prisma/client/default.js';
import { maps as expectedMaps } from '../server/prisma/maps.js';

const directory = mkdtempSync(path.join(tmpdir(), 'waldo-check-'));
const databasePath = path.join(directory, 'fresh.db');
const url = `file:${databasePath}`;
let server;
let prisma;
let serverOutput = '';
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
function run(command, args, env) {
  const result = spawnSync(command, args, { cwd: 'server', env: { ...process.env, ...env }, encoding: 'utf8' });
  assert.equal(result.status, 0, `${command} ${args.join(' ')}\n${result.stdout}\n${result.stderr}`);
}
async function freePort() {
  const listener = net.createServer();
  await new Promise((resolve) => listener.listen(0, '127.0.0.1', resolve));
  const port = listener.address().port;
  await new Promise((resolve) => listener.close(resolve));
  return port;
}
try {
  // Verify upgrade from the original schema, including preservation of a legacy score.
  const upgradePath = path.join(directory, 'upgrade.db');
  const initialMigration = readFileSync('server/prisma/migrations/20260927051648_init/migration.sql', 'utf8');
  const oldData = `INSERT INTO Map (id,name,imageUrl) VALUES (1,'Waldo at the Beach','/images/waldo-beach.jpg');
    INSERT INTO Character (id,name,avatarUrl,xMin,xMax,yMin,yMax,mapId) VALUES (1,'Waldo','/images/waldo.svg',59,64,32,37,1);
    INSERT INTO Score (id,playerName,timeInSeconds,mapId) VALUES (1,'Existing player',42,1);`;
  const sqlite = spawnSync('sqlite3', [upgradePath], { input: initialMigration + oldData, encoding: 'utf8' });
  assert.equal(sqlite.status, 0, sqlite.stderr);
  const upgradeEnv = { DATABASE_URL: `file:${upgradePath}` };
  run('npx', ['prisma','migrate','resolve','--applied','20260927051648_init'], upgradeEnv);
  run('npx', ['prisma','migrate','deploy'], upgradeEnv);
  run('npx', ['prisma','db','seed'], upgradeEnv);
  run('npx', ['prisma','db','seed'], upgradeEnv);
  const upgraded = new PrismaClient({ datasources: { db: { url: upgradeEnv.DATABASE_URL } } });
  try {
    const score = await upgraded.score.findUnique({ where: { id: 1 } });
    assert.equal(score.playerName, 'Existing player');
    assert.equal(score.timeInSeconds, 42);
    assert.equal(score.sessionId, null);
    assert.equal((await upgraded.character.findUnique({where:{id:1}})).xMin, expectedMaps[0].characters[0].xMin);
    assert.equal(await upgraded.map.count(), expectedMaps.length);
    assert.equal(await upgraded.character.count(), expectedMaps.reduce((total,map)=>total+map.characters.length,0));
  } finally { await upgraded.$disconnect(); }

  writeFileSync(databasePath, '');
  run('npx', ['prisma','validate'], { DATABASE_URL: url });
  run('npx', ['prisma','migrate','deploy'], { DATABASE_URL: url });
  run('npx', ['prisma','db','seed'], { DATABASE_URL: url });
  prisma = new PrismaClient({ datasources: { db: { url } } });
  const port = await freePort();
  const base = `http://127.0.0.1:${port}`;
  server = spawn(process.execPath, ['src/app.js'], { cwd: 'server', env: { ...process.env, DATABASE_URL: url, PORT: String(port) }, stdio: ['ignore','pipe','pipe'] });
  server.stdout.on('data', (chunk) => { serverOutput += chunk; });
  server.stderr.on('data', (chunk) => { serverOutput += chunk; });
  let ready = false;
  for(let attempt=0;attempt<100;attempt++) {
    try { ready = (await fetch(`${base}/api/health`)).ok; } catch { /* server starting */ }
    if(ready) break;
    await delay(100);
  }
  assert.ok(ready, serverOutput);
  async function request(route, body) {
    const response = await fetch(`${base}/api${route}`, body === undefined ? {} : {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    return { status: response.status, data: await response.json() };
  }
  const mapResponse = await request('/maps');
  assert.equal(mapResponse.status,200);
  assert.equal(mapResponse.data.length, expectedMaps.length);
  assert.equal((await request('/maps/not-a-number')).status,400);
  assert.equal((await request('/maps/999999')).status,404);
  assert.equal((await request('/sessions/start',{mapId:'1oops'})).status,400);
  assert.equal((await request('/sessions/start',{mapId:999999})).status,404);
  assert.equal((await request('/maps/999999/scores')).status,404);
  const allCharacters = await prisma.character.findMany();

  for (const map of mapResponse.data) {
    const publicMap = (await request(`/maps/${map.id}`)).data;
    assert.ok(publicMap.characters.every((character)=>!('xMin' in character)&&!('yMin' in character)));
    const targets = allCharacters.filter((character)=>character.mapId===map.id);
    const original = expectedMaps.find((entry)=>entry.name===map.name);
    assert.equal(targets.length, original.characters.length);
    for(const target of targets) {
      const configured = original.characters.find((entry)=>entry.name===target.name);
      for(const key of ['xMin','xMax','yMin','yMax']) assert.equal(target[key],configured[key]);
    }
    const started = await request('/sessions/start',{mapId:map.id});
    assert.equal(started.status,200);
    const sessionId=started.data.sessionId;
    const validate=(character,x,y)=>request(`/sessions/${sessionId}/validate`,{characterId:character.id,x,y});
    assert.equal((await request(`/sessions/${sessionId}/finish`,{playerName:'Too early'})).status,409);
    assert.equal((await validate(targets[0],0,0)).data.isCorrect,false);
    assert.equal(await prisma.foundTag.count({where:{sessionId}}),0);
    for(const [x,y] of [[null,50],['50',50],[-1,50],[101,50],[50,-1],[50,101]]) assert.equal((await validate(targets[0],x,y)).status,400);
    const other = allCharacters.find((character)=>character.mapId!==map.id);
    assert.equal((await validate(other,50,50)).status,404);
    const tag=(target)=>validate(target,(target.xMin+target.xMax)/2,(target.yMin+target.yMax)/2);
    const first=await tag(targets[0]);
    assert.equal(first.data.isCorrect,true);
    assert.equal(first.data.completed,false);
    assert.equal((await tag(targets[0])).data.completed,false);
    assert.equal(await prisma.foundTag.count({where:{sessionId}}),1);
    const boundary = await validate(targets[0],targets[0].xMin,targets[0].yMin);
    assert.equal(boundary.data.isCorrect,true);
    assert.equal((await validate(targets[0],targets[0].xMin-0.1,targets[0].yMin)).data.isCorrect,false);
    // Concurrent retries must not double count a found target.
    const retries=await Promise.all([tag(targets[0]),tag(targets[0])]);
    assert.ok(retries.every((result)=>result.status===200));
    assert.equal(await prisma.foundTag.count({where:{sessionId}}),1);
    await prisma.gameSession.update({where:{id:sessionId},data:{startTime:new Date(Date.now()-12000)}});
    let final;
    for(const target of targets.slice(1)) {final=await tag(target);assert.equal(final.status,200);assert.equal(final.data.isCorrect,true);}
    assert.equal(final.data.completed,true);
    assert.equal(final.data.qualifiesForLeaderboard,true);
    assert.ok(final.data.timeInSeconds>=12&&final.data.timeInSeconds<15);
    const frozen=await prisma.gameSession.findUnique({where:{id:sessionId}});
    assert.ok(frozen.endTime);
    assert.equal(final.data.timeInSeconds,Number(((frozen.endTime-frozen.startTime)/1000).toFixed(2)));
    const recovered = await tag(targets.at(-1));
    assert.equal(recovered.status,200);
    assert.equal(recovered.data.completed,true);
    assert.equal(recovered.data.timeInSeconds,final.data.timeInSeconds);
    assert.equal((await validate(targets[0],0,0)).status,409);
    await delay(350);
    for(const name of [null,42,'   ','x'.repeat(31)]) assert.equal((await request(`/sessions/${sessionId}/finish`,{playerName:name})).status,400);
    const saved=await request(`/sessions/${sessionId}/finish`,{playerName:'  Verified player  '});
    assert.equal(saved.status,200);
    assert.equal(saved.data.score.playerName,'Verified player');
    assert.equal(saved.data.score.timeInSeconds,final.data.timeInSeconds);
    const duplicates=await Promise.all([request(`/sessions/${sessionId}/finish`,{playerName:'Duplicate 1'}),request(`/sessions/${sessionId}/finish`,{playerName:'Duplicate 2'})]);
    assert.ok(duplicates.every((response)=>response.status===200&&response.data.score.id===saved.data.score.id));
    assert.equal(await prisma.score.count({where:{sessionId}}),1);
    assert.equal((await prisma.gameSession.findUnique({where:{id:sessionId}})).endTime.getTime(),frozen.endTime.getTime());
    const scores=(await request(`/maps/${map.id}/scores`)).data;
    assert.equal(scores[0].id,saved.data.score.id);
    console.log(`Verified ${map.name}: ${targets.length} targets, immutable time, one score`);
  }
  // Known old false-positive location must now fail.
  const glutton=mapResponse.data.find((map)=>map.name==='The Gobbling Gluttons');
  const gluttonSession=(await request('/sessions/start',{mapId:glutton.id})).data.sessionId;
  const waldo=allCharacters.find((character)=>character.mapId===glutton.id&&character.name==='Waldo');
  assert.equal((await request(`/sessions/${gluttonSession}/validate`,{characterId:waldo.id,x:94.5,y:32.5})).data.isCorrect,false);

  const last=mapResponse.data.at(-1);
  // Legacy scores stay in the database but do not displace verified rounds.
  const legacy=await prisma.score.create({data:{playerName:'Legacy',timeInSeconds:0.001,mapId:last.id}});
  assert.ok(!(await request(`/maps/${last.id}/scores`)).data.some((score)=>score.id===legacy.id));
  for(let index=0;index<10;index++) {
    const session=await prisma.gameSession.create({data:{mapId:last.id,startTime:new Date(Date.now()-20000),endTime:new Date()}});
    await prisma.score.create({data:{mapId:last.id,sessionId:session.id,playerName:`Fixture ${index}`,timeInSeconds:index+1}});
  }
  async function completeWithDuration(milliseconds) {
    const sessionId=(await request('/sessions/start',{mapId:last.id})).data.sessionId;
    await prisma.gameSession.update({where:{id:sessionId},data:{startTime:new Date(Date.now()-milliseconds)}});
    let result;
    for(const target of allCharacters.filter((character)=>character.mapId===last.id)) {
      result=await request(`/sessions/${sessionId}/validate`,{characterId:target.id,x:(target.xMin+target.xMax)/2,y:(target.yMin+target.yMax)/2});
      assert.equal(result.status,200);
    }
    return result.data;
  }
  assert.equal((await completeWithDuration(50000)).qualifiesForLeaderboard,false);
  assert.equal((await completeWithDuration(0)).qualifiesForLeaderboard,true);
  const top=(await request(`/maps/${last.id}/scores`)).data;
  assert.equal(top.length,10);
  assert.ok(top.every((score,index)=>index===0||top[index-1].timeInSeconds<=score.timeInSeconds));
  assert.equal((await request('/sessions/not-real/finish',{playerName:'Player'})).status,404);
  for(const map of mapResponse.data) {
    const response=await fetch(base+map.imageUrl);
    assert.equal(response.status,200);
    assert.ok(response.headers.get('content-type').includes('image/jpeg'));
    const bytes=new Uint8Array(await response.arrayBuffer());
    assert.equal(bytes[0],255);assert.equal(bytes[1],216);
  }
  assert.equal((await fetch(base)).status,200);
  assert.equal((await fetch(base+'/api/unknown')).status,404);
  console.log('API_CHECKS_PASSED');
} finally {
  if(server) {
    const exited=new Promise((resolve)=>server.once('exit',resolve));
    server.kill('SIGTERM');
    await Promise.race([exited,delay(3000)]);
  }
  if(prisma) await prisma.$disconnect();
  rmSync(directory,{recursive:true,force:true});
}
