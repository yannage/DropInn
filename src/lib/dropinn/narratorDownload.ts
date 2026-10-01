import workerUrl from './narrator.worker.ts?worker&url';
import wasmUrl from '../../../node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.wasm?url';
import moduleUrl from '../../../node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.mjs?url';
import { narratorAssetBase, narratorCache, narratorModelFiles, type NarratorAsset, type NarratorAssets } from './narratorModel';

export interface NarratorDownloadState {
  status: 'checking' | 'missing' | 'downloading' | 'ready' | 'error';
  loaded: number; total: number; error: string; persistent: boolean;
}
let state: NarratorDownloadState = { status: 'checking', loaded: 0, total: 0, error: '', persistent: true };
const listeners = new Set<() => void>();
const sessionFiles = new Map<string, Response>();
let manifest: Promise<NarratorAsset[]> | undefined;
let pending: Promise<void> | undefined;
const downloads = new Set<Promise<void>>();
let controller: AbortController | undefined;
let revision = 0;
export const narratorDownloadSnapshot = () => state;
export const subscribeNarratorDownload = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
const update = (patch: Partial<NarratorDownloadState>) => { state = { ...state, ...patch }; listeners.forEach(listener => listener()); };
const absolute = (url: string) => new URL(url, location.href).href;
export const narratorSize = (bytes: number) => `${(bytes / 1_000_000).toFixed(1)} MB`;

/** Stop waiting without aborting work shared by other callers. */
function abortable<T>(work: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    const aborted = () => { signal.removeEventListener('abort', aborted); reject(signal.reason); };
    if (signal.aborted) aborted();
    else signal.addEventListener('abort', aborted, { once: true });
    work.then(value => { signal.removeEventListener('abort', aborted); resolve(value); }, error => { signal.removeEventListener('abort', aborted); reject(error); });
  });
}

export async function narratorManifest(signal?: AbortSignal): Promise<NarratorAsset[]> {
  signal?.throwIfAborted();
  if (!manifest) {
    // Metadata has its own deadline: a canceled download must not cancel a
    // simultaneous cache check, or leave every future attempt waiting forever.
    const request = new AbortController();
    const timeout = setTimeout(() => request.abort(new DOMException('The narrator download information took too long. Please retry.', 'TimeoutError')), 10000);
    const load = (async () => {
      const response = await fetch(`${import.meta.env.BASE_URL}narrator-assets.json`, { signal: request.signal });
      request.signal.throwIfAborted();
      if (!response.ok) throw Error('The narrator download information is unavailable. Please retry.');
      const sizes = await response.json() as Record<string, number>;
      request.signal.throwIfAborted();
      const runtime = [{ name: 'worker', url: workerUrl }, { name: 'wasm', url: wasmUrl }, { name: 'module', url: import.meta.env.DEV ? `${import.meta.env.BASE_URL}narrator-runtime.mjs` : moduleUrl }];
      if (runtime.some(file => !Number.isSafeInteger(sizes[file.name]) || sizes[file.name] <= 0)) throw Error('Invalid narrator download information.');
      return [...narratorModelFiles.map(file => ({ name: file.name, url: narratorAssetBase + file.path, bytes: file.bytes })),
        ...runtime.map(file => ({ ...file, url: absolute(file.url), bytes: sizes[file.name] }))];
    })();
    const shared = abortable(load, request.signal).catch(error => { if (manifest === shared) manifest = undefined; throw error; }).finally(() => clearTimeout(timeout));
    manifest = shared;
  }
  return signal ? abortable(manifest, signal) : manifest;
}

async function cached(file: NarratorAsset): Promise<Response | undefined> {
  let response = sessionFiles.get(file.url)?.clone();
  try { response ??= await (await caches.open(narratorCache)).match(file.url); } catch { /* Session-only is allowed. */ }
  return response && Number(response.headers.get('x-dropinn-bytes')) === file.bytes ? response : undefined;
}

export async function narratorDownloaded(): Promise<boolean> {
  try { return (await Promise.all((await narratorManifest()).map(cached))).every(Boolean); } catch { return false; }
}

export async function refreshNarratorDownload() {
  if (pending) return;
  const ticket = revision;
  try {
    const files = await narratorManifest();
    if (pending) return;
    const ready = await narratorDownloaded();
    if (!pending && ticket === revision) update({ status: ready ? 'ready' : 'missing', total: files.reduce((sum, file) => sum + file.bytes, 0), error: '' });
  } catch (error) { if (!pending && ticket === revision) update({ status: 'error', error: String(error instanceof Error ? error.message : error) }); }
}

export function cancelNarratorDownload() { controller?.abort(); }

