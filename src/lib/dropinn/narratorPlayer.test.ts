import { afterEach, describe, expect, it, vi } from 'vitest';
import { NarratorPlayer } from './narratorPlayer';
import type { NarratorAssets } from './narratorModel';

vi.mock('./narratorDownload', () => ({ createNarratorWorker: vi.fn(), cancelNarratorDownload: vi.fn() }));
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
const flush = async () => { for (let index = 0; index < 8; index++) await Promise.resolve(); };

class WorkerStub {
  onmessage?: ((event: {data: unknown}) => void) | null;
  onerror?: (() => void) | null;
  onmessageerror?: (() => void) | null;
  messages: {id: number; type: string; text?: string; speed?: number; voice?: string}[] = [];
  terminate = vi.fn();
  automatic = true;
  samples = new Float32Array(24);
  prepare = vi.fn(async () => ({ worker: this as unknown as Worker, assets: {} as NarratorAssets }));
  postMessage = vi.fn((message: {id: number; type: string}) => {
    this.messages.push(message);
    if (this.automatic) void Promise.resolve().then(() => {
      if (message.type === 'init') this.reply({ id: message.id, type: 'ready' });
      if (message.type === 'generate') this.reply({ id: message.id, type: 'audio', samples: this.samples, sampleRate: 24000 });
    });
  });
  reply(data: unknown) { this.onmessage?.({ data }); }
  generations() { return this.messages.filter(message => message.type === 'generate'); }
}

function mockAudio(automatic = true) {
  const sources: { onended: (() => void) | null; stop: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn>; start: ReturnType<typeof vi.fn> }[] = [];
  const context = {
    state: 'running', destination: {}, resume: vi.fn(async () => {}), close: vi.fn(async () => {}),
    createBuffer: vi.fn((_channels: number, length: number, sampleRate: number) => ({ duration: length / sampleRate, copyToChannel: vi.fn() })),
    createBufferSource: vi.fn(() => {
      const source = {
        buffer: undefined, connect: vi.fn(), disconnect: vi.fn(), stop: vi.fn(), onended: null as (() => void) | null,
        start: vi.fn(() => { if (automatic) void Promise.resolve().then(() => source.onended?.()); }),
      };
      sources.push(source); return source;
    }),
  };
  vi.stubGlobal('AudioContext', function () { return context; });
  return { context, sources };
}

const localVoice = { voiceURI: 'local', name: 'English local', lang: 'en-GB', default: false, localService: true } as SpeechSynthesisVoice;
class UtteranceStub {
  voice?: SpeechSynthesisVoice;
  lang = '';
  rate = 1;
  pitch = 1;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onboundary: ((event: {charIndex: number}) => void) | null = null;
  constructor(public text: string) {}
}
function mockSpeech(voices: SpeechSynthesisVoice[] = [localVoice]) {
  const events = new EventTarget();
  const speech = {
    getVoices: vi.fn(() => voices), speak: vi.fn<(line: UtteranceStub) => void>(), cancel: vi.fn(),
    addEventListener: vi.fn(events.addEventListener.bind(events)), removeEventListener: vi.fn(events.removeEventListener.bind(events)),
    changed: () => events.dispatchEvent(new Event('voiceschanged')),
  };
  vi.stubGlobal('window', { speechSynthesis: speech });
  vi.stubGlobal('SpeechSynthesisUtterance', UtteranceStub);
  return speech;
}

async function naturalPlayer(automaticAudio = true) {
  const worker = new WorkerStub(), audio = mockAudio(automaticAudio), player = new NarratorPlayer(worker.prepare);
  await player.unlock(); await player.initialize(true);
  return { worker, player, ...audio };
}

