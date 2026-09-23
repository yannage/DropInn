import { describe, expect, it } from 'vitest';
import { createCharacterProfile } from '../character';
import type { CharacterClassKey } from '../character';
import { CHAPTERS } from './content';
import { getScene } from './scene';
import { createAdventure, describeAction, fallbackProposal, getCatchUp, getVisitRecap, reduceAdventure, releaseBonus, summarizeRoom, validateProposal } from './engine';
import type { AdventureCommand, AdventureRoom, CreativeEffect, CreativeProposal, PlayerAction } from './types';

const hero = (name = 'Hero', key: CharacterClassKey = 'wizard') => ({ ...createCharacterProfile(name, key), id: name });
const initial = () => ({ ...createAdventure(hero(), 'alice', 1_000, 'BRIAR1'), id: 'deterministic-room' });
let commandNumber = 0;
function command(room: AdventureRoom, type: AdventureCommand['type'], userId = 'alice', extra: Partial<AdventureCommand> = {}, now = room.updatedAt + 1) {
  return reduceAdventure(room, { id: `test-${++commandNumber}`, type, userId, ...extra }, now);
}
function act(room: AdventureRoom, action: PlayerAction = { token: 'investigate', targetId: CHAPTERS[room.chapter].targets.find(t => t.tokens.includes('investigate'))!.id }, userId = 'alice', now = room.updatedAt + 1) {
  return command(room, 'act', userId, { action, expectedTurn: room.turn }, now);
}
function next(room: AdventureRoom) { return command(room, 'tick', 'alice', {}, room.revealUntil!); }
function twoPlayers() {
  let room = command(initial(), 'join', 'bob', { character: hero('Bob', 'fighter') });
  room = act(room);
  return next(room);
}
function proposal(room: AdventureRoom, effect: CreativeEffect, targetId?: string): CreativeProposal {
  const target = targetId ?? CHAPTERS[room.chapter].targets.find(t => t.effects.includes(effect))!.id;
  return { id: `idea-${room.turn}`, turn: room.turn, targetId: target, effect, label: 'An inventive plan', description: 'Use the scene to help the party.', idea: 'I use the scene to help my friends.', supported: true, source: 'authored' };
}

function combatRoom(size = 2) {
  let room = initial();
  for (const id of ['bob', 'cara', 'dan'].slice(0, size - 1)) room = command(room, 'join', id, { character: hero(id, 'fighter') });
  room = act(room);
  room.chapter = 1; room.progress = 0; room.danger = 8;
  return next(room);
}

describe('shared reveal skipping', () => {
  it('keeps a ten-second reveal unless every seated human skips', () => {
    const solo = act(initial());
    expect(solo.revealUntil).toBe(solo.updatedAt + 10_000);
    expect(command(solo, 'tick', 'alice', {}, solo.revealUntil! - 1)).toBe(solo);
    expect(next(solo).phase).toBe('choosing');

    let room = twoPlayers();
    room = act(room);
    room = act(room, { token: 'assist', targetId: 'mara' }, 'bob');
    const turn = room.turn;
    const first = command(room, 'skip-reveal', 'alice', { expectedTurn: turn });
    expect(first.phase).toBe('reveal');
    expect(first.revealSkips).toEqual(['alice']);
    expect(command(first, 'skip-reveal', 'alice', { expectedTurn: turn })).toBe(first);
    expect(command(first, 'tick', 'bob', {}, first.revealUntil! - 1)).toBe(first);
    const advanced = command(first, 'skip-reveal', 'bob', { expectedTurn: turn });
    expect(advanced.phase).toBe('choosing');
    expect(advanced.turn).toBe(turn + 1);
    expect(advanced.deadline).toBe(advanced.updatedAt + 30_000);
    expect(advanced.revealSkips).toEqual([]);
    expect(() => command(advanced, 'skip-reveal', 'alice', { expectedTurn: turn })).toThrow('ended');
  });

  it('does not count companions, pending arrivals, or departed seats as skip voters', () => {
    let room = twoPlayers();
    room = act(room);
    room = act(room, { token: 'assist', targetId: 'mara' }, 'bob');
    const turn = room.turn;
    expect(() => command(room, 'skip-reveal', 'companion-2', { expectedTurn: turn })).toThrow('seat');
    room = command(room, 'skip-reveal', 'alice', { expectedTurn: turn });
    room = command(room, 'leave', 'bob');
    expect(room.phase).toBe('choosing');
  });
});

