import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import net from 'node:net';
import { maps } from '../server/prisma/maps.js';

const directory=mkdtempSync(path.join(tmpdir(),'waldo-browser-'));
const database=path.join(directory,'browser.db');
writeFileSync(database,'');
mkdirSync('output/playwright',{recursive:true});
const env={...process.env,DATABASE_URL:`file:${database}`};
const session=`waldo-check-${Date.now()}`;
let server;
const cli=(...args)=> {
  const result=spawnSync('npx',['--yes','--package','@playwright/cli@0.1.21','playwright-cli',`-s=${session}`,...args],{encoding:'utf8',timeout:120000});
  assert.equal(result.status,0,result.stdout+'\n'+result.stderr);
  return result.stdout;
};
try {
  for(const args of [['prisma','migrate','deploy'],['prisma','db','seed']]) {
    const result=spawnSync('npx',args,{cwd:'server',env,encoding:'utf8'});
    assert.equal(result.status,0,result.stdout+'\n'+result.stderr);
  }
  const listener=net.createServer();
  await new Promise((resolve)=>listener.listen(0,'127.0.0.1',resolve));
  const port=listener.address().port;
  await new Promise((resolve)=>listener.close(resolve));
  const base=`http://127.0.0.1:${port}`;
  server=spawn(process.execPath,['src/app.js'],{cwd:'server',env:{...env,PORT:String(port)},stdio:'ignore'});
  let ready=false;
  for(let index=0;index<100;index++) {
    try {ready=(await fetch(base+'/api/health')).ok;}catch{/* starting */}
    if(ready)break;
    await new Promise((resolve)=>setTimeout(resolve,100));
  }
  assert.ok(ready,'Browser test server did not start');
  cli('open','about:blank','--headed');
  const code=readFileSync('scripts/browser-flow.mjs','utf8').replace('export default ','').replace('__BASE_URL__',JSON.stringify(base)).replace('__MAPS__',JSON.stringify(maps)).replace(/;\s*$/,'');
  const raw=cli('run-code',code,'--raw');
  const result=JSON.parse(raw);
  assert.equal(result.passed,true);
  console.log(JSON.stringify(result));
  console.log('BROWSER_CHECKS_PASSED');
} finally {
  try {cli('close');}catch{/* browser may not have started */}
  if(server) {
    const exit=new Promise((resolve)=>server.once('exit',resolve));
    server.kill('SIGTERM');
    await Promise.race([exit,new Promise((resolve)=>setTimeout(resolve,3000))]);
  }
  rmSync(directory,{recursive:true,force:true});
}
