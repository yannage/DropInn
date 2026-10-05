import assert from 'node:assert/strict';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright';
import { createServer } from 'vite';

// Two real identities through the actual isolated local handler. Only time is
// controlled: no gameplay snapshots, facts, equipment or rewards are injected.
const origin = new URL(process.argv[2] ?? 'http://127.0.0.1:5209');
assert.ok(origin.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(origin.hostname)
  && origin.pathname === '/' && !origin.search && !origin.hash && !origin.username && !origin.password);
const base = origin.origin, checks = [], errors = [], records = [], contexts = [], pages = [];
const faults = { loseAction: '', blockReads: '' };
const usedAvalonArt = new Set(), capturedNodes = new Set();
let questContent, AVALON_WORLD;
let now = Date.now(), handler, ssr, browser, sourceFingerprint;
const note = (name, detail = {}) => { checks.push({ name, ...detail }); console.log(name); };
const sourceFiles = ['src/components/DropInn/AvalonThreads.tsx', 'src/components/DropInn/avalon-adventure.css', 'src/lib/dropinn/avalonTypes.ts', 'src/lib/dropinn/avalonContent.ts', 'src/App.tsx', 'src/components/DropInn/DropInn.tsx', 'src/components/DropInn/QuestAdventure.tsx',
  'src/components/DropInn/quest-adventure.css', 'src/components/DropInn/quest-art.css', 'src/components/DropInn/TargetArtwork.tsx',
  'src/components/DropInn/QuestArtwork.tsx', 'src/components/DropInn/SceneArt.tsx',
  'src/components/DropInn/KeepsakeArtwork.tsx', 'src/components/DropInn/HeroProgression.tsx', 'src/components/DropInn/StoryCover.tsx',
  'src/lib/dropinn/storySelection.ts',
  'src/components/DropInn/FrameAnimation.tsx', 'src/components/DropInn/frame-animation.css',
  'src/components/DropInn/TableReactions.tsx', 'src/components/DropInn/TableContact.tsx', 'src/components/DropInn/SceneAdventure.tsx',
  'src/lib/dropinn/frameAnimation.ts',
  'src/lib/dropinn/questRun.ts', 'src/lib/dropinn/questRunTypes.ts', 'src/lib/dropinn/questRunContent.ts',
  'src/lib/dropinn/questRunEngine.ts', 'src/lib/dropinn/engine.ts', 'src/lib/dropinn/registry.ts',
  'src/lib/dropinn/types.ts', 'src/store/adventureStore.ts', 'server/dropinn.ts'];