describe('announced threats, protection and timed release', () => {
  it.each([[undefined, 0], [0, 0], [649, 0], [650, 1], [800, 1], [950, 1], [951, 0], [1200, 0]] as const)('grants the bounded release bonus at %s milliseconds', (releaseMs, expected) => {
    expect(releaseBonus(releaseMs)).toBe(expected);
    const source = initial();
    const ordinary = act(source, { token: 'investigate', targetId: 'tracks' });
    const timed = act(source, { token: 'investigate', targetId: 'tracks', releaseMs });
    const first = ordinary.events.find(event => event.kind === 'action' && event.roll)!;
    const second = timed.events.find(event => event.kind === 'action' && event.roll)!;
    expect(second.roll).toBe(first.roll);
    expect(second.modifier).toBe(first.modifier! + expected);
    expect(second.result).toMatchObject({ targetKind: 'scene', targetId: 'tracks', token: 'investigate', executionBonus: expected });
    expect(second.contribution).toBe(true);
  });

  it.each([-1, 1201, 650.5, NaN, Infinity, '800'])('rejects malformed release timing %s without spending a token', releaseMs => {
    const room = initial();
    expect(() => act(room, { token: 'assist', targetId: 'mara', releaseMs: releaseMs as number })).toThrow('Release timing');
    expect(room.players.alice.actions).toBe(0);
    expect(room.commits).toEqual({});
  });

  it('announces a human victim, source, and frozen damage at a choosing boundary', () => {
    let room = combatRoom();
    const intent = room.enemyIntent!;
    expect(intent).toMatchObject({ turn: room.turn, sourceId: 'pack', baseDamage: 5 });
    expect(room.seats.find(seat => seat.actorId === intent.targetActorId)?.kind).toBe('human');
    room = command(room, 'join', 'cara', { character: hero('Cara') });
    room = act(room, { token: 'investigate', targetId: 'pack', releaseMs: 800 });
    expect(room.enemyIntent).toEqual(intent);
    room.danger = 20; // Resolution may change danger; the announced strike cannot grow.
    room = act(room, { token: 'assist', targetId: intent.targetActorId, targetKind: 'hero' }, 'bob');
    const strike = room.events.find(event => event.turn === intent.turn && event.result?.damage !== undefined)!;
    expect(strike.result!.damage! + strike.result!.protection!).toBe(intent.baseDamage);
    expect(room.enemyIntent).toEqual(intent);
    room = next(room);
    expect(room.enemyIntent?.turn).toBe(intent.turn + 1);
    expect(room.players.cara.seatId).not.toBeNull();
  });

  it('guarantees Protect with no roll, no progress, and three contribution XP', () => {
    const source = combatRoom();
    const before = source.players.alice.xp;
    const targetId = source.enemyIntent!.targetActorId;
    let room = act(source, { token: 'assist', targetId, targetKind: 'hero', releaseMs: 800 });
    room = command(room, 'tick', 'alice', {}, room.deadline);
    const protection = room.events.find(event => event.turn === source.turn && event.actorId === 'alice' && event.kind === 'action')!;
    expect(protection).toMatchObject({ success: true, contribution: true, result: { targetKind: 'hero', targetId, token: 'assist', executionBonus: 1, protection: 3, progress: 0 } });
    expect(protection.roll).toBeUndefined();
    expect(room.progress).toBe(0);
    expect(room.players.alice.xp).toBe(before + 3);
    expect(getVisitRecap(room, 'alice').chapterHighlights?.[1]?.[0]).toContain('protects');
  });

  it('uses the strongest Protect and cover, independent of submission order', () => {
    const source = combatRoom(4);
    const targetId = source.enemyIntent!.targetActorId;
    source.seats[0].character.traits.INT = 100;
    const moves: AdventureCommand[] = [
      { id: 'cover', type: 'act', userId: 'alice', expectedTurn: source.turn, action: { token: 'fight', targetId: 'pack' } },
      ...['bob', 'cara', 'dan'].map((userId, index): AdventureCommand => ({ id: userId, type: 'act', userId, expectedTurn: source.turn,
        action: { token: 'assist', targetKind: 'hero', targetId, releaseMs: index === 1 ? 800 : 0 } })),
    ];
    const forward = moves.reduce((room, move) => reduceAdventure(room, move, source.updatedAt + 1), source);
    const reverse = [...moves].reverse().reduce((room, move) => reduceAdventure(room, move, source.updatedAt + 1), source);
    expect(forward.events).toEqual(reverse.events);
    expect(forward.players).toEqual(reverse.players);
    const strike = forward.events.find(event => event.turn === source.turn && event.result?.damage !== undefined)!;
    expect(strike.result).toMatchObject({ targetId, damage: 2, protection: 3 });
    expect(forward.progress).toBe(0.75);
  });

  it('retains the announced victim through departure without redirecting the strike', () => {
    let room = combatRoom();
    const { targetActorId, baseDamage } = room.enemyIntent!;
    const other = targetActorId === 'alice' ? 'bob' : 'alice';
    room = command(room, 'leave', targetActorId);
    expect(room.seats.find(seat => seat.actorId === targetActorId)?.leaving).toBe(true);
    room = act(room, { token: 'assist', targetId: targetActorId, targetKind: 'hero' }, other);
    const strike = room.events.find(event => event.turn === room.turn && event.result?.damage !== undefined)!;
    expect(strike.result).toMatchObject({ targetId: targetActorId, damage: baseDamage - 2 });
    expect(room.players[targetActorId].seatId).toBeNull();
    expect(room.seats.some(seat => seat.actorId === targetActorId)).toBe(false);
  });

  it('parks an empty uncommitted room without preserving a departed seat or generating progress', () => {
    let room = combatRoom();
    const intended = room.enemyIntent!.targetActorId;
    room = command(room, 'leave', intended);
    room = command(room, 'leave', intended === 'alice' ? 'bob' : 'alice');
    expect(room.status).toBe('parked');
    expect(room.seats.every(seat => seat.kind === 'companion')).toBe(true);
    expect(room.progress).toBe(0);
    expect(room.enemyIntent).toBeUndefined();
    expect(command(room, 'tick', 'alice', {}, room.deadline + 100000)).toBe(room);
    room = command(room, 'join', 'alice', {}, room.deadline + 100000);
    expect(room.enemyIntent).toMatchObject({ turn: room.turn, targetActorId: 'alice' });
    expect(room.status).toBe('active');
  });

  it('lets a downed hero Protect and receive chapter rewards without a fabricated die', () => {
    let room = combatRoom();
    room.seats.find(seat => seat.actorId === 'alice')!.hp = 0;
    room.enemyIntent!.targetActorId = 'bob';
    room.chapterRound = 10;
    room.progress = 13;
    const xp = room.players.alice.xp;
    room = act(room, { token: 'assist', targetId: 'bob', targetKind: 'hero', releaseMs: 650 });
    room = act(room, { token: 'assist', targetId: 'bob', targetKind: 'hero' }, 'bob');
    expect(room.players.alice.xp).toBe(xp + 3 + 10);
    expect(room.players.alice.keepsakes).toContain(CHAPTERS[1].keepsake);
    expect(room.outcomes[0].result).toBe('mixed');
    expect(room.events.find(event => event.turn === room.turn && event.actorId === 'alice' && event.kind === 'action')!.roll).toBeUndefined();
  });

  it('rejects false Protect targets and incompatible tokens', () => {
    const room = combatRoom();
    const targetId = room.enemyIntent!.targetActorId;
    expect(() => act(room, { token: 'fight', targetId, targetKind: 'hero' })).toThrow('Place Help');
    expect(() => act(room, { token: 'assist', targetId: 'missing', targetKind: 'hero' })).toThrow('Place Help');
    expect(() => act(room, { token: 'assist', targetId, targetKind: 'unknown' as never })).toThrow('Choose a scene target');
    expect(() => act(initial(), { token: 'assist', targetId: 'alice', targetKind: 'hero' })).toThrow('Place Help');
  });

  it('finishes old snapshots and actions before announcing intent at the next boundary', () => {
    let room = combatRoom();
    delete room.enemyIntent;
    expect(() => act(room, { token: 'assist', targetId: 'alice', targetKind: 'hero' })).toThrow('Place Help');
    room = act(room, { token: 'investigate', targetId: 'pack' });
    expect(room.enemyIntent).toBeUndefined();
    room = act(room, { token: 'assist', targetId: 'pack' }, 'bob');
    expect(room.enemyIntent).toBeUndefined();
    expect(room.events.filter(event => event.turn === room.turn && event.contribution).every(event => event.result?.executionBonus === 0)).toBe(true);
    expect(next(room).enemyIntent?.turn).toBe(room.turn + 1);
  });

  it('deduplicates a timed Protect and rejects its stale or expired replay', () => {
    const source = combatRoom();
    const move: AdventureCommand = { id: 'timed-protect-retry', type: 'act', userId: 'alice', expectedTurn: source.turn,
      action: { token: 'assist', targetId: source.enemyIntent!.targetActorId, targetKind: 'hero', releaseMs: 800 } };
    const locked = reduceAdventure(source, move, source.updatedAt + 1);
    expect(locked.commits.alice.releaseMs).toBe(800);
    expect(reduceAdventure(locked, move, locked.updatedAt + 1)).toBe(locked);
    expect(() => reduceAdventure(source, move, source.deadline)).toThrow('ended');
    const resolved = command(locked, 'tick', 'alice', {}, locked.deadline);
    const nextRoom = next(resolved);
    expect(() => reduceAdventure(nextRoom, { ...move, id: 'stale-timed-protect' }, nextRoom.updatedAt + 1)).toThrow('ended');
    expect(reduceAdventure(nextRoom, move, nextRoom.updatedAt + 1)).toBe(nextRoom);
    expect(nextRoom.players.alice.xp).toBe(resolved.players.alice.xp);
  });
});

