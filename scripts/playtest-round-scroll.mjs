import { chromium } from 'playwright';
import { createServer } from 'vite';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// Local integration fixture: real command handler + real browser UI, no hosted writes
// or inference. Only its injected clock advances between completed turn boundaries.
const args = process.argv.slice(2);
if (args.length === 1 && args[0] === '--help') {
  console.log('Usage: npm run test:scene -- [--base-url http://localhost:5198]\nStart the local Vite development server first. Requires Playwright Chromium.');
  process.exit(0);
}
if (args.length && (args.length !== 2 || args[0] !== '--base-url')) throw new Error('Use --base-url http://localhost:5198, or omit it for that default.');
const origin = new URL(args[1] ?? 'http://localhost:5198');
if (origin.protocol !== 'http:' || !['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname)
  || origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) {
  throw new Error('Scene playtests require a plain HTTP loopback origin, without credentials, path, query, or fragment.');
}
const base = origin.origin;
process.chdir(fileURLToPath(new URL('../', import.meta.url)));
await mkdir('output/playwright', { recursive: true });
let ssr, browser, handler, getScene;
let offset = 0;
const clock = () => Date.now() + offset;
let externalCalls = 0;
const pages = [];
const records = [];
const checks = [];
const faults = { blockAReads: false, loseAResponses: 0 };
const errors = [];
const consoleErrors = [];
const blockedOrigins = new Set();
const note = (name, detail = {}) => { checks.push({ name, ...detail }); console.log(JSON.stringify({ name, ...detail })); };
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function service(payload) {
  const response = await handler(new Request(`${base}/api/dropinn`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) }));
  const result = await response.json();
  assert.equal(response.status, 200, result.error);
  return result;
}
async function setup(name, viewport) {
  const context = await browser.newContext({ viewport, hasTouch: true });
  await context.addInitScript(({ offset }) => { const realNow = Date.now.bind(Date); window.__qaOffset = offset; Date.now = () => realNow() + window.__qaOffset; }, { offset });
  const page = await context.newPage(); pages.push(page);
  page.on('pageerror', error => errors.push({ page: name, message: error.message }));
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push({ page: name, message: message.text() }); });
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (['http:', 'https:'].includes(url.protocol) && url.origin !== base) {
      blockedOrigins.add(url.origin);
      return route.abort('blockedbyclient');
    }
    return route.fallback();
  });
  await page.route('**/api/dropinn', async route => {
    const payload = route.request().postDataJSON();
    if (name === 'A' && payload.command?.type === 'act' && faults.rejectAAct) { faults.rejectAAct = false; return route.fulfill({status:422,contentType:'application/json',body:JSON.stringify({error:'This move was rejected for the local recovery check.'})}); }
    if (name === 'A' && payload.command?.type === 'act' && faults.pauseAAct) await faults.pauseAAct;
    if (name === 'A' && faults.blockAReads && payload.operation === 'read') return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'Intentional QA read interruption' }) });
    const response = await handler(new Request(`${base}/api/dropinn`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) }));
    const body = await response.text();
    if (payload.operation === 'command' && payload.command?.type === 'act') {
      records.push({ page: name, command: structuredClone(payload.command), response: JSON.parse(body), status: response.status });
      if (name === 'A' && faults.loseAResponses > 0) { faults.loseAResponses--; faults.blockAReads = true; return route.abort('failed'); }
    }
    return route.fulfill({ status: response.status, contentType: 'application/json', body });
  });
  await page.goto(`${base}/?session=scrollqa${name.toLowerCase()}`);
  assert.equal(await page.evaluate(async () => (await import('/src/lib/dropinn/api.ts')).localPlay), true, 'The selected Vite server must run the local backend.');
  await page.getByRole('button', { name: 'Play with friends', exact: true }).waitFor();
  return page;
}
async function state(page) {
  return page.evaluate(async () => {
    const store = (await import('/src/store/adventureStore.ts')).useAdventureStore.getState();
    return { userId: store.userId, character: store.character, room: store.room, pendingMove: store.pendingMove, loading: store.loading, proposal: store.proposal, error: store.error, restoringCode: store.restoringCode };
  });
}
async function sync(page) {
  await page.waitForFunction(async () => !(await import('/src/store/adventureStore.ts')).useAdventureStore.getState().loading);
  await page.evaluate(async () => (await import('/src/store/adventureStore.ts')).useAdventureStore.getState().syncRoom());
}
async function syncAll() { for (const page of pages) await sync(page); }
async function advanceTo(time) {
  offset = Math.max(offset, time - Date.now());
  for (const page of pages) await page.evaluate(value => { window.__qaOffset = value; }, offset);
  await syncAll();
}
async function readyNext(page) {
  let room = (await state(page)).room;
  if (room.phase === 'reveal' && room.status !== 'completed') await advanceTo(room.revealUntil + 1);
  await page.waitForFunction(async () => (await import('/src/store/adventureStore.ts')).useAdventureStore.getState().room?.phase === 'choosing');
}
async function select(page, token, targetId, kind = 'scene') {
  const back = page.getByRole('button', { name: 'Back to scene', exact: true });
  if (await back.isVisible() && await back.isEnabled()) await back.click();
  const change = page.getByRole('button', { name: 'Change move', exact: true });
  if (await change.isVisible() && await change.isEnabled()) await change.click();
  const close = page.getByRole('button', { name: 'Close inspection', exact: true });
  if (await close.isVisible()) await close.click();
  await showTokens(page);
  const labels = { fight: 'Fight', influence: 'Influence', investigate: 'Investigate', assist: 'Help' };
  await page.getByRole('button', { name: `${labels[token]} token`, exact: true }).click();
  await page.locator(`[data-scene-target="${targetId}"][data-target-kind="${kind}"]`).click();
  await page.getByRole('button', { name: /Hold and release the die|Release with timing assistance/ }).waitFor({ state: 'visible' });
}
async function showTokens(page) {
  const show = page.getByRole('button', { name: 'Show tokens', exact: true });
  if (await show.isVisible()) await show.click();
}
async function skip(page) {
  const before = records.length;
  await page.getByRole('button', { name: 'Roll now', exact: true }).click();
  await page.waitForFunction(async () => !(await import('/src/store/adventureStore.ts')).useAdventureStore.getState().loading);
  assert.equal(records.length, before + 1);
  return records.at(-1);
}
try {
  ssr = await createServer({ configFile: false, cacheDir: 'node_modules/.vite-scroll-tests', optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'error' });
  const { createDropinnHandler } = await ssr.ssrLoadModule('/server/dropinn.ts');
  ({ getScene } = await ssr.ssrLoadModule('/src/lib/dropinn/scene.ts'));
  handler = createDropinnHandler({ local: true, env: {}, now: clock, fetch: async () => { externalCalls++; throw new Error('External calls disabled for QA'); } });
  browser = await chromium.launch({ headless: true });
  const a = await setup('A', { width: 390, height: 844 });
  const b = await setup('B', { width: 390, height: 844 });
  await a.getByRole('button', { name: 'Play with friends', exact: true }).click();
  await a.getByRole('button', { name: 'Start a friend table', exact: true }).click();
  await a.getByRole('main', { name: 'Adventure table' }).waitFor();
  await a.getByRole('button', { name: 'Invite', exact: true }).click();
  const invite = await a.getByRole('textbox', { name: 'Full invitation link' }).inputValue();
  await a.keyboard.press('Escape');
  await b.getByRole('button', { name: 'Play with friends', exact: true }).click();
  await b.getByRole('textbox', { name: 'Adventure code or invitation link' }).fill(invite);
  await b.getByRole('button', { name: 'Join adventure by code' }).click();
  await b.getByRole('main', { name: 'Adventure table' }).waitFor();
  await b.waitForFunction(async () => !!(await import('/src/store/adventureStore.ts')).useAdventureStore.getState().room);
  await select(a,'investigate','tracks');
  assert.equal(await a.locator('.di-round-scroll').count(),0,'Selection is not submission');
  await skip(a); await syncAll();
  await a.locator('.di-round-scroll').waitFor();
  await a.getByRole('button',{name:'Show all',exact:true}).click();
  assert.equal((await state(a)).room.revealSkips?.length ?? 0,0,'Show all does not vote');
  await readyNext(a);
  await a.waitForFunction(()=>!document.querySelector('.di-round-scroll'));
  assert.equal(await a.evaluate(()=>document.querySelector('.di-app').inert),false);
  await select(a,'investigate','tracks');
  let resume;
  faults.pauseAAct=new Promise(resolve=>{resume=resolve;});
  await a.getByRole('button',{name:'Roll now',exact:true}).click();
  await a.locator('.di-round-rest-bar').waitFor();
  await a.locator('.di-round-scroll').waitFor();
  await a.getByRole('heading',{name:'Checking your move…',exact:true}).waitFor();
  const stageBefore=await a.locator('.di-scene-stage').boundingBox();
  await a.keyboard.press('Escape');
  const stageAfter=await a.locator('.di-scene-stage').boundingBox();
  assert.ok(Math.abs(stageBefore.height-stageAfter.height)<=1,JSON.stringify({stageBefore,stageAfter}));
  resume(); faults.pauseAAct=null; await syncAll();
  assert.equal(await a.locator('.di-round-scroll').count(),0,'Dismissal survives confirmation');
  await a.getByRole('button',{name:'Open round scroll'}).click();
  await a.getByRole('heading',{name:'Waiting for the party',exact:true}).waitFor();
  note('submission-waiting-dismissal-confirmation');
  await select(b,'assist','tracks'); await skip(b); await syncAll();
  await a.setViewportSize({width:320,height:568});
  await a.waitForFunction(()=>document.querySelectorAll('[data-round-entry]').length>=2);
  await a.locator('.di-round-body').evaluate(node=>{node.scrollTop=0;});
  await a.getByRole('button',{name:'New results ↓',exact:true}).waitFor();
  assert.equal(await a.locator('.di-round-body').evaluate(node=>node.scrollTop),0,'New rows preserve manual reading');
  await a.getByRole('button',{name:'New results ↓',exact:true}).click();
  await a.locator('.di-round-body[data-beat=full]').waitFor();
  note('cumulative-rows-preserve-manual-reading');
  const summary=await a.evaluate(async()=>{const s=(await import('/src/store/adventureStore.ts')).useAdventureStore.getState();return (await import('/src/lib/dropinn/roundSummary.ts')).latestRound(s.room);});
  assert.equal(await a.locator('[data-round-entry]').count(),summary.entries.length);
  for(const entry of summary.entries) assert.ok((await a.locator(`[data-round-entry="${entry.id}"]`).textContent()).includes(entry.text));
  for(const viewport of [{width:320,height:568},{width:390,height:844},{width:1280,height:900},{width:740,height:360},{width:844,height:390}]) {
    await a.setViewportSize(viewport);
    await a.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const fit=await a.evaluate(()=>{
      const rect=selector=>document.querySelector(selector).getBoundingClientRect().toJSON();
      return {header:rect('.di-round-heading'),footer:rect('.di-round-footer'),body:rect('.di-round-body'),width:document.documentElement.scrollWidth,controls:[...document.querySelectorAll('.di-round-heading button,.di-round-footer button')].map(n=>n.getBoundingClientRect().toJSON()),portraits:[...document.querySelectorAll('.di-result-portrait,.di-result-target')].map(n=>n.getBoundingClientRect().toJSON()),tokens:[...document.querySelectorAll('.di-result-token img')].map(n=>({width:n.getBoundingClientRect().width,height:n.getBoundingClientRect().height,loaded:n.complete&&n.naturalWidth>0}))};
    });
    assert.ok(fit.width<=viewport.width);
    assert.ok(fit.body.height>=80&&fit.body.bottom<=fit.footer.top+1,JSON.stringify(fit));
    assert.ok(fit.footer.bottom<=viewport.height&&fit.header.top>=0);
    for(const control of fit.controls) assert.ok(control.height>=44&&control.x>=0&&control.right<=viewport.width);
    for(const portrait of fit.portraits) assert.ok(portrait.width>=48&&portrait.height>=48);
    for(const token of fit.tokens) assert.ok(token.width>=30&&token.height>=30&&token.loaded);
    await a.locator('.di-round-body').evaluate(node=>{node.scrollTop=0;});
    await a.screenshot({path:`output/playwright/round-scroll-${viewport.width}x${viewport.height}.png`,animations:'disabled'});
    note('scroll-layout',viewport);
  }
  await a.setViewportSize({width:390,height:844});
  await a.getByRole('button',{name:'Story settings',exact:true}).click(); await a.keyboard.press('Escape');
  assert.equal(await a.locator('.di-round-scroll').count(),1,'Settings closes first');
  await a.getByRole('button',{name:/^Next (round|chapter)$/}).focus(); await a.keyboard.press('Tab');
  assert.equal(await a.evaluate(()=>document.activeElement.textContent),'View scene');
  await a.keyboard.press('Escape');
  assert.equal(await a.evaluate(()=>document.querySelector('.di-app').inert),false);
  await a.getByRole('button',{name:'Last round',exact:true}).click();
  assert.equal(await a.locator('.di-round-body').getAttribute('data-beat'),'full');
  assert.equal(await a.locator('[data-animate=true]').count(),0);
  await a.keyboard.press('Escape'); await readyNext(a);
  note('keyboard-history-and-return-to-play');
  await select(a,'assist','tracks'); faults.loseAResponses=1;
  await skip(a); const lost=records.at(-1);
  await a.getByRole('dialog',{name:'Round story',exact:true}).getByRole('button',{name:'Retry same move',exact:true}).click();
  await a.waitForFunction(async()=>!(await import('/src/store/adventureStore.ts')).useAdventureStore.getState().loading);
  assert.equal(records.at(-1).command.id,lost.command.id); assert.deepEqual(records.at(-1).command.action,lost.command.action);
  faults.blockAReads=false; await syncAll();
  await a.getByRole('heading',{name:'Waiting for the party',exact:true}).waitFor();
  await select(b,'assist','tracks'); await skip(b); await syncAll();
  await a.emulateMedia({reducedMotion:'reduce'}); await a.locator('.di-round-body[data-beat=full]').waitFor();
  assert.equal((await state(a)).room.revealSkips?.length??0,0);
  await a.getByRole('button',{name:/^Next (round|chapter)$/}).click(); await syncAll();
  assert.equal((await state(a)).room.phase,'reveal');
  await b.getByRole('button',{name:/^Next (round|chapter)$/}).click(); await syncAll();
  assert.equal((await state(a)).room.phase,'choosing');
  assert.equal(await a.locator('.di-round-scroll').count(),0);
  note('exact-retry-reduced-motion-and-unanimous-readiness');
  await select(a,'assist','tracks'); faults.rejectAAct=true;
  await a.getByRole('button',{name:'Roll now',exact:true}).click();
  await a.waitForFunction(async()=>{const s=(await import('/src/store/adventureStore.ts')).useAdventureStore.getState();return !s.loading&&!!s.error&&!s.pendingMove;});
  assert.equal(await a.locator('.di-round-scroll').count(),0);
  await a.getByRole('button',{name:'Roll now',exact:true}).waitFor();
  assert.match((await state(a)).error,/rejected/);
  note('definitive-rejection-restores-prepared-move');
  assert.deepEqual(errors,[]); assert.equal(externalCalls,0);
} catch(error) {
  note('FAILED',{message:error.message,stack:error.stack}); process.exitCode=1;
  for(let i=0;i<pages.length;i++) await pages[i].screenshot({path:`output/playwright/round-scroll-failure-${i}.png`}).catch(()=>{});
} finally {
  await writeFile('output/playwright/round-scroll-results.json',JSON.stringify({checks,errors,externalCalls,fixture:'Isolated real local handler; browser gestures; controlled time. No hosted writes.'},null,2));
  await browser?.close(); await ssr?.close();
}
