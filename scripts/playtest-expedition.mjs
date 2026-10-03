import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { createServer } from 'vite';

// Real local command service and independent browser identities. No injected
// room snapshots, external inference, hosted accounts, or production writes.
const origin = new URL(process.argv[2] ?? 'http://127.0.0.1:5203');
assert.ok(origin.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(origin.hostname)
  && origin.pathname === '/' && !origin.search && !origin.hash && !origin.username && !origin.password);
const base = origin.origin;
await mkdir('output/playwright', { recursive: true });
const checks = [], errors = [], commands = [], contexts = [], pages = [];
let browser, ssr, handler, offset = 0;
const note = (name, detail = {}) => { checks.push({ name, ...detail }); console.log(name); };
const clock = () => Date.now() + offset;

async function bindStore(page) {
  await page.evaluate(async () => {
    // Vite can reload this dependency while a UI change is being verified.
    // Read the exact module already loaded by the browser, rather than creating
    // a second Zustand singleton through an unversioned dynamic import.
    const loaded = performance.getEntriesByType('resource').map(entry => new URL(entry.name))
      .filter(url => url.origin === location.origin && url.pathname === '/src/store/adventureStore.ts')
      .sort((a, b) => Number(b.searchParams.get('t') ?? 0) - Number(a.searchParams.get('t') ?? 0));
    window.__expeditionStore = (await import(loaded[0]?.href ?? '/src/store/adventureStore.ts')).useAdventureStore;
  });
}
async function state(page) {
  await bindStore(page);
  return page.evaluate(() => {
    const store = window.__expeditionStore.getState();
    return { room: store.room, userId: store.userId, loading: store.loading, error: store.error, pendingMove: store.pendingMove };
  });
}
async function sync(page) {
  await bindStore(page);
  await page.evaluate(async () => window.__expeditionStore.getState().syncRoom());
}
async function settled(page) {
  await bindStore(page);
  await page.waitForFunction(() => !window.__expeditionStore.getState().loading && !!window.__expeditionStore.getState().room);
}
async function openPage(label) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, reducedMotion: 'reduce' });
  contexts.push(context);
  await context.addInitScript(() => {
    const realNow = Date.now.bind(Date);
    window.__expeditionOffset = Number(localStorage.getItem('expedition-qa-offset') ?? 0);
    Date.now = () => realNow() + window.__expeditionOffset;
  });
  const page = await context.newPage(); pages.push(page);
  page.on('pageerror', error => errors.push({ page: label, message: error.message }));
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    return ['http:', 'https:'].includes(url.protocol) && url.origin !== base ? route.abort('blockedbyclient') : route.fallback();
  });
  await page.route('**/api/dropinn', async route => {
    const payload = route.request().postDataJSON();
    const response = await handler(new Request(`${base}/api/dropinn`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    }));
    const body = await response.text();
    if (payload.command?.type === 'act') commands.push({ page: label, command: payload.command,
      status: response.status, response: JSON.parse(body) });
    return route.fulfill({ status: response.status, contentType: 'application/json', body });
  });
  await page.goto(`${base}/?session=expeditionqa${label}`);
  await page.locator('.di-lobby-play').waitFor();
  assert.match(await page.locator('.di-lobby-play').innerText(), /Gemward/);
  return page;
}
async function viewScene(page) {
  const button = page.getByRole('button', { name: 'View scene', exact: true });
  if (await button.isVisible()) await button.click();
}
async function select(page, targetId, token = 'investigate', locationId = 'shop') {
  await viewScene(page);
  const location = page.locator(`[data-expedition-location="${locationId}"]`);
  if (await location.count() && await location.isVisible() && await location.isEnabled()) await location.click();
  const before = commands.length;
  await page.locator(`[data-expedition-target="${targetId}"]`).click();
  await page.locator(`[data-token="${token}"]`).click();
  assert.equal(commands.length, before, 'Inspection and token selection never commit.');
}
async function routeVote(page, label) {
  const before = commands.length;
  await page.getByRole('button', { name: 'Map & clues', exact: true }).click();
  const route = page.locator('.exp-route-list button').filter({ hasText: label });
  assert.equal(await route.count(), 1);
  assert.ok(await route.isEnabled(), `${label} has been opened by the party's actual clues.`);
  await route.click();
  assert.equal(commands.length, before, 'The map only attaches a preference; it never commits a turn.');
}
async function useConsumable(page, kind, label) {
  const before = commands.length;
  const snapshot = await state(page);
  const item = snapshot.room.expedition.stashes[snapshot.userId].find(item => item.kind === kind);
  assert.ok(item, `${label} was earned through play.`);
  await page.locator('.exp-tools button').filter({ hasText: /^Stash/ }).click();
  const choice = page.locator('.exp-stash-slots button').filter({ hasText: label });
  assert.equal(await choice.count(), 1);
  assert.ok(await choice.isEnabled());
  await choice.click();
  await page.getByRole('button', { name: /Back to my move/ }).click();
  assert.equal(commands.length, before, 'Stash selection only prepares a consumable.');
  return item.id;
}
async function sameExpedition(a, b) {
  await sync(a); await sync(b);
  const first = await state(a), second = await state(b);
  assert.equal(first.room.revision, second.room.revision);
  assert.deepEqual(first.room.expedition, second.room.expedition);
  return first.room;
}
async function prepareSpotlight(page) {
  await viewScene(page);
  const before = commands.length;
  await page.getByRole('button', { name: 'Create a Spotlight idea', exact: true }).click();
  const response = page.waitForResponse(response => response.url() === `${base}/api/dropinn`
    && response.request().postDataJSON()?.operation === 'propose');
  await page.locator('.exp-spotlight .exp-dialog-topics button').first().click();
  const preview = await response;
  assert.equal(preview.status(), 200);
  const { proposal } = await preview.json();
  assert.ok(proposal.supported);
  await page.getByRole('button', { name: 'Ready this Spotlight', exact: true }).click();
  assert.equal(commands.length, before, 'A signed Spotlight preview never commits or spends its token.');
  return proposal.id;
}
async function commit(page) {
  const response = page.waitForResponse(response => response.url() === `${base}/api/dropinn`
    && response.request().postDataJSON()?.command?.type === 'act');
  await page.getByRole('button', { name: /^(Roll|Commit) now$/ }).click();
  const received = await response;
  assert.equal(received.status(), 200, await received.text());
  await settled(page);
  return commands.at(-1);
}
async function advance() {
  const room = (await state(pages[0])).room;
  assert.equal(room.phase, 'reveal');
  offset = Math.max(offset, room.revealUntil + 1 - Date.now());
  for (const page of pages) await page.evaluate(value => {
    window.__expeditionOffset = value; localStorage.setItem('expedition-qa-offset', String(value));
  }, offset);
  for (const page of pages) await sync(page);
  for (const page of pages) await settled(page);
}
async function layout(page, name) {
  await viewScene(page);
  for (const [width, height] of [[390, 844], [320, 568], [1280, 900]]) {
    await page.setViewportSize({ width, height });
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const sizes = await page.evaluate(() => ({
      width: innerWidth, height: innerHeight, scrollWidth: document.documentElement.scrollWidth,
      scrollHeight: document.documentElement.scrollHeight,
      targets: [...document.querySelectorAll('[data-expedition-target]')].map(node => node.getBoundingClientRect().toJSON()),
      tokens: [...document.querySelectorAll('[data-token]')].filter(node => node.getClientRects().length).map(node => node.getBoundingClientRect().toJSON()),
      labels: [...document.querySelectorAll('.exp-target-name')].filter(node => node.getClientRects().length).map(node => node.getBoundingClientRect().toJSON()),
      release: [...document.querySelectorAll('.di-focus-hold, .di-focus-roll-now')].filter(node => node.getClientRects().length).map(node => node.getBoundingClientRect().toJSON()),
      caption: document.querySelector('.exp-location-caption')?.getClientRects().length ? document.querySelector('.exp-location-caption').getBoundingClientRect().toJSON() : null,
    }));
    assert.ok(sizes.scrollWidth <= width + 1, `${name}/${width}: horizontal overflow`);
    assert.equal(sizes.tokens.length, 4, `${name}: all four tokens stay visible`);
    for (const rect of [...sizes.targets, ...sizes.tokens, ...sizes.release]) {
      assert.ok(rect.width >= 43 && rect.height >= 43, `${name}/${width}: small interaction target`);
      assert.ok(rect.top >= 0 && rect.bottom <= height + 1, `${name}/${width}: target outside viewport`);
    }
    if (name === 'battle-prepared') assert.equal(sizes.release.length, 2, 'Both equivalent release controls remain on the table.');
    if (sizes.caption) for (const label of sizes.labels) assert.ok(label.bottom <= sizes.caption.top + 1 || label.top >= sizes.caption.bottom - 1,
      `${name}/${width}: scene caption overlaps a move or target label`);
    await page.screenshot({ path: `output/playwright/expedition-${name}-${width}.png`, animations: 'disabled' });
    note(`${name} layout ${width}×${height}`, { targets: sizes.targets.length, scrollHeight: sizes.scrollHeight });
  }
  await page.setViewportSize({ width: 390, height: 844 });
}

