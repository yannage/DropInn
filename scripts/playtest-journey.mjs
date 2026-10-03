import assert from 'node:assert/strict';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright';
import { createServer } from 'vite';

// Real isolated local command service, browser gestures, independent identities.
// Only the clock is controlled; gameplay snapshots are never injected.
const origin = new URL(process.argv[2] ?? 'http://127.0.0.1:5203');
assert.ok(origin.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(origin.hostname)
  && origin.pathname === '/' && !origin.search && !origin.hash && !origin.username && !origin.password);
const base = origin.origin;
await mkdir('output/playwright', { recursive: true });
const checks = [], errors = [], records = [], contexts = [], pages = [];
const faults = { loseVote: '', blockReads: '' };
const atlasRequests = [];
let releaseEncounterImage;
const encounterImageGate = new Promise(resolve => { releaseEncounterImage = resolve; });
let browser, ssr, handler, stageTimeline, offset = 0;
const note = (name, detail = {}) => { checks.push({ name, ...detail }); console.log(name); };
const clock = () => Date.now() + offset;
const fingerprintSources = [
  'src/App.tsx', 'src/components/DropInn/DropInn.tsx',
  'src/components/DropInn/GemwardAdventure.tsx', 'src/components/DropInn/GemwardJourney.tsx',
  'src/components/DropInn/GemwardCombat.tsx', 'src/components/DropInn/GemwardPack.tsx',
  'src/components/DropInn/GemwardArt.tsx', 'src/components/DropInn/gemward-adventure.css',
  'src/components/DropInn/Narrator.tsx',
  'src/components/DropInn/FrameAnimation.tsx', 'src/components/DropInn/LoadingInn.tsx',
  'src/components/DropInn/frame-animation.css', 'src/components/DropInn/loading-inn.css',
  'src/lib/dropinn/frameAnimation.ts', 'src/lib/dropinn/stagePlayback.ts',
  'src/lib/dropinn/journey.ts', 'src/lib/dropinn/journeyEngine.ts', 'src/lib/dropinn/engine.ts',
  'src/lib/dropinn/expeditionEngine.ts', 'src/store/adventureStore.ts', 'server/dropinn.ts',
];
const fingerprint = async () => {
  // Include reused story cutouts as well as new Gemward/flipbook sheets. A final
  // capture must not silently mix pre-repair and post-repair raster assets.
  const art = (await readdir('public/art')).filter(name => /\.webp$/.test(name) || /^token-.*\.png$/.test(name) || name === 'broken-ward.png').map(name => `public/art/${name}`);
  const files = [...fingerprintSources, ...art].sort();
  const hashes = await Promise.all(files.map(async path => [path, createHash('sha256').update(await readFile(path)).digest('hex')]));
  return createHash('sha256').update(JSON.stringify(hashes)).digest('hex');
};
let sourceFingerprint;
async function bind(page) {
  await page.evaluate(async () => {
    const loaded = performance.getEntriesByType('resource').map(entry => new URL(entry.name))
      .filter(url => url.origin === location.origin && url.pathname === '/src/store/adventureStore.ts')
      .sort((a, b) => Number(b.searchParams.get('t') ?? 0) - Number(a.searchParams.get('t') ?? 0));
    window.__journeyStore = (await import(loaded[0]?.href ?? '/src/store/adventureStore.ts')).useAdventureStore;
  });
}
async function state(page) {
  await bind(page);
  return page.evaluate(() => {
    const value = window.__journeyStore.getState();
    return { room: value.room, userId: value.userId, backend: value.backend, loading: value.loading, pendingTravel: value.pendingTravel, pendingMove: value.pendingMove, error: value.error };
  });
}
async function settled(page) {
  await page.locator('[data-gemward-mode]').waitFor();
  await bind(page);
  await page.waitForFunction(() => !window.__journeyStore.getState().loading && !!window.__journeyStore.getState().room);
}
async function sync(page) { await bind(page); await page.evaluate(() => window.__journeyStore.getState().syncRoom()); await settled(page); }
async function allSame(pair) {
  for (const page of pair) await sync(page);
  const snapshots = await Promise.all(pair.map(state));
  assert.equal(snapshots[0].room.revision, snapshots[1].room.revision);
  assert.deepEqual(snapshots[0].room.expedition, snapshots[1].room.expedition);
  return snapshots[0].room;
}
async function open(label) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, reducedMotion: 'reduce' });
  contexts.push(context);
  await context.addInitScript(value => {
    const realNow = Date.now.bind(Date);
    window.__journeyOffset = Number(localStorage.getItem('journey-qa-offset') ?? value);
    Date.now = () => realNow() + window.__journeyOffset;
  }, offset);
  const page = await context.newPage(); pages.push(page);
  page.on('pageerror', error => errors.push({ page: label, message: error.message }));
  page.on('response', response => { if (new URL(response.url()).pathname.startsWith('/art/') && response.status() >= 400) errors.push({ page: label, message: `Artwork ${response.status()}: ${new URL(response.url()).pathname}` }); });
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    return ['http:', 'https:'].includes(url.protocol) && url.origin !== base ? route.abort('blockedbyclient') : route.fallback();
  });
  await page.route('**/art/flipbook-encounter.webp', async route => {
    atlasRequests.push(label);
    // A cold connection may still be warming while players make ordinary moves.
    if (label === 'firsta') await encounterImageGate;
    if (label === 'firstb') return route.abort('failed');
    return route.continue().catch(() => {});
  });
  await page.route('**/api/dropinn', async route => {
    const payload = route.request().postDataJSON();
    if (faults.blockReads === label && payload.operation === 'read') return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'Intentional QA read interruption' }) });
    const response = await handler(new Request(`${base}/api/dropinn`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }));
    const body = await response.text();
    if (payload.command) records.push({ page: label, command: payload.command, status: response.status, response: JSON.parse(body) });
    if (faults.loseVote === label && payload.command?.type === 'vote-travel' && response.status === 200) {
      faults.loseVote = '';
      return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'Intentional lost travel acknowledgement' }) });
    }
    return route.fulfill({ status: response.status, contentType: 'application/json', body });
  });
  await page.goto(`${base}/?session=journeyqa${label}`);
  await page.locator('.di-lobby-play').waitFor();
  await page.locator('.di-lobby-play').click(); await settled(page);
  const snapshot = await state(page);
  assert.equal(snapshot.backend, 'local');
  assert.equal(snapshot.room.adventureId, 'gemward'); assert.equal(snapshot.room.adventureVersion, 2);
  return page;
}
async function closePanel(page) {
  await page.keyboard.press('Escape');
}
async function select(page, targetId, token = 'investigate', place, keyboard = false) {
  if (place) {
    const tab = page.locator(`[data-gemward-place="${place}"]`);
    if (await tab.isVisible()) await tab.click();
  }
  const before = records.filter(record => ['act', 'vote-travel'].includes(record.command.type)).length;
  if (keyboard) {
    await page.locator(`[data-scene-target="${targetId}"]`).focus(); await page.keyboard.press('Enter');
    await page.locator(`[data-token="${token}"]`).focus(); await page.keyboard.press('Enter');
  } else {
    await page.locator(`[data-scene-target="${targetId}"]`).click();
    await page.locator(`[data-token="${token}"]`).click();
  }
  assert.equal(records.filter(record => ['act', 'vote-travel'].includes(record.command.type)).length, before);
  assert.equal(await page.locator('.gm-stage [data-frame-atlas]').count(), 0, 'Preparing a move never starts a confirmed-event flipbook.');
}
async function observedFlipbook(page, atlas) {
  const animation = page.locator(`.gm-stage [data-frame-atlas="${atlas}"][data-frame-state="playing"]`);
  await animation.waitFor({ state: 'visible', timeout: 6500 });
  const observation = await page.evaluate(atlas => {
    const node = document.querySelector(`.gm-stage [data-frame-atlas="${atlas}"]`);
    const cells = node?.querySelector('.di-frame-cells');
    return { room: window.__journeyStore.getState().room, at: Date.now(), state: node?.getAttribute('data-frame-state'),
      position: cells && getComputedStyle(cells).backgroundPosition, timing: cells && getComputedStyle(cells).animationTimingFunction,
      sheet: cells && getComputedStyle(cells).backgroundImage, pointerEvents: node && getComputedStyle(node).pointerEvents,
      stageEventId: document.querySelector('.di-stage-effects')?.getAttribute('data-stage-event'),
      finishedEncounter: !!document.querySelector('.gm-combat.is-finished') };
  }, atlas);
  assert.equal(observation.room.phase, 'reveal');
  assert.equal(observation.state, 'playing');
  assert.match(observation.sheet, new RegExp(`flipbook-${atlas}\\.webp`));
  assert.match(observation.timing, /steps\(1\)|steps\(1, end\)/);
  assert.equal(observation.pointerEvents, 'none');
  const beat = stageTimeline(observation.room).find(beat => observation.at >= beat.start && observation.at < beat.start + beat.duration);
  assert.ok(beat, 'The flipbook belongs to a live, recorded event window.');
  if (atlas === 'discovery') assert.ok(beat.event.journey?.questChanges?.some(change => change.kind === 'gained'));
  else {
    assert.equal(beat.event.kind, 'action');
    assert.notEqual(beat.event.result?.token, 'assist');
    assert.ok(beat.event.result?.expedition?.battleProgress > 0);
    assert.equal(observation.stageEventId, beat.event.id, 'Contact feedback stays attached to the confirmed rendered target.');
  }
  // The encounter's first frame is intentionally empty. Capture a drawn frame,
  // while also proving this confirmed effect advances to another painted cell.
  await page.waitForFunction(({ atlas, first }) => {
    const node = document.querySelector(`.gm-stage [data-frame-atlas="${atlas}"][data-frame-state="playing"] .di-frame-cells`);
    return node && getComputedStyle(node).backgroundPosition !== first;
  }, { atlas, first: observation.position }, { timeout: 1200 });
  await page.screenshot({ path: `output/playwright/journey-confirmed-${atlas}-atlas.png` });
  return { eventId: beat.event.id, position: observation.position, battleStatus: observation.room.expedition?.battle?.status, finishedEncounter: observation.finishedEncounter };
}
async function observedContactFallback(page, assetState) {
  await page.waitForFunction(assetState => {
    const atlas = document.querySelector('.gm-encounter-flipbook');
    const signature = document.querySelector('.di-action-signature-anchor');
    const impact = document.querySelector('.di-impact');
    return atlas?.getAttribute('data-frame-state') === assetState && signature && impact
      && getComputedStyle(signature).visibility === 'visible' && getComputedStyle(impact).visibility === 'visible';
  }, assetState, { timeout: 6500 });
  const observation = await page.evaluate(() => ({ room: window.__journeyStore.getState().room, at: Date.now(), eventId: document.querySelector('.di-stage-effects')?.getAttribute('data-stage-event'), ready: document.querySelector('.gm-encounter-flipbook')?.classList.contains('is-ready') }));
  const beat = stageTimeline(observation.room).find(beat => observation.at >= beat.start && observation.at < beat.start + beat.duration);
  assert.ok(beat?.event.result?.expedition?.battleProgress > 0);
  assert.equal(observation.eventId, beat.event.id);
  assert.equal(observation.ready, false);
  await page.screenshot({ path: `output/playwright/journey-encounter-${assetState}-fallback.png` });
  return { eventId: beat.event.id, battleStatus: observation.room.expedition.battle.status };
}
async function settledEffects(page) {
  const room = (await state(page)).room;
  const end = Math.max(...stageTimeline(room).map(beat => beat.start + beat.duration), 0);
  await page.waitForFunction(end => Date.now() >= end + 100, end, { timeout: 7000 });
  assert.equal(await page.locator('.gm-stage [data-frame-atlas]').count(), 0);
}
async function commandClick(page, type, locator, status = 200) {
  const response = page.waitForResponse(response => response.url() === `${base}/api/dropinn` && response.request().postDataJSON()?.command?.type === type);
  await locator.click(); const received = await response;
  assert.equal(received.status(), status, await received.text()); await settled(page);
}
async function commit(page) { await commandClick(page, 'act', page.getByRole('button', { name: /^(Roll|Commit) now$/ })); }
async function attachSupply(page, kind, label) {
  const snapshot = await state(page);
  const item = snapshot.room.expedition.stashes[snapshot.userId]?.find(item => item.kind === kind);
  assert.ok(item, `Naturally earned ${label} is in the personal stash.`);
  await page.getByRole('button', { name: /^Your stash,/ }).click();
  const drawer = page.getByRole('dialog', { name: 'Your stash', exact: true });
  await drawer.locator('.gm-stash-slots button').filter({ hasText: label }).click();
  if (kind === 'favour') await drawer.getByRole('radio', { name: /Canal lock key/i }).check();
  await drawer.getByRole('button', { name: /Back to the scene/ }).click();
  assert.ok((await state(page)).room.expedition.stashes[snapshot.userId].some(held => held.id === item.id), 'Preparing an item does not spend it.');
  return item.id;
}
async function advance(pair) {
  const room = (await state(pair[0])).room;
  assert.equal(room.phase, 'reveal');
  offset = Math.max(offset, room.revealUntil + 1 - Date.now());
  for (const page of pages) await page.evaluate(value => { window.__journeyOffset = value; localStorage.setItem('journey-qa-offset', String(value)); }, offset);
  for (const page of pair) await sync(page);
}
async function vote(page, toNodeId, expectedStatus = 200) {
  const room = (await state(page)).room;
  assert.equal(room.phase, 'travel');
  const edge = room.expedition.travel.options.find(option => option.toNodeId === toNodeId);
  assert.ok(edge, `Available travel option ${toNodeId}`);
  const before = records.filter(record => record.command.type === 'vote-travel').length;
  await page.locator(`[data-journey-node="${toNodeId}"]`).click();
  assert.equal(records.filter(record => record.command.type === 'vote-travel').length, before, 'Map inspection never commits a vote.');
  await commandClick(page, 'vote-travel', page.getByRole('button', { name: /Confirm (route|destination|vote)/i }), expectedStatus);
  return edge.edgeId;
}
async function layout(page, name, mode = 'scene') {
  for (const [width, height] of [[390, 844], [320, 568], [1280, 900]]) {
    await page.setViewportSize({ width, height });
    if (mode === 'map') await page.locator('.di-scene-drawer-body').evaluate(element => { element.scrollTop = 0; });
    await page.evaluate(async () => { await Promise.all([...document.images].filter(image => image.getClientRects().length).map(image => image.decode().catch(() => {}))); await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))); });
    const size = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > innerWidth + 1,
      targets: [...document.querySelectorAll('[data-scene-target]')].filter(node => node.getClientRects().length).map(node => node.getBoundingClientRect().toJSON()),
      tokens: [...document.querySelectorAll('[data-token]')].filter(node => node.getClientRects().length).map(node => node.getBoundingClientRect().toJSON()),
      brokenImages: [...document.images].filter(image => image.getClientRects().length && !image.complete || image.getClientRects().length && !image.naturalWidth).map(image => new URL(image.src).pathname),
    }));
    assert.equal(size.overflow, false, `${name}/${width} horizontal overflow`);
    assert.deepEqual(size.brokenImages, [], `${name}/${width} missing visible artwork`);
    if (mode === 'scene') {
      assert.equal(size.tokens.length, 4, `${name}: four action tokens`);
      for (const rect of [...size.targets, ...size.tokens]) {
        assert.ok(rect.width >= 43 && rect.height >= 43, `${name}/${width}: interaction target below44px`);
        assert.ok(rect.top >= 0 && rect.bottom <= height + 1, `${name}/${width}: target outside viewport`);
      }
    }
    await page.screenshot({ path: `output/playwright/journey-${name}-${width}.png`, animations: 'disabled' });
    note(`${name} layout ${width}×${height}`, { targets: size.targets.length });
  }
  await page.setViewportSize({ width: 390, height: 844 });
}