describe('drop-in adventure creation and discovery', () => {
  it('preserves supported cosmetic colors while normalizing power and rejecting arbitrary styles', () => {
    const colored = { ...hero('Rose mage'), accent: '#F9A8D4', hp: 999, traits: { INT: 999, ATH: 999, CHA: 999, ING: 999 } };
    const room = createAdventure(colored, 'alice', 1000, 'COLORS');
    expect(room.seats[0].character.accent).toBe('#F9A8D4');
    expect(room.seats[0].hp).toBe(10);
    expect(room.seats[0].character.traits.INT).toBe(3);
    const invalid = createAdventure({ ...colored, accent: 'url(https://example.com)' }, 'alice', 1000, 'COLOR2');
    expect(invalid.seats[0].character.accent).toBe('#A78BFA');
  });

  it('starts immediately with one human and three distinct rule-driven companions', () => {
    const room = initial();
    expect(room.seats).toHaveLength(4);
    expect(new Set(room.seats.map(s => s.character.classKey)).size).toBe(4);
    expect(room.deadline).toBe(31_000);
    expect(summarizeRoom(room)).toMatchObject({ humans: 1, companions: 3, openSeats: 3, chapter: 0, status: 'active' });
    expect(getCatchUp(room)).toContain(CHAPTERS[0].objective);
  });

  it('normalizes power even for a hero with old or inflated stats', () => {
    const veteran = { ...hero('Veteran', 'fighter'), level: 99, xp: 999999, hp: 999, maxHp: 999, traits: { ATH: 99, INT: 99, CHA: 99, ING: 99 } };
    const room = createAdventure(veteran, 'alice', 0, 'EQUAL1');
    expect(room.seats[0].hp).toBe(14);
    expect(room.seats[0].character.traits.ATH).toBe(4);
    expect(veteran.hp).toBe(999);
    expect(room.players.alice.character.xp).toBe(999999);
  });

  it('gives a brief story catch-up with the last complication, pressure and current objective', () => {
    let room = initial();
    room.seats[0].character.traits.INT = -30;
    room = act(room);
    room.progress = 2.67; room.danger = 6;
    const catchUp = getCatchUp(room);
    expect(catchUp).toContain('last attempt uncovered a complication');
    expect(catchUp).toContain('danger closing in');
    expect(catchUp).toContain(CHAPTERS[0].objective);
    expect(catchUp).not.toMatch(/\d|of 24/);
    expect(catchUp.split('.').filter(Boolean)).toHaveLength(2);
    expect(catchUp.length).toBeLessThan(230);
  });

  it('keeps important rescue, ward and downed-ally changes visible in catch-up', () => {
    const room = initial();
    room.flags.push('mara-helped');
    expect(getCatchUp(room)).toContain('Mara has your help');
    room.chapter = 2; room.flags.push('ward-repaired');
    expect(getCatchUp(room)).toContain('weakening Gloamfang');
    room.seats[0].hp = 0;
    expect(getCatchUp(room)).toContain('can still use Help');
    expect(getCatchUp(room)).toContain(getScene(room).objective);
  });

  it('uses a completed chapter outcome and the next objective during the transition', () => {
    let room = initial(); room.chapterRound = 10;
    room = command(room, 'tick', 'alice', {}, room.deadline);
    expect(getCatchUp(room)).toContain('Mara reaches shelter');
    expect(getCatchUp(room)).toContain(`Next: ${CHAPTERS[1].objective}`);
    room.chapter = 2; room.status = 'completed';
    room.outcomes.push({ chapter: 2, result: 'mixed', text: CHAPTERS[2].endings.mixed, at: 100 });
    expect(getCatchUp(room).split('.').filter(Boolean)).toHaveLength(2);
  });

  it('queues joins until a safe boundary and prevents overbooking', () => {
    let room = initial();
    for (const id of ['bob', 'cara', 'dan']) room = command(room, 'join', id, { character: hero(id) });
    expect(room.pendingJoins).toEqual(['bob', 'cara', 'dan']);
    expect(summarizeRoom(room).openSeats).toBe(0);
    expect(room.seats.filter(s => s.kind === 'human')).toHaveLength(1);
    expect(() => command(room, 'join', 'erin', { character: hero('Erin') })).toThrow('full');
    expect(() => act(room, undefined, 'bob')).toThrow('next turn');
    room = next(act(room));
    expect(room.seats.filter(s => s.kind === 'human')).toHaveLength(4);
    expect(room.pendingJoins).toEqual([]);
    expect(new Set(room.seats.map(s => s.id)).size).toBe(4);
  });
});

