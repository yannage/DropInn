import assert from 'node:assert/strict';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright';
import { createServer } from 'vite';

// Production local handlers and actual player commands. Only clocks, sensor
// events and transport failure delivery are controlled; no game state is set.
const origin = new URL(process.argv[2] ?? 'http://127.0.0.1:5210');
assert.ok(origin.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(origin.hostname) && origin.pathname === '/' && !origin.search && !origin.hash);
const base = origin.origin, checks = [], errors = [], records = [], worlds = [], starts = new Set();
const output = 'output/playwright/avalon-dice';
let browser, ssr, createDropinnHandler, questContent, questChallengePreview, questHash, questCombatMoves, sourceFingerprint, serial = 0;
const note = (name, detail = {}) => { checks.push({ name, ...detail }); console.log(name); };
const sourceFiles = ['src/App.tsx', 'src/components/DropInn/DropInn.tsx', 'src/components/DropInn/QuestAdventure.tsx', 'src/components/DropInn/QuestDice.tsx',
  'src/components/DropInn/quest-dice.css', 'src/components/DropInn/quest-adventure.css', 'src/components/DropInn/quest-art.css', 'src/components/DropInn/avalon-adventure.css',
  'src/components/DropInn/AvalonThreads.tsx', 'src/components/DropInn/SceneArt.tsx', 'src/components/DropInn/TargetArtwork.tsx', 'src/components/DropInn/StageAtmosphere.tsx',
  'src/components/DropInn/TableContact.tsx', 'src/components/DropInn/SceneAdventure.tsx', 'src/lib/dropinn/questDiceGesture.ts', 'src/lib/dropinn/avalonDiceContent.ts',
  'src/lib/dropinn/questRun.ts', 'src/lib/dropinn/questRunTypes.ts', 'src/lib/dropinn/questRunEngine.ts', 'src/lib/dropinn/avalonContent.ts', 'src/lib/dropinn/avalonTypes.ts',
  'src/lib/dropinn/storySelection.ts', 'src/lib/dropinn/engine.ts', 'src/lib/dropinn/registry.ts', 'src/lib/dropinn/types.ts', 'src/store/adventureStore.ts', 'server/dropinn.ts'];
