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
const cooperationOnly = process.env.CHOICE_COOP_ONLY === '1';
let ssr, browser, page, fixtureRoom, reduceAdventure, initial, selfId, fixtureNumber = 0, stories;
const note = name => { checks.push(name); console.log(name); };
try {
  ssr = await createServer({ configFile: false, cacheDir: 'node_modules/.vite-chapter-choice-tests', optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'error' });
  ({ reduceAdventure } = await ssr.ssrLoadModule('/src/lib/dropinn/engine.ts'));
  ({ ADVENTURES: stories } = await ssr.ssrLoadModule('/src/lib/dropinn/registry.ts'));
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
  await page.goto(`${base.origin}/?session=choicesfocusedqa`);
  await page.getByRole('button', { name: 'Play with friends', exact: true }).click();
  await page.getByRole('button', { name: 'Start a friend table', exact: true }).click();
  await page.getByRole('main', { name: 'Adventure table' }).waitFor();
  await page.evaluate(async () => { window.__riverStore = (await import('/src/store/adventureStore.ts')).useAdventureStore; });
  await page.waitForFunction(() => !!window.__riverStore.getState().room && !window.__riverStore.getState().loading);
  ({ room: initial, userId: selfId } = await page.evaluate(() => { const { room, userId } = window.__riverStore.getState(); return { room, userId }; }));
  assert.equal(initial.adventureVersion, 4);

  async function fixture(story, chapter, state = { phase: 'open', level: 0, uses: 0 }, success = true, chapterRound = 1) {
    fixtureRoom = structuredClone(initial);
    const definition = story.chapters[chapter];
    Object.assign(fixtureRoom, { adventureId: story.id, adventureVersion: story.version, title: story.title, chapter, chapterRound,
      turn: 100 + ++fixtureNumber, phase: 'choosing', status: 'active', deadline: Date.now() + 60000, revealUntil: null,
      events: [], outcomes: [], flags: [], combinations: [], commits: {}, progress: 0, danger: 0, updatedAt: Date.now(),
      chapterChoices: { [definition.choice.id]: state }, storyBranch: definition.branch?.fallback });
    delete fixtureRoom.riverSupplies;
    const self = fixtureRoom.seats.find(seat => seat.actorId === selfId);
    self.character.traits = Object.fromEntries(['ATH', 'ING', 'CHA', 'INT'].map(key => [key, success ? 100 : -100]));
    self.hp = self.character.maxHp = 100;
    if (definition.combat) fixtureRoom.enemyIntent = { turn: fixtureRoom.turn, sourceId: definition.enemySource ?? definition.targets[0].id, targetActorId: selfId, baseDamage: 3, duelModifier: 3 };
    else delete fixtureRoom.enemyIntent;
    fixtureRoom.players[selfId].spotlightChapters = [];
    await page.evaluate(room => window.__riverStore.setState({ room, pendingMove: null, loading: false, error: null, syncRoom: async () => {} }), fixtureRoom);
    await page.waitForFunction(turn => window.__riverStore.getState().room.turn === turn, fixtureRoom.turn);
    await page.getByRole('group', { name: 'Action tokens', exact: true }).waitFor();
  }
  async function select(token, target) {
    const labels = { assist: 'Help', investigate: 'Investigate', fight: 'Fight', influence: 'Influence' };
    await page.getByRole('button', { name: `${labels[token]} token`, exact: true }).click();
    await page.locator(`[data-scene-target="${target}"][data-target-kind=scene]`).click();
    await page.locator('.di-scene-dock[data-special-move=true] .di-scene-selection').waitFor();
  }
  async function layout(label) {
    for (const viewport of [{ width: 390, height: 844 }, { width: 320, height: 568 }, { width: 1280, height: 800 }]) {
      await page.setViewportSize(viewport);
      await page.screenshot({ path: `output/playwright/choice-${label}-${viewport.width}.png`, animations: 'disabled' });
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
    await page.screenshot({ path: `output/playwright/choice-${label}-enlarged-390.png`, animations: 'disabled' });
    await page.locator('.di-scene-selection>div>span').evaluate(node => { node.style.fontSize = ''; });
    note(`${label}-enlarged-text-390`);
  }
  async function commit(guaranteed, definition, phase, level) {
    const response = page.waitForResponse(response => response.url().endsWith('/api/dropinn') && response.request().postDataJSON()?.command?.type === 'act');
    await page.getByRole('button', { name: guaranteed ? 'Commit now' : 'Roll now', exact: true }).click();
    assert.equal((await response).status(), 200);
    await page.waitForFunction(() => window.__riverStore.getState().room.phase === 'reveal');
    assert.equal(fixtureRoom.chapterChoices[definition.id].phase, phase);
    assert.equal(fixtureRoom.chapterChoices[definition.id].level, level);
    const own = fixtureRoom.events.find(event => event.actorId === selfId && event.contribution);
    assert.equal(own.roll === undefined, guaranteed);
    await page.locator(`.di-choice-marker[data-phase=${phase}][data-level="${level}"]`).waitFor();
  }
  const examples = new Map();
  for (const story of stories) for (let chapter = 0; chapter < story.chapters.length; chapter++) {
    const definition = story.chapters[chapter].choice;
    if (!definition) continue;
    examples.set(definition.mode, examples.get(definition.mode) ?? { story, chapter, definition });
    if (cooperationOnly) continue;
    await fixture(story, chapter);
    const guaranteed = definition.mode !== 'press';
    await select(guaranteed ? 'assist' : definition.riskToken, definition.primaryId);
    await layout(definition.id);
    await commit(guaranteed, definition, definition.mode === 'prepare' ? 'ready' : definition.mode === 'rescue' ? 'settled' : 'open', definition.mode === 'rescue' ? 2 : 1);
    assert.equal(await page.getByRole('dialog', { name: 'Round story', exact: true }).isVisible(), false, 'state lands on the table before history');
    note(`${definition.id}-confirmed-state-before-history`);
  }
  assert.equal(examples.size, 3);
  const prep = examples.get('prepare'), press = examples.get('press'), rescue = examples.get('rescue');
  if (!cooperationOnly) {
  await fixture(prep.story, prep.chapter, { phase: 'ready', level: 1 }, false);
  await select(prep.definition.riskToken, prep.definition.secondaryId); await layout('prepared-risk');
  await commit(false, prep.definition, 'setback', 0);
  await fixture(prep.story, prep.chapter, { phase: 'setback', level: 0 });
  await select('assist', prep.definition.primaryId); await layout('repair');
  await commit(true, prep.definition, 'ready', 1);
  await fixture(prep.story, prep.chapter, { phase: 'ready', level: 1 });
  await select('assist', prep.definition.secondaryId); await layout('prepared-safe');
  await commit(true, prep.definition, 'open', 0);
  await fixture(press.story, press.chapter, { phase: 'open', level: 1 }, false);
  await select(press.definition.riskToken, press.definition.primaryId);
  await commit(false, press.definition, 'setback', 0);
  await fixture(press.story, press.chapter, { phase: 'open', level: 2 });
  await select('assist', press.definition.secondaryId); await layout('bank-two');
  await commit(true, press.definition, 'settled', 2);
  await fixture(rescue.story, rescue.chapter, { phase: 'setback', level: 0 });
  await select('investigate', rescue.definition.secondaryId); await layout('rescue-recover');
  await commit(false, rescue.definition, 'settled', 2);
  await fixture(rescue.story, rescue.chapter, { phase: 'setback', level: 0 });
  await select('assist', rescue.definition.primaryId); await layout('rescue-salvage');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await commit(true, rescue.definition, 'settled', 1);
  await fixture(rescue.story, rescue.chapter, { phase: 'open', level: 0 }, false, 3);
  await select(rescue.definition.riskToken, rescue.definition.primaryId); await layout('rescue-last-chance');
  await commit(false, rescue.definition, 'settled', 0);
  await page.reload();
  await page.getByRole('main', { name: 'Adventure table' }).waitFor();
  await page.locator('.di-choice-marker[data-phase=settled]').waitFor();
  await page.evaluate(async () => { window.__riverStore = (await import('/src/store/adventureStore.ts')).useAdventureStore; });
  note('failure-recovery-banking-reduced-motion-and-reload');
  // Expiry copy is longer: verify it still fits and never offers a nonexistent turn.
  await fixture(prep.story, prep.chapter, { phase: 'open', level: 0 }, true, 10);
  await select('assist', prep.definition.primaryId); await layout('preparation-final-turn');
  await commit(true, prep.definition, 'settled', 1);
  await fixture(press.story, press.chapter, { phase: 'open', level: 0 }, true, 10);
  await select(press.definition.riskToken, press.definition.primaryId); await layout('push-final-turn');
  await commit(false, press.definition, 'settled', 0);
  note('final-turn-preparation-and-unbanked-gains-close-on-table');
  }
  // Controlled crowded-table presentation: three accepted teammate plans and long hero names.
  // These are explicit reducer-state fixtures, not multiplayer transport evidence.
  async function committedParty(action) {
    const template = fixtureRoom.seats.find(seat => seat.actorId === selfId);
    const names = ['Alexandria Moonbeam', 'Bartholomew Copper', 'Christopher Willow'];
    fixtureRoom.seats = [template, ...names.map((name, index) => ({ ...structuredClone(template),
      id: `seat-${index + 1}`, actorId: `choice-peer-${index}`, character: { ...structuredClone(template.character), name } }))];
    fixtureRoom.commits = Object.fromEntries(fixtureRoom.seats.slice(1).map(seat => [seat.actorId, action]));
    await page.evaluate(room => window.__riverStore.setState({ room }), fixtureRoom);
  }
  await fixture(prep.story, prep.chapter, { phase: 'ready', level: 1 });
  await committedParty({ token: 'assist', targetId: prep.definition.secondaryId, targetKind: 'scene' });
  await select('assist', prep.definition.primaryId); await layout('party-preparation-overlap');
  assert.match(await page.locator('.di-scene-selection .di-cooperation-note').innerText(), /opening|committed/);
  await fixture(prep.story, prep.chapter, { phase: 'open', level: 0 }, true, 10);
  await committedParty({ token: 'assist', targetId: prep.definition.primaryId, targetKind: 'scene' });
  await select('assist', prep.definition.primaryId); await layout('party-preparation-final-turn');
  assert.match(await page.locator('.di-scene-selection').innerText(), /no later turn/i);
  await fixture(rescue.story, rescue.chapter);
  await committedParty({ token: 'assist', targetId: rescue.definition.primaryId, targetKind: 'scene' });
  await select(rescue.definition.riskToken, rescue.definition.primaryId); await layout('party-rescue-overlap');
  assert.match(await page.locator('.di-scene-selection .di-cooperation-note').innerText(), /save extra|committed/);
  await fixture(press.story, press.chapter, { phase: 'open', level: 2 });
  await committedParty({ token: 'assist', targetId: press.definition.secondaryId, targetKind: 'scene' });
  await select(press.definition.riskToken, press.definition.primaryId); await layout('party-banking-overlap');
  assert.match(await page.locator('.di-scene-selection .di-cooperation-note').innerText(), /bank|committed/);
  note('three-committed-teammates-long-names-and-scaled-odds');
  assert.deepEqual(errors, []);
} catch (error) {
  console.error(error.stack); process.exitCode = 1;
  await page?.screenshot({ path: 'output/playwright/chapter-choices-failure.png' }).catch(() => {});
} finally {
  await writeFile(`output/playwright/chapter-choices${cooperationOnly ? '-cooperation' : ''}-results.json`, JSON.stringify({ evidence: 'Reducer-backed controlled browser fixtures; actual local-handler multiplayer and story endings are covered separately by test:adventures and test:scene.', cooperationOnly, checks, errors, passed: !process.exitCode }, null, 2));
  await browser?.close(); await ssr?.close();
}
