import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { createServer } from 'vite';

// Shipped assets and one-click playback, with an isolated local command handler.
// Only public static voice files leave loopback; no hosted game or inference writes.
// Build with VITE_SUPABASE_URL=https://narrator-qa.invalid and
// VITE_SUPABASE_ANON_KEY=narrator-qa-public-key for this production UI fixture.
const base = process.env.NARRATOR_PREVIEW_URL ?? 'http://localhost:5199';
if (!/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(base)) throw Error('Use a loopback preview server.');
await mkdir('output/playwright', { recursive: true });
const ssr = await createServer({ configFile: false, cacheDir: 'node_modules/.vite-narrator-production', optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'error' });
const { createDropinnHandler } = await ssr.ssrLoadModule('/server/dropinn.ts');
const { createCharacterProfile } = await ssr.ssrLoadModule('/src/lib/character.ts');
const { emptyCollection } = await ssr.ssrLoadModule('/src/lib/dropinn/collection.ts');
const fixedNow = Date.now();
const handler = createDropinnHandler({ local: true, env: {}, now: () => fixedNow, fetch: async () => { throw Error('No server inference in this check.'); } });
const userId = randomUUID(), character = createCharacterProfile('Wren', 'wizard'), collection = emptyCollection();
const account = { id: userId, guest: true, identities: [], heroes: [{ playerId: userId, character }], selectedCharacterId: character.id, capabilities: { heroSlots: 1, payments: false }, providers: { google: false, email: false }, collection };
const expiry = Math.floor(Date.now() / 1000) + 3600;
const token = [Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'), Buffer.from(JSON.stringify({ sub: userId, aud: 'authenticated', role: 'authenticated', exp: expiry })).toString('base64url'), 'fixture-signature'].join('.');
const session = { access_token: token, refresh_token: 'fixture-refresh-token', token_type: 'bearer', expires_in: 3600, expires_at: expiry, user: { id: userId, aud: 'authenticated', role: 'authenticated', is_anonymous: true, app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() } };
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await context.newPage(), requests = [], errors = [];
await page.route('**/*', route => {
  const url = new URL(route.request().url());
  if (url.origin === base || !['http:', 'https:'].includes(url.protocol)) return route.continue();
  if (route.request().method() === 'GET' && /(^|\.)(huggingface\.co|hf\.co|xethub\.com)$/.test(url.hostname)) return route.continue();
  if (url.hostname === 'fonts.googleapis.com') return route.fulfill({ status: 200, contentType: 'text/css', body: '/* Optional external fonts omitted from this isolated fixture. */' });
  return route.abort('blockedbyclient');
});
// The tested production UI does not need a hosted Realtime connection.
await page.routeWebSocket('**/*', socket => socket.close());
await page.route('**/api/dropinn', async route => {
  const payload = route.request().postDataJSON();
  if (payload.operation === 'account' || payload.operation === 'collection') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ backend: 'local', account, collection }) });
  const response = await handler(new Request(`${base}/api/dropinn`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...payload, sessionId: userId, character }) }));
  await route.fulfill({ status: response.status, contentType: 'application/json', body: await response.text() });
});
page.on('request', req => { if (/huggingface|hf\.co|xethub|narrator\.worker|\.wasm|threaded-.*\.mjs/.test(req.url())) requests.push({ url: req.url(), method: req.method() }); });
page.on('pageerror', error => errors.push(error.message));
page.on('console', msg => { if (msg.type() === 'error') console.error(msg.text().slice(0, 350)); });
await page.addInitScript(({ session }) => {
  localStorage.setItem('dropinn-auth', JSON.stringify(session));
  if (!localStorage.getItem('dropinn-narrator')) localStorage.setItem('dropinn-narrator', JSON.stringify({ engine: 'natural', naturalVoice: 'Bella', speed: 1 }));
  window.__narratorProduction = { messages: [], playback: [] };
  const OriginalWorker = window.Worker;
  window.Worker = class extends OriginalWorker {
    constructor(...args) {
      super(...args);
      this.requests = new Map();
      this.addEventListener('message', ({ data }) => {
        if (data.type !== 'audio' && data.type !== 'error') return;
        const request = this.requests.get(data.id);
        window.__narratorProduction.messages.push({ type: data.type, at: performance.now(), text: request?.text, voice: request?.voice ?? 'Bella', duration: data.samples?.length / data.sampleRate, message: data.message });
      });
    }
    postMessage(message, ...args) {
      if (message?.type === 'generate') this.requests.set(message.id, message);
      return super.postMessage(message, ...args);
    }
  };
  const start = AudioBufferSourceNode.prototype.start;
  AudioBufferSourceNode.prototype.start = function (...args) {
    const result = start.apply(this, args);
    window.__narratorProduction.playback.push({ at: performance.now(), duration: this.buffer?.duration });
    return result;
  };
}, { session });

