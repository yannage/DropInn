import assert from 'node:assert/strict';

const settle = page => page.waitForTimeout(420); // The specified 350ms visual transition, not server synchronization.
export async function checkStoryScroll(page) {
  const story=page.getByRole('button',{name:'Story',exact:true});
  for(const viewport of [{width:1280,height:800},{width:390,height:844},{width:320,height:568}]) {
    await page.setViewportSize(viewport);
    await story.click(); await settle(page);
    const compact=await page.locator('#adventure-story-scroll').boundingBox();
    const dock=await page.locator('.di-scene-dock').boundingBox();
    assert.ok(compact.y+compact.height<=dock.y && compact.x>=0 && compact.x+compact.width<=viewport.width);
    await page.screenshot({path:`output/playwright/story-scroll-compact-${viewport.width}.png`});
    await page.getByRole('button',{name:'Expand story',exact:true}).click(); await settle(page);
    assert.equal(await page.locator('.di-app').evaluate(node=>node.inert),true);
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(()=>!!document.activeElement.closest('[role="dialog"]')),true);
    const full=await page.locator('#adventure-story-scroll').boundingBox();
    assert.ok(full.height<=viewport.height && full.y>=0 && full.width<=720);
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
