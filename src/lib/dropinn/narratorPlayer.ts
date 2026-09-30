import { narratorCaptions, narratorVoice } from './narrator';
import { narratorSpeed, type NarratorRequest, type NarratorResponse } from './narratorAudio';
import { createNarratorWorker, cancelNarratorDownload } from './narratorDownload';
import { narratorNaturalVoice } from './narratorVoices';

type AudioResult = Extract<NarratorResponse, {type: 'audio'}>;
type Pending = { resolve: (result: NarratorResponse) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout>; type: string };
const canceled = () => new DOMException('Narration canceled', 'AbortError');
const deviceUnavailable = () => new Error('No English voice is available on this device. The natural voice can read here once it is ready.');
// A few minutes of reusable speech, with an independent entry cap for very short lines.
const MAX_CACHED_AUDIO_BYTES = 24 * 1024 * 1024;
const MAX_CACHED_SENTENCES = 32;

export class NarratorPlayer {
  private worker?: Worker;
  private pending = new Map<number, Pending>();
  private serial = 0;
  private generation = 0;
  private context?: AudioContext;
  private source?: AudioBufferSourceNode;
  private speech?: SpeechSynthesisUtterance;
  private timers: ReturnType<typeof setTimeout>[] = [];
  private finishPlayback?: () => void;
  private stopWaitingForVoice?: () => void;
  private initialization = 0;
  private initializing?: Promise<void>;
  private ownsDownload = false;
  private audioCache = new Map<string, AudioResult>();
  private cachedBytes = 0;
  ready = false;
  onProgress?: (loaded: number, total: number) => void;

  constructor(private createWorker = createNarratorWorker) {}

  /** Called synchronously inside the user's click, before downloads or synthesis. */
  async unlock() {
    this.context ??= new AudioContext();
    return this.context.resume();
  }

