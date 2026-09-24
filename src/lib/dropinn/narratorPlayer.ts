import { narratorCaptions, narratorVoice } from './narrator';
import type { NarratorRequest, NarratorResponse } from './narratorAudio';

type AudioResult = Extract<NarratorResponse, {type: 'audio'}>;
type Pending = { resolve: (result: NarratorResponse) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout>; type: string };
const canceled = () => new DOMException('Narration canceled', 'AbortError');

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
  ready = false;
  onProgress?: (loaded: number, total: number) => void;

  constructor(private createWorker = () => new Worker(new URL('./narrator.worker.ts', import.meta.url), { type: 'module' })) {}

  /** Called synchronously inside the user's click, before downloads or synthesis. */
  async unlock() {
    this.context ??= new AudioContext();
    return this.context.resume();
  }

  private request(message: Omit<Extract<NarratorRequest, {type: 'init'}>, 'id'> | Omit<Extract<NarratorRequest, {type: 'generate'}>, 'id'>): Promise<NarratorResponse> {
    if (!this.worker) {
      this.worker = this.createWorker();
      this.worker.onmessage = (event: MessageEvent<NarratorResponse>) => {
        const result = event.data, pending = this.pending.get(result.id);
        if (!pending) return;
        if (result.type === 'progress') { this.onProgress?.(result.loaded, result.total); return; }
        clearTimeout(pending.timer); this.pending.delete(result.id);
        if (result.type === 'error') pending.reject(new Error(result.message));
        else pending.resolve(result);
      };
      this.worker.onerror = () => this.resetWorker(new Error('Natural voice unavailable on this device.'));
    }
    const id = ++this.serial;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => this.resetWorker(new Error(message.type === 'init' ? 'The voice download took too long. Please retry.' : 'Speech took too long on this device.')), message.type === 'init' ? 180000 : 20000);
      this.pending.set(id, { resolve, reject, timer, type: message.type });
      this.worker!.postMessage({ ...message, id });
    });
  }

  async initialize(download: boolean) {
    if (this.ready) return;
    try {
      await this.request({ type: 'init', download });
      this.ready = true;
    } catch (error) {
      this.resetWorker(error instanceof Error ? error : new Error('Natural voice unavailable.'));
      throw error;
    }
  }

  private resetWorker(error: Error) {
    this.worker?.terminate(); this.worker = undefined; this.ready = false;
    for (const pending of this.pending.values()) { clearTimeout(pending.timer); pending.reject(error); }
    this.pending.clear();
  }

  stop() {
    ++this.generation;
    this.timers.forEach(clearTimeout); this.timers = [];
    this.source?.stop(); this.source = undefined;
    this.finishPlayback?.(); this.finishPlayback = undefined;
    if (this.speech) { this.speech.onend = null; this.speech.onerror = null; window.speechSynthesis?.cancel(); this.speech = undefined; }
    for (const [id, pending] of this.pending) {
      if (pending.type !== 'generate') continue;
      this.worker?.postMessage({ type: 'cancel', id });
      clearTimeout(pending.timer); pending.reject(canceled()); this.pending.delete(id);
    }
  }

  cancelDownload() { this.stop(); this.resetWorker(canceled()); }
  dispose() { this.cancelDownload(); void this.context?.close(); this.context = undefined; }

  private async audio(result: AudioResult, text: string, ticket: number, caption: (text: string) => void) {
    if (ticket !== this.generation) return;
    const context = this.context!;
    if (context.state !== 'running') throw new Error('Tap the speaker to resume the voice.');
    const buffer = context.createBuffer(1, result.samples.length, result.sampleRate);
    buffer.copyToChannel(new Float32Array(result.samples), 0);
    const source = context.createBufferSource(); source.buffer = buffer; source.connect(context.destination);
    this.source = source;
    const captions = narratorCaptions(text), total = Math.max(1, text.split(/\s+/).length);
    caption(captions[0] ?? text);
    let words = 0;
    captions.slice(0, -1).forEach((line, index) => {
      words += line.split(/\s+/).length;
      this.timers.push(setTimeout(() => { if (ticket === this.generation) caption(captions[index + 1]); }, buffer.duration * words / total * 1000));
    });
    await new Promise<void>(resolve => {
      this.finishPlayback = resolve;
      source.onended = () => { source.disconnect(); if (this.source === source) this.source = undefined; resolve(); };
      source.start();
    });
    if (ticket === this.generation) { this.timers.forEach(clearTimeout); this.timers = []; this.finishPlayback = undefined; }
  }

  private device(text: string, preferred: string, ticket: number, caption: (text: string) => void): Promise<void> {
    return new Promise((resolve, reject) => {
      const line = new SpeechSynthesisUtterance(text);
      const voice = narratorVoice(window.speechSynthesis.getVoices(), preferred);
      if (voice) line.voice = voice;
      line.lang = voice?.lang ?? 'en-GB'; line.rate = 1; line.pitch = 1;
      const captions = narratorCaptions(text);
      caption(captions[0] ?? text);
      line.onboundary = event => {
        if (ticket !== this.generation) return;
        let end = 0;
        for (const part of captions) { end += part.length + 1; if (event.charIndex < end) { caption(part); break; } }
      };
      const watchdog = setTimeout(() => reject(new Error('Voice paused. Tap the speaker to try again.')), Math.max(20000, text.split(/\s+/).length * 1000));
      this.timers.push(watchdog);
      this.finishPlayback = resolve;
      line.onend = () => { clearTimeout(watchdog); this.speech = undefined; resolve(); };
      line.onerror = () => { clearTimeout(watchdog); reject(new Error('Voice unavailable. You can still follow the subtitles.')); };
      this.speech = line;
      window.speechSynthesis.speak(line);
    });
  }

  async play(sentences: string[], start: number, engine: 'natural' | 'device', preferred: string, onCaption: (text: string, segment: number) => void) {
    this.stop();
    const ticket = this.generation;
    // Attach a rejection handler immediately to prefetched work, even while audio plays.
    const synthesize = (text: string) => this.request({ type: 'generate', text }).then(value => ({ value: value as AudioResult }), error => ({ error: error as Error }));
    let next = engine === 'natural' && sentences[start] ? synthesize(sentences[start]) : undefined;
    for (let index = start; index < sentences.length && ticket === this.generation; index++) {
      const text = sentences[index];
      if (engine === 'device') await this.device(text, preferred, ticket, caption => onCaption(caption, index));
      else {
        const result = await next!;
        if (ticket !== this.generation) return;
        if ('error' in result) throw result.error;
        next = sentences[index + 1] ? synthesize(sentences[index + 1]) : undefined;
        await this.audio(result.value, text, ticket, caption => onCaption(caption, index));
      }
    }
  }
}