describe('reusable natural speech', () => {
  it('replays cached sentences and keeps voice and speed selections distinct', async () => {
    const { worker, player, sources } = await naturalPlayer();
    await player.play(['A lantern glows.'], 0, 'natural', '', vi.fn());
    await player.play(['A lantern glows.'], 0, 'natural', '', vi.fn());
    expect(worker.generations()).toHaveLength(1); expect(sources).toHaveLength(2);
    await player.play(['A lantern glows.'], 0, 'natural', '', vi.fn(), 1.5);
    await player.play(['A lantern glows.'], 0, 'natural', '', vi.fn(), 1.5, 'Hugo');
    expect(worker.generations().map(message => [message.speed, message.voice])).toEqual([[1, 'Bella'], [1.5, 'Bella'], [1.5, 'Hugo']]);
    player.dispose();
  });

  it('caps cached sentence count and retains recently replayed lines', async () => {
    const { worker, player } = await naturalPlayer();
    const play = (text: string) => player.play([text], 0, 'natural', '', vi.fn());
    for (let index = 0; index < 32; index++) await play(`Line ${index}.`);
    await play('Line 0.'); await play('Line 32.'); await play('Line 0.');
    expect(worker.generations()).toHaveLength(33);
    await play('Line 1.'); expect(worker.generations()).toHaveLength(34);
    player.dispose();
  });

  it('regenerates speech after its audio cache is explicitly cleared', async () => {
    const { worker, player } = await naturalPlayer();
    const play = () => player.play(['A familiar tale.'], 0, 'natural', '', vi.fn());
    await play(); await play(); expect(worker.generations()).toHaveLength(1);
    player.clearAudioCache();
    await play(); expect(worker.generations()).toHaveLength(2);
    player.dispose();
  });

  it('bounds cached PCM bytes independently of sentence count', async () => {
    const { worker, player } = await naturalPlayer();
    worker.samples = new Float32Array(3 * 1024 * 1024); // 12 MiB per sentence.
    const play = (text: string) => player.play([text], 0, 'natural', '', vi.fn());
    await play('First.'); await play('Second.'); await play('Third.'); await play('Second.');
    expect(worker.generations()).toHaveLength(3);
    await play('First.'); expect(worker.generations()).toHaveLength(4);
    player.dispose();
  });

  it('stops active sound, pending prefetch and caption timers together', async () => {
    vi.useFakeTimers();
    const { worker, player, sources } = await naturalPlayer(false), caption = vi.fn();
    worker.automatic = false; worker.samples = new Float32Array(24000 * 10);
    const playing = player.play(['A lantern hangs above the door while the brave travellers search the courtyard and wonder where the missing keeper has gone.', 'Next line.'], 0, 'natural', '', caption);
    worker.reply({ id: worker.generations()[0].id, type: 'audio', samples: worker.samples, sampleRate: 24000 });
    await flush();
    expect(sources[0].start).toHaveBeenCalledOnce();
    player.stop(); const count = caption.mock.calls.length;
    const prefetchedId = worker.generations()[1].id;
    expect(worker.messages).toContainEqual({ type: 'cancel', id: prefetchedId });
    worker.reply({ id: prefetchedId, type: 'audio', samples: worker.samples, sampleRate: 24000 });
    await playing; await vi.advanceTimersByTimeAsync(30000);
    expect(sources[0].stop).toHaveBeenCalledOnce(); expect(sources[0].onended).toBeNull();
    expect(caption).toHaveBeenCalledTimes(count); expect(sources).toHaveLength(1);
    player.dispose();
  });

  it('discards synthesis received after cue replacement and never caches it', async () => {
    const { worker, player, sources } = await naturalPlayer(), caption = vi.fn();
    worker.automatic = false;
    const old = player.play(['Old.'], 0, 'natural', '', caption), oldId = worker.generations()[0].id;
    player.stop(); worker.reply({ id: oldId, type: 'audio', samples: worker.samples, sampleRate: 24000 });
    await old; expect(caption).not.toHaveBeenCalled(); expect(sources).toHaveLength(0);
    worker.automatic = true; await player.play(['Old.'], 0, 'natural', '', caption);
    expect(worker.generations()).toHaveLength(2); player.dispose();
  });

  it('shares in-progress initialization and rejects worker transport failures promptly', async () => {
    const worker = new WorkerStub(), player = new NarratorPlayer(worker.prepare);
    const first = player.initialize(true), second = player.initialize(true);
    expect(first).toBe(second); await first; expect(worker.prepare).toHaveBeenCalledOnce();
    worker.postMessage.mockImplementationOnce(() => { throw Error('worker disconnected'); });
    await expect(player.play(['Hello.'], 0, 'natural', '', vi.fn())).rejects.toThrow('unavailable');
    expect(player.ready).toBe(false); expect(worker.terminate).toHaveBeenCalledOnce(); player.dispose();
  });

  it('cleans up invalid worker responses without attempting playback', async () => {
    const { worker, player, sources } = await naturalPlayer();
    worker.samples = new Float32Array(0);
    await expect(player.play(['Hello.'], 0, 'natural', '', vi.fn())).rejects.toThrow('could not produce');
    expect(sources).toHaveLength(0); player.dispose();
  });

  it('ignores a failed worker after a fresh worker has initialized', async () => {
    const first = new WorkerStub(), second = new WorkerStub();
    const factory = vi.fn().mockImplementationOnce(first.prepare).mockImplementationOnce(second.prepare);
    const player = new NarratorPlayer(factory);
    await player.initialize(true);
    const oldFailure = first.onmessageerror!;
    oldFailure(); expect(player.ready).toBe(false);
    await player.initialize(true); oldFailure();
    expect(player.ready).toBe(true); expect(second.terminate).not.toHaveBeenCalled();
    player.dispose();
  });
});

