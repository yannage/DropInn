import { chromium } from 'playwright';
import { createServer } from 'vite';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// Real isolated local command handler, independent browser identities, and UI
// gestures. No reducer/client room injection, hosted writes, or model requests.
const args = process.argv.slice(2);
if (args.length === 1 && args[0] === '--help') {
  console.log('Usage: node scripts/playtest-cooperation.mjs [--base-url http://127.0.0.1:5201]\nStart the local Vite development server first. Requires Playwright Chromium.');
  process.exit(0);
}
assert.ok(!args.length || args.length === 2 && args[0] === '--base-url', 'Use --base-url <loopback origin> or --help.');
const origin = new URL(args[1] ?? 'http://127.0.0.1:5201');
assert.ok(origin.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname)
  && !origin.username && !origin.password && origin.pathname === '/' && !origin.search && !origin.hash,
  'Cooperation playtests require a plain HTTP loopback origin.');
const base = origin.origin;
process.chdir(fileURLToPath(new URL('../', import.meta.url)));
await mkdir('output/playwright', { recursive: true });
const pages = [], records = [], checks = [], errors = [], consoleErrors = [];
const layoutFailures = [];
const blockedOrigins = new Set();
let ssr, browser, handler, actionOdds, approachOptions, offset = 0, externalCalls = 0;
let holdAAction;
const clock = () => Date.now() + offset;
const note = (name, evidence = {}) => { checks.push({ name, ...evidence }); console.log(JSON.stringify({ name })); };
const target = (page, id) => page.locator(`[data-scene-target="${id}"][data-target-kind="scene"]`);
const personal = (room, id) => ({ actions: room.players[id].actions, xp: room.players[id].xp });

