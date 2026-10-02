import { chromium } from 'playwright';
import { createServer } from 'vite';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// Controlled reducer-backed browser fixtures. The maintained scene runner separately
// verifies the production local handler across admission, chapters, and recovery.
process.chdir(fileURLToPath(new URL('../', import.meta.url)));
const base = new URL(process.argv[2] ?? 'http://127.0.0.1:5201');
assert.ok(base.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(base.hostname));
assert.ok(!base.username && !base.password && base.pathname === '/' && !base.search && !base.hash);
await mkdir('output/playwright', { recursive: true });
const checks = [], errors = [];
let ssr, browser, page, fixtureRoom, reduceAdventure, initial, selfId, fixtureNumber = 0;
const note = name => { checks.push(name); console.log(name); };
try {
  ssr = await createServer({ configFile: false, cacheDir: 'node_modules/.vite-river-tests', optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'error' });
  ({ reduceAdventure } = await ssr.ssrLoadModule('/src/lib/dropinn/engine.ts'));
  const { createDropinnHandler } = await ssr.ssrLoadModule('/server/dropinn.ts');
  const handler = createDropinnHandler({ local: true, env: {}, fetch: async () => { throw new Error('External calls disabled'); } });
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    return ['http:', 'https:'].includes(url.protocol) && url.origin !== base.origin ? route.abort('blockedbyclient') : route.fallback();
  });
  await page.route('**/api/dropinn', async route => {
    const body = route.request().postDataJSON();
    if (fixtureRoom && body.roomCode === fixtureRoom.code && ['read', 'command'].includes(body.operation)) {
      try {
        if (body.command) fixtureRoom = reduceAdventure(fixtureRoom, { ...body.command, userId: body.sessionId }, Date.now());
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ backend: 'local', room: fixtureRoom, messages: [] }) });
      } catch (error) { return route.fulfill({ status: 422, contentType: 'application/json', body: JSON.stringify({ error: error.message }) }); }
    }
    const response = await handler(new Request(`${base.origin}/api/dropinn`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }));
    return route.fulfill({ status: response.status, contentType: 'application/json', body: await response.text() });
  });
  await page.goto(`${base.origin}/?session=riverfocusedqa`);
  await page.getByRole('button', { name: 'Play with friends', exact: true }).click();
  await page.getByRole('button', { name: 'Start a friend table', exact: true }).click();
  await page.getByRole('main', { name: 'Adventure table' }).waitFor();
  await page.evaluate(async () => { window.__riverStore = (await import('/src/store/adventureStore.ts')).useAdventureStore; });
  await page.waitForFunction(() => !!window.__riverStore.getState().room && !window.__riverStore.getState().loading);
  ({ room: initial, userId: selfId } = await page.evaluate(() => { const { room, userId } = window.__riverStore.getState(); return { room, userId }; }));
  assert.equal(initial.adventureVersion, 4);

  async function fixture(status = 'drifting', success = true, chapterRound = 1) {
    fixtureRoom = structuredClone(initial);
    Object.assign(fixtureRoom, { chapter: 1, chapterRound, turn: 100 + ++fixtureNumber, phase: 'choosing', status: 'active',
      deadline: Date.now() + 60000, revealUntil: null, events: [], outcomes: [], flags: [], combinations: [], commits: {},
      progress: 0, danger: 0, riverSupplies: { status }, updatedAt: Date.now() });
    const self = fixtureRoom.seats.find(seat => seat.actorId === selfId);
    self.character.traits = Object.fromEntries(['ATH', 'ING', 'CHA', 'INT'].map(key => [key, success ? 100 : -100]));
    self.hp = self.character.maxHp = 100;
    fixtureRoom.enemyIntent = { turn: fixtureRoom.turn, sourceId: 'pack', targetActorId: selfId, baseDamage: 3, duelModifier: 3 };
    fixtureRoom.players[selfId].spotlightChapters = [];
    await page.evaluate(room => window.__riverStore.setState({ room, pendingMove: null, loading: false, error: null, syncRoom: async () => {} }), fixtureRoom);
    await page.waitForFunction(turn => window.__riverStore.getState().room.turn === turn, fixtureRoom.turn);
    await page.getByRole('group', { name: 'Action tokens', exact: true }).waitFor();
  }
  async function select(token, target) {
    const labels = { assist: 'Help', investigate: 'Investigate', fight: 'Fight' };
    await page.getByRole('button', { name: `${labels[token]} token`, exact: true }).click();
    await page.locator(`[data-scene-target="${target}"][data-target-kind=scene]`).click();
    await page.locator('.di-scene-dock[data-river-move=true] .di-scene-selection').waitFor();
  }
  async function layout(label) {
    for (const viewport of [{ width: 390, height: 844 }, { width: 320, height: 568 }, { width: 1280, height: 800 }]) {
      await page.setViewportSize(viewport);
      await page.screenshot({ path: `output/playwright/river-${label}-${viewport.width}.png`, animations: 'disabled' });
      const geometry = await page.evaluate(() => {
        const rect = selector => document.querySelector(selector)?.getBoundingClientRect().toJSON();
        return { width: innerWidth, height: innerHeight, scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight,
          selection: rect('.di-scene-selection'), copy: rect('.di-scene-selection>div>span'), controls: rect('.di-focus-control'),
          party: rect('.di-stage-party'),
          targets: [...document.querySelectorAll('.di-stage-targets [data-scene-target]')].map(node => node.getBoundingClientRect().toJSON()) };
      });
      assert.ok(geometry.scrollWidth <= geometry.width && geometry.scrollHeight <= geometry.height + 1, `overflow: ${JSON.stringify(geometry)}`);
      assert.equal(geometry.targets.length, 4);
      assert.ok(geometry.targets.every(rect => rect.width >= 44 && rect.height >= 44), 'scene targets remain usable');
      if (viewport.width < 760) assert.ok(geometry.targets.every(rect => rect.bottom <= geometry.party.top + 1), `phone targets overlap heroes: ${JSON.stringify(geometry)}`);
      assert.ok(geometry.copy.bottom <= geometry.controls.top + 1, `stakes overlap release: ${JSON.stringify(geometry)}`);
      assert.ok(geometry.controls.bottom <= geometry.height, 'commitment remains reachable');
      note(`${label}-${viewport.width}`);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('.di-scene-selection>div>span').evaluate(node => { node.style.fontSize = '16px'; });
    const enlarged = await page.evaluate(() => ({ bottom: document.querySelector('.di-scene-selection>div>span').getBoundingClientRect().bottom,
      controls: document.querySelector('.di-focus-control').getBoundingClientRect().top,
      height: innerHeight, scrollHeight: document.documentElement.scrollHeight }));
    assert.ok(enlarged.bottom <= enlarged.controls + 1 && enlarged.scrollHeight <= enlarged.height + 1, 'enlarged stakes remain visible above commitment');
    await page.screenshot({ path: `output/playwright/river-${label}-enlarged-390.png`, animations: 'disabled' });
    await page.locator('.di-scene-selection>div>span').evaluate(node => { node.style.fontSize = ''; });
    note(`${label}-enlarged-text-390`);
  }
  async function commit(name, expected) {
    const response = page.waitForResponse(response => response.url().endsWith('/api/dropinn') && response.request().postDataJSON()?.command?.type === 'act');
    await page.getByRole('button', { name, exact: true }).click();
    assert.equal((await response).status(), 200);
    await page.waitForFunction(status => window.__riverStore.getState().room.riverSupplies.status === status, expected);
  }

  await fixture(); await select('assist', 'boat');
  assert.match(await page.locator('.di-scene-selection').textContent(), /Guaranteed.*\+3/);
  assert.doesNotMatch(await page.locator('.di-focus-status').textContent(), /\+1/);
  await layout('safe');
  await commit('Commit now', 'secured');
  assert.equal(fixtureRoom.events.find(event => event.contribution).roll, undefined);
  note('safe-commit-without-fabricated-roll-or-bonus');

  await fixture('drifting', false); await select('fight', 'boat');
  await layout('rush');
  await commit('Roll now', 'spilled');
  await page.locator('[data-scene-target=reeds] .di-river-cargo[data-status=spilled]').waitFor();
  assert.equal(await page.getByRole('dialog', { name: 'Round story', exact: true }).isVisible(), false, 'spill reaches scene before automatic history');
  await page.screenshot({ path: 'output/playwright/river-confirmed-spill-390.png' });
  note('failed-rush-shows-cargo-in-reeds-before-history');

  await fixture('spilled'); await select('investigate', 'reeds');
  assert.equal(await page.getByRole('group', { name: 'Choose an approach' }).count(), 0);
  await layout('recover');
  await commit('Roll now', 'secured');
  assert.equal(fixtureRoom.events.find(event => event.contribution).result.progress, 2);
  note('recovery-uses-advertised-payout-without-study-or-trail');

  await fixture('spilled', false); await select('assist', 'boat');
  await layout('salvage');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await commit('Commit now', 'salvaged');
  assert.equal(fixtureRoom.events.find(event => event.contribution).roll, undefined);
  await page.getByRole('button', { name: 'View scene', exact: true }).click();
  await page.locator('.di-river-tag[data-status=salvaged]').waitFor();
  await page.screenshot({ path: 'output/playwright/river-salvaged-reduced-390.png' });
  note('partial-salvage-and-reduced-motion');

  await fixture('drifting', false, 3); await select('fight', 'boat');
  await layout('last-chance');
  assert.match(await page.locator('.di-scene-selection').textContent(), /Last chance: unsaved cargo/);
  await commit('Roll now', 'lost');
  note('last-chance-miss-loses-cargo-without-promising-recovery');

  await fixture('lost');
  await page.reload();
  await page.getByRole('main', { name: 'Adventure table' }).waitFor();
  await page.locator('.di-river-tag[data-status=lost]').waitFor();
  assert.equal(await page.locator('.di-stage-targets [data-scene-target]').count(), 4);
  await page.screenshot({ path: 'output/playwright/river-lost-reload-390.png' });
  note('lost-cargo-survives-browser-reload');
  assert.deepEqual(errors, []);
} catch (error) {
  console.error(error.stack); process.exitCode = 1;
  await page?.screenshot({ path: 'output/playwright/river-failure.png' }).catch(() => {});
} finally {
  await writeFile('output/playwright/river-results.json', JSON.stringify({ evidence: 'Reducer-backed controlled browser fixtures; actual local-handler multiplayer is covered separately by test:scene.', checks, errors, passed: !process.exitCode }, null, 2));
  await browser?.close(); await ssr?.close();
}
