import assert from 'node:assert/strict';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright';
import { createServer } from 'vite';

// Two real identities through the actual isolated local handler. Only time is
// controlled: no gameplay snapshots, facts, equipment or rewards are injected.
const origin = new URL(process.argv[2] ?? 'http://127.0.0.1:5207');
assert.ok(origin.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(origin.hostname)
  && origin.pathname === '/' && !origin.search && !origin.hash && !origin.username && !origin.password);
const base = origin.origin, checks = [], errors = [], records = [], contexts = [], pages = [];
const faults = { loseAction: '', blockReads: '' };
const capturedCombat = new Set();
let now = Date.now(), handler, ssr, browser, sourceFingerprint, questCombatMoves;
const note = (name, detail = {}) => { checks.push({ name, ...detail }); console.log(name); };
const sourceFiles = ['src/App.tsx', 'src/components/DropInn/DropInn.tsx', 'src/components/DropInn/QuestAdventure.tsx',
  'src/components/DropInn/quest-adventure.css', 'src/components/DropInn/TargetArtwork.tsx',
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
    if (payload.command || payload.operation === 'chat') records.push({ page: label, operation: payload.operation, command: payload.command, status: response.status });
    if (faults.loseAction === label && payload.command?.type === 'quest-act' && response.status === 200) { faults.loseAction = ''; return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'Intentional lost action acknowledgement' }) }); }
    return route.fulfill({ status: response.status, contentType: 'application/json', body });
  });
  await page.goto(`${base}/?session=questqa${label}`); await page.locator('.di-lobby-play').waitFor();
  if (!/Mosswater/.test(await page.locator('.di-lobby-play').innerText())) {
    await page.getByRole('button', { name: 'Change story', exact: true }).click();
    await page.getByRole('button', { name: /^Select story: Mosswater:/ }).click();
  }
  await page.locator('.di-lobby-play').click(); await settled(page);
  const s = await state(page); assert.equal(s.backend, 'local'); assert.equal(s.room.adventureId, 'mosswater'); assert.equal(s.room.adventureVersion, 1);
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
async function layout(page, name, drawer = false) {
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
    }));
    assert.equal(metrics.overflow, false, `${name}/${width}: horizontal overflow`); assert.deepEqual(metrics.broken, [], `${name}/${width}: missing visible art`);
    assert.ok(metrics.artBackings.every(color => color === 'rgba(0, 0, 0, 0)'), `${name}/${width}: inherited target tiles cover the illustrated scene`);
    if (!drawer) {
      assert.ok(metrics.font >= 13, `${name}/${width}: story text below 13px`);
      if (metrics.enemyHealth) assert.ok(metrics.enemyHealth.bottom <= Math.min(...metrics.heroArt.map(rect => rect.top)), `${name}/${width}: enemy health bar overlaps the party artwork (${metrics.enemyHealth.bottom} > ${Math.min(...metrics.heroArt.map(rect => rect.top))})`);
      for (const rect of [...metrics.targets, ...metrics.moves]) assert.ok(rect.width >= 43 && rect.height >= 43, `${name}/${width}: target below44px`);
    }
    await page.screenshot({ path: `output/playwright/quest-${name}-${width}.png`, fullPage: drawer, animations: 'disabled' });
    if (!drawer) {
      for (const control of await page.locator('[data-quest-move], [data-quest-release]').all()) {
        await control.scrollIntoViewIfNeeded(); const bounds = await control.boundingBox();
        assert.ok(bounds && bounds.y >= 0 && bounds.y + bounds.height <= height + 1, `${name}/${width}: action cannot be brought into view by normal scrolling`);
      }
      if (metrics.release?.bottom > height + 1 || metrics.moves.some(rect => rect.bottom > height + 1)) await page.screenshot({ path: `output/playwright/quest-${name}-${width}-controls.png`, animations: 'disabled' });
    }
    note(`${name} layout ${width}×${height}`, metrics.enemyHealth && !drawer ? { healthBarPartyGap: Math.min(...metrics.heroArt.map(rect => rect.top)) - metrics.enemyHealth.bottom } : {});
  }
  await page.setViewportSize({ width: 390, height: 844 });
}
async function uncertainSecondBeat(a, b) {
  faults.loseAction = 'a'; faults.blockReads = 'a'; await release(a, 503);
  await a.getByRole('button', { name: /Retry the same move/ }).waitFor();
  const sent = structuredClone(records.filter(r => r.page === 'a' && r.command?.type === 'quest-act').at(-1).command);
  await sync(b); const accepted = structuredClone((await state(b)).room.questRun);
  faults.loseAction = 'a'; await commandClick(a, a.getByRole('button', { name: /Retry the same move/ }), 503);
  assert.deepEqual(records.filter(r => r.page === 'a' && r.command?.type === 'quest-act').at(-1).command, sent);
  await sync(b); assert.deepEqual((await state(b)).room.questRun, accepted);
  await a.reload({ waitUntil: 'domcontentloaded' }); await a.getByRole('heading', { name: 'Your chair is still bookmarked.' }).waitFor();
  await bind(a); await a.waitForFunction(() => window.__questStore.getState().ready);
  assert.deepEqual((await state(a)).pendingQuest.action, sent.questAction);
  faults.blockReads = ''; await sync(a); assert.equal((await state(a)).pendingQuest, null);
  assert.deepEqual((await state(a)).room.questRun, accepted);
  note('A lost second-beat acknowledgement, exact retry and reload preserve one discovery, focus expenditure and reward');
}
async function combatMove(pair, move) {
  const page = await activePage(pair), before = (await state(page)).room;
  const count = commandCount(); await page.locator(`[data-quest-move="${move}"]`).click();
  assert.equal(commandCount(), count);
  if (move === 'mend') assert.match(await page.getByRole('group', { name: 'Choose who to Mend', exact: true }).locator('[aria-pressed="true"]').innerText(), /You.*HP/, 'The prepared Mend names its actual wounded recipient.');
  if (['attack', 'mend'].includes(move) && !capturedCombat.has(move)) {
    capturedCombat.add(move); await layout(page, move === 'attack' ? 'combat-prepared' : 'mend-prepared');
  }
  await release(page); await allSame(pair);
  const after = (await state(page)).room;
  await advance(pair);
  return { before, after, actorId: (await state(page)).userId };
}
async function journey() {
  const a = await open('a'), b = await open('b'), pair = [a, b];
  let room = await allSame(pair); const aid = (await state(a)).userId, bid = (await state(b)).userId;
  assert.equal((await state(a)).room.code, (await state(b)).room.code); assert.notEqual(aid, bid);
  assert.equal(room.questRun.focus.actorId, aid); assert.ok(room.pendingJoins.includes(bid));
  await layout(a, 'opening');
  assert.match(await a.locator('.qr-quest-title').innerText(), /clean water home/i);
  assert.match(await a.locator('[data-quest-result]').innerText(), /well|water|stain/i);
  note('The opening names the shared water problem; the joining human can inspect but cannot spend the leader’s focus');
  const firstDeadline = room.deadline, firstTurn = room.turn;
  await prepare(a, 'well', 'well-inspect', true); await layout(a, 'first-choice'); await release(a);
  room = await allSame(pair); assert.ok(room.questRun.items.includes('stained-cloth')); assert.ok(room.questRun.followUp.optionIds.includes('well-trace-stain'));
  assert.equal(await b.locator('[data-quest-release]').count(), 0);
  assert.equal(await a.locator('[data-frame-atlas]').count(), 0, 'Reduced motion preserves the discovery without a flipbook.');
  await layout(a, 'discovery'); room = await advance(pair);
  assert.equal(room.questRun.focus.actorId, aid); assert.equal(room.questRun.focus.remaining, 1); assert.equal(room.deadline, firstDeadline); assert.equal(room.turn, firstTurn + 1);
  assert.equal(await a.locator('[data-quest-option]').count(), 2);
  await prepare(a, 'well', 'well-trace-stain'); await layout(a, 'follow-up'); await uncertainSecondBeat(a, b);
  room = await advance(pair); assert.equal(room.questRun.focus.actorId, bid); assert.equal(room.seats.filter(s => s.kind === 'human').length, 2);
  assert.ok(room.questRun.facts.some(f => f.id === 'yard-route')); assert.ok(room.questRun.completedObjectives.includes('investigate'));
  note('The same hero follows a discovered clue under the original45s deadline; the lantern then passes to the second human');

  await layout(a, 'waiting'); const beforeSuggestion = structuredClone(room.questRun), beforeCommands = commandCount();
  await map(a, 'watercourse'); await layout(a, 'waiting-map', true);
  assert.equal(await a.getByRole('button', { name: /Prepare this route/ }).isDisabled(), true);
  const chatResponse = a.waitForResponse(r => r.url() === `${base}/api/dropinn` && r.request().postDataJSON()?.operation === 'chat');
  await a.getByRole('button', { name: /Suggest this route/ }).click(); assert.equal((await chatResponse).status(), 200);
  await closePanel(a); await sync(b); assert.equal(commandCount(), beforeCommands); assert.deepEqual((await state(b)).room.questRun, beforeSuggestion);
  assert.ok((await state(b)).messages.some(message => /I suggest.*watercourse/i.test(message.text)));
  note('A waiting player inspects and suggests a real route without moving the party or spending the leader’s focus');
  room = await travel(pair, 'watercourse'); assert.equal(room.questRun.nodeId, 'watercourse'); assert.equal(room.questRun.focus.actorId, bid); assert.equal(room.questRun.focus.remaining, 1);
  await layout(b, 'watercourse');
  room = await act(pair, 'mossback', 'mossback-challenge'); assert.equal(room.questRun.combat.status, 'active');
  assert.equal(room.questRun.combat.order.length, 2); await layout(a, 'combat');
  const hpBefore = room.seats.filter(s => s.kind === 'human').map(s => [s.actorId, s.hp]);
  const first = await combatMove(pair, 'attack'); assert.equal(first.after.questRun.combat.round, 1); assert.equal(first.after.questRun.combat.actedActorIds.length, 1);
  assert.deepEqual(first.after.seats.filter(s => s.kind === 'human').map(s => [s.actorId, s.hp]), hpBefore);
  assert.equal((await allSame(pair)).questRun.focus.actorId, bid);
  await a.locator('.qr-table-tools button').filter({ hasText: /point|Build/ }).click();
  const beforeBuild = (await state(a)).room, mightBefore = beforeBuild.questRun.heroes[aid].attributes.might;
  await layout(a, 'waiting-build', true); await commandClick(a, a.getByRole('button', { name: 'Spend one point on might', exact: true })); await closePanel(a);
  room = await allSame(pair); assert.equal(room.questRun.heroes[aid].attributes.might, mightBefore + 1); assert.equal(room.turn, beforeBuild.turn); assert.deepEqual(room.questRun.focus, beforeBuild.questRun.focus); assert.deepEqual(room.questRun.combat, beforeBuild.questRun.combat);
  note('An earned attribute point changes the waiting hero’s build without stealing the active combat move or refreshing its deadline');
  const second = await combatMove(pair, 'attack'); assert.equal(second.after.questRun.combat.round, 2);
  assert.ok(second.after.seats.some(s => s.kind === 'human' && s.hp < hpBefore.find(([id]) => id === s.actorId)[1]));
  note('Each human gets one move; the announced enemy strike applies only after both have acted');
  const supplyBefore = second.after.questRun.supplies, healthBeforeMend = second.after.seats.find(s => s.actorId === aid).hp;
  const mend = await combatMove(pair, 'mend'); assert.equal(mend.after.questRun.supplies, supplyBefore - 1); assert.ok(mend.after.seats.find(s => s.actorId === aid).hp > healthBeforeMend);
  const defended = await combatMove(pair, 'defend');
  assert.ok(defended.after.events.some(event => event.turn === defended.before.turn && event.result?.damage === 0), 'Defend actually blocks the announced enemy phase.');
  const improved = await combatMove(pair, 'attack');
  assert.ok(improved.before.questRun.heroes[aid].attributes.might > first.before.questRun.heroes[aid].attributes.might);
  const firstDamage = first.after.events.findLast(e => e.actorId === aid && e.quest?.move === 'attack').quest.enemyDamage;
  const improvedDamage = improved.after.events.findLast(e => e.actorId === aid && e.quest?.move === 'attack').quest.enemyDamage;
  assert.equal(improvedDamage, firstDamage + 1);
  room = await allSame(pair);
  for (let guard = 0; room.questRun.combat?.status === 'active' && guard < 12; guard++) {
    const page = await activePage(pair), s = await state(page), mana = s.room.questRun.heroes[s.userId].mana;
    const move = mana > 0 ? 'spell' : 'attack', resolved = await combatMove(pair, move);
    if (move === 'spell') {
      assert.equal(resolved.after.questRun.heroes[s.userId].mana, resolved.before.questRun.heroes[s.userId].mana - 1);
      assert.ok(resolved.after.questRun.combat.enemyHp < resolved.before.questRun.combat.enemyHp);
    }
    room = await allSame(pair);
  }
  assert.equal(room.questRun.combat, undefined); assert.ok(room.questRun.facts.some(f => f.id === 'defeated:mossback'));
  note('Attack, Mend, Defend and class Spell affect HP, supplies, cover and mana; an earned Might upgrade increases actual attack damage');
  assert.equal(room.questRun.ending, undefined); assert.equal(room.status, 'active');
  for (const page of pair) {
    const s = await state(page), offer = s.room.questRun.lootOffers.find(o => o.actorId === s.userId); assert.ok(offer);
    await page.locator('.qr-table-tools button').filter({ hasText: /point|Choose loot|Build/ }).click();
    if (page === a) await layout(page, 'loot', true);
    const choice = offer.choices.includes('sluice-hook') ? 'sluice-hook' : offer.choices[0];
    const before = (await state(page)).room; await commandClick(page, page.locator(`[data-quest-loot="${choice}"]`)); await closePanel(page);
    const after = (await state(page)).room; assert.ok(after.questRun.heroes[s.userId].equipment.includes(choice)); assert.equal(after.turn, before.turn); assert.deepEqual(after.questRun.focus, before.questRun.focus);
    assert.ok(!after.questRun.lootOffers.some(o => o.id === offer.id));
    if (choice === 'sluice-hook') assert.notEqual(questCombatMoves(before, s.userId)[0].description, questCombatMoves(after, s.userId)[0].description);
    if (choice === 'amber-focus') assert.equal(after.questRun.heroes[s.userId].maxMana, before.questRun.heroes[s.userId].maxMana + 1);
    if (choice === 'reed-shield') assert.notEqual(questCombatMoves(before, s.userId)[1].description, questCombatMoves(after, s.userId)[1].description);
  }
  room = await allSame(pair); note('Each contributor chooses personal gear with a real action effect; claiming loot spends no exploration beat');
  room = await act(pair, 'dye-vat', 'vat-haul-after-fight');
  assert.equal(room.status, 'completed'); assert.equal(room.questRun.ending.id, 'isolate'); assert.equal(room.outcomes.length, 3);
  assert.match(room.questRun.ending.text, /clean water|clean.*again/i); assert.match(room.questRun.ending.text, /displaced|shelter/i);
  await layout(a, 'ending');
  const completed = structuredClone(room.questRun); await a.reload({ waitUntil: 'domcontentloaded' }); await settled(a); assert.deepEqual((await state(a)).room.questRun, completed);
  await a.getByRole('button', { name: /Read our trail/ }).click(); assert.match(await a.locator('.qr-trail').innerText(), /stained|dye/i); assert.match(await a.locator('.qr-trail').innerText(), /shelter|displaced/i); await layout(a, 'trail', true);
  note('Winning the encounter does not solve the water; the final chosen action names its cost and persistent changed ending');
}