describe('simultaneous turns and recovery', () => {
  it('keeps reactions cosmetic, deduplicated, bounded, and limited to seated humans', () => {
    const room = twoPlayers();
    const input: AdventureCommand = { id: 'cheer-once', type: 'react', userId: 'alice', reaction: 'cheer' };
    const result = reduceAdventure(room, input, room.updatedAt + 1);
    expect(result.reactions).toHaveLength(1);
    for (const key of ['turn', 'deadline', 'phase', 'progress', 'danger', 'players', 'commits', 'events'] as const) expect(result[key]).toEqual(room[key]);
    expect(reduceAdventure(result, input, result.updatedAt + 1)).toBe(result);
    expect(() => command(result, 'react', 'alice', { reaction: 'thanks' })).toThrow('moment');
    expect(() => command(result, 'react', 'stranger', { reaction: 'cheer' })).toThrow('seat');
    expect(() => command(result, 'react', 'bob', { reaction: 'bad' as never })).toThrow('reaction');
    const later = command(result, 'react', 'alice', { reaction: 'clever' }, result.updatedAt + 11000);
    expect(later.reactions).toHaveLength(1);
    expect(later.reactions?.[0].kind).toBe('clever');
    const committed = act(later);
    expect(committed.commits.alice).toBeDefined();
    expect(committed.phase).toBe('choosing');
  });

  it('resolves early after all humans commit and waits six seconds before opening a new turn', () => {
    let room = twoPlayers();
    const turn = room.turn;
    room = act(room);
    expect(room.phase).toBe('choosing');
    expect(room.players.alice.actions).toBe(1);
    room = act(room, { token: 'assist', targetId: 'mara' }, 'bob');
    expect(room.phase).toBe('reveal');
    expect(room.players.alice.actions).toBe(2);
    expect(room.players.bob.actions).toBe(1);
    expect(command(room, 'tick', 'alice', {}, room.revealUntil! - 1)).toBe(room);
    room = next(room);
    expect(room.turn).toBe(turn + 1);
    expect(room.deadline - room.updatedAt).toBe(30_000);
  });

  it('accepts same-turn concurrent submissions from stale revisions without losing either action', () => {
    const source = twoPlayers();
    const actionA: AdventureCommand = { id: 'a', type: 'act', userId: 'alice', expectedTurn: source.turn, expectedRevision: source.revision, action: { token: 'investigate', targetId: 'tracks' } };
    const actionB: AdventureCommand = { id: 'b', type: 'act', userId: 'bob', expectedTurn: source.turn, expectedRevision: source.revision, action: { token: 'assist', targetId: 'mara' } };
    const ab = reduceAdventure(reduceAdventure(source, actionA, 8_000), actionB, 8_000);
    const ba = reduceAdventure(reduceAdventure(source, actionB, 8_000), actionA, 8_000);
    expect(ab.events).toEqual(ba.events);
    expect(ab.progress).toBe(ba.progress);
    expect(ab.players).toEqual(ba.players);
    expect(ab.revision).toBe(source.revision + 2);
    expect(source.commits).toEqual({});
  });

  it('deduplicates retry requests and rejects stale, expired, duplicate and unversioned actions', () => {
    const source = twoPlayers();
    const action: AdventureCommand = { id: 'retry-me', type: 'act', userId: 'alice', expectedTurn: source.turn, action: { token: 'investigate', targetId: 'tracks' } };
    const committed = reduceAdventure(source, action, source.updatedAt + 1);
    expect(reduceAdventure(committed, action, source.updatedAt + 2)).toBe(committed);
    expect(() => act(committed)).toThrow('already committed');
    expect(() => reduceAdventure(source, { ...action, expectedTurn: source.turn - 1 }, source.updatedAt + 1)).toThrow('ended');
    expect(() => reduceAdventure(source, { ...action, expectedTurn: undefined }, source.updatedAt + 1)).toThrow('identify');
    expect(() => reduceAdventure(source, action, source.deadline)).toThrow('ended');
  });

  it('abstains without inventing social decisions or awarding XP and releases two missed turns', () => {
    let room = initial();
    room = command(room, 'tick', 'alice', {}, room.deadline);
    expect(room.progress).toBe(0);
    expect(room.players.alice.actions).toBe(0);
    expect(room.players.alice.xp).toBe(0);
    expect(room.events.some(e => e.text.includes('sits this round out'))).toBe(true);
    room = next(room);
    room = command(room, 'tick', 'alice', {}, room.deadline);
    expect(room.status).toBe('parked');
    expect(room.players.alice.seatId).toBeNull();
    expect(room.seats.every(s => s.kind === 'companion')).toBe(true);
    expect(command(room, 'tick', 'alice', {}, room.deadline + 1_000_000)).toBe(room);
  });

  it('defaults a missed combat action to defense without using Spotlight', () => {
    let room = initial(); room.chapter = 1;
    room = command(room, 'tick', 'alice', {}, room.deadline);
    expect(room.events.some(e => e.text.includes('defends while away'))).toBe(true);
    expect(room.players.alice.spotlightChapters).toEqual([]);
    expect(room.progress).toBe(0);
  });

  it('finishes committed actions when everyone leaves, exactly once, then parks', () => {
    let room = twoPlayers();
    const priorActions = room.players.alice.actions;
    room = act(room);
    room = command(room, 'leave');
    expect(room.seats.find(s => s.actorId === 'alice')?.leaving).toBe(true);
    room = command(room, 'leave', 'bob');
    expect(room.players.alice.actions).toBe(priorActions + 1);
    expect(room.status).toBe('parked');
    expect(room.commits).toEqual({});
    expect(room.players.alice.seatId).toBeNull();
    expect(room.seats).toHaveLength(4);
    const xp = room.players.alice.xp;
    room = command(room, 'tick', 'alice', {}, room.updatedAt + 1_000_000);
    expect(room.players.alice.xp).toBe(xp);
  });

  it('immediately releases an uncommitted seat and lets queued players cancel', () => {
    let room = command(initial(), 'join', 'bob', { character: hero('Bob') });
    room = command(room, 'leave', 'bob');
    expect(room.pendingJoins).toEqual([]);
    expect(room.players.bob.leftAt).not.toBeNull();
    room = command(room, 'leave');
    expect(room.status).toBe('parked');
    expect(room.players.alice.actions).toBe(0);
    expect(room.chapterRound).toBe(1);
  });

  it('restores the pinned hero, HP, progress and spent Spotlight after leaving and rejoining', () => {
    let room = initial(); room.seats[0].hp = 4;
    const creative = proposal(room, 'cover');
    room = act(room, { token: 'spotlight', targetId: creative.targetId, proposal: creative });
    room = command(room, 'leave');
    const xp = room.players.alice.xp;
    const hp = room.players.alice.character.hp;
    room = command(room, 'join', 'alice', { character: hero('Replacement', 'fighter') }, room.updatedAt + 100_000);
    expect(room.status).toBe('active');
    expect(room.players.alice.character.name).toBe('Hero');
    expect(room.seats.find(s => s.actorId === 'alice')?.hp).toBe(hp);
    expect(room.players.alice.xp).toBe(xp);
    expect(room.players.alice.spotlightChapters).toEqual([0]);
    expect(room.deadline - room.updatedAt).toBe(30_000);
    const repeat = proposal(room, 'cover');
    expect(() => act(room, { token: 'spotlight', targetId: repeat.targetId, proposal: repeat })).toThrow('returns next chapter');
  });
});

