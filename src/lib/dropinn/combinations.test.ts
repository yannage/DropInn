import { describe, expect, it } from 'vitest';
import { createCharacterProfile } from '../character';
import { createAdventure, reduceAdventure } from './engine';
import { ADVENTURES, adventureFor, currentAdventure } from './registry';
import { combinationAvailable, combinationDefinition, combinationPreview, combinationState } from './combinations';
import type { AdventureCommand, AdventureRoom, PlayerAction } from './types';

let serial = 0;
const command = (room: AdventureRoom, type: AdventureCommand['type'], userId = 'a', more: Partial<AdventureCommand> = {}, now = room.updatedAt + 1) => reduceAdventure(room, { id: `combo-${++serial}`, type, userId, expectedTurn: room.turn, ...more }, now);
const act = (room: AdventureRoom, action: PlayerAction, userId = 'a') => command(room, 'act', userId, { action });
const next = (room: AdventureRoom) => command(room, 'tick', 'a', {}, room.revealUntil!);
function fixture(chapter = 0, count = 1) {
  const room = createAdventure(createCharacterProfile('Ada', 'fighter'), 'a', 1000, 'COMBOS');
  room.chapter = chapter; room.danger = 4;
  const first = room.seats.find(seat => seat.actorId === 'a')!;
  first.character.traits = { ATH: 100, CHA: 100, ING: 100, INT: 100 };
  if (count === 2) {
    const other = structuredClone(first); other.actorId = 'b'; other.id = 'seat-1'; other.character.name = 'Bea';
    room.seats = room.seats.filter(seat => seat.id !== other.id); room.seats.push(other);
    room.players.b = { ...structuredClone(room.players.a), userId: 'b', character: other.character, seatId: other.id };
  }
  if (chapter) room.enemyIntent = { turn: room.turn, sourceId: chapter === 1 ? 'pack' : 'gloamfang', targetActorId: 'a', baseDamage: 7, duelModifier: 3 };
  return room;
}
function prepare(chapter = 0, count = 1) {
  let room = fixture(chapter, count);
  const definition = combinationDefinition(room)!;
  room = act(room, { token: definition.setupTokens[0], targetId: definition.sourceId });
  if (count === 2) room = act(room, { token: 'assist', targetId: definition.sourceId }, 'b');
  return next(room);
}
function payoff(room: AdventureRoom, index = 0): PlayerAction {
  const definition = combinationDefinition(room)!, move = definition.payoffs[index];
  return { token: move.token, targetId: move.targetId, combination: { id: definition.id, payoffId: move.id } };
}

