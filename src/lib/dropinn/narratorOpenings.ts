import manifest from './narrator-openings.json';
import { narratorModel, narratorRevision } from './narratorModel';

export interface NarratorOpeningClip {
  text: string;
  voice: string;
  speed: number;
  url: string;
  bytes: number;
  sampleRate: number;
  sampleCount: number;
  duration: number;
  sha256: string;
}

const normalize = (text: string) => text.replace(/\s+/g, ' ').trim();
const key = (text: string, voice: string) => JSON.stringify([normalize(text), voice]);
const clips = new Map<string, NarratorOpeningClip>();
if (manifest.model === narratorModel && manifest.revision === narratorRevision && manifest.format === 'pcm16-wav' && manifest.speed === 1) {
  for (const clip of manifest.clips as NarratorOpeningClip[]) {
    clips.set(key(clip.text, clip.voice), { ...clip, url: `${import.meta.env.BASE_URL}${clip.url}` });
  }
}

/** Authored audio is only an exact substitute for the requested words and voice.
 * In particular, a branch projection or a different speaking speed must miss. */
export function narratorOpeningClip(text: string, voice: string, speed: number): NarratorOpeningClip | undefined {
  return speed === 1 ? clips.get(key(text, voice)) : undefined;
}

const unavailable = () => new Error('The opening recording is unavailable.');
const canceled = () => new DOMException('Narration canceled', 'AbortError');

/** Invoked by the player after Listen, never by the lookup or module import.
 * Small same-origin PCM clips avoid a decoder/codec dependency on first use. */
export async function loadNarratorOpeningClip(clip: NarratorOpeningClip, signal?: AbortSignal): Promise<{ samples: Float32Array; sampleRate: number }> {
  if (signal?.aborted) throw signal.reason ?? canceled();
  if (!Number.isSafeInteger(clip.bytes) || clip.bytes < 46 || clip.bytes > 768 * 1024 || clip.sampleRate !== 24000
    || !Number.isSafeInteger(clip.sampleCount) || clip.bytes !== 44 + clip.sampleCount * 2) throw unavailable();
  const controller = new AbortController();
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  let rejectCanceled: (reason: unknown) => void;
  const interruption = new Promise<never>((_resolve, reject) => { rejectCanceled = reject; });
  const abort = (reason: unknown) => {
    controller.abort(reason); rejectCanceled(reason);
    void reader?.cancel(reason).catch(() => {});
  };
  const externalAbort = () => abort(signal?.reason ?? canceled());
  signal?.addEventListener('abort', externalAbort, { once: true });
  const timeout = setTimeout(() => abort(new DOMException('Opening recording timed out.', 'TimeoutError')), 3000);
  const load = async () => {
    const response = await fetch(clip.url, { signal: controller.signal, cache: 'force-cache' });
    if (!response.ok || !response.body) throw unavailable();
    const declared = response.headers.get('content-length');
    if (declared !== null && Number(declared) !== clip.bytes) throw unavailable();
    const bytes = new Uint8Array(clip.bytes);
    reader = response.body.getReader();
    let received = 0;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        controller.signal.throwIfAborted();
        if (received + value.byteLength > bytes.length) throw unavailable();
        bytes.set(value, received); received += value.byteLength;
      }
    } finally { void reader.cancel().catch(() => {}); reader.releaseLock(); reader = undefined; }
    if (received !== bytes.length) throw unavailable();
    const view = new DataView(bytes.buffer);
    const tag = (offset: number) => String.fromCharCode(...bytes.subarray(offset, offset + 4));
    if (tag(0) !== 'RIFF' || view.getUint32(4, true) !== bytes.length - 8 || tag(8) !== 'WAVE'
      || tag(12) !== 'fmt ' || view.getUint32(16, true) !== 16 || view.getUint16(20, true) !== 1
      || view.getUint16(22, true) !== 1 || view.getUint32(24, true) !== clip.sampleRate
      || view.getUint32(28, true) !== clip.sampleRate * 2 || view.getUint16(32, true) !== 2
      || view.getUint16(34, true) !== 16 || tag(36) !== 'data' || view.getUint32(40, true) !== bytes.length - 44) throw unavailable();
    const samples = new Float32Array(clip.sampleCount);
    let peak = 0;
    for (let index = 0; index < samples.length; index++) {
      samples[index] = view.getInt16(44 + index * 2, true) / 32768;
      peak = Math.max(peak, Math.abs(samples[index]));
    }
    if (!samples.length || peak === 0) throw unavailable();
    return { samples, sampleRate: clip.sampleRate };
  };
  try { return await Promise.race([load(), interruption]); }
  finally { clearTimeout(timeout); signal?.removeEventListener('abort', externalAbort); controller.abort(); }
}
