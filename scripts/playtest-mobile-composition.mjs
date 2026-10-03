import { chromium } from 'playwright';
import { createServer } from 'vite';
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

// Controlled presentation fixtures: real reducer outcomes, fixed presentation
// timestamps, two/four human seats. Scene/cooperation runners cover transport.
const args = process.argv.slice(2);
if (args.includes('--help')) {
  console.log('Usage: node scripts/playtest-mobile-composition.mjs [--baseline] [--badges-only | --cooperation-only] [--base-url http://127.0.0.1:5201]\nStart local Vite first. Baseline records design failures without failing the process.');
  process.exit(0);
}
const baseline = args.includes('--baseline');
const badgesOnly = args.includes('--badges-only');
const cooperationOnly = args.includes('--cooperation-only');
assert.ok(!(badgesOnly && cooperationOnly), 'Choose only one focused fixture group.');
const connection = args.filter(arg => !['--baseline', '--badges-only', '--cooperation-only'].includes(arg));
assert.ok(!connection.length || connection.length === 2 && connection[0] === '--base-url');
const origin = new URL(connection[1] ?? 'http://127.0.0.1:5201');
assert.ok(origin.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname)
  && !origin.username && !origin.password && origin.pathname === '/' && !origin.search && !origin.hash);
const base = origin.origin, mode = baseline ? 'baseline' : 'current';
process.chdir(fileURLToPath(new URL('../', import.meta.url)));
await mkdir('output/playwright', { recursive: true });
const measurements = [], failures = [], errors = [], blockedOrigins = new Set();
const actionRequests = [];
let inFlightActions = 0;
let ssr, browser, page, fixtureRoom, initial, selfId, reduceAdventure, clock = Date.now(), fixtureIndex = 0, externalCalls = 0;
const viewports = [{ width: 320, height: 568 }, { width: 390, height: 700 }, { width: 390, height: 844 }, { width: 412, height: 780 }, { width: 1280, height: 800 }];
const artifact = name => `output/playwright/composition-${mode}${badgesOnly ? '-badges' : cooperationOnly ? '-cooperation' : ''}-${name}`;
const sourceFiles = ['SceneAdventure.tsx', 'StageDice.tsx', 'Narrator.tsx', 'mobile-table.css', 'scene-selection.css'];
async function sourceFingerprint() {
  return Object.fromEntries(await Promise.all(sourceFiles.map(async name => [name,
    createHash('sha256').update(await readFile(`src/components/DropInn/${name}`).catch(() => 'missing')).digest('hex')])));
}
const sourceAtStart = await sourceFingerprint();

async function assertClean(label) {
  const status = await page.evaluate(() => {
    const store = window.__compositionStore.getState();
    return { error: store.error, pending: !!store.pendingMove, loading: store.loading,
      alerts: [...document.querySelectorAll('[role=alert]')].filter(node => {
        const bounds = node.getBoundingClientRect();
        return bounds.width > 0 && bounds.height > 0 && getComputedStyle(node).visibility !== 'hidden';
      }).map(node => node.textContent) };
  });
  assert.equal(actionRequests.length, 0, `${label}: controlled presentation gestures must not submit an act command.`);
  assert.equal(inFlightActions, 0, `${label}: an unexpected action request is still running.`);
  assert.ok(!status.error && !status.pending && !status.loading && status.alerts.length === 0,
    `${label}: unexpected pending state or application error ${JSON.stringify(status)}`);
}