describe('versioned scene combinations', () => {
  it('previews extras after the ordinary successful move and existing safety limits', () => {
    const room = prepare(), def = combinationDefinition(room)!;
    room.progress = 23;
    expect(combinationPreview(room, def.payoffs[0], payoff(room), 'a')).toContain('+0 extra');
    room.danger = 0.5;
    expect(combinationPreview(room, def.payoffs[1], payoff(room, 1), 'a')).toContain('up to 0');
    const river = prepare(1); river.flags.push(`cover:${river.turn}:3`);
    expect(combinationPreview(river, combinationDefinition(river)!.payoffs[1])).toContain('already covered');
  });
  it('selects v2 for new visits but never upgrades missing or pinned v1 snapshots', () => {
    expect(currentAdventure().version).toBe(2);
    expect(ADVENTURES.filter(item => item.id === 'briar-glen')).toHaveLength(1);
    expect(adventureFor().version).toBe(1);
    expect(adventureFor({ adventureId: 'briar-glen', adventureVersion: 1 }).chapters[0].combination).toBeUndefined();
    const old = fixture(); old.adventureVersion = 1;
    expect(combinationDefinition(old)).toBeUndefined();
    expect(() => act(old, payoff(prepare()))).toThrow('combination');
  });
  it.each([0, 1, 2])('opens chapter %i only after a successful matching setup, for exactly two next turns', chapter => {
    let room = fixture(chapter), def = combinationDefinition(room)!;
    expect(() => act(room, payoff(room))).toThrow('combination');
    room = act(room, { token: def.setupTokens[0], targetId: def.sourceId });
    const state = combinationState(room)!;
    expect(state.fromTurn).toBe(room.turn + 1); expect(state.throughTurn).toBe(room.turn + 2);
    expect(room.events.find(event => event.id === state.setupEventId)?.result?.combination?.kind).toBe('setup');
    expect(combinationAvailable(room, 'a')).toBe(false);
    room = next(room); expect(combinationAvailable(room, 'a')).toBe(true);
    room.turn = state.throughTurn; expect(combinationAvailable(room, 'a')).toBe(true);
    room.turn++; expect(combinationAvailable(room, 'a')).toBe(false);
    expect(() => act(room, payoff(room))).toThrow('combination');
  });
  it.each([0, 1, 2])('applies both chapter %i payoffs without changing the die or awarding extra XP', chapter => {
    for (const index of [0, 1]) {
      const room = prepare(chapter), move = payoff(room, index);
      const ordinary = act(room, { ...move, combination: undefined }), boosted = act(room, move);
      const a = [...ordinary.events].reverse().find(event => event.actorId === 'a' && event.kind === 'action')!;
      const b = [...boosted.events].reverse().find(event => event.actorId === 'a' && event.kind === 'action')!;
      expect(b.roll).toBe(a.roll); expect(b.modifier).toBe(a.modifier);
      expect(boosted.players.a.xp).toBe(ordinary.players.a.xp);
      expect(combinationState(boosted)?.usedBy).toEqual(['a']);
      expect(b.result?.combination?.kind).toBe('payoff');
      if (index === 0) expect(b.result!.progress! - a.result!.progress!).toBe(3);
      else if (!chapter) expect(boosted.danger).toBe(Math.max(0, ordinary.danger - 2));
      else expect(boosted.flags).toContain(`cover:${room.turn}:3`);
    }
  });
  it('spends an accepted failed attempt and keeps ordinary failure consequences', () => {
    const room = prepare(); room.seats.find(seat => seat.actorId === 'a')!.character.traits.CHA = -100;
    const result = act(room, payoff(room));
    const event = [...result.events].reverse().find(event => event.kind === 'action' && event.actorId === 'a')!;
    expect(event.success).toBe(false); expect(event.result?.progress).toBe(1);
    expect(event.result?.combination?.progress).toBeUndefined();
    expect(combinationAvailable(next(result), 'a')).toBe(false);
  });
  it('reserves once on acceptance, preserves exact retry, and does not share consumption', () => {
    const room = prepare(0, 2), action = { ...payoff(room), releaseMs: 750 };
    const input: AdventureCommand = { id: 'lost-response', type: 'act', userId: 'a', expectedTurn: room.turn, action };
    const accepted = reduceAdventure(room, input, room.updatedAt + 1);
    const restored = JSON.parse(JSON.stringify(accepted)) as AdventureRoom;
    expect(reduceAdventure(restored, input, room.updatedAt + 2)).toEqual(restored);
    expect(restored.commits.a).toEqual(action);
    expect(combinationAvailable(restored, 'a')).toBe(false); expect(combinationAvailable(restored, 'b')).toBe(true);
    const resolved = act(restored, payoff(restored), 'b');
    expect(resolved.events.filter(event => event.turn === room.turn && event.result?.combination?.progress === 1.5)).toHaveLength(2);
  });
  it('gives the same results with reversed arrivals and strongest cover instead of stacking', () => {
    const room = prepare(1, 2);
    const ab = act(act(room, payoff(room, 1)), payoff(room, 1), 'b');
    const ba = act(act(room, payoff(room, 1), 'b'), payoff(room, 1));
    expect(ab.progress).toBe(ba.progress); expect(ab.seats.map(seat => seat.hp)).toEqual(ba.seats.map(seat => seat.hp));
    expect([...ab.events].reverse().find(event => event.result?.damage !== undefined)?.result?.protection).toBe(3);
  });
  it('does not refresh setup, allows downed Help, and grants late arrivals only the remaining window', () => {
    let room = prepare(0, 2), state = structuredClone(combinationState(room));
    room.seats.find(seat => seat.actorId === 'a')!.hp = 0;
    room = act(room, payoff(room, 1));
    room = act(room, { token: 'assist', targetId: 'gate' }, 'b'); room = next(room);
    expect(combinationState(room)?.throughTurn).toBe(state?.throughTurn);
    expect(combinationState(room)?.actorId).toBe(state?.actorId);
    expect(combinationAvailable(room, 'new-visitor')).toBe(true);
    expect(combinationPreview(room, combinationDefinition(room)!.payoffs[1])).toContain('up to');
  });
  it('retains use after leaving and rejoining, and rejects mismatched targets', () => {
    let room = prepare(0, 2);
    expect(() => act(room, { ...payoff(room), targetId: 'tracks' })).toThrow('combination');
    room = act(room, payoff(room)); room = command(room, 'leave');
    room = act(room, { token: 'assist', targetId: 'mara' }, 'b'); room = next(room);
    room = command(room, 'join');
    expect(combinationState(room)?.usedBy).toContain('a');
    expect(combinationAvailable(room, 'a')).toBe(false);
  });
});
