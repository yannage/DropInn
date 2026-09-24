import * as ort from 'onnxruntime-web/wasm';
import { phonemize } from 'phonemizer';
import { bellaVoice, kittenText, kittenTokens } from './kittenInput';
import { splitNarratorClause, type NarratorRequest, type NarratorResponse } from './narratorAudio';
import type { NarratorAssets } from './narratorModel';

const send = (message: NarratorResponse, transfer: Transferable[] = []) => self.postMessage(message, { transfer });
let session: ort.InferenceSession | undefined;
let voice: Float32Array;
let speed = 0.8;

async function initialize(assets: NarratorAssets) {
  const config = JSON.parse(new TextDecoder().decode(assets.config));
  if (config.voice_aliases?.Bella !== 'expr-voice-2-f' || config.speed_priors?.['expr-voice-2-f'] !== 0.8) throw Error('Unexpected Nano voice configuration.');
  voice = bellaVoice(assets.voices);
  speed = config.speed_priors['expr-voice-2-f'];
  ort.env.wasm.numThreads = 1;
  ort.env.wasm.initTimeout = 10000;
  ort.env.wasm.proxy = false;
  ort.env.wasm.wasmBinary = assets.wasm;
  const moduleUrl = URL.createObjectURL(new Blob([assets.module], { type: 'text/javascript' }));
  ort.env.wasm.wasmPaths = { mjs: moduleUrl };
  try {
    session = await ort.InferenceSession.create(assets.model, { executionProviders: ['wasm'], graphOptimizationLevel: 'all' });
    await phonemize('Ready.', 'en-us');
  } finally { URL.revokeObjectURL(moduleUrl); }
}

async function generate(input: string): Promise<Float32Array> {
  const text = kittenText(input);
  if (!text) throw Error('There is no text to read.');
  const tokens = kittenTokens((await phonemize(text, 'en-us')).join(' '));
  if (text.length > 300 || tokens.length > 400) {
    const [left, right] = splitNarratorClause(input);
    const a = await generate(left), b = await generate(right);
    const combined = new Float32Array(a.length + 2400 + b.length);
    combined.set(a); combined.set(b, a.length + 2400); return combined;
  }
  const row = Math.min(Array.from(text).length, voice.length / 256 - 1);
  const inputs = {
    input_ids: new ort.Tensor('int64', tokens, [1, tokens.length]),
    style: new ort.Tensor('float32', voice.slice(row * 256, (row + 1) * 256), [1, 256]),
    speed: new ort.Tensor('float32', [speed], [1]),
  };
  const output = await session!.run(inputs);
  try {
    const raw = output[session!.outputNames[0]].data;
    if (!(raw instanceof Float32Array) || raw.length <= 5000 || raw.some(value => !Number.isFinite(value))) throw Error('Speech generation failed.');
    return raw.slice(0, -5000); // Official Nano pipeline removes its trailing pad.
  } finally { Object.values(inputs).forEach(tensor => tensor.dispose()); Object.values(output).forEach(tensor => tensor.dispose()); }
}

let queue = Promise.resolve();
const canceled = new Set<number>();
self.onmessage = (event: MessageEvent<NarratorRequest | { type: 'cancel'; id: number }>) => {
  const request = event.data;
  if (request.type === 'cancel') { canceled.add(request.id); return; }
  queue = queue.then(async () => {
    if (canceled.delete(request.id)) return;
    try {
      if (request.type === 'init') {
        if (!request.assets) throw Error('Please download the narrator first.');
        if (!session) await initialize(request.assets);
        send({ id: request.id, type: 'ready' });
      } else {
        if (!session) throw Error('The narrator is not ready.');
        const samples = await generate(request.text);
        if (!canceled.delete(request.id)) send({ id: request.id, type: 'audio', samples, sampleRate: 24000 }, [samples.buffer as ArrayBuffer]);
      }
    } catch (error) { send({ id: request.id, type: 'error', message: error instanceof Error ? error.message : 'Narrator unavailable.' }); }
  });
};
