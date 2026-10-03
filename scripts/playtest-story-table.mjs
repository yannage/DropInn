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
const faults = { loseVote: '', loseAct: '', blockReads: '' };
const atlasRequests = [];
let releaseEncounterImage;
const encounterImageGate = new Promise(resolve => { releaseEncounterImage = resolve; });
let browser, ssr, handler, stageTimeline, offset = 0, frozenNow;
const note = (name, detail = {}) => { checks.push({ name, ...detail }); console.log(name); };
const clock = () => frozenNow ?? Date.now() + offset;
const fingerprintSources = [
  'src/App.tsx', 'src/components/DropInn/DropInn.tsx',
  'src/components/DropInn/GemwardAdventure.tsx', 'src/components/DropInn/GemwardJourney.tsx',
  'src/components/DropInn/GemwardCombat.tsx', 'src/components/DropInn/GemwardPack.tsx',
  'src/components/DropInn/GemwardArt.tsx', 'src/components/DropInn/gemward-adventure.css',
  'src/components/DropInn/Narrator.tsx',
  'src/components/DropInn/FrameAnimation.tsx', 'src/components/DropInn/LoadingInn.tsx',
  'src/components/DropInn/frame-animation.css', 'src/components/DropInn/loading-inn.css',
  'src/lib/dropinn/frameAnimation.ts', 'src/lib/dropinn/stagePlayback.ts',
  'src/lib/dropinn/storyTable.ts', 'src/lib/dropinn/storyTablePresentation.ts',
  'src/lib/dropinn/storyTableEngine.ts', 'src/lib/dropinn/storyTableContent.ts', 'src/lib/dropinn/storyTableTypes.ts',
  'src/components/DropInn/GemwardStoryTable.tsx', 'src/components/DropInn/gemward-story-table.css',
  'src/components/DropInn/GemwardRoundPanel.tsx', 'src/components/DropInn/gemward-round.css',
  'src/components/DropInn/GemwardTableMarks.tsx', 'src/components/DropInn/gemward-table-marks.css',
  'src/components/DropInn/TabletopFlick.tsx', 'src/components/DropInn/tabletop-flick.css',
  'src/components/DropInn/TableReactions.tsx', 'src/components/DropInn/table-reactions.css',
  'src/lib/dropinn/gemwardTableMarks.ts', 'src/lib/dropinn/gemwardRound.ts',
  'src/lib/dropinn/tabletopFlick.ts', 'src/lib/dropinn/expeditionCombatMove.ts',
  'src/lib/dropinn/journey.ts', 'src/lib/dropinn/journeyEngine.ts', 'src/lib/dropinn/engine.ts',
  'src/lib/dropinn/expedition.ts', 'src/lib/dropinn/registry.ts', 'src/lib/dropinn/types.ts',
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
  for (const snapshot of snapshots.slice(1)) {
    assert.equal(snapshots[0].room.revision, snapshot.room.revision);
    assert.deepEqual(snapshots[0].room.expedition, snapshot.room.expedition);
  }
  return snapshots[0].room;
}
async function open(label) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, reducedMotion: 'reduce' });
  contexts.push(context);
  await context.addInitScript(value => {
    const realNow = Date.now.bind(Date);
    window.__journeyOffset = Number(localStorage.getItem('story-table-qa-offset') ?? value);
    window.__journeyFrozenNow = Number(localStorage.getItem('story-table-qa-frozen')) || null;
    Date.now = () => window.__journeyFrozenNow ?? realNow() + window.__journeyOffset;
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
    if (faults.loseAct === label && payload.command?.type === 'act' && response.status === 200) {
      faults.loseAct = '';
      return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'Intentional lost action acknowledgement' }) });
    }
    return route.fulfill({ status: response.status, contentType: 'application/json', body });
  });
  await page.goto(`${base}/?session=storytableqa${label}`);
  await page.locator('.di-lobby-play').waitFor();
  await page.locator('.di-lobby-play').click(); await settled(page);
  const snapshot = await state(page);
  assert.equal(snapshot.backend, 'local');
  assert.equal(snapshot.room.adventureId, 'gemward'); assert.equal(snapshot.room.adventureVersion, 3);
  return page;
}
async function closePanel(page) {
  await page.keyboard.press('Escape');
}
// Long accessibility/layout probes hold only the injected clock, never a gameplay snapshot.
async function holdClock() {
  frozenNow = clock();
  for (const page of pages) await page.evaluate(at => { window.__journeyFrozenNow = at; localStorage.setItem('story-table-qa-frozen', String(at)); }, frozenNow);
}
async function resumeClock() {
  if (frozenNow === undefined) return;
  offset = frozenNow - Date.now(); frozenNow = undefined;
  for (const page of pages) await page.evaluate(value => { window.__journeyOffset = value; window.__journeyFrozenNow = null; localStorage.setItem('story-table-qa-offset', String(value)); localStorage.removeItem('story-table-qa-frozen'); }, offset);
}
const gameplay = room => Object.fromEntries(['id', 'adventureId', 'adventureVersion', 'status', 'phase', 'chapter', 'chapterRound', 'turn', 'deadline', 'revealUntil', 'progress', 'danger', 'flags', 'seats', 'players', 'pendingJoins', 'commits', 'enemyIntent', 'events', 'outcomes', 'expedition'].map(key => [key, room[key]]));
async function select(page, targetId, token = 'investigate', place, keyboard = false) {
  // Store synchronization is not yet proof that the choosing UI has rendered.
  await page.locator('.gm-hand [data-token]:not(:disabled)').first().waitFor();
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
  assert.equal(await page.locator('[data-gemward-fact-stamp]').count(), 0, 'Preparing a move never stamps a story fact.');
}
async function observedFactStamp(page) {
  await page.locator('[data-gemward-fact-stamp]').waitFor({ timeout: 6500 });
  const observation = await page.evaluate(() => {
    const stamp = document.querySelector('[data-gemward-fact-stamp]');
    return { id: stamp.getAttribute('data-gemward-fact-stamp'), label: stamp.textContent, room: window.__journeyStore.getState().room,
      at: Date.now(), animation: getComputedStyle(stamp.querySelector('i')).animationName };
  });
  const beat = stageTimeline(observation.room).find(beat => beat.event.id === observation.id);
  assert.ok(beat?.event.result?.expedition?.storyTable?.factIds.length);
  assert.ok(observation.at >= beat.start + beat.duration / 3 && observation.at < beat.start + beat.duration);
  assert.match(observation.label, /Delivery ledger/);
  assert.equal(observation.animation, 'gm-fact-stamp');
  await page.screenshot({ path: 'output/playwright/story-table-confirmed-fact-stamp.png' });
  note('A new confirmed preparation receives its factual ink seal only at the existing contact beat', { eventId: observation.id });
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
  await page.screenshot({ path: `output/playwright/story-table-confirmed-${atlas}-atlas.png` });
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
  await page.screenshot({ path: `output/playwright/story-table-encounter-${assetState}-fallback.png` });
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
  const [received] = await Promise.all([response, locator.click()]);
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
  for (const page of pages) await page.evaluate(value => { window.__journeyOffset = value; localStorage.setItem('story-table-qa-offset', String(value)); }, offset);
  for (const page of pair) await sync(page);
}
async function vote(page, toNodeId, expectedStatus = 200) {
  const room = (await state(page)).room;
  assert.equal(room.phase, 'travel');
  const edge = room.expedition.travel.options.find(option => option.toNodeId === toNodeId);
  assert.ok(edge, `Available travel option ${toNodeId}`);
  const before = records.filter(record => record.command.type === 'vote-travel').length;
  await page.locator(`[data-journey-choice="${toNodeId}"]`).click();
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
      storyFont: Number.parseFloat(getComputedStyle(document.querySelector('[data-story-situation]')).fontSize),
      release: document.querySelector('.gm-release-controls')?.getBoundingClientRect().toJSON(),
      story: document.querySelector('[data-story-table]')?.getBoundingClientRect().toJSON(),
      moves: document.querySelector('[data-round-moves]')?.getBoundingClientRect().toJSON(),
      toy: document.querySelector('.gm-waiting-toy')?.getBoundingClientRect().toJSON(),
      toyFont: document.querySelector('.gm-waiting-toy') && Number.parseFloat(getComputedStyle(document.querySelector('.gm-waiting-toy')).fontSize),
      reactions: [...document.querySelectorAll('[data-round-waiting] .di-reaction-buttons>button')].map(node => node.getBoundingClientRect().toJSON()),
    }));
    assert.equal(size.overflow, false, `${name}/${width} horizontal overflow`);
    assert.deepEqual(size.brokenImages, [], `${name}/${width} missing visible artwork`);
    if (mode === 'scene') {
      assert.equal(size.tokens.length, 4, `${name}: four action tokens`);
      assert.ok(size.storyFont >= 13, `${name}/${width}: narrative below 13px`);
      assert.ok(size.release && size.release.bottom <= height + 1, `${name}/${width}: release outside viewport`);
      for (const rect of [...size.targets, ...size.tokens]) {
        assert.ok(rect.width >= 43 && rect.height >= 43, `${name}/${width}: interaction target below44px`);
        assert.ok(rect.top >= 0 && rect.bottom <= height + 1, `${name}/${width}: target outside viewport`);
      }
    }
    if (name === 'waiting-accepted') {
      assert.ok(size.moves && size.moves.top >= size.story.top && size.moves.bottom <= size.story.bottom + 1, `${width}: placed-moves link fits the default story viewport`);
      assert.ok(size.toy.width >= 44 && size.toy.height >= 44 && size.toy.bottom <= height + 1, `${width}: optional toy has a visible44px control`);
      if (width <= 620) assert.equal(size.toyFont, 10, `${width}: compact toy type size beats the inherited button font`);
      for (const button of size.reactions) assert.ok(button.width >= 44 && button.height >= 44 && button.bottom <= height + 1, `${width}: shared reaction has a visible44px control`);
    }
    await page.screenshot({ path: `output/playwright/story-table-${name}-${width}.png`, animations: 'disabled' });
    note(`${name} layout ${width}×${height}`, { targets: size.targets.length });
  }
  await page.setViewportSize({ width: 390, height: 844 });
}
async function enlargedStory(page) {
  await page.setViewportSize({ width: 320, height: 568 });
  const override = await page.addStyleTag({ content: '.gm-story-situation,.gm-story-question{font-size:18px!important}.gm-story-topics>button{font-size:16px!important}' });
  await page.locator('[data-story-table]').focus();
  const bounds = await page.evaluate(() => {
    const story = document.querySelector('[data-story-table]');
    const release = document.querySelector('.gm-release-controls');
    return { overflow: document.documentElement.scrollWidth > innerWidth, readingOverflow: getComputedStyle(story).overflowY,
      storyHeight: story.clientHeight, textHeight: story.scrollHeight, releaseBottom: release.getBoundingClientRect().bottom,
      tokens: [...document.querySelectorAll('[data-token]')].map(node => node.getBoundingClientRect().toJSON()) };
  });
  assert.equal(bounds.overflow, false);
  assert.ok(bounds.releaseBottom <= 569);
  assert.equal(bounds.readingOverflow, 'auto');
  for (const rect of bounds.tokens) assert.ok(rect.height >= 44 && rect.bottom <= 569);
  await page.screenshot({ path: 'output/playwright/story-table-enlarged-text-320.png' });
  await page.keyboard.press('End');
  assert.ok(await page.locator('[data-gemward-interaction="iris:pricing"]').isVisible());
  await override.evaluate(node => node.remove());
  await page.setViewportSize({ width: 390, height: 844 });
  note('Enlarged story text remains readable with keyboard scrolling while four tokens and release stay on screen', bounds);
}

