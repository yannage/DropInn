import { describe, expect, it } from 'vitest';
import { createCharacterProfile } from '../character';
import type { CharacterClassKey } from '../character';
import { createAdventure, reduceAdventure } from './engine';
import { createExpedition, expeditionInteractions, expeditionRoutes, expeditionScene, isExpedition } from './expedition';
import type { AdventureCommand, AdventureRoom, PlayerAction } from './types';

let commandId = 0;
const hero = (name: string, classKey: CharacterClassKey = 'rogue') => ({ ...createCharacterProfile(name, classKey), id: name });
function initial(classKey: CharacterClassKey = 'rogue', seed = 'fixed-gemward') {
  const room = createAdventure(hero('Alice', classKey), 'alice', 1000, 'GEM123', 'gemward', 1);
  room.id = 'gemward-test'; room.expedition = createExpedition(seed); return room;
}
const command = (room: AdventureRoom, type: AdventureCommand['type'], userId = 'alice', extra: Partial<AdventureCommand> = {}, now = room.updatedAt + 1) => reduceAdventure(room, { id: `expedition-test-${++commandId}`, type, userId, ...extra }, now);
const act = (room: AdventureRoom, action: PlayerAction = { token: 'investigate', targetId: 'iris' }, userId = 'alice') => command(room, 'act', userId, { expectedTurn: room.turn, action });
const next = (room: AdventureRoom) => command(room, 'tick', 'alice', {}, room.revealUntil!);
function twoPlayers() {
  let room = command(initial(), 'join', 'bob', { character: hero('Bob', 'cleric') });
  room = next(act(room)); return room;
}
function travel(route = 'road', classKey: CharacterClassKey = 'rogue'): AdventureRoom {
  const room = initial(classKey);
  if (route === 'warehouse') room.expedition!.questItems.push('ledger-copy');
  if (route === 'canal') room.expedition!.questItems.push('canal-key');
  return next(act(room, { token: 'assist', targetId: 'iris', expedition: { routeId: route } }));
}
function combat(classKey: CharacterClassKey = 'rogue') {
  let room = travel('road', classKey);
  room = next(act(room, { token: 'investigate', targetId: 'crate' }));
  return room;
}
const battleAction = (room: AdventureRoom): PlayerAction => ({ targetId: 'encounter', token: ({ strike: 'investigate', trick: 'fight', guard: 'influence' } as const)[room.expedition!.battle!.stance] });
function finishCombat(room: AdventureRoom, useHelp = false) {
  let rounds = 0;
  while (room.expedition?.battle?.status === 'active') { room = next(act(room, useHelp ? { token: 'assist', targetId: 'encounter' } : battleAction(room))); if (++rounds > 4) throw new Error('Battle exceeded four rounds.'); }
  return room;
}