async function fingerprint() {
  const art = (await readdir('public/art')).filter(name => /\.(png|webp)$/.test(name)).map(name => `public/art/${name}`);
  const hashes = await Promise.all([...sourceFiles, ...art].sort().map(async file => [file, createHash('sha256').update(await readFile(file)).digest('hex')]));
  return createHash('sha256').update(JSON.stringify(hashes)).digest('hex');
}
async function bind(page) {
  await page.evaluate(async () => {
    const loaded = performance.getEntriesByType('resource').map(entry => new URL(entry.name))
      .filter(url => url.origin === location.origin && url.pathname === '/src/store/adventureStore.ts')
      .sort((a, b) => Number(b.searchParams.get('t') ?? 0) - Number(a.searchParams.get('t') ?? 0));
    window.__questStore = (await import(loaded[0]?.href ?? '/src/store/adventureStore.ts')).useAdventureStore;
  });
}
async function state(page) {
  await bind(page);
  return page.evaluate(() => { const s = window.__questStore.getState(); return { room: s.room, userId: s.userId, backend: s.backend, loading: s.loading, pendingQuest: s.pendingQuest, error: s.error, messages: s.messages }; });
}
async function settled(page) {
  await page.locator('[data-quest-mode]').waitFor(); await bind(page);
  await page.waitForFunction(() => !window.__questStore.getState().loading && !!window.__questStore.getState().room);
}
async function sync(page) { await bind(page); await page.evaluate(() => window.__questStore.getState().syncRoom()); await settled(page); }
async function allSame(pair) {
  for (const page of pair) await sync(page);
  const values = await Promise.all(pair.map(state));
  for (const value of values.slice(1)) {
    assert.deepEqual(value.room.questRun, values[0].room.questRun);
    assert.equal(value.room.turn, values[0].room.turn);
  }
  return values[0].room;
}
async function open(label) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, reducedMotion: 'reduce' }); contexts.push(context);
  await context.addInitScript(at => { window.__questNow = Number(localStorage.getItem('quest-qa-time')) || at; Date.now = () => window.__questNow; }, now);
  const page = await context.newPage(); pages.push(page);
  page.on('pageerror', error => errors.push({ page: label, message: error.message }));
  page.on('response', response => { if (new URL(response.url()).pathname.startsWith('/art/') && response.status() >= 400) errors.push({ page: label, message: `Artwork ${response.status()}: ${new URL(response.url()).pathname}` }); });
  await page.route('**/*', route => { const url = new URL(route.request().url()); return ['http:', 'https:'].includes(url.protocol) && url.origin !== base ? route.abort('blockedbyclient') : route.fallback(); });
  await page.route('**/api/dropinn', async route => {
    const payload = route.request().postDataJSON();
    if (faults.blockReads === label && payload.operation === 'read') return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'Intentional QA read interruption' }) });
    const response = await handler(new Request(`${base}/api/dropinn`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }));
    const body = await response.text();
    if (payload.command || ['chat', 'play', 'join'].includes(payload.operation)) records.push({ page: label, operation: payload.operation, command: payload.command, status: response.status });
    if (faults.loseAction === label && payload.command?.type === 'quest-act' && response.status === 200) { faults.loseAction = ''; return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'Intentional lost action acknowledgement' }) }); }
    return route.fulfill({ status: response.status, contentType: 'application/json', body });
  });
  page.qaLabel = label;
  await page.goto(`${base}/?session=avalonqa${label}`); await page.locator('.di-lobby-play').waitFor();
  if (!/Avalon/.test(await page.locator('.di-lobby-play').innerText())) {
    await page.getByRole('button', { name: 'Change story', exact: true }).click();
    await page.getByRole('button', { name: /^Select story: Avalon:/ }).click();
  }
  if (label === 'a') {
    await page.locator('.di-lobby-story-options > summary').click();
    const rewards = page.getByLabel('Story rewards', { exact: true });
    for (const [name, art] of [['trail knot', 'knot'], ['copper leaf', 'leaf'], ['return cup', 'cup']]) {
      const row = rewards.locator('.di-story-hat').filter({ hasText: name });
      await expectArt(row.locator('.di-keepsake-art img'), `avalon-keepsake-${art}`);
    }
    await rewards.screenshot({ path: 'output/playwright/avalon-lobby-rewards.png' });
    await page.locator('.di-lobby-story-options > summary').click();
    note('All three Avalon keepsakes load in the selectable story reward details');
  }
  await page.locator('.di-lobby-play').click(); await settled(page);
  const s = await state(page); assert.equal(s.backend, 'local'); assert.equal(s.room.adventureId, 'avalon'); assert.equal(s.room.adventureVersion, 1);
  return page;
}
async function commandClick(page, locator, expectedStatus = 200) {
  const response = page.waitForResponse(r => r.url() === `${base}/api/dropinn` && r.request().postDataJSON()?.command?.type === 'quest-act');
  const [received] = await Promise.all([response, locator.click()]);
  assert.equal(received.status(), expectedStatus, await received.text()); await settled(page);
}
const commandCount = () => records.filter(r => r.command?.type === 'quest-act').length;
async function prepare(page, target, option, keyboard = false) {
  await page.locator('.qr-options').waitFor();
  const before = commandCount();
  await page.locator(`[data-quest-target="${target}"]`).click();
  const button = page.locator(`[data-quest-option="${option}"]`);
  if (keyboard) { await button.focus(); await page.keyboard.press('Enter'); } else await button.click();
  assert.equal(commandCount(), before, 'Target/topic preparation sends no quest command.');
  await page.locator('[data-quest-release]:not(:disabled)').waitFor();
}
async function release(page, status = 200) { await commandClick(page, page.locator('[data-quest-release]'), status); }
async function advance(pair) {
  const room = await allSame(pair); assert.equal(room.phase, 'reveal');
  now = Math.max(now, room.revealUntil + 1);
  for (const page of pages) await page.evaluate(at => { window.__questNow = at; localStorage.setItem('quest-qa-time', String(at)); }, now);
  return allSame(pair);
}
async function activePage(pair) { const room = await allSame(pair); for (const page of pair) if ((await state(page)).userId === room.questRun.focus.actorId) return page; throw Error('No browser owns the active focus'); }
async function act(pair, target, option) { const page = await activePage(pair); await prepare(page, target, option); await release(page); return (await state(page)).room.status === 'completed' ? allSame(pair) : advance(pair); }
async function closePanel(page) { await page.keyboard.press('Escape'); }
async function map(page, node) { await page.getByRole('button', { name: 'Open expedition map', exact: true }).click(); await page.locator(`[data-quest-node="${node}"]`).click(); }
async function travel(pair, node) {
  const page = await activePage(pair), before = commandCount(); await map(page, node);
  await page.getByRole('button', { name: /Prepare this route/ }).click();
  assert.equal(commandCount(), before); await release(page); return advance(pair);
}
async function expectArt(image, name) {
  await image.waitFor({ state: 'visible' });
  await image.scrollIntoViewIfNeeded();
  await image.page().waitForFunction(node => node.isConnected && node.complete && node.naturalWidth > 0, await image.elementHandle(), { timeout: 10_000 });
  const info = await image.evaluate(async node => { await node.decode(); return { path: new URL(node.currentSrc || node.src).pathname, width: node.naturalWidth, height: node.naturalHeight }; });
  assert.equal(info.path, `/art/${/\.(png|webp)$/.test(name) ? name : `${name}.webp`}`); assert.ok(info.width > 0 && info.height > 0); if (name.startsWith('avalon-')) usedAvalonArt.add(name.replace(/\.webp$/, ''));
}
async function pieceArt(page, target, name) {
  await expectArt(page.locator(`[data-quest-target="${target}"] .di-target-art img`), name);
}
async function layout(page, name, drawer = false, focusSelector) {
  for (const [width, height] of [[390, 844], [320, 568], [1280, 900]]) {
    await page.setViewportSize({ width, height });
    await page.evaluate(() => { window.scrollTo(0, 0); const table = document.querySelector('.qr-table'); if (table) table.scrollTop = 0; });
    await page.evaluate(async () => { await Promise.all([...document.images].filter(im => im.getClientRects().length).map(im => im.decode().catch(() => {}))); await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))); });
    const metrics = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > innerWidth + 1,
      broken: [...document.images].filter(im => im.getClientRects().length && (!im.complete || !im.naturalWidth)).map(im => new URL(im.src).pathname),
      targets: [...document.querySelectorAll('[data-quest-target]')].map(n => n.getBoundingClientRect().toJSON()),
      release: document.querySelector('[data-quest-release]')?.getBoundingClientRect().toJSON(),
      moves: [...document.querySelectorAll('[data-quest-move]')].map(n => n.getBoundingClientRect().toJSON()),
      font: Number.parseFloat(getComputedStyle(document.querySelector('[data-quest-result] p')).fontSize),
      artBackings: [...document.querySelectorAll('.qr-scene-piece .di-target-art,.qr-enemy-piece .di-target-art')].map(node => getComputedStyle(node).backgroundColor),
      enemyHealth: document.querySelector('.qr-enemy-health')?.getBoundingClientRect().toJSON(),
      heroArt: [...document.querySelectorAll('.qr-hero-art')].map(node => node.getBoundingClientRect().toJSON()),
      completed: !!document.querySelector('[data-quest-mode="completed"]'),
      outcomeOverlays: document.querySelectorAll('.qr-finished-seal,.is-completed .qr-found-receipt').length,
      sceneImages: [...document.querySelectorAll('.qr-scene-piece img')].filter(image => image.getClientRects().length && image.naturalWidth > 0).length,
    }));
    assert.equal(metrics.overflow, false, `${name}/${width}: horizontal overflow`); assert.deepEqual(metrics.broken, [], `${name}/${width}: missing visible art`);
    assert.ok(metrics.artBackings.every(color => color === 'rgba(0, 0, 0, 0)'), `${name}/${width}: inherited target tiles cover the illustrated scene`);
    if (!drawer) {
      assert.ok(metrics.font >= 13, `${name}/${width}: story text below 13px`);
      if (metrics.enemyHealth) assert.ok(metrics.enemyHealth.bottom <= Math.min(...metrics.heroArt.map(rect => rect.top)), `${name}/${width}: enemy health bar overlaps the party artwork (${metrics.enemyHealth.bottom} > ${Math.min(...metrics.heroArt.map(rect => rect.top))})`);
      if (metrics.completed) {
        assert.equal(metrics.outcomeOverlays, 0, `${name}/${width}: completion overlays obscure the changed table`);
        assert.equal(metrics.sceneImages, metrics.targets.length, `${name}/${width}: every changed scene piece remains illustrated at completion`);
      }
      for (const rect of [...metrics.targets, ...metrics.moves]) assert.ok(rect.width >= 43 && rect.height >= 43, `${name}/${width}: target below44px`);
    }
    if (focusSelector) await page.locator(focusSelector).scrollIntoViewIfNeeded();
    await page.screenshot({ path: `output/playwright/avalon-${name}-${width}.png`, fullPage: drawer, animations: 'disabled' });
    if (!drawer) {
      for (const control of await page.locator('[data-quest-move], [data-quest-release]').all()) {
        await control.scrollIntoViewIfNeeded(); const bounds = await control.boundingBox();
        assert.ok(bounds && bounds.y >= 0 && bounds.y + bounds.height <= height + 1, `${name}/${width}: action cannot be brought into view by normal scrolling`);
      }
      if (metrics.release?.bottom > height + 1 || metrics.moves.some(rect => rect.bottom > height + 1)) await page.screenshot({ path: `output/playwright/avalon-${name}-${width}-controls.png`, animations: 'disabled' });
    }
    note(`${name} layout ${width}×${height}`, metrics.enemyHealth && !drawer ? { healthBarPartyGap: Math.min(...metrics.heroArt.map(rect => rect.top)) - metrics.enemyHealth.bottom } : {});
  }
  await page.setViewportSize({ width: 390, height: 844 });
}
async function clockTo(at) {
  now = Math.max(now, at);
  for (const page of pages) if (!page.isClosed()) await page.evaluate(value => { window.__questNow = value; localStorage.setItem('quest-qa-time', String(value)); }, now);
}
async function pass(pair) {
  const page = await activePage(pair), before = commandCount();
  await page.getByRole('button', { name: 'Prepare to pass the lantern', exact: true }).click();
  assert.equal(commandCount(), before); await release(page); return advance(pair);
}
async function inspectTable(page, capture = false) {
  const room = (await state(page)).room, node = questContent(room).nodes.find(item => item.id === room.questRun.nodeId);
  await expectArt(page.locator('.qr-backdrop'), node.art);
  for (const target of node.targets) await pieceArt(page, target.id, target.artKey);
  assert.doesNotMatch(await page.locator('[data-quest-result]').innerText(), /following:[a-z-]+|resolved:[a-z-]+/);
  if (capture && !capturedNodes.has(node.id)) {
    capturedNodes.add(node.id); await layout(page, `place-${node.id}`);
    note(`The ${node.label} table loads its accurate environment and every current prop or cast member`);
  }
}
async function inspectMap(page, name = 'geography') {
  const before = commandCount();
  await page.getByRole('button', { name: 'Open expedition map', exact: true }).click();
  await page.getByRole('img', { name: 'Larch Run and Reed Brook flow into Merewater', exact: true }).waitFor();
  assert.equal(await page.locator('[data-quest-node]').count(), 6);
  for (const [width, height] of [[320, 568], [390, 844], [1280, 900]]) {
    await page.setViewportSize({ width, height });
    const nodes = await page.locator('[data-quest-node]').evaluateAll(items => items.map(node => ({ id: node.dataset.questNode, ...node.getBoundingClientRect().toJSON() })));
    for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i], b = nodes[j];
      if (Math.min(a.right, b.right) > Math.max(a.left, b.left) && Math.min(a.bottom, b.bottom) > Math.max(a.top, b.top)) errors.push({ message: `${width}: map hitboxes overlap: ${JSON.stringify(a)}/${JSON.stringify(b)}` });
    }
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
    await page.screenshot({ path: `output/playwright/avalon-${name}-${width}.png`, fullPage: true });
  }
  for (const place of AVALON_WORLD.places) {
    await page.locator(`[data-quest-node="${place.id}"]`).click();
    await expectArt(page.locator('.qr-map-place-art img.di-scene-art'), place.art);
    assert.match(await page.locator('.qr-map-inspector').innerText(), new RegExp(place.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  await closePanel(page); await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(commandCount(), before);
  note('Six fixed places, named waterways and loaded previews remain inspectable without commands; map hitboxes do not overlap at 320/390/1280');
}
async function go(pair, destination, capture = false) {
  let room = await allSame(pair);
  const frontier = [[room.questRun.nodeId]], seen = new Set(); let route;
  const edges = questContent(room).edges;
  while (frontier.length) {
    const path = frontier.shift(), from = path.at(-1); if (seen.has(from)) continue; seen.add(from);
    if (from === destination) { route = path; break; }
    for (const edge of edges.filter(item => item.from === from)) frontier.push([...path, edge.to]);
  }
  assert.ok(route, `No geographic route to ${destination}`);
  for (const node of route.slice(1)) {
    const before = await allSame(pair), actorId = before.questRun.focus.actorId, remaining = before.questRun.focus.remaining;
    room = await travel(pair, node);
    const movement = room.events.findLast(event => event.quest?.kind === 'travel');
    assert.equal(movement.quest.toNodeId, node); assert.equal(movement.actorId, actorId);
    if (remaining === 2) { assert.equal(room.questRun.focus.actorId, actorId); assert.equal(room.questRun.focus.remaining, 1); }
    await inspectTable(await activePage(pair), capture);
  }
  return room;
}
const clue = { 'bitter-water': 'ford-check-water', 'missing-carter': 'ford-read-waybill', 'stranded-herd': 'ford-follow-bells' };
async function prepareFollow(page, id) {
  const before = commandCount();
  await page.locator('[data-avalon-leads]').click();
  await page.locator(`[data-avalon-follow="${id}"]`).click();
  assert.equal(commandCount(), before, 'Preparing a party priority must not send a command.');
  await page.locator('[data-quest-release]:not(:disabled)').waitFor();
  assert.equal((await state(page)).room.questRun.avalon.threads.find(thread => thread.id === id).status, 'discovered');
}
async function follow(pair, id) {
  const page = await activePage(pair); await prepareFollow(page, id); await release(page);
  const room = await allSame(pair); assert.equal(room.questRun.avalon.threads.find(thread => thread.id === id).status, 'active');
  assert.equal(room.events.filter(event => event.quest?.factIds?.includes(`following:${id}`)).length, 1);
  return advance(pair);
}
async function lostFollow(pair, id) {
  const page = await activePage(pair), observer = pair.find(item => item !== page), label = page.qaLabel;
  const before = structuredClone((await state(page)).room.questRun);
  await prepareFollow(page, id); await layout(page, 'prepared-lead');
  faults.loseAction = label; faults.blockReads = label; await release(page, 503);
  await page.getByRole('button', { name: /Retry the same move/ }).waitFor();
  const sent = structuredClone(records.filter(record => record.page === label && record.command?.type === 'quest-act').at(-1).command);
  assert.deepEqual(sent.questAction, { kind: 'follow-thread', threadId: id });
  await sync(observer); const accepted = structuredClone((await state(observer)).room.questRun);
  assert.equal(accepted.focus.remaining, before.focus.remaining - 1);
  assert.equal(accepted.avalon.threads.find(thread => thread.id === id).status, 'active');
  faults.loseAction = label; await commandClick(page, page.getByRole('button', { name: /Retry the same move/ }), 503);
  assert.deepEqual(records.filter(record => record.page === label && record.command?.type === 'quest-act').at(-1).command, sent);
  await sync(observer); assert.deepEqual((await state(observer)).room.questRun, accepted);
  await page.reload({ waitUntil: 'domcontentloaded' }); await page.getByRole('heading', { name: 'Your chair is still bookmarked.' }).waitFor();
  await bind(page); await page.waitForFunction(() => window.__questStore.getState().ready);
  assert.deepEqual((await state(page)).pendingQuest.action, sent.questAction);
  faults.blockReads = ''; await sync(page); assert.equal((await state(page)).pendingQuest, null);
  assert.deepEqual((await state(page)).room.questRun, accepted);
  note('Following a lead uses explicit prepare/release; lost acknowledgement, exact retry and reload apply one priority, action and reward');
  return advance(pair);
}
async function noAbsencePressure(pair) {
  let room = await allSame(pair);
  for (let i = 0; room.questRun.avalon.director.meaningful && i < 4; i++) room = await pass(pair);
  assert.equal(room.questRun.avalon.director.meaningful, false);
  const saved = structuredClone(room.questRun.avalon.manifest), pressure = room.questRun.avalon.threads.map(thread => thread.pressure), supplies = room.questRun.supplies;
  const rewards = Object.fromEntries(Object.entries(room.players).map(([id, player]) => [id, player.xp]));
  let absent;
  for (let i = 0; i < 3; i++) {
    room = await allSame(pair); if (i === 2) absent = await activePage(pair);
    await clockTo(room.deadline + 1); room = await allSame(pair);
    if (room.phase === 'reveal') room = await advance(pair);
    assert.deepEqual(room.questRun.avalon.threads.map(thread => thread.pressure), pressure); assert.equal(room.questRun.supplies, supplies);
    assert.deepEqual(Object.fromEntries(Object.entries(room.players).map(([id, player]) => [id, player.xp])), rewards);
  }
  await absent.getByRole('button', { name: 'Rejoin the expedition', exact: true }).waitFor();
  const response = absent.waitForResponse(r => r.url() === `${base}/api/dropinn` && r.request().postDataJSON()?.operation === 'join');
  await absent.getByRole('button', { name: 'Rejoin the expedition', exact: true }).click(); assert.equal((await response).status(), 200);
  await pass(pair); room = await allSame(pair);
  assert.ok(room.seats.some(seat => seat.kind === 'human' && seat.actorId === room.questRun.focus.actorId));
  assert.equal(room.seats.filter(seat => seat.kind === 'human').length, 2); assert.deepEqual(room.questRun.avalon.manifest, saved);
  await absent.reload(); await settled(absent); assert.deepEqual((await state(absent)).room.questRun.avalon.manifest, saved);
  note('Three unattended turns create no pressure, supplies or rewards; the removed hero rejoins and reloads the identical saved episode');
}
let promiseVerified = false;
const resolvedKinds = new Set();
async function resolveThread(pair, id, variant = false) {
  let room = await allSame(pair);
  if (room.questRun.avalon.threads.find(thread => thread.id === id).status === 'hidden') {
    await go(pair, 'old-ford'); await act(pair, 'ford-waymark', clue[id]);
  }
  room = await allSame(pair);
  if (room.questRun.avalon.threads.find(thread => thread.id === id).status === 'discovered') await follow(pair, id);
  let resolution;
  if (id === 'bitter-water') {
    await go(pair, 'mill-yard', true);
    if (variant && promiseVerified) {
      await act(pair, 'mill-vat', 'water-inspect-vat'); room = await act(pair, 'mill-vat', 'water-seal-vat'); resolution = 'seal';
      await pieceArt(await activePage(pair), 'mill-vat', 'mosswater-vat-contained');
    } else {
      await act(pair, 'mill-mossback', 'water-listen'); room = await act(pair, 'mill-mossback', 'water-offer-washpond'); resolution = 'bargain';
      assert.equal(room.questRun.avalon.promise.status, 'owed');
      const page = await activePage(pair); await pieceArt(page, 'mill-vat', 'mosswater-feed-clear');
      await page.locator('[data-avalon-leads]').click(); assert.match(await page.locator('[data-avalon-promise]').innerText(), /Your promise/);
      await layout(page, 'promise-owed', true, '[data-avalon-promise]'); await closePanel(page);
    }
  } else if (id === 'missing-carter') {
    await go(pair, 'green-quarry', true); await act(pair, 'quarry-cart', 'carter-check');
    resolution = variant ? 'repair' : 'leave'; room = await act(pair, 'quarry-cart', variant ? 'carter-repair' : 'carter-walk');
    assert.equal(room.questRun.facts.some(fact => fact.id === 'cargo-left'), resolution === 'leave');
    await pieceArt(await activePage(pair), 'quarry-cart', 'avalon-waybill');
    assert.equal(await (await activePage(pair)).locator('[data-quest-target="pip"]').count(), 0);
  } else {
    await go(pair, 'hill-spring', true); await act(pair, 'spring-flock', 'herd-survey');
    resolution = variant ? 'feed' : 'fence'; room = await act(pair, 'spring-flock', variant ? 'herd-feed' : 'herd-gate');
    assert.equal(room.questRun.facts.some(fact => fact.id === 'upper-gate-open'), resolution === 'fence');
  }
  assert.equal(room.questRun.avalon.threads.find(thread => thread.id === id).resolutionId, resolution);
  assert.equal(room.status, 'active', 'A local solution leaves the expedition open for the party to choose its return.');
  resolvedKinds.add(id);
  note(`An explicit ${id}/${resolution} resolution changes the shared world without automatically ending the visit`);
  return room;
}
async function pouch(pair) {
  const room = await allSame(pair);
  for (const page of pair) {
    await page.getByRole('button', { name: 'Quest pouch', exact: true }).click();
    const text = await page.locator('.qr-pack').innerText();
    assert.match(text, /Shared repair kit/); assert.doesNotMatch(text, /following:[a-z-]+|resolved:[a-z-]+/);
    assert.match(text, new RegExp(`${room.questRun.supplies} shared supplies`));
    await expectArt(page.locator('.qr-pack > article').filter({ hasText: 'Shared repair kit' }).locator('img'), 'mosswater-repair-kit');
    if (room.questRun.items.includes('carter-waybill')) await expectArt(page.locator('.qr-pack > article').filter({ hasText: 'Pip’s waybill' }).locator('img'), 'avalon-waybill');
    if (page === pair[0]) await layout(page, 'shared-pouch', true);
    await closePanel(page);
  }
  note('Both independent heroes can inspect identical shared items, supplies and readable facts with actor/place attribution');
}
async function finishVisit(pair, capture = true) {
  let room = await go(pair, 'larch-inn', true);
  if (room.questRun.avalon.promise?.status === 'owed') {
    assert.ok(room.questRun.items.includes('reed-bundle'));
    room = await act(pair, 'wren', 'inn-deliver-reeds');
    assert.equal(room.questRun.avalon.promise.status, 'kept'); assert.ok(!room.questRun.items.includes('reed-bundle'));
    promiseVerified = true;
    const page = await activePage(pair); await page.locator('[data-avalon-leads]').click(); assert.match(await page.locator('[data-avalon-promise]').innerText(), /A promise kept/);
    if (capture) await layout(page, 'promise-kept', true, '[data-avalon-promise]'); await closePanel(page);
    note('Returning the actual shared reed bundle fulfills the named promise and removes the delivered item from the pouch');
  }
  const page = await activePage(pair), before = commandCount();
  await page.locator('[data-avalon-leads]').click(); await page.locator('[data-avalon-return]').click(); assert.equal(commandCount(), before);
  assert.equal((await state(page)).room.status, 'active'); await release(page); room = await allSame(pair);
  assert.equal(room.status, 'completed'); assert.equal(room.questRun.ending.id, 'return'); assert.match(room.questRun.ending.text, /Larch Inn/);
  if (room.questRun.avalon.threads.every(thread => thread.status === 'resolved')) assert.match(room.questRun.ending.text, /Both local troubles are settled/);
  else assert.match(room.questRun.ending.text, /Still open:.*not been solved for you/);
  await page.getByRole('button', { name: 'Read our trail', exact: true }).click();
  await expectArt(page.locator('.qr-ending-memory .di-keepsake-art img'), 'avalon-keepsake-cup');
  const trail = await page.locator('.qr-trail').innerText();
  assert.match(trail, /What Avalon remembers/); assert.match(trail, /follows/); assert.match(trail, /Larch Inn/);
  if (capture) await layout(page, 'ending-trail', true); await closePanel(page);
  if (capture) await layout(page, 'returned-to-inn');
  note('The explicit inn return preserves chosen changes and truthfully names unfinished troubles; the illustrated trail records who did what and where');
}
async function journey() {
  const a = await open('a'), b = await open('b'), pair = [a, b];
  let room = await allSame(pair), manifest = structuredClone(room.questRun.avalon.manifest);
  assert.equal((await state(a)).room.code, (await state(b)).room.code); assert.notEqual((await state(a)).userId, (await state(b)).userId);
  assert.equal(manifest.worldVersion, 1); assert.equal(manifest.generatorVersion, 1); assert.equal(manifest.contentVersion, 1);
  assert.equal(manifest.conflictIds.length, 2); assert.ok(room.questRun.avalon.threads.every(thread => thread.status === 'hidden'));
  await inspectTable(a, true); await inspectMap(a);
  const initial = questContent(room).nodes.find(node => node.id === room.questRun.nodeId);
  const target = initial.targets.find(piece => piece.options.some(option => option.avalon?.discoverThread));
  const option = target.options.find(item => item.avalon?.discoverThread), first = option.avalon.discoverThread;
  const deadline = room.deadline; await prepare(a, target.id, option.id, true); await release(a); room = await allSame(pair);
  assert.equal(room.questRun.avalon.threads.find(thread => thread.id === first).status, 'discovered'); assert.equal(room.deadline, deadline);
  assert.equal(await b.locator('[data-quest-release]').count(), 0); await advance(pair);
  room = await lostFollow(pair, first); assert.equal(room.seats.filter(seat => seat.kind === 'human').length, 2);
  assert.equal(room.questRun.focus.actorId, (await state(b)).userId);
  const second = manifest.conflictIds.find(id => id !== first); await go(pair, 'old-ford', true);
  room = await allSame(pair); if (room.questRun.avalon.threads.find(thread => thread.id === second).status === 'hidden') await act(pair, 'ford-waymark', clue[second]);
  room = await follow(pair, second); assert.equal(room.questRun.avalon.threads.filter(thread => thread.status === 'active').length, 2);
  let page = await activePage(pair); await page.locator('[data-avalon-leads]').click();
  assert.equal(await page.locator('[data-avalon-thread].is-active').count(), 2); await layout(page, 'two-active-leads', true); await closePanel(page);
  note('Two actual players discover and explicitly select two concurrent party priorities without an automatic quest assignment');
  await noAbsencePressure(pair);
  await go(pair, 'larch-inn', true); await act(pair, 'wren', 'inn-tools'); await act(pair, 'wren', 'inn-pack');
  await go(pair, 'reed-bank', true); await act(pair, 'bank-reeds', 'bank-gather-reeds');
  for (const id of manifest.conflictIds) if (id === 'missing-carter') await act(pair, 'bank-reeds', 'bank-read-waybill');
  await pouch(pair);
  // Visit every fixed place by real movement, including quiet places in this seed.
  for (const place of AVALON_WORLD.places) await go(pair, place.id, true);
  await act(pair, 'quarry-cairn', 'quarry-pack');
  await go(pair, 'hill-spring'); await act(pair, 'spring-pool', 'spring-fill');
  for (const id of manifest.conflictIds) await resolveThread(pair, id);
  room = await allSame(pair); assert.deepEqual(room.questRun.avalon.manifest, manifest);
  assert.ok(room.questRun.avalon.threads.every(thread => thread.status === 'resolved'));
  await finishVisit(pair);
}
async function coverageVisits() {
  // Fresh real episodes remain seeded by production creation. No desired cast or
  // conflict is injected. Bounded retries cover the optional courier and promise.
  for (let attempt = 0; attempt < 8 && (!promiseVerified || resolvedKinds.size < 3 || usedAvalonArt.size < 13); attempt++) {
    const page = await open(`coverage${attempt}`), pair = [page];
    const manifest = (await state(page)).room.questRun.avalon.manifest;
    await inspectTable(page); await go(pair, 'larch-inn'); await act(pair, 'wren', 'inn-tools'); await act(pair, 'wren', 'inn-pack');
    await go(pair, 'hill-spring'); await act(pair, 'spring-pool', 'spring-fill');
    await go(pair, 'reed-bank'); assert.equal((await state(page)).room.questRun.supplies, 6);
    await prepare(page, 'bank-reeds', 'bank-gather-reeds');
    assert.match(await page.locator('[data-quest-preview]').innerText(), /full|0.*fit/i);
    await release(page); let capped = (await state(page)).room;
    assert.equal(capped.questRun.supplies, 6); assert.ok(capped.questRun.items.includes('reed-bundle'));
    const gathering = capped.events.findLast(event => event.quest?.optionId === 'bank-gather-reeds');
    assert.equal(gathering.quest.supplyDelta, 0); assert.match(gathering.text, /pack is full.*left behind/i);
    await advance(pair); note('A full pack honestly previews zero added supplies while still granting the meaningful reed quest item');
    for (const place of AVALON_WORLD.places) await go(pair, place.id);
    const wanted = manifest.conflictIds.find(id => !resolvedKinds.has(id) || id === 'bitter-water' && !promiseVerified) ?? manifest.conflictIds[0];
    await resolveThread(pair, wanted, true); await finishVisit(pair, false);
  }
  assert.equal(promiseVerified, true, 'No generated episode exercised a kept promise within eight real visits.');
  assert.deepEqual([...resolvedKinds].sort(), ['bitter-water', 'missing-carter', 'stranded-herd']);
  const expected = (await readdir('public/art')).filter(name => /^avalon-.*\.webp$/.test(name)).map(name => name.replace(/\.webp$/, '')).sort();
  assert.equal(expected.length, 13); assert.deepEqual([...usedAvalonArt].sort(), expected);
  note('All three authored troubles, all six geographic places and all thirteen new Avalon raster assets appear through real seeded play', { assets: expected });
}
try {
  await mkdir('output/playwright', { recursive: true }); sourceFingerprint = await fingerprint();
  ssr = await createServer({ configFile: false, cacheDir: 'node_modules/.vite-avalon-tests', optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  const { createDropinnHandler } = await ssr.ssrLoadModule('/server/dropinn.ts');
  ({ questContent } = await ssr.ssrLoadModule('/src/lib/dropinn/questRun.ts'));
  ({ AVALON_WORLD } = await ssr.ssrLoadModule('/src/lib/dropinn/avalonContent.ts'));
  handler = createDropinnHandler({ local: true, env: {}, now: () => now, fetch: async () => { throw Error('No external inference in Avalon QA.'); } });
  browser = await chromium.launch({ headless: true }); await journey(); await coverageVisits();
  assert.equal(await fingerprint(), sourceFingerprint, 'Source or art changed during the run; recapture the final version.'); assert.deepEqual(errors, []);
} catch (error) {
  errors.push({ message: error.stack ?? String(error) }); process.exitCode = 1;
  for (let i = 0; i < pages.length; i++) await pages[i].screenshot({ path: `output/playwright/avalon-failure-${i}.png`, fullPage: true }).catch(() => {});
} finally {
  await writeFile('output/playwright/avalon-results.json', JSON.stringify({ backend: 'isolated local handler', clock: 'controlled authoritative and client clock; no gameplay state injection', sourceFingerprint, checks, errors, assets: [...usedAvalonArt].sort(), commands: records.map(r => ({ page: r.page, operation: r.operation, status: r.status, id: r.command?.id, type: r.command?.type, action: r.command?.questAction })) }, null, 2));
  for (const context of contexts) await context.close().catch(() => {});
  await browser?.close(); await ssr?.close(); console.log(JSON.stringify({ checks: checks.length, errors }));
}