async function motionJourney() {
  const page = await open('motion');
  const initial = await state(page);
  assert.notEqual(initial.room.code, (await state(pages[0])).room.code, 'Motion probe starts in a fresh real room after the completed journey.');
  assert.equal(initial.room.questRun.nodeId, 'well-yard');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.locator('.qr-adventure:not(.is-quiet)').waitFor();
  await prepare(page, 'well', 'well-inspect');
  assert.equal(await page.locator('[data-frame-atlas]').count(), 0, 'Preparing a discovery does not play its outcome.');
  await release(page);
  const frame = page.locator('.qr-discovery.is-ready[data-frame-atlas="discovery"]');
  await frame.waitFor();
  const observed = await frame.evaluate(node => {
    const cells = node.querySelector('.di-frame-cells'), style = getComputedStyle(cells);
    return { state: node.dataset.frameState, background: style.backgroundImage, position: style.backgroundPosition, timing: style.animationTimingFunction };
  });
  assert.ok(['playing', 'finished'].includes(observed.state), JSON.stringify(observed));
  assert.match(observed.background, /flipbook-discovery\.webp/);
  if (observed.state === 'playing') assert.match(observed.timing, /steps\(1(?:, end)?\)/);
  await page.locator('.qr-discovery[data-frame-state="finished"]').waitFor({ timeout: 2000 });
  const finalPosition = await frame.locator('.di-frame-cells').evaluate(node => getComputedStyle(node).backgroundPosition);
  assert.equal(finalPosition, '100% 100%');
  await page.screenshot({ path: 'output/playwright/quest-motion-discovery.png' });
  note('A fresh confirmed well discovery decodes its real painted atlas and finishes its discrete eight-frame animation', { observedState: observed.state, firstPosition: observed.position, finalPosition });

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.locator('.qr-adventure.is-quiet').waitFor();
  assert.equal(await page.locator('[data-frame-atlas]').count(), 0);
  const receipt = page.locator('[data-quest-discovery]');
  await receipt.waitFor(); assert.match(await receipt.innerText(), /stain|cloth/i);
  assert.ok((await state(page)).room.questRun.items.includes('stained-cloth'));
  await page.screenshot({ path: 'output/playwright/quest-motion-reduced.png' });
  note('Changing reduced motion live removes the animated atlas while preserving the confirmed discovery receipt and shared item');

  const room = await advance([page]);
  assert.equal(room.phase, 'choosing');
  const confirmed = structuredClone(room.questRun);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.locator('.qr-adventure:not(.is-quiet)').waitFor();
  await sync(page); await sync(page);
  assert.equal(await page.locator('[data-frame-atlas]').count(), 0, 'Aged discovery does not replay on ordinary reads or motion restoration.');
  assert.deepEqual((await state(page)).room.questRun, confirmed);
  assert.match(await page.locator('[data-quest-result]').innerText(), /cloth|stain|dye/i);
  note('After the real reveal boundary, repeated reads and restoring motion keep the consequence without replaying an old one-shot');
}