async function journey(prefix, route, finale) {
  const a = await open(`${prefix}a`), b = await open(`${prefix}b`), pair = [a, b];
  assert.equal((await state(a)).room.code, (await state(b)).room.code);
  if (prefix === 'first') await layout(a, 'shop');
  // First host move admits the second identity at the next boundary.
  if (prefix === 'first') {
    assert.equal(atlasRequests.includes('firsta'), false, 'Reduced motion does not prewarm optional event sheets.');
    const prewarmRequest = a.waitForRequest('**/art/flipbook-encounter.webp');
    await a.emulateMedia({ reducedMotion: 'no-preference' });
    await prewarmRequest;
    assert.equal(await a.locator('.gm-stage [data-frame-atlas]').count(), 0, 'Prewarming never mounts an unconfirmed event effect.');
  }
  await select(a, 'iris', 'investigate', 'shop', true); await commit(a);
  if (prefix === 'first') {
    const discovery = await observedFlipbook(a, 'discovery');
    await settledEffects(a);
    assert.equal(await a.getByRole('dialog', { name: /round|chronicle/i }).count(), 0);
    await sync(a); await sync(a); assert.equal(await a.locator('.gm-stage [data-frame-atlas]').count(), 0);
    await a.reload({ waitUntil: 'domcontentloaded' }); await settled(a);
    assert.equal(await a.locator('.gm-stage [data-frame-atlas]').count(), 0, 'Reloading the settled reveal does not replay an old discovery.');
    await sync(b);
    assert.equal(await b.locator('.gm-stage [data-frame-atlas]').count(), 0);
    assert.ok((await state(b)).room.expedition.questItems.includes('ledger-copy'));
    assert.ok(await b.locator('.gm-discovery-receipts').isVisible(), 'Reduced motion retains confirmed shared discovery text.');
    await a.emulateMedia({ reducedMotion: 'reduce' });
    note('Confirmed discovery uses its recorded flipbook window; drafts, repeated sync and reload never replay it', discovery);
    note('Reduced motion retains shared discovery receipts and pouch state without a flipbook');
    note('A delayed optional encounter preload does not block town actions, discovery, synchronization or reload');
  }
  await advance(pair);
  note(`${prefix}: keyboard target and token preparation, explicit release`);
  let room = await allSame(pair);
  assert.equal(room.seats.filter(seat => seat.kind === 'human').length, 2);
  for (let step = 0; room.phase === 'choosing' && room.chapter === 0 && step < 4; step++) {
    await select(a, step === 0 ? 'nella' : 'iris', 'assist', 'shop');
    const spent = prefix === 'first' && step === 1 ? await attachSupply(a, 'dust', 'Spark dust') : prefix === 'first' && step === 2 ? await attachSupply(a, 'favour', 'Local favour') : undefined;
    await commit(a);
    await sync(b); assert.equal((await state(b)).room.phase, 'choosing');
    await select(b, 'bram', 'assist', 'docks'); await commit(b);
    room = await allSame(pair);
    if (spent) {
      assert.equal(room.expedition.stashes[(await state(a)).userId].some(item => item.id === spent), false);
      assert.equal(records.filter(record => record.page === `${prefix}a` && record.command.type === 'act').at(-1).command.action.expedition.consumableId, spent);
      note(`Personal consumable ${step === 1 ? 'Spark dust' : 'Local favour'} is prepared in the stash and spent with the confirmed move`);
    }
    assert.equal(room.phase, 'reveal');
    // Ordinary consequences stay in the scene; they never force a reading dialog.
    assert.equal(await a.getByRole('dialog', { name: /round|chronicle/i }).count(), 0);
    await advance(pair); room = await allSame(pair);
  }
  assert.equal(room.phase, 'travel');
  assert.ok(room.expedition.questItems.includes('ledger-copy') && room.expedition.questItems.includes('canal-key'));
  if (prefix === 'first') {
    await a.keyboard.press('Escape');
    await a.getByRole('button', { name: /^Party pouch,/ }).click();
    const pouch = a.getByRole('dialog', { name: 'Party pouch', exact: true });
    await pouch.locator('[data-quest-item="ledger-copy"] button').first().click();
    assert.match(await pouch.innerText(), /found|discovered/i);
    await layout(a, 'shared-pouch', 'panel');
    await a.keyboard.press('Escape'); await a.getByRole('button', { name: 'Journey', exact: true }).click();
    note('The shared pouch exposes the recorded discovery and returns to the travel map');
  }
  note(`${prefix}: separate town interactions converge into a shared pouch and first travel boundary`);
  if (prefix === 'first') await layout(a, 'first-fork', 'map');
  const beforeVotes = structuredClone(room.players);
  if (prefix === 'first') {
    faults.loseVote = `${prefix}a`; faults.blockReads = `${prefix}a`;
    const edgeId = await vote(a, route, 503);
    assert.equal((await state(a)).pendingTravel.edgeId, edgeId);
    const sent = records.filter(record => record.page === `${prefix}a` && record.command.type === 'vote-travel').at(-1).command;
    await a.reload({ waitUntil: 'domcontentloaded' });
    await a.getByRole('heading', { name: 'Your chair is still bookmarked.' }).waitFor();
    await bind(a);
    await a.waitForFunction(() => window.__journeyStore.getState().ready);
    assert.equal((await state(a)).pendingTravel.edgeId, edgeId, 'Uncertain vote survives reload.');
    faults.blockReads = '';
    await sync(a);
    assert.equal((await state(a)).pendingTravel, null, 'A confirmed vote settles local uncertainty.');
    const duplicate = await handler(new Request(`${base}/api/dropinn`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ operation: 'command', sessionId: (await state(a)).userId, roomCode: room.code, command: sent }) }));
    assert.equal(duplicate.status, 200);
    assert.equal((await duplicate.json()).room.revision, (await state(a)).room.revision);
    note('Lost travel acknowledgement survives reload; synchronization and exact duplicate preserve one accepted vote');
  } else await vote(a, route);
  await sync(b); assert.equal((await state(b)).room.phase, 'travel');
  await vote(b, route); room = await allSame(pair);
  assert.equal(room.phase, 'choosing'); assert.equal(room.expedition.currentNodeId, route);
  for (const id of Object.keys(beforeVotes)) {
    assert.equal(room.players[id].xp, beforeVotes[id].xp); assert.equal(room.players[id].actions, beforeVotes[id].actions);
  }
  note(`${prefix}: votes grant no action or XP and enter ${route} once`);
  let battleRounds = 0, verifiedFinalContact = false;
  for (let step = 0; room.chapter === 1 && step < 9; step++) {
    if (room.phase === 'travel') break;
    assert.equal(room.phase, 'choosing');
    const battle = room.expedition.battle?.status === 'active';
    if (battle) {
      const token = { strike: 'investigate', trick: 'fight', guard: 'influence' }[room.expedition.battle.stance];
      const verifyContact = !battleRounds && prefix === 'first';
      const verifyFinished = battleRounds > 0 && prefix === 'first';
      if (verifyContact || verifyFinished) await a.emulateMedia({ reducedMotion: 'no-preference' });
      if (verifyFinished) await b.emulateMedia({ reducedMotion: 'no-preference' });
      await select(a, 'encounter', token);
      if (!battleRounds && prefix === 'first') await layout(a, 'combat-prepared');
      await commit(a);
      if (verifyContact) assert.equal(await a.locator('.gm-stage [data-frame-atlas]').count(), 0, 'An unconfirmed battle move has no result flipbook.');
      await select(b, 'encounter', token); await commit(b); battleRounds++;
      if (verifyContact) {
        await sync(a);
        const delayed = await observedContactFallback(a, 'loading');
        releaseEncounterImage();
        const contact = await observedFlipbook(a, 'encounter');
        await settledEffects(a);
        await sync(a); await sync(a);
        assert.equal(await a.locator('.gm-stage [data-frame-atlas]').count(), 0);
        await a.reload(); await settled(a);
        assert.equal(await a.locator('.gm-stage [data-frame-atlas]').count(), 0, 'A restored reveal does not replay encounter contact.');
        await sync(b);
        assert.equal(await b.locator('.gm-stage [data-frame-atlas]').count(), 0);
        assert.ok(await b.locator('.gm-enemy-meter').isVisible());
        assert.ok((await state(b)).room.expedition.battle.progress > 0, 'Reduced motion preserves real battle progress.');
        await a.emulateMedia({ reducedMotion: 'reduce' });
        note('Confirmed encounter progress plays the raster atlas once; drafts, repeated sync and reload do not replay contact', contact);
        note('Reduced motion keeps the battle meter and confirmed progress without a flipbook');
        note('A delayed encounter sheet keeps the original confirmed signature and impact visible until ready', delayed);
      } else if (verifyFinished) {
        await sync(a);
        const [contact, failed] = await Promise.all([observedFlipbook(a, 'encounter'), observedContactFallback(b, 'error')]);
        if (['won', 'escaped'].includes(contact.battleStatus)) {
          assert.equal(contact.finishedEncounter, true);
          assert.equal(failed.battleStatus, contact.battleStatus);
          verifiedFinalContact = true;
          note('The winning encounter reveal retains confirmed final contact on its rendered combat target', contact);
          note('A failed encounter atlas retains the original confirmed signature and impact through victory', failed);
        }
        await a.emulateMedia({ reducedMotion: 'reduce' });
        await b.emulateMedia({ reducedMotion: 'reduce' });
      }
    } else {
      const token = route === 'canal' && !room.expedition.questItems.includes('mooring-line') ? 'assist' : 'investigate';
      const target = route === 'canal' ? token === 'assist' ? 'ramp' : 'prism-trail' : 'crate';
      await select(a, target, token); await commit(a); await select(b, target, token); await commit(b);
    }
    room = await allSame(pair); assert.equal(room.phase, 'reveal');
    await advance(pair); room = await allSame(pair);
  }
  assert.equal(room.phase, 'travel');
  assert.ok(room.expedition.questItems.includes('recovered-prism'));
  if (route === 'canal') assert.equal(battleRounds, 0); else assert.ok(battleRounds >= 2 && battleRounds <= 4);
  if (prefix === 'first') assert.equal(verifiedFinalContact, true);
  note(`${prefix}: ${route === 'canal' ? 'peaceful canal recovery' : `${battleRounds}-round encounter`} opens final fork without a filler return turn`);
  if (prefix === 'first') await layout(a, 'final-fork', 'map');
  await vote(a, finale); await vote(b, finale); room = await allSame(pair);
  assert.equal(room.expedition.currentNodeId, finale);
  assert.ok(room.expedition.questItems.includes('recovered-prism'), 'Travel commits an ending but does not consume its quest item prematurely.');
  if (prefix === 'first') await layout(a, 'finale');
  for (let step = 0; room.status !== 'completed' && step < 4; step++) {
    const { getScene } = await ssr.ssrLoadModule('/src/lib/dropinn/scene.ts');
    const target = getScene(room).targets.find(target => target.tokens.includes('assist'));
    await select(a, target.id, 'assist'); await commit(a); await select(b, target.id, 'assist'); await commit(b);
    room = await allSame(pair);
    if (room.status !== 'completed') { await advance(pair); room = await allSame(pair); }
  }
  assert.equal(room.status, 'completed'); assert.equal(room.outcomes.length, 3);
  assert.equal(room.expedition.questItems.includes('recovered-prism'), finale === 'lantern-square');
  for (const page of pair) assert.equal(room.players[(await state(page)).userId].keepsakes.length, 3);
  const beforeReload = structuredClone(room.expedition); await a.reload(); await settled(a);
  assert.deepEqual((await state(a)).room.expedition, beforeReload);
  await a.getByRole('button', { name: 'Journey', exact: true }).click();
  assert.equal(await a.locator('.gm-map-paths g.is-taken').count(), 2);
  await a.locator('[data-journey-node="town"]').click();
  assert.match(await a.locator('.gm-node-memory').innerText(), /The party prepared in Gemward/);
  assert.ok(await a.locator('.gm-node-memory li').count() > 0);
  await a.locator(`[data-journey-node="${route === 'warehouse' ? 'canal' : 'warehouse'}"]`).click();
  assert.equal(await a.locator('.gm-node-memory').count(), 0, 'Unvisited alternatives do not borrow the chosen route’s memories.');
  await a.locator(`[data-journey-node="${finale}"]`).click();
  if (prefix === 'first') await layout(a, 'completed-journey', 'map');
  await a.screenshot({ path: `output/playwright/journey-${prefix}-ending.png`, animations: 'disabled' });
  note(`${prefix}: ${finale} ending, quest consequences, three chapter rewards and recorded journey survive reload`);
  for (const page of pair) await page.close();
  pages.splice(pages.indexOf(a), 2);
}