async function state(page) {
  return page.evaluate(async () => {
    const store = (await import('/src/store/adventureStore.ts')).useAdventureStore.getState();
    return { userId: store.userId, character: store.character, room: store.room, loading: store.loading, error: store.error };
  });
}
async function waitStore(page, predicate) {
  await page.evaluate(async () => { window.__cooperationStore = (await import('/src/store/adventureStore.ts')).useAdventureStore; });
  await page.waitForFunction(predicate);
}
async function sync(page) {
  await waitStore(page, () => !window.__cooperationStore.getState().loading);
  await page.evaluate(() => window.__cooperationStore.getState().syncRoom());
}
async function setup(label, heroName) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  await context.addInitScript(({ offset }) => {
    const realNow = Date.now.bind(Date);
    window.__qaOffset = Number(localStorage.getItem('cooperation-clock-offset') ?? offset);
    Date.now = () => realNow() + window.__qaOffset;
    // Preserve short lived confirmed captions as evidence without changing timing.
    window.__choiceCaptions = [];
    new MutationObserver(() => {
      for (const node of document.querySelectorAll('.di-choice-credit')) {
        const text = node.textContent;
        if (text && window.__choiceCaptions.at(-1) !== text) window.__choiceCaptions.push(text);
      }
    }).observe(document, { subtree: true, childList: true, characterData: true });
  }, { offset });
  const page = await context.newPage();
  pages.push(page);
  page.on('pageerror', error => errors.push({ page: label, message: error.message }));
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push({ page: label, message: message.text() }); });
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
    if (label === 'A' && payload.command?.type === 'act' && holdAAction) await holdAAction;
    const response = await handler(new Request(`${base}/api/dropinn`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload),
    }));
    const body = await response.text();
    if (payload.operation === 'command' && payload.command?.type === 'act') {
      records.push({ page: label, command: structuredClone(payload.command), response: JSON.parse(body), status: response.status });
    }
    return route.fulfill({ status: response.status, contentType: 'application/json', body });
  });
  await page.goto(`${base}/?session=coopqa${label.toLowerCase()}`);
  assert.equal(await page.evaluate(async () => (await import('/src/lib/dropinn/api.ts')).localPlay), true, 'Use a local-backend Vite server.');
  await page.getByRole('button', { name: 'Customize hero', exact: true }).click();
  await page.getByRole('textbox', { name: 'Hero name optional' }).fill(heroName);
  await page.getByRole('button', { name: 'Cleric', exact: true }).click();
  await page.getByRole('button', { name: 'Save hero', exact: true }).click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  assert.equal((await state(page)).character.name, heroName);
  return page;
}
async function select(page, token, id, keyboard = false) {
  for (const name of ['Back to scene', 'Change move', 'Close inspection']) {
    const button = page.getByRole('button', { name, exact: true });
    if (await button.isVisible() && await button.isEnabled()) await button.click();
  }
  const show = page.getByRole('button', { name: 'Show tokens', exact: true });
  if (await show.isVisible()) await show.click();
  const tokenButton = page.getByRole('button', { name: `${{ assist: 'Help', influence: 'Influence', investigate: 'Investigate' }[token]} token`, exact: true });
  if (keyboard) {
    await tokenButton.focus(); await page.keyboard.press('Enter');
    await target(page, id).focus(); await page.keyboard.press('Enter');
  } else {
    await tokenButton.click(); await target(page, id).click();
  }
  await page.locator('.di-action-odds').waitFor();
  await page.getByRole('button', { name: /^(Commit|Roll) now$/ }).waitFor();
}
async function commit(page) {
  const count = records.length;
  // Arm the command response before the actual release control is clicked.
  const response = page.waitForResponse(response => response.url() === `${base}/api/dropinn`
    && response.request().postDataJSON()?.command?.type === 'act');
  await page.getByRole('button', { name: /^(Commit|Roll) now$/ }).click();
  assert.equal((await response).status(), 200);
  await waitStore(page, () => !window.__cooperationStore.getState().loading);
  assert.equal(records.length, count + 1, 'One release creates exactly one action command.');
  const record = records.at(-1);
  assert.equal(record.response.backend, 'local');
  return record;
}
async function nextRound() {
  const room = (await state(pages[0])).room;
  assert.equal(room.phase, 'reveal');
  assert.ok(room.revealUntil);
  offset = Math.max(offset, room.revealUntil + 1 - Date.now());
  for (const page of pages) await page.evaluate(value => { window.__qaOffset = value; localStorage.setItem('cooperation-clock-offset', String(value)); }, offset);
  for (const page of pages) await sync(page);
  for (const page of pages) await waitStore(page, () => window.__cooperationStore.getState().room?.phase === 'choosing');
}
async function oddsMatch(page, token, id) {
  const snapshot = await state(page);
  const action = { token, targetId: id, targetKind: 'scene' };
  action.approach = approachOptions(snapshot.room, action)[0]?.id;
  const odds = actionOdds(snapshot.room, snapshot.userId, action);
  assert.ok(odds, 'The selected move has legal current-snapshot odds.');
  const label = odds.guaranteed ? 'Guaranteed' : `${odds.normal}% success${odds.goodRelease !== odds.normal ? ` · ${odds.goodRelease}% with timing` : ''}`;
  assert.equal(await page.locator('.di-action-odds').textContent(), label);
  return odds;
}
async function layout(page, label) {
  for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 1280, height: 800 }]) {
    await page.setViewportSize(viewport);
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await page.screenshot({ path: `output/playwright/cooperation-${label}-${viewport.width}.png`, animations: 'disabled' });
    const bounds = await page.evaluate(() => {
      const rect = selector => document.querySelector(selector)?.getBoundingClientRect().toJSON();
      return { width: innerWidth, height: innerHeight, scrollWidth: document.documentElement.scrollWidth,
        scrollHeight: document.documentElement.scrollHeight, stage: rect('.di-scene-stage'), party: rect('.di-stage-party'),
        controls: rect('.di-focus-control'), tools: rect('.di-scene-tools'), selection: rect('.di-scene-selection'),
        selectionBottom: Math.max(0, ...[...document.querySelectorAll('.di-scene-selection>div>*')].map(node => node.getBoundingClientRect().bottom)),
        targets: [...document.querySelectorAll('.di-stage-targets [data-scene-target]')].map(node => node.getBoundingClientRect().toJSON()),
        heroes: [...document.querySelectorAll('.di-stage-party [data-scene-target]')].map(node => node.getBoundingClientRect().toJSON()),
        tokens: [...document.querySelectorAll('[aria-label="Action tokens"] button')].map(node => node.getBoundingClientRect().toJSON()),
        odds: rect('.di-action-odds'), note: rect('.di-cooperation-note'),
        noteOverflow: (() => { const node = document.querySelector('.di-cooperation-note'); return node ? { clientHeight: node.clientHeight, scrollHeight: node.scrollHeight, clientWidth: node.clientWidth, scrollWidth: node.scrollWidth } : undefined; })() };
    });
    try {
    assert.ok(bounds.scrollWidth <= bounds.width && bounds.scrollHeight <= bounds.height + 1, `${label}: document overflow ${JSON.stringify(bounds)}`);
    assert.equal(bounds.targets.length, 4, 'Every prepared move keeps the four illustrated scene targets.');
    for (const box of [...bounds.targets, ...bounds.heroes, ...bounds.tokens]) {
      assert.ok(box.width >= 44 && box.height >= 44 && box.left >= -1 && box.right <= bounds.width + 1
        && box.top >= 0 && box.bottom <= bounds.height + 1, `${label}: clipped or undersized hit area ${JSON.stringify(box)}`);
    }
    assert.ok(bounds.party?.height >= 44, `${label}: hero row remains visible.`);
    assert.ok(bounds.targets.every(box => box.bottom <= bounds.party.top + 1), `${label}: targets overlap the hero row ${JSON.stringify(bounds)}`);
    assert.ok(bounds.selectionBottom <= bounds.controls.top + 1, `${label}: decision copy overlaps release controls ${JSON.stringify(bounds)}`);
    assert.ok(bounds.controls.bottom <= bounds.tools.top + 1 && bounds.tools.bottom <= bounds.height + 1, `${label}: controls overlap the footer.`);
    assert.ok(bounds.odds?.height > 0 && bounds.note?.height > 0, `${label}: odds and named cooperation remain visible.`);
    assert.ok(bounds.noteOverflow.scrollHeight <= bounds.noteOverflow.clientHeight + 1 && bounds.noteOverflow.scrollWidth <= bounds.noteOverflow.clientWidth + 1,
      `${label}: cooperation note is clipped ${JSON.stringify(bounds.noteOverflow)}`);
    } catch (error) {
      layoutFailures.push({ label, viewport, message: error.message });
      console.error(`Layout failed: ${label}/${viewport.width}: ${error.message}`);
    }
    note(`layout-${label}-${viewport.width}`, bounds);
  }
  await page.setViewportSize({ width: 390, height: 844 });
}
async function history(page, text) {
  const live = page.getByRole('dialog', { name: 'Round story', exact: true });
  if (await live.isVisible()) await page.getByRole('button', { name: 'View scene', exact: true }).click();
  await page.getByRole('button', { name: 'Last round', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Last round', exact: true });
  await dialog.waitFor();
  await page.waitForFunction(value => document.querySelector('[role="dialog"]')?.textContent?.includes(value), text);
  assert.ok((await dialog.textContent()).includes(text));
  await page.keyboard.press('Escape');
}

try {
  ssr = await createServer({ configFile: false, cacheDir: 'node_modules/.vite-cooperation-tests', optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'error' });
  const { createDropinnHandler } = await ssr.ssrLoadModule('/server/dropinn.ts');
  ({ actionOdds } = await ssr.ssrLoadModule('/src/lib/dropinn/actionOdds.ts'));
  ({ approachOptions } = await ssr.ssrLoadModule('/src/lib/dropinn/approaches.ts'));
  handler = createDropinnHandler({ local: true, env: {}, now: clock, fetch: async () => { externalCalls++; throw new Error('External requests disabled for cooperation QA.'); } });
  browser = await chromium.launch({ headless: true });
  const a = await setup('A', 'Ada');
  const b = await setup('B', 'Mira');
  await a.getByRole('button', { name: 'Play with friends', exact: true }).click();
  await a.getByRole('button', { name: 'Start a friend table', exact: true }).click();
  await a.getByRole('main', { name: 'Adventure table', exact: true }).waitFor();
  await a.getByRole('button', { name: 'Invite', exact: true }).click();
  const invitation = await a.getByRole('textbox', { name: 'Full invitation link' }).inputValue();
  await a.keyboard.press('Escape');
  await b.getByRole('button', { name: 'Play with friends', exact: true }).click();
  await b.getByRole('textbox', { name: 'Adventure code or invitation link' }).fill(invitation);
  await b.getByRole('button', { name: 'Join adventure by code', exact: true }).click();
  await b.getByRole('main', { name: 'Adventure table', exact: true }).waitFor();
  await sync(a); await sync(b);
  const [identityA, identityB] = await Promise.all([state(a), state(b)]);
  assert.notEqual(identityA.userId, identityB.userId);
  assert.notEqual(identityA.character.id, identityB.character.id);
  assert.equal(identityA.room.adventureVersion, 4);
  assert.equal(identityA.room.visibility, 'private');
  assert.ok(identityB.room.pendingJoins.includes(identityB.userId));
  note('private-table-with-independent-named-identities-and-pending-admission');

  const actionCount = records.length;
  assert.equal(await a.getByRole('group', { name: 'Action tokens', exact: true }).getByRole('button', { name: /^(Fight|Influence|Investigate|Help) token$/ }).count(), 4);
  await select(a, 'assist', 'gate', true);
  await oddsMatch(a, 'assist', 'gate');
  assert.equal(records.length, actionCount, 'Keyboard token and target selection prepare without committing.');
  assert.equal((await state(a)).room.players[identityA.userId].actions, 0);
  const prepare = await commit(a);
  assert.equal(prepare.command.action.token, 'assist');
  assert.equal(prepare.command.action.targetId, 'gate');
  await sync(b);
  const readied = (await state(a)).room;
  assert.equal(readied.chapterChoices['briar-shelter'].phase, 'ready');
  assert.equal(readied.chapterChoices['briar-shelter'].sources[0].actorName, 'Ada');
  assert.deepEqual(personal(readied, identityA.userId), { actions: 1, xp: 3 });
  const preparationEvent = readied.events.find(event => event.result?.chapterChoice?.credit?.kind === 'prepared');
  assert.equal(preparationEvent.result.chapterChoice.credit.actors[0].actorId, identityA.userId);
  assert.match(preparationEvent.text, /Prepared by Ada/);
  note('keyboard-selection-is-not-commit-and-guaranteed-preparation-records-Ada');
  await nextRound();
  assert.equal((await state(b)).room.seats.filter(seat => seat.kind === 'human').length, 2);
  await b.getByRole('button', { name: 'Party', exact: true }).click();
  assert.match(await b.getByRole('dialog', { name: 'Your party', exact: true }).textContent(), /Prepared by Ada/);
  await b.keyboard.press('Escape');

  await select(a, 'influence', 'herd');
  await oddsMatch(a, 'influence', 'herd');
  await select(b, 'assist', 'gate');
  await commit(a); await sync(b);
  assert.equal(await a.locator('.di-action-odds').count(), 0, 'A committed move has no actionable live odds.');
  await target(a, 'tracks').click();
  await a.getByRole('group', { name: 'Moves for this target', exact: true }).waitFor();
  assert.equal(await a.locator('.di-inspection-context .di-cooperation-note').count(), 0, 'Inspecting an unrelated object after commitment must not borrow the retained move’s preparation credit.');
  assert.equal(await a.getByRole('group', { name: 'Moves for this target', exact: true }).locator('button:enabled').count(), 0);
  await a.getByRole('button', { name: 'Close inspection', exact: true }).click();
  note('accepted-commit-inspection-uses-the-inspected-object-not-retained-move');
  assert.equal((await state(b)).room.phase, 'choosing');
  assert.match(await b.locator('.di-cooperation-note').textContent(), /Ada.*cannot refresh/);
  await oddsMatch(b, 'assist', 'gate');
  await layout(b, 'already-using-preparation');
  await select(b, 'assist', 'herd');
  assert.match(await b.locator('.di-cooperation-note').textContent(), /Ada.*use it this turn too/);
  assert.equal((await oddsMatch(b, 'assist', 'herd')).guaranteed, true);
  await b.getByRole('button', { name: 'Action details and help', exact: true }).click();
  assert.match(await b.getByRole('dialog', { name: 'Your action', exact: true }).textContent(), /Ada.*Call the herd in[\s\S]*Roll pending/);
  await b.keyboard.press('Escape');
  await layout(b, 'shared-safe-payoff');
  const beforePayoff = (await state(b)).room;
  await commit(b); await sync(a);
  const [resolvedA, resolvedB] = await Promise.all([state(a), state(b)]);
  assert.equal(resolvedA.room.phase, 'reveal');
  assert.equal(resolvedA.room.turn, beforePayoff.turn);
  assert.deepEqual(resolvedA.room.chapterChoices, resolvedB.room.chapterChoices);
  const payoff = resolvedA.room.events.find(event => event.turn === beforePayoff.turn && event.result?.chapterChoice?.credit?.kind === 'payoff');
  assert.ok(payoff, 'A confirmed safe payoff has one structured named consequence.');
  const credit = payoff.result.chapterChoice.credit;
  assert.deepEqual(credit.sources, readied.chapterChoices['briar-shelter'].sources);
  assert.ok(credit.actors.some(actor => actor.actorId === identityB.userId && actor.actorName === 'Mira'));
  assert.ok(credit.actors.every(actor => resolvedA.room.events.some(event => event.id === actor.eventId && event.success && event.contribution && event.actorId === actor.actorId)));
  const risky = resolvedA.room.events.find(event => event.turn === beforePayoff.turn && event.actorId === identityA.userId && event.contribution);
  assert.deepEqual(credit.actors.map(actor => actor.actorId).sort(), [identityB.userId, ...(risky.success ? [identityA.userId] : [])].sort(), 'Every successful simultaneous payoff gets named, and a miss gets no false success credit.');
  assert.deepEqual(resolvedB.room.events.find(event => event.id === payoff.id).result.chapterChoice.credit, credit);
  assert.deepEqual(personal(resolvedA.room, identityA.userId), { actions: 2, xp: 3 + (risky.success ? 5 : 3) });
  assert.deepEqual(personal(resolvedA.room, identityB.userId), { actions: 1, xp: 3 });
  const safe = resolvedA.room.events.find(event => event.turn === beforePayoff.turn && event.actorId === identityB.userId && event.contribution);
  assert.equal(safe.roll, undefined);
  assert.equal(safe.result.progress, 1.5);
  assert.equal(resolvedA.room.chapterChoices['briar-shelter'].phase, 'open');
  assert.equal(resolvedA.room.chapterChoices['briar-shelter'].uses, 1);
  for (const page of pages) {
    await page.waitForFunction(() => window.__choiceCaptions.some(text => /Used by .*Mira.*prepared by Ada/.test(text)));
  }
  note('shared-payoff-credit-lands-on-both-tables-with-normal-XP', { turn: beforePayoff.turn, credit, rewardA: personal(resolvedA.room, identityA.userId), rewardB: personal(resolvedA.room, identityB.userId) });

  await nextRound();
  await history(a, payoff.text); await history(b, payoff.text);
  await b.reload();
  await b.getByRole('main', { name: 'Adventure table', exact: true }).waitFor();
  await sync(b);
  const reloaded = await state(b);
  assert.equal(reloaded.userId, identityB.userId);
  assert.equal(reloaded.character.id, identityB.character.id);
  assert.deepEqual(reloaded.room.chapterChoices, resolvedB.room.chapterChoices);
  assert.deepEqual(reloaded.room.events.find(event => event.id === payoff.id).result.chapterChoice.credit, credit);
  assert.deepEqual(personal(reloaded.room, identityB.userId), { actions: 1, xp: 3 });
  await history(b, payoff.text);
  note('named-payoff-and-rewards-survive-history-and-independent-client-reload');

  // Guaranteed Help cannot gain dice odds. A separate real choosing turn pairs
  // Ada's Help with Mira's different-token investigation of that same gate.
  await select(b, 'investigate', 'gate');
  const beforeOdds = await oddsMatch(b, 'investigate', 'gate');
  await select(a, 'assist', 'gate');
  let resumeA;
  holdAAction = new Promise(resolve => { resumeA = resolve; });
  const pendingCommit = commit(a);
  try {
    await a.getByText('Checking your move…', { exact: true }).waitFor();
    assert.equal(await a.locator('.di-action-odds').count(), 0, 'An in-flight move has no actionable live odds.');
  } finally { holdAAction = undefined; resumeA(); }
  await pendingCommit;
  await sync(b);
  const afterOdds = await oddsMatch(b, 'investigate', 'gate');
  assert.equal(afterOdds.normal, Math.min(100, beforeOdds.normal + 5));
  assert.equal(afterOdds.goodRelease, Math.min(100, beforeOdds.goodRelease + 5));
  assert.match(await b.locator('.di-cooperation-note').textContent(), /Ada/);
  await b.getByRole('button', { name: 'Action details and help', exact: true }).click();
  const supportedAction = await b.getByRole('dialog', { name: 'Your action', exact: true }).textContent();
  // The compact tray keeps the odds and contextual plan; full arithmetic lives
  // in action details instead of repeating it beneath the approach cards.
  assert.match(supportedAction, /\+1 teamwork with Ada/);
  assert.ok(supportedAction.includes(`${afterOdds.normal}% success`));
  await b.keyboard.press('Escape');
  assert.equal((await state(b)).room.phase, 'choosing');
  assert.equal((await state(b)).room.commits[identityB.userId], undefined);
  note('committed-teammate-updates-live-odds-before-player-release', { before: beforeOdds, after: afterOdds });
  await commit(b); await sync(a);
  assert.equal((await state(a)).room.phase, 'reveal');
  await nextRound();
  await select(b, 'investigate', 'gate');
  await oddsMatch(b, 'investigate', 'gate');
  const beforeExpiry = records.length;
  // Presentation-only clock probe: make this client's deadline expire while
  // the isolated authoritative clock remains at the real choosing boundary.
  // No room/character/command state is injected, and the client is restored.
  try {
    await b.evaluate(() => { window.__qaOffset += window.__cooperationStore.getState().room.deadline + 1 - Date.now(); });
    await b.waitForFunction(() => document.querySelector('.di-action-odds') === null);
    assert.equal(records.length, beforeExpiry, 'A local deadline expiry never commits the prepared move.');
  } finally { await b.evaluate(value => { window.__qaOffset = value; }, offset); }
  await sync(b);
  note('expired-client-deadline-hides-odds-without-committing', { fixture: 'Client clock only; authoritative room unchanged.' });
  assert.equal(externalCalls, 0);
  assert.deepEqual(errors, []);
  assert.deepEqual(layoutFailures, [], 'All captured cooperation layouts fit.');
  assert.ok(records.every(record => record.status === 200));
  note('no-external-calls-no-browser-errors-and-all-actions-accepted', { actions: records.length });
} catch (error) {
  checks.push({ name: 'FAILED', message: error.message, stack: error.stack });
  console.error(error);
  for (let index = 0; index < pages.length; index++) await pages[index].screenshot({ path: `output/playwright/cooperation-failure-${index}.png`, animations: 'disabled' }).catch(() => {});
  process.exitCode = 1;
} finally {
  try {
    await writeFile('output/playwright/cooperation-results.json', JSON.stringify({
      fixture: 'Real isolated local command handler, UI-created private table, independent browser identities, shared injected clock; no hosted persistence, Realtime, physical-phone, or model evidence',
      base, checks, errors, consoleErrors, layoutFailures, externalCalls, blockedOrigins: [...blockedOrigins],
    }, null, 2));
  } finally {
    await browser?.close().catch(() => {});
    await ssr?.close().catch(() => {});
  }
}
