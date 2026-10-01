import { chromium } from 'playwright';
import { createServer } from 'vite';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

// Local browser evidence only: Vite serves the app, while an isolated real command
// handler supplies its API. The save-error scenario explicitly injects UI state.
const base = process.argv[2] ?? 'http://127.0.0.1:5198';
const url = new URL(base);
assert.ok(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname) && url.origin === base);
await mkdir('output/playwright', { recursive: true });
const ssr = await createServer({ configFile: false, cacheDir: 'node_modules/.vite-hero-designer-tests', optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'error' });
const checks = [], errors = [], artifacts = [], responses = [];
const note = value => { checks.push(value); console.log(value); };
const button = (page, name) => page.getByRole('button', { name, exact: true });
const dialog = page => page.getByRole('dialog');
const heroName = page => page.getByRole('textbox', { name: 'Hero name optional' });
const tab = (page, name) => page.getByRole('tab', { name: new RegExp(`^${name}(?:\\b|$)`) });
const entry = page => page.getByRole('button', { name: 'Customize hero from header', exact: true });
const savedHero = page => page.evaluate(async () => (await import('/src/store/adventureStore.ts')).useAdventureStore.getState().character);
const preview = page => page.locator('.di-builder-preview .di-avatar').first().evaluate(svg => ({
  images: [...svg.querySelectorAll('image')].map(image => image.href.baseVal),
  colors: [...svg.querySelectorAll('[fill]')].map(node => node.getAttribute('fill')),
}));

async function assertPressed(locator, message) {
  assert.equal(await locator.getAttribute('aria-pressed'), 'true', message);
}

async function openDesigner(page) {
  await entry(page).click();
  await dialog(page).waitFor();
  await tab(page, 'Hero').waitFor();
}

async function fitAndCapture(page, label, enlargedText = false) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.querySelectorAll('svg image')].map(async layer => {
      const image = new Image();
      image.src = layer.href.baseVal;
      await image.decode();
    }));
  });
  const geometry = await page.evaluate(() => {
    const bounds = selector => document.querySelector(selector)?.getBoundingClientRect().toJSON();
    const modal = document.querySelector('[role="dialog"]');
    const panel = document.querySelector('[role="tabpanel"]');
    return {
      width: innerWidth, height: innerHeight, pageWidth: document.documentElement.scrollWidth,
      modal: bounds('[role="dialog"]'), preview: bounds('.di-builder-preview'), footer: bounds('.di-builder-footer'),
      modalOverflow: modal.scrollWidth > modal.clientWidth + 1,
      panelOverflow: panel.scrollWidth > panel.clientWidth + 1,
      controls: [...modal.querySelectorAll('button,input')].filter(node => node.getClientRects().length).map(node => {
        const box = node.getBoundingClientRect();
        return { name: node.getAttribute('aria-label') || node.textContent?.trim(), width: box.width, height: box.height };
      }),
    };
  });
  const inside = box => box && box.top >= -1 && box.bottom <= geometry.height + 1 && box.left >= -1 && box.right <= geometry.width + 1;
  assert.ok(geometry.pageWidth <= geometry.width + 1, `${label}: page horizontal overflow`);
  assert.ok(inside(geometry.modal), `${label}: dialog outside viewport`);
  assert.ok(!geometry.modalOverflow && !geometry.panelOverflow, `${label}: horizontal dialog/panel overflow`);
  assert.ok(inside(geometry.preview), `${label}: preview outside viewport`);
  assert.ok(inside(geometry.footer), `${label}: footer outside viewport`);
  for (const control of geometry.controls) {
    assert.ok(control.width >= 43.5 && control.height >= 43.5, `${label}: ${control.name} below 44px (${control.width}×${control.height})`);
  }
  if (enlargedText) assert.ok(geometry.preview.bottom <= geometry.footer.top + 1, `${label}: preview overlaps footer at enlarged text`);
  const path = `output/playwright/hero-designer-${label}.png`;
  await page.screenshot({ path, animations: 'disabled' });
  artifacts.push(path);
}