try {
  await mkdir('output/playwright', { recursive: true }); sourceFingerprint = await fingerprint();
  ssr = await createServer({ configFile: false, cacheDir: 'node_modules/.vite-quest-run-tests', optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  const { createDropinnHandler } = await ssr.ssrLoadModule('/server/dropinn.ts');
  ({ questCombatMoves } = await ssr.ssrLoadModule('/src/lib/dropinn/questRun.ts'));
  handler = createDropinnHandler({ local: true, env: {}, now: () => now, fetch: async () => { throw Error('No external inference in Quest Run QA.'); } });
  browser = await chromium.launch({ headless: true }); await journey(); await motionJourney();
  assert.equal(await fingerprint(), sourceFingerprint, 'Source or art changed during the run; recapture the final version.'); assert.deepEqual(errors, []);
} catch (error) {
  errors.push({ message: error.stack ?? String(error) }); process.exitCode = 1;
  for (let i = 0; i < pages.length; i++) await pages[i].screenshot({ path: `output/playwright/quest-failure-${i}.png`, fullPage: true }).catch(() => {});
} finally {
  await writeFile('output/playwright/quest-results.json', JSON.stringify({ backend: 'isolated local handler', clock: 'controlled authoritative and client clock; no gameplay state injection', sourceFingerprint, checks, errors, commands: records.map(r => ({ page: r.page, operation: r.operation, status: r.status, id: r.command?.id, type: r.command?.type, action: r.command?.questAction })) }, null, 2));
  for (const context of contexts) await context.close().catch(() => {});
  await browser?.close(); await ssr?.close(); console.log(JSON.stringify({ checks: checks.length, errors }));
}
