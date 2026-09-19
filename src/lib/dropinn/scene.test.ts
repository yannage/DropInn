import { describe, expect, it } from 'vitest';
import { createCharacterProfile } from '../character';
import { createAdventure, reduceAdventure } from './engine';
import { CHAPTERS } from './content';
import { developScene, getScene } from './scene';

const fresh = () => createAdventure(createCharacterProfile('Wren', 'wizard'), 'alice', 1000, 'SCENE1');

describe('developing scenes', () => {
  it('replaces cleared obstructions with new approaches without mutating authored content', () => {
    const room = fresh();
    expect(developScene(room, { token: 'fight', targetId: 'gate' })?.title).toBe('A shelter takes shape');
    const gate = getScene(room).targets.find(t => t.id === 'gate')!;
    expect(gate.changed).toBe(true);
    expect(gate.tokens).toContain('influence');
    expect(gate.tokens).not.toContain('fight');
    expect(CHAPTERS[0].targets.find(t => t.id === 'gate')!.tokens).toContain('fight');
    expect(developScene(room, { token: 'assist', targetId: 'gate' })).toBeUndefined();
    expect(() => reduceAdventure(room, { id: 'old-move', type: 'act', userId: 'alice', expectedTurn: room.turn, action: { token: 'fight', targetId: 'gate' } }, 1001)).toThrow();
  });

  it('records successful changes once and keeps them across a duplicate command', () => {
    const room = fresh();
    room.seats[0].character.traits.INT = 40;
    const command = { id: 'read-tracks', type: 'act' as const, userId: 'alice', expectedTurn: room.turn, action: { token: 'investigate' as const, targetId: 'tracks' } };
    const result = reduceAdventure(room, command, 1001);
    expect(result.events.some(event => event.change?.title === 'A clue in the mud')).toBe(true);
    expect(getScene(result).targets.find(t => t.id === 'tracks')!.name).toContain('fragment');
    const duplicate = reduceAdventure(result, command, 1002);
    expect(duplicate.events).toEqual(result.events);
    expect(duplicate.players.alice.xp).toBe(result.players.alice.xp);
  });

  it('keeps failed attempts from claiming a completed rescue', () => {
    const room = fresh();
    room.seats[0].character.traits.CHA = -40;
    const result = reduceAdventure(room, { id: 'rescue', type: 'act', userId: 'alice', expectedTurn: room.turn, action: { token: 'influence', targetId: 'mara' } }, 1001);
    expect(result.flags).not.toContain('mara-helped');
    expect(result.events.some(event => event.change)).toBe(false);
    expect(result.progress).toBeGreaterThan(0);
  });

  it('does not turn a creative distraction into an unreviewed rescue', () => {
    const room = fresh();
    const proposal = { id: 'idea', turn: room.turn, targetId: 'mara', effect: 'distract' as const,
      label: 'Distract the creature', description: 'Distract it near Mara.', idea: 'I whistle from beside Mara.', supported: true, source: 'authored' as const };
    expect(developScene(room, { token: 'spotlight', targetId: 'mara', proposal })).toBeUndefined();
    expect(room.flags).not.toContain('mara-helped');
    expect(developScene(room, { token: 'spotlight', targetId: 'mara', proposal: { ...proposal, effect: 'rescue' } })?.title).toBe('Mara is safe');
  });

  it('updates the immediate objective in all three chapters', () => {
    const room = fresh();
    for (const [chapter, targetId] of ['mara', 'boat', 'ward'].entries()) {
      room.chapter = chapter;
      developScene(room, { token: 'assist', targetId });
      expect(getScene(room).objective).not.toBe(CHAPTERS[chapter].objective);
      expect(getScene(room).targets.find(t => t.id === targetId)!.changed).toBe(true);
    }
  });
});
