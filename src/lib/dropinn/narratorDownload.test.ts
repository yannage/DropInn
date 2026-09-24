import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { narratorCache, narratorModelFiles } from './narratorModel';

vi.mock('./narrator.worker.ts?worker&url', () => ({ default: '/worker.js' }));
vi.mock('../../../node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.wasm?url', () => ({ default: '/engine.wasm' }));
vi.mock('../../../node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.mjs?url', () => ({ default: '/engine.mjs' }));
const stored = new Map<string, Response>();
const response = (length: number) => new Response(new Uint8Array(length));
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
afterEach(() => vi.unstubAllGlobals());

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
