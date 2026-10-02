import { chromium } from 'playwright';
import { checkNarrator } from './check-narrator.mjs';
import { createServer } from 'vite';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// Local integration fixture: real command handler + real browser UI, no hosted writes
// or inference. Only its injected clock advances between completed turn boundaries.
const args = process.argv.slice(2);
if (args.length === 1 && args[0] === '--help') {
  console.log('Usage: npm run test:scene -- [--narrator-only] [--base-url http://localhost:5198]\nStart the local Vite development server first. Requires Playwright Chromium.');
  process.exit(0);
}
const narratorOnly = args.includes('--narrator-only');
const connectionArgs = args.filter(arg => arg !== '--narrator-only');
if (args.filter(arg => arg === '--narrator-only').length > 1 || (connectionArgs.length && (connectionArgs.length !== 2 || connectionArgs[0] !== '--base-url'))) throw new Error('Use [--narrator-only] [--base-url http://localhost:5198], or omit the URL for that default.');
const origin = new URL(connectionArgs[1] ?? 'http://localhost:5198');
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
const note = (name, detail = {}) => { checks.push({ name, ...detail }); console.log(JSON.stringify(name === 'FAILED' ? { name, ...detail } : { name })); };
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
  await page.goto(`${base}/?session=sceneqa${name.toLowerCase()}`);
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
async function waitForStore(page, predicate, options) {
  // Playwright checks immediate truthiness. An async predicate is a truthy
  // Promise, so import first and then poll the live store synchronously.
  await page.evaluate(async () => { window.__qaAdventureStore = (await import('/src/store/adventureStore.ts')).useAdventureStore; });
  await page.waitForFunction(predicate, undefined, options);
}
async function sync(page) {
  await waitForStore(page, () => !window.__qaAdventureStore.getState().loading);
  await page.evaluate(async () => (await import('/src/store/adventureStore.ts')).useAdventureStore.getState().syncRoom());
}
async function openRound(page) {
  // Reopen history if this round was previously dismissed.
  const button = page.getByRole('button', { name: 'Open round scroll', exact: true });
  const dialog = page.getByRole('dialog', { name: 'Round story' });
  if (await button.isVisible() && !(await dialog.isVisible())) {
    try { await button.click({ timeout: 1500 }); }
    catch (error) {
      // The automatic parchment can open between the check and pointer dispatch.
      // Accept only that completed transition; other interaction failures still fail.
      if (!(await dialog.isVisible())) throw error;
    }
  }
}
async function syncAll() { for (const page of pages) { await sync(page); if ((await state(page)).room?.phase === 'reveal') await openRound(page); } }
async function advanceTo(time) {
  offset = Math.max(offset, time - Date.now());
  for (const page of pages) await page.evaluate(value => { window.__qaOffset = value; }, offset);
  await syncAll();
}
async function readyNext(page) {
  let room = (await state(page)).room;
  if (room.phase === 'reveal' && room.status !== 'completed') await advanceTo(room.revealUntil + 1);
  await waitForStore(page, () => window.__qaAdventureStore.getState().room?.phase === 'choosing');
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
async function guidance(page, expected) {
  if (['pending','committed','reveal','completed'].includes(expected)) { await page.locator('.di-round-rest-bar').waitFor(); return; }
  await page.locator(`.di-player-guidance[data-state="${expected}"]`).waitFor({ state: 'visible' });
}
async function pointerRelease(page, ms) {
  const before = records.length;
  const button = page.getByRole('button', { name: /Hold and release the die|Release with timing assistance/ });
  const rect = await button.boundingBox(); assert.ok(rect);
  await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2);
  await page.mouse.down(); await sleep(ms); await page.mouse.up();
  await waitForStore(page, () => !window.__qaAdventureStore.getState().loading);
  assert.equal(records.length, before + 1, 'one act per pointer gesture');
  return records.at(-1);
}
async function skip(page) {
  const before = records.length;
  await page.getByRole('button', { name: /^(Roll|Commit) now$/ }).click();
  await waitForStore(page, () => !window.__qaAdventureStore.getState().loading);
  assert.equal(records.length, before + 1);
  await openRound(page);
  return records.at(-1);
}
async function directAct(who, room, action) {
  return (await service({ operation: 'command', sessionId: who.userId, character: who.character, roomCode: room.code,
    command: { id: crypto.randomUUID(), type: 'act', userId: who.userId, expectedTurn: room.turn, expectedRevision: room.revision, action } })).room;
}
async function playToChapter(a, identities, chapter) {
  for (let rounds = 0; rounds < 25; rounds++) {
    let room = (await state(a)).room;
    if (room.chapter === chapter && room.phase === 'choosing') return;
    if (room.phase === 'reveal') { await readyNext(a); continue; }
    const target = getScene(room).targets.find(target => target.tokens.includes('assist'));
    for (const identity of identities) {
      if (room.phase === 'choosing' && !room.commits[identity.userId]) room = await directAct(identity, room, { token: 'assist', targetId: target.id, targetKind: 'scene' });
    }
    await syncAll();
    if (room.phase === 'reveal') await readyNext(a);
  }
  throw new Error(`Could not reach chapter ${chapter}`);
}
async function layout(page, label) {
  for (const viewport of [{ width: 390, height: 844 }, { width: 320, height: 568 }, { width: 844, height: 390 }, { width: 1280, height: 900 }, ...(['river','battle-focus'].includes(label) ? [{ width: 740, height: 360 }] : []), ...(label.endsWith('focus') ? [{ width: 360, height: 640 }, { width: 412, height: 732 }, { width: 414, height: 770 }, { width: 390, height: 780 }] : []), ...(['river','inspection'].includes(label) ? [{ width: 566, height: 1064 }, { width: 910, height: 1072 }] : [])]) {
    await page.setViewportSize(viewport);
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    // Finish finite visual transitions before measuring the same settled layout
    // captured below; viewport changes can otherwise catch a translated target.
    await page.screenshot({ path: `output/playwright/integration-${label}-${viewport.width}.png`, animations:'disabled' });
    const result = await page.evaluate(() => ({ width: innerWidth, height: innerHeight, scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight,
      regions: Object.fromEntries(['.di-scene-tools', '.di-scene-stage', '.di-focus-stage', '.di-focus-heading', '.di-focus-player', '.di-focus-opponent', '.di-focus-stakes', '.di-focus-choices', '.di-scene-selection', '.di-focus-control', '.di-round-advance', '.di-reveal-content'].map(selector => [selector, document.querySelector(selector)?.getBoundingClientRect().toJSON()])),
      targets: [...document.querySelectorAll('[data-scene-target]')].map(node => { const r = node.getBoundingClientRect(); return { id: node.getAttribute('data-scene-target'), kind: node.getAttribute('data-target-kind'), width: r.width, height: r.height, top: r.top, bottom: r.bottom, left: r.left, right: r.right }; }),
      targetArt: [...document.querySelectorAll('.di-stage-targets .di-target-art')].map(node => { const r = node.getBoundingClientRect(); return { width: r.width, height: r.height }; }),
      choiceBottom: Math.max(0, ...[...document.querySelectorAll('.di-focus-choices button')].map(node => node.getBoundingClientRect().bottom)),
      selectionBottom: Math.max(0, ...[...document.querySelectorAll('.di-scene-selection>div>*')].map(node => node.getBoundingClientRect().bottom)),
      buttons: [...document.querySelectorAll('.di-theater button:not(:disabled)')].map(node => { const r = node.getBoundingClientRect(); return { name: node.getAttribute('aria-label') || node.textContent, width: r.width, height: r.height }; }) }));
    assert.ok(result.scrollHeight <= result.height + 1 && result.scrollWidth <= result.width, `${label} document overflow ${JSON.stringify(result)}`);
    assert.ok(result.targets.every(target => target.width >= 44 && target.height >= 44 && target.top >= 0 && target.bottom <= result.height && target.left >= 0 && target.right <= result.width + 1), `${label}: scene/hero targets keep their full hit area inside the viewport ${JSON.stringify(result.targets)}`);
    assert.ok(result.targets.every(target => target.bottom <= result.regions['.di-scene-stage'].bottom + 1), `${label}: scene targets stay above the dock`);
    if (viewport.width === 320 && result.targetArt.length) assert.ok(result.targetArt.every(art => art.height >= 36), `${label}: target artwork stays recognizable on the small phone ${JSON.stringify(result.targetArt)}`);
    assert.ok(result.regions['.di-scene-tools'].bottom <= result.height + 1, `${label}/${viewport.width}: footer clipped by the app shell ${JSON.stringify(result.regions)}`);
    const stage = result.regions['.di-focus-stage'];
    if (stage) {
      const avatar = await page.locator('.di-focus-player>.di-avatar').boundingBox();
      assert.ok(avatar.width >= 44 && avatar.height >= 44, `${label}/${viewport.width}: hero artwork collapsed`);
      const heading = result.regions['.di-focus-heading'], player = result.regions['.di-focus-player'], opponent = result.regions['.di-focus-opponent'], stakes = result.regions['.di-focus-stakes'];
      assert.ok(heading.bottom <= player.top + 1 && heading.bottom <= opponent.top + 1, `${label}: encounter copy overlaps an actor`);
      assert.ok(player.right <= opponent.left + 1, `${label}: hero stats overlap the opponent`);
      assert.ok(Math.max(player.bottom, opponent.bottom) <= stakes.top + 1 && stakes.bottom <= stage.bottom + 1, `${label}: threat message clipped or overlaps actors`);
      assert.ok(result.regions['.di-focus-control'].bottom <= result.regions['.di-scene-tools'].top + 1, `${label}: release controls overlap toolbar`);
      const selection = result.regions['.di-scene-selection'], choices = result.regions['.di-focus-choices'], control = result.regions['.di-focus-control'];
      assert.ok(Math.max(choices.bottom, result.choiceBottom) <= selection.top + 1, `${label}/${viewport.width}: approach cards overlap the selected move ${JSON.stringify({ choices, choiceBottom: result.choiceBottom, selection })}`);
      assert.ok(Math.max(selection.bottom, result.selectionBottom) <= control.top + 1, `${label}/${viewport.width}: selected move overlaps the release control ${JSON.stringify({ selection, selectionBottom: result.selectionBottom, control })}`);
      const comparisons = await page.getByRole('group', { name: 'Choose an approach' }).getByRole('button').evaluateAll(nodes => nodes.map(button => {
        const buttonBounds = button.getBoundingClientRect();
        const visible = [...button.querySelectorAll(':scope > span')].filter(node => {
          const bounds = node.getBoundingClientRect();
          return bounds.width >= 20 && bounds.height >= 9 && bounds.top >= buttonBounds.top - 1 && bounds.bottom <= buttonBounds.bottom + 1 && getComputedStyle(node).visibility !== 'hidden';
        });
        return { name: button.getAttribute('aria-label') || button.textContent, details: visible.map(node => node.textContent) };
      }));
      assert.ok(comparisons.length > 0 && comparisons.every(item => item.details.some(text => text?.trim())), `${label}/${viewport.width}: approach tradeoffs remain visible ${JSON.stringify(comparisons)}`);
    }
    const advance = result.regions['.di-round-advance'];
    if (advance) {
      assert.ok(advance.top >= 0 && advance.bottom <= result.regions['.di-scene-tools'].top + 1, `${label}: readiness control stays in view`);
      assert.equal(await page.locator('.di-reveal-content .di-round-advance').count(), 0, 'Readiness is outside scrolling results');
      const reading = page.locator('.di-reveal-content');
      await reading.evaluate(node => { node.scrollTop = node.scrollHeight; });
      const scrolled = await page.locator('.di-round-advance').boundingBox();
      assert.ok(Math.abs(scrolled.y - advance.top) <= 1, 'Reading results does not move the next-round control');
      await reading.evaluate(node => { node.scrollTop = 0; });
    }
    note(`layout-${label}-${viewport.width}`, result);
    if (label === 'river' && viewport.width === 844) {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      const story = page.getByRole('button', { name: 'Story', exact: true });
      try {
        await story.click();
        await page.waitForFunction(() => {
          const panel = document.querySelector('#adventure-story-scroll.is-compact');
          return panel && getComputedStyle(panel).opacity === '1' && panel.getBoundingClientRect().height > 120;
        });
        const compact = await page.locator('#adventure-story-scroll').boundingBox();
        const dock = await page.locator('.di-scene-dock').boundingBox();
        assert.ok(compact.height > 120 && compact.x >= 0 && compact.x + compact.width <= dock.x + 1 && compact.y + compact.height <= result.regions['.di-scene-tools'].top + 1, 'Landscape compact story stays readable beside the action dock');
        assert.ok(await page.locator('.di-scroll-reading').evaluate(node => node.clientHeight >= 44), 'Landscape story contains visible reading space');
        await page.screenshot({ path: 'output/playwright/integration-landscape-story-compact.png', animations: 'disabled' });
        await page.getByRole('button', { name: 'Expand story', exact: true }).click();
        await page.waitForFunction(() => document.querySelector('#adventure-story-scroll.is-full')?.getBoundingClientRect().height >= innerHeight - 17);
        const full = await page.getByRole('dialog', { name: 'Story & journal', exact: true }).boundingBox();
        assert.ok(full.x >= 0 && full.y >= 0 && full.x + full.width <= viewport.width && full.y + full.height <= viewport.height, 'Landscape full story fits the viewport');
        await page.screenshot({ path: 'output/playwright/integration-landscape-story-full.png', animations: 'disabled' });
        await page.keyboard.press('Escape');
        await page.keyboard.press('Escape');
        assert.equal(await story.getAttribute('aria-expanded'), 'false');
        assert.equal(await story.evaluate(node => node === document.activeElement), true);
        note('landscape-story-compact-full-and-focus-return');
      } finally { await page.emulateMedia({ reducedMotion: 'no-preference' }); }
    }
  }
}
try {
  ssr = await createServer({ configFile: false, cacheDir: 'node_modules/.vite-scene-tests', optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'error' });
  const { createDropinnHandler } = await ssr.ssrLoadModule('/server/dropinn.ts');
  ({ getScene } = await ssr.ssrLoadModule('/src/lib/dropinn/scene.ts'));
  handler = createDropinnHandler({ local: true, env: {}, now: clock, fetch: async () => { externalCalls++; throw new Error('External calls disabled for QA'); } });
  browser = await chromium.launch({ headless: true });
  if (!narratorOnly) {
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
  await waitForStore(b, () => !!window.__qaAdventureStore.getState().room);
  const identities = [await state(a), await state(b)];
  assert.notEqual(identities[0].userId, identities[1].userId);
  assert.ok(identities[1].room.pendingJoins.includes(identities[1].userId));
  await guidance(b, 'joining');
  await b.locator('[data-scene-target="mara"]').click();
  await b.getByRole('group', { name: 'Moves for this target' }).waitFor();
  await guidance(b, 'joining');
  assert.equal(records.length, 0, 'A player awaiting admission can inspect without submitting a move');
  await b.keyboard.press('Escape');
  await guidance(a, 'target');
  await a.getByRole('group', { name: 'Action tokens' }).waitFor();
  const inspectedRevision = (await state(a)).room.revision;
  const inspectCommands = records.length;
  assert.equal(await a.getByRole('group', { name: 'Action tokens', exact: true }).count(), 1, 'The tactile token hand is available immediately');
  await a.locator('[data-scene-target="mara"]').click();
  await a.getByRole('group', {name:'Moves for this target'}).waitFor();
  await guidance(a, 'inspecting');
  assert.match(await a.locator('.di-inspection-context').textContent(), /Mara|gate/);
  assert.equal(await a.getByRole('button', {name:'Roll now',exact:true}).count(), 0);
  assert.equal((await state(a)).room.revision, inspectedRevision);
  assert.equal(records.length, inspectCommands, 'Inspecting a target sends no move');
  await layout(a, 'inspection');
  await a.keyboard.press('Escape');
  assert.equal(await a.evaluate(() => document.activeElement?.getAttribute('data-scene-target')), 'mara');
  await a.locator('[data-scene-target="tracks"]').click();
  await a.getByRole('button', {name:/^Investigate:/}).click();
  await a.getByRole('group', {name:'Choose an approach'}).waitFor();
  assert.equal(await a.locator('.di-stage-targets [data-scene-target]').count(),4,'Selection keeps every scene target visible');
  await guidance(a, 'prepared');
  assert.ok(await a.locator('[data-scene-target=tracks]').isVisible());
  note('inspect-first-context-and-keyboard-return');
  const initial = await pointerRelease(a, 800);
  assert.ok(initial.command.action.releaseMs >= 650 && initial.command.action.releaseMs <= 950);
  await syncAll();
  await guidance(a, 'reveal');
  await a.locator('.di-illustrated-result[data-own=true]').waitFor({ state: 'visible' });
  await a.locator('.di-first-move-guide').waitFor({ state: 'hidden' });
  await readyNext(a);
  await guidance(a, 'target');
  await a.getByRole('button', { name: 'Action details and help', exact: true }).click();
  await a.getByRole('button', { name: 'Replay first-move guide', exact: true }).click();
  const actionHelp = a.getByRole('dialog', { name: 'Your action', exact: true });
  if (await actionHelp.isVisible()) await a.keyboard.press('Escape');
  await a.getByRole('group', { name: 'Action tokens' }).waitFor();
  await a.getByRole('button', { name: 'Action details and help', exact: true }).click();
  await a.getByRole('button', { name: 'Dismiss first-move guide', exact: true }).click();
  await a.keyboard.press('Escape');
  await a.locator('.di-first-move-guide').waitFor({ state: 'hidden' });
  assert.equal((await state(a)).room.seats.filter(seat => seat.kind === 'human').length, 2);
  note('guidance-follows-first-real-contribution-and-can-be-replayed');
  note('private-join-and-real-pointer-release', { releaseMs: initial.command.action.releaseMs });

  // Both humans act on one target in the same choosing turn.
  await select(a, 'investigate', 'tracks'); await select(b, 'assist', 'tracks');
  const sameTurn = (await state(a)).room.turn;
  await skip(a); await sync(b);
  await guidance(a, 'committed');
  assert.equal(await b.locator('[data-scene-target="tracks"] .di-object-teamwork').textContent(), '+1 teamwork');
  assert.match(await b.locator('.di-scene-selection').textContent(), /\+1 teamwork/);
  await skip(b); await syncAll();
  const shared = (await state(a)).room;
  assert.equal(shared.phase, 'reveal');
  await guidance(a, 'reveal');
  await a.locator('.di-illustrated-result[data-own=true]').waitFor({ state: 'visible' });
  assert.equal((await state(b)).room.turn, sameTurn);
  assert.equal(shared.events.filter(event => event.turn === sameTurn && event.contribution && identities.some(identity => identity.userId === event.actorId)).length, 2);
  await openRound(a); await a.locator('.di-round-body[data-beat=full]').waitFor();
  await a.waitForFunction(() => document.querySelector('.di-round-body')?.getAttribute('data-beat') === 'full');
  const actualResult = shared.events.find(event => event.turn === sameTurn && event.actorId === identities[0].userId && event.contribution);
  assert.ok((await a.locator('.di-illustrated-result[data-own=true]').textContent()).includes(actualResult.text), 'The illustrated row retains its saved outcome sentence');
  assert.equal(await a.locator('.di-illustrated-result[data-own=true] .di-payoff-benefits').count(), 1, 'The personal payoff foregrounds recorded effects');
  assert.ok((await a.locator('.di-round-body[data-beat=full]').textContent()).includes(`= ${actualResult.roll + actualResult.modifier}`));
  assert.match(await a.locator('.di-round-body[data-beat=full]').textContent(), /progress/);
  assert.equal(await a.locator('.di-round-body[data-beat=full] [data-kind=action]').count(), 2);
  await b.waitForFunction(() => document.querySelector('.di-round-body')?.getAttribute('data-beat') === 'full');
  assert.deepEqual(await a.locator('[data-round-entry] > p:first-of-type').allTextContents(), await b.locator('[data-round-entry] > p:first-of-type').allTextContents());
  await a.setViewportSize({ width: 1280, height: 800 });
  await a.screenshot({ path: 'output/playwright/game-feel-desktop-payoff.png' });
  note('real-result-total-and-visible-teamwork', { total: actualResult.roll + actualResult.modifier });
  note('two-player-shared-turn', { turn: sameTurn });
  await layout(a, 'party-recap');
  await readyNext(a);
  const beforeJournal = (await state(a)).room;
  await a.getByRole('button', {name:/Last round/}).click();
  await a.getByRole('dialog', {name:'Last round',exact:true}).waitFor();
  assert.equal(await a.locator('.di-round-body [data-kind=action]').count(), 2);
  await a.keyboard.press('Escape');
  assert.equal((await state(a)).room.turn, beforeJournal.turn);
  assert.equal((await state(a)).room.revision, beforeJournal.revision);
  note('persistent-journal-does-not-submit');
  await playToChapter(a, identities, 1);
  let room = (await state(a)).room;
  assert.ok(room.enemyIntent?.targetActorId);
  assert.deepEqual((await state(b)).room.enemyIntent, room.enemyIntent);
  await layout(a, 'river');

  const heroInspectionBefore = records.length;
  await a.locator(`[data-scene-target="${room.enemyIntent.targetActorId}"][data-target-kind="hero"]`).click();
  const heroMoves = a.getByRole('group', { name: 'Moves for this hero', exact: true });
  await heroMoves.waitFor();
  await guidance(a, 'inspecting');
  assert.equal(await a.getByRole('button', { name: 'Roll now', exact: true }).count(), 0, 'Inspecting a threatened hero does not prepare Protect');
  assert.equal(records.length, heroInspectionBefore, 'Inspecting a threatened hero sends no move');
  await heroMoves.getByRole('button', { name: /^Protect / }).click();
  await guidance(a, 'prepared');
  assert.equal(records.length, heroInspectionBefore, 'Choosing contextual Protect waits for the release');
  await a.getByRole('button', { name: 'Back to scene', exact: true }).click();
  note('threatened-hero-inspection-then-contextual-protect');

  await select(a, 'fight', 'pack');
  await a.getByRole('group', { name: 'Choose an approach' }).waitFor();
  assert.equal(await a.locator('.di-stage-targets [data-scene-target]').count(), 4);
  assert.equal(await a.evaluate(() => document.activeElement?.getAttribute('aria-pressed')), 'true');
  await a.keyboard.press('Escape');
  assert.equal(await a.locator('.di-stage-targets [data-scene-target]').count(), 4);
  await select(a, 'fight', 'pack');
  assert.equal(await a.getByRole('group', { name: 'Choose an approach' }).getByRole('button').count(), 3);
  await layout(a, 'battle-focus');
  await a.setViewportSize({ width: 1280, height: 800 });
  const opponentSize = await a.locator('[data-scene-target=pack] .di-target-art img').boundingBox();
  assert.ok(opponentSize.width >= 64 && opponentSize.height >= 64, 'Enemy artwork stays legible on the shared stage');
  await a.screenshot({ path: 'output/playwright/battle-focus-desktop.png', animations: 'disabled' });
  await a.getByRole('button', { name: /Heavy Blow/ }).click();
  await skip(a);
  assert.equal(records.at(-1).command.action.approach, 'heavy');
  await select(b, 'fight', 'pack');
  await b.getByRole('button', { name: /Quick Strike/ }).click();
  await skip(b); await syncAll();
  const clashed = (await state(a)).room;
  const duels = clashed.events.filter(event => event.turn === clashed.turn && event.result?.duel);
  assert.equal(duels.length, 2);
  assert.equal(duels[0].result.duel.enemyRoll, duels[1].result.duel.enemyRoll);
  await openRound(a); await a.locator('.di-round-body[data-beat=full]').waitFor();
  assert.match(await a.locator('.di-round-body').textContent(), / vs /);
  await a.waitForFunction(() => !document.querySelector('.di-turn-resolution'));
  await a.screenshot({ path: 'output/playwright/battle-clash-desktop.png', animations: 'disabled' });
  note('two-player-focused-opposed-dice', { enemyRoll: duels[0].result.duel.enemyRoll, approaches: duels.map(event => event.result.approach) });
  await readyNext(a); room = (await state(a)).room;

  const wounded = room.seats.find(seat => seat.hp < seat.character.maxHp);
  assert.ok(wounded, 'The clash leaves a real wound to treat');
  const mendInspectionBefore = records.length;
  await a.locator(`[data-scene-target="${wounded.actorId}"][data-target-kind="hero"]`).click();
  await heroMoves.waitFor();
  assert.equal(records.length, mendInspectionBefore, 'Inspecting a wound sends no move');
  await heroMoves.getByRole('button', { name: /^Mend / }).click();
  await guidance(a, 'prepared');
  await layout(a, 'mend-focus');
  const mendMove = await pointerRelease(a, 800);
  assert.equal(mendMove.command.action.targetKind, 'hero');
  assert.equal(mendMove.command.action.targetId, wounded.actorId);
  assert.equal(mendMove.command.action.approach, 'mend');
  await select(b, 'investigate', 'reeds');
  await b.getByRole('button', { name: /Study a weakness/ }).click();
  await skip(b); await syncAll();
  let focusedRoom = (await state(a)).room;
  const mend = focusedRoom.events.find(event => event.turn === focusedRoom.turn && event.result?.approach === 'mend');
  assert.ok(mend.result.healing > 0 && mend.result.healing <= 3);
  assert.equal(mend.roll, undefined); assert.equal(mend.result.progress, 0);
  assert.ok(focusedRoom.events.some(event => event.turn === focusedRoom.turn && event.result?.approach === 'study'));
  await readyNext(a);
  await select(a, 'influence', 'ferryman');
  await a.getByRole('button', { name: /^Distract/ }).click();
  await a.getByRole('button', { name: 'Action details and help' }).click();
  assert.match(await a.getByRole('dialog', { name: 'Your action' }).textContent(), /opening next turn/);
  await a.keyboard.press('Escape');
  await skip(a); await select(b, 'assist', 'boat'); await skip(b); await syncAll();
  focusedRoom = (await state(a)).room;
  assert.ok(focusedRoom.events.some(event => event.turn === focusedRoom.turn && event.result?.approach === 'distract'));
  note('focused-mend-study-and-influence-real-commands');
  await readyNext(a); room = (await state(a)).room;

  // Cancellation from focus and pointer interruption must not spend a move.
  await select(a, 'assist', room.enemyIntent.targetActorId, 'hero');
  const beforeCancel = records.length;
  let die = a.getByRole('button', { name: 'Hold and release the die' });
  await die.focus(); await a.keyboard.down('Space'); await sleep(100);
  await a.getByRole('button', { name: 'Action details and help' }).focus(); await a.keyboard.up('Space');
  await sleep(1250); assert.equal(records.length, beforeCancel);
  const rect = await die.boundingBox();
  await a.mouse.move(rect.x + 20, rect.y + 20); await a.mouse.down();
  await die.dispatchEvent('pointercancel', { pointerId: 1, isPrimary: true, button: 0 }); await a.mouse.up();
  await sleep(1250); assert.equal(records.length, beforeCancel);
  note('keyboard-focus-and-pointer-cancellation');

  await a.getByRole('button', { name: 'Back to scene', exact: true }).click();
  await a.locator(`[data-scene-target="${room.enemyIntent.targetActorId}"][data-target-kind="hero"]`).click();
  await heroMoves.getByRole('button', { name: /^Protect / }).click();
  await guidance(a, 'prepared');
  const protectGood = await pointerRelease(a, 800);
  assert.equal(protectGood.command.action.targetKind, 'hero');
  assert.equal(protectGood.command.action.targetId, room.enemyIntent.targetActorId);
  assert.equal(protectGood.command.action.token, 'assist');
  assert.equal(protectGood.command.action.approach, undefined, 'Contextual Protect does not become Mend');
  await select(b, 'assist', room.enemyIntent.targetActorId, 'hero');
  die = b.getByRole('button', { name: 'Hold and release the die' });
  await die.focus(); await b.keyboard.down('Enter'); await sleep(100); await b.keyboard.up('Enter');
  await waitForStore(b, () => !window.__qaAdventureStore.getState().loading);
  await syncAll();
  const protectedRoom = (await state(a)).room;
  const guards = protectedRoom.events.filter(event => event.turn === room.turn && event.result?.targetKind === 'hero' && event.contribution);
  assert.deepEqual(guards.map(event => event.result.protection).sort(), [2, 3]);
  assert.ok(guards.every(event => event.roll === undefined && event.result.progress === 0));
  note('protect-good-and-missed-keyboard', { protections: guards.map(event => event.result.protection) });
  await readyNext(a);

  room = (await state(a)).room;
  await select(a, 'assist', room.enemyIntent.targetActorId, 'hero');
  await a.getByRole('checkbox', { name: 'Assist timing' }).check();
  const assistedBefore = records.length;
  await a.getByRole('button', { name: 'Release with timing assistance' }).click();
  for (let wait = 0; records.length === assistedBefore && wait < 50; wait++) await sleep(100);
  assert.equal(records.length, assistedBefore + 1); assert.equal(records.at(-1).command.action.releaseMs, 800);
  await select(b, 'assist', 'boat'); await skip(b); await syncAll(); await readyNext(a);
  note('assisted-release-same-bonus');

  // Authored Spotlight: signed preview is reviewed, then timed at the shared dock.
  room = (await state(a)).room;
  const spentBefore = room.players[identities[0].userId].spotlightChapters.length;
  await a.locator('[data-scene-target="reeds"][data-target-kind="scene"]').click();
  await a.locator('.di-context-spotlight').click();
  await a.getByRole('button', { name: 'Hide in the reeds', exact: true }).click();
  await a.getByRole('button', { name: 'Ready this Spotlight', exact: true }).waitFor();
  const preview = (await state(a)).proposal;
  assert.equal(preview.source, 'authored'); assert.ok(preview.id.includes('.'));
  assert.equal((await state(a)).room.players[identities[0].userId].spotlightChapters.length, spentBefore);
  await a.getByRole('button', { name: 'Ready this Spotlight', exact: true }).click();
  await a.getByRole('checkbox', { name: 'Assist timing' }).uncheck();
  const spotlight = await pointerRelease(a, 800);
  assert.equal(spotlight.command.action.token, 'spotlight'); assert.equal(spotlight.command.action.proposal.id, preview.id);
  await select(b, 'assist', 'boat'); await skip(b); await syncAll();
  assert.ok((await state(a)).room.players[identities[0].userId].spotlightChapters.includes(1));
  note('authored-spotlight-reviewed-then-timed'); await readyNext(a);

  // Lose two responses AFTER service commits: initial send + idempotent retry.
  room = (await state(a)).room;
  const contributionBefore = room.players[identities[0].userId].actions;
  await select(a, 'fight', room.enemyIntent.sourceId);
  await a.getByRole('button', { name: /Heavy Blow/ }).click();
  faults.loseAResponses = 2;
  await a.setViewportSize({ width: 414, height: 770 });
  await a.screenshot({ path: 'output/playwright/mobile-before-checking-receipt-414.png', animations: 'disabled' });
  const choosingStage = await a.locator('.di-scene-stage').boundingBox();
  let resumeAct;
  faults.pauseAAct = new Promise(resolve => { resumeAct = resolve; });
  const uncertainBefore = records.length;
  try {
    const releaseButton = a.getByRole('button', { name: 'Hold and release the die', exact: true });
    await releaseButton.focus();
    await a.keyboard.down('Space'); await sleep(800); await a.keyboard.up('Space');
    await a.locator('.di-round-rest-bar').waitFor();
    await guidance(a, 'pending');
    await a.locator('.di-round-scroll').waitFor();
    await a.getByRole('button',{name:'View scene',exact:true}).click();
    assert.doesNotMatch(await a.locator('.di-round-rest-bar').textContent(), /Tap (?:a target|something)/i, 'Receipt checking keeps the sent move rather than asking for a new target');
    const pendingStage = await a.locator('.di-scene-stage').boundingBox();
    const pendingHero = await a.locator('.di-stage-party .di-avatar').first().boundingBox();
    assert.ok(pendingStage.height >= choosingStage.height, `Receipt checking keeps the encounter height stable: ${JSON.stringify({ choosingStage, pendingStage })}`);
    assert.ok(pendingHero.width >= 44 && pendingHero.height >= 44, 'Hero remains visible while checking receipt');
    await a.screenshot({ path: 'output/playwright/mobile-checking-receipt-414.png', animations: 'disabled' });
    note('pending-receipt-stable-scene-and-visible-hero');
  } finally { resumeAct(); faults.pauseAAct = null; }
  await waitForStore(a, () => !window.__qaAdventureStore.getState().loading);
  assert.equal(records.length, uncertainBefore + 1, 'one timed move after receipt delay');
  const uncertain = records.at(-1);
  assert.ok(Number.isInteger(uncertain.command.action.releaseMs), 'Delayed receipt preserves a timed release');
  assert.doesNotMatch(await a.locator('.di-round-rest-bar').textContent(), /Tap (?:a target|something)/i, 'Uncertain delivery keeps the sent move visible');
  await a.getByRole('button', { name: 'Retry same move', exact: true }).click();
  await waitForStore(a, () => !window.__qaAdventureStore.getState().loading);
  const duplicate = records.at(-1);
  assert.equal(duplicate.command.id, uncertain.command.id); assert.deepEqual(duplicate.command.action, uncertain.command.action);
  await a.reload();
  await waitForStore(a, () => window.__qaAdventureStore.getState().ready);
  const cached = await a.evaluate(() => JSON.parse(localStorage.getItem('dropinn-v2-player-sceneqaa')));
  assert.equal(cached.pendingAction.commandId, uncertain.command.id); assert.deepEqual(cached.pendingAction.action, uncertain.command.action);
  assert.equal(cached.pendingAction.action.approach, 'heavy');
  await a.evaluate(value => { window.__qaOffset = value; }, offset);
  faults.blockAReads = false; await sync(a);
  await a.getByRole('main', { name: 'Adventure table' }).waitFor();
  assert.equal((await state(a)).pendingMove, null);
  await guidance(a, 'committed');
  assert.equal(await a.locator('.di-scene-selection').count(), 0, 'A reload-confirmed move has no new-action instructions');
  assert.doesNotMatch(await a.locator('.di-round-rest-bar').textContent(), /Tap (?:a target|something)/i);
  assert.equal((await state(a)).room.players[identities[0].userId].actions, contributionBefore);
  await select(b, 'assist', 'boat'); await skip(b); await syncAll();
  assert.equal((await state(a)).room.players[identities[0].userId].actions, contributionBefore + 1);
  note('lost-response-duplicate-retry-reload', { sameCommandId: true, sameReleasePayload: true, onceOnlyContribution: true });
  await readyNext(a);

  await playToChapter(a, identities, 2);
  await layout(a, 'chapel');
  await showTokens(a);
  await a.getByRole('button', { name: 'Fight token', exact: true }).tap();
  await a.locator('[data-scene-target="gloamfang"][data-target-kind="scene"]').tap();
  await a.getByRole('group', { name: 'Choose an approach' }).waitFor();
  assert.equal(await a.locator('.di-stage-targets [data-scene-target]').count(), 4);
  await a.getByRole('button', { name: /Heavy Blow:/ }).tap();
  await a.getByRole('button', { name: /Quick Strike:/ }).tap();
  await layout(a, 'chapel-focus');
  await a.getByRole('button', { name: 'Back to scene', exact: true }).click();
  note('three-chapters-real-handler', { chapter: (await state(a)).room.chapter });

  // Real pointer dragging uses the same accessible targets as tap placement.
  const dragBefore = records.length;
  await showTokens(a);
  const hand = a.getByRole('button', { name: 'Help token', exact: true });
  const altar = a.locator('[data-scene-target="captives"][data-target-kind="scene"]');
  const fight = a.getByRole('button', { name: 'Fight token', exact: true });
  let from = await fight.boundingBox(), to = await altar.boundingBox();
  await a.mouse.move(from.x + from.width / 2, from.y + from.height / 2); await a.mouse.down();
  await a.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 12 }); await a.mouse.up();
  assert.equal(await altar.getAttribute('aria-pressed'), 'false');
  assert.equal(await a.getByRole('button', { name: 'Roll now', exact: true }).count(), 0, 'An invalid drop does not prepare a move');
  assert.equal(records.length, dragBefore);
  from = await hand.boundingBox();
  await a.mouse.move(from.x + from.width / 2, from.y + from.height / 2); await a.mouse.down();
  await a.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 12 }); await a.mouse.up();
  assert.equal(await altar.getAttribute('aria-pressed'), 'true'); assert.equal(records.length, dragBefore);
  for (const target of ['gloamfang', 'ward', 'bell', 'captives']) await select(a, 'assist', target);
  const story = a.getByRole('button', { name: 'Story', exact: true });
  await story.click();
  await a.getByRole('button',{name:'Expand story',exact:true}).click();
  const dialog = a.getByRole('dialog', { name: 'Story & journal' });
  await dialog.waitFor();
  await a.keyboard.press('Tab');
  assert.equal(await a.evaluate(() => !!document.activeElement.closest('[role="dialog"]')), true);
  await a.keyboard.press('Escape');
  await a.keyboard.press('Escape');
  assert.equal(await story.evaluate(node => document.activeElement === node), true);
  note('drag-valid-invalid-all-targets-and-drawer-focus');

  // Advancing this fixture clock past the actual deadline while holding must
  // cancel the gesture; a late pointer-up cannot leak into the reveal/new turn.
  room = (await state(a)).room;
  const expiredBefore = records.length;
  die = a.getByRole('button', { name: 'Hold and release the die' });
  const deadlineRect = await die.boundingBox();
  await a.mouse.move(deadlineRect.x + 20, deadlineRect.y + 20); await a.mouse.down();
  await advanceTo(room.deadline + 1); await a.mouse.up(); await sleep(1300);
  assert.equal(records.length, expiredBefore);
  assert.equal((await state(a)).room.phase, 'reveal');
  note('deadline-cancels-active-browser-hold');

  // Bounded PRESENTATION fixtures follow the real-handler scenarios above.
  // They exercise client rendering only, not service outcomes or persistence.
  const renderBase = structuredClone((await state(a)).room);
  renderBase.revision += 100_000;
  renderBase.revealUntil = clock() + 60_000;
  // Keep the departure fixture on another hero: departing self is locked and
  // tapping self intentionally plays the local hero toy instead of inspecting.
  const renderSelf = (await state(a)).userId;
  const renderVictim = renderBase.seats.find(seat => seat.actorId !== renderSelf && seat.kind === 'human').actorId;
  renderBase.enemyIntent.targetActorId = renderVictim;
  const renderedHero = a.locator(`[data-scene-target="${renderVictim}"][data-target-kind="hero"]`);
  const fixtureEvent = (id, details) => ({ id: `qa-render-${id}`, turn: renderBase.turn, chapter: renderBase.chapter, at: clock(), kind: 'consequence', text: `Presentation fixture ${id}`, ...details });
  await waitForStore(a, () => { const store = window.__qaAdventureStore.getState(); return !store.syncing && !store.loading; });
  await a.evaluate(async () => {
    const store = (await import('/src/store/adventureStore.ts')).useAdventureStore;
    window.__qaRenderRestore = { room: store.getState().room, syncRoom: store.getState().syncRoom };
    store.setState({ syncRoom: async () => {} });
  });
  const fixture = async events => a.evaluate(async snapshot => {
    const store = (await import('/src/store/adventureStore.ts')).useAdventureStore;
    store.setState({ room: snapshot });
  }, { ...renderBase, mechanicsVersion: undefined, events });
  try {
    await a.evaluate(async snapshot => {
      const store = (await import('/src/store/adventureStore.ts')).useAdventureStore;
      store.setState({ room: snapshot });
    }, { ...renderBase, phase: 'choosing', commits: {}, flags: [...renderBase.flags, 'bell-rung'], deadline: clock() + 60_000 });
    await select(a, 'investigate', 'bell');
    await layout(a, 'ringing-bell-focus');
    await a.getByRole('button', { name: 'Back to scene', exact: true }).click();
    note('developed-bell-mobile-focus', { evidence: 'Client snapshot rendering only; reproduces the supplied long-title state' });
    await a.evaluate(async snapshot => {
      const store = (await import('/src/store/adventureStore.ts')).useAdventureStore;
      store.setState({ room: snapshot });
    }, { ...renderBase, phase: 'choosing', commits: {}, deadline: clock() + 60_000,
      seats: renderBase.seats.map(seat => seat.actorId === renderVictim ? { ...seat, leaving: true, hp: Math.max(0, seat.character.maxHp - 2) } : seat) });
    const departingInspectionBefore = records.length;
    await renderedHero.click();
    await heroMoves.waitFor();
    assert.equal(await heroMoves.getByRole('button', { name: /^Mend / }).count(), 0, 'A departing threatened hero cannot receive a new Mend');
    assert.equal(await heroMoves.getByRole('button', { name: /^Protect / }).count(), 1, 'The frozen strike remains protectable until resolution');
    assert.equal(records.length, departingInspectionBefore);
    await a.keyboard.press('Escape');
    note('snapshot-departing-hero-keeps-protect-without-mend', { evidence: 'Client snapshot rendering only' });
    await fixture([fixtureEvent('blocked', { result: { targetKind: 'hero', targetId: renderVictim, damage: 0, protection: 3, hp: 7 } })]);
    const threat = a.locator('.di-stage-threat');
    await a.waitForFunction(() => document.querySelector('.di-stage-threat strong')?.textContent === 'Attack blocked');
    assert.match(await threat.getAttribute('aria-label'), /Attack blocked:.*0 damage/);
    assert.equal((await threat.locator(':scope > span:last-child').textContent()).trim(), '0');
    note('snapshot-render-fixture-blocked-strike', { evidence: 'Client snapshot rendering only' });

    await fixture([]);
    await a.waitForFunction(() => document.querySelector('.di-stage-threat strong')?.textContent === 'Strike averted');
    assert.match(await threat.getAttribute('aria-label'), /Strike averted:.*0 damage/);
    note('snapshot-render-fixture-averted-strike', { evidence: 'Client snapshot rendering only' });

    const failed = fixtureEvent('failed-first', { kind: 'action', actorId: identities[0].userId, contribution: true, success: false, roll: 2, modifier: 1,
      result: { targetKind: 'scene', targetId: 'ward', token: 'investigate', progress: 0, changed: false } });
    const succeeded = fixtureEvent('succeeded-second', { kind: 'action', actorId: identities[1].userId, contribution: true, success: true, roll: 17, modifier: 2,
      result: { targetKind: 'scene', targetId: 'ward', token: 'assist', progress: 2, changed: true } });
    await fixture([failed, succeeded]);
    const mark = a.locator('[data-scene-target="ward"] .di-object-result');
    await mark.locator('svg').waitFor();
    assert.equal(await mark.locator('svg.lucide-check').count(), 1);
    assert.ok(!(await mark.textContent()).includes('!'));
    note('snapshot-render-fixture-failure-then-success', { evidence: 'Client snapshot rendering only' });

    await fixture([failed, succeeded,
      fixtureEvent('healing', { result: { targetKind: 'hero', targetId: renderVictim, healing: 3, hp: 9 } }),
      fixtureEvent('damage', { result: { targetKind: 'hero', targetId: renderVictim, damage: 2, hp: 7 } }),
    ]);
    const delta = renderedHero.locator('.di-stage-damage');
    await a.waitForFunction(victim => document.querySelector(`[data-scene-target="${victim}"] .di-stage-damage`)?.getAttribute('aria-label') === 'Recovered 3 HP. Lost 2 HP.', renderVictim);
    assert.equal((await delta.locator('.di-stage-healing').textContent()).trim(), '+3');
    assert.ok((await delta.textContent()).includes('−2'));
    assert.match(await threat.getAttribute('aria-label'), /The strike lands:.*2 damage/);
    await openRound(a); await a.locator('.di-round-body[data-beat=full]').waitFor();
    await a.waitForFunction(() => !document.querySelector('.di-turn-resolution'));
    await a.screenshot({ path: 'output/playwright/integration-render-fixture-results.png' });
    note('snapshot-render-fixture-healing-and-damage', { evidence: 'Client snapshot rendering only' });

    // The presentation clock must catch up on late delivery; a missed roll still
    // shows its actual progress and cost. These are explicitly client fixtures.
    await fixture([fixtureEvent('late-payoff', { kind: 'action', actorId: identities[0].userId, contribution: true,
      at: clock() - 4000, success: false, roll: 3, modifier: 2,
      result: { targetKind: 'scene', targetId: 'ward', progress: 0.5, danger: 0.5 } })]);
    await openRound(a); await a.locator('.di-round-body[data-beat=full]').waitFor();
    await a.waitForFunction(() => !document.querySelector('.di-turn-resolution'));
    assert.match(await a.locator('.di-round-body').textContent(), /\+0.5 progress.*\+0.5 danger/);
    await a.screenshot({ path: 'output/playwright/game-feel-phone-payoff.png' });
    const fit = await a.locator('.di-round-body').evaluate(node => {
      const box = node.getBoundingClientRect(), stage = node.parentElement.getBoundingClientRect();
      return box.left >= stage.left && box.right <= stage.right && box.top >= stage.top && box.bottom <= stage.bottom;
    });
    assert.ok(fit, 'Payoff fits the small phone stage');
    await a.emulateMedia({ reducedMotion: 'reduce' });
    await fixture([fixtureEvent('reduced-now', { kind: 'action', actorId: identities[0].userId, contribution: true, success: true, roll: 12, modifier: 3,
      result: { targetKind: 'scene', targetId: 'ward', executionBonus: 1, progress: 1.5, danger: -0.5 } })]);
    await openRound(a); await a.locator('.di-round-body[data-beat=full]').waitFor();
    await a.waitForFunction(() => !document.querySelector('.di-turn-resolution'));
    assert.match(await a.locator('.di-round-body').textContent(), /= 15/);
    assert.equal(await a.locator('.di-turn-resolution').count(), 0);
    await a.emulateMedia({ reducedMotion: 'no-preference' });
    await fixture([fixtureEvent('guaranteed-protect', { kind: 'action', actorId: identities[0].userId, contribution: true,
      result: { targetKind: 'hero', targetId: renderVictim, protection: 3, progress: 0 } })]);
    await openRound(a); await a.locator('.di-round-body[data-beat=full]').waitFor();
    await a.locator('[data-round-entry=qa-render-guaranteed-protect]').waitFor();
    assert.equal(await a.locator('.di-resolution-die').count(), 0);
    assert.match(await a.locator('.di-round-body').textContent(), /protection/);
    note('snapshot-pacing-late-receipt-reduced-motion-and-guaranteed-protect', { evidence: 'Client snapshot rendering only' });

    const { chaptersFor } = await ssr.ssrLoadModule('/src/lib/dropinn/registry.ts');
    const keepsake = chaptersFor(renderBase)[renderBase.chapter].keepsake;
    renderBase.outcomes = [{ chapter: renderBase.chapter, result: 'success', text: 'Presentation fixture chapter close.', at: clock() }];
    renderBase.players[identities[0].userId].keepsakes.push(keepsake);
    await fixture([fixtureEvent('chapter-close', { kind: 'action', actorId: identities[0].userId, contribution: true,
      at: renderBase.outcomes[0].at, success: true, roll: 15, modifier: 3, result: { targetKind: 'scene', targetId: 'ward', progress: 1.5 } })]);
    await a.locator('.di-party-keepsake').waitFor();
    assert.match(await a.locator('.di-party-keepsake').textContent(), /Chapter 3 complete/);
    const { hatForKeepsake } = await ssr.ssrLoadModule('/src/lib/cosmetics.ts');
    assert.ok((await a.locator('.di-party-keepsake').textContent()).includes(hatForKeepsake(keepsake)?.label ?? keepsake));
    assert.ok(await a.locator('.di-round-body').evaluate(node => {
      const box = node.getBoundingClientRect();
      return box.top >= 0 && box.bottom <= innerHeight;
    }), 'Chapter reward fits the small phone stage');
    await a.screenshot({ path: 'output/playwright/game-feel-chapter-fixture.png' });
    note('snapshot-chapter-keepsake-and-small-phone-fit', { evidence: 'Client snapshot rendering only' });
  } finally {
    await a.evaluate(async () => {
      const store = (await import('/src/store/adventureStore.ts')).useAdventureStore;
      store.setState(window.__qaRenderRestore);
      delete window.__qaRenderRestore;
    });
  }
  // Finish the original adventure through visible controls, including the phone finale.
  for (let round = 0; round < 10 && (await state(a)).room.status !== 'completed'; round++) {
    await readyNext(a);
    const target = getScene((await state(a)).room).targets.find(item => item.tokens.includes('assist'));
    for (const page of [a, b]) {
      await select(page, 'assist', target.id);
      await skip(page);
    }
    await syncAll();
  }
  assert.equal((await state(a)).room.status, 'completed');
  assert.equal((await state(b)).room.status, 'completed');
  await guidance(a, 'completed');
  await layout(a, 'completed');
  note('three-chapter-browser-playthrough-completed');
  // Four humans: a fresh solo turn admits three late arrivals at its boundary.
  const four = [];
  for (const name of ['C', 'D', 'E', 'F']) four.push(await setup(name, { width:390, height:844 }));
  await four[0].getByRole('button', { name: 'Play with friends', exact: true }).click();
  await four[0].getByRole('button', {name:'Start a friend table',exact:true}).click();
  await four[0].getByRole('main', {name:'Adventure table'}).waitFor();
  await four[0].getByRole('button', {name:'Invite',exact:true}).click();
  const fourInvite = await four[0].getByRole('textbox', {name:'Full invitation link'}).inputValue();
  await four[0].keyboard.press('Escape');
  for (const page of four.slice(1)) {
    await page.getByRole('button', { name: 'Play with friends', exact: true }).click();
    await page.getByRole('textbox', {name:'Adventure code or invitation link'}).fill(fourInvite);
    await page.getByRole('button', {name:'Join adventure by code'}).click();
    await page.getByRole('main', {name:'Adventure table'}).waitFor();
    await page.locator('[data-scene-target="mara"]').click();
    await page.getByRole('group', {name:'Moves for this target'}).waitFor();
    assert.equal(await page.getByRole('group', {name:'Moves for this target'}).locator('button:enabled').count(), 0);
    await page.keyboard.press('Escape');
  }
  await select(four[0], 'assist', 'mara'); await skip(four[0]); await syncAll();
  await openRound(four[0]); await four[0].waitForFunction(() => document.querySelector('.di-round-body')?.getAttribute('data-beat') === 'full');
  assert.ok((await four[0].locator('.di-round-body').textContent()).includes('Companion'));
  await readyNext(four[0]);
  assert.equal((await state(four[0])).room.seats.filter(seat=>seat.kind==='human').length, 4);
  await four[1].reload(); await four[1].evaluate(value=>{window.__qaOffset=value;},offset);
  await four[1].getByRole('button', {name:/Last round/}).waitFor();
  await four[1].getByRole('button', {name:/Last round/}).click();
  await four[1].getByRole('dialog', {name:'Last round',exact:true}).waitFor();
  assert.ok((await four[1].locator('.di-round-body').textContent()).includes('Mara'));
  await four[1].keyboard.press('Escape');
  for (const page of four) {
    await select(page, page === four[0] ? 'investigate' : 'assist', page === four[0] ? 'tracks' : 'mara'); await skip(page);
    if (page === four[0]) {
      const receipt = (await state(page)).room.commits[(await state(page)).userId];
      await page.getByRole('button', {name:'View scene',exact:true}).click();
      await page.locator('[data-scene-target="tracks"]').click();
      assert.equal(await page.getByRole('group', {name:'Moves for this target'}).locator('button:enabled').count(), 0);
      assert.deepEqual((await state(page)).room.commits[(await state(page)).userId], receipt);
      await page.keyboard.press('Escape');
      await page.getByRole('button',{name:'Open round scroll',exact:true}).click();
    }
  }
  await syncAll();
  await openRound(four[0]); await four[0].waitForFunction(() => document.querySelector('.di-round-body')?.getAttribute('data-beat') === 'full');
  assert.equal(await four[0].locator('.di-round-body [data-kind=action]').count(), 4);
  const fourText = await four[0].locator('[data-round-entry] > p:first-of-type').allTextContents();
  for (const page of four.slice(1)) { await openRound(page); await page.waitForFunction(() => document.querySelector('.di-round-body')?.getAttribute('data-beat') === 'full'); assert.deepEqual(await page.locator('[data-round-entry] > p:first-of-type').allTextContents(), fourText); }
  await layout(four[0], 'four-player-recap');
  note('four-player-attribution-late-arrival-reload-and-locked-inspection');
  await readyNext(four[0]); await syncAll();
  await four[3].getByRole('button',{name:'Story settings',exact:true}).click();
  await four[3].getByRole('checkbox',{name:/Pace turn results/}).uncheck();
  await four[3].keyboard.press('Escape');
  const skipRoundRoom=(await state(four[0])).room;
  const skipTarget=getScene(skipRoundRoom).targets.find(item=>item.tokens.includes('assist'));
  for(const page of four) { await select(page,'assist',skipTarget.id); await skip(page); }
  await syncAll();
  assert.equal((await state(four[0])).room.phase,'reveal');
  const revealRoom = (await state(four[0])).room;
  const nextLabel = revealRoom.outcomes.some(outcome => outcome.chapter === revealRoom.chapter) ? 'Next chapter' : 'Next round';
  await four[0].getByRole('button',{name:nextLabel,exact:true}).waitFor();
  await waitForStore(four[3],()=>{const s=window.__qaAdventureStore.getState();return s.room?.revealSkips?.includes(s.userId);});
  assert.equal((await state(four[3])).room.revealSkips.length,1,'setting off sends one automatic skip vote');
  await four[0].getByRole('button',{name:/^Next (round|chapter)$/}).click();
  await syncAll();
  assert.equal((await state(four[0])).room.phase,'reveal','one player cannot advance the whole table');
  assert.equal((await state(four[0])).room.revealSkips.length,2);
  assert.equal(await four[0].locator('.di-round-body').getAttribute('data-beat'),'full');
  assert.equal(await four[0].getByRole('button',{name:'Ready',exact:true}).isDisabled(),true,'The accepted readiness vote stays visible');
  assert.match(await four[0].locator('.di-round-footer').textContent(), /2 of 4 ready/);
  await four[1].getByRole('button',{name:/^Next (round|chapter)$/}).click();
  await four[2].getByRole('button',{name:/^Next (round|chapter)$/}).click();
  await syncAll();
  for(const page of four) assert.equal((await state(page)).room.phase,'choosing');
  note('four-player-unanimous-skip-and-persistent-auto-skip-setting');
  }
  const narratorPage=await setup('Narrator',{width:390,height:844});
  await checkNarrator({page:narratorPage,select,skip,state,sync,readyNext,note});
  assert.equal(externalCalls, 0); assert.deepEqual(errors, []);
  note('no-external-calls-or-browser-errors');
} catch (error) {
  note('FAILED', { message: error.message, stack: error.stack });
  for (let i = 0; i < pages.length; i++) await pages[i].screenshot({ path: `output/playwright/integration-failure-${i}.png` }).catch(() => {});
  process.exitCode = 1;
} finally {
  faults.blockAReads = false; faults.loseAResponses = 0;
  for (const page of pages) {
    const leave = page.getByRole('button', { name: 'Leave & save', exact: true });
    if (await leave.isVisible().catch(() => false)) {
      await leave.click({ timeout: 2000 }).catch(() => {});
      await waitForStore(page, () => !window.__qaAdventureStore.getState().room, { timeout: 2000 }).catch(() => {});
    }
  }
  try {
    await writeFile(`output/playwright/${narratorOnly ? 'scene-narrator' : 'scene-integration'}-results.json`, JSON.stringify({ fixture: 'Real local handler and browser gestures with injected clock; separately labeled final client-snapshot presentation fixtures; no hosted or model calls', mode: narratorOnly ? 'narrator' : 'full', base, checks, errors, consoleErrors, externalCalls, blockedOrigins: [...blockedOrigins] }, null, 2));
  } finally {
    await browser?.close().catch(() => {});
    await ssr?.close().catch(() => {});
  }
}
