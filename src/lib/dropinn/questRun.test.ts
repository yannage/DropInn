import { describe, expect, it } from 'vitest';
import { createCharacterProfile, type CharacterClassKey } from '../character';
import { createAdventure, reduceAdventure } from './engine';
import { createQuestRun, questCombatMoves, questHash, questMap, questOptions, questRunView, QUEST_RUN_CONTENT } from './questRun';
import type { QuestAction } from './questRunTypes';
import type { AdventureCommand, AdventureRoom } from './types';

let sequence = 0;
const hero = (name: string, classKey: CharacterClassKey = 'fighter') => ({ ...createCharacterProfile(name, classKey), id: name });
const initial = (classKey: CharacterClassKey = 'fighter') => createAdventure(hero('Alice', classKey), 'alice', 1000, 'MOSS01', 'mosswater');
const command = (room: AdventureRoom, type: AdventureCommand['type'], userId = 'alice', fields: Partial<AdventureCommand> = {}, now = room.updatedAt + 1) => reduceAdventure(room, { id: `quest-test-${++sequence}`, type, userId, ...fields }, now);
const action = (room: AdventureRoom, questAction: QuestAction, userId = room.questRun!.focus!.actorId) => command(room, 'quest-act', userId, { expectedTurn: room.turn, questAction });
const next = (room: AdventureRoom) => room.status === 'completed' ? room : command(room, 'tick', 'alice', {}, room.revealUntil!);
const turn = (room: AdventureRoom, questAction: QuestAction, userId?: string) => next(action(room, questAction, userId));
const interact = (targetId: string, optionId: string): QuestAction => ({ kind: 'interact', targetId, optionId });
function upstream(room = initial()) {
  if (!room.questRun!.usedOptions.includes('well-inspect')) room = turn(room, interact('well', 'well-inspect'));
  if (!room.questRun!.usedOptions.includes('well-trace-stain')) room = turn(room, interact('well', 'well-trace-stain'));
  return turn(room, { kind: 'travel', edgeId: 'yard-to-watercourse' });
}
function combat(room = initial()) { return turn(upstream(room), interact('mossback', 'mossback-challenge')); }
function pair() {
  let room = command(initial(), 'join', 'bob', { character: hero('Bob', 'wizard') });
  room = turn(room, interact('well', 'well-inspect')); return turn(room, interact('well', 'well-trace-stain'));
}