async function assertKeyboardNavigation(page) {
  const rootInert = await page.locator('#root').evaluate(root => root.inert);
  assert.equal(rootInert, true, 'Background is inert while designer is open');
  await tab(page, 'Hero').focus();
  for (const [key, expected] of [['ArrowRight', 'Face'], ['ArrowRight', 'Wardrobe'], ['ArrowRight', 'Hero'], ['End', 'Wardrobe'], ['Home', 'Hero'], ['ArrowLeft', 'Wardrobe']]) {
    await page.keyboard.press(key);
    assert.equal(await tab(page, expected).getAttribute('aria-selected'), 'true', `${key} selects ${expected}`);
    assert.equal(await tab(page, expected).evaluate(node => document.activeElement === node), true, `${key} focuses ${expected}`);
  }
  const tabs = await page.getByRole('tab').evaluateAll(nodes => nodes.map(node => ({ selected: node.getAttribute('aria-selected'), tabIndex: node.tabIndex })));
  assert.equal(tabs.filter(value => value.tabIndex === 0).length, 1, 'One top-level tab is in the Tab sequence');
  assert.ok(tabs.every(value => value.tabIndex === (value.selected === 'true' ? 0 : -1)), 'Tab order matches selection');
  const labelledBy = await page.getByRole('tabpanel').getAttribute('aria-labelledby');
  assert.equal(labelledBy, await tab(page, 'Wardrobe').getAttribute('id'), 'Visible panel references the active tab');
  await button(page, 'Save hero').focus();
  await page.keyboard.press('Tab');
  assert.equal(await button(page, 'Close character builder').evaluate(node => document.activeElement === node), true, 'Tab wraps at the modal boundary');
  await page.keyboard.press('Shift+Tab');
  assert.equal(await button(page, 'Save hero').evaluate(node => document.activeElement === node), true, 'Shift+Tab wraps at the modal boundary');
  await page.keyboard.press('Escape');
  await dialog(page).waitFor({ state: 'hidden' });
  assert.equal(await entry(page).evaluate(node => document.activeElement === node), true, 'Escape restores focus to the hero badge');
  assert.equal(await page.locator('#root').evaluate(root => root.inert), false, 'Background inert state is restored');
}

