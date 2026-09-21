import { describe, expect, it } from 'vitest';
import type { AdventureRoom, StoryEvent } from './types';
import { currentTurnResults, resultBenefits, revealBeat } from './turnPresentation';

const action: StoryEvent = { id: 'action', turn: 4, chapter: 1, at: 10_000, kind: 'action', text: 'A move.', contribution: true };

describe('turn presentation', () => {
  it('uses event time, skipping elapsed beats after reconnect and all beats with reduced motion', () => {
    expect(revealBeat(action, 10_000)).toBe('roll');
    expect(revealBeat(action, 10_450)).toBe('bonuses');
    expect(revealBeat(action, 11_100)).toBe('payoff');
    expect(revealBeat(action, 14_000)).toBe('payoff');
    expect(revealBeat(action, 10_000, true)).toBe('payoff');
  });

  it('does not recycle a previous turn or chapter result when no one acts', () => {
    const room = { turn: 4, chapter: 1, events: [action, { ...action, id: 'old', turn: 3 }, { ...action, id: 'other-chapter', chapter: 0 }, { ...action, id: 'arrival', kind: 'arrival' }] } as AdventureRoom;
    expect(currentTurnResults(room).map(event => event.id)).toEqual(['action']);
    expect(currentTurnResults({ ...room, turn: 5 })).toEqual([]);
  });

  it('shows both forward progress and the cost of a failed move without inventing a reward', () => {
    expect(resultBenefits({ ...action, success: false, result: { progress: 0.5, danger: 0.5 } })).toEqual(['+0.5 progress', '+0.5 danger']);
    expect(resultBenefits({ ...action, result: { progress: 1.5, danger: -0.5 } })).toEqual(['+1.5 progress', '−0.5 danger']);
  });

  it('keeps guaranteed Protect separate from progress, dice and old unstructured prose', () => {
    expect(resultBenefits({ ...action, result: { protection: 3, progress: 0, danger: 0, targetKind: 'hero' } })).toEqual(['3 protection']);
    expect(resultBenefits({ ...action, text: 'You gained 100 XP and healed.' })).toEqual([]);
  });
});
