import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

// Hold the real lazy game module, not a gameplay clock, to inspect its actual Suspense UI.
const base = process.env.FLIPBOOK_TEST_URL ?? 'http://127.0.0.1:5204';
if (!/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(base)) throw Error('Use a loopback development server.');
await mkdir('output/playwright', { recursive: true });
const browser = await chromium.launch({ headless: true });
const evidence = [];
let activePage;

async function fixture(failedAsset = false) {
  const context = await browser.newContext({ viewport: { width: 320, height: 568 } });
  const page = await context.newPage(); activePage = page;
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  await page.route('**/src/components/DropInn/DropInn.tsx*', async route => { await gate; await route.continue(); });
  if (failedAsset) await page.route('**/art/flipbook-sheep-loading.webp', route => route.abort('failed'));
  await page.goto(`${base}/?session=flipbook${failedAsset ? 'error' : 'motion'}${Date.now()}`, { waitUntil: 'domcontentloaded' });
  const loader = page.locator('.di-loading-inn.is-screen');
  await loader.getByRole('heading', { name: 'Opening the inn…', exact: true }).waitFor();
  return { context, page, release, loader, sprite: loader.locator('[data-frame-atlas="sheep-loading"]') };
}

try {
  const fixtureA = await fixture();
  try {
    const { page, sprite, loader } = fixtureA;
    await page.waitForFunction(() => document.querySelector('[data-frame-atlas="sheep-loading"]')?.getAttribute('data-frame-state') === 'playing');
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    const positions = [];
    for (let index = 0; index < 8; index++) {
      const previous = positions.at(-1);
      await page.waitForFunction(previous => {
        const cells = document.querySelector('.di-frame-cells');
        return cells && getComputedStyle(cells).backgroundPosition !== previous;
      }, previous);
      positions.push(await sprite.locator('.di-frame-cells').evaluate(node => getComputedStyle(node).backgroundPosition));
      if (index === 0 || index === 4) await sprite.screenshot({ path: `output/playwright/flipbook-painted-frame-${index}.png` });
    }
    assert.equal(new Set(positions).size, 8, 'The loop displays eight distinct atlas cells.');
    const css = await sprite.locator('.di-frame-cells').evaluate(node => ({ timing: getComputedStyle(node).animationTimingFunction, size: getComputedStyle(node).backgroundSize }));
    assert.match(css.timing, /steps\(1\)|steps\(1, end\)/, 'Frames change discretely rather than sliding between drawings.');
    assert.equal(css.size, '400% 200%');
    evidence.push({ check: 'Eight discrete painted frames', positions, css });

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForFunction(() => document.querySelector('[data-frame-atlas]')?.getAttribute('data-frame-state') === 'poster');
    const poster = await sprite.locator('.di-frame-cells').evaluate(node => ({ position: getComputedStyle(node).backgroundPosition, animation: getComputedStyle(node).animationName }));
    assert.deepEqual(poster, { position: '0% 0%', animation: 'none' });
    for (const viewport of [{ width: 390, height: 844 }, { width: 320, height: 568 }]) {
      await page.setViewportSize(viewport);
      const bounds = await loader.boundingBox();
      assert.ok(bounds && bounds.x >= 0 && bounds.y >= 0 && bounds.x + bounds.width <= viewport.width && bounds.y + bounds.height <= viewport.height, 'Loading screen fits the phone viewport.');
      await page.screenshot({ path: `output/playwright/flipbook-loading-poster-${viewport.width}.png` });
    }
    await sprite.evaluate(node => { node.style.background = '#27372f'; node.style.borderRadius = '8px'; });
    await sprite.screenshot({ path: 'output/playwright/flipbook-loading-dark.png' });
    await sprite.evaluate(node => { node.style.background = ''; node.style.borderRadius = ''; });
    evidence.push({ check: 'Reduced motion preserves a static poster and readable loading text', poster, viewports: ['390×844', '320×568'] });

    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
    await page.waitForFunction(() => document.querySelector('[data-frame-atlas]')?.getAttribute('data-frame-state') === 'poster');
    assert.equal(await sprite.locator('.di-frame-cells').evaluate(node => getComputedStyle(node).animationName), 'none');
    await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: false }); document.dispatchEvent(new Event('visibilitychange')); });
    await page.waitForFunction(() => document.querySelector('[data-frame-atlas]')?.getAttribute('data-frame-state') === 'playing');
    evidence.push({ check: 'Hidden document freezes its poster; visible document resumes frames' });

    fixtureA.release();
    await page.getByRole('button', { name: 'Play with friends', exact: true }).waitFor();
    assert.equal(await page.locator('.di-loading-inn.is-screen').count(), 0, 'The ready game removes loading immediately.');
    assert.deepEqual(errors, []);
    evidence.push({ check: 'Real game entry replaces loading without an animation wait', errors });

    // Mount the same shipped component with one-shot props; no game state or clocks change.
    await page.evaluate(async () => {
      const [{ default: React }, { default: ReactDOM }, { FrameAnimation }] = await Promise.all([
        import('/node_modules/.vite/deps/react.js'), import('/node_modules/.vite/deps/react-dom_client.js'), import('/src/components/DropInn/FrameAnimation.tsx'),
      ]);
      const host = document.createElement('div'); host.id = 'flipbook-once-probe';
      Object.assign(host.style, { position: 'fixed', inset: '0', zIndex: '99999', display: 'grid', placeItems: 'center', background: '#fff7df' });
      document.body.append(host); const root = ReactDOM.createRoot(host);
      window.__renderFlipbook = props => root.render(React.createElement(FrameAnimation, { atlas: 'sheep-loading', durationMs: 480, loop: false, ...props }));
      window.__renderFlipbook({ key: 'hidden-once' });
    });
    const oneShot = page.locator('#flipbook-once-probe [data-frame-atlas]');
    await oneShot.locator('.di-frame-cells').waitFor();
    await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
    await page.waitForFunction(() => document.querySelector('#flipbook-once-probe [data-frame-state="poster"]'));
    await page.waitForTimeout(600); // Deliberately outlive this visual beat while the page is hidden.
    await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: false }); document.dispatchEvent(new Event('visibilitychange')); });
    await page.waitForFunction(() => document.querySelector('#flipbook-once-probe [data-frame-state="finished"]'));
    assert.equal(await oneShot.locator('.di-frame-cells').evaluate(node => getComputedStyle(node).backgroundPosition), '100% 100%');
    evidence.push({ check: 'A one-shot hidden past its end returns on the last frame without replaying' });

    await page.evaluate(() => window.__renderFlipbook({ key: 'reduced-once' }));
    await oneShot.locator('.di-frame-cells').waitFor();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForFunction(() => document.querySelector('#flipbook-once-probe [data-frame-state="poster"]'));
    await page.waitForTimeout(600);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.waitForFunction(() => document.querySelector('#flipbook-once-probe [data-frame-state="finished"]'));
    evidence.push({ check: 'Turning motion back on after a one-shot expires does not replay the animation' });

    let releaseImage, receivedImage;
    const imageGate = new Promise(resolve => { releaseImage = resolve; });
    const imageRequested = new Promise(resolve => { receivedImage = resolve; });
    await page.route('**/art/flipbook-discovery.webp', async route => { receivedImage(); await imageGate; await route.continue(); });
    try {
      await page.evaluate(() => window.__renderFlipbook({ key: 'slow-once', atlas: 'discovery' }));
      await imageRequested;
      await page.waitForTimeout(600); // The real atlas arrives after its authored one-shot window.
      releaseImage();
      await page.waitForFunction(() => document.querySelector('#flipbook-once-probe [data-frame-state="finished"]'));
      assert.equal(await oneShot.locator('.di-frame-cells').evaluate(node => getComputedStyle(node).backgroundPosition), '100% 100%');
      evidence.push({ check: 'A delayed one-shot atlas appears at its current age rather than starting a stale effect' });
    } finally { releaseImage(); }
  } finally { fixtureA.release(); await fixtureA.context.close(); }

  const fixtureB = await fixture(true);
  try {
    const { page, sprite, loader } = fixtureB;
    await page.waitForFunction(() => document.querySelector('[data-frame-atlas]')?.getAttribute('data-frame-state') === 'error');
    assert.ok(await loader.getByRole('heading', { name: 'Opening the inn…', exact: true }).isVisible());
    assert.equal(await sprite.locator('.di-frame-fallback img').evaluate(image => image.complete && image.naturalWidth > 0), true);
    await page.screenshot({ path: 'output/playwright/flipbook-loading-asset-fallback.png' });
    fixtureB.release();
    await page.getByRole('button', { name: 'Play with friends', exact: true }).waitFor();
    assert.equal(await page.locator('.di-loading-inn.is-screen').count(), 0);
    evidence.push({ check: 'Failed atlas keeps a static illustrated fallback and text; game entry still completes' });
  } finally { fixtureB.release(); await fixtureB.context.close(); }
  await writeFile('output/playwright/flipbook-loading.json', JSON.stringify({ evidence: 'Local Chromium, real atlas pixels and real application Suspense; held lazy module and one intentionally failed image request. Not a hosted or physical phone check.', checks: evidence }, null, 2));
  console.log(JSON.stringify({ passed: evidence.length, failed: 0, report: 'output/playwright/flipbook-loading.json' }));
} catch (error) {
  if (activePage && !activePage.isClosed()) await activePage.screenshot({ path: 'output/playwright/flipbook-loading-failure.png' }).catch(() => {});
  throw error;
} finally { await browser.close(); }
