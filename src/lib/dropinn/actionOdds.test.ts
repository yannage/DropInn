import { describe, expect, it } from 'vitest';
import { createCharacterProfile } from '../character';
import type { CharacterClassKey } from '../character';
import { actionOdds } from './actionOdds';
import { createAdventure } from './engine';
import type { AdventureRoom, CreativeProposal, PlayerAction } from './types';

function room(classKey: CharacterClassKey = 'fighter') {
  return createAdventure(createCharacterProfile('Ash', classKey), 'alice', 1000, 'ODDS01');
}
function combat(classKey: CharacterClassKey = 'fighter') {
  const value = room(classKey);
  value.chapter = 1;
  value.enemyIntent = { turn: value.turn, sourceId: 'pack', targetActorId: 'alice', baseDamage: 3, duelModifier: 3 };
  return value;
}
const rolled = (normal: number, goodRelease = normal + 5) => ({ guaranteed: false, normal, goodRelease });
const certain = { guaranteed: true, normal: 100, goodRelease: 100 };
const fight: PlayerAction = { token: 'fight', targetId: 'gate' };
const attack: PlayerAction = { token: 'fight', targetId: 'pack', approach: 'guarded' };
const hero = (value: AdventureRoom) => value.seats.find(seat => seat.actorId === 'alice')!;

