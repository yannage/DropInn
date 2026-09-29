import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

// Smoke-check the actual two local servers used for the human comparison.
// Unlike rendering fixtures, these turns go through each server's live handler.
const builds = [
  { name: 'baseline', url: 'http://127.0.0.1:5200', version: 1 },
  { name: 'revised', url: 'http://127.0.0.1:5199', version: 2 },
];
await mkdir('output/playwright/comparison', { recursive: true });
const browser = await chromium.launch({ headless: true });
const evidence = [];
try {
  for (const build of builds) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', route => {
      const url = new URL(route.request().url());
      return ['http:', 'https:'].includes(url.protocol) && url.origin !== build.url
        ? route.abort('blockedbyclient') : route.continue();
    });
    const discovery = page.waitForResponse(response => response.url().endsWith('/api/dropinn') && response.request().postDataJSON()?.operation === 'list');
    await page.goto(`${build.url}/?session=comparison-smoke-${build.name}`);
    assert.equal((await (await discovery).json()).backend, 'local');
    assert.equal(await page.evaluate(async () => (await import('/src/lib/dropinn/api.ts')).localPlay), true);
    await page.getByRole('button', { name: 'Play with friends', exact: true }).click();
    await page.getByRole('button', { name: 'Start a friend table', exact: true }).click();
    await page.getByRole('main', { name: 'Adventure table' }).waitFor();
    const state = () => page.evaluate(async () => {
      const s = (await import('/src/store/adventureStore.ts')).useAdventureStore.getState();
      return { room: s.room, userId: s.userId };
    });
    const before = await state();
    assert.equal(before.room.adventureVersion ?? 1, build.version);
    assert.equal(before.room.adventureId ?? 'briar-glen', 'briar-glen');
    await page.screenshot({ path: `output/playwright/comparison/${build.name}-choosing.png` });
    await page.locator('[data-scene-target=gate]').click();
    await page.getByRole('group', { name: 'Moves for this target' }).getByRole('button', { name: /^Help:/ }).click();
    const resolution = page.waitForResponse(response => response.url().endsWith('/api/dropinn') && response.request().postDataJSON()?.command?.type === 'act');
    await page.getByRole('button', { name: 'Roll now', exact: true }).click();
    const resolved = await (await resolution).json();
    assert.equal(resolved.backend, 'local');
    assert.equal(resolved.room.phase, 'reveal');
    assert.ok(resolved.room.events.some(event => event.actorId === before.userId && event.turn === before.room.turn && event.contribution));
    await page.waitForFunction(async () => (await import('/src/store/adventureStore.ts')).useAdventureStore.getState().room.phase === 'reveal');
    await page.locator('.di-round-scroll').waitFor();
    await page.screenshot({ path: `output/playwright/comparison/${build.name}-resolution.png` });
    assert.deepEqual(errors, []);
    evidence.push({ build: build.name, url: build.url, backend: resolved.backend, adventureVersion: build.version, realTurnResolved: true, automaticHistory: true, errors });
    await page.evaluate(async () => (await import('/src/store/adventureStore.ts')).useAdventureStore.getState().leaveRoom());
    await context.close();
    console.log(JSON.stringify(evidence.at(-1)));
  }
} finally {
  await browser.close();
  await writeFile('output/playwright/comparison/results.json', JSON.stringify({ evidence, scope: 'Real local-server smoke checks, not human enjoyment evidence.' }, null, 2));
}
