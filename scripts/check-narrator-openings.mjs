import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { createServer } from 'vite';

// Real shipped WAVs and AudioContext, with a held model transport/worker. No inference service.
const base = process.env.NARRATOR_TEST_URL ?? 'http://127.0.0.1:5200';
if (!/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(base)) throw Error('Use a loopback development server.');
const manifest = JSON.parse(await readFile('src/lib/dropinn/narrator-openings.json', 'utf8'));
assert.equal(manifest.clips.length, 96, 'Generate the full opening library before testing.');
await mkdir('output/playwright', { recursive: true });
const ssr = await createServer({ configFile: false, cacheDir: 'node_modules/.vite-narrator-openings', optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
const { createDropinnHandler } = await ssr.ssrLoadModule('/server/dropinn.ts');
const fixedNow = Date.now();
const handler = createDropinnHandler({ local: true, env: {}, now: () => fixedNow, fetch: async () => { throw Error('No server inference in this check.'); } });
const browser = await chromium.launch({ headless: true });
const results = [];

async function fixture(name) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const requests = [], errors = [];
  let releaseModel;
  const gate = new Promise(resolve => { releaseModel = resolve; });
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => {
    if (/audio\/narrator-openings|huggingface\.co/.test(request.url())) requests.push(request.url());
    if (request.method() === 'POST' && new URL(request.url()).pathname === '/api/dropinn') assert.notEqual(request.postDataJSON()?.operation, 'narrate');
  });
  await page.route('**/api/dropinn', async route => {
    const response = await handler(new Request(`${base}/api/dropinn`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: route.request().postData() }));
    await route.fulfill({ status: response.status, contentType: 'application/json', body: await response.text() });
  });
  await page.route('https://huggingface.co/KittenML/**', async route => {
    await gate;
    const path = new URL(route.request().url()).pathname;
    const bytes = path.endsWith('.onnx') ? 24369971 : path.endsWith('.npz') ? 3278902 : 688;
    try { await route.fulfill({ status: 200, contentType: 'application/octet-stream', body: Buffer.alloc(bytes) }); }
    catch { /* A canceled context can close a deliberately held request. */ }
  });
  await page.addInitScript(engine => {
    localStorage.setItem('dropinn-narrator', JSON.stringify({ engine, naturalVoice: 'Bella', speed: 1, collapsed: false }));
    window.__opening = { playback: [], requests: [], inits: [], workers: 0, clicked: 0,
      finishInit(fail = false, stale = false) {
        for (const item of this.inits.splice(0)) (stale ? item.receiver : item.worker.onmessage)?.({ data: { id: item.id, type: fail ? 'error' : 'ready', message: 'Model preparation failed for this check.' } });
      },
    };
    document.addEventListener('click', event => {
      if (event.target.closest('button')?.getAttribute('aria-label') === 'Enable narrator voice') window.__opening.clicked = performance.now();
    }, true);
    const start = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (...args) {
      if (window.__opening.failNextPlayback) throw Error('Audio playback failed for this check.');
      const samples = this.buffer.getChannelData(0);
      const record = { at: performance.now(), duration: this.buffer.duration, peak: samples.reduce((max, value) => Math.max(max, Math.abs(value)), 0), ended: false };
      this.addEventListener('ended', () => { record.ended = true; });
      const result = start.apply(this, args);
      window.__opening.playback.push(record);
      return result;
    };
    window.Worker = class {
      constructor() { window.__opening.workers++; this.alive = true; }
      postMessage(message) {
        window.__opening.requests.push({ type: message.type, text: message.text });
        if (message.type === 'init') window.__opening.inits.push({ worker: this, id: message.id, receiver: this.onmessage });
        if (message.type === 'generate') setTimeout(() => { if (this.alive) this.onmessage?.({ data: { id: message.id, type: 'error', message: 'Unexpected dynamic speech for an exact opening.' } }); }, 0);
      }
      terminate() { this.alive = false; }
    };
  }, ['preparation-failure', 'playback-failure'].includes(name) ? 'natural' : 'auto');
  await page.goto(`${base}/?session=opening${name}${Date.now()}`);
  await page.getByRole('button', { name: 'Play with friends', exact: true }).click();
  await page.getByRole('button', { name: 'Start a friend table', exact: true }).click();
  await page.getByRole('region', { name: 'Story narrator', exact: true }).waitFor();
  assert.equal(requests.length, 0, 'Opening audio and model assets stay idle before Listen.');
  return { page, context, requests, errors, releaseModel };
}