function wav(samples, sampleRate) {
  const buffer = Buffer.alloc(44 + samples.length * 2);
  buffer.write('RIFF'); buffer.writeUInt32LE(buffer.length - 8, 4); buffer.write('WAVEfmt ', 8); buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); buffer.writeUInt16LE(1, 22); buffer.writeUInt32LE(sampleRate, 24); buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32); buffer.writeUInt16LE(16, 34); buffer.write('data', 36); buffer.writeUInt32LE(samples.length * 2, 40);
  samples.forEach((value, index) => buffer.writeInt16LE(Math.round(Math.max(-1, Math.min(1, value)) * 32767), 44 + index * 2));
  return buffer;
}

async function waitForPlayback() {
  await page.waitForFunction(() => window.__narratorProduction.playback.length > 0
    || window.__narratorProduction.messages.some(item => item.type === 'error')
    || [...document.querySelectorAll('button')].some(button => button.textContent === 'Retry voice'), {}, { timeout: 210000 });
  const result = await page.evaluate(() => window.__narratorProduction);
  assert.ok(result.playback.length > 0, JSON.stringify({ result, status: await page.locator('.di-narrator-error').allTextContents() }));
  assert.ok(result.messages.some(item => item.type === 'audio'), 'Real worker audio reached the playback layer');
  return result;
}

// Run controlled samples through the production worker already saved by Listen.
async function run(samples) {
  return page.evaluate(async samples => {
    const cacheName = (await caches.keys()).find(name => name.startsWith('dropinn-kitten-'));
    if (!cacheName) throw Error('No saved narrator cache.');
    const cache = await caches.open(cacheName), buffers = {};
    for (const request of await cache.keys()) {
      const url = request.url;
      const name = url.endsWith('.onnx') ? 'model' : url.endsWith('.npz') ? 'voices' : url.endsWith('config.json') ? 'config' : url.endsWith('.wasm') ? 'wasm' : url.endsWith('.mjs') ? 'module' : url.includes('narrator.worker') ? 'worker' : null;
      if (name) buffers[name] = await (await cache.match(request)).arrayBuffer();
    }
    for (const name of ['worker', 'model', 'voices', 'config', 'wasm', 'module']) if (!buffers[name]) throw Error(`Missing cached ${name}.`);
    const { worker: workerBytes, ...assets } = buffers;
    const blob = URL.createObjectURL(new Blob([workerBytes], { type: 'text/javascript' }));
    const worker = new Worker(blob, { type: 'module' });
    const invoke = message => new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(Error('Production worker timed out.')), 60000);
      worker.onerror = event => { clearTimeout(timer); reject(Error(event.message)); };
      worker.onmessage = ({ data }) => { if (data.id !== message.id || data.type === 'progress') return; clearTimeout(timer); data.type === 'error' ? reject(Error(data.message)) : resolve(data); };
      worker.postMessage(message, message.assets ? Object.values(message.assets) : []);
    });
    const start = performance.now(), output = [];
    try {
      await invoke({ id: 1, type: 'init', assets });
      const initMs = performance.now() - start;
      for (const [index, sample] of samples.entries()) {
        const then = performance.now();
        const audio = await invoke({ id: index + 2, type: 'generate', speed: 1, voice: 'Bella', ...sample });
        output.push({ ...sample, generationMs: performance.now() - then, duration: audio.samples.length / audio.sampleRate, finite: audio.samples.every(Number.isFinite), peak: audio.samples.reduce((m, n) => Math.max(m, Math.abs(n)), 0), samples: Array.from(audio.samples), sampleRate: audio.sampleRate });
      }
      return { initMs, output };
    } finally { worker.terminate(); URL.revokeObjectURL(blob); }
  }, samples);
}

