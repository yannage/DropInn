import { afterEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { FocusedActionChoices, FocusedActionStage } from '../../components/DropInn/FocusedAction';
import { createCharacterProfile } from '../character';
import { createAdventure } from './engine';
import { ADVENTURES } from './registry';
import * as scenes from './scene';
import { contextualActionLabel, derivePlayerGuidance, remainingTurnSeconds, suggestedTargetIds, type PlayerGuidanceInput } from './playerGuidance';
import type { AdventureRoom, PlayerAction } from './types';

const fresh = (adventureId?: string) => createAdventure(createCharacterProfile('Wren', 'wizard'), 'alice', 1000, 'GUIDE1', adventureId);
const action: PlayerAction = { token: 'investigate', targetId: 'tracks', approach: 'trail' };
const guide = (room: AdventureRoom, local: Partial<PlayerGuidanceInput> = {}) => derivePlayerGuidance({ room, userId: 'alice', now: 1001, ...local });
afterEach(() => vi.restoreAllMocks());

describe('player guidance follows the authoritative turn', () => {
  it('caps a newly received countdown when the presentation clock is one tick behind', () => {
    const room = fresh();
    expect(remainingTurnSeconds(room, 900)).toBe(60);
    room.phase = 'reveal'; room.revealUntil = 12000;
    expect(remainingTurnSeconds(room, 1900)).toBe(10);
    expect(remainingTurnSeconds(room, 2500)).toBe(10);
    expect(remainingTurnSeconds(room, 3500)).toBe(9);
    expect(remainingTurnSeconds(room, 12000)).toBe(0);
    expect(remainingTurnSeconds(room, 13000)).toBe(0);
    room.phase = 'travel'; room.deadline = 45000;
    expect(remainingTurnSeconds(room, 14900)).toBe(30);
    expect(remainingTurnSeconds(room, 16000)).toBe(29);
    expect(remainingTurnSeconds(room, 45001)).toBe(0);
  });
  it('teaches target, move, then commitment without treating preparation as a submitted action', () => {
    const room = fresh();
    expect(guide(room)).toMatchObject({ state: 'target', activeStep: 'target', seconds: 60 });
    expect(guide(room, { inspectedId: 'tracks' })).toMatchObject({ state: 'inspecting', activeStep: 'move' });
    expect(guide(room, { selection: action })).toMatchObject({ state: 'prepared', activeStep: 'commit' });
    expect(guide(room, { selection: action }).title).toBe('Hold and release to commit');
    expect(guide(room, { selection: action }).detail).toBe('Release sends your move. The bright zone adds +1.');
    expect(guide(room, { selection: action, holding: true }).state).toBe('holding');
    expect(room.commits).toEqual({});
  });

  it('does not let an expired hold or selection encourage a late move', () => {
    const room = fresh();
    expect(guide(room, { selection: action, holding: true, now: room.deadline })).toMatchObject({ state: 'expired', activeStep: 'wait', seconds: 0 });
    expect(guide(room, { selection: action, now: room.deadline + 10000 }).state).toBe('expired');
  });

  it('keeps a current uncertain move pending across the deadline, but ignores a previous turn’s receipt', () => {
    const room = fresh();
    const pending = { turn: room.turn, action };
    expect(guide(room, { pending, selection: action, holding: true }).state).toBe('pending');
    expect(guide(room, { pending, now: room.deadline + 1 })).toMatchObject({ state: 'pending', seconds: 0 });
    expect(guide(room, { pending: { ...pending, turn: room.turn - 1 } }).state).toBe('target');
  });

  it('uses confirmed commitment over stale local receipt state even after the deadline', () => {
    const room = fresh(); room.commits.alice = action;
    expect(guide(room, { pending: { turn: room.turn, action }, selection: action, now: room.deadline + 1 }))
      .toMatchObject({ state: 'committed', activeStep: 'wait', seconds: 0 });
    expect(guide(room).detail).toContain('Everyone resolves together');
  });

  it('uses reveal time and ignores local preparation, old commits, and pending receipts during results', () => {
    const room = fresh(); room.phase = 'reveal'; room.revealUntil = 4500; room.commits.alice = action;
    const local = { pending: { turn: room.turn, action }, selection: action, holding: true };
    expect(guide(room, local)).toMatchObject({ state: 'reveal', seconds: 4, activeStep: 'results' });
    expect(guide(room, local).detail).toContain('Next round in 4s');
    expect(guide(room, { ...local, now: 4500 }).detail).toBe('Waiting for the next round to begin.');
  });

  it('names the next chapter only when the current chapter has actually ended', () => {
    const room = fresh(); room.phase = 'reveal'; room.revealUntil = 4500;
    room.outcomes = [{ chapter: 0, result: 'mixed', text: 'The party reaches the river.', at: 1000 }];
    expect(guide(room).detail).toContain('Next chapter in 4s');
    room.chapter = 1;
    expect(guide(room).detail).toContain('Next round in 4s');
  });

  it('gives terminal and admission states precedence over any stale action UI', () => {
    const room = fresh(); const local = { selection: action, holding: true };
    room.status = 'completed';
    expect(guide(room, local)).toMatchObject({ state: 'completed', seconds: null });
    room.status = 'parked';
    expect(guide(room, local)).toMatchObject({ state: 'parked', seconds: null });
    room.status = 'active'; room.pendingJoins.push('alice');
    expect(guide(room, local).state).toBe('joining');
    room.pendingJoins = []; room.seats[0].leaving = true;
    expect(guide(room, local).state).toBe('leaving');
    room.seats = room.seats.filter(seat => seat.actorId !== 'alice');
    expect(guide(room, local).state).toBe('unseated');
  });

  it('supports the token-first shortcut and ignores a stale inspection target', () => {
    const room = fresh();
    expect(guide(room, { armedToken: 'assist' })).toMatchObject({ state: 'armed', title: 'Place Help' });
    expect(guide(room, { inspectedId: 'missing-target' }).state).toBe('target');
    room.seats[0].hp = 0;
    expect(guide(room).title).toBe('Choose where to Help');
  });

  it('recognizes hero inspection as choosing an aid move and keeps receipt state authoritative', () => {
    const room = fresh(); room.seats[0].hp = 2;
    expect(guide(room, { inspectedId: 'alice' })).toMatchObject({ state: 'inspecting', activeStep: 'move' });
    expect(guide(room, { inspectedId: 'alice' }).detail).toBe('Choose a move below. Release the die to send it.');
    room.commits.alice = { token: 'assist', targetId: 'alice', targetKind: 'hero', approach: 'mend' };
    expect(guide(room, { inspectedId: 'alice' }).state).toBe('committed');
  });
});

describe('inspection suggestions', () => {
  it('prefers the authored first target, then an unresolved legal target without changing the room', () => {
    const room = fresh('last-flight-teacup');
    const first = scenes.getScene(room).firstTarget!;
    const before = JSON.stringify(room);
    expect(suggestedTargetIds(room, 'alice')).toEqual([first]);
    expect(JSON.stringify(room)).toBe(before);
    room.flags.push(`developed:${first}`);
    expect(suggestedTargetIds(room, 'alice')).toEqual([scenes.getScene(room).targets.find(target => !target.changed)!.id]);
    expect(suggestedTargetIds(fresh(), 'alice')).toEqual(['mara']);
  });

  it('never recommends a route and highlights every legal route equally for a downed hero too', () => {
    const room = fresh('last-flight-teacup'); room.chapter = 2;
    const routes = scenes.getScene(room).branch!.options.map(option => option.targetId);
    expect(routes).toHaveLength(2);
    expect(suggestedTargetIds(room, 'alice')).toEqual(routes);
    expect(guide(room).title).toBe('Inspect the routes');
    room.seats[0].hp = 0;
    expect(suggestedTargetIds(room, 'alice')).toEqual(routes);
  });

  it('excludes actions a downed hero cannot perform, including an authored first target', () => {
    const room = fresh(); const scene = scenes.getScene(room);
    vi.spyOn(scenes, 'getScene').mockReturnValue({ ...scene, firstTarget: 'gate', targets: [
      { ...scene.targets[2], tokens: ['fight'] }, { ...scene.targets[1], tokens: ['assist'] },
    ] });
    room.seats[0].hp = 0;
    expect(suggestedTargetIds(room, 'alice')).toEqual(['tracks']);
  });

  it('returns no action suggestion when the player cannot choose', () => {
    const room = fresh();
    expect(suggestedTargetIds(room, 'spectator')).toEqual([]);
    room.pendingJoins.push('alice'); expect(suggestedTargetIds(room, 'alice')).toEqual([]);
    room.pendingJoins = []; room.commits.alice = action; expect(suggestedTargetIds(room, 'alice')).toEqual([]);
    room.commits = {}; room.phase = 'reveal'; expect(suggestedTargetIds(room, 'alice')).toEqual([]);
    room.phase = 'choosing'; room.status = 'completed'; expect(suggestedTargetIds(room, 'alice')).toEqual([]);
  });

  it('keeps suggestions legal throughout every authored adventure and chapter', () => {
    for (const adventure of ADVENTURES) for (const [chapter] of adventure.chapters.entries()) {
      const room = fresh(adventure.id); room.chapter = chapter; room.seats[0].hp = 0;
      const scene = scenes.getScene(room);
      expect(suggestedTargetIds(room, 'alice').every(id => scene.targets.some(target => target.id === id && target.tokens.includes('assist')))).toBe(true);
    }
  });
});

describe('context follows the action into focus', () => {
  it('uses current authored cues after the target develops and has safe old-content fallbacks', () => {
    const room = fresh();
    expect(contextualActionLabel(room, action)).toBe('Follow the claw marks');
    room.flags.push('tracks-read');
    expect(contextualActionLabel(room, action)).toBe('Read the ward markings');
    expect(contextualActionLabel(room, { token: 'investigate', targetId: 'missing' })).toBe('Investigate · the scene');
  });

  it('distinguishes Protect, Mend, and the prepared Spotlight label', () => {
    const room = fresh();
    expect(contextualActionLabel(room, { token: 'assist', targetId: 'alice', targetKind: 'hero' })).toBe('Protect Wren');
    expect(contextualActionLabel(room, { token: 'assist', targetId: 'alice', targetKind: 'hero', approach: 'mend' })).toBe('Mend Wren');
    expect(contextualActionLabel(room, { token: 'spotlight', targetId: 'gate', proposal: {
      id: 'preview', turn: room.turn, targetId: 'gate', label: 'Brace the gate with my staff', description: '', idea: '', supported: true, source: 'authored', effect: 'cover',
    } })).toBe('Brace the gate with my staff');
  });

  it('identifies the focused target with a neutral heading while the dock owns the full action label', () => {
    const room = fresh();
    const html = renderToStaticMarkup(createElement(FocusedActionStage, { room, action, actor: room.seats[0], modifier: 2 }));
    expect(html).toContain('<strong>Tracks in the mud</strong>');
    expect(html).toContain('Choose your approach');
    expect(html).not.toContain('Find your advantage');
    expect(html).not.toContain('Bonuses last one turn');
  });

  it('keeps focus honest after commitment and after a successful action develops its target', () => {
    const room = fresh(); room.commits.alice = action;
    const committed = renderToStaticMarkup(createElement(FocusedActionStage, { room, action, actor: room.seats[0], modifier: 2 }));
    expect(committed).toContain('Your committed move');
    expect(committed).not.toContain('Choose your approach');
    room.phase = 'reveal'; room.flags.push('tracks-read');
    const html = renderToStaticMarkup(createElement(FocusedActionStage, { room, action, actor: room.seats[0], modifier: 2, result: {
      id: 'resolved', chapter: 0, turn: room.turn, at: 1001, kind: 'action', text: 'Wren follows the claw marks.', success: true,
    } }));
    expect(html).toContain('<strong>The silver ward fragment</strong>');
    expect(html).not.toContain('<strong>Read the ward markings</strong>');
  });

  it('disables new Mend attempts on a departing victim while allowing Protect', () => {
    const room = fresh(); room.chapter = 1;
    room.seats[0].leaving = true; room.seats[0].hp = 2;
    room.enemyIntent = { turn: room.turn, targetActorId: 'alice', sourceId: 'pack', baseDamage: 3 };
    const html = renderToStaticMarkup(createElement(FocusedActionChoices, { room,
      action: { token: 'assist', targetKind: 'hero', targetId: 'alice' }, locked: false, onChange: () => {}, onBack: () => {},
    }));
    expect(html).toMatch(/aria-label="Mend:[^"]+" disabled=""/);
    expect(html).toContain('<button aria-pressed="true"><strong>Protect</strong>');
  });
});