const hidden = (page, value) => page.evaluate(value => { Object.defineProperty(document, 'hidden', { configurable: true, value }); document.dispatchEvent(new Event('visibilitychange')); }, value);
const listen = async page => {
  await page.getByRole('button', { name: 'Enable narrator voice', exact: true }).click();
  await page.waitForFunction(() => window.__opening.playback.length > 0);
  const record = await page.evaluate(() => ({ ...window.__opening.playback[0], firstAudioMs: window.__opening.playback[0].at - window.__opening.clicked, workers: window.__opening.workers }));
  assert.ok(record.peak > 0.01, 'Real opening audio is non-silent.');
  assert.equal(record.workers, 0, 'Opening starts while model transfer is held.');
  return record;
};
const complete = page => page.waitForFunction(() => window.__opening.playback.length === 2 && window.__opening.playback.every(item => item.ended), null, { timeout: 20000 });
const noExtraPlayback = async (page, count) => {
  await page.waitForTimeout(350);
  assert.equal(await page.evaluate(() => window.__opening.playback.length), count);
  assert.equal(await page.evaluate(() => window.__opening.requests.filter(item => item.type === 'generate').length), 0);
};

try {
  for (const scenario of ['late-ready', 'ready-during-opening', 'preparation-failure', 'playback-failure', 'cancel']) {
    const f = await fixture(scenario);
    try {
      const first = await listen(f.page);
      f.releaseModel();
      await f.page.waitForFunction(() => window.__opening.inits.length === 1);
      if (scenario === 'late-ready') {
        await complete(f.page);
        await hidden(f.page, true);
        await f.page.evaluate(() => window.__opening.finishInit());
        await f.page.waitForTimeout(100);
        await hidden(f.page, false);
        await noExtraPlayback(f.page, 2);
        for (const viewport of [{ width: 390, height: 844 }, { width: 320, height: 568 }]) {
          await f.page.setViewportSize(viewport);
          await f.page.getByRole('button', { name: 'Story settings', exact: true }).click();
          const box = await f.page.getByRole('group', { name: 'Story settings' }).boundingBox();
          assert.ok(box.x >= 0 && box.x + box.width <= viewport.width && box.y + box.height <= viewport.height);
          await f.page.screenshot({ path: `output/playwright/narrator-openings-${viewport.width}.png` });
          await f.page.getByRole('button', { name: 'Close story settings', exact: true }).click();
        }
      } else if (scenario === 'playback-failure') {
        await f.page.evaluate(() => { window.__opening.failNextPlayback = true; });
        await f.page.getByRole('button', { name: 'Enable narrator voice', exact: true }).waitFor();
        await f.page.evaluate(() => window.__opening.finishInit(false, true));
        await noExtraPlayback(f.page, 1);
        await f.page.getByRole('button', { name: 'Enable narrator voice', exact: true }).waitFor();
        assert.match(await f.page.locator('.di-narrator-error').textContent(), /Audio playback failed/);
      } else if (scenario === 'cancel') {
        await f.page.getByRole('button', { name: 'Mute narrator', exact: true }).click();
        const count = await f.page.evaluate(() => window.__opening.playback.length);
        await f.page.evaluate(() => window.__opening.finishInit(false, true));
        await noExtraPlayback(f.page, count);
        await f.page.getByRole('button', { name: 'Enable narrator voice', exact: true }).waitFor();
      } else {
        await f.page.evaluate(fail => window.__opening.finishInit(fail), scenario === 'preparation-failure');
        await complete(f.page);
        await noExtraPlayback(f.page, 2);
        if (scenario === 'preparation-failure') assert.match(await f.page.locator('.di-narrator-error').textContent(), /opening can keep playing/);
      }
      assert.deepEqual(f.errors, []);
      const clips = f.requests.filter(url => url.includes('/audio/narrator-openings/'));
      assert.ok(clips.length <= 2, 'Only this passage is loaded, not the whole library.');
      results.push({ scenario, firstAudioMs: first.firstAudioMs, firstClipBytes: manifest.clips[0].bytes, audioRequests: clips.length, playback: await f.page.evaluate(() => window.__opening.playback), errors: f.errors });
      console.log(JSON.stringify(results.at(-1)));
    } finally { f.releaseModel(); await f.context.close(); }
  }
  await writeFile('output/playwright/narrator-openings.json', JSON.stringify({ evidence: 'Real WAV playback, held model transport and mock initialization; no subjective listening or physical phone claim.', results }, null, 2));
} finally { await browser.close(); await ssr.close(); }
