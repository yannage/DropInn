import type { RoundEntry, RoundSummary } from './roundSummary';

export type RevealBeat = { kind: 'intro' | 'actions' | 'consequences' | 'full'; entries: RoundEntry[]; key: string };

/** Client-only presentation based on the resolution timestamp, never a new game clock. */
export function revealBeatFor(summary: RoundSummary, now: number, bypass = false): RevealBeat {
  const full = { kind: 'full' as const, entries: summary.entries, key: 'full' };
  if (bypass) return full;
  const elapsed = Math.max(0, now - summary.at);
  if (elapsed < 1100) return { kind: 'intro', entries: [], key: 'intro' };
  const actions = summary.entries.filter(entry => entry.kind === 'action' || entry.kind === 'inactive');
  const actionIndex = Math.floor((elapsed - 1100) / 1400);
  if (actionIndex < actions.length) return { kind: 'actions', entries: [actions[actionIndex]], key: actions[actionIndex].id };
  const consequences = summary.entries.filter(entry => entry.kind === 'companion' || entry.kind === 'consequence');
  if (consequences.length && elapsed < 1100 + actions.length * 1400 + 1600)
    return { kind: 'consequences', entries: consequences, key: 'consequences' };
  return full;
}