async function publish(room, now = clock) {
  await assertClean('Before publishing the next controlled snapshot');
  fixtureRoom = structuredClone(room);
  await page.evaluate(({ room, now }) => {
    window.__compositionNow = now;
    window.__compositionStore.setState({ room, pendingMove: null, loading: false, error: null, syncRoom: async () => {} });
  }, { room: fixtureRoom, now });
  await page.waitForFunction(turn => window.__compositionStore.getState().room.turn === turn, room.turn);
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}
async function fixture(chapter, humans = 2, developed = false) {
  clock += 100_000;
  const room = structuredClone(initial);
  Object.assign(room, { chapter, chapterRound: 2, turn: 100 + ++fixtureIndex, phase: 'choosing', status: 'active',
    deadline: clock + 60_000, revealUntil: null, updatedAt: clock, progress: chapter === 1 ? 14 : 6, danger: 2,
    events: [], outcomes: [], flags: developed ? ['bell-rung', 'captives-guided'] : [], combinations: [], commits: {},
    chapterChoices: chapter === 2 ? { 'briar-bell-rhythm': { phase: 'ready', level: 1, uses: 0,
      sources: [{ actorId: 'composition-peer-1', actorName: 'Alexandria Moonbeam', eventId: 'prior-preparation' }] } } : {},
    riverSupplies: chapter === 1 ? { status: 'secured' } : undefined });
  const self = room.seats.find(seat => seat.actorId === selfId);
  self.character.name = 'Wren'; self.hp = Math.min(7, self.character.maxHp);
  const names = ['Alexandria Moonbeam', 'Bartholomew Copper', 'Christopher Willow'];
  for (let index = 1; index < humans; index++) {
    const peer = room.seats[index];
    peer.kind = 'human'; peer.actorId = `composition-peer-${index}`; peer.character.name = names[index - 1];
    room.players[peer.actorId] = { ...structuredClone(room.players[selfId]), userId: peer.actorId, character: peer.character, seatId: peer.id };
  }
  room.enemyIntent = { turn: room.turn, sourceId: chapter === 1 ? 'pack' : 'gloamfang', targetActorId: selfId, baseDamage: 3, duelModifier: 4 };
  await publish(room);
  await page.getByRole('button', { name: 'Fight token', exact: true }).waitFor();
  return structuredClone(room);
}
async function select(token, id) {
  await page.getByRole('button', { name: `${{ fight: 'Fight', assist: 'Help', investigate: 'Investigate' }[token]} token`, exact: true }).click();
  await page.locator(`[data-scene-target="${id}"][data-target-kind=scene]`).click();
  await page.getByRole('button', { name: /^(Roll|Commit) now$/ }).waitFor();
}
function command(room, actorId, action) {
  return { id: `composition-${room.turn}-${actorId}`, type: 'act', userId: actorId,
    expectedTurn: room.turn, expectedRevision: room.revision, action };
}
function check(condition, message, label) {
  if (!condition) failures.push({ label, message });
}
async function capture(label, state) {
  await assertClean(label);
  const path = artifact(`${label}.png`);
  await page.screenshot({ path, animations: 'disabled' });
  const geometry = await page.evaluate(() => {
    const rect = node => node?.getBoundingClientRect().toJSON();
    const selected = selector => rect(document.querySelector(selector));
    const visible = node => { const box = node.getBoundingClientRect(); return box.width > 0 && box.height > 0 && getComputedStyle(node).visibility !== 'hidden'; };
    const textBounds = node => {
      const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
      const boxes = []; let leaf;
      while ((leaf = walker.nextNode())) if (leaf.textContent.trim() && visible(leaf.parentElement)) {
        const range = document.createRange(); range.selectNodeContents(leaf);
        boxes.push(...[...range.getClientRects()].map(box => box.toJSON()));
      }
      return boxes;
    };
    return { width: innerWidth, height: innerHeight, scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight,
      stage: selected('.di-scene-stage'), dock: selected('.di-scene-dock'), party: selected('.di-stage-party'), toolbar: selected('.di-scene-tools'),
      controls: selected('.di-focus-control'), header: selected('.di-scene-header'), objective: selected('.di-scene-objective'),
      roll: selected('.di-personal-roll .di-roll-tableau'), rollVerdict: selected('.di-personal-roll .di-roll-verdict'), rest: selected('.di-round-rest-bar'),
      restActions: [...document.querySelectorAll('.di-rest-actions button')].map(rect),
      restText: [...document.querySelectorAll('.di-rest-heading,.di-table-consequence,.di-turn-consequence')].flatMap(textBounds),
      dockText: [...document.querySelectorAll('.di-scene-selection,.di-player-guidance,.di-focus-choices,.di-inspection-context')].flatMap(textBounds),
      targets: [...document.querySelectorAll('.di-stage-targets [data-scene-target]')].map(node => ({ id: node.dataset.sceneTarget, hit: rect(node),
        art: rect(node.querySelector('.di-target-art')), label: rect(node.querySelector('.di-object-label')),
        coin: rect(node.querySelector('.di-object-coin')),
        labelText: node.querySelector('.di-object-label')?.textContent, text: textBounds(node.querySelector('.di-object-label') ?? node),
        party: rect(node.querySelector('.di-object-party')), partyText: node.querySelector('.di-object-party') ? textBounds(node.querySelector('.di-object-party')) : [],
        loaded: [...node.querySelectorAll('img')].every(img => img.complete && img.naturalWidth > 0) })),
      heroes: [...document.querySelectorAll('.di-stage-party [data-scene-target]')].map(node => ({ hit: rect(node), label: node.getAttribute('aria-label'),
        badge: rect(node.querySelector('.di-stage-damage')), badgeLabel: node.querySelector('.di-stage-damage')?.getAttribute('aria-label'),
        name: rect(node.querySelector('.di-stage-hero-name')), health: rect(node.querySelector('.di-stage-health')) })),
      dialogs: [...document.querySelectorAll('[role=dialog]')].filter(visible).map(node => node.getAttribute('aria-label')) };
  });
  const overlap = (a, b) => a && b && Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1;
  const inViewport = box => box.left >= -1 && box.right <= geometry.width + 1 && box.top >= -1 && box.bottom <= geometry.height + 1;
  const contains = (outer, inner) => inner.left >= outer.left - 1 && inner.right <= outer.right + 1 && inner.top >= outer.top - 1 && inner.bottom <= outer.bottom + 1;
  check(geometry.scrollWidth <= geometry.width && geometry.scrollHeight <= geometry.height + 1, 'Document overflows viewport.', label);
  check(geometry.dialogs.length === 0, 'A modal obscures the scene under test.', label);
  check(geometry.targets.length === 4, 'Four scene targets must remain visible.', label);
  check(geometry.heroes.length === 4, 'Four seated heroes must remain visible.', label);
  for (const item of [...geometry.targets, ...geometry.heroes]) check(item.hit.width >= 44 && item.hit.height >= 44 && inViewport(item.hit), `Clipped or undersized hit area: ${item.id ?? item.label}.`, label);
  for (const hero of geometry.heroes.filter(hero => hero.badge)) {
    check(inViewport(hero.badge), 'A health delta leaves the viewport.', label);
    check(!overlap(hero.badge, hero.name) && !overlap(hero.badge, hero.health), 'A health delta covers the hero name or current HP.', label);
    for (const item of geometry.targets) check(!overlap(hero.badge, item.label), `A health delta covers a target label: ${item.id}.`, label);
  }
  for (const item of geometry.targets) {
    check(item.loaded, `Artwork failed to load: ${item.id}.`, label);
    check(item.art.width >= 36 && item.art.height >= 36, `Artwork is too small to recognize: ${item.id} (${item.art.width}×${item.art.height}px).`, label);
    check(!overlap(item.art, item.label), `Label overlaps artwork: ${item.id}.`, label);
    check(!overlap(item.coin, item.label), `Selected token covers the target caption: ${item.id}.`, label);
    check(contains(item.hit, item.label), `Caption leaves its target: ${item.id}.`, label);
    if (item.party?.width && item.party?.height) {
      check(contains(item.hit, item.party), `Party row leaves its target: ${item.id}.`, label);
      check(item.partyText.every(box => contains(item.party, box)), `Party text escapes its backing: ${item.id}.`, label);
      check(!overlap(item.party, item.art) && !overlap(item.party, item.label), `Party row covers target art or caption: ${item.id}.`, label);
    }
    if (geometry.width < 740) {
      check(!overlap(item.label, geometry.party), `Label overlaps the hero row: ${item.id}.`, label);
      for (const other of geometry.targets.filter(other => other.id !== item.id)) {
        check(!overlap(item.label, other.art), `Label covers another target's artwork: ${item.id}/${other.id}.`, label);
      }
    }
    check(item.text.every(box => box.left >= item.label.left - 1 && box.right <= item.label.right + 1 && box.top >= item.label.top - 1 && box.bottom <= item.label.bottom + 1), `Label text escapes its backing: ${item.id}.`, label);
    if (geometry.width < 740) check(!overlap(item.hit, geometry.party), `Target overlaps hero row: ${item.id}.`, label);
  }
  // The small phone still needs two usable rows plus its hero row; larger
  // phones should devote at least 35% of visible height to the actual table.
  const minimumScene = geometry.width < 740 ? Math.max(188, geometry.height * .35) : 240;
  check(geometry.stage?.height >= minimumScene, `Scene budget ${geometry.stage?.height}px is below ${minimumScene.toFixed(1)}px.`, label);
  if (geometry.controls) {
    check(inViewport(geometry.controls), 'Release controls leave the viewport.', label);
    check(geometry.dockText.every(box => !overlap(box, geometry.controls)), 'Dock text overlaps release controls.', label);
    check(!overlap(geometry.controls, geometry.toolbar), 'Release controls overlap toolbar.', label);
  }
  if (geometry.roll) {
    check(inViewport(geometry.roll), 'Personal dice leave the visible viewport.', label);
    if (geometry.rollVerdict) check(inViewport(geometry.rollVerdict), 'Roll verdict leaves the visible viewport.', label);
    if (geometry.width < 740) {
      for (const item of geometry.targets) check(!overlap(geometry.roll, item.hit), `Live dice obscure target: ${item.id}.`, label);
      check(geometry.roll.top >= geometry.dock.top - 1 && geometry.roll.bottom <= geometry.dock.bottom + 1, 'Personal dice leave their reserved dock space.', label);
      check([...geometry.restActions, ...geometry.restText].every(box => !overlap(box, geometry.roll)), 'Resting controls or consequence copy overlap the personal dice.', label);
    }
  }
  const entry = { label, state, screenshot: path, ...geometry, violations: failures.filter(failure => failure.label === label).map(failure => failure.message) };
  measurements.push(entry);
  await assertClean(`${label} after capture`);
  console.log(JSON.stringify({ label, sceneHeight: geometry.stage?.height, dockHeight: geometry.dock?.height, violations: entry.violations }));
}
async function captionPeek(label) {
  const buttons = page.locator('.di-narrator.is-compact .di-narrator-line>button');
  assert.equal(await buttons.count(), 3, 'Compact narration retains subtitle, voice, and settings controls.');
  const before = await buttons.evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().toJSON()));
  await page.getByRole('button', { name: 'Show narrator subtitles', exact: true }).click();
  const caption = page.locator('.di-narrator.is-compact .di-narrator-words');
  await caption.waitFor();
  const box = await caption.evaluate(node => ({ text: node.textContent, bounds: node.getBoundingClientRect().toJSON(),
    scrollWidth: node.scrollWidth, clientWidth: node.clientWidth, scrollHeight: node.scrollHeight, clientHeight: node.clientHeight }));
  check(!!box.text?.trim() && box.bounds.left >= 0 && box.bounds.right <= 320 && box.bounds.top >= 0 && box.bounds.bottom <= 568,
    'Expanded subtitle text must remain readable inside the phone.', label);
  check(box.scrollHeight <= box.clientHeight + 1 && box.scrollWidth <= box.clientWidth + 1, 'Subtitle text is clipped.', label);
  const opened = await buttons.evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().toJSON()));
  check(opened.every((bounds, index) => bounds.width >= 44 && bounds.height >= 44 && Math.abs(bounds.x - before[index].x) <= 1 && Math.abs(bounds.y - before[index].y) <= 1),
    'The three narration controls moved or shrank while peeking.', label);
  await page.screenshot({ path: artifact(`${label}.png`), animations: 'disabled' });
  await page.getByRole('button', { name: 'Collapse narrator subtitles', exact: true }).click();
  await caption.waitFor({ state: 'hidden' });
  const closed = await buttons.evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().toJSON()));
  check(closed.every((bounds, index) => Math.abs(bounds.x - before[index].x) <= 1 && Math.abs(bounds.y - before[index].y) <= 1), 'Narrator controls did not return after closing subtitles.', label);
  measurements.push({ label, state: 'temporary compact narrator subtitle peek', screenshot: artifact(`${label}.png`), caption: box,
    controls: { before, opened, closed }, violations: failures.filter(failure => failure.label === label).map(failure => failure.message) });
  console.log(JSON.stringify({ label, violations: failures.filter(failure => failure.label === label) }));
  await page.getByRole('button', { name: 'Story settings', exact: true }).click();
  const settings = page.getByRole('group', { name: 'Story settings', exact: true });
  const settingsBounds = await settings.boundingBox();
  const closeButton = page.getByRole('button', { name: 'Close story settings', exact: true });
  const closeBounds = await closeButton.boundingBox();
  const settingsLabel = `${label}-settings`;
  check(settingsBounds.width >= 250 && settingsBounds.x >= 0 && settingsBounds.x + settingsBounds.width <= 320
    && settingsBounds.y >= 0 && settingsBounds.y + settingsBounds.height <= 568, 'Compact narrator settings must be readable and viewport-clamped.', settingsLabel);
  check(closeBounds.width >= 44 && closeBounds.height >= 44 && closeBounds.y >= 0 && closeBounds.y + closeBounds.height <= 568, 'Narrator settings close control is not reachable.', settingsLabel);
  await page.screenshot({ path: artifact(`${settingsLabel}.png`), animations: 'disabled' });
  await closeButton.click();
  await settings.waitFor({ state: 'hidden' });
  measurements.push({ label: settingsLabel, state: 'compact narrator settings', screenshot: artifact(`${settingsLabel}.png`), settingsBounds, closeBounds,
    violations: failures.filter(failure => failure.label === settingsLabel).map(failure => failure.message) });
  console.log(JSON.stringify({ label: settingsLabel, violations: failures.filter(failure => failure.label === settingsLabel) }));
}
async function inspectDuringRoll(label, targetId) {
  const dice = page.locator('.di-personal-roll .di-roll-tableau');
  const caption = page.locator('.di-mobile-results .di-table-consequence');
  await dice.waitFor(); await caption.waitFor();
  const eventId = await dice.getAttribute('data-roll-event'), text = await caption.textContent();
  await page.locator(`[data-scene-target="${targetId}"][data-target-kind=scene]`).click();
  await page.locator('.di-inspection-context').waitFor();
  assert.equal(await dice.getAttribute('data-roll-event'), eventId, 'Inspecting must retain the same confirmed personal dice.');
  assert.equal(await caption.textContent(), text, 'Inspecting must retain the active confirmed caption.');
  await capture(label, 'inspection while confirmed personal dice and caption remain visible');
  await page.getByRole('button', { name: 'Close inspection', exact: true }).click();
  assert.equal(await dice.getAttribute('data-roll-event'), eventId);
  assert.equal(await caption.textContent(), text);
}

