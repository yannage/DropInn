import { describe, expect, it } from 'vitest';
import { createCharacterProfile } from '../character';
import { createAdventure, reduceAdventure } from './engine';
import { createJourney, isJourney, journeyHighlights, journeyInteractions, journeyMap, journeyPouch, journeyScene, journeyTravelOptions } from './journey';
import type { AdventureCommand, AdventureRoom, PlayerAction } from './types';

let sequence = 0;
const hero = (name: string) => ({ ...createCharacterProfile(name, 'fighter'), id: name });
const initial = () => createAdventure(hero('Alice'), 'alice', 1000, 'JRN123', 'gemward', 2);
const cmd = (room: AdventureRoom, type: AdventureCommand['type'], userId = 'alice', extra: Partial<AdventureCommand> = {}, now = room.updatedAt + 1) => reduceAdventure(room, { id: `journey-test-${++sequence}`, type, userId, ...extra }, now);
const act = (room: AdventureRoom, action: PlayerAction = { token: 'assist', targetId: 'iris' }, userId = 'alice') => cmd(room, 'act', userId, { expectedTurn: room.turn, action });
const next = (room: AdventureRoom) => cmd(room, 'tick', 'alice', {}, room.revealUntil!);
function round(room: AdventureRoom, action: PlayerAction = { token: 'assist', targetId: 'iris' }) {
  for (const seat of room.seats.filter(seat => seat.kind === 'human' && !seat.leaving)) room = act(room, action, seat.actorId);
  return room.status === 'completed' ? room : next(room);
}
function town(room = initial()) {
  for (const action of [
    { token: 'investigate', targetId: 'iris' },
    { token: 'assist', targetId: 'bram', expedition: { locationId: 'docks' } },
    { token: 'assist', targetId: 'nella' },
    { token: 'assist', targetId: 'oren', expedition: { locationId: 'tavern' } },
  ] as PlayerAction[]) room = round(room, action);
  expect(room.phase).toBe('travel'); return room;
}
function vote(room: AdventureRoom, edgeId: string, userId = 'alice') { return cmd(room, 'vote-travel', userId, { expectedTurn: room.turn, travel: { decisionId: room.expedition!.travel!.id, edgeId } }); }
function allVote(room: AdventureRoom, edgeId: string) {
  for (const id of room.expedition!.travel!.eligibleActorIds) room = vote(room, edgeId, id);
  return room;
}
function recover(room: AdventureRoom) {
  if (room.expedition!.routeId === 'canal') {
    room = round(room, { token: 'assist', targetId: 'ramp' });
    return round(room, { token: 'influence', targetId: 'watcher' });
  }
  room = round(room, { token: 'investigate', targetId: 'crate' });
  if (!room.expedition!.battle) room = round(room, { token: 'assist', targetId: 'ramp' });
  while (room.expedition!.battle?.status === 'active') room = round(room, { targetId: 'encounter', token: ({ strike: 'investigate', trick: 'fight', guard: 'influence' } as const)[room.expedition!.battle!.stance] });
  return room;
}
function pair() {
  const room = cmd(initial(), 'join', 'bob', { character: hero('Bob') });
  return next(act(room, { token: 'assist', targetId: 'nella' }));
}
function pairTravel() {
  let room = pair();
  while (room.phase !== 'travel') room = round(room, { token: 'investigate', targetId: 'iris' });
  return room;
}