async function waitingExperience(a, b) {
  await holdClock();
  const accepted = await allSame([a, b]), actorId = (await state(a)).userId;
  assert.equal(accepted.phase, 'choosing');
  assert.ok(accepted.commits[actorId]);
  await a.locator('[data-round-submission="accepted"]').waitFor();
  await b.locator(`[data-gemward-placed-move="${actorId}"]`).waitFor();
  assert.equal(await a.locator(`[data-gemward-placed-move="${actorId}"]`).count(), 0, 'The local parked token is not duplicated by teammate counters.');
  assert.equal(await b.locator(`[data-gemward-placed-move="${actorId}"]`).getAttribute('data-gemward-placed-target'), 'nella');
  const ownLabel = await a.locator('.gm-story-heading').innerText();
  await a.locator('[data-gemward-place="docks"]').click();
  assert.equal(await a.locator('.gm-story-heading').innerText(), ownLabel, 'Browsing another stop keeps the accepted move readable.');
  await layout(a, 'waiting-accepted');
  await a.locator('[data-round-moves]').focus(); await a.keyboard.press('Enter');
  const plans = a.getByRole('dialog', { name: 'Moves on the table', exact: true });
  assert.equal(await plans.locator('[data-round-intent]').count(), 1);
  assert.ok(await plans.locator(`[data-round-intent="${actorId}"]`).isVisible());
  await layout(a, 'waiting-plans', 'panel');
  await plans.getByRole('button', { name: /^Look at / }).click();
  assert.equal(await plans.count(), 0);
  await a.getByRole('dialog', { name: 'A closer look', exact: true }).waitFor();
  await closePanel(a);
  assert.deepEqual(gameplay((await state(a)).room), gameplay(accepted));
  note('Accepted teammate counters and readable placed intentions persist while browsing; inspecting a plan does not replace a move');

  const beforeReaction = gameplay((await state(a)).room);
  await commandClick(a, 'react', a.getByRole('button', { name: 'React: Cheers!', exact: true }));
  await sync(b);
  const reaction = (await state(a)).room.reactions.at(-1);
  for (const page of [a, b]) await page.locator(`[data-reaction-id="${reaction.id}"]`).waitFor();
  assert.deepEqual(gameplay((await state(a)).room), beforeReaction);
  assert.deepEqual(gameplay((await state(b)).room), beforeReaction);
  assert.equal(await a.getByRole('button', { name: 'React: Cheers!', exact: true }).isDisabled(), true);
  note('A real waiting cheer reaches both players while preserving commitments, deadline, XP and all gameplay fields');

  const commandCount = records.length, beforeToy = gameplay((await state(a)).room);
  await a.getByRole('button', { name: 'Flick a counter while you wait', exact: true }).click();
  const toy = a.getByRole('dialog', { name: 'A little table play', exact: true }), lane = toy.locator('[data-flick-lane]');
  await lane.waitFor();
  await layout(a, 'waiting-flick', 'panel');
  assert.equal(await toy.locator('[data-flick-counter]').count(), 1);
  await lane.focus(); await a.keyboard.press('ArrowRight'); await a.keyboard.press('ArrowUp'); await a.keyboard.press('Enter');
  assert.equal(await lane.getAttribute('data-flick-running'), 'false', 'Reduced motion lands the local counter immediately.');
  assert.notEqual(await toy.locator('[data-flick-result]').innerText(), 'Land the counter on the coaster.');
  assert.match(await lane.getAttribute('aria-label'), /10° up.*76 percent/);
  await lane.tap();
  assert.equal(await lane.getAttribute('data-flick-running'), 'false');
  assert.equal(await toy.locator('[data-flick-counter]').count(), 1);
  note('The waiting toy supports keyboard aim and touch tap with a static readable reduced-motion landing');

  await a.emulateMedia({ reducedMotion: 'no-preference' });
  await lane.focus(); await a.keyboard.press('Space');
  await a.locator('[data-flick-lane][data-flick-running="true"]').waitFor();
  await a.locator('[data-flick-lane][data-flick-running="false"]').waitFor();
  await a.keyboard.down('Enter');
  await a.locator('[data-flick-lane][data-flick-running="true"]').waitFor();
  await a.locator('[data-flick-lane][data-flick-running="false"]').waitFor();
  await a.keyboard.down('Enter');
  assert.equal(await lane.getAttribute('data-flick-running'), 'false', 'Holding a key must not automatically launch another shot after the first settles.');
  await a.keyboard.up('Enter');
  const box = await lane.boundingBox();
  await a.mouse.move(box.x + box.width * .45, box.y + box.height * .55); await a.mouse.down();
  await a.mouse.move(box.x + box.width * .45 - 35, box.y + box.height * .55 + 5, { steps: 5 }); await a.mouse.up();
  await a.locator('[data-flick-lane][data-flick-running="true"]').waitFor();
  await a.locator('[data-flick-lane][data-flick-running="false"]').waitFor();
  assert.equal(await toy.locator('[data-flick-counter]').count(), 1);
  // Cancel the real captured pointer. A synthetic cancellation is the browser's lifecycle event, not an injected game state.
  await a.mouse.move(box.x + box.width * .45, box.y + box.height * .55); await a.mouse.down();
  await a.mouse.move(box.x + box.width * .45 - 20, box.y + box.height * .55 + 2);
  await lane.dispatchEvent('pointercancel', { pointerId: 1, pointerType: 'mouse' }); await a.mouse.up();
  assert.equal(await lane.getAttribute('data-flick-running'), 'false');
  assert.equal(await toy.locator('[data-flick-result]').innerText(), 'Land the counter on the coaster.');
  await a.mouse.move(box.x + box.width * .45, box.y + box.height * .55); await a.mouse.down();
  await a.mouse.move(box.x + box.width * .45 - 20, box.y + box.height * .55 + 2);
  await a.evaluate(() => window.dispatchEvent(new Event('blur'))); await a.mouse.up();
  assert.equal(await lane.getAttribute('data-flick-running'), 'false', 'Blur cancels the captured gesture and its following native click.');
  assert.equal(await toy.locator('[data-flick-result]').innerText(), 'Land the counter on the coaster.');
  await lane.focus(); await a.keyboard.press('Enter');
  await a.locator('[data-flick-lane][data-flick-running="true"]').waitFor();
  await a.evaluate(() => window.dispatchEvent(new Event('blur')));
  assert.equal(await lane.getAttribute('data-flick-running'), 'false');
  assert.equal(await toy.locator('[data-flick-result]').innerText(), 'Land the counter on the coaster.');
  await a.emulateMedia({ reducedMotion: 'reduce' });
  assert.equal(records.length, commandCount, 'Toy input must never send a gameplay or reaction command.');
  assert.deepEqual(gameplay((await state(a)).room), beforeToy);
  await sync(b); assert.deepEqual(gameplay((await state(b)).room), beforeToy);
  note('Bounded counter flight, drag release, cancellation and blur preserve the complete gameplay state and send no commands');
  // Leave the optional toy open so the real second commitment must clear it at resolution.
  await resumeClock();
}

