import { describe, expect, it } from 'vitest';
import { createCharacterProfile } from '../character';
import { createAdventure, reduceAdventure } from './engine';
import { rollSupport, teammatesAt } from './teamwork';
import type { PlayerAction } from './types';

const investigate: PlayerAction = { token: 'investigate', targetId: 'gate' };
const fight: PlayerAction = { token: 'fight', targetId: 'gate' };
function party() {
  let room = createAdventure(createCharacterProfile('Wren', 'wizard'), 'alice', 1000, 'TEAM01');
  room.id = 'teamwork-test';
  room = reduceAdventure(room, { id: 'join', type: 'join', userId: 'bob', character: createCharacterProfile('Brave', 'fighter') }, 1001);
  room = reduceAdventure(room, { id: 'tick', type: 'tick', userId: 'alice' }, room.deadline);
  return reduceAdventure(room, { id: 'advance', type: 'tick', userId: 'alice' }, room.revealUntil!);
}

describe('cooperative roll support', () => {
  it('previews a different confirmed token at the same target without modifying the room', () => {
    const room = party(); room.commits.bob = fight;
    const before = JSON.stringify(room);
    expect(rollSupport(room, 'alice', investigate)).toMatchObject({ teamwork: 1, total: 1, partners: [{ name: 'Brave' }] });
    expect(rollSupport(room, 'alice', fight).teamwork).toBe(0);
    expect(rollSupport(room, 'alice', { ...investigate, targetId: 'tracks' }).teamwork).toBe(0);
    expect(JSON.stringify(room)).toBe(before);
  });

  it('never counts oneself, a companion, or a queued visitor as a teammate', () => {
    const room = party(); room.commits.alice = fight;
    room.commits.visitor = fight;
    room.commits[room.seats.find(seat => seat.kind === 'companion')!.actorId] = fight;
    expect(teammatesAt(room, 'alice', 'gate')).toEqual([]);
    expect(rollSupport(room, 'alice', investigate).teamwork).toBe(0);
  });

  it('caps teamwork at one and expires insight and distraction with their turn', () => {
    const room = party(); room.commits.bob = fight;
    const second = structuredClone(room.seats.find(seat => seat.actorId === 'bob')!);
    second.actorId = 'cara'; second.id = 'seat-extra'; room.seats.push(second);
    room.commits.cara = { token: 'assist', targetId: 'gate' };
    room.flags.push(`insight:${room.turn}`, `opening:${room.turn}`, `insight:${room.turn - 1}`);
    expect(rollSupport(room, 'alice', investigate)).toMatchObject({ teamwork: 1, insight: 1, opening: 1, total: 3 });
    room.turn++; room.commits = {};
    expect(rollSupport(room, 'alice', investigate).total).toBe(0);
  });

  it('awards both paired rolls the same bonus regardless of commitment order', () => {
    const room = party();
    const resolve = (reverse: boolean) => {
      let state = room;
      for (const userId of reverse ? ['bob', 'alice'] : ['alice', 'bob']) {
        state = reduceAdventure(state, { id: `act-${userId}`, type: 'act', userId, expectedTurn: room.turn,
          action: userId === 'alice' ? investigate : fight }, 40000);
      }
      return state;
    };
    const first = resolve(false); const second = resolve(true);
    const results = first.events.filter(event => event.turn === room.turn && event.roll !== undefined);
    expect(results).toHaveLength(2);
    expect(results.map(event => event.modifier)).toEqual([4, 5]);
    expect(results.every(event => event.effect?.includes('+1 teamwork with'))).toBe(true);
    expect(second.events.filter(event => event.turn === room.turn && event.roll !== undefined)).toEqual(results);
    const duplicate = reduceAdventure(first, { id: 'act-bob', type: 'act', userId: 'bob', action: fight }, 40001);
    expect(duplicate.players.bob.xp).toBe(first.players.bob.xp);
    expect(duplicate.events).toEqual(first.events);
  });
});
