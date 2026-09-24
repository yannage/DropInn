import type { NarratorAssets } from './narratorModel';

export type NarratorEngine = 'natural' | 'device';
export interface NarratorPreference { collapsed: boolean; voice: string; engine: NarratorEngine }
export function narratorPreference(raw: string | null): NarratorPreference {
  try {
    const saved = JSON.parse(raw ?? '{}') ?? {};
    return { collapsed: saved.collapsed === true, voice: typeof saved.voice === 'string' ? saved.voice : '', engine: saved.engine === 'device' ? 'device' : 'natural' };
  } catch { return { collapsed: false, voice: '', engine: 'natural' }; }
}

export type NarratorRequest = { id: number; type: 'init'; assets?: NarratorAssets } | { id: number; type: 'generate'; text: string };
export type NarratorResponse = { id: number; type: 'ready' } | { id: number; type: 'progress'; loaded: number; total: number }
  | { id: number; type: 'audio'; samples: Float32Array; sampleRate: number } | { id: number; type: 'error'; message: string };

/** Split at sentence boundaries, independent of the narrow subtitle strip. */
export function narratorSentences(text: string): string[] {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return [];
  if ('Segmenter' in Intl) {
    const Segmenter = (Intl as unknown as { Segmenter: new(locale: string, options: {granularity: string}) => { segment(text: string): Iterable<{segment: string}> } }).Segmenter;
    const parts = Array.from(new Segmenter('en-GB', { granularity: 'sentence' }).segment(normalized), part => part.segment.trim()).filter(Boolean);
    const sentences: string[] = [];
    for (const part of parts) {
      if (sentences.length && /\b(?:Dr|Mr|Mrs|Ms|St|Capt|Prof)\.$/i.test(sentences[sentences.length - 1])) sentences[sentences.length - 1] += ` ${part}`;
      else sentences.push(part);
    }
    return sentences;
  }
  return normalized.match(/[^.!?]+(?:[.!?]+[”"’']*|$)/g)?.map(part => part.trim()) ?? [normalized];
}

/** Used only after actual tokenization exceeds the model limit. Never drop text. */
export function splitNarratorClause(text: string): [string, string] {
  const midpoint = text.length / 2;
  const clauses = Array.from(text.matchAll(/[,;:—–]\s+|\s+(?=(?:and|but|while|because)\s)/g), match => match.index! + match[0].length);
  const spaces = Array.from(text.matchAll(/\s+/g), match => match.index! + match[0].length);
  const points = clauses.length ? clauses : spaces;
  if (!points.length) throw new Error('This word is too long to read.');
  const cut = points.reduce((best, point) => Math.abs(point - midpoint) < Math.abs(best - midpoint) ? point : best);
  return [text.slice(0, cut).trim(), text.slice(cut).trim()];
}