async function lifecycle(page, width) {
  assert.equal(await page.locator('.di-designer-save-state').textContent(), 'Try anything. Make it yours.', 'Fresh editor reports saved baseline');
  await heroName(page).fill(`Studio Wren ${width}`);
  assert.equal(await page.locator('.di-designer-save-state').textContent(), 'A fresh look. Save to keep it.', 'Changed draft reports that saving is needed');
  await button(page, 'Cleric').click();
  await button(page, 'Sky body color').click();
  await button(page, 'Pear').click();
  await tab(page, 'Face').click();
  for (const [category, choice] of [['Hair', 'Soft Fringe'], ['Eyes', 'Winking eyes'], ['Nose', 'Freckled nose'], ['Mouth', 'Toothy grin']]) {
    await button(page, category).click();
    await assertPressed(button(page, category), `${category} subcategory is selected`);
    await button(page, choice).click();
    await assertPressed(button(page, choice), `${choice} is selected`);
  }
  await fitAndCapture(page, `face-${width}`);
  await tab(page, 'Wardrobe').click();
  await page.getByRole('button', { name: /^No hat(?:\s|$)/ }).click();
  await fitAndCapture(page, `wardrobe-${width}`);
  const beforeScroll = await page.locator('.di-builder-preview').boundingBox();
  const saveBefore = await button(page, 'Save hero').boundingBox();
  const scroll = await page.getByRole('tabpanel').evaluate(node => {
    node.scrollTop = node.scrollHeight;
    return { top: node.scrollTop, overflows: node.scrollHeight > node.clientHeight + 1 };
  });
  assert.ok(!scroll.overflows || scroll.top > 0, 'Overflowing wardrobe options scroll independently');
  const afterScroll = await page.locator('.di-builder-preview').boundingBox();
  const saveAfter = await button(page, 'Save hero').boundingBox();
  assert.equal(afterScroll.y, beforeScroll.y, 'Preview stays anchored while wardrobe options scroll');
  assert.equal(saveAfter.y, saveBefore.y, 'Save stays anchored while wardrobe options scroll');
  await button(page, 'Save hero').click();
  await dialog(page).waitFor({ state: 'hidden' });
  const expected = await savedHero(page);
  assert.equal(expected.name, `Studio Wren ${width}`);
  assert.equal(expected.classKey, 'cleric');
  assert.equal(expected.accent, '#7DD3FC');
  assert.deepEqual(expected.appearance, { body: 'pear', eyes: 'wink', nose: 'freckles', mouth: 'toothy', hair: 'soft-fringe' });
  assert.equal(expected.equipment.hat, null, 'Explicit no-hat is saved');
  await page.reload();
  await entry(page).waitFor();
  assert.deepEqual(await savedHero(page), expected, 'Complete saved hero survives browser reload');
  await openDesigner(page);
  assert.equal(await heroName(page).inputValue(), expected.name);
  await assertPressed(button(page, 'Cleric'), 'Saved class selected after reload');
  await assertPressed(button(page, 'Sky body color'), 'Saved color selected after reload');
  await heroName(page).fill('Discard this draft');
  await button(page, 'Fighter').click();
  await button(page, 'Cancel').click();
  await dialog(page).waitFor({ state: 'hidden' });
  assert.deepEqual(await savedHero(page), expected, 'Cancel preserves saved hero');
  await openDesigner(page);
  assert.equal(await heroName(page).inputValue(), expected.name, 'Canceled draft is discarded');
  const before = await preview(page);
  await button(page, 'Surprise me').click();
  assert.notDeepEqual(await preview(page), before, 'Surprise changes the live preview');
  assert.deepEqual(await savedHero(page), expected, 'Surprise remains an unsaved draft');
  await button(page, 'Undo last change').click();
  assert.deepEqual(await preview(page), before, 'Undo restores the previous look');
  assert.equal(await page.locator('.di-designer-save-state').textContent(), 'Try anything. Make it yours.', 'Undo restores the saved baseline status');
  const motion = await page.locator('.di-designer-model').evaluate(node => getComputedStyle(node).animationDuration);
  assert.ok(motion.split(',').every(duration => parseFloat(duration) <= 0.01), 'Reduced motion removes the preview bounce');
  await button(page, 'Cancel').click();
  note(`Name/class/color/body/face/no-hat save and reload; cancel; live surprise and undo: ${width}px`);
}

async function injectedSaveFailure(page) {
  await openDesigner(page);
  const saved = await savedHero(page);
  await heroName(page).fill('Retry Wren');
  await page.evaluate(async () => {
    const store = (await import('/src/store/adventureStore.ts')).useAdventureStore;
    window.__heroDesignerOriginalSave = store.getState().setHero;
    store.setState({ setHero: () => new Promise(resolve => {
      window.__heroDesignerFailSave = () => { store.setState({ error: 'QA save failure. Please retry.' }); resolve(); };
    }) });
  });
  try {
    await button(page, 'Save hero').click();
    await button(page, 'Saving…').waitFor();
    assert.equal(await button(page, 'Close character builder').isDisabled(), true, 'Close is disabled during a pending save');
    assert.equal(await button(page, 'Surprise me').isDisabled(), true, 'Surprise is disabled during a pending save');
    assert.equal(await heroName(page).isDisabled(), true, 'Name is disabled during a pending save');
    await page.keyboard.press('Escape');
    assert.equal(await dialog(page).isVisible(), true, 'Escape keeps a pending save open');
    await page.evaluate(() => window.__heroDesignerFailSave());
    await page.getByRole('alert').filter({ hasText: 'QA save failure. Please retry.' }).waitFor();
    assert.equal(await heroName(page).inputValue(), 'Retry Wren', 'Failed save retains draft input');
    assert.deepEqual(await savedHero(page), saved, 'Injected failed save leaves saved identity intact');
    await fitAndCapture(page, 'save-error-1280');
  } finally {
    await page.evaluate(async () => {
      const store = (await import('/src/store/adventureStore.ts')).useAdventureStore;
      store.setState({ setHero: window.__heroDesignerOriginalSave, error: null });
      delete window.__heroDesignerOriginalSave;
      delete window.__heroDesignerFailSave;
    });
  }
  await button(page, 'Save hero').click();
  await dialog(page).waitFor({ state: 'hidden' });
  assert.equal((await savedHero(page)).name, 'Retry Wren', 'Retry saves retained draft');
  note('Failed save reports error and retains draft; retry succeeds (local Zustand save-method injection only).');
}

