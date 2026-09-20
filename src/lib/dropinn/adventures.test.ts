import { describe, expect, it } from 'vitest';
import { createCharacterProfile } from '../character';
import { ADVENTURES, adventureFor } from './registry';
import { createAdventure, getVisitRecap, reduceAdventure } from './engine';
import { getScene } from './scene';
import type { AdventureRoom } from './types';

const hero = createCharacterProfile('Rowan', 'wizard');
let serial = 0;
const next = (r: AdventureRoom) => reduceAdventure(r, { id: `tick-${++serial}`, type: 'tick', userId: 'alice' }, r.revealUntil!);
const help = (r: AdventureRoom, targetId: string, userId = 'alice') => reduceAdventure(r, { id: `act-${++serial}`, type: 'act', userId, expectedTurn: r.turn, action: { token: 'assist', targetId, releaseMs: 800 } }, r.updatedAt + 1);

describe('adventure registry and routes', () => {
  it('preserves legacy identity and rejects unavailable versions', () => {
    expect(adventureFor().id).toBe('briar-glen');
    expect(() => adventureFor({ adventureId: 'unknown' })).toThrow();
    expect(() => adventureFor({ adventureId: 'briar-glen', adventureVersion: 99 })).toThrow();
  });
  for (const definition of ADVENTURES.slice(1)) {
    it.each(definition.chapters[2].branch!.options)(`${definition.id} completes route $id with one human and companions`, option => {
      let room = createAdventure(hero, 'alice', 1000, 'STORY1', definition.id);
      for (let rounds = 0; room.status !== 'completed' && rounds < 32; rounds++) {
        const scene = getScene(room);
        expect(scene.targets).toHaveLength(4);
        if (scene.combat) expect(room.enemyIntent?.sourceId).toBe(scene.enemySource);
        room = help(room, scene.branch && !room.storyBranch ? option.targetId : scene.targets[rounds % 4].id);
        if (room.status !== 'completed') room = next(room);
      }
      expect(room.status).toBe('completed');
      expect(room.storyBranch).toBe(option.id);
      expect(room.outcomes).toHaveLength(3);
      expect(room.outcomes[2].text).toContain(definition.branchEndings![option.id]);
      expect(room.players.alice.keepsakes).toEqual(definition.chapters.map(c => c.keepsake));
      const restored = JSON.parse(JSON.stringify(room));
      expect(getVisitRecap(restored, 'alice')).toMatchObject({ adventureId: definition.id, adventureVersion: 1 });
    });
    it(`${definition.id} resolves ties independently of arrival order and preserves receipts`, () => {
      let room = createAdventure(hero, 'alice', 1000, 'STORY1', definition.id);
      room = reduceAdventure(room, { id: 'join-bob', type: 'join', userId: 'bob', character: { ...hero, id: 'bob' } }, 1001);
      room = next(help(room, getScene(room).targets[0].id));
      room.chapter = 2; room.chapterRound = 1; room.progress = 0;
      const branch = definition.chapters[2].branch!;
      const commands = branch.options.map((option, i) => ({ id: `vote-${i}`, type: 'act' as const, userId: i ? 'bob' : 'alice', expectedTurn: room.turn, action: { token: 'assist' as const, targetId: option.targetId, releaseMs: i ? 800 : 0 } }));
      const resolve = (reverse: boolean) => (reverse ? [...commands].reverse() : commands).reduce((r, c) => reduceAdventure(r, c, room.updatedAt + 1), room);
      const a = resolve(false), b = resolve(true);
      expect(a.storyBranch).toBe(branch.fallback);
      expect(b.events).toEqual(a.events);
      expect(b.players).toEqual(a.players);
      expect(reduceAdventure(a, commands[0], a.updatedAt + 1)).toEqual(a);
      const again = help(next(a), branch.options[0].targetId);
      expect(again.storyBranch).toBe(branch.fallback);
    });
    it(`${definition.id} preserves required facts at the round cap and parks empty rooms without a choice`, () => {
      let room = createAdventure(hero, 'alice', 1000, 'STORY1', definition.id);
      for (let chapter = 0; chapter < 3; chapter++) {
        room.chapterRound = 10; room.progress = 0;
        room = help(room, getScene(room).targets[3].id);
        expect(room.outcomes[chapter].result).toBe('setback');
        expect(room.outcomes[chapter].text.length).toBeGreaterThan(100);
        if (chapter < 2) room = next(room);
      }
      expect(room.storyBranch).toBe(definition.chapters[2].branch!.fallback);
      const empty = createAdventure(hero, 'alice', 1000, 'STORY1', definition.id);
      empty.chapter = 2;
      const parked = reduceAdventure(empty, { id: 'leave', type: 'leave', userId: 'alice' }, 1001);
      expect(parked.status).toBe('parked');
      expect(parked.storyBranch).toBeUndefined();
    });
    it(`${definition.id} preserves a downed departing player's committed route`, () => {
      let room = createAdventure(hero, 'alice', 1000, 'STORY1', definition.id);
      room = reduceAdventure(room, { id:'join-bob',type:'join',userId:'bob',character:{...hero,id:'bob'} },1001);
      room = next(help(room,getScene(room).targets[0].id));
      room.chapter = 2; room.chapterRound = 1; room.progress = 0;
      room.seats.find(seat => seat.actorId === 'alice')!.hp = 0;
      const option = definition.chapters[2].branch!.options[0];
      room = help(room,option.targetId);
      room = reduceAdventure(room,{id:'leave-alice',type:'leave',userId:'alice'},room.updatedAt+1);
      room = help(room,getScene(room).targets[3].id,'bob');
      expect(room.storyBranch).toBe(option.id);
      expect(room.players.alice.actions).toBeGreaterThan(1);
      expect(room.events.some(event => event.actorId === 'alice' && event.chapter === 2 && event.contribution)).toBe(true);
      expect(getScene(room).targets.find(target => target.id === option.targetId)?.description).toContain(option.consequence);
    });
  }
});