describe('Gemward authoritative exploration', () => {
  it('pins one deterministic coherent composition, while legacy rooms remain unchanged', () => {
    expect(createExpedition('abc')).toEqual(createExpedition('abc'));
    expect(new Set(Array.from({ length: 10 }, (_, index) => createExpedition(String(index)).variant)).size).toBe(2);
    const old = createAdventure(hero('Old'), 'old', 1000, 'OLD123');
    expect(isExpedition(old)).toBe(false); expect(old.expedition).toBeUndefined();
    expect(() => act(old, { token: 'assist', targetId: 'mara', expedition: { locationId: 'shop' } }, 'old')).toThrow('does not use expedition');
    const corrupt = initial(); delete corrupt.expedition;
    expect(expeditionScene(corrupt).targets).toHaveLength(4);
    for (const type of ['tick', 'join', 'act'] as const) expect(() => command(corrupt, type)).toThrow('missing its saved run state');
  });
  it('keeps town browsing free and permits independent simultaneous locations', () => {
    let room = twoPlayers();
    room = act(room, { token: 'influence', targetId: 'bram', expedition: { locationId: 'docks' } });
    expect(room.expedition!.questItems).not.toContain('canal-key');
    room = act(room, { token: 'assist', targetId: 'oren', expedition: { locationId: 'tavern' } }, 'bob');
    expect(room.expedition!.questItems).toContain('canal-key');
    expect(room.expedition!.stashes.bob[0].kind).toBe('second-wind');
    expect(room.expedition!.visited).toEqual(expect.arrayContaining(['shop', 'docks', 'tavern']));
  });
  it('freezes route availability and uses only explicit votes or the town cap', () => {
    let room = twoPlayers();
    // Alice discovered a ledger while Bob was awaiting admission; the canal remains locked.
    room = act(room, { token: 'influence', targetId: 'bram', expedition: { locationId: 'docks' } });
    expect(() => act(room, { token: 'assist', targetId: 'iris', expedition: { routeId: 'canal' } }, 'bob')).toThrow('not available');
    room = act(room, { token: 'assist', targetId: 'iris' }, 'bob');
    expect(room.outcomes).toHaveLength(0);
    room = next(room);
    expect(expeditionRoutes(room).find(route => route.id === 'canal')!.available).toBe(true);
    room = act(room, { token: 'assist', targetId: 'iris', expedition: { routeId: 'canal' } });
    room = act(room, { token: 'assist', targetId: 'nella', expedition: { routeId: 'warehouse' } }, 'bob');
    expect(room.expedition!.pendingRouteId).toBe('road');
    expect(room.chapter).toBe(0);
    expect(next(room).expedition!.routeId).toBe('road');
  });
  it('resolves discoveries, consumption and votes identically in reversed command arrival', () => {
    const source = twoPlayers();
    const a: PlayerAction = { token: 'influence', targetId: 'bram', expedition: { locationId: 'docks', routeId: 'road' } };
    const b: PlayerAction = { token: 'assist', targetId: 'nella', expedition: { routeId: 'warehouse' } };
    const forward = act(act(source, a), b, 'bob');
    const reverse = act(act(source, b, 'bob'), a);
    expect(forward.expedition).toEqual(reverse.expedition);
    expect(forward.players).toEqual(reverse.players);
    expect(forward.events.map(entry => [entry.text, entry.result])).toEqual(reverse.events.map(entry => [entry.text, entry.result]));
  });
  it('leaves committed votes and rewards intact when a player departs', () => {
    let room = twoPlayers();
    room = act(room, { token: 'assist', targetId: 'nella', expedition: { routeId: 'warehouse' } });
    room = command(room, 'leave');
    room = act(room, { token: 'assist', targetId: 'oren', expedition: { locationId: 'tavern' } }, 'bob');
    expect(room.expedition!.pendingRouteId).toBe('warehouse');
    expect(room.expedition!.stashes.alice[0].kind).toBe('dust');
    expect(room.players.alice.leftAt).not.toBeNull();
  });
  it('takes a fail-forward open-road route after four exploration turns', () => {
    let room = initial();
    for (let turn = 0; turn < 4; turn++) { room = act(room); if (turn < 3) room = next(room); }
    expect(room.expedition!.pendingRouteId).toBe('road');
    expect(room.outcomes[0].text).toContain('open hill road');
    expect(room.outcomes[0].text).toContain('Restor');
  });
  it('rejects malformed metadata, foreign consumables and expired location targets', () => {
    const room = initial();
    for (const expedition of [{ locationId: 'beacon' }, { consumableId: 'foreign' }, { interactionId: 'invented' }, { favourChoice: 'canal-key' }, { rewardChoice: { offerId: 'fake' } }]) expect(() => act(room, { token: 'assist', targetId: 'iris', expedition })).toThrow();
    expect(() => act(room, { token: 'assist', targetId: 'iris', expedition: { madeUp: true } as never })).toThrow('Unknown expedition');
    expect(room.players.alice.actions).toBe(0);
  });
});

