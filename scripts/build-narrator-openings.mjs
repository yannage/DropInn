import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import { createServer } from 'vite';

// Offline inference through the same browser worker as the game. Public model
// files are downloaded once; text never goes to a speech service. Run with Vite
// on loopback. --plan prints scope; --check validates the committed library.
const base = process.env.NARRATOR_BUILD_URL ?? 'http://127.0.0.1:5200';
if (!/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(base)) throw Error('Use a loopback Vite development server.');
const root = process.cwd();
const output = path.join(root, 'public/audio/narrator-openings');
const manifestPath = path.join(root, 'src/lib/dropinn/narrator-openings.json');
const hash = value => createHash('sha256').update(value).digest('hex');
// Total retained catalog, not a startup download: the runtime requests only
// the selected voice's current sentence. Pinned openings remain addressable.
const MAX_BYTES = 32 * 1024 * 1024;
const FIRST_CLIP_BYTES = 350 * 1024;
const ssr = await createServer({ configFile: false, cacheDir: 'node_modules/.vite-narrator-openings', optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
let metadata, jobs, firstSentences;
try {
  const { ADVENTURE_VERSIONS } = await ssr.ssrLoadModule('/src/lib/dropinn/registry.ts');
  const { narratorSentences } = await ssr.ssrLoadModule('/src/lib/dropinn/narratorAudio.ts');
  const { narratorNaturalVoices } = await ssr.ssrLoadModule('/src/lib/dropinn/narratorVoices.ts');
  const { narratorModel, narratorRevision } = await ssr.ssrLoadModule('/src/lib/dropinn/narratorModel.ts');
  metadata = { model: narratorModel, revision: narratorRevision, format: 'pcm16-wav', sampleRate: 24000, speed: 1 };
  // Released rooms keep their pinned opening even when discovery selects a new
  // version. Deduplicate shared sentences, not the addressable story versions.
  const intros = ADVENTURE_VERSIONS.map(adventure => narratorSentences(adventure.chapters[0].intro));
  firstSentences = new Set(intros.map(segments => segments[0]));
  const texts = [...new Set(intros.flat())];
  jobs = narratorNaturalVoices.flatMap(voice => texts.map(text => {
    const identity = hash(JSON.stringify([metadata.model, metadata.revision, voice.id, voice.embedding, voice.speedPrior, 1, text, 'pcm16-wav-v1']));
    return { text, voice: voice.id, speed: 1, url: `audio/narrator-openings/${identity}.wav` };
  }));
  console.log(JSON.stringify({ adventureVersions: ADVENTURE_VERSIONS.length, segments: texts.length, wordsPerVoice: texts.join(' ').split(/\s+/).length, voices: narratorNaturalVoices.length, files: jobs.length, maxBytes: MAX_BYTES }));
} finally { await ssr.close(); }
if (process.argv.includes('--plan')) process.exit(0);

function encode(samples, sampleRate) {
  assert.equal(sampleRate, 24000);
  assert.ok(samples.length > 0 && samples.every(Number.isFinite));
  assert.ok(samples.some(sample => Math.abs(sample) > 0.01), 'Generated recording is silent');
  const buffer = Buffer.alloc(44 + samples.length * 2);
  buffer.write('RIFF'); buffer.writeUInt32LE(buffer.length - 8, 4); buffer.write('WAVEfmt ', 8);
  buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20); buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24); buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32); buffer.writeUInt16LE(16, 34); buffer.write('data', 36);
  buffer.writeUInt32LE(samples.length * 2, 40);
  samples.forEach((sample, index) => buffer.writeInt16LE(Math.round(Math.max(-1, Math.min(1, sample)) * 32767), 44 + index * 2));
  return buffer;
}

function validate(clip, buffer) {
  assert.equal(buffer.length, clip.bytes); assert.equal(hash(buffer), clip.sha256);
  assert.equal(buffer.toString('ascii', 0, 4), 'RIFF'); assert.equal(buffer.readUInt32LE(4), buffer.length - 8);
  assert.equal(buffer.toString('ascii', 8, 16), 'WAVEfmt '); assert.equal(buffer.readUInt32LE(16), 16);
  assert.equal(buffer.readUInt16LE(20), 1); assert.equal(buffer.readUInt16LE(22), 1);
  assert.equal(buffer.readUInt32LE(24), 24000); assert.equal(buffer.readUInt32LE(28), 48000);
  assert.equal(buffer.readUInt16LE(32), 2); assert.equal(buffer.readUInt16LE(34), 16);
  assert.equal(buffer.toString('ascii', 36, 40), 'data'); assert.equal(buffer.readUInt32LE(40), buffer.length - 44);
  assert.equal(clip.sampleRate, 24000); assert.equal(clip.sampleCount, (buffer.length - 44) / 2);
  assert.equal(clip.duration, clip.sampleCount / clip.sampleRate);
  assert.ok(clip.bytes <= 768 * 1024);
  assert.ok(!firstSentences.has(clip.text) || clip.bytes <= FIRST_CLIP_BYTES, 'First segment exceeds its 350 KiB budget');
}