describe('Mosswater sequential quest lifecycle', () => {
  it('pins a new mode, with six locations and mechanically different seeded exits', () => {
    const room = initial(); expect(room.adventureVersion).toBe(1); expect(room.expedition).toBeUndefined();
    expect(QUEST_RUN_CONTENT.nodes).toHaveLength(6);
    const variants = new Set<string>(); const exits = new Set<string>();
    for (let i = 0; i < 12; i++) { const fixture = { ...room, questRun: createQuestRun(`seed-${i}`) }; variants.add(fixture.questRun.facts[0].id); exits.add(questMap(fixture).edges.filter(edge => edge.available).map(edge => edge.to).join(',')); }
    expect(variants.size).toBe(2); expect(exits.size).toBe(2);
    expect(createAdventure(hero('Old'), 'old', 1000, 'GEMOLD', 'gemward', 3).questRun).toBeUndefined();
  });
  it('uses two immediate meaningful beats under one deadline, then admits and rotates', () => {
    const room = command(initial(), 'join', 'bob', { character: hero('Bob') }); const deadline = room.deadline;
    const first = action(room, interact('well', 'well-inspect'));
    expect(first.phase).toBe('reveal'); expect(first.revealUntil! - first.updatedAt).toBe(3000); expect(first.players.bob.seatId).toBeNull();
    expect(first.questRun!.followUp!.optionIds).toContain('well-trace-stain');
    const follow = next(first); expect(follow.turn).toBe(room.turn + 1); expect(follow.deadline).toBe(deadline); expect(follow.questRun!.focus!.remaining).toBe(1);
    expect(() => action(follow, interact('well', 'well-trace-stain'), 'bob')).toThrow('active turn');
    const boundary = turn(follow, interact('well', 'well-trace-stain'));
    expect(boundary.players.bob.seatId).toBeTruthy(); expect(boundary.questRun!.focus!.actorId).toBe('bob'); expect(boundary.deadline - boundary.updatedAt).toBe(45_000);
  });
  it('keeps exact retries once, rejects stale decisions and prevents repeated discovery farms', () => {
    const room = initial(); const payload: AdventureCommand = { id: 'exact-quest-retry', type: 'quest-act', userId: 'alice', expectedTurn: room.turn, questAction: interact('well', 'well-inspect') };
    const accepted = reduceAdventure(room, payload, 1001); expect(reduceAdventure(accepted, payload, 1002)).toBe(accepted);
    const moved = next(accepted); expect(reduceAdventure(JSON.parse(JSON.stringify(moved)), payload, moved.updatedAt + 1)).toEqual(moved);
    expect(() => command(moved, 'quest-act', 'alice', { expectedTurn: room.turn, questAction: interact('well', 'well-trace-stain') })).toThrow('ended');
    expect(() => action(moved, interact('well', 'well-inspect'))).toThrow('displayed');
    expect(moved.questRun!.facts.filter(fact => fact.id === 'dye-stain')).toHaveLength(1); expect(moved.players.alice.actions).toBe(1);
  });
  it('times out only the active hero, ejects after two missed focuses, and parks without unattended progress', () => {
    let room = pair(); expect(room.questRun!.focus!.actorId).toBe('bob');
    room = next(command(room, 'tick', 'alice', {}, room.deadline));
    expect(room.seats.find(seat => seat.actorId === 'bob')!.missedTurns).toBe(1); expect(room.seats.find(seat => seat.actorId === 'alice')!.missedTurns).toBe(0);
    room = turn(room, { kind: 'pass' }); room = command(room, 'tick', 'alice', {}, room.deadline);
    expect(room.players.bob.leftAt).not.toBeNull(); expect(room.players.bob.actions).toBe(0);
    room = command(room, 'leave'); expect(room.status).toBe('parked');
    expect(command(room, 'tick', 'alice', {}, room.updatedAt + 1_000_000)).toBe(room);
    const restored = command(JSON.parse(JSON.stringify(room)), 'join', 'alice', { character: hero('Alice') });
    expect(restored.status).toBe('active'); expect(restored.questRun!.facts).toEqual(room.questRun!.facts);
  });
  it('revisits retain solved state without granting travel rewards twice', () => {
    let room = upstream(); const xp = room.players.alice.xp;
    room = turn(room, { kind: 'travel', edgeId: 'watercourse-to-yard' }); room = turn(room, { kind: 'travel', edgeId: 'yard-to-watercourse' });
    expect(room.players.alice.xp).toBe(xp); expect(questOptions(room, 'well').length).toBe(0);
    expect(questMap(room).edges.find(edge => edge.id === 'yard-to-watercourse')!.taken).toBe(true);
  });
  it('keeps completion and irreversible chosen cost distinct from the discovery step', () => {
    let room = upstream(); room = turn(room, interact('mossback', 'mossback-listen'));
    expect(room.status).toBe('active'); expect(room.questRun!.ending).toBeUndefined();
    room = action(room, interact('mossback', 'mossback-bargain'));
    expect(room.status).toBe('completed'); expect(room.questRun!.ending!.id).toBe('bargain'); expect(room.questRun!.ending!.text).toContain('washpond');
    expect(room.outcomes).toHaveLength(3); expect(room.players.alice.keepsakes).toHaveLength(3);
    expect(room.questRun!.facts.some(fact => fact.id === 'washpond-promised')).toBe(true);
    expect(() => action(room, interact('dye-vat', 'vat-isolate'))).toThrow('complete');
    const completed = command(room, 'leave'); expect(completed.status).toBe('completed');
    expect(command(completed, 'tick', 'alice', {}, completed.updatedAt + 1_000_000)).toBe(completed);
    expect(() => command(completed, 'join', 'alice', { character: hero('Alice') })).toThrow('complete');
  });
  it('rejects old token/travel APIs and invented quest fields without touching state', () => {
    const room = initial();
    expect(() => command(room, 'act', 'alice', { expectedTurn: room.turn, action: { token: 'assist', targetId: 'well' } })).toThrow('quest actions');
    expect(() => command(room, 'vote-travel', 'alice', { expectedTurn: room.turn })).toThrow('quest actions');
    expect(() => action(room, { kind: 'pass', xp: 100 } as never)).toThrow('valid quest');
    expect(room.players.alice.xp).toBe(0);
  });
});