describe('Gemward v2 journey boundaries and provenance', () => {
  it('pins the new graph separately and keeps v1 choosing/reveal rules addressable', () => {
    expect(isJourney(initial())).toBe(true);
    const old = createAdventure(hero('Alice'), 'alice', 1000, 'OLD123', 'gemward', 1);
    const moved = next(act(old, { token: 'assist', targetId: 'iris', expedition: { routeId: 'road' } }));
    expect(moved.chapter).toBe(1); expect(moved.phase).toBe('choosing'); expect(moved.expedition!.currentNodeId).toBeUndefined();
    expect(() => vote(old, 'town-road')).toThrow();
    const corrupt = initial(); delete corrupt.expedition;
    expect(journeyScene(corrupt).targets).toHaveLength(4);
    expect(() => cmd(corrupt, 'tick')).toThrow('saved run state');
  });
  it('settles the chapter before freezing a separate 30-second decision with no action votes', () => {
    let room = initial();
    expect(() => act(room, { token: 'assist', targetId: 'iris', expedition: { routeId: 'road' } })).toThrow('map');
    room = town(room);
    expect(room.chapter).toBe(0); expect(room.expedition!.currentNodeId).toBe('town');
    expect(room.outcomes).toHaveLength(1); expect(room.deadline - room.updatedAt).toBe(30_000);
    expect(room.outcomes[0].text).not.toContain('leaves Gemward');
    expect(room.expedition!.travel!.options).toHaveLength(3);
    expect(() => act(room)).toThrow('turn has ended');
    expect(() => cmd(room, 'skip-reveal', 'alice', { expectedTurn: room.turn })).toThrow('no turn reveal');
    const before = room.players.alice;
    room = vote(room, 'town-canal');
    expect(room.phase).toBe('choosing'); expect(room.chapter).toBe(1); expect(room.expedition!.currentNodeId).toBe('canal');
    expect(room.players.alice.xp).toBe(before.xp); expect(room.players.alice.actions).toBe(before.actions);
    expect(room.events.at(-2)?.journey?.transition?.unlockEventIds).toHaveLength(1);
  });
  it('records co-discoverers once, retains their names after departure and derives shared unlock provenance', () => {
    let room = pair();
    room = act(room, { token: 'investigate', targetId: 'iris' });
    expect(journeyPouch(room).some(item => item.id === 'ledger-copy')).toBe(false);
    room = act(room, { token: 'investigate', targetId: 'tess', expedition: { locationId: 'tavern' } }, 'bob');
    const ledger = journeyPouch(room).find(item => item.id === 'ledger-copy')!;
    expect(ledger.sources.map(source => source.actorName)).toEqual(['Alice', 'Bob']);
    expect(ledger.sources.map(source => source.locationId)).toEqual(['shop', 'tavern']);
    expect(ledger.unlocks).toEqual(['town-warehouse']);
    room = cmd(room, 'leave', 'bob');
    room = next(room); room = round(room, { token: 'investigate', targetId: 'iris' });
    expect(room.events.filter(event => event.journey?.questChanges?.some(change => change.itemId === 'ledger-copy' && change.kind === 'gained'))).toHaveLength(1);
    expect(journeyPouch(room).find(item => item.id === 'ledger-copy')!.sources).toEqual(ledger.sources);
  });
  it('keeps travel votes immutable, rejects stale/locked/forged choices and retries once', () => {
    const room = pairTravel();
    const payload: AdventureCommand = { id: 'journey-exact-vote', type: 'vote-travel', userId: 'alice', expectedTurn: room.turn, travel: { decisionId: room.expedition!.travel!.id, edgeId: 'town-warehouse' } };
    const accepted = reduceAdventure(room, payload, room.updatedAt + 1);
    expect(accepted.phase).toBe('travel'); expect(reduceAdventure(accepted, payload, room.updatedAt + 2)).toBe(accepted);
    expect(() => vote(accepted, 'town-road')).toThrow('already committed');
    expect(() => vote(room, 'town-canal')).toThrow('not available');
    expect(() => cmd(room, 'vote-travel', 'intruder', { expectedTurn: room.turn, travel: payload.travel })).toThrow('seat opens');
    expect(() => cmd(room, 'vote-travel', 'alice', { expectedTurn: room.turn - 1, travel: payload.travel })).toThrow('turn has ended');
    expect(() => cmd(room, 'vote-travel', 'alice', { expectedTurn: room.turn, travel: { ...payload.travel!, decisionId: 'forged' } })).toThrow('this travel decision');
    const ended = vote(accepted, 'town-warehouse', 'bob');
    expect(reduceAdventure(ended, payload, ended.updatedAt + 1)).toBe(ended);
  });
  it('resolves reversed order identically and ties use the open road', () => {
    const room = pairTravel();
    const forward = vote(vote(room, 'town-warehouse'), 'town-road', 'bob');
    const reversed = vote(vote(room, 'town-road', 'bob'), 'town-warehouse');
    expect(forward.expedition).toEqual(reversed.expedition);
    expect(forward.expedition!.currentNodeId).toBe('road');
    expect(forward.events.find(event => event.journey?.transition)?.journey).toEqual(reversed.events.find(event => event.journey?.transition)?.journey);
  });
  it('uses deadline fallback without missed-turn penalties, actions or rewards', () => {
    const room = pairTravel();
    const timed = cmd(room, 'tick', 'alice', {}, room.deadline);
    expect(timed.expedition!.currentNodeId).toBe('road');
    for (const id of ['alice', 'bob']) { expect(timed.players[id]).toEqual(room.players[id]); expect(timed.seats.find(seat => seat.actorId === id)!.missedTurns).toBe(0); }
  });
  it('retains accepted departing votes, removes unvoted blockers and admits late arrivals only at destination', () => {
    let room = pairTravel();
    room = cmd(room, 'join', 'cara', { character: hero('Cara') });
    expect(room.pendingJoins).toContain('cara');
    expect(() => vote(room, 'town-road', 'cara')).toThrow('seat opens');
    room = vote(room, 'town-warehouse');
    room = cmd(room, 'leave', 'alice');
    expect(room.phase).toBe('travel'); expect(room.expedition!.travel!.votes.alice.actorName).toBe('Alice');
    room = cmd(room, 'leave', 'bob');
    expect(room.expedition!.currentNodeId).toBe('warehouse'); expect(room.players.cara.seatId).toBeTruthy(); expect(room.status).toBe('active');
    expect(room.events.find(event => event.journey?.transition)?.journey?.transition?.votes.alice.actorName).toBe('Alice');
  });
  it('parks unanswered decisions and resumes their frozen choices with a fresh window', () => {
    let room = town(); const options = room.expedition!.travel!.options;
    room = cmd(room, 'leave'); expect(room.status).toBe('parked'); expect(room.phase).toBe('travel');
    expect(cmd(room, 'tick', 'alice', {}, room.deadline + 50_000)).toBe(room);
    room = cmd(room, 'join', 'bob', { character: hero('Bob') }, room.deadline + 100_000);
    expect(room.status).toBe('active'); expect(room.expedition!.travel!.options).toEqual(options);
    expect(room.deadline - room.updatedAt).toBe(30_000);
    room = vote(room, 'town-canal', 'bob'); expect(room.expedition!.currentNodeId).toBe('canal');
  });
  it('parks the chosen destination after the final committed voter departs', () => {
    let room = pairTravel(); room = vote(room, 'town-warehouse'); room = cmd(room, 'leave'); room = cmd(room, 'leave', 'bob');
    expect(room.status).toBe('parked'); expect(room.phase).toBe('choosing'); expect(room.expedition!.currentNodeId).toBe('warehouse');
  });
  it('lets waiting visitors resume an unanswered crossroads when the last eligible voter leaves', () => {
    let room = town(); const options = room.expedition!.travel!.options;
    room = cmd(room, 'join', 'bob', { character: hero('Bob') });
    room = cmd(room, 'leave');
    expect(room.status).toBe('active'); expect(room.phase).toBe('travel');
    expect(room.players.bob.seatId).toBeTruthy(); expect(room.pendingJoins).toEqual([]);
    expect(room.expedition!.travel!.options).toEqual(options); expect(room.deadline - room.updatedAt).toBe(30_000);
    room = vote(room, 'town-canal', 'bob'); expect(room.expedition!.currentNodeId).toBe('canal');
  });
  it('makes an earned dust consumable accelerate town progress without skipping the minimum or spending twice', () => {
    let room = round(initial(), { token: 'assist', targetId: 'nella' });
    const dust = room.expedition!.stashes.alice.find(item => item.kind === 'dust')!;
    const payload: AdventureCommand = { id: 'journey-dust-exact', type: 'act', userId: 'alice', expectedTurn: room.turn, action: { token: 'investigate', targetId: 'iris', expedition: { consumableId: dust.id } } };
    room = reduceAdventure(room, payload, room.updatedAt + 1);
    expect(room.progress).toBe(3); expect(room.outcomes).toHaveLength(0);
    expect(reduceAdventure(room, payload, room.updatedAt + 1)).toBe(room);
    expect(room.expedition!.stashes.alice.some(item => item.id === dust.id)).toBe(false);
    room = next(room); room = round(room);
    expect(room.phase).toBe('travel'); expect(room.expedition!.explorationTurns).toBe(3);
  });
  it('shows distant mystery, nearby locks and exactly the confirmed route after travel', () => {
    const start = journeyMap(initial());
    expect(start.nodes.filter(node => node.state === 'mystery')).toHaveLength(2);
    expect(start.nodes.find(node => node.id === 'warehouse')!.state).toBe('locked');
    const room = vote(town(), 'town-canal'); const map = journeyMap(room);
    expect(map.edges.filter(edge => edge.state === 'taken').map(edge => edge.id)).toEqual(['town-canal']);
    expect(map.nodes.find(node => node.id === 'warehouse')!.state).toBe('locked');
    expect(map.nodes.filter(node => node.state === 'mystery')).toHaveLength(0);
  });
  it('projects the taken chapter path and co-discoverers without rewriting the original chapter history', () => {
    let room = pair();
    room = act(room, { token: 'investigate', targetId: 'iris' });
    room = next(act(room, { token: 'investigate', targetId: 'tess', expedition: { locationId: 'tavern' } }, 'bob'));
    room = cmd(room, 'leave', 'bob');
    while (room.phase !== 'travel') room = round(room);
    expect(journeyHighlights(room)[0].text).toContain('Choose the next route');
    const originalOutcome = structuredClone(room.outcomes[0]);
    room = vote(room, 'town-warehouse');
    const originalEvents = structuredClone(room.events);
    const highlight = journeyHighlights(room)[0];
    expect(highlight.text).toContain('Old warehouse');
    expect(highlight.text).toContain('Alice and Bob discovered Marked delivery ledger');
    expect(highlight.text).not.toContain('Choose the next route');
    expect(highlight.eventIds).toContain(room.events.find(event => event.journey?.transition)!.id);
    expect(room.events).toEqual(originalEvents); expect(room.outcomes[0]).toEqual(originalOutcome);
  });
  it('describes a recorded road fallback without inventing a clue or discoverer', () => {
    let room = initial(); while (room.phase !== 'travel') room = round(room);
    room = cmd(room, 'tick', 'alice', {}, room.deadline);
    const highlight = journeyHighlights(room)[0];
    expect(highlight.text).toContain('Open hill road'); expect(highlight.text).toContain('no quest item');
    expect(highlight.text).toContain('announced fallback'); expect(highlight.text).not.toContain('discovered');
  });
  it('keeps the canal’s two-stage dependency frozen through each simultaneous round', () => {
    let room = allVote(town(cmd(initial(), 'join', 'bob', { character: hero('Bob') })), 'town-canal');
    room = act(room, { token: 'assist', targetId: 'ramp' });
    expect(journeyInteractions(room, 'canal', 'watcher', 'influence')[0].id).not.toBe('canal:quiet-recovery');
    room = act(room, { token: 'influence', targetId: 'watcher' }, 'bob');
    expect(room.expedition!.encounterResolved).toBeUndefined();
    room = next(room); room = round(room, { token: 'influence', targetId: 'watcher' });
    expect(room.phase).toBe('travel'); expect(room.outcomes).toHaveLength(2); expect(room.expedition!.battle).toBeUndefined();
    expect(room.events.some(event => event.journey?.encounter === 'bypassed')).toBe(true);
  });
  it('waits for all exploration actions before the separate battle and closes recovery directly', () => {
    let room = allVote(pairTravel(), 'town-road');
    room = act(room, { token: 'assist', targetId: 'ramp' }); expect(room.expedition!.battle).toBeUndefined();
    room = act(room, { token: 'investigate', targetId: 'crate' }, 'bob');
    expect(room.expedition!.battle!.status).toBe('queued'); expect(room.phase).toBe('reveal');
    room = next(room); expect(room.expedition!.battle!.status).toBe('active');
    let rounds = 0;
    while (room.expedition!.battle?.status === 'active') { room = round(room, { token: 'fight', targetId: 'encounter' }); rounds++; }
    expect(rounds).toBeGreaterThanOrEqual(2); expect(rounds).toBeLessThanOrEqual(4);
    expect(room.phase).toBe('travel'); expect(room.chapter).toBe(1); expect(room.outcomes).toHaveLength(2);
  });
  it.each((['warehouse', 'canal', 'road'] as const).flatMap(route => (['smugglers', 'ward'] as const).flatMap(variant => (['beacon', 'lantern-square'] as const).map(finale => ({ route, variant, finale })))))('completes $route / $variant / $finale with one cost and three chapter rewards', ({ route, variant, finale }) => {
    let room = initial(); room.expedition = createJourney(Array.from({ length: 20 }, (_, n) => `${n}`).find(seed => createJourney(seed).variant === variant)!);
    room = recover(vote(town(room), `town-${route}`));
    expect(room.phase).toBe('travel'); expect(room.chapter).toBe(1);
    expect(journeyPouch(room).find(item => item.id === 'recovered-prism')!.unlocks).toEqual([`${route}-beacon`, `${route}-lantern-square`]);
    expect(journeyTravelOptions(room).map(option => option.cost).join(' ')).toContain(variant === 'smugglers' ? 'evidence' : 'bound');
    room = vote(room, `${route}-${finale}`);
    expect(room.expedition!.questItems).toContain('recovered-prism'); expect(room.expedition!.ending).toBeUndefined();
    expect(journeyPouch(room).find(item => item.id === 'recovered-prism')!.description).toContain('remains in the shared pouch');
    const recoveryHighlight = journeyHighlights(room)[1];
    expect(recoveryHighlight.text).toContain(finale === 'beacon' ? 'restoration at Beacon tower' : 'release at Lantern square');
    expect(recoveryHighlight.text).toContain('Alice recovered The missing prism');
    expect(recoveryHighlight.text).not.toContain('Choose the final destination');
    if (route === 'canal') expect(recoveryHighlight.text).toContain('quiet recovery avoided battle');
    const target = finale === 'beacon' ? 'cradle' : 'lanterns';
    room = round(room, { token: 'assist', targetId: target });
    expect(room.expedition!.questItems).toContain('recovered-prism'); expect(room.status).toBe('active');
    for (let i = 0; i < 3 && room.status !== 'completed'; i++) room = round(room, { token: 'assist', targetId: target });
    expect(room.status).toBe('completed'); expect(room.outcomes).toHaveLength(3); expect(room.players.alice.keepsakes).toHaveLength(3);
    expect(room.expedition!.questItems.includes('recovered-prism')).toBe(finale !== 'beacon');
    expect(journeyPouch(room).find(item => item.id === 'recovered-prism')!.status).toBe(finale === 'beacon' ? 'spent' : 'held');
    const prism = journeyPouch(room).find(item => item.id === 'recovered-prism')!;
    expect(prism.description).not.toContain('Decide'); expect(prism.description).not.toContain('At completion');
    expect(prism.description).toContain(finale === 'beacon' ? variant === 'smugglers' ? 'consumed' : 'absorbed' : variant === 'smugglers' ? 'released' : 'freed');
    expect(prism.unlocks).toEqual([`${route}-beacon`, `${route}-lantern-square`]);
    expect(room.events.filter(event => event.journey?.questChanges?.some(change => change.kind === 'spent'))).toHaveLength(finale === 'beacon' ? 1 : 0);
    expect(journeyMap(room).edges.filter(edge => edge.state === 'taken').map(edge => edge.id)).toEqual([`town-${route}`, `${route}-${finale}`]);
  });
});