let previous;
try { previous = JSON.parse(await readFile(manifestPath, 'utf8')); } catch { previous = undefined; }
const reusable = previous && Object.entries(metadata).every(([key, value]) => previous[key] === value) ? previous.clips : [];
const clips = [];
for (const job of jobs) {
  const old = reusable.find(clip => clip.url === job.url && clip.text === job.text && clip.voice === job.voice && clip.speed === job.speed);
  if (old) {
    try { validate(old, await readFile(path.join(root, 'public', job.url))); clips.push(old); continue; }
    catch (error) { if (process.argv.includes('--check')) throw error; }
  }
  if (process.argv.includes('--check')) throw Error(`Missing current opening: ${job.voice}: ${job.text}`);
}
if (process.argv.includes('--check')) {
  const bytes = clips.reduce((sum, clip) => sum + clip.bytes, 0);
  assert.ok(bytes <= MAX_BYTES); assert.equal(clips.length, jobs.length);
  console.log(JSON.stringify({ verified: clips.length, bytes }));
  process.exit(0);
}
await mkdir(output, { recursive: true });
const save = async () => {
  const temporary = `${manifestPath}.tmp`;
  await writeFile(temporary, `${JSON.stringify({ ...metadata, clips: jobs.flatMap(job => clips.filter(clip => clip.url === job.url)) }, null, 2)}\n`);
  await rename(temporary, manifestPath);
};
const missing = jobs.filter(job => !clips.some(clip => clip.url === job.url));
if (!missing.length) { await save(); console.log(JSON.stringify({ reused: clips.length, bytes: clips.reduce((sum, clip) => sum + clip.bytes, 0) })); process.exit(0); }
// A browser profile contains locked databases; keep it outside Vite's watched
// checkout and retain it between builds so public model files are reused.
const profilePath = path.join(tmpdir(), `dropinn-narrator-build-${hash(root).slice(0, 12)}`);
await mkdir(profilePath, { recursive: true });
const context = await chromium.launchPersistentContext(profilePath, { headless: true });
const page = await context.newPage();
try {
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (route.request().method() !== 'GET') return route.abort('blockedbyclient');
    if (url.href === `${base}/narrator-build`) return route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Local narrator recording</title>' });
    if (url.origin === base || !['http:', 'https:'].includes(url.protocol)
      || /(^|\.)(huggingface\.co|hf\.co|xethub\.com)$/.test(url.hostname)) return route.continue();
    return route.abort('blockedbyclient');
  });
  await page.goto(`${base}/narrator-build`);
  await page.evaluate(async () => {
    const { createNarratorWorker } = await import('/src/lib/dropinn/narratorDownload.ts');
    const { worker, assets } = await createNarratorWorker(true);
    window.__openingWorker = worker;
    window.__openingSerial = 0;
    window.__openingInvoke = message => new Promise((resolve, reject) => {
      const id = ++window.__openingSerial;
      const timer = setTimeout(() => reject(Error('Local speech synthesis timed out.')), 60000);
      worker.onerror = event => { clearTimeout(timer); reject(Error(event.message)); };
      worker.onmessage = ({ data }) => {
        if (data.id !== id || data.type === 'progress') return;
        clearTimeout(timer);
        data.type === 'error' ? reject(Error(data.message)) : resolve(data);
      };
      worker.postMessage({ ...message, id }, message.assets ? Object.values(message.assets) : []);
    });
    await window.__openingInvoke({ type: 'init', assets });
  });
  for (const job of missing) {
    const started = Date.now();
    const result = await page.evaluate(async job => {
      const audio = await window.__openingInvoke({ type: 'generate', text: job.text, voice: job.voice, speed: job.speed });
      if (audio.type !== 'audio') throw Error('Expected generated audio.');
      return { samples: Array.from(audio.samples), sampleRate: audio.sampleRate };
    }, job);
    const wav = encode(result.samples, result.sampleRate);
    const clip = { ...job, bytes: wav.length, sampleRate: result.sampleRate, sampleCount: result.samples.length, duration: result.samples.length / result.sampleRate, sha256: hash(wav) };
    validate(clip, wav);
    const totalBytes = clips.reduce((sum, item) => sum + item.bytes, clip.bytes);
    assert.ok(totalBytes <= MAX_BYTES, `Opening library exceeds ${MAX_BYTES} bytes; review scope before continuing.`);
    await writeFile(path.join(root, 'public', job.url), wav);
    clips.push(clip); await save();
    console.log(JSON.stringify({ completed: clips.length, total: jobs.length, voice: job.voice, duration: clip.duration, bytes: clip.bytes, totalBytes, generationMs: Date.now() - started }));
  }
} finally { await context.close(); }
