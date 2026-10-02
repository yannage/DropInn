import { describe, expect, it } from 'vitest';
import { createCharacterProfile } from '../character';
import { createAdventure } from './engine';
import { choiceDefinition } from './chapterChoices';
import { committedPartyIntents, partyIntentPresentation } from './partyIntent';
import { contextualActionLabel } from './playerGuidance';
import { ADVENTURES, chaptersFor } from './registry';
import { getScene } from './scene';
import type { AdventureRoom, ChapterChoiceState, PlayerAction } from './types';

function fixture(mode: 'prepare' | 'rescue' | 'press' = 'prepare', count = 2) {
  const candidate = ADVENTURES.flatMap(adventure => adventure.chapters.map((chapter, index) => ({ adventure, chapter, index })))
    .find(entry => entry.chapter.choice?.mode === mode)!;
  const room = createAdventure(createCharacterProfile('Ada', 'fighter'), 'a', 1000, 'INTENT', candidate.adventure.id);
  room.chapter = candidate.index; room.chapterRound = 1;
  room.chapterChoices = {}; room.commits = {}; room.events = []; room.flags = [];
  const first = room.seats.find(seat => seat.actorId === 'a')!;
  room.seats = [first];
  for (let i = 1; i < count; i++) {
    const seat = structuredClone(first);
    seat.actorId = ['a', 'b', 'c', 'd'][i]; seat.id = `seat-${i}`;
    seat.character.name = ['Ada', 'Wren', 'Moss', 'Fern'][i];
    room.seats.push(seat);
    room.players[seat.actorId] = { ...structuredClone(room.players.a), userId: seat.actorId, seatId: seat.id, character: seat.character };
  }
  if (candidate.chapter.branch) room.storyBranch = candidate.chapter.branch.fallback;
  return room;
}
const choice = (room: AdventureRoom) => choiceDefinition(room)!;
const primaryHelp = (room: AdventureRoom): PlayerAction => ({ token: 'assist', targetId: choice(room).primaryId });
const secondaryHelp = (room: AdventureRoom): PlayerAction => ({ token: 'assist', targetId: choice(room).secondaryId });
const risk = (room: AdventureRoom): PlayerAction => ({ token: choice(room).riskToken,
  targetId: choice(room).mode === 'prepare' ? choice(room).secondaryId : choice(room).primaryId });
const setState = (room: AdventureRoom, state: ChapterChoiceState) => { room.chapterChoices![choice(room).id] = state; };