try {
  await page.goto(`${base}/?session=productionvoice${Date.now()}`);
  await page.getByRole('button', { name: 'Play with friends', exact: true }).click();
  await page.getByRole('button', { name: 'Start a friend table', exact: true }).click();
  await page.getByRole('region', { name: 'Story narrator', exact: true }).waitFor();
  assert.equal(requests.length, 0, 'No voice runtime or model fetched before Listen');
  const firstClick = Date.now();
  await page.getByRole('button', { name: 'Enable narrator voice', exact: true }).click();
  const firstPlayback = await waitForPlayback(), firstPlaybackMs = Date.now() - firstClick;
  assert.ok(requests.length > 0 && requests.every(item => item.method === 'GET'), 'Natural narration loads only static files');
  await page.getByRole('button', { name: 'Mute narrator', exact: true }).click();
  await page.getByRole('button', { name: 'Story settings', exact: true }).click();
  const voiceNames = await page.getByRole('combobox', { name: 'Storyteller', exact: true }).locator('option').evaluateAll(options => options.map(option => option.value));
  assert.deepEqual(voiceNames, ['Bella', 'Jasper', 'Luna', 'Bruno', 'Rosie', 'Hugo', 'Kiki', 'Leo']);
  await page.screenshot({ path: 'output/playwright/narrator-production-settings-390.png' });
  const files = await page.evaluate(async () => {
    const name = (await caches.keys()).find(name => name.startsWith('dropinn-kitten-'));
    const cache = await caches.open(name);
    return Promise.all((await cache.keys()).map(async request => ({ url: request.url, bytes: (await (await cache.match(request)).arrayBuffer()).byteLength })));
  });
  const sampleText = 'And then Yanni got into the boat and started swimming away.';
  const initial = await run([
    { voice: 'Bella', text: sampleText },
    ...voiceNames.map(voice => ({ voice, text: 'The story begins.' })),
    { voice: 'Bella', text: 'Dr. Mara found 25 silver coins beside the old chapel. The frightened sheep are safe.' },
  ]);
  const fingerprints = new Set();
  for (const [index, audio] of initial.output.entries()) {
    assert.ok(audio.finite && audio.peak > 0.01 && audio.duration > 0.5, `${audio.voice}: non-silent finite speech`);
    const encoded = wav(audio.samples, audio.sampleRate);
    if (audio.text === 'The story begins.') fingerprints.add(createHash('sha256').update(encoded).digest('hex'));
    await writeFile(`output/playwright/narrator-${audio.voice.toLowerCase()}-sample-${index + 1}.wav`, encoded);
  }
  assert.equal(fingerprints.size, 8, 'Every selected voice produces distinct speech');
  await page.reload();
  await page.getByRole('button', { name: 'Enable narrator voice', exact: true }).waitFor();
  requests.length = 0;
  const cachedClick = Date.now();
  await page.getByRole('button', { name: 'Enable narrator voice', exact: true }).click();
  const cachedPlayback = await waitForPlayback(), cachedPlaybackMs = Date.now() - cachedClick;
  assert.equal(requests.length, 0, 'A second visit reuses every cached voice asset');
  await page.getByRole('button', { name: 'Mute narrator', exact: true }).click();
  await context.setOffline(true);
  const cached = await run([{ voice: 'Bella', text: sampleText, speed: 1.5 }]);
  assert.ok(cached.output[0].duration < initial.output[0].duration * 0.85, '1.5× synthesis produces shorter speech');
  await writeFile('output/playwright/narrator-bella-fast.wav', wav(cached.output[0].samples, cached.output[0].sampleRate));
  assert.equal(requests.length, 0, 'Cached production worker, runtime and model synthesize offline');
  assert.ok(cached.output[0].finite && cached.output[0].peak > 0.01);
  await context.setOffline(false);
  await page.getByRole('button', { name: 'Story settings', exact: true }).click();
  await page.getByRole('button', { name: 'Voice storage · ready', exact: true }).click();
  await page.getByRole('button', { name: /^(Remove narrator download|Remove saved voice|Remove voice files)$/ }).click();
  await page.waitForFunction(async () => !(await caches.keys()).some(name => name.startsWith('dropinn-kitten-')));
  const strip = result => ({ initMs: result.initMs, output: result.output.map(({ samples, ...audio }) => audio) });
  const report = { firstPlaybackMs, cachedPlaybackMs, firstPlayback, cachedPlayback, voices: voiceNames, totalBytes: files.reduce((sum, file) => sum + file.bytes, 0), files, initial: strip(initial), cached: strip(cached), errors, physicalPhone: 'Not tested' };
  assert.deepEqual(errors, []);
  await writeFile('output/playwright/narrator-bella-production.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
} catch (error) {
  await page.screenshot({ path: 'output/playwright/narrator-production-failed.png' });
  throw error;
} finally { await browser.close(); await ssr.close(); }
