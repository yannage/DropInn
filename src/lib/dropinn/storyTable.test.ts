import { describe, expect, it } from 'vitest';
import { createCharacterProfile } from '../character';
import { createAdventure, reduceAdventure } from './engine';
import { getStoryTableState, storyTableConsumable, storyTableHas } from './storyTable';
import { journeyActionPreview, journeyInteractions, journeyScene } from './journey';
import { expeditionHash } from './expedition';
import type { AdventureCommand, AdventureRoom, PlayerAction } from './types';

let sequence = 0;
const hero = (name: string) => ({ ...createCharacterProfile(name, 'fighter'), id: name });
const initial = () => createAdventure(hero('Alice'), 'alice', 1000, 'STORY3', 'gemward');
const cmd = (room: AdventureRoom, type: AdventureCommand['type'], extra: Partial<AdventureCommand> = {}, userId = 'alice', now = room.updatedAt + 1) => reduceAdventure(room, { id: `story-table-${++sequence}`, type, userId, ...extra }, now);
const act = (room: AdventureRoom, action: PlayerAction, userId = 'alice') => cmd(room, 'act', { expectedTurn: room.turn, action }, userId);
const next = (room: AdventureRoom) => room.status === 'completed' ? room : cmd(room, 'tick', {}, 'alice', room.revealUntil!);
const turn = (room: AdventureRoom, action: PlayerAction) => next(act(room, action));
const pricing: PlayerAction = { token: 'influence', targetId: 'iris', expedition: { interactionId: 'iris:pricing' } };
const news: PlayerAction = { token: 'influence', targetId: 'iris', expedition: { interactionId: 'iris:news' } };
const oren: PlayerAction = { token: 'assist', targetId: 'oren', expedition: { locationId: 'tavern' } };
const quiet: PlayerAction = { token: 'fight', targetId: 'display-case' };
const plan = (room: AdventureRoom) => getStoryTableState(room).plan.action;
const vote = (room: AdventureRoom, edge: string) => cmd(room, 'vote-travel', { expectedTurn: room.turn, travel: { decisionId: room.expedition!.travel!.id, edgeId: edge } });
function middle(route = 'canal', actions: PlayerAction[] = []) {
  let room = initial();
  room = turn(room, { token: 'assist', targetId: 'bram', expedition: { locationId: 'docks' } });
  for (const action of actions) room = turn(room, action);
  room = turn(room, plan(room));
  return vote(room, `town-${route}`);
}
function finale(node = 'beacon') {
  let room = middle();
  room = turn(room, { token: 'assist', targetId: 'ramp' });
  room = turn(room, { token: 'influence', targetId: 'watcher' });
  return vote(room, `canal-${node}`);
}
function pair() {
  let room = cmd(initial(), 'join', { character: hero('Bob') }, 'bob');
  return turn(room, pricing);
}
const latestAction = (room: AdventureRoom) => room.events.filter(event => event.kind === 'action' && event.actorId === 'alice').at(-1)!;