describe('committed party intent presentation', () => {
  it.each([1, 2, 4])('lists only the other accepted human moves at a %i-player table', count => {
    const room = fixture('prepare', count);
    room.seats.forEach(seat => { room.commits[seat.actorId] = primaryHelp(room); });
    const intents = committedPartyIntents(room, 'a');
    expect(intents).toHaveLength(count - 1);
    expect(intents.map(intent => intent.actorName)).toEqual(['Wren', 'Moss', 'Fern'].slice(0, count - 1));
    intents.forEach(intent => expect(intent).toMatchObject({ label: contextualActionLabel(room, primaryHelp(room)),
      certainty: 'guaranteed', cue: 'Guaranteed on resolution', targetKind: 'scene' }));
  });

  it('keeps an accepted departing human, but excludes companions, unseated actors and uncommitted humans', () => {
    const room = fixture('prepare', 4);
    room.seats[1].leaving = true;
    room.seats[2].kind = 'companion';
    room.commits.b = primaryHelp(room); room.commits.c = primaryHelp(room); room.commits.unseated = primaryHelp(room);
    expect(committedPartyIntents(room, 'a').map(intent => intent.actorId)).toEqual(['b']);
  });

  it.each(['reveal', 'completed', 'parked'] as const)('does not present stale accepted plans during %s', state => {
    const room = fixture(); room.commits.b = primaryHelp(room);
    if (state === 'reveal') room.phase = state;
    else room.status = state;
    expect(committedPartyIntents(room, 'a')).toEqual([]);
    expect(partyIntentPresentation(room, 'a')).toEqual({ intents: [] });
  });

  it('describes a preparation as next-turn intent, without promising another turn or a current payoff', () => {
    const room = fixture(); room.commits.b = primaryHelp(room);
    const result = partyIntentPresentation(room, 'a', { targetId: choice(room).secondaryId });
    expect(result.note).toContain('Wren has committed to prepare');
    expect(result.note).toContain('cannot help this turn');
    expect(result.note).toContain('only if the chapter continues');
    expect(result.shortNote).toContain('if this chapter continues');
    expect(result.intents[0].certainty).toBe('guaranteed');
  });

  it('explains that simultaneous preparation does not create a second opening', () => {
    const room = fixture(); room.commits.b = primaryHelp(room);
    expect(partyIntentPresentation(room, 'a', { action: primaryHelp(room) }).note)
      .toContain('Another Help adds progress, not another opening');
  });

  it.each(['assist', 'influence'] as const)('does not let new preparation refresh a simultaneously spent opening (%s)', token => {
    const room = fixture(); setState(room, { phase: 'ready', level: 1 });
    room.commits.b = token === 'assist' ? secondaryHelp(room) : risk(room);
    const result = partyIntentPresentation(room, 'a', { action: primaryHelp(room) });
    expect(result.note).toContain('Preparing again cannot refresh it this turn');
    expect(result.intents[0].certainty).toBe(token === 'assist' ? 'guaranteed' : 'roll');
    expect(partyIntentPresentation(room, 'a', { action: secondaryHelp(room) }).note)
      .toContain('You can still use the same opening this turn');
  });

  it('explains that maintaining ready preparation cannot protect it from being spent', () => {
    const room = fixture(); setState(room, { phase: 'ready', level: 1 }); room.commits.b = primaryHelp(room);
    expect(partyIntentPresentation(room, 'a', { action: secondaryHelp(room) }).note)
      .toContain('Spending it this turn still uses it up');
  });

  it('prioritizes an accepted guaranteed rescue over simultaneous uncertain attempts', () => {
    const room = fixture('rescue', 3); room.commits.b = primaryHelp(room); room.commits.c = risk(room);
    const result = partyIntentPresentation(room, 'a', { action: risk(room) });
    expect(result.note).toContain('Wren has committed to save all');
    expect(result.note).toContain('cannot save extra');
    expect(result.note).not.toMatch(/already saved|has saved/);
    expect(result.intents.map(intent => intent.certainty)).toEqual(['guaranteed', 'roll']);
  });

  it('keeps rolled rescue and recovery intentions uncertain', () => {
    const room = fixture('rescue'); room.commits.b = risk(room);
    expect(partyIntentPresentation(room, 'a').note).toContain('the roll can still miss');
    setState(room, { phase: 'setback', level: 0 });
    room.commits.b = { token: 'investigate', targetId: choice(room).secondaryId };
    expect(partyIntentPresentation(room, 'a', { action: primaryHelp(room) }).note).toContain('the roll can still miss');
    expect(committedPartyIntents(room, 'a')[0].certainty).toBe('roll');
  });

  it('offers full recovery alongside an accepted partial salvage', () => {
    const room = fixture('rescue'); setState(room, { phase: 'setback', level: 0 }); room.commits.b = primaryHelp(room);
    const result = partyIntentPresentation(room, 'a', { action: { token: 'investigate', targetId: choice(room).secondaryId } });
    expect(result.note).toContain('salvage some');
    expect(result.note).toContain('successful full recovery this turn still takes priority');
    expect(result.intents[0].certainty).toBe('guaranteed');
  });

  it.each([1, 2])('explains the frozen %i-level bank even when another teammate pushes', level => {
    const room = fixture('press', 3); setState(room, { phase: 'open', level });
    room.commits.b = secondaryHelp(room); room.commits.c = risk(room);
    const result = partyIntentPresentation(room, 'a', { action: risk(room) });
    expect(result.note).toContain(`bank the starting ${level}/2`);
    expect(result.note).toContain('New pushes cannot increase what is banked this turn');
    expect(result.intents.map(intent => intent.certainty)).toEqual(['guaranteed', 'roll']);
  });

  it('describes the local bank conditionally while teammates have accepted risky pushes', () => {
    const room = fixture('press'); setState(room, { phase: 'open', level: 1 }); room.commits.b = risk(room);
    const result = partyIntentPresentation(room, 'a', { action: secondaryHelp(room) });
    expect(result.note).toContain('Your bank would preserve the starting 1/2 even if a push misses');
    expect(result.note).not.toContain('has banked');
  });

  it('does not present stabilization as protection for a teammate’s push', () => {
    const room = fixture('press'); room.commits.b = risk(room);
    expect(partyIntentPresentation(room, 'a', { action: secondaryHelp(room) }).note)
      .toContain('Steadying the scene does not protect their push');
    expect(partyIntentPresentation(room, 'a').note).toContain('Any missed push loses unbanked levels');
  });

  it('suppresses cross-target choice advice for unrelated ordinary actions', () => {
    const room = fixture(); room.commits.b = primaryHelp(room);
    expect(partyIntentPresentation(room, 'a', { action: risk(room) })).toEqual({ intents: [] });
    const unrelated = getScene(room).targets.find(target => ![choice(room).primaryId, choice(room).secondaryId].includes(target.id))!;
    expect(partyIntentPresentation(room, 'a', { targetId: unrelated.id })).toEqual({ intents: [] });
    const action: PlayerAction = { token: 'investigate', targetId: unrelated.id };
    room.commits.b = action;
    expect(partyIntentPresentation(room, 'a', { action }).note).toBe(`Wren has committed: ${contextualActionLabel(room, action)}.`);
  });

  it('keeps ordinary same-target intent available after a choice is settled', () => {
    const room = fixture('rescue'); setState(room, { phase: 'settled', level: 2, outcome: 'full' });
    room.commits.b = primaryHelp(room);
    const result = partyIntentPresentation(room, 'a', { action: primaryHelp(room) });
    expect(result.note).toContain('Wren has committed:');
    expect(result.note).not.toContain('save all');
    expect(result.intents[0].certainty).toBe('roll');
  });

  it('names accepted route votes without promising or recommending a branch', () => {
    const room = fixture();
    const adventure = ADVENTURES.find(item => item.chapters[2].branch)!;
    room.adventureId = adventure.id; room.adventureVersion = adventure.version;
    room.chapter = 2; delete room.storyBranch;
    const branch = chaptersFor(room)[2].branch!;
    room.commits.b = { token: 'assist', targetId: branch.options[0].targetId };
    const [intent] = committedPartyIntents(room, 'a');
    expect(intent).toMatchObject({ certainty: 'vote', cue: 'Route vote; the party decides',
      label: contextualActionLabel(room, room.commits.b) });
    const result = partyIntentPresentation(room, 'a', { action: room.commits.b });
    expect(result.note).toContain('Wren has committed:');
    expect(result.note).not.toMatch(/Guaranteed|save all|bank the starting|to prepare/);
  });

  it.each([
    ['investigate', 'study', 'Study a weakness'],
    ['investigate', 'trail', 'Follow the trail'],
    ['influence', 'distract', 'Distract'],
    ['fight', 'guarded', 'Guarded Strike'],
  ] as const)('includes an accepted %s approach (%s) in the full intent cue', (token, approach, label) => {
    const room = fixture();
    const targetId = getScene(room).targets.find(target => target.id !== choice(room).secondaryId)!.id;
    room.enemyIntent = { turn: room.turn, sourceId: targetId, targetActorId: 'a', baseDamage: 3, duelModifier: 3 };
    room.commits.b = { token, approach, targetId };
    const [intent] = committedPartyIntents(room, 'a');
    expect(intent.cue).toBe(`${label} · Roll pending`);
    expect(intent.label).toBe(contextualActionLabel(room, room.commits.b));
  });

  it.each([undefined, 'mend'] as const)('names guaranteed hero Help (%s) without applying scene choice advice', approach => {
    const room = fixture(); room.commits.b = { token: 'assist', targetKind: 'hero', targetId: 'a', approach };
    const result = partyIntentPresentation(room, 'a', { targetId: 'a', targetKind: 'hero' });
    expect(result.intents[0]).toMatchObject({ label: `${approach === 'mend' ? 'Mend' : 'Protect'} Ada`, certainty: 'guaranteed' });
    expect(result.note).toContain(`${approach === 'mend' ? 'Mend' : 'Protect'} Ada`);
  });

  it('never returns Spotlight free text or signed proposal fields', () => {
    const room = fixture();
    room.commits.b = { token: 'spotlight', targetId: choice(room).primaryId, proposal: { id: 'secret-signed-id', turn: room.turn,
      targetId: choice(room).primaryId, effect: 'rescue', supported: true, source: 'authored',
      label: 'secret-label', idea: 'secret-idea', description: 'secret-description' } };
    const result = partyIntentPresentation(room, 'a', { targetId: choice(room).primaryId });
    expect(result.intents[0]).toMatchObject({ token: 'spotlight', certainty: 'roll' });
    expect(result.intents[0].label).toMatch(/^Spotlight at /);
    expect(JSON.stringify(result)).not.toContain('secret-');
    expect(Object.keys(result.intents[0]).sort()).toEqual(['actorId', 'actorName', 'certainty', 'cue', 'label', 'targetId', 'targetKind', 'token']);
  });

  it('uses legacy river guarantees while leaving historical Briar rules unchanged', () => {
    const room = fixture(); room.adventureId = 'briar-glen'; room.adventureVersion = 3; room.chapter = 1;
    room.commits.b = { token: 'assist', targetId: 'boat' };
    let result = partyIntentPresentation(room, 'a', { targetId: 'reeds' });
    expect(result.note).toContain('committed to secure all supplies');
    expect(result.intents[0].certainty).toBe('guaranteed');
    room.riverSupplies = { status: 'spilled' };
    result = partyIntentPresentation(room, 'a', { action: { token: 'investigate', targetId: 'reeds' } });
    expect(result.note).toContain('successful full recovery this turn still takes priority');
    room.commits.b = { token: 'investigate', targetId: 'reeds' };
    expect(partyIntentPresentation(room, 'a').note).toContain('the roll can still miss');
    room.adventureVersion = 1; delete room.riverSupplies;
    room.commits.b = { token: 'assist', targetId: 'boat' };
    expect(committedPartyIntents(room, 'a')[0].certainty).toBe('roll');
    expect(partyIntentPresentation(room, 'a', { targetId: 'reeds' })).toEqual({ intents: [] });
  });

  it('is pure and keeps the dock note bounded for several teammates', () => {
    const room = fixture('press', 4); setState(room, { phase: 'open', level: 2 });
    for (const seat of room.seats.slice(1)) {
      seat.character.name = `${seat.character.name} the Remarkable`;
      room.commits[seat.actorId] = secondaryHelp(room);
    }
    const before = structuredClone(room);
    const result = partyIntentPresentation(room, 'a', { action: risk(room) });
    expect(result.intents).toHaveLength(3);
    expect(result.note).toContain('Wren the Remarkable + 2 others have committed');
    expect(result.shortNote!.length).toBeLessThanOrEqual(110);
    expect(room).toEqual(before);
  });

  it.each([2, 3, 4])('summarizes only immediate preparation effects when a teammate explains the shared state (%i humans)', count => {
    const room = fixture('prepare', count); room.commits.b = primaryHelp(room);
    const progress = Number((1 / count).toFixed(2));
    let result = partyIntentPresentation(room, 'a', { action: primaryHelp(room) });
    expect(result.outcomeDetail).toBe(`Guaranteed +${progress} progress. Replaces usual Help.`);
    expect(result.shortNote!.length).toBeLessThanOrEqual(110);
    setState(room, { phase: 'ready', level: 1 });
    room.commits.b = secondaryHelp(room);
    result = partyIntentPresentation(room, 'a', { action: primaryHelp(room) });
    expect(result.outcomeDetail).toBe(`Guaranteed +${progress} progress. Replaces usual Help.`);
    expect(result.note).toContain('cannot refresh it this turn');
    expect(partyIntentPresentation(room, 'a', { action: secondaryHelp(room) }).outcomeDetail).toBeUndefined();
  });

  it('keeps a guaranteed rescue’s immediate progress and shared carry, while rolled rescues retain the miss cost', () => {
    const room = fixture('rescue', 4); room.commits.b = primaryHelp(room);
    const safe = partyIntentPresentation(room, 'a', { action: primaryHelp(room) });
    expect(safe.outcomeDetail).toBe('Guaranteed +0.25 progress; all saved gives +2 next chapter progress.');
    const risky = partyIntentPresentation(room, 'a', { action: risk(room) });
    expect(risky.outcomeDetail).toBe('Progress: win +1 / miss +0.25; miss +0.25 danger.');
    expect(risky.outcomeDetail).not.toMatch(/spill|deadline|round 3/);
    expect(risky.shortNote).toContain('another rescue cannot save extra');
    room.commits.b = risk(room);
    expect(partyIntentPresentation(room, 'a', { action: risk(room) }).outcomeDetail).toBeUndefined();
    setState(room, { phase: 'setback', level: 0 }); room.commits.b = primaryHelp(room);
    expect(partyIntentPresentation(room, 'a', { action: { token: 'investigate', targetId: choice(room).secondaryId } }).outcomeDetail).toBeUndefined();
  });

  it.each(['last round', 'enough progress'] as const)('preserves the no-later-turn warning for cooperative preparation with %s', ending => {
    const room = fixture('prepare', 4); room.commits.b = primaryHelp(room);
    if (ending === 'last round') room.chapterRound = 10;
    else room.progress = chaptersFor(room)[room.chapter].progressGoal - 0.25;
    const expected = 'Guaranteed +0.25 progress. Replaces usual Help.';
    const check = () => {
      const result = partyIntentPresentation(room, 'a', { action: primaryHelp(room) });
      expect(result.outcomeDetail).toBe(expected);
      expect(result.note).toMatch(/no later turn/i);
      expect(result.shortNote).toMatch(/no later turn/i);
      expect(result.shortNote!.length).toBeLessThanOrEqual(110);
    };
    check();
    setState(room, { phase: 'ready', level: 1 }); check();
    room.commits.b = secondaryHelp(room); check();
  });

  it('does not invent a terminal preparation warning before the round or progress threshold', () => {
    const room = fixture('prepare', 4); room.commits.b = primaryHelp(room); room.chapterRound = 9;
    room.progress = chaptersFor(room)[room.chapter].progressGoal - 0.26;
    expect(partyIntentPresentation(room, 'a', { action: primaryHelp(room) }).outcomeDetail)
      .toBe('Guaranteed +0.25 progress. Replaces usual Help.');
  });

  it('removes the impossible extra-level promise from a push alongside an accepted bank', () => {
    const room = fixture('press', 3); setState(room, { phase: 'open', level: 1 }); room.commits.b = secondaryHelp(room);
    const result = partyIntentPresentation(room, 'a', { action: risk(room) });
    expect(result.outcomeDetail).toBe('Progress: win +0.67 / miss +0.33; miss +0.33 danger.');
    expect(result.outcomeDetail).not.toContain('level');
    expect(result.shortNote).toContain('pushes cannot add to the bank');
    expect(partyIntentPresentation(room, 'a', { action: secondaryHelp(room) }).outcomeDetail).toBeUndefined();
  });

  it('keeps full previews for inspection-only, ordinary and unrelated selected moves', () => {
    const room = fixture(); room.commits.b = primaryHelp(room);
    expect(partyIntentPresentation(room, 'a', { targetId: choice(room).primaryId }).outcomeDetail).toBeUndefined();
    expect(partyIntentPresentation(room, 'a', { action: { token: 'investigate', targetId: choice(room).primaryId } }).outcomeDetail).toBeUndefined();
    expect(partyIntentPresentation(room, 'a', { action: risk(room) }).outcomeDetail).toBeUndefined();
    room.commits = {};
    expect(partyIntentPresentation(room, 'a', { action: primaryHelp(room) }).outcomeDetail).toBeUndefined();
  });
});
