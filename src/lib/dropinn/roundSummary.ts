import type { AdventureRoom, StoryEvent } from './types';
import { resultBenefits } from './turnPresentation';

export interface RoundEntry {
  id: string;
  actorId?: string;
  actorName?: string;
  kind: 'action' | 'inactive' | 'companion' | 'consequence';
  text: string;
  consequence: string;
  benefits: string[];
  math?: string;
  targetId?: string;
  targetKind?: 'scene' | 'hero';
}
export interface RoundSummary {
  id: string;
  chapter: number;
  turn: number;
  at: number;
  entries: RoundEntry[];
  headline: string;
}

function entry(event: StoryEvent): RoundEntry {
  const result = event.result;
  const benefits = resultBenefits(event);
  const companion = event.kind === 'consequence' && event.actorId?.startsWith('companion-') && !result;
  const sign = (value: number) => `${value < 0 ? '−' : '+'} ${Math.abs(value)}`;
  const math = event.roll === undefined ? undefined : `${event.roll} ${sign(event.modifier ?? 0)} = ${event.roll + (event.modifier ?? 0)}${result?.duel ? ` vs ${result.duel.enemyRoll} + ${result.duel.enemyModifier} = ${result.duel.enemyTotal}` : ''}`;
  return {
    id: event.id, actorId: event.actorId, actorName: event.actorName,
    kind: event.kind === 'action' ? event.contribution === false ? 'inactive' : 'action' : companion ? 'companion' : 'consequence',
    // The saved sentence contains the name and target as they were at resolution.
    // Never substitute a current target name or infer a verb from a mutable scene.
    text: event.text,
    consequence: event.success !== false && event.change ? `${event.change.title}. ${event.change.next}`
      : benefits.length ? benefits.join(' · ') : event.effect ?? '',
    benefits, math, targetId: result?.targetId, targetKind: result?.targetKind,
  };
}

/** Completed rounds only; independent of the viewer, current seats, and current scene. */
export function roundSummaries(room: AdventureRoom): RoundSummary[] {
  const seen = new Set<string>();
  const unique = room.events.filter(event => !seen.has(event.id) && !!seen.add(event.id));
  const groups = new Map<string, StoryEvent[]>();
  for (const event of unique) {
    if (event.kind !== 'action' && event.kind !== 'consequence') continue;
    if (event.turn > room.turn || (event.turn === room.turn && event.chapter === room.chapter && room.phase === 'choosing')) continue;
    const key = `${event.chapter}:${event.turn}`;
    groups.set(key, [...(groups.get(key) ?? []), event]);
  }
  return [...groups.entries()].filter(([, events]) => events.some(event => event.kind === 'action')).map(([id, events]) => {
    const first = events[0];
    const at = Math.max(...events.map(event => event.at));
    const outcome = room.outcomes.find(outcome => outcome.chapter === first.chapter && outcome.at === at);
    const entries = events.map(entry);
    if (outcome && !entries.some(item => item.text === outcome.text)) entries.push({
      id: `outcome:${id}`, kind: 'consequence', text: outcome.text, consequence: '', benefits: [],
    });
    const changed = events.find(event => event.success !== false && event.change);
    const headline = outcome?.text ?? (changed ? `${changed.actorName ? `${changed.actorName}: ` : ''}${changed.change!.title}`
      : entries.find(item => item.kind === 'action')?.text ?? entries[0].text);
    return { id: `${room.id}:${id}`, chapter: first.chapter, turn: first.turn, at, entries, headline };
  }).sort((a, b) => a.chapter - b.chapter || a.turn - b.turn);
}

export function latestRound(room: AdventureRoom) { return roundSummaries(room).at(-1); }

/** Group effects at their real target; no extra events or numerical aggregation. */
export function roundCallouts(summary: RoundSummary) {
  const groups = new Map<string, RoundEntry[]>();
  for (const item of summary.entries) {
    if (item.kind !== 'action' || !item.targetId || item.targetKind !== 'scene') continue;
    groups.set(item.targetId, [...(groups.get(item.targetId) ?? []), item]);
  }
  return [...groups].map(([targetId, entries]) => ({ targetId, text: entries.map(item => `${item.actorName ?? 'A hero'}: ${item.consequence || item.text}`).join(' · ') }));
}