describe('Gemward stash and exact commands', () => {
  it('grants each NPC gift once, offers overflow, and replaces only the chosen slot', () => {
    let room = initial();
    room.expedition!.stashes.alice = [{ id: 'one', kind: 'smoke' }, { id: 'two', kind: 'binding' }, { id: 'three', kind: 'dust' }];
    room = next(act(room, { token: 'assist', targetId: 'iris' }));
    expect(room.expedition!.offers.alice).toHaveLength(1);
    const offerId = room.expedition!.offers.alice[0].id;
    room = next(act(room, { token: 'assist', targetId: 'iris', expedition: { rewardChoice: { offerId, replaceId: 'one' } } }));
    expect(room.expedition!.stashes.alice.map(item => item.id)).toEqual(['two', 'three', 'npc:iris:alice']);
    expect(room.expedition!.offers.alice).toHaveLength(0);
    expect(() => act(room, { token: 'assist', targetId: 'iris', expedition: { rewardChoice: { offerId } } })).toThrow('no longer available');
  });
  it('spends one favour once across a duplicate receipt, and cannot use its route in that turn', () => {
    let room = next(act(initial(), { token: 'assist', targetId: 'iris' }));
    const consumableId = room.expedition!.stashes.alice[0].id;
    expect(() => act(room, { token: 'assist', targetId: 'nella', expedition: { consumableId, favourChoice: 'canal-key', routeId: 'canal' } })).toThrow('not available');
    const receipt: AdventureCommand = { id: 'exact-favour-receipt', type: 'act', userId: 'alice', expectedTurn: room.turn, action: { token: 'assist', targetId: 'nella', releaseMs: 800, expedition: { consumableId, favourChoice: 'canal-key' } } };
    room = reduceAdventure(room, receipt, room.updatedAt + 1);
    expect(room.expedition!.questItems.filter(item => item === 'canal-key')).toHaveLength(1);
    expect(room.expedition!.stashes.alice.some(item => item.id === consumableId)).toBe(false);
    expect(reduceAdventure(room, receipt, room.updatedAt + 10)).toBe(room);
    expect(JSON.parse(JSON.stringify(room)).expedition).toEqual(room.expedition);
  });
  it('keeps stash on departure/rejoin and cannot consume a replaced item', () => {
    let room = next(act(initial(), { token: 'assist', targetId: 'iris' }));
    const expected = structuredClone(room.expedition!.stashes.alice);
    room = command(room, 'leave');
    expect(room.status).toBe('parked');
    room = command(room, 'join', 'alice', { character: hero('Different') });
    expect(room.expedition!.stashes.alice).toEqual(expected);
    expect(room.players.alice.character.name).toBe('Alice');
    room.expedition!.offers.alice = [{ id: 'offer', source: 'test', item: { id: 'new', kind: 'dust' } }];
    expect(() => act(room, { token: 'assist', targetId: 'iris', expedition: { consumableId: expected[0].id, favourChoice: 'canal-key', rewardChoice: { offerId: 'offer', replaceId: expected[0].id } } })).toThrow('another owned');
  });
  it('applies dust to the actual action, heals downed heroes with their Help move, and gates combat items', () => {
    const source = initial();
    source.expedition!.stashes.alice = [{ id: 'dust', kind: 'dust' }, { id: 'heal', kind: 'second-wind' }, { id: 'smoke', kind: 'smoke' }];
    expect(() => act(source, { token: 'assist', targetId: 'iris', expedition: { consumableId: 'smoke' } })).toThrow('cannot be used');
    let room = next(act(source, { token: 'investigate', targetId: 'iris', expedition: { consumableId: 'dust' } }));
    expect(room.progress).toBe(2);
    room.seats.find(seat => seat.actorId === 'alice')!.hp = 0;
    room = act(room, { token: 'assist', targetId: 'iris', expedition: { consumableId: 'heal' } });
    expect(room.seats.find(seat => seat.actorId === 'alice')!.hp).toBe(4);
  });
});

