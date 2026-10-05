import { describe, expect, it } from 'vitest';
import { createCharacterProfile } from '../character';
import { createAdventure, reduceAdventure } from './engine';
import { ADVENTURES, adventureFor, chaptersFor } from './registry';
import { choiceActionPreview, choiceCreditText, choiceDefinition, choiceState, choiceStatus, choiceTarget } from './chapterChoices';
import { developScene, getScene } from './scene';
import type { AdventureCommand, AdventureRoom, PlayerAction } from './types';

type Mode = 'prepare' | 'rescue' | 'press';
let serial = 0;
const members = ['a', 'b', 'c', 'd'];
const authoredChoices = ADVENTURES.flatMap(adventure => adventure.chapters.flatMap((chapter, index) =>
  chapter.choice ? [{ adventure, chapter, index, choice: chapter.choice }] : []));

function fixture(mode: Mode, count = 1, success = true, final = false, choiceId?: string) {
  const candidates = ADVENTURES.flatMap(adventure => adventure.chapters.map((chapter, index) => ({ adventure, chapter, index })));
  const candidate = candidates.find(item => choiceId ? item.chapter.choice?.id === choiceId
    : item.chapter.choice?.mode === mode && (final ? item.index === 2 : item.index < 2));
  if (!candidate) throw new Error(`No ${final ? 'final ' : ''}${mode} chapter fixture exists.`);
  const room = createAdventure(createCharacterProfile('Ada', 'fighter'), 'a', 1000, 'CHOICE', candidate.adventure.id);
  room.id = `chapter-choice-${mode}`;
  room.chapter = candidate.index; room.chapterRound = 1; room.progress = 0; room.danger = 0;
  room.events = []; room.flags = []; room.outcomes = [];
  room.chapterChoices = {};
  if (candidate.chapter.branch) room.storyBranch = candidate.chapter.branch.fallback;
  const first = room.seats.find(seat => seat.actorId === 'a')!;
  const trait = success ? 100 : -100;
  first.character.traits = { ATH: trait, CHA: trait, ING: trait, INT: trait };
  first.hp = first.character.hp = first.character.maxHp = 100;
  room.seats = [first];
  for (let index = 1; index < count; index++) {
    const seat = structuredClone(first);
    seat.id = `seat-${index}`; seat.actorId = members[index]; seat.character.name = `Hero ${index}`;
    room.seats.push(seat);
    room.players[seat.actorId] = { ...structuredClone(room.players.a), userId: seat.actorId, character: seat.character, seatId: seat.id };
  }
  if (candidate.chapter.combat) room.enemyIntent = { turn: room.turn, sourceId: candidate.chapter.enemySource ?? candidate.chapter.targets[0].id,
    targetActorId: 'a', baseDamage: 3, duelModifier: 3 };
  else delete room.enemyIntent;
  return room;
}

function command(room: AdventureRoom, type: AdventureCommand['type'], userId = 'a', extra: Partial<AdventureCommand> = {}, now = room.updatedAt + 1) {
  return reduceAdventure(room, { id: `chapter-choice-${++serial}`, type, userId, expectedTurn: room.turn, ...extra }, now);
}
const act = (room: AdventureRoom, action: PlayerAction, userId = 'a') => command(room, 'act', userId, { action });
const definition = (room: AdventureRoom) => choiceDefinition(room)!;
const state = (room: AdventureRoom) => choiceState(room)!;
const primaryHelp = (room: AdventureRoom): PlayerAction => ({ token: 'assist', targetId: definition(room).primaryId });
const secondaryHelp = (room: AdventureRoom): PlayerAction => ({ token: 'assist', targetId: definition(room).secondaryId });
const risk = (room: AdventureRoom): PlayerAction => ({ token: definition(room).riskToken, targetId: definition(room).mode === 'prepare' ? definition(room).secondaryId : definition(room).primaryId });
const recovery = (room: AdventureRoom): PlayerAction => ({ token: 'investigate', targetId: definition(room).secondaryId });
const own = (room: AdventureRoom, actorId = 'a') => [...room.events].reverse().find(event => event.turn === room.turn && event.actorId === actorId && event.kind === 'action')!;
const setState = (room: AdventureRoom, value: NonNullable<AdventureRoom['chapterChoices']>[string]) => { room.chapterChoices = { ...room.chapterChoices, [definition(room).id]: value }; };
function next(room: AdventureRoom) {
  const advanced = command(room, 'tick', 'a', {}, room.revealUntil!);
  // Companion coverage is independent of the human-scaled action/state assertions here.
  advanced.seats = advanced.seats.filter(seat => seat.kind === 'human');
  return advanced;
}
function all(room: AdventureRoom, action: (source: AdventureRoom) => PlayerAction) {
  return members.slice(0, room.seats.filter(seat => seat.kind === 'human').length).reduce((source, actor) => act(source, action(source), actor), room);
}

