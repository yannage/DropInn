import { describe, expect, it } from 'vitest';
import { createCharacterProfile } from '../character';
import { createAdventure } from './engine';
import { claimStageSound, stageCaption, stageProjection, stageTimeline } from './stagePlayback';
import type { AdventureRoom, StoryEvent } from './types';

function fixture(count = 4) {
  const before = createAdventure(createCharacterProfile('Hero', 'wizard'), 'a', 1000);
  const events: StoryEvent[] = Array.from({ length: count }, (_, i) => ({ id: `effect-${i}`, at: 2000, chapter: 0, turn: 1, kind: 'action', text: 'Changed', actorId: 'a', contribution: true, success: true, result: { progress: 1, targetId: 'gate', targetKind: 'scene', changed: true } }));
  const room: AdventureRoom = { ...before, phase: 'reveal', progress: count, flags: ['gate-cleared'], events };
  return { room, before };
}
describe('stage playback', () => {
  it('makes a missed combination explicit instead of celebrating its label', () => {
    const {room}=fixture(1); const event=room.events[0]; event.success=false;
    event.result!.combination={id:'shelter',kind:'payoff',label:'Gather into shelter',sourceId:'gate',actorId:'a',actorName:'Ada'};
    expect(stageCaption(event)).toContain('missed; attempt spent');
  });
  it('keeps pre-impact art and numbers, then projects only confirmed effects', () => {
    const { room, before } = fixture();
    const early = stageProjection(room, before, 2150);
    expect(early.progress).toBe(0); expect(early.scene.targets.find(target => target.id === 'gate')?.changed).toBeFalsy();
    const hit = stageProjection(room, before, 2450);
    expect(hit.progress).toBe(1); expect(hit.scene.targets.find(target => target.id === 'gate')?.changed).toBe(true);
    expect(before.progress).toBe(0); expect(room.progress).toBe(4);
  });
  it.each([1, 4, 10, 30])('finishes %i effects within 5.85 seconds and fast-forwards delayed reads', count => {
    const { room, before } = fixture(count);
    expect(Math.max(...stageTimeline(room).map(beat => beat.start + beat.duration)) - 2000).toBeLessThanOrEqual(5850);
    expect(stageProjection(room, before, 7850).settled).toBe(true);
    expect(stageProjection(room, before, 7850).progress).toBe(room.progress);
  });
  it.each([7, 9, 30])('gives every event its own anticipation, impact and settling beat in a busy %i-event round', count => {
    const { room, before } = fixture(count);
    const beats = stageTimeline(room);
    for (const [index, beat] of beats.entries()) {
      const anticipation = stageProjection(room, before, beat.start + beat.duration / 6);
      expect(anticipation.active?.event.id).toBe(beat.event.id);
      expect(anticipation.landed.some(event => event.id === beat.event.id)).toBe(false);
      const impact = stageProjection(room, before, beat.start + beat.duration / 2);
      expect(impact.active?.event.id).toBe(beat.event.id);
      expect(impact.landed.some(event => event.id === beat.event.id)).toBe(true);
      if (index) expect(beats[index - 1].start + beats[index - 1].duration).toBeLessThanOrEqual(beat.start + .00001);
    }
  });
  it('shows final state on reload, reduced motion, and a mismatched chapter or turn', () => {
    const { room, before } = fixture();
    for (const cached of [undefined, { ...before, turn: 0 }, { ...before, chapter: 1 }]) expect(stageProjection(room, cached, 2100).progress).toBe(4);
    expect(stageProjection(room, before, 2100, true).active).toBeUndefined();
  });
  it('deduplicates repeated events and audio across remounts', () => {
    const { room } = fixture(); room.events.push(room.events[0]);
    expect(stageTimeline(room)).toHaveLength(4);
    expect(claimStageSound('unique-sound-test')).toBe(true); expect(claimStageSound('unique-sound-test')).toBe(false);
  });
});
