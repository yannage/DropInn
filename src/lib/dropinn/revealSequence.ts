import type { RoundEntry, RoundSummary } from './roundSummary';

export type RevealBeat = { kind: 'intro' | 'actions' | 'consequences' | 'full'; entries: RoundEntry[]; key: string };

export function revealEntryDelay(count: number, index: number) {
  return 350 + index * Math.min(1200, 5500 / Math.max(1, count - 1));
}

/** Client-only presentation based on the resolution timestamp, never a new game clock. */
export function revealBeatFor(summary: RoundSummary, now: number, bypass = false): RevealBeat {
  const full = { kind: 'full' as const, entries: summary.entries, key: 'full' };
  if (bypass) return full;
  const elapsed = Math.max(0, now - summary.at);
  if (!summary.entries.length) return full;
  if (elapsed < 350) return { kind: 'intro', entries: [], key: 'intro' };
  // Retain every revealed row. Even a crowded round finishes before 5.85s.
  const interval = revealEntryDelay(summary.entries.length, 1) - 350;
  const count = Math.min(summary.entries.length, 1 + Math.floor((elapsed - 350) / interval));
  if (count === summary.entries.length) return full;
  const entries = summary.entries.slice(0, count);
  const last = entries.at(-1)!;
  return { kind: last.kind === 'action' || last.kind === 'inactive' ? 'actions' : 'consequences', entries, key: last.id };
}