try {
  sourceFingerprint = await fingerprint();
  ssr = await createServer({ configFile: false, cacheDir: 'node_modules/.vite-journey-tests', optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  const { createDropinnHandler } = await ssr.ssrLoadModule('/server/dropinn.ts');
  ({ stageTimeline } = await ssr.ssrLoadModule('/src/lib/dropinn/stagePlayback.ts'));
  handler = createDropinnHandler({ local: true, env: {}, now: clock, fetch: async () => { throw new Error('No external inference in journey QA.'); } });
  browser = await chromium.launch({ headless: true });
  await journey('first', 'warehouse', 'beacon');
  await journey('second', 'canal', 'lantern-square');
  assert.equal(await fingerprint(), sourceFingerprint, 'Source changed during captures; rerun against the final version.');
  assert.deepEqual(errors, []);
} catch (error) {
  errors.push({ message: error.stack ?? String(error) }); process.exitCode = 1;
  await pages[0]?.screenshot({ path: 'output/playwright/journey-failure.png', fullPage: true }).catch(() => {});
} finally {
  releaseEncounterImage();
  await writeFile('output/playwright/journey-results.json', JSON.stringify({ backend: 'isolated local handler', sourceFingerprint, checks, errors, commands: records.map(({ page, command, status }) => ({ page, status, id: command.id, type: command.type, action: command.action, travel: command.travel })) }, null, 2));
  for (const context of contexts) await context.close().catch(() => {});
  await browser?.close(); await ssr?.close();
  console.log(JSON.stringify({ checks: checks.length, errors }));
}