async function uncertainMove(a, b, label) {
  await holdClock();
  faults.loseAct = label; faults.blockReads = label;
  await commandClick(a, 'act', a.getByRole('button', { name: /^(Roll|Commit) now$/ }), 503);
  await a.locator('[data-round-submission="pending"]').waitFor();
  assert.equal(await a.getByRole('button', { name: 'Flick a counter while you wait', exact: true }).count(), 0);
  assert.equal(await a.locator('[data-tabletop-flick]').count(), 0);
  const sent = records.filter(record => record.page === label && record.command.type === 'act').at(-1).command;
  await sync(b); const accepted = gameplay((await state(b)).room);
  const saved = (await state(a)).pendingMove;
  assert.deepEqual(JSON.parse(JSON.stringify(saved.action)), sent.action);
  faults.loseAct = label;
  await commandClick(a, 'act', a.getByRole('button', { name: 'Retry the same move', exact: true }), 503);
  const retried = records.filter(record => record.page === label && record.command.type === 'act').at(-1).command;
  assert.deepEqual(retried, sent, 'Uncertain retry must preserve the complete accepted command envelope.');
  await sync(b); assert.deepEqual(gameplay((await state(b)).room), accepted);
  await a.reload({ waitUntil: 'domcontentloaded' });
  await a.getByRole('heading', { name: 'Your chair is still bookmarked.' }).waitFor();
  await bind(a); await a.waitForFunction(() => window.__journeyStore.getState().ready);
  assert.deepEqual((await state(a)).pendingMove.action, JSON.parse(JSON.stringify(saved.action)));
  assert.equal(await a.getByRole('button', { name: 'Flick a counter while you wait', exact: true }).count(), 0);
  faults.blockReads = ''; await sync(a);
  assert.equal((await state(a)).pendingMove, null);
  assert.deepEqual(gameplay((await state(a)).room), accepted);
  await a.locator('[data-round-submission="accepted"]').waitFor();
  await resumeClock();
  note('Lost action acknowledgement stays explicitly pending with no toy; reload and exact retry recover the same move without duplicate state or rewards');
}

