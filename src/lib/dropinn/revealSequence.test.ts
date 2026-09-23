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
    expect(revealBeatFor(summary, 2100).entries.map(entry => entry.id)).toEqual(['a']);
    expect(revealBeatFor(summary, 3500).entries.map(entry => entry.id)).toEqual(['b']);
    expect(revealBeatFor(summary, 4900).entries.map(entry => entry.id)).toEqual(['c', 'd']);
    expect(revealBeatFor(summary, 6500).kind).toBe('full');
    expect(revealBeatFor(summary, 1600, true).kind).toBe('full');
  });
});
