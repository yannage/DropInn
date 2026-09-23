import { chromium } from 'playwright';
import { createServer } from 'vite';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

// Real local commands with a fixed turn clock; no hosted writes or inference.
const base = process.argv[2] ?? 'http://127.0.0.1:5198';
const url = new URL(base);
assert.ok(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname) && url.origin === base);
await mkdir('output/playwright', { recursive: true });
const ssr = await createServer({ configFile: false, cacheDir: 'node_modules/.vite-mobile-tests', optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'error' });
const checks = [], errors = [];
let browser;
const note = value => { checks.push(value); console.log(value); };
async function fits(page, label, stage = false) {
  await page.waitForFunction(() => [...document.images].every(img => {
    const r = img.getBoundingClientRect();
    return !r.width || !r.height || r.top >= innerHeight || r.bottom <= 0 || r.left >= innerWidth || r.right <= 0 || (img.complete && img.naturalWidth > 0);
  }));
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].filter(img => img.complete && img.naturalWidth).map(img => img.decode().catch(() => {})));
  });
  const geometry = await page.evaluate(() => {
    const dialog = document.querySelector('[role=dialog]');
    const box = dialog?.getBoundingClientRect();
    const toolbar = document.querySelector('.di-scene-tools')?.getBoundingClientRect();
    return { w: innerWidth, h: innerHeight, sw: document.documentElement.scrollWidth, sh: document.documentElement.scrollHeight, dialog: box?.toJSON(), toolbar: toolbar?.toJSON(), dialogOverflow: dialog && dialog.scrollWidth > dialog.clientWidth + 1 };
  });
  assert.ok(geometry.sw <= geometry.w, `${label}: horizontal page overflow`);
  if (stage) assert.ok(geometry.sh <= geometry.h + 1 && geometry.toolbar.bottom <= geometry.h + 1, `${label}: stage or toolbar clipped`);
  if (geometry.dialog) {
    assert.ok(geometry.dialog.top >= 0 && geometry.dialog.bottom <= geometry.h + 1, `${label}: dialog outside viewport`);
    assert.ok(!geometry.dialogOverflow, `${label}: horizontal dialog overflow`);
    const close = await page.getByRole('dialog').locator('header button,.di-modal-close').first().boundingBox();
    if (close) assert.ok(close.width >= 44 && close.height >= 44, `${label}: close button below 44px`);
  }
  await page.screenshot({ path: `output/playwright/mobile-${label}.png`, animations: 'disabled', mask: [page.getByRole('textbox', { name: 'Full invitation link' })] });
}
try {
  const { createDropinnHandler } = await ssr.ssrLoadModule('/server/dropinn.ts');
  browser = await chromium.launch({ headless: true });
  for (const width of [320, 390, 412, 1280]) {
    const height = width === 320 ? 568 : width === 1280 ? 900 : 844;
    const now = Date.now();
    const handler = createDropinnHandler({ local: true, env: {}, now: () => now, fetch: async () => { throw new Error('External calls disabled'); } });
    const context = await browser.newContext({ viewport: { width, height }, isMobile: width < 760, hasTouch: true, reducedMotion: 'reduce' });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(value => { Date.now = () => value; }, now);
    await page.route('**/*', route => new URL(route.request().url()).origin === base ? route.fallback() : route.abort());
    await page.route('**/dropinn', async route => {
      const response = await handler(new Request(`${base}/api/dropinn`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: route.request().postData() }));
      const body = await response.text();
      assert.equal(response.status, 200, body);
      assert.equal(JSON.parse(body).backend, 'local');
      await route.fulfill({ status: response.status, contentType: 'application/json', body });
    });
    try {
      await page.goto(`${base}/?session=mobileflow${width}`);
      await page.getByRole('button', { name: 'Start a friend table', exact: true }).waitFor();
      await fits(page, `lobby-${width}`);
      if (width < 760) {
        const shortcuts = page.getByRole('navigation', { name: 'Get ready to play' });
        const box = await shortcuts.boundingBox();
        assert.ok(box.y + box.height <= height, 'Hero and friend shortcuts visible on first screen');
        const cards = page.getByRole('group', { name: 'Story choices' });
        assert.ok(await cards.evaluate(node => node.scrollWidth > node.clientWidth), 'Story cards scroll within their own row');
        await cards.locator('article').last().getByRole('button', { name: 'Select story', exact: true }).click();
        assert.ok(await cards.evaluate(node => node.scrollLeft > 0), 'Every story remains reachable');
        await cards.locator('article').first().getByRole('button', { name: 'Select story', exact: true }).click();
        await page.getByRole('link', { name: 'Join friends', exact: false }).click();
        await page.getByRole('textbox', { name: 'Adventure code or invitation link' }).scrollIntoViewIfNeeded();
        await fits(page, `friends-${width}`);
        await page.getByRole('button', { name: 'Your hero', exact: true }).click();
      } else await page.getByRole('button', { name: 'Make this hero yours' }).click();
      await page.getByRole('dialog').waitFor();
      await fits(page, `builder-${width}`);
      const name = page.getByRole('textbox', { name: 'Hero name optional' });
      await name.fill('Mobile Wren');
      await page.getByRole('button', { name: 'Cleric', exact: true }).click();
      await page.getByRole('tab', { name: /Hats/ }).click();
      await page.getByRole('button', { name: 'No hat', exact: false }).click();
      await fits(page, `hats-${width}`);
      await page.getByRole('button', { name: 'Save hero', exact: true }).click();
      await page.getByRole('dialog').waitFor({ state: 'hidden' });
      await page.reload();
      await page.getByRole('button', { name: 'Make this hero yours' }).click();
      assert.equal(await name.inputValue(), 'Mobile Wren');
      await page.getByRole('button', { name: 'Cancel', exact: true }).click();
      await page.getByRole('button', { name: 'Save your hero', exact: true }).click();
      await fits(page, `account-${width}`);
      await page.keyboard.press('Escape');
      await page.getByRole('button', { name: 'How to play', exact: true }).click();
      await fits(page, `help-${width}`);
      await page.keyboard.press('Escape');
      await page.getByRole('button', { name: 'Start a friend table', exact: true }).click();
      await page.getByRole('main', { name: 'Adventure table' }).waitFor();
      await fits(page, `scene-${width}`, true);
      for (const [button, title] of [['Party', 'Your party'], ['Chat', 'Table chat'], ['Invite', 'Invite a friend'], ['Action details and help', 'Your action'], ['Spotlight idea', 'A Spotlight idea']]) {
        await page.getByRole('button', { name: button, exact: true }).tap();
        await page.getByRole('dialog', { name: title, exact: true }).waitFor();
        await fits(page, `${button.split(' ')[0].toLowerCase()}-${width}`, true);
        if (button === 'Spotlight idea' && width < 760) {
          await page.setViewportSize({ width, height: 400 });
          await page.getByRole('textbox', { name: 'Your idea', exact: true }).fill('A small mobile layout check');
          await fits(page, `keyboard-space-${width}`);
          const preview = page.getByRole('button', { name: 'Preview my idea', exact: true });
          await preview.scrollIntoViewIfNeeded();
          const previewBox = await preview.boundingBox();
          assert.ok(previewBox.y >= 0 && previewBox.y + previewBox.height <= 400, 'Submit remains reachable with reduced keyboard space');
          await page.setViewportSize({ width, height });
        }
        await page.keyboard.press('Escape');
      }
      await page.getByRole('button', { name: 'Leave & save', exact: true }).click();
      note(`Lobby, all story choices, hero save/reload, hats, help, account and five adventure drawers: ${width}×${height}`);
    } finally { await context.close(); }
  }
  assert.deepEqual(errors, []);
} catch (error) { console.error(error); process.exitCode = 1; }
finally {
  await writeFile('output/playwright/mobile-flow-results.json', JSON.stringify({ evidence: 'Local isolated handler, Chromium mobile/touch emulation and fixed turn clock; reduced viewport simulates keyboard space only, not a physical keyboard.', checks, errors }, null, 2));
  await browser?.close();
  await ssr.close();
}