async function crowdedAccepted() {
  const group = [];
  for (const label of ['crowda', 'crowdb', 'crowdc', 'crowdd']) group.push(await open(label));
  const [a, b, c, d] = group;
  await select(a, 'iris', 'influence', 'shop'); await commit(a); await advance(group);
  const room = await allSame(group);
  assert.equal(room.seats.filter(seat => seat.kind === 'human').length, 4);
  await holdClock();
  for (const page of [a, b, c]) { await select(page, 'nella', 'assist', 'shop'); await commit(page); }
  await sync(d);
  await d.locator('[data-gemward-placed-move]').nth(2).waitFor();
  assert.equal(await d.locator('[data-gemward-placed-move]').count(), 3);
  const bounds = await d.locator('[data-scene-target]').evaluateAll(nodes => nodes.map(node => ({ id: node.getAttribute('data-scene-target'), rect: node.getBoundingClientRect().toJSON() })));
  await d.evaluate(() => { window.__placedMarkNodes = [...document.querySelectorAll('[data-gemward-placed-move]')]; });
  await sync(d); await sync(d);
  assert.deepEqual(await d.locator('[data-scene-target]').evaluateAll(nodes => nodes.map(node => ({ id: node.getAttribute('data-scene-target'), rect: node.getBoundingClientRect().toJSON() }))), bounds, 'Repeated accepted-state snapshots cannot move any target or hero hit rectangle.');
  assert.equal(await d.evaluate(() => window.__placedMarkNodes.every((node, index) => node === document.querySelectorAll('[data-gemward-placed-move]')[index])), true);
  await layout(d, 'crowded-accepted');
  await d.locator('[data-round-moves]').click();
  assert.equal(await d.locator('[data-round-intent]').count(), 3);
  await d.screenshot({ path: 'output/playwright/story-table-crowded-plans-390.png', animations: 'disabled' });
  await closePanel(d);
  await select(d, 'nella', 'assist', 'shop');
  assert.match(await d.locator('[data-round-notice]').innerText(), /2 others.*recorded once/i);
  await commit(d); await allSame(group);
  for (const page of group) assert.equal(await page.locator('[data-gemward-placed-move]').count(), 0);
  await resumeClock();
  note('Three real accepted teammates share one target without moving hit areas or remounting markers; four-human resolution removes the pending counters');
  for (const page of group) { await page.close(); pages.splice(pages.indexOf(page), 1); }
}

