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
    await Promise.all([...document.querySelectorAll('svg image')].map(async layer => {
      const image = new Image();
      image.src = layer.href.baseVal;
      await image.decode();
    }));
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
      const play = page.locator('.di-lobby-play');
      await play.waitFor();
      await fits(page, `lobby-${width}`);
      for (const control of [page.locator('.di-lobby-explanation'), page.getByRole('list', { name: 'Each round', exact: true }), page.getByRole('button', { name: 'Customize hero', exact: true }), page.getByRole('button', { name: 'Change story', exact: true }), page.getByRole('button', { name: 'Play with friends', exact: true }), play, page.locator('.di-arrival-identity .di-avatar')]) {
        const box = await control.boundingBox();
        assert.ok(box && box.y >= 0 && box.y + box.height <= height, `Explanation, round loop, ready hero and start controls visible on first screen: ${await control.textContent()}`);
      }
      assert.match(await play.textContent(), /Play Briar Glen/);
      assert.equal(await page.getByRole('group', { name: 'Story choices' }).count(), 0, 'Story choice stays behind Change story');
      assert.equal(await page.locator('.di-narrator-download').count(), 1, 'One shared narrator entry');
      for (const control of [page.getByRole('button', { name: 'Customize hero', exact: true }), page.getByRole('button', { name: 'Change story', exact: true }), page.getByRole('button', { name: 'Play with friends', exact: true }), play]) {
        const box = await control.boundingBox();
        assert.ok(box.width >= 44 && box.height >= 44, 'First-screen controls preserve 44px tap targets');
      }
      const changeStory = page.getByRole('button', { name: 'Change story', exact: true });
      await changeStory.click();
      const storyDialog = page.getByRole('dialog', { name: 'Choose a story', exact: true });
      await storyDialog.waitFor();
      await fits(page, `stories-${width}`);
      const cards = page.getByRole('group', { name: 'Story choices' });
      const storyNames = await cards.getByRole('button', { name: /^Select story:/ }).evaluateAll(buttons => buttons.map(button => button.getAttribute('aria-label').replace('Select story: ', '')));
      assert.equal(storyNames.length, 4, 'All four stories are available');
      const rewards = cards.locator('article').first().locator('.di-lobby-choice-rewards');
      assert.equal(await rewards.getAttribute('open'), null, 'Secondary reward details start collapsed');
      await rewards.locator('summary').focus();
      await page.keyboard.press('Enter');
      await rewards.getByText('Hat to unlock', { exact: false }).first().waitFor();
      assert.equal(await rewards.getByText('Hat to unlock', { exact: false }).count(), 3);
      await page.keyboard.press('Enter');
      assert.equal(await rewards.getAttribute('open'), null, 'Reward details collapse with the keyboard');
      await page.keyboard.press('Escape');
      assert.equal(await changeStory.evaluate(node => document.activeElement === node), true, 'Closing story choices restores keyboard focus');
      for (const title of [...storyNames.slice(1), storyNames[0]]) {
        await changeStory.click();
        await cards.getByRole('button', { name: `Select story: ${title}`, exact: true }).click();
        await storyDialog.waitFor({ state: 'hidden' });
        await page.getByRole('button', { name: `Play ${title}`, exact: true }).waitFor();
        assert.equal(await page.getByRole('main', { name: 'Adventure table' }).count(), 0, 'Choosing a story does not start an adventure');
      }
      const friends = page.getByRole('button', { name: 'Play with friends', exact: true });
      await friends.click();
      await page.getByRole('dialog', { name: 'Play with friends', exact: true }).waitFor();
      await page.getByRole('textbox', { name: 'Adventure code or invitation link' }).scrollIntoViewIfNeeded();
      await fits(page, `friends-${width}`);
      await page.keyboard.press('Escape');
      assert.equal(await friends.evaluate(node => document.activeElement === node), true, 'Closing friend options restores keyboard focus');
      await page.getByRole('button', { name: 'Customize hero', exact: true }).click();
      await page.getByRole('dialog').waitFor();
      await fits(page, `builder-${width}`);
      const name = page.getByRole('textbox', { name: 'Hero name optional' });
      await name.fill('Mobile Wren');
      await page.getByRole('button', { name: 'Cleric', exact: true }).click();
      await page.getByRole('tab', { name: 'Wardrobe', exact: true }).click();
      await page.getByRole('button', { name: 'No hat', exact: false }).click();
      await fits(page, `hats-${width}`);
      await page.getByRole('button', { name: 'Save hero', exact: true }).click();
      await page.getByRole('dialog').waitFor({ state: 'hidden' });
      await page.reload();
      await page.getByRole('button', { name: 'Customize hero', exact: true }).click();
      assert.equal(await name.inputValue(), 'Mobile Wren');
      await page.getByRole('button', { name: 'Cancel', exact: true }).click();
      await page.getByRole('button', { name: 'Save your hero', exact: true }).click();
      await fits(page, `account-${width}`);
      await page.keyboard.press('Escape');
      await page.getByRole('button', { name: 'How to play', exact: true }).click();
      await fits(page, `help-${width}`);
      await page.keyboard.press('Escape');
      await page.getByRole('button', { name: 'Play with friends', exact: true }).click();
      await page.getByRole('button', { name: 'Start a friend table', exact: true }).click();
      await page.getByRole('main', { name: 'Adventure table' }).waitFor();
      await page.locator('.di-player-guidance[data-state="target"]').waitFor({ state: 'visible' });
      assert.equal(await page.getByRole('group', { name: 'Action tokens', exact: true }).count(), 1, 'Scene starts with the visible token hand');
      await fits(page, `scene-${width}`, true);
      for (const [button, title] of [['Party', 'Your party'], ['Chat', 'Table chat'], ['Invite', 'Invite a friend'], ['Action details and help', 'Your action'], ['Spotlight idea', 'A Spotlight idea']]) {
        if (button === 'Spotlight idea') {
          await page.locator('[data-scene-target][data-target-kind="scene"]').first().tap();
          await page.locator('.di-context-spotlight').tap();
        } else await page.getByRole('button', { name: button, exact: true }).tap();
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
      note(`First-screen explanation and ready hero, story/friend dialogs, all story selections, hero save/reload, hats, help, account, target-first guidance and five adventure drawers: ${width}×${height}`);
    } finally { await context.close(); }
  }
  assert.deepEqual(errors, []);
} catch (error) { console.error(error); process.exitCode = 1; }
finally {
  await writeFile('output/playwright/mobile-flow-results.json', JSON.stringify({ evidence: 'Local isolated handler, Chromium mobile/touch emulation and fixed turn clock; reduced viewport simulates keyboard space only, not a physical keyboard.', checks, errors }, null, 2));
  await browser?.close();
  await ssr.close();
}
