import assert from 'node:assert/strict';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright';
import { createServer } from 'vite';

// Real independent browser identities, production command handler, local memory.
// The fixed clock keeps comparison screens stable; gameplay state is never injected.
const origin = new URL(process.argv[2] ?? 'http://127.0.0.1:5208');
assert.ok(origin.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(origin.hostname)
  && origin.pathname === '/' && !origin.search && !origin.hash && !origin.username && !origin.password,
  'Use a plain HTTP loopback origin.');
const base = origin.origin, checks = [], errors = [], records = [], contexts = [], pages = [];
const preferenceKey = 'dropinn:lobby-story:v1', now = Date.now();
let ssr, browser, handler, sourceFingerprint, choices;
const note = (name, details = {}) => { checks.push({ name, ...details }); console.log(name); };
const editions = [
  { id: 'mosswater', version: 1, title: 'Mosswater: The Well That Growled' },
  { id: 'gemward', version: 3, edition: 'Story table' },
  { id: 'gemward', version: 2, edition: 'Branching map' },
];

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map(entry => entry.isDirectory() ? sourceFiles(`${directory}/${entry.name}`)
    : /\.(tsx?|css|png|webp)$/.test(entry.name) ? [`${directory}/${entry.name}`] : []))).flat();
}
async function fingerprint() {
  const files = [...await sourceFiles('src/components/DropInn'), ...await sourceFiles('src/lib/dropinn'),
    'src/store/adventureStore.ts', 'server/dropinn.ts', ...await sourceFiles('public/art')];
  const hashes = await Promise.all(files.sort().map(async file => [file, createHash('sha256').update(await readFile(file)).digest('hex')]));
  return createHash('sha256').update(JSON.stringify(hashes)).digest('hex');
}
async function bind(page) {
  await page.evaluate(async () => {
    const loaded = performance.getEntriesByType('resource').map(entry => new URL(entry.name))
      .filter(url => url.origin === location.origin && url.pathname === '/src/store/adventureStore.ts')
      .sort((a, b) => Number(b.searchParams.get('t') ?? 0) - Number(a.searchParams.get('t') ?? 0));
    window.__selectionStore = (await import(loaded[0]?.href ?? '/src/store/adventureStore.ts')).useAdventureStore;
  });
}
async function state(page) {
  await bind(page);
  return page.evaluate(() => { const s = window.__selectionStore.getState(); return { room: s.room, userId: s.userId, backend: s.backend, error: s.error }; });
}
async function settled(page, inRoom = true) {
  await page.locator(inRoom ? '.qr-adventure,.gm-adventure,.exp-adventure' : '.di-lobby-play').waitFor({ timeout: 30_000 });
  await bind(page);
  await page.waitForFunction(inRoom => {
    const s = window.__selectionStore.getState(); return s.ready && !s.loading && (inRoom ? !!s.room : !s.room);
  }, inRoom, { timeout: 15_000 });
  if (!inRoom) await page.locator('.di-lobby-play').waitFor();
}
async function open(label, initialPreference) {
  console.log(`Story selection QA: create browser ${label}`);
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, reducedMotion: 'reduce' });
  contexts.push(context);
  await context.addInitScript(({ now, preferenceKey, initialPreference }) => {
    Date.now = () => now;
    if (initialPreference !== undefined && !sessionStorage.getItem('selection-qa-seeded')) {
      localStorage.setItem(preferenceKey, initialPreference); sessionStorage.setItem('selection-qa-seeded', 'yes');
    }
  }, { now, preferenceKey, initialPreference });
  const page = await context.newPage(); pages.push(page);
  page.on('pageerror', error => errors.push({ page: label, message: error.message }));
  page.on('response', response => { const url = new URL(response.url()); if (url.pathname.startsWith('/art/') && response.status() >= 400) errors.push({ page: label, message: `Artwork ${response.status()}: ${url.pathname}` }); });
  await page.route('**/*', route => { const url = new URL(route.request().url()); return ['http:', 'https:'].includes(url.protocol) && url.origin !== base ? route.abort('blockedbyclient') : route.fallback(); });
  await page.route('**/api/dropinn', async route => {
    const payload = route.request().postDataJSON();
    const response = await handler(new Request(`${base}/api/dropinn`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }));
    const body = await response.text();
    if (['play', 'join'].includes(payload.operation)) records.push({ page: label, operation: payload.operation,
      adventureId: payload.adventureId, adventureVersion: payload.adventureVersion, visibility: payload.visibility, status: response.status });
    return route.fulfill({ status: response.status, contentType: 'application/json', body });
  });
  console.log(`Story selection QA: load lobby ${label}`);
  await page.goto(`${base}/?session=selectionqa${label}`); await settled(page, false);
  console.log(`Story selection QA: lobby ready ${label}`);
  assert.equal((await state(page)).backend, 'local');
  return page;
}
async function requestClick(page, operation, locator, status = 200) {
  const waiting = page.waitForResponse(response => response.url() === `${base}/api/dropinn`
    && response.request().postDataJSON()?.operation === operation);
  const [response] = await Promise.all([waiting, locator.click()]);
  assert.equal(response.status(), status, await response.text()); return response.json();
}
function choiceLabel(choice) {
  if (choice.id === 'gemward') return new RegExp(`^Select story: Gemward:.* · ${choice.edition}$`);
  return `Select story: ${choice.title}`;
}
async function select(page, choice) {
  await page.getByRole('button', { name: 'Change story', exact: true }).click();
  await page.getByRole('button', { name: choiceLabel(choice), exact: true }).click();
  await page.waitForFunction(({ key, value }) => localStorage.getItem(key) === value, { key: preferenceKey, value: `${choice.id}@${choice.version}` });
  assert.match(await page.locator('.di-lobby-postcard').innerText(), new RegExp(choice.id === 'mosswater' ? 'Mosswater' : 'Gemward'));
  if (choice.edition) assert.ok((await page.locator('.di-lobby-postcard').textContent()).includes(choice.edition));
}
async function layout(page, name, selector = '.di-lobby') {
  for (const [width, height] of [[320, 568], [390, 844], [1280, 900]]) {
    await page.setViewportSize({ width, height });
    await page.evaluate(async () => {
      window.scrollTo(0, 0);
      const images = [...document.images].filter(image => image.getClientRects().length);
      // Full-page QA also inspects offscreen cards; don't hang on lazy images
      // that would ordinarily be requested only after scrolling to that card.
      images.forEach(image => { image.loading = 'eager'; });
      await Promise.race([Promise.all(images.map(image => image.decode().catch(() => {}))), new Promise(resolve => setTimeout(resolve, 8000))]);
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    });
    const metrics = await page.locator(selector).evaluate(node => ({
      overflow: document.documentElement.scrollWidth > innerWidth + 1,
      unillustratedCards: [...node.querySelectorAll('.di-lobby-postcard,.di-lobby-story-choices > article')].filter(card => !card.querySelector('img.di-scene-art')).length,
      images: [...node.querySelectorAll('img')].filter(image => image.getClientRects().length).map(image => ({ src: new URL(image.src).pathname, loaded: image.complete && image.naturalWidth > 0 })),
      controls: [...node.querySelectorAll('.di-lobby-play,[aria-label^="Select story:"]')].filter(control => control.getClientRects().length).map(control => { const rect = control.getBoundingClientRect(); return { width: rect.width, height: rect.height }; }),
    }));
    assert.equal(metrics.overflow, false, `${name}/${width}: horizontal overflow`);
    assert.equal(metrics.unillustratedCards, 0, `${name}/${width}: a story card fell back to a missing illustration`);
    assert.deepEqual(metrics.images.filter(image => !image.loaded), [], `${name}/${width}: missing artwork`);
    assert.ok(metrics.controls.every(control => control.width >= 44 && control.height >= 44), `${name}/${width}: controls below 44px`);
    await page.screenshot({ path: `output/playwright/story-selection-${name}-${width}.png`, fullPage: true, animations: 'disabled', mask: [page.locator('input[readonly]')] });
    note(`${name}: layout and loaded artwork at ${width}×${height}`, { images: metrics.images.length });
  }
  await page.setViewportSize({ width: 390, height: 844 });
}
async function enter(page, choice, privateTable = false) {
  let response;
  if (privateTable) {
    await page.getByRole('button', { name: 'Play with friends', exact: true }).click();
    response = await requestClick(page, 'play', page.getByRole('button', { name: 'Start a friend table', exact: true }));
  } else response = await requestClick(page, 'play', page.locator('.di-lobby-play'));
  await settled(page);
  assert.equal(response.backend, 'local');
  assert.equal(response.room.adventureId, choice.id); assert.equal(response.room.adventureVersion, choice.version);
  assert.equal(response.room.visibility ?? 'public', privateTable ? 'private' : 'public');
  return response.room;
}
async function leave(page) {
  const { room } = await state(page);
  if (!room) return;
  if (room.adventureId === 'mosswater') await page.getByRole('button', { name: 'Open expedition settings', exact: true }).click();
  else await page.getByRole('button', { name: 'Open adventure menu', exact: true }).click();
  await requestClick(page, 'command', page.getByRole('button', { name: 'Leave the table', exact: true }));
  await page.getByRole('button', { name: 'Back to the inn', exact: true }).click(); await settled(page, false);
}
async function invitation(page, choice) {
  if (choice.id === 'mosswater') {
    await page.getByRole('button', { name: 'Open expedition settings', exact: true }).click();
    await page.getByRole('button', { name: 'Party & invitation', exact: true }).click();
    const link = await page.getByRole('textbox', { name: 'Bring a friend', exact: true }).inputValue();
    await page.keyboard.press('Escape'); return link;
  }
  await page.getByRole('button', { name: 'Open adventure menu', exact: true }).click();
  await page.getByRole('button', { name: 'Party & invitations', exact: true }).click();
  const link = await page.getByRole('textbox', { name: 'Full invitation link', exact: true }).inputValue();
  await page.keyboard.press('Escape'); return link;
}

