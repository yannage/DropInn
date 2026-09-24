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
let controller: AbortController | undefined;
let revision = 0;
export const narratorDownloadSnapshot = () => state;
export const subscribeNarratorDownload = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
const update = (patch: Partial<NarratorDownloadState>) => { state = { ...state, ...patch }; listeners.forEach(listener => listener()); };
const absolute = (url: string) => new URL(url, location.href).href;
export const narratorSize = (bytes: number) => `${(bytes / 1_000_000).toFixed(1)} MB`;

export async function narratorManifest(): Promise<NarratorAsset[]> {
  manifest ??= (async () => {
    const response = await fetch(`${import.meta.env.BASE_URL}narrator-assets.json`);
    if (!response.ok) throw Error('The narrator download information is unavailable. Please retry.');
    const sizes = await response.json() as Record<string, number>;
    const runtime = [{ name: 'worker', url: workerUrl }, { name: 'wasm', url: wasmUrl }, { name: 'module', url: import.meta.env.DEV ? `${import.meta.env.BASE_URL}narrator-runtime.mjs` : moduleUrl }];
    if (runtime.some(file => !Number.isSafeInteger(sizes[file.name]) || sizes[file.name] <= 0)) throw Error('Invalid narrator download information.');
    return [...narratorModelFiles.map(file => ({ name: file.name, url: narratorAssetBase + file.path, bytes: file.bytes })),
      ...runtime.map(file => ({ ...file, url: absolute(file.url), bytes: sizes[file.name] }))];
  })().catch(error => { manifest = undefined; throw error; });
  return manifest;
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
  if (pending) return pending;
  ++revision;
  controller = new AbortController();
  const signal = controller.signal;
  const timeout = setTimeout(() => controller?.abort(new DOMException('The narrator download took too long. Please retry.', 'TimeoutError')), 180000);
  update({ status: 'downloading', loaded: 0, error: '' });
  pending = (async () => {
    const files = await narratorManifest();
    update({ total: files.reduce((sum, file) => sum + file.bytes, 0) });
    let loaded = 0;
    for (const file of files) {
      signal.throwIfAborted();
      if (await cached(file)) { loaded += file.bytes; update({ loaded }); continue; }
      const response = await fetch(file.url, { signal });
      if (!response.ok || !response.body) throw Error('Narrator download failed. Please retry.');
      const reader = response.body.getReader(), chunks: Uint8Array[] = [];
      let received = 0;
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        received += value.byteLength; chunks.push(value);
        update({ loaded: Math.min(state.total, loaded + received) });
      }
      // Dev worker source is transformed by Vite; production bytes are measured exactly.
      if (!(import.meta.env.DEV && file.name === 'worker') && received !== file.bytes) throw Error('Incomplete narrator download. Please retry.');
      signal.throwIfAborted();
      const bytes = new Uint8Array(received);
      let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
      const saved = new Response(bytes, { headers: { 'content-type': file.name === 'worker' || file.name === 'module' ? 'text/javascript' : 'application/octet-stream', 'x-dropinn-bytes': String(file.bytes) } });
      try { await (await caches.open(narratorCache)).put(file.url, saved.clone()); }
      catch { sessionFiles.set(file.url, saved); update({ persistent: false }); }
      loaded += file.bytes; update({ loaded });
    }
    signal.throwIfAborted();
    update({ status: 'ready', loaded: state.total });
  })().catch(error => {
    const canceled = signal.aborted && signal.reason?.name === 'AbortError';
    update({ status: canceled ? 'missing' : 'error', error: canceled ? '' : error instanceof Error ? error.message : 'Narrator download failed.' });
    throw error;
  }).finally(() => { clearTimeout(timeout); pending = undefined; controller = undefined; });
  return pending;
}

export async function removeNarratorDownload() {
  ++revision;
  cancelNarratorDownload();
  try { await pending; } catch { /* A canceled download is expected. */ }
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
