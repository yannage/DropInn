import { describe, expect, it } from 'vitest';
import { createCharacterProfile } from '../character';
import { createAdventure, reduceAdventure } from './engine';
import { approachOptions, ATTACKS } from './approaches';
import { rollSupport } from './teamwork';
import type { AdventureRoom, PlayerAction } from './types';

function room(combat = true) {
  let value = createAdventure(createCharacterProfile('Ash', 'fighter'), 'alice', 1000, 'FOCUS1');
  value.id = 'focused-mechanics';
  if (combat) { value.chapter = 1; value.chapterRound = 0; value.phase = 'reveal'; value.revealUntil = 1001;
    value = reduceAdventure(value, { id: 'advance', type: 'tick', userId: 'alice' }, 1001); }
  return value;
}
function act(value: AdventureRoom, action: PlayerAction, actor = 'alice', id = 'act') {
  return reduceAdventure(value, { id, type: 'act', userId: actor, expectedTurn: value.turn, action }, value.updatedAt + 1);
}
const own = (value: AdventureRoom, actor = 'alice') => [...value.events].reverse().find(event => event.actorId === actor && event.contribution)!;
function winning(value: AdventureRoom) {
  value.seats.filter(seat => seat.kind === 'human').forEach(seat => { seat.character.traits = { ATH: 50, ING: 50, CHA: 50, INT: 50 }; });
  return value;
}
function twoPlayers(combat = true) {
  let value = createAdventure(createCharacterProfile('Ash', 'fighter'), 'alice', 1000, 'FOCUS2');
  value = reduceAdventure(value, { id: 'join', type: 'join', userId: 'bob', character: createCharacterProfile('Bee', 'rogue') }, 1001);
  value = reduceAdventure(value, { id: 'tick', type: 'tick', userId: 'alice' }, value.deadline);
  value = reduceAdventure(value, { id: 'next', type: 'tick', userId: 'alice' }, value.revealUntil!);
  if (combat) { value.chapter = 1; value.phase = 'reveal'; value.revealUntil = value.updatedAt + 1;
    value = reduceAdventure(value, { id: 'combat', type: 'tick', userId: 'alice' }, value.revealUntil); }
  return value;
}

