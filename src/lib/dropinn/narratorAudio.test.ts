import { describe, expect, it, vi, afterEach } from 'vitest';
import { narratorPreference, narratorSpeed, narratorSentences, splitNarratorClause } from './narratorAudio';
import { NarratorPlayer } from './narratorPlayer';
import type { NarratorAssets } from './narratorModel';
vi.mock('./narratorDownload', () => ({ createNarratorWorker: vi.fn(), cancelNarratorDownload: vi.fn() }));

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
describe('natural narrator input and preferences', () => {
  it('migrates old preferences without losing a device voice or enabling autoplay', () => {
    expect(narratorPreference('{"voice":"old","collapsed":true}')).toEqual({ voice: 'old', collapsed: true, engine: 'natural', speed: 1 });
    expect(narratorPreference('null').engine).toBe('natural');
    expect(narratorPreference('invalid').collapsed).toBe(false);
    expect(narratorPreference('{"engine":"device"}').engine).toBe('device');
  });
  it('restores speed and safely bounds invalid preferences', () => {
    expect(narratorPreference('{"speed":1.5}').speed).toBe(1.5);
    expect(narratorPreference('{"speed":"fast"}').speed).toBe(1);
    expect(narratorSpeed(NaN)).toBe(1);
    expect(narratorSpeed(Infinity)).toBe(1);
    expect(narratorSpeed(0)).toBe(0.75);
    expect(narratorSpeed(10)).toBe(2);
  });
  it('keeps full sentences and handles abbreviations and quotes', () => {
    const text = 'Dr. Mara watches the long winding river while Wren looks for the silver fragment hidden among the muddy tracks. “Come here!” she calls.';
    const segments = narratorSentences(text);
    expect(segments.join(' ')).toBe(text);
    expect(segments[0]).toContain('muddy tracks.');
    expect(segments[0].length).toBeGreaterThan(88);
  });
  it('splits oversized clauses without losing words', () => {
    const text = 'Wren watches the river, while Mara carefully checks the old tracks and the broken silver ward.';
    expect(splitNarratorClause(text).join(' ')).toBe(text);
    expect(splitNarratorClause('a b c d').join(' ')).toBe('a b c d');
    expect(() => splitNarratorClause('unbroken')).toThrow();
  });
});

class WorkerStub {
  prepare = async () => ({ worker: this as unknown as Worker, assets: {} as NarratorAssets });
  onmessage?: (event: {data: unknown}) => void;
  onerror?: () => void;
  messages: {id: number; type: string}[] = [];
  terminate = vi.fn();
  postMessage(message: {id: number; type: string}) { this.messages.push(message); }
  reply(data: unknown) { this.onmessage?.({ data }); }
}
describe('worker lifecycle', () => {
  it('does not resurrect a worker when leaving during asset preparation', async () => {
    const worker = new WorkerStub();
    let finish!: (value: Awaited<ReturnType<WorkerStub['prepare']>>) => void;
    const player = new NarratorPlayer(() => new Promise(resolve => { finish = resolve; }));
    const ready = player.initialize(false), rejection = expect(ready).rejects.toThrow('canceled');
    player.dispose(); finish(await worker.prepare()); await rejection;
    expect(worker.terminate).toHaveBeenCalled(); expect(worker.messages).toHaveLength(0);
  });
  it('loads only explicitly, reports progress, and reuses the initialized session', async () => {
    const worker = new WorkerStub(), factory = vi.fn(worker.prepare);
    const player = new NarratorPlayer(factory), progress = vi.fn(); player.onProgress = progress;
    expect(factory).not.toHaveBeenCalled();
    const ready = player.initialize(true); await Promise.resolve(); const id = worker.messages[0].id;
    worker.reply({ id, type: 'progress', loaded: 10, total: 100 }); expect(progress).toHaveBeenCalledWith(10, 100);
    worker.reply({ id, type: 'ready' }); await ready;
    await player.initialize(false); expect(worker.messages).toHaveLength(1);
    player.dispose(); expect(worker.terminate).toHaveBeenCalled(); expect(player.ready).toBe(false);
  });
  it('cancels download and ignores late completion', async () => {
    const worker = new WorkerStub(), player = new NarratorPlayer(worker.prepare);
    const ready = player.initialize(true); const rejection = expect(ready).rejects.toThrow('canceled');
    await Promise.resolve();
    player.cancelDownload(); worker.reply({ id: 1, type: 'ready' }); await rejection;
    expect(player.ready).toBe(false);
  });
  it('rejects stalled synthesis, terminates the worker, and permits retry', async () => {
    vi.useFakeTimers();
    const worker = new WorkerStub(), player = new NarratorPlayer(worker.prepare);
    const init = player.initialize(true); await Promise.resolve(); worker.reply({ id: 1, type: 'ready' }); await init;
    const play = player.play(['A clue.'], 0, 'natural', '', vi.fn());
    const rejection = expect(play).rejects.toThrow('too long');
    await vi.advanceTimersByTimeAsync(20000); await rejection;
    expect(worker.terminate).toHaveBeenCalled(); expect(player.ready).toBe(false);
  });
  it('replacing a cue discards a late audio result without playing or showing it', async () => {
    const worker = new WorkerStub(), player = new NarratorPlayer(worker.prepare), caption = vi.fn();
    const init = player.initialize(true); await Promise.resolve(); worker.reply({ id: 1, type: 'ready' }); await init;
    const play = player.play(['Old cue.'], 0, 'natural', '', caption, 1.5);
    expect(worker.messages).toContainEqual({ type: 'generate', id: 2, text: 'Old cue.', speed: 1.5 });
    player.stop(); worker.reply({ id: 2, type: 'audio', samples: new Float32Array(24), sampleRate: 24000 });
    await play; expect(caption).not.toHaveBeenCalled();
    expect(worker.messages).toContainEqual({ type: 'cancel', id: 2 }); player.dispose();
  });
});
