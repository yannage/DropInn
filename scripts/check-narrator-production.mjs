import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

// Exercise the shipped files and consent UI without requiring hosted credentials.
const base = process.env.NARRATOR_PREVIEW_URL ?? 'http://localhost:5199';
if (!/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(base)) throw Error('Use a loopback preview server.');
await mkdir('output/playwright', { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await context.newPage(), requests = [], errors = [];
page.on('request', req => { if (/huggingface|hf\.co|xethub|narrator\.worker|\.wasm|threaded-.*\.mjs/.test(req.url())) requests.push({ url: req.url(), method: req.method() }); });
page.on('pageerror', error => errors.push(error.message));
page.on('console', msg => { if (msg.type() === 'error' || msg.text().includes('[Kitten]')) console.error(msg.text().slice(0, 350)); });
function wav(samples, sampleRate) {
  const buffer = Buffer.alloc(44 + samples.length * 2);
  buffer.write('RIFF'); buffer.writeUInt32LE(buffer.length - 8, 4); buffer.write('WAVEfmt ', 8); buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); buffer.writeUInt16LE(1, 22); buffer.writeUInt32LE(sampleRate, 24); buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32); buffer.writeUInt16LE(16, 34); buffer.write('data', 36); buffer.writeUInt32LE(samples.length * 2, 40);
  samples.forEach((value, index) => buffer.writeInt16LE(Math.round(Math.max(-1, Math.min(1, value)) * 32767), 44 + index * 2));
  return buffer;
}
async function run(texts) {
  return page.evaluate(async texts => {
    const cacheName = (await caches.keys()).find(name => name.startsWith('dropinn-kitten-'));
    if (!cacheName) throw Error('No downloaded narrator cache.');
    const cache = await caches.open(cacheName), buffers = {};
    for (const request of await cache.keys()) {
      const url = request.url;
      const name = url.endsWith('.onnx') ? 'model' : url.endsWith('.npz') ? 'voices' : url.endsWith('config.json') ? 'config' : url.endsWith('.wasm') ? 'wasm' : url.endsWith('.mjs') ? 'module' : url.includes('narrator.worker') ? 'worker' : null;
      if (name) buffers[name] = await (await cache.match(request)).arrayBuffer();
    }
    const blob = URL.createObjectURL(new Blob([buffers.worker], { type: 'text/javascript' }));
    const worker = new Worker(blob, { type: 'module' });
    const invoke = message => new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(Error('Production worker timed out.')), 60000);
      worker.onerror = event => { clearTimeout(timer); reject(Error(event.message)); };
      worker.onmessage = ({ data }) => { if (data.type === 'progress') return; clearTimeout(timer); data.type === 'error' ? reject(Error(data.message)) : resolve(data); };
      worker.postMessage(message, message.assets ? Object.values(message.assets) : []);
    });
    const start = performance.now(), output = [];
    try {
      await invoke({ id: 1, type: 'init', assets: buffers });
      const initMs = performance.now() - start;
      for (const [index, text] of texts.entries()) {
        const then = performance.now();
        const audio = await invoke({ id: index + 2, type: 'generate', text });
        const generationMs = performance.now() - then;
        output.push({ text, generationMs, duration: audio.samples.length / audio.sampleRate, finite: audio.samples.every(Number.isFinite), peak: audio.samples.reduce((m, n) => Math.max(m, Math.abs(n)), 0), samples: Array.from(audio.samples), sampleRate: audio.sampleRate });
      }
      return { initMs, output };
    } finally { worker.terminate(); URL.revokeObjectURL(blob); }
  }, texts);
}
try {
  await page.goto(base);
  const cards = page.getByRole('group', { name: 'Story choices', exact: true });
  await cards.getByRole('button', { name: /Download narrator ·/ }).first().waitFor();
  assert.equal(requests.length, 0, 'No narrator code, runtime, or model fetched before consent');
  await cards.getByRole('button', { name: /Download narrator ·/ }).first().click();
  await page.getByRole('button', { name: 'Download Bella narrator', exact: true }).click();
  await cards.getByRole('button', { name: 'Narrator downloaded', exact: true }).first().waitFor({ timeout: 180000 });
  assert.equal(await cards.getByRole('button', { name: 'Narrator downloaded', exact: true }).count(), 4, 'One download updates every story');
  assert.ok(requests.every(item => item.method === 'GET'));
  await cards.locator('article').first().screenshot({ path: 'output/playwright/narrator-bella-card-390.png' });
  const files = await page.evaluate(async () => {
    const name = (await caches.keys()).find(name => name.startsWith('dropinn-kitten-'));
    const cache = await caches.open(name);
    return Promise.all((await cache.keys()).map(async request => ({ url: request.url, bytes: (await (await cache.match(request)).arrayBuffer()).byteLength })));
  });
  const initial = await run([
    'And then Yanni got into the boat and started swimming away.',
    'Mara watches the river while Wren studies the silver tracks.',
    'Dr. Mara found 25 silver coins beside the old chapel. The frightened sheep are safe.',
    'The river curves around the village, carrying fallen leaves past the ruined chapel, while Yanni and Wren follow the silver tracks through the mud and listen for the distant bell. '.repeat(3),
  ]);
  for (const [index, audio] of initial.output.entries()) {
    assert.ok(audio.finite && audio.peak > 0.01 && audio.duration > 0.5);
    await writeFile(`output/playwright/narrator-bella-sample-${index + 1}.wav`, wav(audio.samples, audio.sampleRate));
  }
  await page.reload();
  await cards.getByRole('button', { name: 'Narrator downloaded', exact: true }).first().waitFor();
  requests.length = 0;
  await context.setOffline(true);
  const cached = await run(['And then Yanni got into the boat and started swimming away.']);
  assert.equal(requests.length, 0, 'Cached worker, runtime and model work offline without fetches');
  assert.ok(cached.output[0].finite && cached.output[0].peak > 0.01);
  await context.setOffline(false);
  await cards.getByRole('button', { name: 'Narrator downloaded', exact: true }).first().click();
  await page.getByRole('button', { name: 'Remove narrator download', exact: true }).click();
  await cards.getByRole('button', { name: /Download narrator ·/ }).first().waitFor();
  const strip = result => ({ initMs: result.initMs, output: result.output.map(({ samples, ...audio }) => audio) });
  const report = { totalBytes: files.reduce((sum, file) => sum + file.bytes, 0), files, initial: strip(initial), cached: strip(cached), errors, physicalPhone: 'Not tested' };
  assert.deepEqual(errors, []);
  await writeFile('output/playwright/narrator-bella-production.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
} catch (error) {
  await page.screenshot({ path: 'output/playwright/narrator-production-failed.png' });
  throw error;
} finally { await browser.close(); }