try {
  ssr = await createServer({ configFile: false, cacheDir: 'node_modules/.vite-mobile-composition-tests', optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom', logLevel: 'error' });
  ({ reduceAdventure } = await ssr.ssrLoadModule('/src/lib/dropinn/engine.ts'));
  const { createDropinnHandler } = await ssr.ssrLoadModule('/server/dropinn.ts');
  const handler = createDropinnHandler({ local: true, env: {}, now: () => clock, fetch: async () => { externalCalls++; throw new Error('External requests disabled.'); } });
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: viewports[0], hasTouch: true });
  await context.addInitScript(now => { window.__compositionNow = now; Date.now = () => window.__compositionNow; }, clock);
  page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (['http:', 'https:'].includes(url.protocol) && url.origin !== base) { blockedOrigins.add(url.origin); return route.abort('blockedbyclient'); }
    return route.fallback();
  });
  await page.route('**/api/dropinn', async route => {
    const payload = route.request().postDataJSON();
    const isAction = payload.command?.type === 'act';
    if (isAction) { actionRequests.push({ type: 'act', turn: payload.command.expectedTurn }); inFlightActions++; }
    try {
    if (fixtureRoom && payload.roomCode === fixtureRoom.code && ['read', 'command'].includes(payload.operation)) {
      try {
        if (payload.command) fixtureRoom = reduceAdventure(fixtureRoom, { ...payload.command, userId: payload.sessionId }, clock);
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ backend: 'local', room: fixtureRoom, messages: [] }) });
      } catch (error) { return route.fulfill({ status: 422, contentType: 'application/json', body: JSON.stringify({ error: error.message }) }); }
    }
    const response = await handler(new Request(`${base}/api/dropinn`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) }));
    return route.fulfill({ status: response.status, contentType: 'application/json', body: await response.text() });
    } finally { if (isAction) inFlightActions--; }
  });
  await page.addInitScript(() => localStorage.setItem('dropinn:lobby-story:v1', 'briar-glen'));
  await page.goto(`${base}/?session=compositionqa`);
  assert.equal(await page.evaluate(async () => (await import('/src/lib/dropinn/api.ts')).localPlay), true);
  await page.getByRole('button', { name: 'Play with friends', exact: true }).click();
  const creating = page.waitForResponse(response => response.url() === `${base}/api/dropinn` && response.request().postDataJSON()?.operation === 'play');
  await page.getByRole('button', { name: 'Start a friend table', exact: true }).click();
  assert.equal((await (await creating).json()).backend, 'local');
  await page.getByRole('main', { name: 'Adventure table', exact: true }).waitFor();
  await page.evaluate(async () => { window.__compositionStore = (await import('/src/store/adventureStore.ts')).useAdventureStore; });
  await page.waitForFunction(() => !!window.__compositionStore.getState().room && !window.__compositionStore.getState().loading);
  ({ room: initial, userId: selfId } = await page.evaluate(() => window.__compositionStore.getState()));
  assert.equal(initial.adventureVersion, 4);
  if (cooperationOnly) for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    for (const chapter of [1, 2]) {
      const prefix = `chapter-${chapter + 1}-${viewport.width}x${viewport.height}`;
      const room = await fixture(chapter, 2, chapter === 2);
      const peer = room.seats.find(seat => seat.kind === 'human' && seat.actorId !== selfId);
      const action = { token: 'fight', targetId: room.enemyIntent.sourceId, targetKind: 'scene', approach: 'guarded' };
      const teammateReady = reduceAdventure(room, command(room, peer.actorId, action), clock);
      await publish(teammateReady);
      await select('fight', room.enemyIntent.sourceId);
      await capture(`${prefix}-teammate-ready`, 'accepted teammate plan while choosing attack');

      let waiting = await fixture(chapter, 4, chapter === 2);
      for (const actor of waiting.seats.filter(seat => seat.actorId).slice(0, 3)) {
        waiting = reduceAdventure(waiting, command(waiting, actor.actorId, action), clock);
      }
      assert.equal(waiting.phase, 'choosing');
      await publish(waiting);
      await page.getByText('Waiting for the party', { exact: true }).waitFor();
      await capture(`${prefix}-four-human-waiting`, 'three accepted attacks awaiting the fourth human');
    }
    const room = await fixture(2, 4, true);
    room.flags.push('ward-repaired');
    const action = { token: 'assist', targetId: 'ward', targetKind: 'scene' };
    let prepared = room;
    for (const actor of room.seats.filter(seat => seat.actorId !== selfId)) {
      prepared = reduceAdventure(prepared, command(prepared, actor.actorId, action), clock);
    }
    await publish(prepared);
    await select('investigate', 'ward');
    await capture(`chapter-3-${viewport.width}x${viewport.height}-developed-ready-cooperation`, 'developed ward, shared preparation, and three long-name accepted helpers');
  }
  if (!badgesOnly && !cooperationOnly) for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    for (const chapter of [1, 2]) {
      const prefix = `chapter-${chapter + 1}-${viewport.width}x${viewport.height}`;
      const room = await fixture(chapter, 2, chapter === 2);
      const enemy = room.enemyIntent.sourceId;
      await select('fight', enemy);
      await capture(`${prefix}-attack`, 'selecting attack');
      if (viewport.width === 320 && chapter === 1) await captionPeek(`${prefix}-caption-peek`);
      await page.getByRole('button', { name: /^Guarded Strike:/ }).click();
      await capture(`${prefix}-guarded`, 'alternative attack tradeoff');
      const release = page.getByRole('button', { name: /Hold and release the die|Release with timing assistance/ });
      const rect = await release.boundingBox();
      await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2); await page.mouse.down();
      try {
        await page.locator('.di-focus-control[data-holding=true]').waitFor();
        await capture(`${prefix}-holding`, 'holding release control');
      } finally {
        // TimedRelease handles pointer cancellation on the button. A window
        // blur does not cancel this pointer attempt, and mouseup would commit.
        await release.dispatchEvent('pointercancel', { pointerId: 1, pointerType: 'mouse' });
        await page.mouse.up();
      }
      await page.locator('.di-focus-control[data-holding=false][data-phase=ready]').waitFor();
      await page.waitForFunction(() => !window.__compositionStore.getState().pendingMove && !window.__compositionStore.getState().loading);
      await assertClean('Canceled held gesture before changing fixtures');
      const action = { token: 'fight', targetId: enemy, targetKind: 'scene', approach: 'guarded', releaseMs: 800 };
      const waiting = reduceAdventure(room, command(room, selfId, action), clock);
      await publish(waiting);
      await page.getByText('Waiting for the party', { exact: true }).waitFor();
      await capture(`${prefix}-waiting`, 'accepted move awaiting teammate');
      const peer = waiting.seats.find(seat => seat.kind === 'human' && seat.actorId !== selfId);
      const resolved = reduceAdventure(waiting, command(waiting, peer.actorId, { token: 'assist', targetId: selfId, targetKind: 'hero' }), clock);
      assert.equal(resolved.phase, 'reveal');
      await publish(resolved, clock + 400);
      await page.locator('.di-personal-roll [data-roll-state=anticipating]').waitFor();
      await capture(`${prefix}-rolling`, 'confirmed personal dice windup');
      if (viewport.width === 320 && chapter === 1) await inspectDuringRoll(`${prefix}-roll-inspection`, 'boat');
      await publish(resolved, clock + 1400);
      await page.locator('.di-personal-roll [data-roll-state=settled]').waitFor();
      await capture(`${prefix}-result`, 'confirmed personal dice result');
      await publish(resolved, clock + 6500);
      await page.locator('.di-personal-roll').waitFor({ state: 'hidden' });
      const close = page.getByRole('button', { name: 'View scene', exact: true });
      if (await close.isVisible()) await close.click();
      await capture(`${prefix}-resolved`, 'settled board before next round');
      if (chapter === 2) {
        await fixture(2, 4, true);
        const definition = { token: 'assist', targetId: 'ward', targetKind: 'scene' };
        for (const member of fixtureRoom.seats.filter(seat => seat.actorId !== selfId)) fixtureRoom.commits[member.actorId] = definition;
        await publish(fixtureRoom);
        await select('investigate', 'ward');
        await capture(`${prefix}-long-cooperation`, 'four long names and prepared risk choice');
      }
    }
  }
  if (!cooperationOnly) for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    for (const chapter of [1, 2]) {
      const room = await fixture(chapter, 4, chapter === 2);
      room.seats.find(seat => seat.actorId === selfId).hp = 3;
      room.enemyIntent.baseDamage = 2;
      await publish(room);
      const enemy = room.enemyIntent.sourceId;
      await select('fight', enemy);
      if (badgesOnly && viewport.width === 320 && chapter === 1) await captionPeek(`chapter-${chapter + 1}-${viewport.width}x${viewport.height}-caption-peek`);
      let resolved = room;
      for (const [index, actor] of room.seats.entries()) {
        const action = index === 0 ? { token: 'fight', targetId: enemy, targetKind: 'scene', approach: 'heavy' }
          : index === 1 ? { token: 'assist', targetId: selfId, targetKind: 'hero', approach: 'mend', releaseMs: 800 }
            : { token: 'investigate', targetId: chapter === 1 ? 'reeds' : 'bell', targetKind: 'scene', approach: 'trail' };
        resolved = reduceAdventure(resolved, command(resolved, actor.actorId, action), clock);
      }
      assert.equal(resolved.phase, 'reveal');
      const healing = resolved.events.filter(event => event.result?.targetId === selfId).reduce((sum, event) => sum + (event.result?.healing ?? 0), 0);
      const damage = resolved.events.filter(event => event.result?.targetId === selfId).reduce((sum, event) => sum + (event.result?.damage ?? 0), 0);
      assert.deepEqual({ healing, damage }, { healing: 3, damage: 2 });
      const prefix = `chapter-${chapter + 1}-${viewport.width}x${viewport.height}`;
      if (badgesOnly && viewport.width === 320 && chapter === 1) {
        await publish(resolved, clock + 400);
        await page.locator('.di-personal-roll [data-roll-state=anticipating]').waitFor();
        await inspectDuringRoll(`${prefix}-roll-inspection`, 'boat');
      }
      await publish(resolved, clock + 5600);
      await page.locator('.di-stage-damage[aria-label="Recovered 3 HP. Lost 2 HP."]').waitFor();
      const showingRound = page.getByRole('button', { name: 'View scene', exact: true });
      if (await showingRound.isVisible()) await showingRound.click();
      await capture(`${prefix}-healing-damage`, 'recorded Mend +3 and frozen enemy hit −2');
      await publish(resolved, clock + 6500);
      await page.locator('.di-personal-roll').waitFor({ state: 'hidden' });
      const close = page.getByRole('button', { name: 'View scene', exact: true });
      if (await close.isVisible()) await close.click();
      await capture(`${prefix}-health-settled`, 'settled recorded healing and damage');
    }
  }
  assert.deepEqual(errors, []);
  await assertClean('Final composition state');
  assert.equal(externalCalls, 0);
  if (!baseline) assert.equal(failures.length, 0, `${failures.length} composition violations; see report.`);
} catch (error) {
  errors.push(error.message); console.error(error.stack); process.exitCode = 1;
  await page?.screenshot({ path: artifact('failure.png'), animations: 'disabled' }).catch(() => {});
} finally {
  const sourceAtEnd = await sourceFingerprint();
  const sourceStable = JSON.stringify(sourceAtStart) === JSON.stringify(sourceAtEnd);
  if (!sourceStable && !baseline) { errors.push('Source changed during capture; rerun against frozen files.'); process.exitCode = 1; }
  await writeFile(artifact('results.json'), JSON.stringify({ evidence: 'Controlled reducer-backed presentation fixtures with frozen visual timestamps; not transport, hosted, physical-phone, or narration quality evidence.',
    mode, badgesOnly, cooperationOnly, base, sourceStable, sourceAtStart, sourceAtEnd, measurements, failures, errors, actionRequests, inFlightActions, externalCalls, blockedOrigins: [...blockedOrigins] }, null, 2));
  await browser?.close().catch(() => {}); await ssr?.close().catch(() => {});
}
