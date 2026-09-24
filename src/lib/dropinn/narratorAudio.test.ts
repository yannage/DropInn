import { describe, expect, it, vi, afterEach } from 'vitest';
import { narratorPreference, narratorSentences, splitNarratorClause, narratorDownloaded, narratorFiles } from './narratorAudio';
import { NarratorPlayer } from './narratorPlayer';

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
describe('natural narrator input and preferences', () => {
  it('migrates old preferences without losing a device voice or enabling autoplay', () => {
    expect(narratorPreference('{"voice":"old","collapsed":true}')).toEqual({ voice: 'old', collapsed: true, engine: 'natural' });
    expect(narratorPreference('null').engine).toBe('natural');
    expect(narratorPreference('invalid').collapsed).toBe(false);
    expect(narratorPreference('{"engine":"device"}').engine).toBe('device');
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
  it('requires every model asset before skipping the download choice', async () => {
    const match = vi.fn(async () => new Response('cached'));
    vi.stubGlobal('caches', { open: async () => ({ match }) });
    expect(await narratorDownloaded()).toBe(true);
    expect(match).toHaveBeenCalledTimes(narratorFiles.length);
    match.mockImplementationOnce(async () => undefined as unknown as Response);
    expect(await narratorDownloaded()).toBe(false);
    vi.stubGlobal('caches', { open: async () => { throw Error('storage blocked'); } });
    expect(await narratorDownloaded()).toBe(false);
  });
});

class WorkerStub {
  onmessage?: (event: {data: unknown}) => void;
  onerror?: () => void;
  messages: {id: number; type: string}[] = [];
  terminate = vi.fn();
  postMessage(message: {id: number; type: string}) { this.messages.push(message); }
  reply(data: unknown) { this.onmessage?.({ data }); }
}
describe('worker lifecycle', () => {
  it('loads only explicitly, reports progress, and reuses the initialized session', async () => {
    const worker = new WorkerStub(), factory = vi.fn(() => worker as unknown as Worker);
    const player = new NarratorPlayer(factory), progress = vi.fn(); player.onProgress = progress;
    expect(factory).not.toHaveBeenCalled();
    const ready = player.initialize(true), id = worker.messages[0].id;
    worker.reply({ id, type: 'progress', loaded: 10, total: 100 }); expect(progress).toHaveBeenCalledWith(10, 100);
    worker.reply({ id, type: 'ready' }); await ready;
    await player.initialize(false); expect(worker.messages).toHaveLength(1);
    player.dispose(); expect(worker.terminate).toHaveBeenCalled(); expect(player.ready).toBe(false);
  });
  it('cancels download and ignores late completion', async () => {
    const worker = new WorkerStub(), player = new NarratorPlayer(() => worker as unknown as Worker);
    const ready = player.initialize(true); const rejection = expect(ready).rejects.toThrow('canceled');
    player.cancelDownload(); worker.reply({ id: 1, type: 'ready' }); await rejection;
    expect(player.ready).toBe(false);
  });
  it('rejects stalled synthesis, terminates the worker, and permits retry', async () => {
    vi.useFakeTimers();
    const worker = new WorkerStub(), player = new NarratorPlayer(() => worker as unknown as Worker);
    const init = player.initialize(true); worker.reply({ id: 1, type: 'ready' }); await init;
    const play = player.play(['A clue.'], 0, 'natural', '', vi.fn());
    const rejection = expect(play).rejects.toThrow('too long');
    await vi.advanceTimersByTimeAsync(20000); await rejection;
    expect(worker.terminate).toHaveBeenCalled(); expect(player.ready).toBe(false);
  });
  it('replacing a cue discards a late audio result without playing or showing it', async () => {
    const worker = new WorkerStub(), player = new NarratorPlayer(() => worker as unknown as Worker), caption = vi.fn();
    const init = player.initialize(true); worker.reply({ id: 1, type: 'ready' }); await init;
    const play = player.play(['Old cue.'], 0, 'natural', '', caption);
    player.stop(); worker.reply({ id: 2, type: 'audio', samples: new Float32Array(24), sampleRate: 24000 });
    await play; expect(caption).not.toHaveBeenCalled();
    expect(worker.messages).toContainEqual({ type: 'cancel', id: 2 }); player.dispose();
  });
});
