import { KokoroTTS } from 'kokoro-js';
import { env, Tensor, RawAudio } from '@huggingface/transformers';
import wasmUrl from '../../../node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.jsep.wasm?url';
import wasmModuleUrl from '../../../node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.jsep.mjs?url';
import { narratorAssetBase, narratorCache, narratorFiles, narratorModel, narratorRevision, splitNarratorClause, type NarratorRequest, type NarratorResponse } from './narratorAudio';

const send = (message: NarratorResponse, transfer: Transferable[] = []) => self.postMessage(message, { transfer });
let tts: KokoroTTS | undefined;
class TooLong extends Error {}

async function initialize(id: number, download: boolean) {
  let cache: Cache | undefined;
  try { cache = await caches.open(narratorCache); } catch { /* Session-only operation is still useful. */ }
  const cached = async (url: string) => { try { return await cache?.match(url); } catch { return undefined; } };
  const preloaded = new Map<string, Response>();
  if (!download) {
    // Transformers treats a failed cache lookup as permission to fetch. Validate
    // first and retain these responses so eviction cannot trigger a new download.
    for (const file of narratorFiles) {
      const url = narratorAssetBase + file, response = await cached(url);
      if (!response) throw new Error('Please download the natural voice again.');
      preloaded.set(url, response);
    }
  }
  env.allowLocalModels = !download;
  env.allowRemoteModels = download;
  env.remotePathTemplate = `{model}/resolve/${narratorRevision}/`;
  env.useBrowserCache = false;
  env.useCustomCache = true;
  env.customCache = {
    async match(url: string) {
      return preloaded.get(url)?.clone() ?? await cached(url);
    },
    async put(url: string, response: Response) { try { await cache?.put(url, response); } catch { /* Quota/private browsing. */ } },
  };
  env.backends.onnx.wasm!.numThreads = 1;
  env.backends.onnx.wasm!.wasmPaths = { wasm: wasmUrl, mjs: wasmModuleUrl };
  const model = await KokoroTTS.from_pretrained(narratorModel, {
    device: 'wasm', dtype: 'q8', progress_callback: progress => {
      if (progress.status === 'progress') send({ id, type: 'progress', loaded: progress.loaded, total: progress.total });
    },
  });
  const voiceUrl = narratorAssetBase + 'voices/bf_emma.bin';
  let response = preloaded.get(voiceUrl) ?? await cached(voiceUrl);
  if (!response) {
    if (!download) throw new Error('Please download the natural voice again.');
    response = await fetch(voiceUrl);
    if (!response.ok) throw new Error('The voice download failed.');
    try { await cache?.put(voiceUrl, response.clone()); } catch { /* Optional cache. */ }
  }
  const voice = new Float32Array(await response.arrayBuffer());
  if (voice.length < 510 * 256) throw new Error('The voice download is incomplete.');
  // Kokoro 1.2.1 otherwise silently truncates long input and fetches unpinned voices.
  // Keep its phonemization, but enforce token limits and use our pinned Emma data.
  const tokenize = model.tokenizer;
  model.tokenizer = ((text: string, options: object) => {
    const encoded = tokenize(text, { ...options, truncation: false });
    if (encoded.input_ids.dims.at(-1)! > 512) throw new TooLong();
    return encoded;
  }) as typeof model.tokenizer;
  model.generate_from_ids = async inputIds => {
    const count = Math.min(509, Math.max(0, inputIds.dims.at(-1)! - 2));
    const { waveform } = await model.model({ input_ids: inputIds, style: new Tensor('float32', voice.slice(count * 256, (count + 1) * 256), [1, 256]), speed: new Tensor('float32', [1], [1]) });
    return new RawAudio(waveform.data, 24000);
  };
  tts = model;
  preloaded.clear();
}

async function generate(text: string): Promise<Float32Array> {
  try { return (await tts!.generate(text, { voice: 'bf_emma', speed: 1 })).audio; }
  catch (error) {
    if (!(error instanceof TooLong)) throw error;
    const parts = splitNarratorClause(text);
    const left = await generate(parts[0]), right = await generate(parts[1]);
    const samples = new Float32Array(left.length + 3600 + right.length);
    samples.set(left); samples.set(right, left.length + 3600);
    return samples;
  }
}

// Serialize inference: ONNX sessions and phonemizer state are not concurrent queues.
let queue = Promise.resolve();
const canceled = new Set<number>();
self.onmessage = (event: MessageEvent<NarratorRequest | {type: 'cancel'; id: number}>) => {
  const request = event.data;
  if (request.type === 'cancel') { canceled.add(request.id); return; }
  queue = queue.then(async () => {
    if (canceled.delete(request.id)) return;
    try {
      if (request.type === 'init') {
        if (!tts) await initialize(request.id, request.download);
        send({ id: request.id, type: 'ready' });
      } else {
        if (!tts) throw new Error('The natural voice is not ready.');
        const samples = await generate(request.text);
        if (!samples.length || samples.some(value => !Number.isFinite(value))) throw new Error('Speech generation failed.');
        if (!canceled.delete(request.id)) send({ id: request.id, type: 'audio', samples, sampleRate: 24000 }, [samples.buffer as ArrayBuffer]);
      }
    } catch (error) { send({ id: request.id, type: 'error', message: error instanceof Error ? error.message : 'Natural voice unavailable.' }); }
  });
};
