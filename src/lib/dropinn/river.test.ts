import { describe, expect, it } from 'vitest';
import { createCharacterProfile } from '../character';
import { createAdventure, reduceAdventure } from './engine';
import { currentAdventure, adventureFor } from './registry';
import { getScene } from './scene';
import { riverActionPreview, riverStatus } from './river';
import { approachOptions } from './approaches';
import { stageProjection, stageTimeline, roundScrollReadyAt } from './stagePlayback';
import { contextualActionLabel, derivePlayerGuidance } from './playerGuidance';
import type { AdventureCommand, AdventureRoom, PlayerAction } from './types';

let serial = 0;
const safe: PlayerAction = { token: 'assist', targetId: 'boat' };
const rush: PlayerAction = { token: 'fight', targetId: 'boat' };
const recover: PlayerAction = { token: 'investigate', targetId: 'reeds' };
function fixture(count = 1, success = true) {
  const room = createAdventure(createCharacterProfile('Ada', 'fighter'), 'a', 1000, 'RIVER3');
  room.id = 'river-choice-fixture'; room.chapter = 1; room.chapterRound = 1; room.progress = 0; room.danger = 0;
  room.events = []; room.riverSupplies = { status: 'drifting' };
  const first = room.seats.find(seat => seat.actorId === 'a')!;
  const trait = success ? 100 : -100;
  first.character.traits = { ATH: trait, CHA: trait, ING: trait, INT: trait };
  first.hp = first.character.maxHp = 100;
  // Keep companions out of numerical assertions; companion/solo behavior is checked separately.
  room.seats = [first];
  if (count === 2) {
    const second = structuredClone(first); second.actorId = 'b'; second.id = 'seat-1'; second.character.name = 'Bea';
    room.seats.push(second);
    room.players.b = { ...structuredClone(room.players.a), userId: 'b', character: second.character, seatId: second.id };
  }
  room.enemyIntent = { turn: room.turn, sourceId: 'pack', targetActorId: 'a', baseDamage: 3, duelModifier: 3 };
  return room;
}
function command(room: AdventureRoom, type: AdventureCommand['type'], userId = 'a', extra: Partial<AdventureCommand> = {}, now = room.updatedAt + 1) {
  return reduceAdventure(room, { id: `river-${++serial}`, type, userId, expectedTurn: room.turn, ...extra }, now);
}
const act = (room: AdventureRoom, action: PlayerAction, userId = 'a') => command(room, 'act', userId, { action });
const next = (room: AdventureRoom) => command(room, 'tick', 'a', {}, room.revealUntil!);
const own = (room: AdventureRoom, id = 'a') => [...room.events].reverse().find(event => event.turn === room.turn && event.actorId === id && event.kind === 'action')!;

