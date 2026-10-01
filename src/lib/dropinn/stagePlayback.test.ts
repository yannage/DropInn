import { describe, expect, it } from 'vitest';
import { createCharacterProfile } from '../character';
import { createAdventure } from './engine';
import { claimStageSound, personalRollBeat, roundScrollReadyAt, stageCaption, stageProjection, stageTimeline } from './stagePlayback';
import type { AdventureRoom, StoryEvent } from './types';

function fixture(count = 4) {
  const before = createAdventure(createCharacterProfile('Hero', 'wizard'), 'a', 1000);
  const events: StoryEvent[] = Array.from({ length: count }, (_, i) => ({ id: `effect-${i}`, at: 2000, chapter: 0, turn: 1, kind: 'action', text: 'Changed', actorId: 'a', contribution: true, success: true, result: { progress: 1, targetId: 'gate', targetKind: 'scene', changed: true } }));
  const room: AdventureRoom = { ...before, phase: 'reveal', progress: count, flags: ['gate-cleared'], events };
  return { room, before };
}
describe('stage playback', () => {
  it('gives the confirmed hit breathing room before automatic history', () => {
    const { room } = fixture(4);
    room.events.forEach((event, index) => { event.actorId = `actor-${index}`; });
    expect(roundScrollReadyAt(room, 'actor-0')).toBe(3800);
    const last = stageTimeline(room)[3];
    expect(roundScrollReadyAt(room, 'actor-3')).toBe(last.start + last.duration + 650);
    expect(roundScrollReadyAt(room, 'spectator')).toBe(3800);
    expect(roundScrollReadyAt(structuredClone(room), 'actor-3')).toBe(roundScrollReadyAt(room, 'actor-3'));
  });
  it('bounds late-player history opening within the existing reveal budget', () => {
    const { room } = fixture(9);
    room.events[8].actorId = 'last';
    expect(roundScrollReadyAt(room, 'last')).toBeLessThanOrEqual(7850);
  });
  it('keeps the confirmed calculation readable after the impact has finished', () => {
    const { room, before } = fixture(1);
    room.events[0].roll = 12; room.events[0].modifier = 3;
    const roll = personalRollBeat(room, 'a')!;
    expect(roll.start).toBe(2150);
    expect(roll.settledAt).toBe(2950);
    expect(roll.readyAt).toBe(5550);
    expect(stageProjection(room, before, roll.start + roll.duration).active).toBeUndefined();
    expect(roundScrollReadyAt(room, 'a')).toBe(roll.readyAt);
    expect(roundScrollReadyAt(room, 'a') - roll.settledAt).toBe(2600);
  });
  it.each([4, 9, 30])('preserves a full dice read for the last actor in a %i-event round without extending ten seconds', count => {
    const { room } = fixture(count);
    const event = room.events.at(-1)!;
    event.actorId = 'last'; event.roll = 12;
    const roll = personalRollBeat(room, 'last')!;
    expect(roll.event.id).toBe(event.id);
    expect(roll.settledAt - roll.start).toBe(800);
    expect(roundScrollReadyAt(room, 'last') - roll.settledAt).toBe(2600);
    expect(roll.readyAt - event.at).toBeLessThan(10000);
  });
  it('keeps guaranteed actions and spectators on the consequence timing without an empty dice pause', () => {
    const { room } = fixture(1);
    room.events[0].result = { token: 'assist', targetKind: 'hero', targetId: 'a', protection: 3 };
    expect(personalRollBeat(room, 'a')).toBeUndefined();
    expect(roundScrollReadyAt(room, 'a')).toBe(3800);
    expect(personalRollBeat(room, 'spectator')).toBeUndefined();
    expect(roundScrollReadyAt(room, 'spectator')).toBe(3800);
  });
  it('does not restart the dice read for duplicate snapshots or a late refreshed room timestamp', () => {
    const { room, before } = fixture(1);
    room.events[0].roll = 12;
    const roll = personalRollBeat(room, 'a')!;
    const refreshed = structuredClone(room);
    refreshed.updatedAt = 20000;
    refreshed.events.push(structuredClone(refreshed.events[0]));
    expect(personalRollBeat(refreshed, 'a')).toEqual(roll);
    expect(roundScrollReadyAt(refreshed, 'a')).toBe(roll.readyAt);
    expect(roundScrollReadyAt(refreshed, 'a')).toBeLessThan(refreshed.updatedAt);
    expect(stageProjection(refreshed, before, refreshed.updatedAt).settled).toBe(true);
  });
  it('selects only this actor’s current confirmed action roll', () => {
    const { room } = fixture(1);
    room.events[0].roll = 12;
    expect(personalRollBeat({ ...room, phase: 'choosing' }, 'a')).toBeUndefined();
    expect(personalRollBeat({ ...room, turn: room.turn + 1 }, 'a')).toBeUndefined();
    expect(personalRollBeat({ ...room, chapter: room.chapter + 1 }, 'a')).toBeUndefined();
    expect(personalRollBeat(room, 'someone-else')).toBeUndefined();
    expect(personalRollBeat({ ...room, status: 'completed' }, 'a')?.event.id).toBe(room.events[0].id);
    room.events[0].kind = 'consequence';
    expect(personalRollBeat(room, 'a')).toBeUndefined();
  });
  it('preserves a recorded zero roll and modifier without mistaking them for a missing roll', () => {
    const { room } = fixture(1);
    room.events[0].roll = 0; room.events[0].modifier = 0;
    const roll = personalRollBeat(room, 'a');
    expect(roll?.event.roll).toBe(0);
    expect(roll?.event.modifier).toBe(0);
    expect(roundScrollReadyAt(room, 'a')).toBe(5550);
  });
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