async function journey(prefix, route, finale) {
  const a = await open(`${prefix}a`), b = await open(`${prefix}b`), pair = [a, b];
  assert.equal((await state(a)).room.code, (await state(b)).room.code);
  if (prefix === 'first') {
    assert.match(await a.locator('[data-story-situation]').innerText(), /beacon.*dark.*prism.*missing/i);
    assert.match(await a.locator('[data-story-question]').innerText(), /missing prism/i);
    assert.equal(await a.getByRole('progressbar', { name: 'Chapter progress' }).count(), 0);
    await layout(a, 'shop');
    note('The opening states the missing prism, dark beacon and human need without opening Story');
  }
  // First host move admits the second identity at the next boundary.
  if (prefix === 'first') {
    assert.equal(atlasRequests.includes('firsta'), false, 'Reduced motion does not prewarm optional event sheets.');
    const prewarmRequest = a.waitForRequest('**/art/flipbook-encounter.webp');
    await a.emulateMedia({ reducedMotion: 'no-preference' });
    await prewarmRequest;
    assert.equal(await a.locator('.gm-stage [data-frame-atlas]').count(), 0, 'Prewarming never mounts an unconfirmed event effect.');
  }
  await select(a, 'iris', 'influence', 'shop', true);
  assert.equal(await a.locator('.gm-story-topics button').count(), 2, 'NPC intentions are visible on the main table.');
  const beforeTopic = records.filter(record => record.command.type === 'act').length;
  await a.locator('[data-gemward-interaction="iris:pricing"]').click();
  assert.equal(records.filter(record => record.command.type === 'act').length, beforeTopic, 'Choosing a topic prepares only.');
  if (prefix === 'first') await layout(a, 'conversation-prepared');
  if (prefix === 'first') await enlargedStory(a);
  const factStamp = prefix === 'first' ? observedFactStamp(a) : undefined;
  await commit(a);
  if (prefix === 'first') {
    const [discovery] = await Promise.all([observedFlipbook(a, 'discovery'), factStamp]);
    await settledEffects(a);
    assert.equal(await a.getByRole('dialog', { name: /round|chronicle/i }).count(), 0);
    await sync(a); await sync(a); assert.equal(await a.locator('.gm-stage [data-frame-atlas]').count(), 0);
    await a.reload({ waitUntil: 'domcontentloaded' }); await settled(a);
    assert.equal(await a.locator('.gm-stage [data-frame-atlas]').count(), 0, 'Reloading the settled reveal does not replay an old discovery.');
    assert.equal(await a.locator('[data-gemward-fact-stamp]').count(), 0, 'Reloading does not replay a factual stamp.');
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
  assert.ok(await a.locator('[data-story-last-turn]').count(), 'Confirmed consequence survives into the next choosing turn.');
  assert.match(await a.locator('.gm-story-copy').innerText(), /warehouse|delivery/i);
  if (prefix === 'first') note('The discovery keeps its cause and next lead through the next choosing turn');
  for (let step = 0; room.phase === 'choosing' && room.chapter === 0 && step < 3; step++) {
    await select(a, step === 0 ? 'nella' : 'iris', 'assist', 'shop');
    if (prefix === 'first' && step === 0) {
      await sync(b);
      assert.equal(await b.locator('[data-gemward-placed-move]').count(), 0, 'Another player never sees a prepared draft as an accepted counter.');
      assert.equal(await a.getByRole('button', { name: 'Flick a counter while you wait', exact: true }).count(), 0);
    }
    const spent = prefix === 'first' && step === 1 ? await attachSupply(a, 'dust', 'Spark dust') : prefix === 'first' && step === 2 ? await attachSupply(a, 'favour', 'Local favour') : undefined;
    if (prefix === 'first' && step === 1) {
      const beforeConflict = records.filter(record => record.command.type === 'act').length;
      await a.locator('[data-story-plan]').click();
      assert.equal(await a.getByRole('button', { name: 'Commit now', exact: true }).isDisabled(), true);
      assert.match(await a.locator('[data-story-situation]').innerText(), /cannot extend.*setting out or finishing/i);
      await layout(a, 'dust-cannot-close');
      assert.equal(records.filter(record => record.command.type === 'act').length, beforeConflict);
      assert.ok((await state(a)).room.expedition.stashes[(await state(a)).userId].some(item => item.id === spent));
      await a.locator('.gm-attached button').filter({ hasText: 'Spark dust' }).click();
      assert.equal(await a.getByRole('button', { name: 'Commit now', exact: true }).isEnabled(), true);
      await select(a, 'iris', 'assist', 'shop');
      assert.equal(await attachSupply(a, 'dust', 'Spark dust'), spent);
      note('Dust cannot be released with Gather; its reason and removal control preserve the item until a preparation action is chosen');
    }
    if (prefix === 'first' && step === 2) await uncertainMove(a, b, `${prefix}a`);
    else await commit(a);
    await sync(b); assert.equal((await state(b)).room.phase, 'choosing');
    if (prefix === 'first' && step === 0) {
      await waitingExperience(a, b);
      await select(b, 'nella', 'assist', 'shop');
      assert.match(await b.locator('[data-round-notice]').innerText(), /recorded once|shared discovery|already placed/i);
      note('A matching accepted preparation explains overlap before the second player commits');
    }
    await select(b, prefix === 'first' && step === 0 ? 'nella' : 'bram', 'assist', prefix === 'first' && step === 0 ? 'shop' : 'docks');
    if (prefix === 'first' && step === 1) {
      const duplicateDust = await attachSupply(b, 'dust', 'Spark dust');
      const previousCommands = records.length;
      assert.equal(await b.getByRole('button', { name: 'Commit now', exact: true }).isDisabled(), true);
      assert.match(await b.locator('[data-story-situation]').innerText(), /teammate.*Spark dust.*remove/i);
      const preparedHeading = await b.locator('.gm-story-heading').innerText();
      await b.locator('[data-round-moves]').click();
      await b.getByRole('dialog', { name: 'Moves on the table', exact: true }).getByRole('button', { name: /^Look at / }).click();
      await b.getByRole('dialog', { name: 'A closer look', exact: true }).waitFor();
      await closePanel(b);
      assert.equal(await b.locator('[data-gemward-place="docks"]').getAttribute('aria-pressed'), 'true', 'Read-only inspection of a shop move must retain a draft at the docks.');
      assert.equal(await b.locator('[data-scene-target="bram"]').getAttribute('aria-pressed'), 'true');
      assert.equal(await b.locator('[data-token="assist"]').getAttribute('aria-pressed'), 'true');
      assert.equal(await b.locator('.gm-story-heading').innerText(), preparedHeading);
      assert.ok(await b.locator('.gm-attached button').filter({ hasText: 'Spark dust' }).isVisible());
      assert.equal(records.length, previousCommands);
      note('Inspecting a teammate at another stop preserves the local target, token, topic and attached item');
      await b.locator('.gm-attached button').filter({ hasText: 'Spark dust' }).click();
      assert.equal(await b.getByRole('button', { name: 'Commit now', exact: true }).isEnabled(), true);
      assert.equal(records.length, previousCommands);
      assert.ok((await state(b)).room.expedition.stashes[(await state(b)).userId].some(item => item.id === duplicateDust));
      note('A teammate’s accepted Spark dust disables a duplicate release and keeps the removable local item unspent');
    }
    await commit(b);
    room = await allSame(pair);
    if (prefix === 'first' && step === 0) {
      await a.getByRole('dialog', { name: 'A little table play', exact: true }).waitFor({ state: 'detached' });
      assert.equal(await a.locator('[data-tabletop-flick]').count(), 0);
      const focus = await a.evaluate(() => ({ story: document.activeElement?.matches('[data-story-table]'), visible: !!document.activeElement?.getClientRects().length }));
      assert.equal(focus.story, true, 'Closing the toy at the round boundary returns focus to the current story.');
      assert.equal(focus.visible, true);
      note('A real round resolution closes optional table play and restores useful keyboard focus');
    }
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
  assert.equal(room.phase, 'choosing', 'Ordinary support does not automatically dismiss the town once a lead exists.');
  const beforeGather = records.filter(record => record.command.type === 'act').length;
  await a.locator('[data-story-plan]').click();
  assert.equal(records.filter(record => record.command.type === 'act').length, beforeGather);
  if (prefix === 'first') await layout(a, 'gather-prepared');
  await commit(a);
  assert.equal(records.filter(record => record.page === `${prefix}a` && record.command.type === 'act').at(-1).command.action.expedition.interactionId, 'story-plan:gather');
  if (prefix === 'first') {
    await sync(b);
    assert.match(await b.locator('[data-round-notice]').innerText(), /last move here.*accepted actions settle/i);
    note('A teammate’s accepted departure makes the last preparation opportunity explicit');
  }
  await select(b, 'bram', 'assist', 'docks'); await commit(b);
  room = await allSame(pair); assert.equal(room.phase, 'reveal');
  await advance(pair); room = await allSame(pair);
  note(`${prefix}: Gather is prepared explicitly, released once, and lets the other player's move resolve`);
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
      if (!battleRounds && prefix === 'first') assert.match(await a.locator('[data-story-situation]').innerText(), /Winning counter: \+[\d.]+ battle progress\./);
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
  await select(a, finale === 'beacon' ? 'beacon' : 'lanterns', 'assist'); await commit(a);
  await select(b, finale === 'beacon' ? 'town' : 'neighbours', 'assist'); await commit(b);
  room = await allSame(pair);
  assert.equal(room.status, 'active', 'Readiness does not silently enact the ending.');
  await advance(pair); room = await allSame(pair);
  assert.ok(['light-ready', 'people-ready'].every(id => room.expedition.storyTable.facts.some(fact => fact.id === id)));
  assert.ok(room.expedition.questItems.includes('recovered-prism'));
  const beforeFinish = records.filter(record => record.command.type === 'act').length;
  await a.locator('[data-story-plan]').click();
  assert.equal(records.filter(record => record.command.type === 'act').length, beforeFinish, 'Preparing Finish cannot spend the prism.');
  if (prefix === 'first') await layout(a, 'finish-prepared');
  await commit(a);
  assert.equal(records.filter(record => record.page === `${prefix}a` && record.command.type === 'act').at(-1).command.action.expedition.interactionId, 'story-plan:finish');
  await select(b, 'keeper', 'assist'); await commit(b);
  room = await allSame(pair);
  note(`${prefix}: light and neighbours are prepared separately; explicit Finish enacts the chosen future`);
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
  await a.screenshot({ path: `output/playwright/story-table-${prefix}-ending.png`, animations: 'disabled' });
  note(`${prefix}: ${finale} ending, quest consequences, three chapter rewards and recorded journey survive reload`);
  for (const page of pair) await page.close();
  pages.splice(pages.indexOf(a), 2);
}

try {
  sourceFingerprint = await fingerprint();
  ssr = await createServer({ configFile: false, cacheDir: 'node_modules/.vite-story-table-tests', optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  const { createDropinnHandler } = await ssr.ssrLoadModule('/server/dropinn.ts');
  ({ stageTimeline } = await ssr.ssrLoadModule('/src/lib/dropinn/stagePlayback.ts'));
  handler = createDropinnHandler({ local: true, env: {}, now: clock, fetch: async () => { throw new Error('No external inference in journey QA.'); } });
  browser = await chromium.launch({ headless: true });
  await journey('first', 'warehouse', 'beacon');
  await journey('second', 'canal', 'lantern-square');
  await crowdedAccepted();
  assert.equal(await fingerprint(), sourceFingerprint, 'Source changed during captures; rerun against the final version.');
  assert.deepEqual(errors, []);
} catch (error) {
  errors.push({ message: error.stack ?? String(error) }); process.exitCode = 1;
  await pages[0]?.screenshot({ path: 'output/playwright/story-table-failure.png', fullPage: true }).catch(() => {});
} finally {
  releaseEncounterImage();
  await writeFile('output/playwright/story-table-results.json', JSON.stringify({ backend: 'isolated local handler', sourceFingerprint, checks, errors, commands: records.map(({ page, command, status }) => ({ page, status, id: command.id, type: command.type, action: command.action, travel: command.travel })) }, null, 2));
  for (const context of contexts) await context.close().catch(() => {});
  await browser?.close(); await ssr?.close();
  console.log(JSON.stringify({ checks: checks.length, errors }));
}