describe('creative agency and hero abilities', () => {
  it('uses distinct class attack traits and describes useful class support', () => {
    const room = initial();
    expect(describeAction('wizard', 'fight', 'gate', room).trait).toBe('INT');
    expect(describeAction('fighter', 'fight', 'gate', room).trait).toBe('ATH');
    expect(describeAction('rogue', 'fight', 'gate', room).trait).toBe('ING');
    expect(describeAction('cleric', 'fight', 'gate', room).trait).toBe('CHA');
    expect(new Set(['wizard', 'fighter', 'rogue', 'cleric'].map(k => describeAction(k as CharacterClassKey, 'assist', 'gate', room).label)).size).toBe(4);
  });

  it.each(['cover', 'distract', 'reveal', 'rescue'] as CreativeEffect[])('applies a bounded %s effect with a successful Spotlight attempt', effect => {
    let room = initial();
    room.seats[0].character.traits = { INT: 20, ATH: 20, ING: 20, CHA: 20 };
    const creative = proposal(room, effect);
    expect(validateProposal(room, creative)).toBe(true);
    room = act(room, { token: 'spotlight', targetId: creative.targetId, proposal: creative });
    expect(room.flags).toContain(`chapter:0:${effect}`);
    expect(room.players.alice.spotlightChapters).toEqual([0]);
    expect(room.players.alice.actions).toBe(1);
    expect(room.progress).toBeGreaterThanOrEqual(3);
    if (effect === 'cover') expect(room.flags).toContain(`cover:${room.turn}`);
    if (effect === 'distract') expect(room.flags).toContain(`opening:${room.turn + 1}`);
    if (effect === 'reveal') expect(room.flags).toContain(`insight:${room.turn + 1}`);
  });

  it('rejects unsupported, stale, malformed and out-of-scene proposals without spending a token', () => {
    const room = initial();
    const valid = proposal(room, 'reveal');
    expect(validateProposal(room, { ...valid, turn: 900 })).toBe(false);
    expect(validateProposal(room, { ...valid, targetId: 'moon' })).toBe(false);
    expect(validateProposal(room, { ...valid, targetId: 'mara', effect: 'cover' })).toBe(false);
    expect(validateProposal(room, { ...valid, idea: '' })).toBe(false);
    const fallback = fallbackProposal(room, 'I teleport to the moon.', 'tracks');
    expect(fallback.supported).toBe(false);
    expect(() => act(room, { token: 'spotlight', targetId: fallback.targetId, proposal: fallback })).toThrow('supported idea');
    expect(room.players.alice.spotlightChapters).toEqual([]);
    expect(() => act(room, { token: 'fight', targetId: 'mara' })).toThrow('not available');
  });

  it('lets a downed cleric revive through support while preventing attacks', () => {
    let room = createAdventure(hero('Dawn', 'cleric'), 'alice', 1_000, 'REVIVE');
    room.id = 'revive-seed';
    room.seats[0].hp = 0;
    room.seats[0].character.traits.CHA = 20;
    expect(() => act(room, { token: 'fight', targetId: 'gate' })).toThrow('While downed');
    room = act(room, { token: 'assist', targetId: 'mara' });
    expect(room.seats.find(s => s.actorId === 'alice')!.hp).toBe(4);
    expect(room.events.some(e => e.text.includes('rejoins the action'))).toBe(true);
  });
});