describe('Gemward v3 authored situation pacing', () => {
  it('creates a separate pinned situation while older saved versions retain their original state', () => {
    expect(initial().adventureVersion).toBe(3);
    expect(initial().expedition!.storyTable!.facts).toEqual([]);
    for (const version of [1, 2]) expect(createAdventure(hero('Alice'), 'alice', 1000, 'OLD123', 'gemward', version).expedition!.storyTable).toBeUndefined();
    const corrupt = initial(); delete corrupt.expedition!.storyTable;
    expect(() => cmd(corrupt, 'tick')).toThrow('saved situation');
  });
  it('makes prices and news distinct, records causal sources, and does not pretend repeats advance anything', () => {
    const prices = turn(initial(), pricing); const witness = turn(initial(), news);
    expect(storyTableHas(prices, 'ledger-copy')).toBe(true); expect(storyTableHas(prices, 'watcher-tell')).toBe(false);
    expect(storyTableHas(witness, 'road-lead')).toBe(true); expect(storyTableHas(witness, 'watcher-tell')).toBe(true);
    expect(witness.expedition!.questItems).not.toContain('ledger-copy');
    expect(prices.expedition!.storyTable!.facts[0].sourceEventIds).toEqual([latestAction(prices).id]);
    const repeated = turn(prices, pricing);
    expect(repeated.progress).toBe(0); expect(latestAction(repeated).result!.changed).toBe(false);
    expect(latestAction(repeated).result!.expedition!.storyTable!.repeated).toBe(true);
    expect(repeated.expedition!.storyTable!.facts).toEqual(prices.expedition!.storyTable!.facts);
    expect(repeated.events.filter(event => event.journey?.questChanges?.some(change => change.itemId === 'ledger-copy'))).toHaveLength(1);
  });
  it('keeps generic support truthful and does not mark its target as a new discovery', () => {
    const room = turn(initial(), quiet);
    expect(latestAction(room).result!.changed).toBe(false);
    expect(latestAction(room).text).toContain('No new preparation');
    expect(journeyScene(room).targets.find(target => target.id === 'display-case')!.changed).toBe(false);
  });
  it('requires an earlier lead and settles everyone’s accepted preparation before gathering, regardless of order', () => {
    const empty = initial(); expect(getStoryTableState(empty).plan.available).toBe(false);
    expect(() => act(empty, plan(empty))).toThrow('displayed intention');
    const revealed = act(empty, news); expect(getStoryTableState(revealed).plan.available).toBe(false);
    const room = pair(); const gather = plan(room);
    const half = act(room, gather); expect(half.phase).toBe('choosing'); expect(half.outcomes).toHaveLength(0);
    const forward = act(half, oren, 'bob'); const reverse = act(act(room, oren, 'bob'), gather);
    expect(forward.expedition).toEqual(reverse.expedition);
    expect(storyTableHas(forward, 'packed-lantern')).toBe(true); expect(forward.outcomes).toHaveLength(1);
    expect(next(forward).phase).toBe('travel');
  });
  it('allows each person’s first gift when a shared preparation is already known, then no repeat gifts', () => {
    let room = pair(); room = next(act(act(room, oren), quiet, 'bob'));
    room = next(act(act(room, quiet), oren, 'bob'));
    const bob = room.events.filter(event => event.kind === 'action' && event.actorId === 'bob').at(-1)!;
    expect(bob.result!.changed).toBe(true); expect(bob.result!.expedition!.storyTable!.repeated).toBe(true);
    expect(room.expedition!.stashes.bob).toHaveLength(1);
    room = next(act(act(room, quiet), oren, 'bob'));
    expect(room.events.filter(event => event.kind === 'action' && event.actorId === 'bob').at(-1)!.result!.changed).toBe(false);
  });
  it('bounds active opportunities without counting an unanswered turn as preparation', () => {
    let room = initial(); room = next(cmd(room, 'tick', {}, 'alice', room.deadline));
    expect(room.expedition!.storyTable!.activeRounds).toBe(0);
    for (let count = 0; count < 6; count++) room = turn(room, quiet);
    expect(room.phase).toBe('travel'); expect(room.expedition!.storyTable!.completion).toBe('fallback');
    expect(room.expedition!.storyTable!.facts).toEqual([]);
    expect(room.events.some(event => event.result?.expedition?.storyTable?.completion === 'fallback')).toBe(true);
  });
  it('spends Dust once for a real extra opportunity and rejects redundant or route use', () => {
    let room = turn(initial(), { token: 'assist', targetId: 'nella' });
    const dust = room.expedition!.stashes.alice[0];
    const payload: AdventureCommand = { id: 'dust-retry', userId: 'alice', type: 'act', expectedTurn: room.turn, action: { ...quiet, expedition: { consumableId: dust.id } } };
    room = reduceAdventure(room, payload, room.updatedAt + 1);
    expect(reduceAdventure(room, payload, room.updatedAt + 2)).toBe(room);
    expect(room.expedition!.storyTable!.extraOpportunity).toBe(true);
    room = next(room); expect(getStoryTableState(room).activeRoundCap).toBe(7);
    room.expedition!.stashes.alice.push({ id: 'second-dust', kind: 'dust' });
    expect(() => act(room, { ...quiet, expedition: { consumableId: 'second-dust' } })).toThrow('already');
    while (room.expedition!.storyTable!.activeRounds < 6) room = turn(room, quiet);
    expect(room.phase).toBe('choosing'); room = turn(room, quiet); expect(room.phase).toBe('travel');
    const route = middle(); route.expedition!.stashes.alice.push({ id: 'route-dust', kind: 'dust' });
    expect(storyTableConsumable(route, 'dust').usable).toBe(false);
    expect(() => act(route, { token: 'assist', targetId: 'ramp', expedition: { consumableId: 'route-dust' } })).toThrow('preparation time');
  });
  it('lets a consumed Favour provide an earlier-turn departure lead', () => {
    let room = initial(); room.expedition!.stashes.alice = [{ id: 'favour-fixture', kind: 'favour' }];
    room = turn(room, { ...quiet, expedition: { consumableId: 'favour-fixture', favourChoice: 'canal-key' } });
    expect(storyTableHas(room, 'canal-key')).toBe(true); expect(getStoryTableState(room).plan.available).toBe(true);
    room = turn(room, plan(room)); expect(room.expedition!.travel!.options.some(option => option.edgeId === 'town-canal')).toBe(true);
  });
  it('keeps the warehouse discovery behind the release while giving its confirmed result a specific truth', () => {
    let room = middle('warehouse', [pricing]); const action: PlayerAction = { token: 'investigate', targetId: 'crate' };
    const preview = journeyActionPreview(room, 'alice', action).description;
    expect(preview).toContain('learn who moved'); expect(preview).not.toContain('Nella'); expect(preview).not.toContain('smuggler');
    room = turn(room, action);
    expect(latestAction(room).result!.expedition!.storyTable!.after).toContain(room.expedition!.variant === 'ward' ? 'Nella' : 'smuggler');
    expect(latestAction(room).result!.changed).toBe(true);
  });
  it('rejects a second same-round Dust attachment without consuming it', () => {
    let room = pair(); room.expedition!.stashes.alice = [{ id: 'alice-dust', kind: 'dust' }]; room.expedition!.stashes.bob = [{ id: 'bob-dust', kind: 'dust' }];
    room = act(room, { ...quiet, expedition: { consumableId: 'alice-dust' } });
    expect(() => act(room, { ...quiet, expedition: { consumableId: 'bob-dust' } }, 'bob')).toThrow('already attached');
    room = act(room, quiet, 'bob'); expect(room.expedition!.stashes.bob.map(item => item.id)).toContain('bob-dust'); expect(getStoryTableState(room).activeRoundCap).toBe(7);
  });
  it.each(['gather', 'finish'])('rejects Dust on %s without changing the accepted snapshot or consuming an item', kind => {
    let room = kind === 'gather' ? turn(initial(), pricing) : finale();
    if (kind === 'finish') {
      room = turn(room, { token: 'assist', targetId: 'cradle' });
      room = turn(room, { token: 'assist', targetId: 'town' });
    }
    room.expedition!.stashes.alice = [{ id: 'unused-dust', kind: 'dust' }];
    const action = { ...plan(room), expedition: { ...plan(room).expedition, consumableId: 'unused-dust' } };
    expect(storyTableConsumable(room, 'dust', action).usable).toBe(false);
    const before = structuredClone(room);
    expect(() => act(room, action)).toThrow('cannot extend an area');
    expect(room).toEqual(before);
    expect(room.expedition!.stashes.alice[0].id).toBe('unused-dust');
  });
  it.each(['beacon', 'lantern-square'])('requires light and people before explicit %s completion, then records optional repairs and cost exactly once', node => {
    let room = finale(node); const prism = room.expedition!.questItems.includes('recovered-prism'); expect(prism).toBe(true);
    expect(() => act(room, plan(room))).toThrow('displayed intention');
    room = turn(room, { token: 'assist', targetId: node === 'beacon' ? 'cradle' : 'lanterns' });
    expect(getStoryTableState(room).plan.available).toBe(false);
    room = turn(room, { token: 'assist', targetId: node === 'beacon' ? 'town' : 'neighbours' });
    expect(getStoryTableState(room).plan.available).toBe(true); expect(room.expedition!.ending).toBeUndefined();
    room = turn(room, { token: 'assist', targetId: 'keeper' });
    const payload: AdventureCommand = { id: `finish-${node}`, userId: 'alice', type: 'act', expectedTurn: room.turn, action: plan(room) };
    room = reduceAdventure(room, payload, room.updatedAt + 1);
    expect(room.status).toBe('completed'); expect(room.outcomes).toHaveLength(3); expect(room.players.alice.keepsakes).toHaveLength(3);
    expect(room.expedition!.ending).toContain('dawn'); expect(room.expedition!.ending).toContain('ferry');
    expect(room.expedition!.questItems.includes('recovered-prism')).toBe(node !== 'beacon');
    expect(reduceAdventure(JSON.parse(JSON.stringify(room)), payload, room.updatedAt + 2)).toEqual(room);
    expect(room.events.filter(event => event.journey?.questChanges?.some(change => change.itemId === 'recovered-prism' && change.kind === 'spent'))).toHaveLength(node === 'beacon' ? 1 : 0);
  });
  it('finishes an unprepared finale at the announced cap with specific missing-work consequences', () => {
    let room = finale('lantern-square');
    for (let count = 0; count < 4; count++) room = turn(room, { token: 'influence', targetId: 'keeper' });
    expect(room.status).toBe('completed'); expect(room.expedition!.storyTable!.completion).toBe('fallback');
    expect(storyTableHas(room, 'light-ready')).toBe(false); expect(storyTableHas(room, 'people-ready')).toBe(false);
    expect(room.expedition!.ending).toContain('morning'); expect(room.expedition!.ending).toContain('hurried');
  });
  it('cannot Finish using a same-round preparation and includes another accepted repair in the final outcome', () => {
    let room = cmd(finale(), 'join', { character: hero('Bob') }, 'bob');
    room = turn(room, { token: 'assist', targetId: 'cradle' });
    room = act(room, { token: 'assist', targetId: 'town' });
    expect(() => act(room, plan(room), 'bob')).toThrow('displayed intention');
    room = next(act(room, { token: 'influence', targetId: 'keeper' }, 'bob'));
    room = act(room, plan(room));
    expect(room.expedition!.ending).toBeUndefined(); expect(room.expedition!.questItems).toContain('recovered-prism');
    room = act(room, { token: 'assist', targetId: 'keeper' }, 'bob');
    expect(room.status).toBe('completed'); expect(storyTableHas(room, 'repair-plan')).toBe(true);
    expect(room.expedition!.ending).toContain('dawn');
    expect(room.expedition!.storyTable!.facts.find(fact => fact.id === 'repair-plan')!.sourceEventIds).toHaveLength(1);
  });
  it.each([true, false])('maps bounded Spotlight to its authored fact only when successful (%s)', succeeds => {
    const room = initial(); const modifier = room.seats.find(seat => seat.actorId === 'alice')!.character.traits.ATH;
    room.expedition!.seed = Array.from({ length: 100 }, (_, index) => `spotlight-seed-${index}`).find(seed => (1 + expeditionHash(`${seed}:${room.turn}:alice:spotlight`) % 20 + modifier >= 10) === succeeds)!;
    const resolved = act(room, { token: 'spotlight', targetId: 'iris', proposal: { id: 'bounded-story', turn: room.turn, targetId: 'iris', effect: 'reveal', supported: true, source: 'authored', label: 'Compare the reflected marks', idea: 'Reflect the delivery marks in a small mirror.', description: 'Reveal a useful delivery lead.' } });
    expect(latestAction(resolved).success).toBe(succeeds); expect(storyTableHas(resolved, 'ledger-copy')).toBe(succeeds);
    expect(resolved.progress).toBe(0); expect(latestAction(resolved).result!.changed).toBe(succeeds);
    expect(resolved.players.alice.spotlightChapters).toEqual([0]);
  });
  it('keeps packed protection unused after the peaceful canal recovery', () => {
    let room = middle('canal', [oren]);
    room = turn(room, { token: 'assist', targetId: 'ramp' });
    room = turn(room, { token: 'influence', targetId: 'watcher' });
    expect(room.phase).toBe('travel'); expect(room.expedition!.storyTable!.lanternSpent).toBe(false);
    expect(room.events.some(event => event.result?.expedition?.storyTable?.lanternSpent)).toBe(false);
  });
  it('makes the exposed road hurt, grants the watcher opening, and spends lantern protection only on penetrating damage', () => {
    let room = middle('road', [news, oren]);
    room = turn(room, { token: 'investigate', targetId: 'crate' });
    expect(room.enemyIntent!.baseDamage).toBe(4); expect(room.expedition!.battle!.progress).toBe(1);
    const blocked = act(room, { token: 'assist', targetId: 'encounter' });
    expect(blocked.expedition!.storyTable!.lanternSpent).toBe(false);
    room = next(blocked);
    const beforeHP = room.seats.find(seat => seat.actorId === 'alice')!.hp;
    room = act(room, { token: room.expedition!.battle!.stance === 'trick' ? 'influence' : 'fight', targetId: 'encounter' });
    expect(room.expedition!.storyTable!.lanternSpent).toBe(true);
    expect(room.seats.find(seat => seat.actorId === 'alice')!.hp).toBe(beforeHP - 2); // 4 road damage - companion cover - lantern.
    expect(room.events.filter(event => event.result?.expedition?.storyTable?.lanternSpent)).toHaveLength(1);
  });
  it('retains prepared facts, sources and stash across JSON reload and park/rejoin', () => {
    let room = turn(initial(), oren); room = cmd(room, 'leave'); expect(room.status).toBe('parked');
    const facts = structuredClone(room.expedition!.storyTable!.facts); const stash = structuredClone(room.expedition!.stashes.alice);
    room = cmd(JSON.parse(JSON.stringify(room)), 'join', { character: hero('Alice') });
    expect(room.status).toBe('active'); expect(room.expedition!.storyTable!.facts).toEqual(facts); expect(room.expedition!.stashes.alice).toEqual(stash);
    expect(journeyInteractions(room, 'tavern', 'oren', 'assist')[0].description).toContain('already');
  });
});
