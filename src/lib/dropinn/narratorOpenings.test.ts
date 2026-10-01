import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import manifest from './narrator-openings.json';
import { ADVENTURES } from './registry';
import { narratorSentences } from './narratorAudio';
import { narratorNaturalVoices } from './narratorVoices';
import { narratorModel, narratorRevision } from './narratorModel';
import type { NarratorOpeningClip } from './narratorOpenings';

const fixture: NarratorOpeningClip = { text: 'The evening bell rings over empty pens.', voice: 'Bella', speed: 1, url: '/audio/opening.wav', bytes: 52, sampleRate: 24000, sampleCount: 4, duration: 4 / 24000, sha256: '' };
function wave() {
  const bytes = new Uint8Array(fixture.bytes), view = new DataView(bytes.buffer);
  const tag = (position: number, text: string) => [...text].forEach((char, index) => { bytes[position + index] = char.charCodeAt(0); });
  tag(0, 'RIFF'); view.setUint32(4, bytes.length - 8, true); tag(8, 'WAVEfmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, 24000, true); view.setUint32(28, 48000, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  tag(36, 'data'); view.setUint32(40, 8, true);
  [0, 16384, -32768, 32767].forEach((sample, index) => view.setInt16(44 + index * 2, sample, true));
  return bytes;
}
let network: ReturnType<typeof vi.fn>;
beforeEach(() => {
  vi.resetModules();
  network = vi.fn(async () => new Response(wave()));
  vi.stubGlobal('fetch', network);
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe('instant authored opening recordings', () => {
  it('covers every current first chapter and selected voice without a request during lookup', async () => {
    const { narratorOpeningClip } = await import('./narratorOpenings');
    expect(manifest.model).toBe(narratorModel); expect(manifest.revision).toBe(narratorRevision);
    for (const adventure of ADVENTURES) for (const sentence of narratorSentences(adventure.chapters[0].intro)) {
      for (const voice of narratorNaturalVoices) {
        const clip = narratorOpeningClip(sentence, voice.id, 1);
        expect(clip, `${adventure.id}: ${voice.id}: ${sentence}`).toBeDefined();
        expect(clip?.text).toBe(sentence); expect(clip?.voice).toBe(voice.id);
      }
    }
    expect(network).not.toHaveBeenCalled();
  });
  it('requires exact prose, voice and synthesis speed, while tolerating whitespace', async () => {
    const { narratorOpeningClip } = await import('./narratorOpenings');
    expect(narratorOpeningClip(`  ${fixture.text.replace(/ /g, '\n')} `, 'Bella', 1)?.text).toBe(fixture.text);
    expect(narratorOpeningClip(fixture.text.replace('empty', 'crowded'), 'Bella', 1)).toBeUndefined();
    expect(narratorOpeningClip(fixture.text, 'Unknown', 1)).toBeUndefined();
    expect(narratorOpeningClip(fixture.text, 'Bella', 1.25)).toBeUndefined();
    expect(narratorOpeningClip(fixture.text, 'Bella', NaN)).toBeUndefined();
  });
  it('resolves recordings under the configured site base', async () => {
    vi.stubEnv('BASE_URL', '/table/');
    const { narratorOpeningClip } = await import('./narratorOpenings');
    expect(narratorOpeningClip(fixture.text, 'Bella', 1)?.url).toMatch(/^\/table\/audio\/narrator-openings\//);
  });
  it('ignores a recording manifest for a different model revision', async () => {
    vi.doMock('./narrator-openings.json', () => ({ default: { ...manifest, revision: 'outdated-model' } }));
    try {
      const { narratorOpeningClip } = await import('./narratorOpenings');
      expect(narratorOpeningClip(fixture.text, 'Bella', 1)).toBeUndefined();
    } finally { vi.doUnmock('./narrator-openings.json'); }
  });
  it('ships valid size-bounded files matching their content hashes', () => {
    const entries = manifest.clips as NarratorOpeningClip[];
    const first = new Set(ADVENTURES.map(adventure => narratorSentences(adventure.chapters[0].intro)[0]));
    expect(entries.length).toBeGreaterThan(0);
    expect(entries.reduce((sum, entry) => sum + entry.bytes, 0)).toBeLessThanOrEqual(20 * 1024 * 1024);
    for (const clip of entries) {
      const bytes = readFileSync(`public/${clip.url}`);
      expect(bytes.byteLength).toBe(clip.bytes);
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(clip.sha256);
      expect(bytes.toString('ascii', 8, 16)).toBe('WAVEfmt ');
      expect(clip.bytes).toBe(44 + clip.sampleCount * 2);
      if (first.has(clip.text)) expect(clip.bytes).toBeLessThanOrEqual(350 * 1024);
    }
  });
  it('loads canonical PCM without an audio decoder and preserves signed samples', async () => {
    const { loadNarratorOpeningClip } = await import('./narratorOpenings');
    const result = await loadNarratorOpeningClip(fixture);
    expect(result.sampleRate).toBe(24000);
    expect(Array.from(result.samples)).toEqual([0, 0.5, -1, 32767 / 32768]);
    expect(network).toHaveBeenCalledWith(fixture.url, expect.objectContaining({ cache: 'force-cache', signal: expect.any(AbortSignal) }));
  });
  it('rejects truncated, excessive, wrong-format and silent recordings', async () => {
    const { loadNarratorOpeningClip } = await import('./narratorOpenings');
    const wrongRate = wave(); new DataView(wrongRate.buffer).setUint32(24, 16000, true);
    const wrongFormat = wave(); new DataView(wrongFormat.buffer).setUint16(20, 3, true);
    const silent = wave(); silent.fill(0, 44);
    for (const bytes of [wave().slice(0, -2), new Uint8Array(54), wrongRate, wrongFormat, silent]) {
      network.mockResolvedValueOnce(new Response(bytes));
      await expect(loadNarratorOpeningClip(fixture)).rejects.toThrow('unavailable');
    }
    network.mockResolvedValueOnce(new Response(wave(), { headers: { 'content-length': '10000000' } }));
    await expect(loadNarratorOpeningClip(fixture)).rejects.toThrow('unavailable');
    network.mockResolvedValueOnce(new Response(null, { status: 404 }));
    await expect(loadNarratorOpeningClip(fixture)).rejects.toThrow('unavailable');
  });
  it('cancels pending loading and makes no request for an already canceled cue', async () => {
    const { loadNarratorOpeningClip } = await import('./narratorOpenings');
    const controller = new AbortController();
    network.mockImplementation(() => new Promise(() => {}));
    const loading = loadNarratorOpeningClip(fixture, controller.signal);
    const rejection = expect(loading).rejects.toMatchObject({ name: 'AbortError' });
    controller.abort(); await rejection;
    expect(network.mock.calls[0][1].signal.aborted).toBe(true);
    await expect(loadNarratorOpeningClip(fixture, controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
    expect(network).toHaveBeenCalledTimes(1);
  });
  it('falls back after three seconds even when a fetch implementation hangs', async () => {
    vi.useFakeTimers();
    const { loadNarratorOpeningClip } = await import('./narratorOpenings');
    network.mockImplementation(() => new Promise(() => {}));
    const rejection = expect(loadNarratorOpeningClip(fixture)).rejects.toMatchObject({ name: 'TimeoutError' });
    await vi.advanceTimersByTimeAsync(3000); await rejection;
    expect(network.mock.calls[0][1].signal.aborted).toBe(true);
  });
  it('also bounds a stalled response body and rejects invalid metadata before fetching', async () => {
    vi.useFakeTimers();
    const { loadNarratorOpeningClip } = await import('./narratorOpenings');
    network.mockResolvedValueOnce(new Response(new ReadableStream({ start() {} })));
    const rejection = expect(loadNarratorOpeningClip(fixture)).rejects.toMatchObject({ name: 'TimeoutError' });
    await vi.advanceTimersByTimeAsync(3000); await rejection;
    network.mockClear();
    await expect(loadNarratorOpeningClip({ ...fixture, bytes: 20 * 1024 * 1024 })).rejects.toThrow('unavailable');
    expect(network).not.toHaveBeenCalled();
  });
});