export async function downloadNarrator(): Promise<void> {
  if (pending && !controller?.signal.aborted) return pending;
  const ticket = ++revision;
  const operationController = new AbortController();
  controller = operationController;
  const signal = operationController.signal;
  const publish = (patch: Partial<NarratorDownloadState>) => { if (ticket === revision) update(patch); };
  const timeout = setTimeout(() => operationController.abort(new DOMException('The narrator download took too long. Please retry.', 'TimeoutError')), 180000);
  update({ status: 'downloading', loaded: 0, error: '' });
  const operation = (async () => {
    const files = await narratorManifest(signal);
    signal.throwIfAborted();
    publish({ total: files.reduce((sum, file) => sum + file.bytes, 0) });
    let loaded = 0;
    for (const file of files) {
      signal.throwIfAborted();
      const savedFile = await abortable(cached(file), signal);
      signal.throwIfAborted();
      if (savedFile) { loaded += file.bytes; publish({ loaded }); continue; }
      const response = await abortable(fetch(file.url, { signal }), signal);
      signal.throwIfAborted();
      if (!response.ok || !response.body) throw Error('Narrator download failed. Please retry.');
      const reader = response.body.getReader(), chunks: Uint8Array[] = [];
      let received = 0;
      try {
        for (;;) {
          const { value, done } = await abortable(reader.read(), signal);
          signal.throwIfAborted();
          if (done) break;
          received += value.byteLength; chunks.push(value);
          publish({ loaded: Math.min(state.total, loaded + received) });
        }
      } finally {
        if (signal.aborted) void reader.cancel(signal.reason).catch(() => { /* Fetch may already have canceled its stream. */ });
        reader.releaseLock();
      }
      // Dev worker source is transformed by Vite; production bytes are measured exactly.
      if (!(import.meta.env.DEV && file.name === 'worker') && received !== file.bytes) throw Error('Incomplete narrator download. Please retry.');
      signal.throwIfAborted();
      const bytes = new Uint8Array(received);
      let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
      const saved = new Response(bytes, { headers: { 'content-type': file.name === 'worker' || file.name === 'module' ? 'text/javascript' : 'application/octet-stream', 'x-dropinn-bytes': String(file.bytes) } });
      try {
        const cache = await abortable(caches.open(narratorCache), signal);
        signal.throwIfAborted();
        // Cache writes cannot be canceled. Removal waits for them before deleting.
        await cache.put(file.url, saved.clone());
      }
      catch { signal.throwIfAborted(); sessionFiles.set(file.url, saved); publish({ persistent: false }); }
      signal.throwIfAborted();
      loaded += file.bytes; publish({ loaded });
    }
    signal.throwIfAborted();
    publish({ status: 'ready', loaded: state.total });
  })().catch(error => {
    const canceled = signal.aborted && signal.reason?.name === 'AbortError';
    publish({ status: canceled ? 'missing' : 'error', error: canceled ? '' : error instanceof Error ? error.message : 'Narrator download failed.' });
    throw error;
  }).finally(() => {
    clearTimeout(timeout);
    downloads.delete(operation);
    if (pending === operation) { pending = undefined; controller = undefined; }
  });
  downloads.add(operation);
  pending = operation;
  return operation;
}

export async function removeNarratorDownload() {
  ++revision;
  cancelNarratorDownload();
  // Include any aborted operation still finishing a Cache Storage write while a
  // subsequent retry was started, so removal cannot be undone by that write.
  await Promise.allSettled(downloads);
  sessionFiles.clear();
  window.dispatchEvent(new Event('dropinn-narrator-removed'));
  try {
    const names = typeof caches === 'undefined' ? [] : await caches.keys();
    await Promise.all(names.filter(name => name.startsWith('dropinn-kitten-') || name.startsWith('dropinn-emma-')).map(name => caches.delete(name)));
  } catch { update({ status: 'error', error: 'Browser storage could not be cleared. Please retry.' }); return; }
  update({ status: 'missing', loaded: 0, error: '', persistent: true });
}

export async function createNarratorWorker(download: boolean, progress?: (loaded: number, total: number) => void): Promise<{ worker: Worker; assets: NarratorAssets }> {
  const unsubscribe = subscribeNarratorDownload(() => progress?.(state.loaded, state.total));
  try {
    if (download) await downloadNarrator();
    const files = await narratorManifest(), buffers: Record<string, ArrayBuffer> = {};
    for (const file of files) {
      const response = await cached(file);
      if (!response) { update({ status: 'missing' }); throw Error('Please download the narrator again.'); }
      buffers[file.name] = await response.arrayBuffer();
    }
    // Production worker is a single self-contained chunk, so it also works from cache.
    const blob = import.meta.env.DEV ? undefined : URL.createObjectURL(new Blob([buffers.worker], { type: 'text/javascript' }));
    const worker = new Worker(blob ?? workerUrl, { type: 'module' });
    if (blob) {
      const revoke = () => URL.revokeObjectURL(blob);
      worker.addEventListener('message', revoke, { once: true });
      worker.addEventListener('error', revoke, { once: true });
      setTimeout(revoke, 180000);
    }
    return { worker, assets: buffers as unknown as NarratorAssets };
  } finally { unsubscribe(); }
}