try {
  console.log('Story selection QA: fingerprinting source and artwork');
  await mkdir('output/playwright', { recursive: true }); sourceFingerprint = await fingerprint();
  console.log('Story selection QA: loading isolated command handler');
  ssr = await createServer({ configFile: false, cacheDir: 'node_modules/.vite-selection-tests', optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  const { createDropinnHandler } = await ssr.ssrLoadModule('/server/dropinn.ts');
  handler = createDropinnHandler({ local: true, env: {}, now: () => now, fetch: async () => { throw Error('No external services in story selection QA.'); } });
  console.log('Story selection QA: opening two local browser identities');
  browser = await chromium.launch({ headless: true });
  const a = await open('a'), b = await open('b');
  await a.getByRole('button', { name: 'Change story', exact: true }).click();
  choices = await a.getByRole('button', { name: /^Select story:/ }).evaluateAll(buttons => buttons.map(button => button.getAttribute('aria-label')));
  assert.ok(choices.length >= 8, `All current stories and prior Gemward editions must remain selectable: ${choices.length}`);
  for (const choice of editions) assert.equal(await a.getByRole('button', { name: choiceLabel(choice), exact: true }).count(), 1);
  await layout(a, 'picker', '.di-lobby-story-picker'); await a.keyboard.press('Escape');
  for (const choice of editions) {
    const key = `${choice.id}-v${choice.version}`;
    await select(a, choice); await a.reload(); await settled(a, false);
    assert.equal(await a.evaluate(key => localStorage.getItem(key), preferenceKey), `${choice.id}@${choice.version}`);
    if (choice.edition) assert.ok((await a.locator('.di-lobby-postcard').textContent()).includes(choice.edition));
    assert.match(await a.locator('.di-lobby-collection').innerText(), /This adventure awards keepsakes/,
      'Mosswater and Gemward must not promise the Thread reward reserved for classic tales.');
    await layout(a, `${key}-lobby`);
    note(`${key}: selected edition remembered after reload`);
    if (choice.id === 'mosswater') {
      await a.locator('.di-lobby-story-options > summary').click();
      assert.equal(await a.locator('.di-lobby-story-options .di-keepsake-art img').count(), 3, 'Each Mosswater milestone has its own illustrated keepsake.');
      await layout(a, 'mosswater-rewards');
    }
    const publicRoom = await enter(a, choice);
    await select(b, choice); const matchedRoom = await enter(b, choice);
    assert.equal(matchedRoom.code, publicRoom.code); assert.notEqual((await state(a)).userId, (await state(b)).userId);
    await layout(a, `${key}-table`, choice.id === 'mosswater' ? '.qr-adventure' : '.gm-adventure');
    await b.reload(); await settled(b); assert.equal((await state(b)).room.code, publicRoom.code);
    assert.equal((await state(b)).room.adventureVersion, choice.version);
    note(`${key}: independent public player matches exact release and restores its pin after reload`);
    await leave(b); await leave(a);
    await select(a, choice); const privateRoom = await enter(a, choice, true);
    assert.notEqual(privateRoom.code, publicRoom.code);
    const link = await invitation(a, choice);
    const different = choice.id === 'mosswater' ? editions[1] : editions[0]; await select(b, different);
    await b.getByRole('button', { name: 'Play with friends', exact: true }).click();
    const input = b.getByRole('textbox', { name: 'Adventure code or invitation link', exact: true });
    await input.fill(privateRoom.code);
    await requestClick(b, 'join', b.getByRole('button', { name: 'Join adventure by code', exact: true }), 409);
    await input.fill(link);
    const joined = await requestClick(b, 'join', b.getByRole('button', { name: 'Join adventure by code', exact: true }));
    await settled(b);
    assert.equal(joined.room.code, privateRoom.code); assert.equal(joined.room.adventureId, choice.id); assert.equal(joined.room.adventureVersion, choice.version);
    assert.equal(await b.evaluate(key => localStorage.getItem(key), preferenceKey), `${different.id}@${different.version}`);
    note(`${key}: private creation uses selected release; full invitation preserves pin despite another selected story`);
    await leave(b); await leave(a);
  }
  for (const [legacy, current] of [['gemward', 'gemward@3'], ['briar-glen', 'briar-glen@4'], ['unavailable-story@91', 'mosswater@1']]) {
    const page = await open(`saved${legacy === 'gemward' ? 'gem' : legacy === 'briar-glen' ? 'briar' : 'bad'}`, legacy);
    await page.waitForFunction(({ key, value }) => localStorage.getItem(key) === value, { key: preferenceKey, value: current });
    note(`Stored selection ${legacy}: resolves to ${current}`);
  }
  assert.equal(await fingerprint(), sourceFingerprint, 'Source or art changed during capture. Run again against stable final files.');
  assert.deepEqual(errors, []);
} catch (error) {
  errors.push({ message: error.stack ?? String(error) }); process.exitCode = 1;
  for (let index = 0; index < pages.length; index++) await pages[index].screenshot({ path: `output/playwright/story-selection-failure-${index}.png`, fullPage: true, mask: [pages[index].locator('input')] }).catch(() => {});
} finally {
  await writeFile('output/playwright/story-selection-results.json', JSON.stringify({ backend: 'isolated real local handler', clock: 'fixed authoritative and client clock; no gameplay state injection', sourceFingerprint, choices, checks, errors, requests: records, hosted: false }, null, 2));
  for (const context of contexts) await context.close().catch(() => {});
  await browser?.close(); await ssr?.close(); console.log(JSON.stringify({ checks: checks.length, errors }));
}
