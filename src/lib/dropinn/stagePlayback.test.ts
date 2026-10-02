import { describe, expect, it } from 'vitest';
import { createCharacterProfile } from '../character';
import { createAdventure, reduceAdventure } from './engine';
import { ADVENTURES, chaptersFor } from './registry';
import { choiceDefinition, choiceState, choiceStatus } from './chapterChoices';
import { getScene } from './scene';
import { claimStageSound, personalRollBeat, roundScrollReadyAt, stageCaption, stageProjection, stageTimeline } from './stagePlayback';
import type { AdventureRoom, PlayerAction, StoryEvent } from './types';

function fixture(count = 4) {
  const before = createAdventure(createCharacterProfile('Hero', 'wizard'), 'a', 1000);
  const events: StoryEvent[] = Array.from({ length: count }, (_, i) => ({ id: `effect-${i}`, at: 2000, chapter: 0, turn: 1, kind: 'action', text: 'Changed', actorId: 'a', contribution: true, success: true, result: { progress: 1, targetId: 'gate', targetKind: 'scene', changed: true } }));
  const room: AdventureRoom = { ...before, phase: 'reveal', progress: count, flags: ['gate-cleared'], events };
  return { room, before };
}

function choiceFixture(mode: 'prepare' | 'rescue' | 'press' = 'prepare', finale = false) {
  const selected = ADVENTURES.flatMap(adventure => adventure.chapters.map((chapter, index) => ({ adventure, chapter, index })))
    .find(item => item.chapter.choice?.mode === mode && (!finale || item.index === item.adventure.chapters.length - 1))!;
  const before = createAdventure(createCharacterProfile('Ada', 'fighter'), 'a', 1000, 'STAGE-CHOICE', selected.adventure.id);
  before.chapter = selected.index; before.chapterRound = 1;
  before.progress = 0; before.danger = 0; before.flags = []; before.events = []; before.chapterChoices = {};
  if (selected.chapter.branch) before.storyBranch = selected.chapter.branch.fallback;
  before.seats = before.seats.filter(seat => seat.kind === 'human');
  before.seats[0].character.traits = { ATH: 100, CHA: 100, ING: 100, INT: 100 };
  before.seats[0].hp = before.seats[0].character.maxHp = 100;
  return before;
}
function resolveChoice(before: AdventureRoom, action: PlayerAction) {
  return reduceAdventure(before, { id: 'stage-confirmed-choice', type: 'act', userId: 'a', expectedTurn: before.turn, action }, 2000);
}
const landedAt = (beat: ReturnType<typeof stageTimeline>[number]) => beat.start + beat.duration / 3 + 1;
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

  it('withholds a prepared choice until its confirmed consequence, then updates both targets and the marker', () => {
    const before = choiceFixture(), choice = choiceDefinition(before)!;
    const room = resolveChoice(before, { token: 'assist', targetId: choice.primaryId });
    const beats = stageTimeline(room);
    const action = beats.find(beat => beat.event.kind === 'action')!;
    const consequence = beats.find(beat => beat.event.result?.chapterChoice)!;
    const earlier = stageProjection(room, before, landedAt(action));
    expect(earlier.progress).toBe(1);
    expect(earlier.choice).toMatchObject({ phase: 'open', targetId: choice.primaryId, level: 0 });
    for (const targetId of [choice.primaryId, choice.secondaryId]) {
      expect(earlier.scene.targets.find(target => target.id === targetId)?.actionCues)
        .toEqual(getScene(before).targets.find(target => target.id === targetId)?.actionCues);
    }
    const anticipation = stageProjection(room, before, consequence.start + consequence.duration / 6);
    expect(anticipation.choice?.phase).toBe('open');
    expect(anticipation.landed.some(event => event.id === consequence.event.id)).toBe(false);
    const landed = stageProjection(room, before, landedAt(consequence));
    expect(landed.choice).toMatchObject({ phase: 'ready', targetId: choice.secondaryId, level: 1 });
    for (const targetId of [choice.primaryId, choice.secondaryId]) {
      const target = landed.scene.targets.find(target => target.id === targetId)!;
      expect(target.context).toBe(getScene(room).targets.find(target => target.id === targetId)?.context);
    }
    expect(landed.scene.targets.find(target => target.id === choice.secondaryId)?.actionCues?.assist).toBe(choice.labels.secure);
    expect(landed.scene.targets.find(target => target.id === choice.secondaryId)?.actionCues?.[choice.riskToken]).toBe(choice.labels.risk);
    expect(choiceState(before)?.phase).toBe('open');
    expect(choiceState(room)?.phase).toBe('ready');
  });

  it('shows a rescue failure and its recovery cue only when the shared consequence lands', () => {
    const before = choiceFixture('rescue'), choice = choiceDefinition(before)!;
    before.seats[0].character.traits = { ATH: -100, CHA: -100, ING: -100, INT: -100 };
    const room = resolveChoice(before, { token: choice.riskToken, targetId: choice.primaryId });
    const beat = stageTimeline(room).find(beat => beat.event.result?.chapterChoice)!;
    const pending = stageProjection(room, before, beat.start);
    expect(pending.choice).toMatchObject({ phase: 'open', targetId: choice.primaryId });
    const landed = stageProjection(room, before, landedAt(beat));
    expect(landed.choice).toMatchObject({ phase: 'setback', targetId: choice.secondaryId });
    const recoveryTarget = landed.scene.targets.find(target => target.id === choice.secondaryId)!;
    expect(recoveryTarget.tokens).toContain('investigate');
    expect(recoveryTarget.actionCues?.investigate).toBe(choice.labels.recover);
    expect(recoveryTarget.context).not.toBe(pending.scene.targets.find(target => target.id === choice.secondaryId)?.context);
    expect(stageCaption(beat.event)).toContain(beat.event.change!.title);
  });

  it('withholds chapter closure until its consequence without advertising an unavailable payoff turn', () => {
    const before = choiceFixture(), choice = choiceDefinition(before)!;
    before.progress = chaptersFor(before)[before.chapter].progressGoal - 1;
    const room = resolveChoice(before, { token: 'assist', targetId: choice.primaryId });
    const beats = stageTimeline(room).filter(beat => beat.event.result?.chapterChoice);
    expect(beats.map(beat => beat.event.result!.chapterChoice!.state.phase)).toEqual(['settled']);
    expect(choiceState(room)).toMatchObject({ phase: 'settled', outcome: 'partial' });
    const action = stageTimeline(room).find(beat => beat.event.kind === 'action')!;
    const pending = stageProjection(room, before, landedAt(action));
    expect(pending.choice?.phase).toBe('open');
    expect(pending.scene.targets.find(target => target.id === choice.secondaryId)?.actionCues?.assist).not.toBe(choice.labels.secure);
    const closed = stageProjection(room, before, landedAt(beats[0]));
    expect(closed.choice).toEqual(choiceStatus(room));
    expect(closed.choice?.phase).toBe('settled');
    expect(closed.scene.targets.find(target => target.id === choice.secondaryId)?.context).toBe(choice.endings.partial);
    const settled = stageProjection(room, before, beats[0].start + beats[0].duration + 1);
    expect(settled.settled).toBe(true);
    expect(settled.choice).toEqual(choiceStatus(room));
    expect(settled.scene).toEqual(getScene(room));
  });

  it('projects the latest landed saved choice state when a turn records several consequences', () => {
    const before = choiceFixture(), choice = choiceDefinition(before)!;
    const room = resolveChoice(before, { token: 'assist', targetId: choice.primaryId });
    const closingState = { phase: 'settled' as const, level: 1, uses: 0, outcome: 'partial' as const };
    room.chapterChoices![choice.id] = closingState;
    room.events.push({ id: 'saved-choice-closure', at: 2000, chapter: room.chapter, turn: room.turn, kind: 'consequence',
      text: choice.endings.partial, result: { targetKind: 'scene', targetId: choice.primaryId, changed: true,
        chapterChoice: { id: choice.id, state: closingState } } });
    const beats = stageTimeline(room).filter(beat => beat.event.result?.chapterChoice);
    expect(beats.map(beat => beat.event.result!.chapterChoice!.state.phase)).toEqual(['ready', 'settled']);
    const prepared = stageProjection(room, before, landedAt(beats[0]));
    expect(prepared.choice).toMatchObject({ phase: 'ready', targetId: choice.secondaryId });
    expect(prepared.scene.targets.find(target => target.id === choice.secondaryId)?.actionCues?.assist).toBe(choice.labels.secure);
    const closing = stageProjection(room, before, landedAt(beats[1]));
    expect(closing.choice).toEqual(choiceStatus(room));
    expect(closing.choice?.phase).toBe('settled');
    expect(closing.scene.targets.find(target => target.id === choice.secondaryId)?.context).toBe(choice.endings.partial);
  });

  it('keeps history behind the last recorded choice consequence even for the first actor and spectators', () => {
    const before = choiceFixture(), choice = choiceDefinition(before)!;
    before.progress = chaptersFor(before)[before.chapter].progressGoal - 1;
    const room = resolveChoice(before, { token: 'assist', targetId: choice.primaryId });
    const last = stageTimeline(room).filter(beat => beat.event.result?.chapterChoice).at(-1)!;
    for (const actor of ['a', 'spectator']) {
      expect(roundScrollReadyAt(room, actor)).toBeGreaterThanOrEqual(last.start + last.duration + 650);
      expect(roundScrollReadyAt(room, actor)).toBeLessThan(room.revealUntil!);
    }
    const refreshed = structuredClone(room);
    refreshed.updatedAt = room.revealUntil! + 5000;
    refreshed.events.push(structuredClone(last.event));
    expect(stageTimeline(refreshed)).toHaveLength(stageTimeline(room).length);
    expect(roundScrollReadyAt(refreshed, 'a')).toBe(roundScrollReadyAt(room, 'a'));
  });

  it('plays the final payoff before exposing completed-adventure closure from the latest snapshot', () => {
    const before = choiceFixture('prepare', true), choice = choiceDefinition(before)!;
    before.chapterChoices = { [choice.id]: { phase: 'ready', level: 1, uses: 0 } };
    before.progress = chaptersFor(before)[before.chapter].progressGoal - 3;
    const room = resolveChoice(before, { token: 'assist', targetId: choice.secondaryId });
    expect(room.status).toBe('completed');
    const beats = stageTimeline(room).filter(beat => beat.event.result?.chapterChoice);
    expect(beats.map(beat => beat.event.result!.chapterChoice!.state.phase)).toEqual(['settled']);
    const action = stageTimeline(room).find(beat => beat.event.kind === 'action')!;
    const paidOff = stageProjection(room, before, landedAt(action));
    expect(paidOff.choice?.phase).toBe('ready');
    const closure = stageProjection(room, before, landedAt(beats[0]));
    expect(closure.choice).toEqual(choiceStatus(room));
    expect(closure.choice?.phase).toBe('settled');
    const final = stageProjection(room, before, room.revealUntil!);
    expect(final.scene).toEqual(getScene(room));
    expect(final.choice).toEqual(choiceStatus(room));
    expect(final.progress).toBe(chaptersFor(room)[room.chapter].progressGoal);
    expect(final.settled).toBe(true);
  });

  it.each(['prepare', 'rescue', 'press'] as const)('shows complete %s choice state on reload or reduced motion without replaying the transition', mode => {
    const before = choiceFixture(mode), choice = choiceDefinition(before)!;
    const room = resolveChoice(before, { token: mode === 'press' ? choice.riskToken : 'assist', targetId: choice.primaryId });
    const beat = stageTimeline(room).find(beat => beat.event.result?.chapterChoice)!;
    for (const cached of [undefined, { ...before, turn: before.turn - 1 }, { ...before, chapter: before.chapter + 1 }]) {
      const projection = stageProjection(room, cached, beat.start - 1);
      expect(projection.choice).toEqual(choiceStatus(room));
      expect(projection.scene).toEqual(getScene(room));
      expect(projection.active).toBeUndefined();
      expect(projection.settled).toBe(true);
    }
    const immediate = stageProjection(room, before, beat.start - 1, true);
    expect(immediate.choice).toEqual(choiceStatus(room));
    expect(immediate.scene).toEqual(getScene(room));
    expect(immediate.active).toBeUndefined();
    expect(immediate.settled).toBe(true);
    const delayed = stageProjection(room, before, room.revealUntil!);
    expect(delayed.choice).toEqual(choiceStatus(room));
    expect(delayed.settled).toBe(true);
  });
});
