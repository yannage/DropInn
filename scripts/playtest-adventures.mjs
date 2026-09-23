import { chromium } from 'playwright';
import { createServer } from 'vite';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import {checkStoryScroll,watchStoryWhileWaiting,verifyNewStoryEvents} from './check-story-scroll.mjs';

const base = process.argv[2] ?? 'http://127.0.0.1:5198';
const url = new URL(base);
assert.ok(url.protocol === 'http:' && ['localhost','127.0.0.1','[::1]'].includes(url.hostname) && url.origin === base, 'Use a plain loopback origin');
await mkdir('output/playwright', { recursive: true });
const ssr = await createServer({ configFile: false, cacheDir:'node_modules/.vite-story-tests', optimizeDeps:{ noDiscovery:true, include:[] }, server: { middlewareMode: true, hmr:false }, appType: 'custom', logLevel: 'error' });
let browser;
const evidence = [], errors = [];
let offset = 0;
try {
  const { createDropinnHandler } = await ssr.ssrLoadModule('/server/dropinn.ts');
  const { ADVENTURES } = await ssr.ssrLoadModule('/src/lib/dropinn/registry.ts');
  const { getScene } = await ssr.ssrLoadModule('/src/lib/dropinn/scene.ts');
  browser = await chromium.launch({ headless: true });
  for (const definition of ADVENTURES.slice(1).filter(item => !process.env.STORY_ID || item.id === process.env.STORY_ID)) {
    const handler = createDropinnHandler({ local: true, env: {}, now: () => Date.now() + offset, fetch: async () => { throw new Error('External services disabled'); } });
    const contexts = [], pages = [];
    const state = page => page.evaluate(async () => { const s = (await import('/src/store/adventureStore.ts')).useAdventureStore.getState(); return { room: s.room, userId: s.userId }; });
    const sync = async () => { for (const page of pages) await page.evaluate(async () => { await (await import('/src/store/adventureStore.ts')).useAdventureStore.getState().syncRoom(); }); };
    const advance = async time => {
      offset = Math.max(offset, time - Date.now());
      for (const page of pages) await page.evaluate(value => { window.__storyOffset = value; }, offset);
      await sync();
    };
    try {
      for (const name of ['a','b']) {
        const context = await browser.newContext({ viewport: { width: 390, height: 844 } }); contexts.push(context);
        await context.addInitScript(value => { const realNow = Date.now.bind(Date); window.__storyOffset = value; Date.now = () => realNow() + window.__storyOffset; }, offset);
        const page = await context.newPage(); pages.push(page);
        page.on('pageerror', error => errors.push(error.message));
        await page.route('**/*', route => new URL(route.request().url()).origin === base ? route.fallback() : route.abort());
        await page.route('**/api/dropinn', async route => {
          const response = await handler(new Request(`${base}/api/dropinn`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: route.request().postData() }));
          const body = await response.text();
          if(response.status !== 200) console.error(JSON.stringify({browser:name,operation:JSON.parse(route.request().postData()).operation,status:response.status,error:JSON.parse(body).error}));
          await route.fulfill({ status: response.status, contentType: 'application/json', body });
        });
        await page.goto(`${base}/?session=stories${name}`);
        assert.equal(await page.evaluate(async () => (await import('/src/lib/dropinn/api.ts')).localPlay), true);
      }
      const [a,b] = pages;
      await a.getByRole('button', { name: `Start a friend table for ${definition.title}`, exact: true }).click();
      await a.getByRole('main', { name: 'Adventure table' }).waitFor();
      await a.getByRole('button', { name: 'Invite', exact: true }).click();
      const invitation = await a.getByRole('textbox', { name: 'Full invitation link' }).inputValue();
      await a.keyboard.press('Escape');
      await b.getByRole('textbox', { name: 'Adventure code or invitation link' }).fill(invitation);
      await b.getByRole('button', { name: 'Join adventure by code' }).click();
      await b.getByRole('main', { name: 'Adventure table' }).waitFor();
      assert.notEqual((await state(a)).userId, (await state(b)).userId);
      const captured = new Set();
      let reloaded = false;
      let scrollChecked = false;
      for (let round = 0; round < 33; round++) {
        await sync();
        let room = (await state(a)).room;
        assert.equal(room.adventureId, definition.id);
        if (room.status === 'completed') break;
        if (room.phase === 'reveal') { await advance(room.revealUntil + 1); room = (await state(a)).room; }
        const scene = getScene(room);
        if (!captured.has(room.chapter)) {
          for (const viewport of [{ width:390,height:844 }, { width:320,height:568 }]) {
            await a.setViewportSize(viewport);
            await a.waitForFunction(() => [...document.querySelectorAll('.di-scene-object img')].length === 4 && [...document.querySelectorAll('.di-scene-object img')].every(image => image.complete && image.naturalWidth > 0));
            const size = await a.evaluate(() => ({ w: innerWidth, h: innerHeight, sw: document.documentElement.scrollWidth, sh: document.documentElement.scrollHeight, targets: [...document.querySelectorAll('[data-scene-target]')].map(node => { const r = node.getBoundingClientRect(); return { w:r.width,h:r.height,y:r.y,bottom:r.bottom }; }) }));
            assert.ok(size.sw <= size.w && size.sh <= size.h + 1, `Overflow ${definition.id}/${room.chapter}: ${JSON.stringify(size)}`);
            assert.ok(size.targets.every(target => target.w >=44 && target.h >=44 && target.y>=0 && target.bottom<=size.h));
            await a.screenshot({ path:`output/playwright/${definition.id}-${room.chapter}-${viewport.width}.png` });
          }
          captured.add(room.chapter);
        }
        if (room.chapter === 1 && !reloaded) {
          await b.waitForFunction(async () => { const s=(await import('/src/store/adventureStore.ts')).useAdventureStore.getState(); return s.ready && !!s.room && !!s.userId; });
          const before = await state(b);
          assert.ok(before.room, 'Room must be restored before starting the reconnect check');
          await b.reload();
          await b.evaluate(value => { window.__storyOffset = value; }, offset);
          await b.getByRole('main', { name:'Adventure table' }).waitFor();
          await b.waitForFunction(async () => { const s=(await import('/src/store/adventureStore.ts')).useAdventureStore.getState(); return s.ready && !!s.room && !!s.userId; });
          const after = await state(b); assert.ok(after.room,'Room must be restored after reconnect'); assert.equal(after.userId,before.userId); assert.equal(after.room.code,before.room.code); assert.equal(after.room.adventureId,definition.id); reloaded=true;
        }
        const checkScroll = definition.id==='last-flight-teacup' && room.chapter===1 && !scrollChecked;
        if(checkScroll) await checkStoryScroll(a);
        for (const page of pages) {
          const current = await state(page);
          if (current.room.pendingJoins.includes(current.userId)) continue;
          const target = scene.branch && !room.storyBranch ? scene.branch.options[0].targetId : scene.targets[round % 4].id;
          await page.getByRole('button', { name:'Help token',exact:true }).click();
          await page.locator(`[data-scene-target="${target}"]`).click();
          if (scene.branch && !room.storyBranch) {
            await page.getByRole('dialog', {name:'Choose your route'}).waitFor();
            assert.ok(await page.getByText(scene.branch.options[0].consequence,{exact:true}).isVisible());
            await page.getByRole('button',{name:'Ready this route',exact:true}).click();
          }
          await page.getByRole('button',{name:'Roll now',exact:true}).click();
          await page.waitForFunction(async () => !(await import('/src/store/adventureStore.ts')).useAdventureStore.getState().loading);
          if(checkScroll && page===a) await watchStoryWhileWaiting(a);
        }
        await sync();
        if(checkScroll) {await verifyNewStoryEvents(a);scrollChecked=true;}
      }
      const finished = (await state(a)).room;
      assert.equal(finished.status,'completed');
      assert.equal(finished.storyBranch,definition.chapters[2].branch.options[0].id);
      assert.equal(finished.outcomes.length,3);
      assert.ok(finished.outcomes[2].text.includes(definition.branchEndings[finished.storyBranch]));
      await a.getByRole('button',{name:'Collect your recap',exact:true}).waitFor();
      const finale = await a.locator('.di-stage-finale').boundingBox();
      assert.ok(finale && finale.y >= 0 && finale.y + finale.height <= 568);
      const stageBounds = await a.locator('.di-scene-stage').boundingBox();
      for (const [label, control] of [['Finale heading', a.locator('.di-stage-finale h2')], ['Collect recap button', a.getByRole('button', { name:'Collect your recap', exact:true })]]) {
        const bounds = await control.boundingBox();
        assert.ok(bounds && stageBounds && bounds.y >= stageBounds.y - 1 && bounds.y + bounds.height <= stageBounds.y + stageBounds.height + 1,
          `${label} is clipped by the stage at 320×568: ${JSON.stringify({bounds,stageBounds})}`);
      }
      await a.screenshot({path:`output/playwright/${definition.id}-finale-320.png`});
      await a.getByRole('button',{name:'Story',exact:true}).click();
      assert.ok(await a.getByText(finished.outcomes[2].text,{exact:true}).count());
      evidence.push({ adventure:definition.id, chapters:[...captured], branch:finished.storyBranch, reconnect:reloaded, completed:true });
      console.log(JSON.stringify(evidence.at(-1)));
    } catch (error) {
      for (const [index, page] of pages.entries()) await page.screenshot({ path:`output/playwright/${definition.id}-failure-${index}.png` }).catch(() => {});
      throw error;
    } finally { for (const context of contexts) await context.close(); }
  }
  assert.deepEqual(errors,[]);
} finally {
  await writeFile('output/playwright/adventures-results.json',JSON.stringify({ backend:'isolated real local handler with synchronized injected clock', evidence, errors, hosted:false },null,2));
  await browser?.close(); await ssr.close();
}
