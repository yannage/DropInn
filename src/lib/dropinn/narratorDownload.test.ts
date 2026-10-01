import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { narratorCache, narratorModelFiles } from './narratorModel';

vi.mock('./narrator.worker.ts?worker&url', () => ({ default: '/worker.js' }));
vi.mock('../../../node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.wasm?url', () => ({ default: '/engine.wasm' }));
vi.mock('../../../node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.mjs?url', () => ({ default: '/engine.mjs' }));
const stored = new Map<string, Response>();
const response = (length: number) => new Response(new Uint8Array(length));
const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
};
let network: ReturnType<typeof vi.fn>;
beforeEach(() => {
  vi.resetModules(); stored.clear();
  vi.stubGlobal('location', { href: 'http://localhost/' });
  vi.stubGlobal('window', new EventTarget());
  vi.stubGlobal('caches', {
    open: async () => ({ match: async (url: string) => stored.get(url)?.clone(), put: async (url: string, value: Response) => { stored.set(url, value); } }),
    keys: async () => [narratorCache], delete: async () => { stored.clear(); return true; },
  });
  network = vi.fn(async (url: string) => {
    if (url.endsWith('narrator-assets.json')) return Response.json({ worker: 5, module: 5, wasm: 5 });
    return response(narratorModelFiles.find(file => url.endsWith(file.path))?.bytes ?? 5);
  });
  vi.stubGlobal('fetch', network);
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('shared optional narrator download', () => {
  it('loads only tiny metadata before consent; requires every runtime and model file', async () => {
    const pack = await import('./narratorDownload');
    await pack.refreshNarratorDownload();
    expect(network).toHaveBeenCalledTimes(1);
    expect(pack.narratorDownloadSnapshot().status).toBe('missing');
    expect(await pack.narratorDownloaded()).toBe(false);
    await pack.downloadNarrator();
    expect(await pack.narratorDownloaded()).toBe(true);
    expect(stored.size).toBe(6);
    stored.delete('http://localhost/engine.wasm');
    expect(await pack.narratorDownloaded()).toBe(false);
    const calls = network.mock.calls.length;
    await expect(pack.createNarratorWorker(false)).rejects.toThrow('download');
    expect(network.mock.calls.length).toBe(calls);
  });
  it('shares progress and one download, reuses cache, and removes owned assets', async () => {
    const pack = await import('./narratorDownload'), listener = vi.fn();
    const unsubscribe = pack.subscribeNarratorDownload(listener);
    await Promise.all([pack.downloadNarrator(), pack.downloadNarrator()]);
    expect(network).toHaveBeenCalledTimes(7);
    expect(listener).toHaveBeenCalled();
    expect(pack.narratorDownloadSnapshot().loaded).toBe(pack.narratorDownloadSnapshot().total);
    await pack.downloadNarrator(); expect(network).toHaveBeenCalledTimes(7);
    await pack.removeNarratorDownload(); expect(stored.size).toBe(0);
    expect(pack.narratorDownloadSnapshot().status).toBe('missing'); unsubscribe();
  });
  it('rejects truncated files and retries without marking a partial pack ready', async () => {
    const pack = await import('./narratorDownload');
    const normal = network.getMockImplementation()! as (url: string) => Promise<Response>;
    network.mockImplementation(async (url: string) => url.endsWith('voices.npz') ? response(7) : normal(url));
    await expect(pack.downloadNarrator()).rejects.toThrow('Incomplete');
    expect(await pack.narratorDownloaded()).toBe(false);
    expect(stored.size).toBe(1);
    network.mockImplementation(normal);
    await pack.downloadNarrator(); expect(await pack.narratorDownloaded()).toBe(true);
  });
  it('cancels without writing a partially received file', async () => {
    const pack = await import('./narratorDownload');
    await pack.refreshNarratorDownload();
    network.mockImplementation(async (_url: string, options: { signal: AbortSignal }) => {
      return new Promise<Response>((_resolve, reject) => options.signal.addEventListener('abort', () => reject(options.signal.reason)));
    });
    const download = pack.downloadNarrator();
    const rejection = expect(download).rejects.toThrow();
    await vi.waitFor(() => expect(network).toHaveBeenCalledTimes(2));
    pack.cancelNarratorDownload(); await rejection;
    expect(stored.size).toBe(0); expect(pack.narratorDownloadSnapshot().status).toBe('missing');
  });
  it('bounds stalled shared metadata and permits a new request after timeout', async () => {
    vi.useFakeTimers();
    const stalled = deferred<Response>();
    network.mockImplementationOnce(() => stalled.promise);
    const pack = await import('./narratorDownload');
    const metadata = pack.narratorManifest();
    const metadataError = expect(metadata).rejects.toMatchObject({ name: 'TimeoutError' });
    const downloadError = expect(pack.downloadNarrator()).rejects.toMatchObject({ name: 'TimeoutError' });
    await vi.advanceTimersByTimeAsync(10000);
    await Promise.all([metadataError, downloadError]);
    expect(network.mock.calls[0][1].signal.aborted).toBe(true);
    expect(network).toHaveBeenCalledTimes(1);
    expect(pack.narratorDownloadSnapshot()).toMatchObject({ status: 'error', loaded: 0 });
    expect(pack.narratorDownloadSnapshot().error).toContain('took too long');
    await pack.refreshNarratorDownload();
    expect(network).toHaveBeenCalledTimes(2);
    expect(pack.narratorDownloadSnapshot().status).toBe('missing');
    const listener = vi.fn(), unsubscribe = pack.subscribeNarratorDownload(listener);
    stalled.resolve(Response.json({ worker: 99, module: 99, wasm: 99 }));
    await vi.advanceTimersByTimeAsync(0);
    expect(listener).not.toHaveBeenCalled();
    expect((await pack.narratorManifest()).find(file => file.name === 'worker')?.bytes).toBe(5);
    unsubscribe();
  });
  it('applies the metadata deadline to a stalled response body too', async () => {
    vi.useFakeTimers();
    const body = deferred<Record<string, number>>();
    network.mockImplementationOnce(async () => ({ ok: true, json: () => body.promise }));
    const pack = await import('./narratorDownload');
    const rejection = expect(pack.downloadNarrator()).rejects.toMatchObject({ name: 'TimeoutError' });
    await vi.advanceTimersByTimeAsync(10000);
    await rejection;
    expect(pack.narratorDownloadSnapshot().status).toBe('error');
    await pack.refreshNarratorDownload();
    expect(network).toHaveBeenCalledTimes(2);
    expect(pack.narratorDownloadSnapshot().status).toBe('missing');
  });
  it('cancels immediately during shared metadata and preserves immediate retries and readers', async () => {
    const stalled = deferred<Response>();
    network.mockImplementationOnce(() => stalled.promise);
    const pack = await import('./narratorDownload');
    const metadata = pack.narratorManifest();
    const first = expect(pack.downloadNarrator()).rejects.toMatchObject({ name: 'AbortError' });
    pack.cancelNarratorDownload();
    const second = pack.downloadNarrator();
    const secondError = expect(second).rejects.toMatchObject({ name: 'AbortError' });
    await first;
    expect(pack.narratorDownloadSnapshot().status).toBe('downloading');
    // The old operation's finally must not clear the retry's controller.
    pack.cancelNarratorDownload();
    await secondError;
    expect(pack.narratorDownloadSnapshot().status).toBe('missing');
    expect(network.mock.calls[0][1].signal.aborted).toBe(false);
    expect(network).toHaveBeenCalledTimes(1);
    const retry = pack.downloadNarrator();
    stalled.resolve(Response.json({ worker: 5, module: 5, wasm: 5 }));
    expect(await metadata).toHaveLength(6);
    await retry;
    expect(pack.narratorDownloadSnapshot().status).toBe('ready');
    expect(network).toHaveBeenCalledTimes(7);
  });
  it('removes promptly while metadata is stalled and ignores its later completion', async () => {
    const stalled = deferred<Response>();
    network.mockImplementationOnce(() => stalled.promise);
    const pack = await import('./narratorDownload');
    const metadata = pack.narratorManifest();
    const download = expect(pack.downloadNarrator()).rejects.toMatchObject({ name: 'AbortError' });
    const removed = vi.fn(); window.addEventListener('dropinn-narrator-removed', removed);
    await pack.removeNarratorDownload();
    await download;
    expect(removed).toHaveBeenCalledOnce();
    expect(pack.narratorDownloadSnapshot()).toMatchObject({ status: 'missing', loaded: 0 });
    const listener = vi.fn(), unsubscribe = pack.subscribeNarratorDownload(listener);
    stalled.resolve(Response.json({ worker: 5, module: 5, wasm: 5 }));
    await metadata;
    expect(network).toHaveBeenCalledTimes(1);
    expect(stored.size).toBe(0);
    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
    await pack.downloadNarrator();
    expect(pack.narratorDownloadSnapshot().status).toBe('ready');
  });
  it('retries a failed metadata fetch without retaining its rejected promise', async () => {
    network.mockRejectedValueOnce(new TypeError('Network unavailable'));
    const pack = await import('./narratorDownload');
    await expect(pack.downloadNarrator()).rejects.toThrow('Network unavailable');
    expect(pack.narratorDownloadSnapshot().status).toBe('error');
    await pack.downloadNarrator();
    expect(pack.narratorDownloadSnapshot().status).toBe('ready');
    expect(network).toHaveBeenCalledTimes(8);
  });
  it('removes a cache write from an older canceled attempt after an immediate retry', async () => {
    const writing = deferred<void>(), finishWrite = deferred<void>();
    const clear = vi.fn(async () => { stored.clear(); return true; });
    vi.stubGlobal('caches', {
      open: async () => ({
        match: async (url: string) => stored.get(url)?.clone(),
        put: async (url: string, value: Response) => {
          writing.resolve();
          await finishWrite.promise;
          stored.set(url, value);
        },
      }),
      keys: async () => [narratorCache], delete: clear,
    });
    const pack = await import('./narratorDownload');
    const first = expect(pack.downloadNarrator()).rejects.toMatchObject({ name: 'AbortError' });
    await writing.promise;
    pack.cancelNarratorDownload();
    const retry = expect(pack.downloadNarrator()).rejects.toMatchObject({ name: 'AbortError' });
    const removal = pack.removeNarratorDownload();
    await retry;
    expect(clear).not.toHaveBeenCalled();
    finishWrite.resolve();
    await Promise.all([first, removal]);
    expect(clear).toHaveBeenCalledOnce();
    expect(stored.size).toBe(0);
    expect(pack.narratorDownloadSnapshot()).toMatchObject({ status: 'missing', loaded: 0 });
  });
  it('settles the download deadline even when an asset fetch ignores abort', async () => {
    vi.useFakeTimers();
    const pack = await import('./narratorDownload');
    await pack.refreshNarratorDownload();
    network.mockImplementationOnce(() => new Promise<Response>(() => {}));
    const rejection = expect(pack.downloadNarrator()).rejects.toMatchObject({ name: 'TimeoutError' });
    await vi.advanceTimersByTimeAsync(180000);
    await rejection;
    expect(pack.narratorDownloadSnapshot().status).toBe('error');
    expect(stored.size).toBe(0);
  });
  it('cancels a stalled asset stream without storing it', async () => {
    const pack = await import('./narratorDownload');
    await pack.refreshNarratorDownload();
    const streamCancel = vi.fn();
    network.mockImplementationOnce(async () => new Response(new ReadableStream({ cancel: streamCancel })));
    const rejection = expect(pack.downloadNarrator()).rejects.toMatchObject({ name: 'AbortError' });
    await vi.waitFor(() => expect(network).toHaveBeenCalledTimes(2));
    pack.cancelNarratorDownload();
    await rejection;
    expect(streamCancel).toHaveBeenCalledOnce();
    expect(stored.size).toBe(0);
    expect(pack.narratorDownloadSnapshot().status).toBe('missing');
  });
  it('supports this-visit downloads when browser storage is unavailable', async () => {
    vi.stubGlobal('caches', undefined);
    const pack = await import('./narratorDownload');
    await pack.downloadNarrator();
    expect(pack.narratorDownloadSnapshot().persistent).toBe(false);
    expect(await pack.narratorDownloaded()).toBe(true);
    await pack.removeNarratorDownload();
    expect(await pack.narratorDownloaded()).toBe(false);
    expect(pack.narratorDownloadSnapshot().status).toBe('missing');
  });
});