async function fingerprint() {
  const art = (await readdir('public/art')).filter(name => /\.(png|webp)$/.test(name)).map(name => `public/art/${name}`);
  return createHash('sha256').update(JSON.stringify(await Promise.all([...sourceFiles, ...art].sort().map(async file => [file, createHash('sha256').update(await readFile(file)).digest('hex')])))).digest('hex');
}
async function bind(page) {
  await page.evaluate(async () => {
    const loaded = performance.getEntriesByType('resource').map(entry => new URL(entry.name)).filter(url => url.origin === location.origin && url.pathname === '/src/store/adventureStore.ts').sort((a, b) => Number(b.searchParams.get('t') ?? 0) - Number(a.searchParams.get('t') ?? 0));
    window.__diceQAStore = (await import(loaded[0]?.href ?? '/src/store/adventureStore.ts')).useAdventureStore;
  });
}
async function state(page) { await bind(page); return page.evaluate(() => { const s = window.__diceQAStore.getState(); return { room: s.room, userId: s.userId, backend: s.backend, pendingQuest: s.pendingQuest, error: s.error, character: s.character }; }); }
async function settled(page) { await page.locator('[data-quest-mode]').waitFor(); await bind(page); await page.waitForFunction(() => !window.__diceQAStore.getState().loading && !!window.__diceQAStore.getState().room); }
async function sync(page) { await bind(page); await page.evaluate(() => window.__diceQAStore.getState().syncRoom()); await settled(page); }
async function same(world) {
  for (const page of world.pages) await sync(page);
  const states = await Promise.all(world.pages.map(state));
  for (const s of states.slice(1)) { assert.deepEqual(s.room.questRun, states[0].room.questRun); assert.equal(s.room.turn, states[0].room.turn); }
  return states[0].room;
}
function newWorld() {
  const world = { id: ++serial, now: Date.now(), pages: [], contexts: [], faults: {} }; worlds.push(world);
  world.handler = createDropinnHandler({ local: true, env: {}, now: () => world.now, fetch: async () => { throw Error('No external inference in dice QA.'); } });
  return world;
}
async function attach(world, page, label) {
  page.qaLabel = label; page.qaWorld = world; world.pages.push(page);
  page.on('pageerror', error => errors.push({ page: label, message: error.message }));
  page.on('response', response => { if (new URL(response.url()).pathname.startsWith('/art/') && response.status() >= 400) errors.push({ page: label, message: `Artwork ${response.status()}: ${new URL(response.url()).pathname}` }); });
  await page.route('**/*', route => { const url = new URL(route.request().url()); return ['http:', 'https:'].includes(url.protocol) && url.origin !== base ? route.abort('blockedbyclient') : route.fallback(); });
  await page.route('**/api/dropinn', async route => {
    const body = route.request().postDataJSON(), f = world.faults, action = body.command?.type === 'quest-act';
    if (f.blockReads === label && body.operation === 'read') return route.fulfill({ status: 503, json: { error: 'Intentional read interruption' } });
    if (action && f.reject === label) { f.reject = ''; records.push({ world: world.id, page: label, command: body.command, status: 409, accepted: false }); return route.fulfill({ status: 409, json: { error: 'Intentional definitive rejection before acceptance' } }); }
    if (action && f.uncertainBefore === label) { f.uncertainBefore = ''; records.push({ world: world.id, page: label, command: body.command, status: 503, accepted: false }); return route.fulfill({ status: 503, json: { error: 'Intentional uncertain delivery before acceptance' } }); }
    const response = await world.handler(new Request(`${base}/api/dropinn`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }));
    const text = await response.text();
    if (body.command) records.push({ world: world.id, page: label, command: body.command, status: response.status, accepted: response.status === 200 });
    if (action && f.hold === label && response.status === 200) { f.hold = ''; await new Promise(resolve => { f.releaseHeld = resolve; }); }
    if (action && f.lose === label && response.status === 200) { f.lose = ''; return route.fulfill({ status: 503, json: { error: 'Intentional lost acknowledgement after acceptance' } }); }
    await route.fulfill({ status: response.status, contentType: 'application/json', body: text });
  });
}
async function open(world, classKey = 'wizard', suffix = 'a') {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, reducedMotion: 'no-preference' }); world.contexts.push(context);
  await context.addInitScript(at => { window.__diceQANow = Number(localStorage.getItem('dice-qa-time')) || at; Date.now = () => window.__diceQANow; }, world.now);
  const page = await context.newPage(), label = `w${world.id}${suffix}`; await attach(world, page, label);
  await page.goto(`${base}/?session=diceqa${label}`); await page.locator('.di-lobby-play').waitFor(); await bind(page);
  // The public between-visits action performs the normal validated hero save.
  await page.evaluate(async ({ name, classKey }) => window.__diceQAStore.getState().setHero(name, classKey), { name: suffix === 'b' ? 'Toren' : 'Mira', classKey });
  assert.equal((await state(page)).character.classKey, classKey);
  await page.getByRole('button', { name: 'Change story', exact: true }).click();
  await page.getByRole('button', { name: /^Select story: Avalon:.* · Dice & teamwork$/ }).click();
  await page.locator('.di-lobby-play').click(); await settled(page);
  const s = await state(page); assert.equal(s.backend, 'local'); assert.equal(s.room.adventureId, 'avalon'); assert.equal(s.room.adventureVersion, 2); assert.equal(s.room.questRun.avalon.manifest.contentVersion, 2);
  return page;
}
async function closeWorld(world) { for (const context of world.contexts) await context.close(); world.pages = []; world.closed = true; }
const count = world => records.filter(record => record.world === world.id && record.command?.type === 'quest-act').length;
async function clockTo(world, value) { world.now = Math.max(world.now, value); for (const page of world.pages) await page.evaluate(at => { window.__diceQANow = at; localStorage.setItem('dice-qa-time', String(at)); }, world.now); }
async function advance(world) { const room = await same(world); assert.equal(room.phase, 'reveal'); await clockTo(world, room.revealUntil + 1); return same(world); }
async function active(world) { const room = await same(world); for (const page of world.pages) if ((await state(page)).userId === room.questRun.focus.actorId) { await page.bringToFront(); return page; } throw Error('Active hero is not owned by QA'); }
function response(page) { return page.waitForResponse(r => r.url() === `${base}/api/dropinn` && r.request().postDataJSON()?.command?.type === 'quest-act'); }
async function send(page, action, expected = 200) { const promise = response(page); await action(); const r = await promise; assert.equal(r.status(), expected, await r.text()); await settled(page); }
async function prepare(page, target, option) {
  await page.bringToFront(); const before = count(page.qaWorld); await page.locator(`[data-quest-target="${target}"]`).click(); await page.locator(`[data-quest-option="${option}"]`).click();
  assert.equal(count(page.qaWorld), before, 'Preparation must be local.');
  const s = await state(page), authored = questContent(s.room).nodes.flatMap(node => node.targets).find(piece => piece.id === target).options.find(item => item.id === option);
  if (authored.challenge) await page.locator('[data-quest-dice-tray]:not(:disabled)').waitFor(); else await page.locator('[data-quest-release]:not(:disabled)').waitFor();
  return authored;
}
async function ordinary(world, target, option) { const page = await active(world); await prepare(page, target, option); await send(page, () => page.locator('[data-quest-release]').click()); return advance(world); }
async function pass(world) { const page = await active(world); await page.getByRole('button', { name: 'Prepare to pass the lantern', exact: true }).click(); await send(page, () => page.locator('[data-quest-release]').click()); return advance(world); }
async function go(world, destination) {
  const room = await same(world), content = questContent(room), queue = [[room.questRun.nodeId]], seen = new Set(); let path;
  while (queue.length) { const route = queue.shift(), from = route.at(-1); if (seen.has(from)) continue; seen.add(from); if (from === destination) { path = route; break; }
    for (const edge of content.edges.filter(edge => edge.from === from && (edge.requires ?? []).every(id => room.questRun.facts.some(fact => fact.id === id)))) queue.push([...route, edge.to]); }
  assert.ok(path);
  for (const node of path.slice(1)) { const page = await active(world); await page.getByRole('button', { name: 'Open expedition map', exact: true }).click(); await page.locator(`[data-quest-node="${node}"]`).click(); await page.getByRole('button', { name: /Prepare this route/ }).click(); await send(page, () => page.locator('[data-quest-release]').click()); await advance(world); }
}
async function capture(page, name, focus) {
  for (const [width, height] of [[320, 568], [390, 844], [1280, 900]]) {
    await page.setViewportSize({ width, height }); await page.evaluate(async () => { window.scrollTo(0, 0); document.querySelector('.qr-table')?.scrollTo(0, 0); await Promise.all([...document.images].filter(image => image.getClientRects().length).map(image => image.decode().catch(() => {}))); });
    const broken = await page.evaluate(() => [...document.images].filter(image => image.getClientRects().length && (!image.complete || !image.naturalWidth)).map(image => new URL(image.src).pathname));
    assert.deepEqual(broken, []); assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${name}/${width}: overflow`);
    for (const locator of await page.locator('[data-quest-dice] button, [data-quest-option]').all()) { const box = await locator.boundingBox(); assert.ok(box && box.width >= 43 && box.height >= 43, `${name}/${width}: action under 44px`); }
    if (focus) await page.locator(focus).scrollIntoViewIfNeeded();
    // Chromium's 3D compositor needs a paint after a viewport/scroll change;
    // DOM geometry alone can be ready one frame before the cube's pixels.
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const screenshot = await page.screenshot({ path: `${output}-${name}-${width}.png`, animations: 'disabled' });
    const cube = page.locator('[data-quest-dice-tray]:not(:disabled) .qd-cube');
    if (await cube.count()) {
      const box = await cube.boundingBox();
      if (box && box.y >= 0 && box.y + box.height <= height) {
        const color = await cube.evaluate(node => getComputedStyle(node).getPropertyValue('--qd-die').trim());
        const painted = await page.evaluate(async ({ png, box, color }) => {
          const image = new Image(); image.src = `data:image/png;base64,${png}`; await image.decode();
          const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
          const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0);
          const pixels = ctx.getImageData(Math.floor(box.x), Math.floor(box.y), Math.floor(box.width), Math.floor(box.height)).data;
          const rgb = color.match(/\w\w/g).map(value => Number.parseInt(value, 16)); let matches = 0;
          for (let i = 0; i < pixels.length; i += 4) if (Math.hypot(pixels[i] - rgb[0], pixels[i + 1] - rgb[1], pixels[i + 2] - rgb[2]) < 35) matches++;
          return matches;
        }, { png: screenshot.toString('base64'), box, color });
        assert.ok(painted > 80, `${name}/${width}: prepared cube has geometry but no painted die face (${painted} pixels)`);
      }
    }
    for (const badge of await page.locator('.av-piece-effort').all()) { const box = await badge.boundingBox(); assert.ok(box.height <= 25 && box.width >= 55, `${name}/${width}: unfinished badge collapsed vertically`); }
    const roll = page.getByRole('button', { name: 'Roll die', exact: true });
    if (await roll.count()) { await roll.scrollIntoViewIfNeeded(); const box = await roll.boundingBox(); assert.ok(box.y >= 0 && box.y + box.height <= height + 1); }
  }
  await page.setViewportSize({ width: 390, height: 844 }); note(`${name}: loaded art and reachable 44px controls at 320/390/1280`);
}
const startChoice = { 'larch-inn': ['wren', 'inn-request-reserve'], 'old-ford': ['ford-kit', 'ford-skiff-shove'], 'reed-bank': ['bank-reeds', 'bank-haul-reeds'] };
async function preview(page, target, option, expectedHelp) {
  await page.bringToFront(); await page.locator(`[data-quest-target="${target}"]`).click();
  const text = await page.locator(`[data-quest-option="${option}"]`).innerText();
  const authored = await prepare(page, target, option), s = await state(page), p = questChallengePreview(s.room, s.userId, authored), stat = s.room.questRun.heroes[s.userId].attributes[authored.challenge.attribute];
  assert.equal(p.baseModifier, stat); if (expectedHelp !== undefined) assert.equal(p.helpModifier, expectedHelp);
  assert.equal(p.successes, [1, 2, 3, 4, 5, 6].filter(face => face + stat + p.helpModifier >= authored.challenge.dc).length);
  assert.ok(text.includes(`D6 + ${stat} ${p.attribute}`)); assert.ok(text.includes(`${p.successes}/6 rolls succeed`));
  assert.match(await page.locator('[data-quest-dice] .qd-heading').innerText(), new RegExp(`${p.attribute} \\+${stat}`, 'i'));
  assert.ok((await page.locator('[data-quest-dice] .qd-detail').innerText()).includes(authored.preview), 'Prepared move retains its cost and benefit.');
  return p;
}
async function unknownDie(page) { assert.equal(await page.locator('[data-quest-dice] .qd-face i').count(), 0); assert.equal(await page.locator('[data-quest-dice] .qd-unrolled-mark').count(), 6); assert.equal(await page.locator('[data-quest-dice] [data-dice-face]').count(), 0); }
async function beginPointer(page) { await page.bringToFront(); const tray = page.locator('[data-quest-dice-tray]'); await tray.scrollIntoViewIfNeeded(); const box = await tray.boundingBox(); const x = box.x + box.width / 2, y = box.y + box.height / 2; await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x + 15, y + 9); await page.locator('.qd-die-space.is-held').waitFor(); return { tray, box, x, y }; }
async function pointerRoll(page) { const { x, y } = await beginPointer(page); await page.mouse.move(x - 12, y - 7); await page.mouse.move(x, y); await page.mouse.up(); }
async function gestureAndCosmetics(world, page, observer) {
  const before = structuredClone((await state(page)).room.questRun), commands = count(world);
  await page.getByRole('button', { name: 'Change approach', exact: true }).click();
  assert.equal(await page.locator('[data-quest-dice]').count(), 0); assert.ok(await page.locator('[data-quest-option]').count() > 1);
  await prepare(page, ...startChoice[before.nodeId]); assert.equal(count(world), commands);
  await unknownDie(page);
  for (const kind of ['outside', 'pointercancel', 'blur', 'escape']) {
    const { tray, box } = await beginPointer(page);
    if (kind === 'outside') await page.mouse.move(box.x - 8, box.y + 8);
    if (kind === 'pointercancel') await tray.dispatchEvent('pointercancel', { pointerId: 1, pointerType: 'mouse' });
    if (kind === 'blur') await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    if (kind === 'escape') await page.keyboard.press('Escape');
    await page.mouse.up(); await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    assert.equal(count(world), commands, `${kind} must cancel without sending`); assert.equal(await page.locator('.qd-die-space.is-held').count(), 0); await unknownDie(page);
  }
  await page.getByRole('button', { name: 'Moss green die', exact: true }).click();
  assert.equal(await page.evaluate(() => localStorage.getItem('dropinn:quest-die-color:v1')), 'moss');
  assert.notEqual(await observer.evaluate(() => localStorage.getItem('dropinn:quest-die-color:v1')), 'moss');
  assert.equal(count(world), commands); assert.deepEqual((await same(world)).questRun, before);
  note('Outside release, pointercancel, blur and Escape cancel; unknown faces and local die colors never change gameplay or the other identity');
  await page.evaluate(() => Object.defineProperty(window, 'DeviceMotionEvent', { configurable: true, value: undefined }));
  await page.getByRole('button', { name: 'Use phone motion', exact: true }).click(); await page.getByText('Phone motion is unavailable here. Drag the die or use Roll die.', { exact: true }).waitFor();
  await page.evaluate(() => { window.DeviceMotionEvent = class extends Event { static requestPermission = async () => 'denied'; }; });
  await page.getByRole('button', { name: 'Use phone motion', exact: true }).click(); await page.getByText('Motion access was not enabled. Drag the die or use Roll die.', { exact: true }).waitFor();
  await page.evaluate(() => { window.DeviceMotionEvent = class extends Event { static requestPermission = async () => 'granted'; }; });
  await page.getByRole('button', { name: 'Use phone motion', exact: true }).click(); await page.getByRole('button', { name: 'Phone motion on', exact: true }).waitFor();
  await page.evaluate(async () => { for (const vector of [{ x: 0, y: 0, z: 9 }, { x: 9, y: 7, z: 9 }, { x: -8, y: -6, z: 9 }]) { const event = new Event('devicemotion'); Object.defineProperty(event, 'accelerationIncludingGravity', { value: vector }); window.dispatchEvent(event); await new Promise(resolve => setTimeout(resolve, 90)); } });
  await page.getByText('Die shaken. Press Roll die when you are ready.', { exact: true }).waitFor();
  assert.equal(count(world), commands); await unknownDie(page); assert.deepEqual((await same(world)).questRun, before);
  await capture(page, 'motion-preparation', '[data-quest-dice]');
  note('Unavailable and denied motion retain manual controls; simulated granted shakes jostle only and require an explicit roll');
}
async function acceptedMotion(world, page, event) {
  const result = page.locator('[data-quest-dice-result]'), cube = result.locator('.qd-cube');
  assert.equal(await result.getAttribute('data-dice-state'), 'landing');
  const first = await cube.evaluate(node => getComputedStyle(node).transform);
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const second = await cube.evaluate(node => getComputedStyle(node).transform); assert.notEqual(second, first, 'A fresh accepted result actually changes its rendered 3D transform.');
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await page.locator('[data-quest-dice-result][data-dice-state="settled"]').waitFor();
  await page.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); });
  assert.equal(await result.getAttribute('data-dice-state'), 'settled');
  await clockTo(world, event.at + 651); await sync(page);
  assert.equal(await result.getAttribute('data-dice-state'), 'settled'); assert.equal(await result.getAttribute('data-dice-face'), String(event.quest.check.roll));
  await sync(page); assert.equal(await result.getAttribute('data-dice-state'), 'settled');
  assert.equal(await result.locator('.qd-result-source').innerText(), 'Toren · The grounded skiff');
  note('A fresh accepted die animates its real CSS transform; hiding, showing and passing 650ms settle the same face without replay', { firstTransform: first, secondTransform: second });
}
async function rejectionRecovery(world, page, choice) {
  const before = structuredClone((await state(page)).room.questRun), label = page.qaLabel;
  world.faults.reject = label; await send(page, () => page.getByRole('button', { name: 'Roll die', exact: true }).click(), 409);
  assert.equal((await state(page)).pendingQuest, null); assert.equal(await page.locator('[data-quest-dice]').count(), 0); assert.deepEqual((await same(world)).questRun, before);
  await prepare(page, ...choice); world.faults.uncertainBefore = label; await send(page, () => page.getByRole('button', { name: 'Roll die', exact: true }).click(), 503);
  const uncertain = structuredClone(records.at(-1).command); assert.ok((await state(page)).pendingQuest); await unknownDie(page);
  world.faults.reject = label; await send(page, () => page.getByRole('button', { name: /Retry the same move/ }).click(), 409);
  assert.deepEqual(records.at(-1).command, uncertain); assert.equal((await state(page)).pendingQuest, null); assert.equal(await page.locator('[data-quest-dice]').count(), 0);
  assert.deepEqual((await same(world)).questRun, before); await prepare(page, ...choice);
  note('Initial definitive rejection and uncertain-then-rejected exact retry both release the die latch; the same option can be prepared again without a spent attempt');
}
async function lostCheck(world, page, observer, choice) {
  const label = page.qaLabel, before = structuredClone((await state(page)).room.questRun), commands = count(world);
  world.faults.blockReads = label; world.faults.hold = label; world.faults.lose = label;
  const acknowledgement = response(page); await pointerRoll(page);
  await page.waitForFunction(() => !!window.__diceQAStore.getState().pendingQuest);
  await unknownDie(page); assert.equal(await page.locator('[data-quest-dice-result]').count(), 0); assert.equal(await page.getByRole('button', { name: 'Roll die', exact: true }).isDisabled(), true);
  await capture(page, 'pending-no-face', '[data-quest-dice]'); await unknownDie(page);
  assert.equal(count(world), commands + 1); assert.ok(world.faults.releaseHeld); world.faults.releaseHeld(); assert.equal((await acknowledgement).status(), 503); await settled(page);
  const sent = structuredClone(records.at(-1).command); await sync(observer);
  const accepted = structuredClone((await state(observer)).room.questRun), event = (await state(observer)).room.events.findLast(entry => entry.quest?.check);
  assert.equal(event.quest.check.success, false); assert.equal(accepted.supplies, before.supplies); assert.equal(accepted.focus.remaining, before.focus.remaining - 1);
  assert.deepEqual(accepted.facts, before.facts); assert.deepEqual(accepted.items, before.items); assert.equal(accepted.usedOptions.includes(choice[1]), false);
  world.faults.lose = label; await send(page, () => page.getByRole('button', { name: /Retry the same move/ }).click(), 503);
  assert.deepEqual(records.at(-1).command, sent); await sync(observer); assert.deepEqual((await state(observer)).room.questRun, accepted);
  await page.reload({ waitUntil: 'domcontentloaded' }); await page.getByRole('heading', { name: 'Your chair is still bookmarked.' }).waitFor(); await bind(page); await page.waitForFunction(() => window.__diceQAStore.getState().ready);
  assert.deepEqual((await state(page)).pendingQuest.action, sent.questAction); world.faults.blockReads = ''; await sync(page);
  assert.equal((await state(page)).pendingQuest, null); assert.deepEqual((await state(page)).room.questRun, accepted);
  const die = page.locator('[data-quest-dice-result]'); assert.equal(await die.getAttribute('data-dice-face'), String(event.quest.check.roll)); assert.equal(await die.getAttribute('data-dice-state'), 'settled');
  await sync(page); await page.emulateMedia({ reducedMotion: 'reduce' }); assert.equal(await die.getAttribute('data-dice-face'), String(event.quest.check.roll));
  await page.emulateMedia({ reducedMotion: 'no-preference' }); assert.equal(await die.getAttribute('data-dice-state'), 'settled');
  await capture(page, 'recorded-failure', '[data-quest-dice-result]');
  note('A held pending response never displays a fabricated face; accepted lost acknowledgement, exact retry and reload preserve one immutable failed check and one spent action');
  return { event, accepted };
}
async function findTeam() {
  for (let attempt = 0; attempt < 36; attempt++) {
    const world = newWorld(), a = await open(world), b = await open(world, 'fighter', 'b'), room = await same(world);
    assert.notEqual((await state(a)).userId, (await state(b)).userId); const node = room.questRun.nodeId, choice = startChoice[node];
    await preview(a, ...choice, 0);
    if (!starts.has(node)) { await capture(a, `start-${node}`, '[data-quest-dice]'); starts.add(node); note(`${node} starts with an optional class-based challenge and honest D6 odds`); }
    const option = questContent(room).nodes.find(item => item.id === node).targets.find(item => item.id === choice[0]).options.find(item => item.id === choice[1]);
    const first = 1 + questHash(`${room.questRun.seed}:${room.turn}:${(await state(a)).userId}:challenge:${option.challenge.id}`) % 6;
    const second = 1 + questHash(`${room.questRun.seed}:${room.turn + 2}:${(await state(b)).userId}:challenge:${option.challenge.id}`) % 6;
    if (node === 'old-ford' && first + 1 < 7 && second + 3 + 2 >= 7) return { world, a, b, choice };
    await closeWorld(world);
  }
  throw Error('No legal generated episode supplied the required fail-then-teamwork roll within 36 fresh attempts.');
}
async function teamJourney() {
  const { world, a, b, choice } = await findTeam();
  await gestureAndCosmetics(world, a, b); await rejectionRecovery(world, a, choice);
  const { event } = await lostCheck(world, a, b, choice); let room = await advance(world);
  await a.locator('[data-quest-option="ford-borrow-tools"]').waitFor();
  assert.match(await a.locator('[data-quest-effort="ford-skiff"]').innerText(), /Mira started something/);
  assert.ok(questContent(room).edges.some(edge => edge.from === room.questRun.nodeId && !edge.requires));
  note('A miss leaves its named unfinished setup on the table, with the guaranteed toolkit and ordinary routes still available');
  room = await pass(world); assert.equal(room.questRun.focus.actorId, (await state(b)).userId);
  await b.locator('[data-quest-effort="ford-skiff"]').waitFor();
  const p = await preview(b, ...choice, 2); assert.equal(p.helpKind, 'party'); assert.equal(p.helperName, 'Mira'); assert.equal(p.helpSourceEventId, event.id);
  assert.match(await b.locator('[data-quest-dice]').innerText(), /Mira adds \+2 help/); await capture(b, 'named-teamwork', '[data-quest-dice]');
  const before = count(world); await send(b, () => b.getByRole('button', { name: 'Roll die', exact: true }).tap()); assert.equal(count(world), before + 1);
  room = await same(world); const success = room.events.findLast(entry => entry.quest?.check);
  assert.equal(success.quest.check.success, true); assert.equal(success.quest.check.helpModifier, 2); assert.equal(success.quest.check.helperName, 'Mira'); assert.equal(success.quest.check.helperActorId, (await state(a)).userId);
  assert.equal(room.questRun.challenges['ford-skiff'].attempts, 2); assert.equal(room.questRun.challenges['ford-skiff'].completedEventId, success.id);
  await acceptedMotion(world, b, success);
  await capture(b, 'teamwork-success', '[data-quest-dice-result]'); room = await advance(world);
  await b.locator('[data-quest-target="ford-kit"]').click(); assert.equal(await b.locator('[data-quest-challenge="ford-skiff"]').count(), 0); assert.ok(room.questRun.facts.some(fact => fact.id === 'skiff-afloat'));
  const skiff = b.locator('[data-quest-target="ford-kit"] img'); await skiff.waitFor(); assert.match(await skiff.getAttribute('src'), /boat-afloat/);
  await b.reload(); await settled(b); assert.equal(await b.locator('[data-quest-dice-result]').getAttribute('data-dice-face'), String(success.quest.check.roll)); assert.equal(await b.locator('[data-quest-dice-result]').getAttribute('data-dice-state'), 'settled');
  note('A second human’s explicit tap adds named +2 setup, succeeds with the authoritative face, closes sibling approaches and opens the illustrated skiff route');
  await gearAndStats(world); await closeWorld(world);
}
async function gearAndStats(world) {
  const room = await same(world), water = room.questRun.avalon.manifest.conflictIds.includes('bitter-water');
  await go(world, water ? 'mill-yard' : 'hill-spring'); await ordinary(world, water ? 'mill-mossback' : 'spring-flock', water ? 'water-fight' : 'herd-fight');
  for (let turn = 0; turn < 16 && (await same(world)).questRun.combat; turn++) {
    const page = await active(world), s = await state(page), moves = questCombatMoves(s.room, s.userId), move = s.character.classKey === 'wizard' && moves.find(item => item.id === 'spell').available ? 'spell' : 'attack';
    assert.match(await page.locator(`[data-quest-move="${move}"]`).innerText(), new RegExp(moves.find(item => item.id === move).description.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    await page.locator(`[data-quest-move="${move}"]`).click(); await send(page, () => page.locator('[data-quest-release]').click()); await advance(world);
  }
  assert.equal((await same(world)).questRun.combat, undefined);
  for (const page of world.pages) {
    const s = await state(page), offer = s.room.questRun.lootOffers.find(item => item.actorId === s.userId); assert.ok(offer);
    const before = structuredClone(s.room.questRun.heroes[s.userId].attributes);
    await page.locator('.qr-table-tools button').filter({ hasText: /point|Choose loot|Build/ }).click();
    const id = offer.choices[0]; await send(page, () => page.locator(`[data-quest-loot="${id}"]`).click()); await page.keyboard.press('Escape');
    assert.ok((await state(page)).room.questRun.heroes[s.userId].equipment.includes(id)); assert.deepEqual((await state(page)).room.questRun.heroes[s.userId].attributes, before);
  }
  await go(world, 'reed-bank'); const page = await active(world), before = await preview(page, 'bank-reeds', 'bank-haul-reeds', 0);
  const s = await state(page); assert.ok(s.room.questRun.heroes[s.userId].points > 0);
  await page.locator('.qr-table-tools button').filter({ hasText: /point|Build/ }).click(); await send(page, () => page.getByRole('button', { name: 'Spend one point on might', exact: true }).click()); await page.keyboard.press('Escape');
  const after = await preview(page, 'bank-reeds', 'bank-haul-reeds', 0); assert.equal(after.baseModifier, before.baseModifier + 1); assert.equal(after.successes, before.successes + 1);
  await capture(page, 'earned-stat-preview', '[data-quest-dice]');
  note('Real battle rewards equip personal gear without inventing check bonuses; an earned Might point updates the visible die modifier and exact odds');
}
async function soloAndStarts() {
  let testedSolo = false;
  for (let attempt = 0; attempt < 36 && (!testedSolo || starts.size < 3); attempt++) {
    const world = newWorld(), page = await open(world), s = await state(page), room = s.room, node = room.questRun.nodeId, choice = startChoice[node];
    const p = await preview(page, ...choice, 0);
    if (!starts.has(node)) { starts.add(node); await capture(page, `start-${node}`, '[data-quest-dice]'); note(`${node} starts with an optional class-based challenge and honest D6 odds`); }
    const die = 1 + questHash(`${room.questRun.seed}:${room.turn}:${s.userId}:challenge:${p.id}`) % 6;
    if (!testedSolo && die + p.modifier < p.dc) {
      const commands = count(world); await send(page, async () => { await page.getByRole('button', { name: 'Roll die', exact: true }).focus(); await page.keyboard.press('Enter'); }); assert.equal(count(world), commands + 1);
      await advance(world); const learned = await preview(page, ...choice, 1); assert.equal(learned.helpKind, 'learned');
      assert.match(await page.locator('[data-quest-dice]').innerText(), /Your earlier attempt adds \+1/); assert.doesNotMatch(await page.locator('[data-quest-dice]').innerText(), /Your party adds/);
      await capture(page, 'solo-practice', '[data-quest-dice]');
      await send(page, async () => { await page.locator('[data-quest-dice-tray]').focus(); await page.keyboard.press('Space'); });
      const checked = (await state(page)).room.events.findLast(event => event.quest?.check).quest.check;
      assert.equal(checked.helpModifier, 1); assert.equal(checked.helpKind, 'learned'); assert.equal(checked.modifier, checked.baseModifier + 1); testedSolo = true;
      note('Keyboard Enter and Space each commit once; a solo retry uses the recorded +1 practice with correct wording and arithmetic');
    }
    await closeWorld(world);
  }
  assert.equal(testedSolo, true); assert.equal(starts.size, 3);
}
async function boundaryCancellations() {
  let world = newWorld(), page = await open(world), choice = startChoice[(await state(page)).room.questRun.nodeId];
  await prepare(page, ...choice); await beginPointer(page); const before = count(world), room = (await state(page)).room;
  await clockTo(world, room.deadline + 1); await page.mouse.up(); assert.equal(count(world), before); await sync(page);
  assert.equal(Object.keys((await state(page)).room.questRun.challenges).length, 0);
  note('Releasing a held die at or after the authoritative deadline sends no attempt'); await closeWorld(world);
  world = newWorld(); page = await open(world); choice = startChoice[(await state(page)).room.questRun.nodeId]; await prepare(page, ...choice);
  const mirror = await page.context().newPage(); await attach(world, mirror, `${page.qaLabel}mirror`); await mirror.goto(page.url()); await settled(mirror);
  await beginPointer(page); const heldCount = count(world);
  await mirror.getByRole('button', { name: 'Prepare to pass the lantern', exact: true }).click(); await send(mirror, () => mirror.locator('[data-quest-release]').click()); await advance(world); await page.mouse.up();
  assert.equal(count(world), heldCount + 1); assert.equal(Object.keys((await same(world)).questRun.challenges).length, 0);
  assert.equal(await page.locator('[data-quest-dice]').count(), 0);
  note('A real same-hero second-tab turn change cancels the old held gesture; its later pointer release cannot submit a stale move'); await closeWorld(world);
}

try {
  await mkdir('output/playwright', { recursive: true }); sourceFingerprint = await fingerprint();
  ssr = await createServer({ configFile: false, cacheDir: 'node_modules/.vite-avalon-dice-tests', optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  ({ createDropinnHandler } = await ssr.ssrLoadModule('/server/dropinn.ts'));
  ({ questContent, questChallengePreview, questHash, questCombatMoves } = await ssr.ssrLoadModule('/src/lib/dropinn/questRun.ts'));
  browser = await chromium.launch({ headless: true }); await teamJourney(); await soloAndStarts(); await boundaryCancellations();
  assert.equal(await fingerprint(), sourceFingerprint, 'Source/art changed during the run; recapture the frozen version.'); assert.deepEqual(errors, []);
} catch (error) {
  errors.push({ message: error.stack ?? String(error) }); process.exitCode = 1;
  for (const world of worlds) for (const page of world.pages) await page.screenshot({ path: `${output}-failure-${page.qaLabel}.png`, fullPage: true }).catch(() => {});
} finally {
  await writeFile(`${output}-results.json`, JSON.stringify({ backend: 'isolated production local handlers', sourceFingerprint, clock: 'controlled client/server time; no gameplay state injection', starts: [...starts], checks, errors,
    commands: records.map(record => ({ world: record.world, page: record.page, id: record.command?.id, type: record.command?.type, action: record.command?.questAction, status: record.status, accepted: record.accepted })) }, null, 2));
  for (const world of worlds) if (!world.closed) await closeWorld(world).catch(() => {});
  await browser?.close(); await ssr?.close(); console.log(JSON.stringify({ checks: checks.length, errors }));
}
