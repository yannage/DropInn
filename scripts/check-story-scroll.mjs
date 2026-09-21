import assert from 'node:assert/strict';

const settle = page => page.waitForTimeout(420); // The specified 350ms visual transition, not server synchronization.
async function checkPaperContainment(page) {
  const layout = await page.locator('#adventure-story-scroll').evaluate(panel => {
    const paper = panel.querySelector('.di-scroll-paper').getBoundingClientRect();
    const reader = panel.querySelector('.di-scroll-reading');
    const boxes = [...panel.querySelectorAll('header, header h2, header button, .di-scroll-clock, .di-scroll-reading')]
      .map(node => ({ name: node.getAttribute('aria-label') || node.tagName, rect: node.getBoundingClientRect().toJSON() }));
    return {paper:paper.toJSON(), boxes, readerHeight:reader.clientHeight, horizontalOverflow:reader.scrollWidth>reader.clientWidth+1};
  });
  assert.ok(layout.readerHeight>=44, 'The log must have visible reading space, not just an outer frame.');
  assert.equal(layout.horizontalOverflow,false,'Story text must wrap inside the paper.');
  for(const {name,rect} of layout.boxes) {
    assert.ok(rect.left>=layout.paper.left && rect.right<=layout.paper.right+1 && rect.top>=layout.paper.top && rect.bottom<=layout.paper.bottom+1, `${name} must stay inside the parchment.`);
  }
  // The same source and crop must supply both rollers and the collapsed trigger.
  const sources=await page.locator('.di-scroll-roller image').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('href')));
  assert.equal(new Set(sources).size,1);
}
export async function checkStoryScroll(page) {
  const story=page.getByRole('button',{name:'Story',exact:true});
  for(const viewport of [{width:1280,height:1100},{width:1280,height:800},{width:390,height:844},{width:320,height:568}]) {
    await page.setViewportSize(viewport);
    await story.click(); await settle(page);
    const compact=await page.locator('#adventure-story-scroll').boundingBox();
    const dock=await page.locator('.di-scene-dock').boundingBox();
    assert.ok(compact.y+compact.height<=dock.y && compact.x>=0 && compact.x+compact.width<=viewport.width);
    await checkPaperContainment(page);
    if(viewport.height===1100) await page.screenshot({path:'output/playwright/story-scroll-compact-tall-desktop.png'});
    await page.screenshot({path:`output/playwright/story-scroll-compact-${viewport.width}.png`});
    await page.getByRole('button',{name:'Expand story',exact:true}).click(); await settle(page);
    assert.equal(await page.locator('.di-app').evaluate(node=>node.inert),true);
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(()=>!!document.activeElement.closest('[role="dialog"]')),true);
    const full=await page.locator('#adventure-story-scroll').boundingBox();
    assert.ok(full.height<=viewport.height && full.y>=0 && full.width<=720);
    await checkPaperContainment(page);
    if(viewport.height===1100) await page.screenshot({path:'output/playwright/story-scroll-full-tall-desktop.png'});
    await page.screenshot({path:`output/playwright/story-scroll-full-${viewport.width}.png`});
    await page.keyboard.press('Escape'); await settle(page);
    assert.equal(await page.locator('.di-app').evaluate(node=>node.inert),false);
    await page.keyboard.press('Escape'); await settle(page);
    assert.equal(await story.evaluate(node=>node===document.activeElement),true);
  }
  await story.click(); await settle(page);
  const reading=page.locator('.di-scroll-reading');
  await reading.evaluate(node=>{node.scrollTop=0;}); await page.waitForTimeout(30);
  const detail=reading.locator('details').first(); await detail.locator('summary').click();
  await page.getByRole('button',{name:'Expand story',exact:true}).click(); await settle(page);
  assert.equal(await detail.getAttribute('open'),'');
  await page.getByRole('button',{name:'Compact view',exact:true}).click(); await settle(page);
  assert.equal(await detail.getAttribute('open'),'');
  await reading.evaluate(node=>{node.scrollTop=0;}); await page.waitForTimeout(30);
  await page.getByRole('button',{name:'Party',exact:true}).click();
  assert.equal(await page.locator('#adventure-story-scroll').getAttribute('aria-hidden'),'true');
  await page.keyboard.press('Escape'); await settle(page);
  assert.equal(await page.locator('#adventure-story-scroll').getAttribute('aria-hidden'),'false');
  assert.ok(await reading.evaluate(node=>node.scrollTop<3));
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.getByRole('button',{name:'Expand story',exact:true}).click(); await settle(page);
  await page.evaluate(()=>document.documentElement.style.fontSize='32px');
  await checkPaperContainment(page);
  assert.ok(await page.locator('.di-scroll-reading').evaluate(node=>node.clientHeight>0 && node.scrollHeight>node.clientHeight));
  await page.screenshot({path:'output/playwright/story-scroll-enlarged-text.png'});
  await page.evaluate(()=>document.documentElement.style.fontSize='');
  await page.getByRole('button',{name:'Roll up',exact:true}).click();
  await page.emulateMedia({reducedMotion:'no-preference'});
  console.log('Story scroll: responsive modes, focus, details, reading position, sheet suspension and reduced motion passed.');
}

export async function watchStoryWhileWaiting(page) {
  await page.getByRole('button',{name:'Story',exact:true}).click(); await settle(page);
  await page.locator('.di-scroll-reading').evaluate(node=>{node.scrollTop=0;});
  await page.waitForTimeout(30);
}
export async function verifyNewStoryEvents(page) {
  await page.getByRole('button',{name:'New events ↓',exact:true}).waitFor();
  assert.ok(await page.locator('.di-scroll-reading').evaluate(node=>node.scrollTop<3));
  await page.getByRole('button',{name:'New events ↓',exact:true}).click();
  assert.ok(await page.locator('.di-scroll-reading').evaluate(node=>node.scrollHeight-node.clientHeight-node.scrollTop<24));
  await page.getByRole('button',{name:'Roll up',exact:true}).click(); await settle(page);
  console.log('Story scroll: real two-player results preserve earlier reading and jump to new events.');
}