describe('Gemward routes, battles and return', () => {
  it('settles exploration before queued combat, announces intent at entry, and returns to the route', () => {
    let room = travel();
    room = act(room, { token: 'investigate', targetId: 'crate' });
    expect(room.expedition!.discoveries).toContain('crate:investigate');
    expect(room.expedition!.battle!.status).toBe('queued');
    expect(room.enemyIntent).toBeUndefined();
    room = next(room);
    expect(room.enemyIntent?.sourceId).toBe('encounter');
    room = finishCombat(room);
    expect(room.expedition!.questItems).toContain('recovered-prism');
    expect(room.expedition!.locationId).toBe('road');
    expect(room.chapter).toBe(1);
    expect(next(act(room, { token: 'assist', targetId: 'crate' })).chapter).toBe(2);
  });
  it.each(['fighter', 'rogue', 'wizard', 'cleric'] as const)('gives %s a distinct meaningful class move', classKey => {
    let room = combat(classKey);
    const seat = room.seats.find(item => item.actorId === 'alice')!;
    seat.hp = 5;
    room.expedition!.battle!.stance = 'guard';
    room = act(room, { token: 'assist', targetId: 'encounter' });
    const result = [...room.events].reverse().find(entry => entry.kind === 'action' && entry.actorId === 'alice')!.result!;
    if (classKey === 'fighter') expect(result.protection).toBe(4);
    if (classKey === 'rogue') expect(room.flags).toContain(`expedition-opening:${room.turn + 1}`);
    if (classKey === 'wizard') expect(result.expedition!.battleProgress).toBe(3);
    if (classKey === 'cleric') expect(room.events.some(entry => entry.result?.healing === 3)).toBe(true);
  });
  it.each(['fighter', 'rogue', 'wizard', 'cleric'] as const)('gives %s a signature beyond class Help without changing the counter triangle', classKey => {
    let room = combat(classKey);
    room.seats.find(seat => seat.actorId === 'alice')!.hp = 5;
    room.expedition!.battle!.stance = classKey === 'rogue' ? 'guard' : classKey === 'wizard' ? 'strike' : 'trick';
    const token = classKey === 'rogue' ? 'influence' : classKey === 'wizard' ? 'investigate' : 'fight';
    room = act(room, { token, targetId: 'encounter', releaseMs: 800 });
    const result = [...room.events].reverse().find(entry => entry.kind === 'action' && entry.actorId === 'alice')!.result!;
    if (classKey === 'fighter' || classKey === 'rogue') expect(result.expedition!.battleProgress).toBe(4);
    if (classKey === 'wizard') { expect(result.protection).toBe(3); expect(result.executionBonus).toBe(0); }
    if (classKey === 'cleric') expect(room.events.some(entry => entry.result?.healing === 1)).toBe(true);
    expect(result.expedition!.battleProgress).toBeGreaterThanOrEqual(3);
  });
  it('retains downed Help and caps an ineffective battle at four exchanges with the prism recovered', () => {
    let room = combat('fighter');
    room.seats.find(seat => seat.actorId === 'alice')!.hp = 0;
    expect(() => act(room, { token: 'fight', targetId: 'encounter' })).toThrow('While downed');
    room = finishCombat(room, true);
    expect(room.expedition!.costs.join(' ')).toContain('hurried escape');
    expect(room.expedition!.questItems).toContain('recovered-prism');
    expect(room.events.filter(entry => entry.kind === 'action' && entry.result?.targetId === 'encounter')).toHaveLength(4);
  });
  it('requires an earlier warehouse discovery before battle and has a bounded fallback', () => {
    let room = travel('warehouse');
    room = next(act(room, { token: 'investigate', targetId: 'crate' }));
    expect(room.expedition!.questItems).toContain('buyer-evidence');
    expect(room.expedition!.battle).toBeUndefined();
    room = act(room, { token: 'assist', targetId: 'ramp' });
    expect(room.expedition!.battle?.status).toBe('queued');
    let fallback = travel('warehouse');
    for (let turn = 0; turn < 3; turn++) { fallback = act(fallback, { token: 'assist', targetId: 'ramp' }); if (turn < 2) fallback = next(fallback); }
    expect(fallback.expedition!.battle?.status).toBe('queued');
  });
  it('allows the prepared canal pattern to avoid combat, then returns through a separate action', () => {
    let room = travel('canal');
    room = next(act(room, { token: 'assist', targetId: 'ramp' }));
    expect(room.expedition!.questItems).toContain('mooring-line');
    room = next(act(room, { token: 'influence', targetId: 'watcher' }));
    expect(room.expedition!.questItems).toContain('quiet-passage');
    expect(room.expedition!.questItems).toContain('recovered-prism');
    expect(room.expedition!.battle).toBeUndefined();
    expect(room.chapter).toBe(1);
    expect(next(act(room, { token: 'assist', targetId: 'crate' })).chapter).toBe(2);
  });
  it('does not turn simultaneous canal preparation into an unearned same-turn quiet recovery', () => {
    let room = twoPlayers();
    room.chapter = 1; room.progress = 0; room.expedition!.locationId = 'canal'; room.expedition!.routeId = 'canal'; room.expedition!.explorationTurns = 0;
    room = act(room, { token: 'assist', targetId: 'ramp' });
    expect(() => act(room, { token: 'influence', targetId: 'watcher', expedition: { interactionId: 'canal:quiet-recovery' } }, 'bob')).toThrow('displayed intention');
    room = act(room, { token: 'influence', targetId: 'watcher' }, 'bob');
    expect(room.expedition!.questItems).toContain('mooring-line');
    expect(room.expedition!.questItems).not.toContain('quiet-passage');
    expect(room.expedition!.encounterResolved).not.toBe(true);
  });
  it('does not silently redirect the announced attack when its victim departs', () => {
    let room = command(combat(), 'join', 'bob', { character: hero('Bob', 'wizard') });
    room = next(act(room, { token: 'assist', targetId: 'encounter' }));
    const victim = room.enemyIntent!.targetActorId;
    const remaining = victim === 'alice' ? 'bob' : 'alice';
    room = act(room, { token: 'assist', targetId: 'encounter' }, remaining);
    room = command(room, 'leave', victim);
    const hit = room.events.filter(entry => entry.turn === room.turn && entry.result?.damage !== undefined);
    expect(hit).toHaveLength(1);
    expect(hit[0].result?.targetId).toBe(victim);
    expect(room.seats.some(seat => seat.actorId === victim)).toBe(false);
  });
  it('consumes battle supplies once, keeps strongest cover, and rewards a finished encounter once', () => {
    let room = combat('fighter');
    room.expedition!.stashes.alice = [{ id: 'smoke', kind: 'smoke' }, { id: 'binding', kind: 'binding' }];
    room = next(act(room, { token: 'assist', targetId: 'encounter', expedition: { consumableId: 'smoke' } }));
    const prior = room.events.filter(entry => entry.result?.damage !== undefined).slice(-1)[0];
    expect(prior.result?.protection).toBe(4);
    room.expedition!.battle!.progress = 4;
    const receipt: AdventureCommand = { id: 'winning-binding', type: 'act', userId: 'alice', expectedTurn: room.turn, action: { token: 'assist', targetId: 'encounter', expedition: { consumableId: 'binding' } } };
    room = reduceAdventure(room, receipt, room.updatedAt + 1);
    expect(room.expedition!.battle?.status).toBe('won');
    expect(room.expedition!.stashes.alice.some(item => item.id === 'binding')).toBe(false);
    expect(room.expedition!.rewarded.filter(id => id.includes('fight:'))).toHaveLength(1);
    expect(reduceAdventure(room, receipt, room.updatedAt + 1)).toBe(room);
  });
  it('resolves tied final votes together, preserves departed votes, and never reverses the result', () => {
    let room = twoPlayers();
    room.chapter = 2; room.progress = 0; room.expedition!.locationId = 'beacon'; room.expedition!.explorationTurns = 0; room.expedition!.questItems.push('recovered-prism');
    room = act(room, { token: 'assist', targetId: 'beacon' });
    room = command(room, 'leave');
    room = act(room, { token: 'influence', targetId: 'beacon' }, 'bob');
    expect(room.expedition!.finaleChoice).toBe('release');
    expect(room.expedition!.questItems).toContain('recovered-prism');
    room = next(room);
    room = act(room, { token: 'assist', targetId: 'beacon' }, 'bob');
    expect(room.expedition!.finaleChoice).toBe('release');
  });
  it.each(['restore', 'release'] as const)('completes the %s ending with its previewed permanent cost', choice => {
    let room = finishCombat(combat());
    room = next(act(room, { token: 'assist', targetId: 'crate' }));
    const token = choice === 'restore' ? 'assist' : 'influence';
    const intention = expeditionInteractions(room, 'beacon', 'beacon', token)[0];
    expect(intention.description.length).toBeGreaterThan(60);
    room = next(act(room, { token, targetId: 'beacon', expedition: { interactionId: intention.id } }));
    expect(room.expedition!.finaleChoice).toBe(choice);
    room = act(room, { token: 'assist', targetId: 'town' });
    expect(room.status).toBe('completed');
    expect(room.outcomes).toHaveLength(3);
    expect(room.players.alice.keepsakes).toHaveLength(3);
    expect(room.expedition!.costs.length).toBeGreaterThan(0);
    if (choice === 'restore') expect(room.expedition!.questItems).not.toContain('recovered-prism');
    else expect(room.outcomes[2].text).toContain('dark evenings');
  });
  it('supports signed-compatible bounded Spotlight without bypassing item gates', () => {
    const source = initial();
    const target = expeditionScene(source).targets[0];
    const room = act(source, { token: 'spotlight', targetId: target.id, proposal: { id: 'signed-test', turn: source.turn, targetId: target.id, effect: 'reveal', supported: true, source: 'authored', label: 'Study the reflected light', idea: 'Use a mirror to follow the reflected light.', description: 'Reveal a useful direction with reflected light.' } });
    expect(room.players.alice.spotlightChapters).toEqual([0]);
    expect(room.expedition!.questItems).not.toContain('ledger-copy');
    expect(room.progress).toBeGreaterThan(0);
  });
});
