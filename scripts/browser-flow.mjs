export default async (page) => {
  const base = __BASE_URL__;
  const maps = __MAPS__;
  const ensure = (condition, message) => { if (!condition) throw new Error(message); };
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  let starts = 0;
  page.on('request', (request) => { if (request.url().endsWith('/api/sessions/start')) starts++; });
  let releaseImage;
  const imageGate = new Promise((resolve) => { releaseImage = resolve; });
  await page.route('**/images/waldo-beach.jpg', async (route) => { await imageGate; await route.continue(); });
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Start game', exact: true }).click();
  await page.locator('.waldo-image').waitFor({ state: 'attached' });
  ensure(starts === 0, 'Session started before the puzzle image loaded');
  ensure((await page.locator('.timer-badge').innerText()).includes('00:00'), 'Timer advanced before image load');
  releaseImage();
  await page.getByRole('status').filter({ hasText: 'Click a character' }).waitFor();
  ensure(starts === 1, 'Image load did not create exactly one session');
  await page.unroute('**/images/waldo-beach.jpg');
  await page.setViewportSize({ width: 1280, height: 900 });
  async function clickImage(x, y) {
    const image = page.locator('.waldo-image');
    const bounds = await image.boundingBox();
    await image.click({ position: { x: bounds.width*x/100, y: bounds.height*y/100 } });
  }
  async function tag(name, x, y) {
    await clickImage(x, y);
    const response = page.waitForResponse((response) => response.url().includes('/validate') && response.request().method() === 'POST');
    await page.locator('.dropdown-item').filter({ hasText: name }).click();
    const result = await response;
    ensure(result.status() === 200, `Tag API failed for ${name}`);
    return result.json();
  }
  await clickImage(10, 10);
  ensure(await page.locator('.targeting-dropdown').count() === 1, 'Target dropdown did not appear');
  await page.getByRole('heading', {name:"Where's Waldo?",exact:true}).click();
  ensure(await page.locator('.targeting-dropdown').count() === 0, 'Header click did not close dropdown');
  await clickImage(10, 10);
  await clickImage(20, 20);
  ensure(await page.locator('.targeting-dropdown').count() === 0, 'Image click-away did not close dropdown');
  await clickImage(10, 10);
  await page.keyboard.press('Escape');
  ensure(await page.locator('.targeting-dropdown').count() === 0, 'Escape did not close dropdown');
  ensure((await tag('Waldo', 5, 5)).isCorrect === false, 'Wrong location accepted');
  ensure(await page.locator('.found-marker').count() === 0, 'Wrong tag placed a marker');
  ensure(await page.locator('.targeting-dropdown').count() === 0, 'Wrong tag left dropdown open');

  const results = [];
  for (let index=0;index<maps.length;index++) {
    const map = maps[index];
    if(index > 0) {
      await page.getByRole('dialog').getByRole('button',{name:'Choose another map',exact:true}).click();
      await page.getByRole('button',{name:map.name,exact:true}).click();
      await page.getByRole('button',{name:'Start game',exact:true}).click();
      await page.getByRole('status').filter({hasText:'Click a character'}).waitFor();
    }
    await page.setViewportSize(index===2?{width:390,height:844}:{width:1280,height:900});
    for (let targetIndex=0;targetIndex<map.characters.length;targetIndex++) {
      const character=map.characters[targetIndex];
      const x=(character.xMin+character.xMax)/2;
      const y=(character.yMin+character.yMax)/2;
      if(index===2 && targetIndex===0) {
        await clickImage(x,y);
        const dropdown=await page.locator('.targeting-dropdown').boundingBox();
        ensure(dropdown.x>=0&&dropdown.x+dropdown.width<=390, 'Mobile edge dropdown is clipped');
        await page.keyboard.press('Escape');
      }
      const data=await tag(character.name,x,y);
      ensure(data.isCorrect, `${map.name}: correct ${character.name} was rejected`);
      if(targetIndex<map.characters.length-1) {
        await page.getByRole('status').filter({hasText:'Click a character'}).waitFor();
        ensure(await page.locator('.found-marker').count()===targetIndex+1, 'Marker count incorrect');
        if(index===0&&targetIndex===0) {
          await clickImage(10,10);
          ensure(await page.locator('.dropdown-item').filter({hasText:'Waldo'}).count()===0,'Already-found character remains selectable');
          await page.keyboard.press('Escape');
        }
      } else {
        await page.getByRole('dialog').waitFor();
        ensure(data.completed&&Number.isFinite(data.timeInSeconds),'Final tag did not return server completion time');
        ensure((await page.locator('.modal-time').innerText()).includes((data.timeInSeconds%60).toFixed(2)),'Displayed final time differs from server');
        await page.evaluate(async () => {
          const animations = document.getAnimations().filter((animation) => animation.effect.getComputedTiming().iterations !== Infinity);
          await Promise.all(animations.map((animation) => animation.finished.catch(() => {})));
        });
        await page.screenshot({path:`output/playwright/${index===2?'mobile':'desktop'}-${index}-win.png`});
        if(data.qualifiesForLeaderboard) {
          await page.getByLabel('Enter your name for the leaderboard:').fill(`Browser player ${index}`);
          // Hold the name form; the saved time must still equal the final-tag result.
          await page.waitForTimeout(400);
          const savedResponse=page.waitForResponse((response)=>response.url().includes('/finish')&&response.request().method()==='POST');
          await page.getByRole('button',{name:'Submit Score',exact:true}).click();
          const saved=await savedResponse;
          ensure(saved.status()===200,'Score submission failed');
          const body=await saved.json();
          ensure(body.score.timeInSeconds===data.timeInSeconds,'Name-entry delay altered the saved time');
          await page.locator('.highlight-row').waitFor();
          ensure((await page.locator('.highlight-row').innerText()).includes(`Browser player ${index}`),'Saved score is not highlighted');
        }
        results.push({map:map.name,targets:map.characters.length,time:data.timeInSeconds});
      }
    }
  }
  const mobileOverflow = await page.evaluate(() => ({width:document.documentElement.scrollWidth,viewport:window.innerWidth,overflow:[...document.querySelectorAll('*')].map((element)=>({class:element.className,left:element.getBoundingClientRect().left,right:element.getBoundingClientRect().right})).filter((element)=>element.right>window.innerWidth+0.1)}));
  ensure(mobileOverflow.width<=mobileOverflow.viewport,`Mobile page overflows horizontally: ${JSON.stringify(mobileOverflow)}`);
  await page.getByRole('dialog').getByRole('button',{name:'Play Again',exact:true}).click();
  await page.getByRole('status').filter({hasText:'Click a character'}).waitFor();
  ensure(await page.locator('.found-marker').count()===0,'Replay kept old markers');
  await page.route('**/api/sessions/*/validate', async (route) => {
    const response = await route.fetch();
    const body = await response.json();
    await route.fulfill({response,json:{...body,qualifiesForLeaderboard:false}});
  });
  for (const character of maps.at(-1).characters) await tag(character.name,(character.xMin+character.xMax)/2,(character.yMin+character.yMax)/2);
  await page.getByRole('dialog').waitFor();
  ensure(await page.locator('#player-name').count()===0,'Nonqualifying score still asks for a name');
  ensure((await page.getByRole('dialog').innerText()).includes('did not qualify'),'Nonqualifying completion is missing');
  await page.unroute('**/api/sessions/*/validate');
  await page.getByRole('dialog').getByRole('button',{name:'Choose another map',exact:true}).click();
  ensure(await page.locator('.map-card').count()===maps.length,'Map picker did not return');
  // Recoverable API failures should show a useful retry, not an empty page.
  await page.route('**/api/maps', (route)=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'Fixture offline'})}));
  await page.reload();
  await page.getByRole('alert').waitFor();
  await page.unroute('**/api/maps');
  await page.getByRole('button',{name:'Try again',exact:true}).click();
  await page.getByRole('button',{name:'Start game',exact:true}).waitFor();
  await page.screenshot({path:'output/playwright/mobile-map-picker.png'});
  ensure(errors.length===0,`Unexpected browser errors: ${errors.join('; ')}`);
  return { passed: true, results, checks: ['image-load timing','outside dismissal','wrong tags','markers','all maps','frozen score','replay','mobile layout','nonqualifying round','network recovery'] };
};