  private request(message: Omit<Extract<NarratorRequest, {type: 'init'}>, 'id'> | Omit<Extract<NarratorRequest, {type: 'generate'}>, 'id'>): Promise<NarratorResponse> {
    const worker = this.worker;
    if (!worker) return Promise.reject(new Error('The narrator is not ready.'));
    worker.onmessage = (event: MessageEvent<NarratorResponse>) => {
      if (this.worker !== worker) return;
      const result = event.data, pending = result && this.pending.get(result.id);
      if (!pending) return;
      if (result.type === 'progress') { this.onProgress?.(result.loaded, result.total); return; }
      clearTimeout(pending.timer); this.pending.delete(result.id);
      if (result.type === 'error') pending.reject(new Error(result.message));
      else if ((pending.type === 'init' && result.type === 'ready') || (pending.type === 'generate' && result.type === 'audio')) pending.resolve(result);
      else pending.reject(new Error('The narrator returned an unexpected response.'));
    };
    const failed = () => { if (this.worker === worker) this.resetWorker(new Error('Natural voice unavailable on this device.')); };
    worker.onerror = failed;
    worker.onmessageerror = failed;
    const id = ++this.serial;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => this.resetWorker(new Error(message.type === 'init' ? 'The voice download took too long. Please retry.' : 'Speech took too long on this device.')), message.type === 'init' ? 180000 : 20000);
      this.pending.set(id, { resolve, reject, timer, type: message.type });
      const assets = message.type === 'init' ? message.assets : undefined;
      try { worker.postMessage({ ...message, id }, assets ? Object.values(assets) : []); }
      catch { this.resetWorker(new Error('Natural voice unavailable on this device.')); }
    });
  }

  initialize(download: boolean): Promise<void> {
    if (this.ready) return Promise.resolve();
    if (this.initializing) return this.initializing;
    const ticket = ++this.initialization;
    this.ownsDownload = download;
    const initialize = async () => {
      try {
        const prepared = await this.createWorker(download, this.onProgress);
        if (ticket !== this.initialization) { prepared.worker.terminate(); throw canceled(); }
        this.worker = prepared.worker;
        await this.request({ type: 'init', assets: prepared.assets });
        if (ticket !== this.initialization) throw canceled();
        this.ready = true;
      } catch (error) {
        if (ticket === this.initialization) this.resetWorker(error instanceof Error ? error : new Error('Natural voice unavailable.'));
        throw error;
      }
    };
    this.initializing = initialize().finally(() => {
      if (ticket === this.initialization) { this.ownsDownload = false; this.initializing = undefined; }
    });
    return this.initializing;
  }

  private resetWorker(error: Error) {
    if (this.worker) {
      this.worker.onmessage = null; this.worker.onerror = null; this.worker.onmessageerror = null;
      this.worker.terminate(); this.worker = undefined;
    }
    this.ready = false;
    for (const pending of this.pending.values()) { clearTimeout(pending.timer); pending.reject(error); }
    this.pending.clear();
  }

  stop() {
    ++this.generation;
    this.timers.forEach(clearTimeout); this.timers = [];
    this.stopWaitingForVoice?.(); this.stopWaitingForVoice = undefined;
    const source = this.source;
    this.source = undefined;
    if (source) {
      source.onended = null;
      try { source.stop(); } catch { /* The source may have already ended. */ }
      source.disconnect();
    }
    if (this.speech) {
      this.speech.onend = null; this.speech.onerror = null; this.speech.onboundary = null;
      this.speech = undefined;
      window.speechSynthesis?.cancel();
    }
    const finish = this.finishPlayback;
    this.finishPlayback = undefined;
    finish?.();
    for (const [id, pending] of this.pending) {
      if (pending.type !== 'generate') continue;
      clearTimeout(pending.timer); this.pending.delete(id); pending.reject(canceled());
      try { this.worker?.postMessage({ type: 'cancel', id }); }
      catch { this.resetWorker(new Error('Natural voice unavailable on this device.')); }
    }
  }

  cancelDownload() {
    ++this.initialization; this.initializing = undefined;
    if (this.ownsDownload) cancelNarratorDownload();
    this.ownsDownload = false; this.stop(); this.resetWorker(canceled());
  }
  dispose() {
    this.cancelDownload();
    this.clearAudioCache();
    void this.context?.close(); this.context = undefined;
  }

  clearAudioCache() { this.audioCache.clear(); this.cachedBytes = 0; }

  private async synthesize(text: string, rate: number, voice: string, ticket: number): Promise<AudioResult> {
    const key = JSON.stringify([text, rate, voice]), cached = this.audioCache.get(key);
    if (cached) {
      this.audioCache.delete(key); this.audioCache.set(key, cached);
      return cached;
    }
    const result = await this.request({ type: 'generate', text, speed: rate, voice });
    if (ticket !== this.generation) throw canceled();
    if (result.type !== 'audio' || !(result.samples instanceof Float32Array) || !result.samples.length || !Number.isFinite(result.sampleRate) || result.sampleRate <= 0) throw new Error('The narrator could not produce this line.');
    const bytes = result.samples.byteLength;
    if (bytes <= MAX_CACHED_AUDIO_BYTES) {
      while (this.audioCache.size >= MAX_CACHED_SENTENCES || this.cachedBytes + bytes > MAX_CACHED_AUDIO_BYTES) {
        const oldest = this.audioCache.keys().next().value!;
        this.cachedBytes -= this.audioCache.get(oldest)!.samples.byteLength;
        this.audioCache.delete(oldest);
      }
      this.audioCache.set(key, result); this.cachedBytes += bytes;
    }
    return result;
  }

  private async audio(result: AudioResult, text: string, ticket: number, caption: (text: string) => void) {
    if (ticket !== this.generation) return;
    const context = this.context;
    if (!context || context.state !== 'running') throw new Error('Tap the speaker to resume the voice.');
    const buffer = context.createBuffer(1, result.samples.length, result.sampleRate);
    buffer.copyToChannel(result.samples, 0);
    const source = context.createBufferSource(); source.buffer = buffer; source.connect(context.destination);
    this.source = source;
    const captions = narratorCaptions(text), total = Math.max(1, text.split(/\s+/).length);
    caption(captions[0] ?? text);
    if (ticket !== this.generation) return;
    let words = 0;
    captions.slice(0, -1).forEach((line, index) => {
      words += line.split(/\s+/).length;
      this.timers.push(setTimeout(() => { if (ticket === this.generation) caption(captions[index + 1]); }, buffer.duration * words / total * 1000));
    });
    await new Promise<void>((resolve, reject) => {
      const finish = (error?: unknown) => {
        source.onended = null;
        if (this.source === source) { source.disconnect(); this.source = undefined; }
        if (this.finishPlayback === cancel) this.finishPlayback = undefined;
        if (error) reject(error); else resolve();
      };
      const cancel = () => finish();
      this.finishPlayback = cancel;
      source.onended = cancel;
      try { source.start(); }
      catch (error) { finish(error); }
    });
    if (ticket === this.generation) { this.timers.forEach(clearTimeout); this.timers = []; }
  }

  private deviceVoice(preferred: string, ticket: number): Promise<SpeechSynthesisVoice | undefined> {
    const synthesis = typeof window === 'undefined' ? undefined : window.speechSynthesis;
    if (!synthesis || typeof SpeechSynthesisUtterance === 'undefined') return Promise.reject(deviceUnavailable());
    const select = () => {
      try { return narratorVoice(synthesis.getVoices(), preferred); }
      catch { return undefined; } // Some engines enumerate voices only after startup.
    };
    const available = select();
    if (available) return Promise.resolve(available);
    return new Promise((resolve, reject) => {
      let timer: ReturnType<typeof setTimeout>;
      const cleanup = () => {
        clearTimeout(timer);
        synthesis.removeEventListener('voiceschanged', changed);
        if (this.stopWaitingForVoice === cancel) this.stopWaitingForVoice = undefined;
      };
      const cancel = () => { cleanup(); resolve(undefined); };
      const changed = () => {
        if (ticket !== this.generation) { cancel(); return; }
        const voice = select();
        if (voice) { cleanup(); resolve(voice); }
      };
      timer = setTimeout(() => { cleanup(); reject(deviceUnavailable()); }, 1500);
      this.stopWaitingForVoice = cancel;
      synthesis.addEventListener('voiceschanged', changed);
      // Voice enumeration can finish between the initial read and listener registration.
      changed();
    });
  }

  private async device(text: string, preferred: string, rate: number, ticket: number, caption: (text: string) => void): Promise<void> {
    const voice = await this.deviceVoice(preferred, ticket);
    if (ticket !== this.generation) return;
    if (!voice) throw deviceUnavailable();
    await new Promise<void>((resolve, reject) => {
      const line = new SpeechSynthesisUtterance(text);
      line.voice = voice; line.lang = voice.lang; line.rate = rate; line.pitch = 1;
      const captions = narratorCaptions(text);
      let settled = false;
      const finish = (error?: Error) => {
        if (settled) return;
        settled = true;
        clearTimeout(watchdog);
        line.onend = null; line.onerror = null; line.onboundary = null;
        if (this.speech === line) this.speech = undefined;
        if (this.finishPlayback === cancel) this.finishPlayback = undefined;
        if (error) { window.speechSynthesis.cancel(); reject(error); }
        else resolve();
      };
      const cancel = () => finish();
      const watchdog = setTimeout(() => finish(new Error('Voice paused. Tap the speaker to try again.')), Math.max(20000, text.split(/\s+/).length * 1000 / rate));
      this.finishPlayback = cancel;
      this.speech = line;
      line.onboundary = event => {
        if (ticket !== this.generation || this.speech !== line) return;
        let end = 0;
        for (const part of captions) { end += part.length + 1; if (event.charIndex < end) { caption(part); break; } }
      };
      line.onend = () => finish();
      line.onerror = () => finish(new Error('Voice unavailable. You can still follow the subtitles.'));
      caption(captions[0] ?? text);
      if (ticket !== this.generation) { finish(); return; }
      try { window.speechSynthesis.speak(line); }
      catch { finish(new Error('Voice unavailable. You can still follow the subtitles.')); }
    });
  }

  async play(sentences: string[], start: number, engine: 'natural' | 'device', preferred: string, onCaption: (text: string, segment: number) => void, speed = 1, naturalVoice = 'Bella') {
    this.stop();
    const ticket = this.generation;
    const rate = narratorSpeed(speed);
    // Attach a rejection handler immediately to prefetched work, even while audio plays.
    const synthesize = (text: string) => this.synthesize(text, rate, narratorNaturalVoice(naturalVoice), ticket).then(value => ({ value }), error => ({ error: error as Error }));
    let next = engine === 'natural' && sentences[start] ? synthesize(sentences[start]) : undefined;
    try {
      for (let index = start; index < sentences.length && ticket === this.generation; index++) {
        const text = sentences[index];
        if (engine === 'device') await this.device(text, preferred, rate, ticket, caption => onCaption(caption, index));
        else {
          const result = await next!;
          if (ticket !== this.generation) return;
          if ('error' in result) throw result.error;
          next = sentences[index + 1] ? synthesize(sentences[index + 1]) : undefined;
          await this.audio(result.value, text, ticket, caption => onCaption(caption, index));
        }
      }
    } catch (error) {
      if (ticket !== this.generation) return;
      this.stop();
      throw error;
    }
  }
}