describe('focused actions', () => {
  it('freezes the enemy modifier and reuses both dice across attack choices', () => {
    const base = room(); const outcomes = ATTACKS.map(option => own(act(base, { token: 'fight', targetId: 'pack', approach: option.id })));
    expect(new Set(outcomes.map(event => event.roll)).size).toBe(1);
    expect(new Set(outcomes.map(event => event.result!.duel!.enemyRoll)).size).toBe(1);
    outcomes.forEach(event => {
      expect(event.result!.duel!.enemyModifier).toBe(base.enemyIntent!.duelModifier);
      expect(event.success).toBe(event.result!.duel!.playerTotal > event.result!.duel!.enemyTotal);
    });
    expect(outcomes[0].modifier! - outcomes[1].modifier!).toBe(3);
  });
  it('gives ties to the enemy and a good release can turn that tie into a win', () => {
    const base = room(); const action: PlayerAction = { token: 'fight', targetId: 'pack', approach: 'guarded' };
    const sample = own(act(base, action));
    base.seats[0].character.traits.ATH = sample.result!.duel!.enemyTotal - sample.roll!;
    expect(own(act(base, action)).success).toBe(false);
    expect(own(act(base, { ...action, releaseMs: 800 })).success).toBe(true);
  });
  it('makes the attack tradeoffs real and scales progress with human count', () => {
    const base = winning(twoPlayers());
    for (const attack of ATTACKS) {
      let value = act(base, { token: 'fight', targetId: 'pack', approach: attack.id });
      value = act(value, { token: 'assist', targetKind: 'hero', targetId: value.enemyIntent!.targetActorId }, 'bob', 'bob-act');
      expect(own(value).result).toMatchObject({ progress: attack.progress / 2, protection: attack.protection ?? 0 });
      if (attack.id === 'guarded') expect([...value.events].reverse().find(event => event.result?.damage !== undefined)?.result?.protection).toBe(3);
    }
  });
  it('has one shared enemy roll and identical results regardless of commit arrival order', () => {
    const base = twoPlayers();
    const a: PlayerAction = { token: 'fight', targetId: 'pack', approach: 'heavy' };
    const b: PlayerAction = { token: 'fight', targetId: 'pack', approach: 'quick' };
    const first = act(act(base, a), b, 'bob', 'bob-act');
    const second = act(act(base, b, 'bob', 'bob-act'), a);
    expect(own(first).result).toEqual(own(second).result);
    expect(own(first, 'bob').result).toEqual(own(second, 'bob').result);
    expect(own(first).result!.duel!.enemyRoll).toBe(own(first, 'bob').result!.duel!.enemyRoll);
    expect(first.players.alice.xp).toBe(second.players.alice.xp);
  });
  it('replays no rewards on a duplicate and ignores client-supplied opponent dice', () => {
    const base = room(); const action = { token: 'fight', targetId: 'pack', approach: 'heavy', enemyRoll: 1, enemyModifier: -100 } as PlayerAction;
    const value = act(base, action);
    expect(own(value).result).toEqual(own(act(base, { token: 'fight', targetId: 'pack', approach: 'heavy' })).result);
    expect(act(value, action)).toEqual(value);
  });
  it('rejects wrong-token, wrong-target and old-room approaches', () => {
    const base = room();
    expect(() => act(base, { token: 'influence', targetId: 'pack', approach: 'heavy' })).toThrow('available approach');
    expect(() => act(base, { token: 'fight', targetId: 'boat', approach: 'quick' })).toThrow('available approach');
    delete base.mechanicsVersion;
    expect(approachOptions(base, { token: 'fight', targetId: 'pack' })).toEqual([]);
    expect(() => act(base, { token: 'fight', targetId: 'pack', approach: 'quick' })).toThrow('available approach');
    expect(own(act(base, { token: 'fight', targetId: 'pack' })).result?.duel).toBeUndefined();
  });
  it('trades immediate investigation progress for stronger nonstacking next-turn insight', () => {
    const base = winning(room(false));
    const trail = act(base, { token: 'investigate', targetId: 'tracks', approach: 'trail' });
    const study = act(base, { token: 'investigate', targetId: 'tracks', approach: 'study' });
    expect(own(trail).result?.progress).toBe(4);
    expect(own(study).result).toMatchObject({ progress: 2, insight: 2 });
    const next = reduceAdventure(study, { id: 'next', type: 'tick', userId: 'alice' }, study.revealUntil!);
    next.flags.push(`insight:${next.turn}`);
    expect(rollSupport(next, 'alice', { token: 'fight', targetId: 'gate' }).insight).toBe(2);
    expect(rollSupport({ ...next, turn: next.turn + 1 }, 'alice', { token: 'fight', targetId: 'gate' }).insight).toBe(0);
  });
  it('separates calming current danger from opening the next turn', () => {
    const base = winning(room(false)); base.danger = 4;
    const soothe = act(base, { token: 'influence', targetId: 'mara', approach: 'soothe' });
    const distract = act(base, { token: 'influence', targetId: 'mara', approach: 'distract' });
    expect(own(soothe).result).toMatchObject({ progress: 3, danger: -1 });
    expect(own(distract).result).toMatchObject({ progress: 2, danger: 0, opening: 1 });
    expect(distract.flags).toContain(`opening:${base.turn + 1}`);
  });
  it('allows downed Mend, clamps healing and grants contribution without dice or progress', () => {
    const base = room(false); base.seats[0].hp = 0;
    const value = act(base, { token: 'assist', targetKind: 'hero', targetId: 'alice', approach: 'mend', releaseMs: 800 });
    expect(own(value).roll).toBeUndefined();
    expect(own(value).result).toMatchObject({ healing: 3, progress: 0 });
    expect(value.players.alice.xp).toBe(3);
    base.seats[0].hp = base.seats[0].character.maxHp - 1;
    expect(own(act(base, { token: 'assist', targetKind: 'hero', targetId: 'alice', approach: 'mend' })).result?.healing).toBe(1);
  });
  it('finishes an accepted Mend when its unthreatened recipient leaves', () => {
    const base = twoPlayers(false); base.seats.find(seat => seat.actorId === 'bob')!.hp = 2;
    const committed = act(base, { token: 'assist', targetKind: 'hero', targetId: 'bob', approach: 'mend' });
    const left = reduceAdventure(committed, { id: 'leave', type: 'leave', userId: 'bob' }, committed.updatedAt + 1);
    expect(own(left).result).toMatchObject({ healing: 2, targetId: 'bob' });
    expect(left.players.bob.character.hp).toBeGreaterThanOrEqual(4);
    expect(left.seats.some(seat => seat.actorId === 'bob')).toBe(false);
  });
});