describe('Briar Glen v3 river decisions', () => {
  it('retains river choices in new tables and leaves pinned v1/v2 and missing versions untouched', () => {
    expect(currentAdventure().version).toBe(4);
    expect(adventureFor().version).toBe(1);
    for (const version of [1, 2]) {
      const room = fixture(); room.adventureVersion = version; delete room.riverSupplies;
      expect(riverStatus(room)).toBeUndefined();
      const result = act(room, safe);
      expect(result.riverSupplies).toBeUndefined();
      expect(own(result).roll).toBeDefined();
      expect(own(result).result?.progress).toBe(2);
    }
    const old = fixture(); delete old.adventureVersion; delete old.riverSupplies;
    expect(riverActionPreview(old, safe)).toBeUndefined();
  });

  it('offers honest safe and risky previews, without misleading approaches or timing bonuses', () => {
    const room = fixture();
    expect(riverActionPreview(room, safe)).toMatchObject({ guaranteed: true });
    expect(riverActionPreview(room, rush)?.detail).toMatch(/4.*crossing/);
    expect(riverActionPreview(room, rush)?.detail).toMatch(/spill/i);
    expect(approachOptions(room, safe)).toEqual([]);
    room.riverSupplies = { status: 'spilled' };
    expect(approachOptions(room, recover)).toEqual([]);
    expect(contextualActionLabel(room, recover)).toMatch(/Recover/);
    expect(derivePlayerGuidance({ room, userId: 'a', now: 1001, selection: safe }).detail).toMatch(/Guaranteed/);
    expect(() => act(room, { ...recover, approach: 'study' })).toThrow();
    expect(() => act(room, { ...safe, combination: { id: 'hidden-path', payoffId: 'crossing' } })).toThrow();
    expect(() => act(room, rush)).toThrow();
  });

  it('lets a downed hero secure supplies without dice, progress, timing bonus, or class support', () => {
    const room = fixture(1, false); room.seats[0].hp = 0;
    const result = act(room, { ...safe, releaseMs: 800 });
    expect(result.riverSupplies?.status).toBe('secured');
    expect(result.progress).toBe(0);
    expect(own(result)).toMatchObject({ contribution: true, success: true, result: { progress: 0, executionBonus: 0 } });
    expect(own(result).roll).toBeUndefined();
    expect(result.flags).not.toContain(`cover:${room.turn}`);
    expect(result.players.a).toMatchObject({ actions: 1, xp: 3 });
  });

  it('trades a risky rush for current progress and a concrete, recoverable spill', () => {
    const won = act(fixture(), rush);
    expect(won.riverSupplies?.status).toBe('secured');
    expect(own(won).result?.progress).toBe(4);
    expect(won.flags).not.toContain(`cover:${won.turn}`);
    const before = fixture(1, false);
    const missed = act(before, rush);
    expect(missed.riverSupplies?.status).toBe('spilled');
    expect(own(missed)).toMatchObject({ success: false, result: { progress: 1, danger: 1, changed: false } });
    expect(missed.events.some(event => event.kind === 'consequence' && event.result?.changed)).toBe(true);
    const choosing = next(missed);
    expect(getScene(choosing).targets.find(target => target.id === 'boat')?.tokens).not.toContain('fight');
    expect(riverActionPreview(choosing, safe)?.detail).toMatch(/\+1.*chapel/);
    expect(riverActionPreview(choosing, recover)?.detail).toMatch(/\+3.*chapel/);
    expect(act(choosing, safe).riverSupplies?.status).toBe('salvaged');
    const secondMiss = act(choosing, recover);
    expect(secondMiss.riverSupplies?.status).toBe('spilled');
    choosing.seats[0].character.traits.INT = 100;
    const recovered = act(choosing, recover);
    expect(recovered.riverSupplies?.status).toBe('secured');
    expect(own(recovered).result?.progress).toBe(2);
    expect(recovered.flags).not.toContain(`insight:${choosing.turn + 1}`);
  });

  it('combines simultaneous rescue attempts from the same starting state, independent of arrival order', () => {
    const room = fixture(2); room.riverSupplies = { status: 'spilled' };
    const commit = (source: AdventureRoom, userId: string, action: PlayerAction, now: number) => reduceAdventure(source,
      { id: `fixed-${userId}`, type: 'act', userId, expectedTurn: source.turn, action }, now);
    const ab = commit(commit(room, 'a', safe, 1001), 'b', recover, 1002);
    const ba = commit(commit(room, 'b', recover, 1001), 'a', safe, 1002);
    expect(ab.riverSupplies?.status).toBe('secured');
    expect(ab.riverSupplies).toEqual(ba.riverSupplies);
    expect(ab.events).toEqual(ba.events);
    expect(ab.players).toEqual(ba.players);
    expect(ab.progress).toBe(1);
    expect(own(ab, 'a').roll).toBeUndefined();
    expect(own(ab, 'b').result?.progress).toBe(1);
  });

  it('does not let a spill create a same-turn recovery or overwrite a successful teammate', () => {
    const room = fixture(2, false);
    room.seats[1].character.traits.INT = 100;
    const result = act(act(room, rush), recover, 'b');
    expect(result.riverSupplies?.status).toBe('spilled');
    expect(own(result, 'b').result?.progress).toBe(2); // ordinary investigation: 4/N
    expect(result.combinations?.[0]?.id).toBe('hidden-path');
    const secured = act(act(room, rush), safe, 'b');
    expect(secured.riverSupplies?.status).toBe('secured');
  });

  it('settles deadline actions before current loss, and still offers useful moves afterward', () => {
    const room = fixture(); room.chapterRound = 3;
    expect(riverStatus(room)?.roundsLeft).toBe(1);
    expect(act(room, safe).riverSupplies?.status).toBe('secured');
    const expired = command(room, 'tick', 'a', {}, room.deadline);
    expect(expired.riverSupplies?.status).toBe('lost');
    const choosing = next(expired);
    expect(riverActionPreview(choosing, safe)).toBeUndefined();
    expect(act(choosing, safe).progress).toBeGreaterThan(0);
    expect(() => command(room, 'act', 'a', { action: safe }, room.deadline)).toThrow();
  });

  it('does not promise another recovery turn when a spill will be lost', () => {
    for (const end of ['deadline', 'crossing']) {
      const room = fixture(1, false);
      if (end === 'deadline') room.chapterRound = 3;
      else room.progress = 25;
      expect(riverActionPreview(room, rush)?.detail).not.toContain('for next turn');
      const resolved = act(room, rush);
      expect(resolved.riverSupplies?.status).toBe('lost');
      const spill = resolved.events.find(event => event.result?.riverSupplies?.status === 'spilled');
      expect(spill?.text).toContain('No recovery turn remains');
    }
  });

  it('keeps a reviewed Spotlight rescue and its healing, progress, and miss costs honest', () => {
    for (const success of [true, false]) {
      const room = fixture(1, success); room.seats[0].hp = 50;
      const action: PlayerAction = { token: 'spotlight', targetId: 'boat', proposal: {
        id: 'rescue-plan', turn: room.turn, targetId: 'boat', effect: 'rescue', label: 'A rope for everyone',
        description: 'Use the rope to bring everyone to safety.', idea: 'Use the rope.', supported: true, source: 'authored',
      } };
      const preview = riverActionPreview(room, action)!;
      expect(preview.detail).toMatch(/\+5 crossing.*4 HP.*\+3 chapel/);
      expect(preview.detail).toMatch(/Miss: \+1 crossing, \+1 danger/);
      expect(contextualActionLabel(room, action)).toBe(action.proposal!.label);
      const resolved = act(room, action);
      expect(own(resolved).result?.progress).toBe(success ? 5 : 1);
      expect(resolved.riverSupplies?.status).toBe(success ? 'secured' : 'drifting');
      expect(resolved.events.some(event => event.result?.healing === 4)).toBe(success);
      expect(resolved.players.a.spotlightChapters).toContain(1);
    }
  });

  it('does not let companions save cargo or progress an empty parked table', () => {
    const room = fixture(); room.chapterRound = 2;
    delete room.enemyIntent;
    const parked = command(room, 'leave');
    expect(parked.status).toBe('parked');
    const after = command(parked, 'tick', 'a', {}, room.deadline + 120000);
    expect(after.riverSupplies).toEqual(room.riverSupplies);
    expect(after.chapterRound).toBe(room.chapterRound);
    expect(after.progress).toBe(0);
  });

  it('keeps a committed departing contribution and cannot restore cargo on rejoin', () => {
    const room = fixture(2);
    const committed = act(room, safe);
    const leaving = command(committed, 'leave');
    const resolved = act(leaving, { token: 'influence', targetId: 'pack' }, 'b');
    expect(resolved.riverSupplies?.status).toBe('secured');
    expect(resolved.players.a.actions).toBe(1);
    expect(resolved.seats.some(seat => seat.actorId === 'a')).toBe(false);
    const rejoined = command(resolved, 'join', 'a', { character: createCharacterProfile('Other', 'wizard') });
    expect(rejoined.riverSupplies?.status).toBe('secured');
    expect(next(rejoined).riverSupplies?.status).toBe('secured');
  });

  it('keeps the accepted move and result exactly once across JSON reload and retries', () => {
    const room = fixture(2);
    const move: AdventureCommand = { id: 'durable-supplies', type: 'act', userId: 'a', expectedTurn: room.turn, action: { ...safe, releaseMs: 800 } };
    const accepted = reduceAdventure(room, move, 1001);
    const loaded = JSON.parse(JSON.stringify(accepted)) as AdventureRoom;
    expect(loaded.commits.a).toEqual(move.action);
    expect(reduceAdventure(loaded, move, 1002)).toEqual(loaded);
    const resolved = act(loaded, { token: 'influence', targetId: 'pack' }, 'b');
    const duplicate = reduceAdventure(resolved, move, 1003);
    expect(duplicate.events).toEqual(resolved.events);
    expect(duplicate.players.a).toEqual(resolved.players.a);
    expect(duplicate.riverSupplies).toEqual(resolved.riverSupplies);
  });

  it.each(['secured', 'salvaged', 'lost'] as const)('carries %s supplies into the chapel once while preserving rewards', status => {
    const room = fixture(); room.riverSupplies = { status }; room.progress = 25; room.danger = 4;
    const ended = act(room, { token: 'influence', targetId: 'ferryman' });
    expect(ended.outcomes[0].result).toBe('success');
    expect(ended.players.a.keepsakes).toContain('A silver river reed');
    const chapel = next(ended);
    expect(chapel.chapter).toBe(2);
    expect(chapel.progress).toBe(3 + (status === 'secured' ? 3 : status === 'salvaged' ? 1 : 0));
    expect(chapel.danger).toBe(status === 'lost' ? 3 : 1); // reassure reduced 4 to 3, success reduced 3 to 1
    expect(command(chapel, 'tick')).toEqual(chapel);
    expect(riverStatus(chapel)).toBeUndefined();
  });

  it('closes unsaved supplies on an early crossing instead of silently carrying them forward', () => {
    const room = fixture(); room.progress = 25;
    const ended = act(room, { token: 'influence', targetId: 'ferryman' });
    expect(ended.riverSupplies?.status).toBe('lost');
    expect(ended.outcomes[0].text).toMatch(/lost supplies/i);
  });

  it('shows the confirmed spill on the table at its recorded consequence, including reconnect/reduced motion', () => {
    const before = fixture(1, false), resolved = act(before, rush);
    const beat = stageTimeline(resolved).find(item => item.event.result?.changed)!;
    const early = stageProjection(resolved, before, beat.start - 1);
    expect(early.river?.status).toBe('drifting');
    const landed = stageProjection(resolved, before, beat.start + beat.duration / 3 + 1);
    expect(landed.river?.status).toBe('spilled');
    expect(stageProjection(resolved, undefined, beat.start - 1).river?.status).toBe('spilled');
    expect(stageProjection(resolved, before, beat.start - 1, true).river?.status).toBe('spilled');
    expect(roundScrollReadyAt(resolved, 'a')).toBeGreaterThanOrEqual(beat.start + beat.duration + 650);
  });

  it('plays the recorded spill before its same-round deadline loss without leaking the final state', () => {
    const before = fixture(1, false); before.chapterRound = 3;
    const resolved = act(before, rush);
    const beats = stageTimeline(resolved).filter(item => item.event.result?.riverSupplies);
    expect(beats).toHaveLength(2);
    const spill = stageProjection(resolved, before, beats[0].start + beats[0].duration / 3 + 1);
    expect(spill.river?.status).toBe('spilled');
    expect(spill.scene.targets.find(item => item.id === 'reeds')?.name).toBe('Supplies in the reeds');
    const lost = stageProjection(resolved, before, beats[1].start + beats[1].duration / 3 + 1);
    expect(lost.river?.status).toBe('lost');
  });

  it('updates both affected pieces when a recorded recovery lands', () => {
    const before = fixture(); before.riverSupplies = { status: 'spilled' };
    const resolved = act(before, recover);
    const beat = stageTimeline(resolved).find(item => item.event.result?.riverSupplies)!;
    expect(stageProjection(resolved, before, beat.start - 1).river?.status).toBe('spilled');
    const landed = stageProjection(resolved, before, beat.start + beat.duration / 3 + 1);
    expect(landed.river?.status).toBe('secured');
    expect(landed.scene.targets.find(item => item.id === 'boat')?.context).toContain('all supplies secured');
  });
});