describe('action odds', () => {
  it.each([
    ['fighter', 75, 65, 60, 80],
    ['wizard', 70, 70, 70, 75],
    ['rogue', 75, 75, 75, 80],
    ['cleric', 75, 75, 65, 80],
  ] as const)('uses %s traits for each ordinary token, including class-specific Help', (classKey, fightOdds, influence, investigate, assist) => {
    const value = room(classKey);
    expect(actionOdds(value, 'alice', fight)).toEqual(rolled(fightOdds));
    expect(actionOdds(value, 'alice', { token: 'influence', targetId: 'mara' })).toEqual(rolled(influence));
    expect(actionOdds(value, 'alice', { token: 'investigate', targetId: 'tracks' })).toEqual(rolled(investigate));
    expect(actionOdds(value, 'alice', { token: 'assist', targetId: 'tracks' })).toEqual(rolled(assist));
  });

  it('counts equality as a standard success and clamps naturally at both endpoints', () => {
    const value = room();
    hero(value).character.traits.ATH = -10; // Only a 20 reaches DC 10.
    expect(actionOdds(value, 'alice', fight)).toEqual(rolled(5, 10));
    hero(value).character.traits.ATH = -11;
    expect(actionOdds(value, 'alice', fight)).toEqual(rolled(0, 5));
    hero(value).character.traits.ATH = -12;
    expect(actionOdds(value, 'alice', fight)).toEqual(rolled(0, 0));
    hero(value).character.traits.ATH = 9; // A 1 reaches DC 10; it is still a rolled action.
    expect(actionOdds(value, 'alice', fight)).toEqual(rolled(100, 100));
  });

  it('uses strict opposed wins: equal modifiers give 190/400 wins and timing adds the 20 ties', () => {
    const value = combat();
    hero(value).character.traits.ATH = 3;
    expect(actionOdds(value, 'alice', attack)).toEqual(rolled(47.5, 52.5));
    hero(value).character.traits.ATH = -17;
    expect(actionOdds(value, 'alice', attack)).toEqual(rolled(0, 0));
    hero(value).character.traits.ATH = -16;
    expect(actionOdds(value, 'alice', attack)).toEqual(rolled(0, 0.25));
    hero(value).character.traits.ATH = 23;
    expect(actionOdds(value, 'alice', attack)).toEqual(rolled(100, 100));
  });

  it('applies the selected attack modifier and treats omitted approach as an ordinary check', () => {
    const value = combat();
    expect(actionOdds(value, 'alice', { ...attack, approach: 'quick' })).toEqual(rolled(61.75, 66));
    expect(actionOdds(value, 'alice', { ...attack, approach: 'heavy' })).toEqual(rolled(47.5, 52.5));
    expect(actionOdds(value, 'alice', attack)).toEqual(rolled(52.5, 57.25));
    expect(actionOdds(value, 'alice', { token: 'fight', targetId: 'pack' })).toEqual(rolled(70, 75));
  });

  it.each([
    ['fighter', 52.5, 57.25], ['wizard', 47.5, 52.5], ['rogue', 52.5, 57.25], ['cleric', 52.5, 57.25],
  ] as const)('uses the %s primary trait for opposed attacks', (classKey, normal, timed) => {
    expect(actionOdds(combat(classKey), 'alice', attack)).toEqual(rolled(normal, timed));
  });

  it('reads current insight, opening, and locked cross-token teammates without stale stacking', () => {
    const value = room();
    const companion = value.seats.find(seat => seat.kind === 'companion')!;
    companion.kind = 'human'; companion.actorId = 'bob';
    expect(actionOdds(value, 'alice', fight)).toEqual(rolled(75));
    value.flags.push(`insight:${value.turn}`, `insight:${value.turn}:2`, `opening:${value.turn}`);
    expect(actionOdds(value, 'alice', fight)).toEqual(rolled(90));
    value.commits.bob = { token: 'assist', targetId: 'gate' };
    expect(actionOdds(value, 'alice', fight)).toEqual(rolled(95, 100));
    value.commits.bob = { token: 'fight', targetId: 'gate' };
    expect(actionOdds(value, 'alice', fight)).toEqual(rolled(90));
    value.commits.bob = { token: 'assist', targetId: 'tracks' };
    expect(actionOdds(value, 'alice', fight)).toEqual(rolled(90));
    delete value.commits.bob;
    value.turn++;
    expect(actionOdds(value, 'alice', fight)).toEqual(rolled(75));
  });

  it('applies the same support to opposed dice and does not recompute a frozen enemy modifier', () => {
    const value = combat();
    value.flags.push(`insight:${value.turn}:2`, `opening:${value.turn}`);
    expect(actionOdds(value, 'alice', attack)).toEqual(rolled(66, 70));
    value.danger = 30;
    expect(actionOdds(value, 'alice', attack)).toEqual(rolled(66, 70));
    expect(actionOdds(value, 'alice', { token: 'investigate', targetId: 'reeds' })).toEqual(rolled(65));
  });

  it('returns 100/100 for signature Help, river saving, Protect, and Mend without inventing timing odds', () => {
    const village = room();
    expect(actionOdds(village, 'alice', { token: 'assist', targetId: 'gate' })).toEqual(certain);
    const value = combat();
    expect(actionOdds(value, 'alice', { token: 'assist', targetId: 'boat' })).toEqual(certain);
    expect(actionOdds(value, 'alice', { token: 'assist', targetKind: 'hero', targetId: 'alice' })).toEqual(certain);
    hero(value).hp = 0;
    expect(actionOdds(value, 'alice', { token: 'assist', targetKind: 'hero', targetId: 'alice', approach: 'mend' })).toEqual(certain);
    expect(actionOdds(value, 'alice', attack)).toBeUndefined();
  });

  it('returns ordinary class odds when a chapter choice settles instead of caching its guarantee', () => {
    const value = room();
    value.chapterChoices = { 'briar-shelter': { phase: 'settled', level: 0, outcome: 'lost' } };
    expect(actionOdds(value, 'alice', { token: 'assist', targetId: 'gate' })).toEqual(rolled(80));
    value.chapterChoices['briar-shelter'] = { phase: 'ready', level: 1 };
    expect(actionOdds(value, 'alice', { token: 'influence', targetId: 'herd' })).toEqual(rolled(65));
    expect(actionOdds(value, 'alice', { token: 'assist', targetId: 'herd' })).toEqual(certain);
  });

  it('requires a valid supported Spotlight proposal and uses its ordinary class/DC roll', () => {
    const value = room();
    const proposal: CreativeProposal = { id: 'preview-fixture', turn: value.turn, targetId: 'gate', effect: 'cover',
      label: 'Brace the gate', description: 'Use the loose timber as a brace.', idea: 'Brace it with the timber.', supported: true, source: 'authored' };
    const action: PlayerAction = { token: 'spotlight', targetId: 'gate', proposal };
    expect(actionOdds(value, 'alice', { token: 'spotlight', targetId: 'gate' })).toBeUndefined();
    expect(actionOdds(value, 'alice', action)).toEqual(rolled(75));
    expect(actionOdds(value, 'alice', { ...action, proposal: { ...proposal, supported: false } })).toBeUndefined();
    expect(actionOdds(value, 'alice', { ...action, proposal: { ...proposal, turn: value.turn - 1 } })).toBeUndefined();
    value.players.alice.spotlightChapters.push(value.chapter);
    expect(actionOdds(value, 'alice', action)).toBeUndefined();
  });

  it('keeps timing comparisons independent of a provided release and the deterministic roll identity', () => {
    const value = combat();
    const before = structuredClone(value);
    expect(actionOdds(value, 'alice', { ...attack, releaseMs: 800 })).toEqual(actionOdds(value, 'alice', attack));
    expect(actionOdds(value, 'alice', { ...attack, releaseMs: 50 })).toEqual(actionOdds(value, 'alice', attack));
    expect(value).toEqual(before);
    value.id = 'a-completely-different-seed';
    expect(actionOdds(value, 'alice', attack)).toEqual(rolled(52.5, 57.25));
  });

  it('retains ordinary old-room rules and declines unavailable or stale attack approaches', () => {
    const value = combat();
    value.adventureVersion = 1;
    delete value.mechanicsVersion;
    expect(actionOdds(value, 'alice', { token: 'fight', targetId: 'pack' })).toEqual(rolled(70));
    expect(actionOdds(value, 'alice', attack)).toBeUndefined();
    value.mechanicsVersion = 1;
    value.enemyIntent!.turn--;
    expect(actionOdds(value, 'alice', attack)).toBeUndefined();
    expect(actionOdds(value, 'alice', { token: 'fight', targetId: 'pack' })).toEqual(rolled(70));
    delete value.enemyIntent;
    expect(actionOdds(value, 'alice', attack)).toBeUndefined();
  });

  it('does not advertise odds for an absent seat, an invalid target, or an ended choosing phase', () => {
    const value = room();
    expect(actionOdds(value, 'visitor', fight)).toBeUndefined();
    expect(actionOdds(value, 'alice', { token: 'fight', targetId: 'mara' })).toBeUndefined();
    expect(actionOdds(value, 'alice', { token: 'investigate', targetId: 'missing-target' })).toBeUndefined();
    expect(actionOdds(value, 'alice', { ...fight, approach: 'heavy' })).toBeUndefined();
    expect(actionOdds(value, 'alice', { ...fight, releaseMs: 1300 })).toBeUndefined();
    value.phase = 'reveal';
    expect(actionOdds(value, 'alice', fight)).toBeUndefined();
    value.phase = 'choosing'; value.status = 'parked';
    expect(actionOdds(value, 'alice', fight)).toBeUndefined();
    value.status = 'active'; value.commits.alice = fight;
    expect(actionOdds(value, 'alice', fight)).toBeUndefined();
    delete value.commits.alice; hero(value).leaving = true;
    expect(actionOdds(value, 'alice', fight)).toBeUndefined();
    hero(value).leaving = false; value.adventureVersion = 999;
    expect(actionOdds(value, 'alice', fight)).toBeUndefined();
  });

  it('rejects unavailable hero aid and invalid special-action modifiers before reporting a guarantee', () => {
    const value = combat();
    const other = value.seats.find(seat => seat.actorId !== 'alice')!;
    expect(actionOdds(value, 'alice', { token: 'assist', targetKind: 'hero', targetId: other.actorId })).toBeUndefined();
    expect(actionOdds(value, 'alice', { token: 'assist', targetKind: 'hero', targetId: 'alice', approach: 'mend' })).toBeUndefined();
    expect(actionOdds(value, 'alice', { token: 'assist', targetKind: 'hero', targetId: 'unknown' })).toBeUndefined();
    expect(actionOdds(value, 'alice', { token: 'assist', targetId: 'boat', combination: { id: 'hidden-path', payoffId: 'crossing' } })).toBeUndefined();
    expect(actionOdds(value, 'alice', { token: 'fight', targetId: 'boat', approach: 'heavy' })).toBeUndefined();
  });
});