try {
  ssr = await createServer({ configFile: false, cacheDir: 'node_modules/.vite-expedition-tests',
    optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, ws: false, watch: null },
    appType: 'custom', logLevel: 'error' });
  const { createDropinnHandler } = await ssr.ssrLoadModule('/server/dropinn.ts');
  const { expeditionScene } = await ssr.ssrLoadModule('/src/lib/dropinn/expedition.ts');
  handler = createDropinnHandler({ local: true, env: {}, now: clock,
    fetch: async () => { throw new Error('External inference disabled in local expedition QA.'); } });
  browser = await chromium.launch({ headless: true });
  const a = await openPage('a');
  await a.locator('.di-lobby-play').click(); await settled(a);
  assert.equal((await state(a)).room.adventureId, 'gemward');
  await layout(a, 'town');
  const b = await openPage('b');
  await b.locator('.di-lobby-play').click(); await settled(b);
  assert.equal((await state(b)).room.code, (await state(a)).room.code);
  let room = (await state(a)).room;
  const target = expeditionScene(room, 'shop').targets.find(item => item.tokens.includes('investigate'));
  await select(a, target.id); await commit(a); await advance();
  room = (await state(a)).room;
  assert.equal(room.seats.filter(seat => seat.kind === 'human').length, 2);
  note('Gemward is the default; second player enters at the next turn boundary');
  const secondTarget = expeditionScene(room, 'docks').targets.find(item => item.tokens.includes('assist'));
  await select(a, target.id); await commit(a);
  await sync(b);
  assert.equal((await state(b)).room.phase, 'choosing');
  await select(b, secondTarget.id, 'assist', 'docks'); await commit(b); await sync(a);
  const shared = (await state(a)).room;
  assert.equal(shared.phase, 'reveal');
  assert.deepEqual(shared.expedition, (await state(b)).room.expedition);
  note('Independent town actions resolve together into the same shared expedition');
  await a.reload(); await settled(a);
  assert.deepEqual((await state(a)).room.expedition, shared.expedition);
  note('Reload restores variant, quest pouch, stash, and confirmed actions');
  await advance();
  await layout(a, 'discovered');

  // Both players keep their ordinary moves. A's explicit route vote travels
  // alongside a real NPC gift, and B earns dust for the coming search.
  await select(a, 'iris', 'assist');
  await routeVote(a, 'Warehouse');
  await commit(a); await sync(b);
  assert.equal((await state(b)).room.phase, 'choosing');
  assert.equal((await state(b)).room.expedition.pendingRouteId, undefined);
  await select(b, 'nella', 'assist'); await commit(b);
  room = await sameExpedition(a, b);
  assert.equal(room.chapter, 0);
  assert.equal(room.expedition.pendingRouteId, 'warehouse');
  assert.equal(room.expedition.battle, undefined);
  note('An unlocked map route attaches to an ordinary action; both NPC turns finish before travel');
  await advance();
  room = (await state(a)).room;
  assert.equal(room.chapter, 1); assert.equal(room.expedition.locationId, 'warehouse');

  await select(a, 'crate', 'investigate', 'warehouse'); await commit(a);
  await sync(b);
  assert.equal((await state(b)).room.expedition.battle, undefined);
  await select(b, 'ramp', 'assist', 'warehouse');
  const dustId = await useConsumable(b, 'dust', 'Spark dust');
  const dustMove = await commit(b);
  assert.equal(dustMove.command.action.expedition.consumableId, dustId);
  room = await sameExpedition(a, b);
  const bUser = (await state(b)).userId;
  assert.ok(room.expedition.questItems.includes('buyer-evidence'));
  assert.equal(room.expedition.battle, undefined, 'New evidence cannot interrupt its own exploration batch.');
  assert.ok(!room.expedition.stashes[bUser].some(item => item.id === dustId));
  const dustResult = room.events.find(event => event.turn === room.turn && event.actorId === bUser && event.result?.expedition?.consumed === 'dust');
  assert.equal(dustResult.result.progress, 1, 'Dust doubles this player’s half-point share.');
  note('Earned Spark dust is spent once with a real move; warehouse evidence changes the next turn');
  await advance();

  await select(a, 'ramp', 'assist', 'warehouse'); await commit(a); await sync(b);
  const beforeBattle = (await state(b)).room;
  assert.equal(beforeBattle.phase, 'choosing');
  assert.equal(beforeBattle.expedition.battle, undefined, 'One player cannot interrupt the other’s accepted exploration opportunity.');
  await select(b, 'crate', 'fight', 'warehouse'); await commit(b);
  room = await sameExpedition(a, b);
  assert.equal(room.expedition.battle.status, 'queued');
  assert.equal(room.events.filter(event => event.turn === room.turn && event.kind === 'action' && event.contribution).length, 2);
  await advance();
  room = (await state(a)).room;
  assert.equal(room.expedition.battle.status, 'active');
  assert.ok(room.enemyIntent?.targetActorId);
  await a.locator('.exp-combat').waitFor();
  note('Battle interrupts only after every exploration action resolves and announces a shared threat');
  await layout(a, 'battle');

  let exchanges = 0;
  while ((await state(a)).room.expedition.battle?.status === 'active') {
    room = (await state(a)).room;
    const counter = { strike: 'investigate', trick: 'fight', guard: 'influence' }[room.expedition.battle.stance];
    await select(a, `combat-${counter}`, counter, 'warehouse');
    if (exchanges === 0) await layout(a, 'battle-prepared');
    await commit(a); await sync(b);
    assert.equal((await state(b)).room.phase, 'choosing');
    await select(b, `combat-${counter}`, counter, 'warehouse');
    let smokeId;
    if (exchanges === 0) smokeId = await useConsumable(b, 'smoke', 'Smoke flask');
    const battleMove = await commit(b);
    room = await sameExpedition(a, b);
    if (smokeId) {
      assert.equal(battleMove.command.action.expedition.consumableId, smokeId);
      assert.ok(!room.expedition.stashes[bUser].some(item => item.id === smokeId));
      assert.ok(room.events.some(event => event.turn === room.turn && event.result?.expedition?.consumed === 'smoke'));
    }
    assert.ok(++exchanges <= 4);
    if (room.expedition.battle.status !== 'active') {
      assert.ok(['won', 'escaped'].includes(room.expedition.battle.status));
      assert.ok(room.expedition.questItems.includes('recovered-prism'));
      await viewScene(a);
      assert.ok(await a.locator('.exp-combat').isVisible(), 'The finished encounter stays visible during its consequence reveal.');
    }
    await advance();
  }
  assert.ok(exchanges >= 2);
  room = await sameExpedition(a, b);
  assert.equal(room.chapter, 1);
  assert.equal(room.expedition.locationId, 'warehouse');
  assert.equal(room.expedition.battle, undefined);
  assert.equal(await a.locator('.exp-combat').count(), 0);
  note('A shared 2–4 round fight spends Smoke once, awards loot, and resumes the same exploration location', { exchanges });

  const signedProposalId = await prepareSpotlight(a);
  const creativeMove = await commit(a);
  assert.equal(creativeMove.command.action.token, 'spotlight');
  assert.equal(creativeMove.command.action.proposal.id, signedProposalId);
  await sync(b);
  await select(b, 'ramp', 'assist', 'warehouse'); await commit(b); await sameExpedition(a, b);
  assert.ok((await state(a)).room.players[(await state(a)).userId].spotlightChapters.includes(1));
  note('An authored Spotlight is signed, prepared without spending, and committed through the release controls');
  await advance();
  room = (await state(a)).room;
  assert.equal(room.chapter, 2); assert.equal(room.expedition.locationId, 'beacon');
  assert.match(room.outcomes[1].text, /Restor|restor/);
  await select(a, 'beacon', 'assist', 'beacon');
  assert.match(await a.locator('.exp-action-summary').innerText(), /permanent|proof|bound|absorbs/);
  await commit(a); await sync(b);
  await select(b, 'keeper', 'assist', 'beacon'); await commit(b);
  room = await sameExpedition(a, b);
  assert.equal(room.expedition.finaleChoice, 'restore');
  assert.ok(!room.expedition.questItems.includes('recovered-prism'));
  await advance();
  await select(a, 'cradle', 'assist', 'beacon'); await commit(a); await sync(b);
  await select(b, 'town', 'assist', 'beacon'); await commit(b);
  room = await sameExpedition(a, b);
  assert.equal(room.status, 'completed');
  assert.equal(room.outcomes.length, 3);
  for (const userId of [(await state(a)).userId, bUser]) {
    assert.equal(room.players[userId].keepsakes.length, 3);
    assert.ok(room.expedition.stashes[userId].length <= 3);
  }
  assert.match(room.outcomes[2].text, /beacon shines|beacon.*shines|beacon’s light/);
  await viewScene(a);
  await a.screenshot({ path: 'output/playwright/expedition-completed-390.png', animations: 'disabled' });
  note('Both players complete three chapters and receive the recorded ending, costs, and keepsakes');
  assert.deepEqual(errors, []);
} catch (error) {
  errors.push({ message: error.stack ?? String(error) });
  if (pages[0]) await pages[0].screenshot({ path: 'output/playwright/expedition-failure.png', fullPage: true }).catch(() => {});
  process.exitCode = 1;
} finally {
  await writeFile('output/playwright/expedition-results.json', JSON.stringify({ backend: 'isolated local handler',
    checks, errors, actions: commands.map(({ page, status, command }) => ({ page, status, id: command.id, action: command.action })) }, null, 2));
  for (const context of contexts) await context.close().catch(() => {});
  await browser?.close(); await ssr?.close();
  console.log(JSON.stringify({ checks: checks.length, errors }));
}