describe('chapter closure and durable rewards', () => {
  it('gives failed checks a consequence and progress instead of repeating a scene', () => {
    let room = initial();
    room.seats[0].character.traits = { INT: -30, ATH: -30, ING: -30, CHA: -30 };
    room = act(room);
    expect(room.events.find(e => e.kind === 'action' && e.roll)?.success).toBe(false);
    expect(room.progress).toBeGreaterThan(0);
    expect(room.players.alice.xp).toBe(3);
    expect(next(room).chapterRound).toBe(2);
  });

  it.each([
    [0, 'setback'], [12, 'mixed'], [24, 'success'],
  ] as const)('closes chapter at ten rounds with %i progress as %s', (progress, result) => {
    let room = initial(); room.chapterRound = 10; room.progress = progress;
    room = command(room, 'tick', 'alice', {}, room.deadline);
    expect(room.outcomes).toHaveLength(1);
    expect(room.outcomes[0].result).toBe(result);
    expect(room.flags).toContain('river-lead');
    // A spectator/absent hero cannot receive a chapter reward without contributing.
    expect(room.players.alice.keepsakes).toEqual([]);
    room = next(room);
    expect(room.chapter).toBe(1);
    expect(room.chapterRound).toBe(1);
    expect(room.progress).toBe(result === 'success' ? 3 : 0);
  });

  it('runs all three authored chapters through a final outcome in at most thirty rounds', () => {
    let room = initial();
    let rounds = 0;
    while (room.status !== 'completed' && rounds < 31) {
      room = act(room);
      rounds += 1;
      if (room.status !== 'completed') room = next(room);
    }
    expect(room.status).toBe('completed');
    expect(rounds).toBeLessThanOrEqual(30);
    expect(room.outcomes.map(o => o.chapter)).toEqual([0, 1, 2]);
    expect(room.players.alice.keepsakes).toHaveLength(3);
    expect(room.players.alice.actions).toBe(rounds);
    const recap = getVisitRecap(room, 'alice');
    expect(recap.xp).toBeGreaterThan(rounds * 3);
    expect(recap.highlights.length).toBeGreaterThan(0);
    expect(recap.outcomes).toHaveLength(3);
    expect(summarizeRoom(room).openSeats).toBe(0);
    const completed = room;
    expect(command(room, 'tick', 'alice', {}, room.updatedAt + 999_999)).toBe(completed);
    expect(() => command(room, 'join', 'bob', { character: hero('Bob') })).toThrow('complete');
    room = command(room, 'leave');
    expect(room.status).toBe('completed');
    expect(getVisitRecap(room, 'alice').xp).toBe(recap.xp);
  });

  it.each([2, 4])('keeps chapters between six and ten rounds with %i humans and preserves progress as seats change', size => {
    let room = initial();
    for (let n = 1; n < size; n++) room = command(room, 'join', `human-${n}`, { character: hero(`Human ${n}`, 'wizard') });
    room = next(act(room));
    const previousProgress = room.progress;
    expect(previousProgress).toBeGreaterThan(0);
    expect(room.seats.filter(s => s.kind === 'human')).toHaveLength(size);
    // All successful investigations give 4 total objective progress regardless of party size.
    for (const seat of room.seats) if (seat.kind === 'human') seat.character.traits.INT = 20;
    const before = room.progress;
    for (const seat of room.seats.filter(s => s.kind === 'human')) room = act(room, { token: 'investigate', targetId: 'tracks' }, seat.actorId);
    expect(room.progress - before).toBe(4);
    room = next(room);
    while (room.outcomes.length === 0 && room.chapterRound <= 10) {
      const round = room.chapterRound;
      for (const seat of room.seats.filter(s => s.kind === 'human')) room = act(room, { token: 'investigate', targetId: 'tracks' }, seat.actorId);
      if (room.outcomes.length) { expect(round).toBeGreaterThanOrEqual(6); expect(round).toBeLessThanOrEqual(10); }
      else room = next(room);
    }
    expect(room.outcomes[0].result).toBe('success');
    const doneProgress = room.progress;
    room = command(room, 'leave', 'human-1');
    expect(room.progress).toBe(doneProgress);
  });

  it('gives departed contributors the chapter outcome and keepsake without repeat claims', () => {
    let room = twoPlayers();
    room = command(room, 'leave');
    room.chapterRound = 10;
    room = act(room, { token: 'assist', targetId: 'mara' }, 'bob');
    const recap = getVisitRecap(room, 'alice');
    expect(recap.actions).toBe(1);
    expect(recap.keepsakes).toEqual([CHAPTERS[0].keepsake]);
    expect(recap.outcomes).toHaveLength(1);
    const xp = recap.xp;
    room = next(room);
    expect(getVisitRecap(room, 'alice').xp).toBe(xp);
  });

  it('makes restoring the ward and confronting the guardian lead to different final success text', () => {
    let restored = initial(); restored.chapter = 2; restored.progress = 29; restored.flags.push('ward-repaired');
    restored = act(restored);
    expect(restored.outcomes[0].text).toContain('guardian bows');
    let confronted = initial(); confronted.chapter = 2; confronted.progress = 29; confronted.flags.push('guardian-confronted');
    confronted = act(confronted, { token: 'fight', targetId: 'gloamfang' });
    expect(confronted.outcomes[0].text).toContain('drive Gloamfang');
  });

  it('scales failure danger with party size, just like objective progress', () => {
    let room = initial();
    for (const id of ['bob', 'cara', 'dan']) room = command(room, 'join', id, { character: hero(id, 'fighter') });
    room = next(act(room));
    room.danger = 0;
    const progressBefore = room.progress;
    for (const seat of room.seats) seat.character.traits.ATH = -30;
    for (const seat of room.seats.filter(s => s.kind === 'human')) {
      seat.character.classKey = 'fighter';
      room = act(room, { token: 'fight', targetId: 'gate' }, seat.actorId);
    }
    expect(room.danger).toBe(1);
    expect(room.progress - progressBefore).toBe(1);
  });

  it('carries helping Mara into the next chapter and the final epilogue', () => {
    let room = initial(); room.chapterRound = 10;
    room.seats[0].character.traits.CHA = 20;
    room = act(room, { token: 'influence', targetId: 'mara' });
    expect(room.flags).toContain('mara-helped');
    room = next(room);
    expect(room.progress).toBe(1);
    expect(room.events[room.events.length - 1]?.text).toContain('Because you helped Mara');
    room.chapter = 2; room.chapterRound = 10;
    room = act(room, { token: 'influence', targetId: 'captives' });
    expect(room.outcomes[room.outcomes.length - 1]?.text).toContain('Mara welcomes you back');
  });
});
