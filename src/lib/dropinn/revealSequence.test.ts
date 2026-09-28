import { describe, expect, it } from 'vitest';
import { revealBeatFor } from './revealSequence';
import type { RoundSummary } from './roundSummary';

const summary: RoundSummary = { id: 'round', chapter: 1, turn: 2, at: 1000, headline: 'A result', entries: [
  { id: 'a', kind: 'action', text: 'A moves.', consequence: '', benefits: [] },
  { id: 'b', kind: 'inactive', text: 'B waits.', consequence: '', benefits: [] },
  { id: 'c', kind: 'companion', text: 'C helps.', consequence: '', benefits: [] },
  { id: 'd', kind: 'consequence', text: 'The enemy strikes.', consequence: '', benefits: [] },
] };

describe('recorded reveal sequence', () => {
  it('shows actions, shared consequences, then the whole recap without restarting on reconnect', () => {
    expect(revealBeatFor(summary, 1000).kind).toBe('intro');
    expect(revealBeatFor(summary, 1349).entries).toEqual([]);
    expect(revealBeatFor(summary, 1350).entries.map(entry => entry.id)).toEqual(['a']);
    expect(revealBeatFor(summary, 2550).entries.map(entry => entry.id)).toEqual(['a', 'b']);
    expect(revealBeatFor(summary, 3750).entries.map(entry => entry.id)).toEqual(['a', 'b', 'c']);
    expect(revealBeatFor(summary, 4950).kind).toBe('full');
    expect(revealBeatFor(summary, 1600, true).kind).toBe('full');
  });
  it('compresses busy rounds to finish by 5.85 seconds without dropping entries', () => {
    const crowded = { ...summary, entries: Array.from({ length: 14 }, (_, i) => ({ ...summary.entries[i % 4], id: String(i) })) };
    expect(revealBeatFor(crowded, crowded.at + 5850).entries).toEqual(crowded.entries);
    expect(revealBeatFor(crowded, crowded.at + 349).entries).toEqual([]);
    expect(revealBeatFor(crowded, crowded.at - 100).kind).toBe('intro');
    expect(revealBeatFor({ ...summary, entries: [] }, 1000).kind).toBe('full');
  });
});