let browser;
try {
  const { createDropinnHandler } = await ssr.ssrLoadModule('/server/dropinn.ts');
  browser = await chromium.launch({ headless: true });
  for (const [width, height] of [[1280, 900], [390, 844], [320, 568]]) {
    const handler = createDropinnHandler({ local: true, env: {}, fetch: async () => { throw new Error('External calls disabled'); } });
    const context = await browser.newContext({ viewport: { width, height }, isMobile: width < 760, hasTouch: width < 760, reducedMotion: 'reduce' });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', route => new URL(route.request().url()).origin === base ? route.fallback() : route.abort());
    await page.route('**/dropinn', async route => {
      const response = await handler(new Request(`${base}/api/dropinn`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: route.request().postData() }));
      const body = await response.text();
      assert.equal(response.status, 200, body);
      const data = JSON.parse(body);
      assert.equal(data.backend, 'local');
      responses.push({ viewport: width, operation: route.request().postDataJSON().operation, backend: data.backend, status: response.status });
      await route.fulfill({ status: response.status, contentType: 'application/json', body });
    });
    try {
      const initialized = page.waitForResponse(response => response.url().endsWith('/dropinn'));
      await page.goto(`${base}/?session=herodesigner${width}`);
      await initialized;
      await entry(page).waitFor();
      const badge = await entry(page).boundingBox();
      assert.ok(badge.width >= 44 && badge.height >= 44 && badge.y >= 0 && badge.y + badge.height <= height && badge.x + badge.width <= width, `Hero badge is visible with a 44px target: ${JSON.stringify(badge)} in ${width}×${height}`);
      assert.ok(await entry(page).getAttribute('aria-label'), 'Hero badge has an explicit accessible name');
      await openDesigner(page);
      await fitAndCapture(page, `hero-${width}`);
      await assertKeyboardNavigation(page);
      await openDesigner(page);
      await lifecycle(page, width);
      if (width === 1280) await injectedSaveFailure(page);
      await openDesigner(page);
      // Synthetic 150% text enlargement; not browser zoom or a physical phone.
      await page.evaluate(() => {
        const nodes = [...document.querySelectorAll('.di-customizer, .di-customizer *')];
        const fontSizes = nodes.map(node => parseFloat(getComputedStyle(node).fontSize));
        nodes.forEach((node, index) => { if (node instanceof HTMLElement) node.style.fontSize = `${fontSizes[index] * 1.5}px`; });
      });
      await fitAndCapture(page, `enlarged-text-${width}`, true);
      await button(page, 'Cancel').click();
      note(`Badge, modal focus trap/return, three tabs, 44px controls, anchored preview/footer, reduced motion and 150% text geometry: ${width}×${height}`);
    } catch (error) {
      const path = `output/playwright/hero-designer-failure-${width}.png`;
      await page.screenshot({ path, animations: 'disabled' }).catch(() => {});
      artifacts.push(path);
      throw error;
    } finally { await context.close(); }
  }
  assert.deepEqual(errors, [], 'No uncaught browser errors');
} catch (error) { console.error(error); errors.push(error.message); process.exitCode = 1; }
finally {
  await writeFile('output/playwright/hero-designer-results.json', JSON.stringify({
    evidence: 'Local Vite browser UI with isolated real local command handler and blocked external browser origins. Hero save/reload uses browser persistence. Save failure injects a Zustand method; no hosted PostgREST/RLS claim. Chromium desktop and touch emulation, reduced motion, synthetic 150% text enlargement; no physical-phone or hosted Realtime verification.',
    checks, errors, responses, artifacts,
  }, null, 2));
  await browser?.close();
  await ssr.close();
}