describe('authored chapter choices', () => {
  it('pins new definitions without adding choices to historical adventures', () => {
    expect(ADVENTURES.find(adventure => adventure.id === 'briar-glen')?.version).toBe(4);
    for (const adventure of ADVENTURES.filter(item => !['gemward', 'mosswater'].includes(item.id))) {
      const historical = adventureFor({ adventureId: adventure.id, adventureVersion: adventure.id === 'briar-glen' ? 3 : 1 });
      expect(historical.chapters.every(chapter => !chapter.choice)).toBe(true);
      expect(adventure.chapters.every(chapter => !!chapter.choice || !!chapter.riverSupplies)).toBe(true);
    }
    expect(adventureFor().version).toBe(1);
    const old = fixture('prepare');
    old.adventureVersion = old.adventureId === 'briar-glen' ? 3 : 1;
    expect(choiceDefinition(old)).toBeUndefined();
    expect(choiceState(old)).toBeUndefined();
    expect(choiceStatus(old)).toBeUndefined();
  });

  it('projects fresh choices without mutating a room snapshot', () => {
    const room = fixture('prepare'), before = structuredClone(room);
    expect(state(room)).toMatchObject({ phase: 'open', level: 0 });
    expect(choiceStatus(room)).toBeDefined();
    const target = chaptersFor(room)[room.chapter].targets.find(target => target.id === definition(room).primaryId)!;
    expect(choiceTarget(room, target).id).toBe(target.id);
    expect(choiceActionPreview(room, primaryHelp(room))).toMatchObject({ guaranteed: true });
    expect(room).toEqual(before);
  });

  it.each([1, 2, 4])('scales a prepared safe payoff across %i humans and consumes the opening once', count => {
    const source = fixture('prepare', count);
    const prepared = all(source, primaryHelp);
    expect(state(prepared).phase).toBe('ready');
    expect(prepared.progress).toBeCloseTo(1);
    const choosing = next(prepared);
    choosing.danger = 4;
    const resolved = all(choosing, secondaryHelp);
    expect(resolved.progress - choosing.progress).toBeCloseTo(3);
    expect(state(resolved).phase).toBe('open');
    expect(state(resolved).uses).toBe(1);
    for (const actorId of members.slice(0, count)) {
      expect(own(resolved, actorId).roll).toBeUndefined();
      expect(own(resolved, actorId).result?.progress).toBeCloseTo(3 / count);
    }
    if (chaptersFor(choosing)[choosing.chapter].combat) {
      expect(resolved.flags).toContain(`cover:${choosing.turn}`);
    } else expect(resolved.danger).toBeCloseTo(2);
  });

  it('does not use a newly prepared opening for another action in the same round', () => {
    const room = fixture('prepare', 2);
    const result = act(act(room, primaryHelp(room)), risk(room), 'b');
    expect(state(result).phase).toBe('ready');
    expect(own(result, 'b').result!.progress).toBeLessThan(7 / 2);
    expect(state(result).uses ?? 0).toBe(0);
  });

  it('uses prepared combat Help for shared cover without stacking each helper’s protection', () => {
    const room = fixture('prepare', 4, true, true);
    expect(chaptersFor(room)[room.chapter].combat).toBe(true);
    setState(room, { phase: 'ready', level: 1 });
    const result = all(room, secondaryHelp);
    expect(result.progress).toBeCloseTo(3);
    expect(state(result).uses).toBe(1);
    const strike = result.events.find(event => event.kind === 'consequence' && event.result?.targetKind === 'hero' && event.result.damage !== undefined);
    expect(strike?.result).toMatchObject({ damage: 1, protection: 2 });
  });

  it('makes a missed prepared payoff a recoverable problem instead of a free repeated attempt', () => {
    const room = fixture('prepare', 1, false);
    setState(room, { phase: 'ready', level: 0, uses: 0 });
    const missed = act(room, risk(room));
    expect(state(missed)).toMatchObject({ phase: 'setback', uses: 0 });
    expect(own(missed)).toMatchObject({ success: false, result: { progress: 1, danger: 1 } });
    const recovered = act(next(missed), primaryHelp(missed));
    expect(state(recovered).phase).toBe('ready');
    expect(own(recovered).roll).toBeUndefined();
    expect(own(recovered).result?.progress).toBe(1);
    const ready = next(recovered);
    ready.seats[0].character.traits = { ATH: 100, CHA: 100, ING: 100, INT: 100 };
    const payoff = act(ready, risk(ready));
    expect(own(payoff)).toMatchObject({ success: true, result: { progress: 7 } });
    expect(state(payoff).phase).toBe('open');
    expect(state(payoff).uses).toBeGreaterThan(0);
  });

  it.each([
    { phase: 'open', uses: 0, expected: 'lost' },
    { phase: 'ready', uses: 0, expected: 'partial' },
    { phase: 'setback', uses: 1, expected: 'full' },
  ] as const)('records a $expected preparation ending from confirmed use rather than the last attempt', ({ phase, uses, expected }) => {
    const room = fixture('prepare');
    setState(room, { phase, level: phase === 'ready' ? 1 : 0, uses });
    room.progress = chaptersFor(room)[room.chapter].progressGoal;
    const result = command(room, 'tick', 'a', {}, room.deadline);
    expect(state(result)).toMatchObject({ phase: 'settled', outcome: expected });
    expect(result.outcomes.at(-1)?.text).toContain(definition(room).endings[expected]);
  });

  it.each(['prepare', 'rescue', 'press'] as const)('keeps downed %s Help useful without dice, timing or class support', mode => {
    const room = fixture(mode, 1, false);
    room.seats[0].hp = 0;
    if (mode === 'press') setState(room, { phase: 'setback', level: 0 });
    const result = act(room, { ...primaryHelp(room), releaseMs: 800 });
    expect(own(result)).toMatchObject({ success: true, contribution: true, result: { progress: 1, executionBonus: 0 } });
    expect(own(result).roll).toBeUndefined();
    expect(result.flags).not.toContain(`cover:${room.turn}`);
    expect(result.players.a).toMatchObject({ actions: 1, xp: 3 });
  });

  it.each(['prepare', 'rescue', 'press'] as const)('rejects approach or combination stacking on a %s signature action', mode => {
    const room = fixture(mode);
    if (mode === 'press') setState(room, { phase: 'setback', level: 0 });
    const action = primaryHelp(room);
    expect(() => act(room, { ...action, approach: 'mend' })).toThrow();
    expect(() => act(room, { ...action, combination: { id: 'unearned-combination', payoffId: 'bonus' } })).toThrow();
  });

  it('resolves successful rescue against a simultaneous miss independently of arrival order', () => {
    const room = fixture('rescue', 2, false);
    const commit = (source: AdventureRoom, actor: string, action: PlayerAction, now: number) => reduceAdventure(source,
      { id: `rescue-order-${actor}`, type: 'act', userId: actor, expectedTurn: source.turn, action }, now);
    const ab = commit(commit(room, 'a', risk(room), 1001), 'b', primaryHelp(room), 1002);
    const ba = commit(commit(room, 'b', primaryHelp(room), 1001), 'a', risk(room), 1002);
    expect(state(ab)).toMatchObject({ phase: 'settled', outcome: 'full' });
    expect(ab.chapterChoices).toEqual(ba.chapterChoices);
    expect(ab.events).toEqual(ba.events);
    expect(ab.players).toEqual(ba.players);
    expect(own(ab, 'a')).toMatchObject({ success: false });
    expect(own(ab, 'b').result?.progress).toBe(0.5);
  });

  it('offers partial guaranteed salvage or rolled full recovery after a rescue miss', () => {
    const room = fixture('rescue', 1, false);
    const missed = act(room, risk(room));
    expect(state(missed).phase).toBe('setback');
    expect(own(missed)).toMatchObject({ success: false, result: { progress: 1, danger: 1 } });
    const choosing = next(missed);
    const partial = act(choosing, primaryHelp(choosing));
    expect(state(partial)).toMatchObject({ phase: 'settled', outcome: 'partial' });
    expect(own(partial).roll).toBeUndefined();
    choosing.seats[0].character.traits.INT = 100;
    const full = act(choosing, recovery(choosing));
    expect(state(full)).toMatchObject({ phase: 'settled', outcome: 'full' });
    expect(own(full)).toMatchObject({ success: true, result: { progress: 2 } });
    expect(full.flags).not.toContain(`insight:${choosing.turn + 1}`);
  });

  it('handles rescue deadline actions before loss and settles an ignored resource at chapter end', () => {
    const room = fixture('rescue');
    room.chapterRound = definition(room).deadlineRound ?? 3;
    expect(state(act(room, primaryHelp(room)))).toMatchObject({ outcome: 'full' });
    const expired = command(room, 'tick', 'a', {}, room.deadline);
    expect(state(expired)).toMatchObject({ phase: 'settled', outcome: 'lost' });
    const early = fixture('rescue');
    early.progress = chaptersFor(early)[early.chapter].progressGoal;
    const ended = command(early, 'tick', 'a', {}, early.deadline);
    expect(state(ended)).toMatchObject({ phase: 'settled', outcome: 'lost' });
  });

  it.each(['full', 'partial', 'lost'] as const)('carries a %s rescue into the next chapter exactly once', outcome => {
    const room = fixture('rescue');
    setState(room, { phase: 'settled', level: outcome === 'full' ? 2 : outcome === 'partial' ? 1 : 0, outcome });
    const choiceId = definition(room).id;
    room.progress = chaptersFor(room)[room.chapter].progressGoal;
    room.danger = 4;
    const ended = command(room, 'tick', 'a', {}, room.deadline);
    expect(ended.outcomes.at(-1)?.result).toBe('success');
    const advanced = next(ended);
    expect(advanced.chapter).toBe(room.chapter + 1);
    expect(advanced.progress).toBe(3 + (outcome === 'full' ? 2 : outcome === 'partial' ? 1 : 0));
    expect(advanced.danger).toBe(2 + Number(outcome === 'lost'));
    expect(advanced.chapterChoices?.[choiceId].outcome).toBe(outcome);
    expect(command(advanced, 'tick')).toEqual(advanced);
  });

  it.each([1, 2, 4])('adds one press level per round, never one per each of %i humans', count => {
    const room = fixture('press', count);
    const pressed = all(room, risk);
    expect(state(pressed).level).toBe(1);
    expect(pressed.progress).toBeCloseTo(2);
    const twice = all(next(pressed), risk);
    expect(state(twice).level).toBe(2);
    const capped = all(next(twice), risk);
    expect(state(capped).level).toBe(2);
  });

  it('banks only frozen press potential even when a teammate successfully pushes higher', () => {
    const room = fixture('press', 2);
    setState(room, { phase: 'open', level: 1 });
    const result = act(act(room, risk(room)), secondaryHelp(room), 'b');
    expect(state(result)).toMatchObject({ phase: 'settled', outcome: 'partial' });
    expect(own(result, 'a').result?.progress).toBe(1);
    expect(own(result, 'b').result?.progress).toBe(1.5);
  });

  it('does not let an empty bank consume a simultaneous new level', () => {
    const room = fixture('press', 2);
    const result = act(act(room, secondaryHelp(room)), risk(room), 'b');
    expect(own(result, 'a').result?.progress).toBe(0.5);
    expect(state(result)).toMatchObject({ phase: 'open', level: 1 });
    expect(state(result).outcome).toBeUndefined();
  });

  it('banking beats a simultaneous press miss and duplicated banks share the payoff', () => {
    const room = fixture('press', 2, false);
    setState(room, { phase: 'open', level: 2 });
    const saved = act(act(room, risk(room)), secondaryHelp(room), 'b');
    expect(state(saved)).toMatchObject({ phase: 'settled', outcome: 'full' });
    const four = fixture('press', 4);
    setState(four, { phase: 'open', level: 2 });
    const banked = all(four, secondaryHelp);
    expect(banked.progress).toBeCloseTo(6);
    expect(state(banked)).toMatchObject({ phase: 'settled', outcome: 'full' });
  });

  it('loses unbanked potential on a miss, supports recovery, and never awards unbanked chapter closure', () => {
    const room = fixture('press', 1, false);
    setState(room, { phase: 'open', level: 2 });
    const failed = act(room, risk(room));
    expect(state(failed)).toMatchObject({ phase: 'setback', level: 0 });
    const resumed = act(next(failed), primaryHelp(failed));
    expect(state(resumed)).toMatchObject({ phase: 'open', level: 0 });
    expect(own(resumed).result?.progress).toBe(1);
    const closing = fixture('press');
    setState(closing, { phase: 'open', level: 2 });
    closing.progress = chaptersFor(closing)[closing.chapter].progressGoal;
    const ended = command(closing, 'tick', 'a', {}, closing.deadline);
    expect(state(ended)).toMatchObject({ phase: 'settled', outcome: 'lost' });
  });

  it('keeps route-directed first-turn Help as a vote instead of spending a chapter choice', () => {
    const candidate = ADVENTURES.flatMap(adventure => adventure.chapters.map((chapter, index) => ({ adventure, chapter, index })))
      .find(item => item.chapter.branch && item.chapter.choice);
    expect(candidate).toBeDefined();
    const room = createAdventure(createCharacterProfile('Ada', 'fighter'), 'a', 1000, 'VOTE', candidate!.adventure.id);
    room.chapter = candidate!.index; room.chapterRound = 1; room.progress = 0; room.events = []; room.chapterChoices = {};
    room.seats = room.seats.filter(seat => seat.kind === 'human');
    const branch = candidate!.chapter.branch!;
    const option = branch.options[0];
    const action: PlayerAction = { token: 'assist', targetId: option.targetId };
    expect(choiceActionPreview(room, action)).toBeUndefined();
    const resolved = act(room, action);
    expect(resolved.storyBranch).toBe(option.id);
    expect(state(resolved)).toMatchObject({ phase: 'open', level: 0 });
  });

  it('keeps a serialized accepted move and its consequences idempotent across retries', () => {
    const room = fixture('rescue', 2);
    const action: AdventureCommand = { id: 'durable-chapter-choice', type: 'act', userId: 'a', expectedTurn: room.turn,
      action: { ...primaryHelp(room), releaseMs: 800 } };
    const accepted = reduceAdventure(room, action, 1001);
    const loaded = JSON.parse(JSON.stringify(accepted)) as AdventureRoom;
    expect(loaded.commits.a).toEqual(action.action);
    expect(reduceAdventure(loaded, action, 1002)).toEqual(loaded);
    const resolved = act(loaded, primaryHelp(loaded), 'b');
    const retried = reduceAdventure(resolved, action, 1003);
    expect(retried.events).toEqual(resolved.events);
    expect(retried.players).toEqual(resolved.players);
    expect(retried.chapterChoices).toEqual(resolved.chapterChoices);
  });

  it('retains a committed departing rescue and does not reset its outcome on rejoin', () => {
    const room = fixture('rescue', 2);
    const accepted = act(room, primaryHelp(room));
    const leaving = command(accepted, 'leave');
    const resolved = act(leaving, risk(leaving), 'b');
    expect(state(resolved)).toMatchObject({ phase: 'settled', outcome: 'full' });
    expect(resolved.players.a.actions).toBe(1);
    expect(resolved.seats.some(seat => seat.actorId === 'a')).toBe(false);
    const joined = command(resolved, 'join', 'a', { character: createCharacterProfile('Other', 'wizard') });
    expect(joined.chapterChoices).toEqual(resolved.chapterChoices);
    expect(next(joined).chapterChoices).toEqual(resolved.chapterChoices);
  });

  it('shows a changed recovery target rather than requiring a journal to find it', () => {
    const room = fixture('rescue', 1, false);
    const before = getScene(room).targets.find(target => target.id === definition(room).secondaryId)!;
    const failed = act(room, risk(room));
    const after = getScene(failed).targets.find(target => target.id === definition(failed).secondaryId)!;
    expect(after.context).not.toBe(before.context);
    expect(after.tokens).toContain('investigate');
    expect(choiceActionPreview(failed, recovery(failed))).toBeDefined();
    expect(failed.events.some(event => event.result?.chapterChoice?.state.phase === 'setback')).toBe(true);
  });

  it('authors eleven distinct choices alongside the existing river supplies chapter', () => {
    expect(authoredChoices).toHaveLength(11);
    expect(new Set(authoredChoices.map(item => item.choice.id)).size).toBe(11);
  });

  it.each(authoredChoices)('keeps $choice.id actions legal after every target has developed', ({ choice }) => {
    const cases = choice.mode === 'prepare'
      ? [{ phase: 'open' as const, level: 0, moves: [primaryHelp] },
        { phase: 'ready' as const, level: 1, moves: [primaryHelp, secondaryHelp, risk] },
        { phase: 'setback' as const, level: 0, moves: [primaryHelp] }]
      : choice.mode === 'rescue'
        ? [{ phase: 'open' as const, level: 0, moves: [primaryHelp, risk] },
          { phase: 'setback' as const, level: 0, moves: [primaryHelp, recovery] }]
        : [{ phase: 'open' as const, level: 0, moves: [secondaryHelp, risk] },
          { phase: 'open' as const, level: 2, moves: [secondaryHelp, risk] },
          { phase: 'setback' as const, level: 0, moves: [primaryHelp, secondaryHelp, risk] }];
    for (const developed of [false, true]) for (const scenario of cases) for (const move of scenario.moves) {
      const room = fixture(choice.mode, 1, true, false, choice.id);
      if (developed) for (const target of getScene(room).targets) developScene(room, { targetId: target.id, token: target.tokens[0] });
      setState(room, { phase: scenario.phase, level: scenario.level });
      const action = move(room), scene = getScene(room);
      const target = scene.targets.find(target => target.id === action.targetId);
      expect(target, `${choice.id}: ${action.targetId}`).toBeDefined();
      expect(target!.tokens).toContain(action.token);
      const preview = choiceActionPreview(room, action);
      expect(preview?.label).toBeTruthy();
      expect(preview?.detail).toBeTruthy();
      expect(target!.actionCues?.[action.token]).toBe(preview?.label);
      expect(choice.title).toBeTruthy();
      expect(() => act(room, action)).not.toThrow();
    }
  });

  it.each(authoredChoices)('keeps guaranteed downed recovery available in $choice.id', ({ choice }) => {
    const room = fixture(choice.mode, 1, false, false, choice.id);
    room.seats[0].hp = 0;
    setState(room, { phase: 'setback', level: 0 });
    const action = primaryHelp(room);
    expect(choiceActionPreview(room, action)).toMatchObject({ guaranteed: true });
    const result = act(room, { ...action, releaseMs: 800 });
    expect(own(result)).toMatchObject({ success: true, contribution: true, result: { progress: 1, executionBonus: 0 } });
    expect(own(result).roll).toBeUndefined();
    expect(state(result).phase).not.toBe('setback');
  });

  it.each(authoredChoices)('includes the actual $choice.id outcome without undoing its story route', ({ choice, chapter }) => {
    for (const outcome of ['full', 'partial', 'lost'] as const) {
      const room = fixture(choice.mode, 1, true, false, choice.id);
      setState(room, { phase: 'settled', level: outcome === 'full' ? 2 : outcome === 'partial' ? 1 : 0, outcome });
      room.progress = chapter.progressGoal;
      const resolved = command(room, 'tick', 'a', {}, room.deadline);
      expect(resolved.outcomes.at(-1)?.text).toContain(choice.endings[outcome]);
      expect(state(resolved).outcome).toBe(outcome);
      if (chapter.branch) {
        expect(resolved.storyBranch).toBe(room.storyBranch);
        expect(resolved.outcomes.at(-1)?.text).toContain(adventureFor(room).branchEndings![room.storyBranch!]);
      }
    }
  });

  it.each(authoredChoices)('does not let ordinary Spotlight silently spend or win $choice.id', ({ choice }) => {
    for (const targetId of [choice.primaryId, choice.secondaryId]) for (const phase of ['open', choice.mode === 'prepare' ? 'ready' : 'setback'] as const) {
      const room = fixture(choice.mode, 1, true, false, choice.id);
      setState(room, { phase, level: phase === 'ready' ? 1 : 0, uses: 0 });
      const before = structuredClone(state(room));
      const target = getScene(room).targets.find(target => target.id === targetId)!;
      const action: PlayerAction = { token: 'spotlight', targetId, proposal: {
        id: 'reviewed-ordinary-spotlight', turn: room.turn, targetId, effect: target.effects[0], label: 'Use what is nearby',
        description: 'Help the party with the supported ordinary scene effect.', idea: 'Use what is nearby to help.', supported: true, source: 'authored',
      } };
      expect(choiceActionPreview(room, action)).toBeUndefined();
      const resolved = act(room, action);
      expect(own(resolved).success).toBe(true);
      expect(state(resolved)).toEqual(before);
      expect(resolved.events.some(event => event.result?.chapterChoice)).toBe(false);
      expect(resolved.players.a.spotlightChapters).toContain(room.chapter);
    }
  });

  it.each([secondaryHelp, risk])('records a successful prepared chapel payoff as a repaired ward and a restored guardian', move => {
    const room = fixture('prepare', 1, true, true, 'briar-bell-rhythm');
    setState(room, { phase: 'ready', level: 1, uses: 0 });
    room.progress = chaptersFor(room)[room.chapter].progressGoal - 3;
    const result = act(room, move(room));
    expect(result.flags).toContain('ward-repaired');
    expect(own(result)).toMatchObject({ success: true, result: { changed: true } });
    expect(own(result).change).toBeDefined();
    expect(result.outcomes.at(-1)?.text).toContain('guardian bows');
    const missed = fixture('prepare', 1, false, true, 'briar-bell-rhythm');
    setState(missed, { phase: 'ready', level: 1, uses: 0 });
    expect(act(missed, risk(missed)).flags).not.toContain('ward-repaired');
  });

  it.each(['early', 'cap'] as const)('records only a final preparation outcome on %s chapter closure', boundary => {
    const room = fixture('prepare');
    if (boundary === 'early') room.progress = chaptersFor(room)[room.chapter].progressGoal - 1;
    else room.chapterRound = 10;
    expect(choiceActionPreview(room, primaryHelp(room))?.detail).toContain('No later turn');
    const result = act(room, primaryHelp(room));
    const changes = result.events.filter(event => event.result?.chapterChoice);
    expect(changes).toHaveLength(1);
    expect(changes[0].result?.chapterChoice?.state).toMatchObject({ phase: 'settled', outcome: 'partial' });
    expect(changes[0].change?.text).toContain(definition(room).endings.partial);
    expect(changes[0].change?.next).not.toMatch(/prepare again|following turn|repair|risk the larger/i);
    expect(result.outcomes).toHaveLength(1);
  });

  it('closes an early-ending rescue miss without advertising another recovery turn', () => {
    const room = fixture('rescue', 1, false);
    room.progress = chaptersFor(room)[room.chapter].progressGoal - 1;
    const result = act(room, risk(room));
    const changes = result.events.filter(event => event.result?.chapterChoice);
    expect(changes).toHaveLength(1);
    expect(changes[0].result?.chapterChoice?.state).toMatchObject({ phase: 'settled', outcome: 'lost' });
    expect(changes[0].change?.text).toContain(definition(room).endings.lost);
    expect(changes[0].change?.next).not.toMatch(/recover|investigate/i);
    expect(result.outcomes).toHaveLength(1);
  });

  it('settles a final-round successful push directly without offering a later bank', () => {
    const room = fixture('press'); room.chapterRound = 10;
    expect(choiceActionPreview(room, risk(room))?.detail).toContain('new levels cannot be banked later');
    const result = act(room, risk(room));
    expect(own(result).success).toBe(true);
    expect(own(result).result?.progress).toBe(2);
    const changes = result.events.filter(event => event.result?.chapterChoice);
    expect(changes).toHaveLength(1);
    expect(changes[0].result?.chapterChoice?.state).toMatchObject({ phase: 'settled', level: 0, outcome: 'lost' });
    expect(changes[0].change?.next).not.toMatch(/bank|push/i);
  });

  it('credits all recorded preparers and the successful humans who later use their preparation', () => {
    const prepared = all(fixture('prepare', 2), primaryHelp);
    expect(state(prepared).sources?.map(source => source.actorId)).toEqual(['a', 'b']);
    for (const source of state(prepared).sources!) expect(prepared.events.find(event => event.id === source.eventId))
      .toMatchObject({ actorId: source.actorId, actorName: source.actorName, success: true, contribution: true });
    expect(choiceStatus(prepared)?.credit).toBe('Prepared by Ada and Hero 1');
    const choosing = next(prepared);
    const used = act(act(choosing, secondaryHelp(choosing)), risk(choosing), 'b');
    const event = used.events.filter(event => event.result?.chapterChoice?.credit).at(-1)!;
    expect(event.result?.chapterChoice?.credit).toMatchObject({ kind: 'payoff', actors: [{ actorId: 'a' }, { actorId: 'b' }], sources: state(prepared).sources });
    expect(choiceCreditText(event.result!.chapterChoice!.credit!)).toBe('Used by Ada and Hero 1 · prepared by Ada and Hero 1.');
    expect(event.text).toContain('prepared by Ada and Hero 1');
    expect(state(used).sources).toBeUndefined();
    expect(state(used).uses).toBe(1);
  });

  it('does not let same-turn maintenance replace the source or claim another hero’s payoff', () => {
    const prepared = all(fixture('prepare', 2), primaryHelp), choosing = next(prepared);
    const used = act(act(choosing, secondaryHelp(choosing)), primaryHelp(choosing), 'b');
    const credit = used.events.filter(event => event.result?.chapterChoice?.credit).at(-1)!.result!.chapterChoice!.credit!;
    expect(credit.actors.map(actor => actor.actorId)).toEqual(['a']);
    expect(credit.sources).toEqual(state(prepared).sources);
    expect(credit.sources?.some(source => source.eventId === own(used, 'b').id)).toBe(false);
    expect(state(used).phase).toBe('open');
  });

  it('retains the recorded preparer’s name after departure and JSON reload', () => {
    const prepared = all(fixture('prepare', 2), primaryHelp);
    const departed = command(prepared, 'leave', 'a');
    const loaded = JSON.parse(JSON.stringify(departed)) as AdventureRoom;
    loaded.players.a.character.name = 'Changed elsewhere';
    const choosing = next(loaded);
    const used = act(choosing, secondaryHelp(choosing), 'b');
    const credit = used.events.filter(event => event.result?.chapterChoice?.credit).at(-1)!.result!.chapterChoice!.credit!;
    expect(credit.sources?.find(source => source.actorId === 'a')?.actorName).toBe('Ada');
    expect(credit.actors.map(actor => actor.actorId)).toEqual(['b']);
    expect(used.players.a.actions).toBe(1);
  });

  it('does not credit a failed payoff or attribute an unrecorded legacy preparation', () => {
    const prepared = all(fixture('prepare', 1, false), primaryHelp);
    const missed = act(next(prepared), risk(prepared));
    expect(own(missed).success).toBe(false);
    expect(state(missed).sources).toBeUndefined();
    expect(missed.events.filter(event => event.turn === missed.turn && event.result?.chapterChoice?.credit)).toHaveLength(0);
    const legacy = fixture('prepare'); setState(legacy, { phase: 'ready', level: 1 });
    const used = act(legacy, secondaryHelp(legacy));
    const credit = used.events.find(event => event.result?.chapterChoice?.credit)!.result!.chapterChoice!.credit!;
    expect(credit.sources).toBeUndefined();
    expect(choiceCreditText(credit)).toBe('Used by Ada.');
  });

  it('credits actual builders and bankers without treating a same-turn push as a source', () => {
    const built = all(fixture('press', 2), risk), choosing = next(built);
    expect(choiceStatus(choosing)?.credit).toBe('Built by Ada and Hero 1');
    const banked = act(act(choosing, secondaryHelp(choosing)), risk(choosing), 'b');
    const credit = banked.events.filter(event => event.result?.chapterChoice?.credit).at(-1)!.result!.chapterChoice!.credit!;
    expect(credit.kind).toBe('banked');
    expect(credit.actors.map(actor => actor.actorId)).toEqual(['a']);
    expect(credit.sources).toEqual(state(built).sources);
    expect(credit.sources?.some(source => source.eventId === own(banked, 'b').id)).toBe(false);
    expect(state(banked).outcome).toBe('partial');
  });

  it('removes lost press provenance without assigning named blame to a failed teammate', () => {
    const built = all(fixture('press', 2), risk), choosing = next(built);
    choosing.seats[1].character.traits = { ATH: -100, CHA: -100, ING: -100, INT: -100 };
    const lost = all(choosing, risk);
    expect(state(lost)).toMatchObject({ phase: 'setback', level: 0 });
    expect(state(lost).sources).toBeUndefined();
    const change = lost.events.find(event => event.turn === lost.turn && event.result?.chapterChoice)!;
    expect(change.result?.chapterChoice?.credit).toBeUndefined();
    expect(change.text).not.toContain('Hero 1');
    expect(choiceStatus(lost)?.credit).toBeUndefined();
  });

  it('credits only successful rescuers while preserving joint salvage and recovery credit', () => {
    const room = fixture('rescue', 2, false);
    const saved = act(act(room, primaryHelp(room)), risk(room), 'b');
    const savedCredit = saved.events.find(event => event.result?.chapterChoice?.credit)!.result!.chapterChoice!.credit!;
    expect(savedCredit).toMatchObject({ kind: 'rescued', actors: [{ actorId: 'a' }] });
    expect(state(saved).sources?.map(source => source.actorId)).toEqual(['a']);
    const recoveryRoom = fixture('rescue', 2); setState(recoveryRoom, { phase: 'setback', level: 0 });
    const recovered = act(act(recoveryRoom, primaryHelp(recoveryRoom)), recovery(recoveryRoom), 'b');
    expect(state(recovered).outcome).toBe('full');
    expect(state(recovered).sources?.map(source => source.actorId)).toEqual(['a', 'b']);
    expect(choiceStatus(recovered)?.credit).toBe('Saved with Ada and Hero 1');
  });

  it('keeps provenance and reward counts unchanged across an exact command retry', () => {
    const room = fixture('prepare');
    const move: AdventureCommand = { id: 'credit-once', type: 'act', userId: 'a', expectedTurn: room.turn, action: primaryHelp(room) };
    const prepared = reduceAdventure(room, move, 1001);
    const loaded = JSON.parse(JSON.stringify(prepared)) as AdventureRoom;
    const retried = reduceAdventure(loaded, move, 1002);
    expect(retried).toEqual(loaded);
    expect(state(retried).sources).toHaveLength(1);
    expect(retried.players.a).toMatchObject({ actions: 1, xp: 3 });
  });
});