describe('Mosswater combat and run builds', () => {
  it('gives each human a combat move before one frozen strike and leaves exploration resumable', () => {
    let room = combat(pair()); const target = room.questRun!.combat!.intent.targetActorId;
    room = turn(room, { kind: 'combat', move: 'defend' });
    expect(room.questRun!.combat!.round).toBe(1); expect(room.questRun!.combat!.intent.targetActorId).toBe(target);
    expect(room.events.filter(event => event.result?.damage !== undefined)).toHaveLength(0);
    room = turn(room, { kind: 'combat', move: 'attack' });
    expect(room.questRun!.combat!.round).toBe(2); expect(room.events.filter(event => event.result?.damage !== undefined)).toHaveLength(1);
    for (let guard = 0; room.questRun!.combat && guard < 20; guard++) room = turn(room, { kind: 'combat', move: 'attack' });
    expect(room.questRun!.combat).toBeUndefined(); expect(room.questRun!.nodeId).toBe('watercourse');
    expect(room.questRun!.facts.some(fact => fact.id === 'encounter-cleared:mossback')).toBe(true);
    expect(room.questRun!.ending).toBeUndefined();
  });
  it.each(['fighter', 'rogue', 'wizard', 'cleric'] as const)('uses %s mana and distinct class effect; Defend restores mana', classKey => {
    let room = combat(initial(classKey)); const before = room.questRun!.heroes.alice.mana;
    const label = questCombatMoves(room, 'alice').find(move => move.id === 'spell')!.label;
    room = turn(room, { kind: 'combat', move: 'spell' });
    expect(room.questRun!.heroes.alice.mana).toBe(before - 1); expect(room.events.some(event => event.text.includes(label))).toBe(true);
    room = turn(room, { kind: 'combat', move: 'defend' }); expect(room.questRun!.heroes.alice.mana).toBe(before);
  });
  it('supports downed Mend and has a finite sixth-round escape instead of an endless heal/defend loop', () => {
    let room = combat(); room.seats.find(seat => seat.actorId === 'alice')!.hp = 0;
    expect(() => action(room, { kind: 'combat', move: 'attack' })).toThrow('downed');
    const supplies = room.questRun!.supplies; room = turn(room, { kind: 'combat', move: 'mend' });
    expect(room.questRun!.supplies).toBe(supplies - 1);
    for (let count = 0; room.questRun!.combat && count < 6; count++) room = turn(room, { kind: 'combat', move: 'defend' });
    expect(room.questRun!.combat).toBeUndefined(); expect(room.questRun!.facts.some(fact => fact.id === 'escaped:mossback')).toBe(true);
    expect(room.questRun!.lootOffers).toEqual([]);
  });
  it('does not spend a supply on full health or grant companion support, mana or rewards to an absent move', () => {
    let room = combat();
    expect(questCombatMoves(room, 'alice').find(move => move.id === 'mend')!.available).toBe(false);
    expect(() => action(room, { kind: 'combat', move: 'mend' })).toThrow('full health');
    room.questRun!.heroes.alice.mana = 0; const xp = room.players.alice.xp, start = room.events.length;
    room = command(room, 'tick', 'alice', {}, room.deadline);
    expect(room.questRun!.heroes.alice.mana).toBe(0); expect(room.players.alice.xp).toBe(xp);
    expect(room.events.slice(start).some(event => event.text.includes('companions hold'))).toBe(false);
  });
  it('parks a completed encounter reveal and reopens exploration without replaying the saved combat return', () => {
    let room = combat();
    while (room.questRun!.combat!.status === 'active') { room = action(room, { kind: 'combat', move: 'attack' }); if (room.questRun!.combat!.status === 'active') room = next(room); }
    const facts = structuredClone(room.questRun!.facts), offers = structuredClone(room.questRun!.lootOffers);
    room = command(room, 'leave'); expect(room.status).toBe('parked');
    room = command(JSON.parse(JSON.stringify(room)), 'join', 'alice', { character: hero('Alice') });
    expect(room.questRun!.combat).toBeUndefined(); expect(room.questRun!.facts).toEqual(facts); expect(room.questRun!.lootOffers).toEqual(offers);
    expect(room.questRun!.focus!.remaining).toBe(2);
  });
  it('retains battle HP, mana, build and discoveries when the last hero parks and rejoins', () => {
    let room = turn(combat(initial('wizard')), { kind: 'combat', move: 'spell' });
    const hp = room.seats.find(seat => seat.actorId === 'alice')!.hp, build = structuredClone(room.questRun!.heroes.alice), facts = structuredClone(room.questRun!.facts);
    expect(hp).toBeLessThan(room.players.alice.character.maxHp);
    room = command(room, 'leave'); expect(room.status).toBe('parked'); expect(room.players.alice.character.hp).toBe(hp);
    room = command(JSON.parse(JSON.stringify(room)), 'join', 'alice', { character: hero('Alice', 'wizard') });
    expect(room.seats.find(seat => seat.actorId === 'alice')!.hp).toBe(hp); expect(room.questRun!.heroes.alice).toEqual(build); expect(room.questRun!.facts).toEqual(facts);
    expect(room.deadline - room.updatedAt).toBe(25_000);
  });
  it('announces the preserved strike against a new hero resuming a parked encounter', () => {
    let room = turn(combat(initial('wizard')), { kind: 'combat', move: 'spell' });
    const saved = structuredClone(room.questRun!.combat!), previousHero = structuredClone(room.questRun!.heroes.alice);
    room = command(room, 'leave');
    room = command(JSON.parse(JSON.stringify(room)), 'join', 'bob', { character: hero('Bob') });
    expect(room.questRun!.combat).toMatchObject({ round: saved.round, enemyHp: saved.enemyHp, enemyArmor: saved.enemyArmor, intent: { targetActorId: 'bob', damage: saved.intent.damage } });
    expect(room.enemyIntent!.targetActorId).toBe('bob'); expect(room.questRun!.heroes.alice).toEqual(previousHero);
    const hp = room.seats.find(seat => seat.actorId === 'bob')!.hp;
    room = turn(room, { kind: 'combat', move: 'attack' });
    expect(room.seats.find(seat => seat.actorId === 'bob')!.hp).toBeLessThan(hp);
    expect(room.events.filter(event => event.result?.damage !== undefined).at(-1)!.actorId).toBe('bob');
  });
  it('grants a seeded owned loot draft once and allows offturn builds without stealing a decision', () => {
    let room = combat(pair()); for (let count = 0; room.questRun!.combat && count < 20; count++) room = turn(room, { kind: 'combat', move: 'attack' });
    const offer = room.questRun!.lootOffers.find(offer => offer.actorId === 'alice')!; expect(offer.choices).toHaveLength(2);
    const before = { turn: room.turn, phase: room.phase, deadline: room.deadline, focus: structuredClone(room.questRun!.focus), xp: room.players.alice.xp };
    const payload: AdventureCommand = { id: 'owned-loot-retry', type: 'quest-act', userId: 'alice', expectedTurn: room.turn - 2, questAction: { kind: 'loot', offerId: offer.id, choiceId: offer.choices[0] } };
    room = reduceAdventure(room, payload, room.updatedAt + 1);
    expect({ turn: room.turn, phase: room.phase, deadline: room.deadline, focus: room.questRun!.focus, xp: room.players.alice.xp }).toEqual(before);
    expect(reduceAdventure(room, payload, room.updatedAt + 2)).toBe(room);
    expect(room.questRun!.heroes.alice.equipment).toContain(offer.choices[0]);
    expect(() => action(room, { kind: 'loot', offerId: offer.id, choiceId: offer.choices[0] }, 'bob')).toThrow('current loot');
    const oldMight = room.questRun!.heroes.alice.attributes.might; expect(room.questRun!.heroes.alice.points).toBeGreaterThan(0);
    room = action(room, { kind: 'upgrade', attribute: 'might' }, 'alice'); expect(room.questRun!.heroes.alice.attributes.might).toBe(oldMight + 1);
    expect(room.turn).toBe(before.turn); expect(initial().questRun!.heroes.alice.level).toBe(1); expect(initial().questRun!.heroes.alice.equipment).toEqual([]);
  });
  it('keeps a departing announced victim until the round strike without redirecting damage', () => {
    let room = combat(pair()); const actor = room.questRun!.combat!.intent.targetActorId;
    room = command(room, 'leave', actor);
    expect(room.questRun!.combat!.intent.targetActorId).toBe(actor);
    while (room.questRun!.combat?.round === 1) room = turn(room, { kind: 'combat', move: 'attack' });
    expect(room.events.find(event => event.result?.damage !== undefined)!.actorId).toBe(actor);
    expect(room.players[actor].leftAt).not.toBeNull();
  });
  it('holds a fifth visitor pending until the retained threatened seat actually opens', () => {
    let room = initial();
    for (const id of ['bob', 'cara', 'dave']) room = command(room, 'join', id, { character: hero(id) });
    room = combat(room);
    room = turn(room, { kind: 'combat', move: 'defend' }, 'alice');
    room = command(room, 'leave', 'alice');
    room = command(room, 'join', 'eve', { character: hero('Eve') });
    room = turn(room, { kind: 'combat', move: 'attack' }, 'bob');
    expect(room.pendingJoins).toContain('eve'); expect(room.players.eve.seatId).toBeNull();
    room = turn(room, { kind: 'combat', move: 'attack' }, 'cara');
    room = turn(room, { kind: 'combat', move: 'attack' }, 'dave');
    expect(room.players.alice.leftAt).not.toBeNull(); expect(room.players.eve.seatId).toBeTruthy(); expect(room.pendingJoins).toEqual([]);
    expect(room.seats).toHaveLength(4);
  });
  it.each([true, false])('uses the chosen attribute for deterministic fail-forward checks (success %s)', succeeds => {
    const room = initial(); const node = QUEST_RUN_CONTENT.nodes.find(node => node.targets.some(target => target.options.some(option => option.check)))!;
    const target = node.targets.find(target => target.options.some(option => option.check))!; const option = target.options.find(option => option.check)!;
    room.questRun!.nodeId = node.id; room.questRun!.facts.push(...(option.requires ?? []).map(id => ({ id, actorId: 'alice', actorName: 'Alice', sourceEventId: 'fixture', nodeId: node.id })));
    const modifier = room.questRun!.heroes.alice.attributes[option.check!.attribute];
    const seed = Array.from({ length: 100 }, (_, i) => `check-${i}`).find(seed => (1 + questHash(`${seed}:${room.turn}:alice:${option.id}`) % 6 + modifier >= option.check!.dc) === succeeds)!;
    room.questRun!.seed = seed;
    const resolved = action(room, interact(target.id, option.id)); const source = resolved.events.find(event => event.quest?.check)!;
    expect(source.quest!.check!.success).toBe(succeeds); expect(source.quest!.check!.modifier).toBe(modifier);
    for (const id of option.discover ?? []) expect(resolved.questRun!.facts.some(fact => fact.id === id)).toBe(true);
    expect(source.text).toContain(succeeds ? option.check!.success : option.check!.failure);
    expect(questRunView(resolved, 'alice').hero!.attributes).toEqual(room.questRun!.heroes.alice.attributes);
  });
});