describe('device speech stays local and cancellable', () => {
  it('accepts local English voices with underscore locale separators', async () => {
    const voice = { ...localVoice, lang: 'en_US' }, speech = mockSpeech([voice]), player = new NarratorPlayer();
    const playing = player.play(['Hello.'], 0, 'device', '', vi.fn()); await flush();
    const line = speech.speak.mock.calls[0][0];
    expect(line.voice).toBe(voice); expect(line.lang).toBe('en_US');
    line.onend?.(); await playing; player.dispose();
  });

  it('tolerates voice enumeration errors while waiting for startup', async () => {
    vi.useFakeTimers();
    const speech = mockSpeech(), player = new NarratorPlayer();
    speech.getVoices.mockImplementation(() => { throw Error('Voice service starting'); });
    const playing = player.play(['Hello.'], 0, 'device', '', vi.fn());
    expect(() => speech.changed()).not.toThrow(); expect(speech.speak).not.toHaveBeenCalled();
    speech.getVoices.mockReturnValue([localVoice]); speech.changed(); await flush();
    speech.speak.mock.calls[0][0].onend?.(); await playing;
    expect(vi.getTimerCount()).toBe(0); player.dispose();
  });

  it('waits for late local voices and removes the readiness listener', async () => {
    vi.useFakeTimers();
    const voices: SpeechSynthesisVoice[] = [], speech = mockSpeech(voices), player = new NarratorPlayer(), caption = vi.fn();
    const playing = player.play(['A quiet inn.'], 0, 'device', '', caption);
    expect(speech.speak).not.toHaveBeenCalled();
    voices.push(localVoice); speech.changed(); await flush();
    const line = speech.speak.mock.calls[0][0];
    expect(line.voice).toBe(localVoice); expect(caption).toHaveBeenCalledWith('A quiet inn.', 0);
    expect(speech.removeEventListener).toHaveBeenCalledWith('voiceschanged', expect.any(Function));
    line.onend?.(); await playing; expect(vi.getTimerCount()).toBe(0); player.dispose();
  });

  it('never falls back to an unspecified, remote, or non-English voice', async () => {
    vi.useFakeTimers();
    const speech = mockSpeech([
      { ...localVoice, voiceURI: 'cloud', localService: false, default: true },
      { ...localVoice, voiceURI: 'french', lang: 'fr-FR' },
    ]), player = new NarratorPlayer(), caption = vi.fn();
    const rejected = expect(player.play(['Hello.'], 0, 'device', 'cloud', caption)).rejects.toThrow('No English voice');
    await vi.advanceTimersByTimeAsync(1500); await rejected;
    expect(speech.speak).not.toHaveBeenCalled(); expect(caption).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0); player.dispose();
  });

  it('cancels voice discovery immediately and ignores voices arriving afterwards', async () => {
    vi.useFakeTimers();
    const voices: SpeechSynthesisVoice[] = [], speech = mockSpeech(voices), player = new NarratorPlayer();
    const playing = player.play(['Old cue.'], 0, 'device', '', vi.fn());
    player.stop(); await playing; voices.push(localVoice); speech.changed(); await flush();
    expect(speech.speak).not.toHaveBeenCalled(); expect(vi.getTimerCount()).toBe(0); player.dispose();
  });

  it('clears callbacks and rejects stale boundary events after a replacement cue', async () => {
    vi.useFakeTimers();
    const speech = mockSpeech(), player = new NarratorPlayer(), oldCaption = vi.fn(), newCaption = vi.fn();
    const old = player.play(['Old cue.'], 0, 'device', '', oldCaption); await flush();
    const oldLine = speech.speak.mock.calls[0][0], oldBoundary = oldLine.onboundary;
    const current = player.play(['New cue.'], 0, 'device', '', newCaption); await flush(); await old;
    const count = oldCaption.mock.calls.length; oldBoundary?.({ charIndex: 0 });
    expect(oldCaption).toHaveBeenCalledTimes(count); expect(oldLine.onboundary).toBeNull();
    expect(oldLine.onend).toBeNull(); expect(oldLine.onerror).toBeNull(); expect(speech.cancel).toHaveBeenCalledOnce();
    speech.speak.mock.calls[1][0].onend?.(); await current;
    expect(newCaption).toHaveBeenCalledWith('New cue.', 0); expect(vi.getTimerCount()).toBe(0); player.dispose();
  });

  it('cancels a stalled voice and releases its callbacks after the watchdog', async () => {
    vi.useFakeTimers();
    const speech = mockSpeech(), player = new NarratorPlayer();
    const rejected = expect(player.play(['Hello.'], 0, 'device', '', vi.fn())).rejects.toThrow('Voice paused'); await flush();
    const line = speech.speak.mock.calls[0][0];
    await vi.advanceTimersByTimeAsync(20000); await rejected;
    expect(speech.cancel).toHaveBeenCalledOnce(); expect(line.onboundary).toBeNull();
    expect(line.onend).toBeNull(); expect(line.onerror).toBeNull(); expect(vi.getTimerCount()).toBe(0); player.dispose();
  });

  it('does not restart speech when mute happens before an available voice resolves', async () => {
    const speech = mockSpeech(), player = new NarratorPlayer(), caption = vi.fn();
    const playing = player.play(['Hello.'], 0, 'device', '', caption);
    player.stop(); await playing;
    expect(speech.speak).not.toHaveBeenCalled(); expect(caption).not.toHaveBeenCalled(); player.dispose();
  });
});
