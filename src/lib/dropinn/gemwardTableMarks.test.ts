import { describe, expect, it } from 'vitest';
import { createCharacterProfile } from '../character';
import { createAdventure } from './engine';
import { gemwardFactStamp, gemwardPlacedMoves, type GemwardFactBeat } from './gemwardTableMarks';
import type { PlayerAction } from './types';

function fixture() {
  const room = createAdventure(createCharacterProfile('Moss', 'wizard'), 'moss', 1000, 'MARK03', 'gemward', 3);
  const first = room.seats.find(seat => seat.actorId === 'moss')!;
  const other = structuredClone(first);
  other.id = 'seat-wren'; other.actorId = 'wren'; other.character.name = 'Wren';
  room.seats[1] = other;
  room.players.wren = { ...structuredClone(room.players.moss), userId: 'wren', seatId: other.id, character: other.character };
  return room;
}
const prices: PlayerAction = { token: 'influence', targetId: 'iris', expedition: { locationId: 'shop', interactionId: 'iris:pricing' } };
const beat = (): GemwardFactBeat => ({
  start: 2000, duration: 900,
  event: { id: 'found-ledger', at: 1850, chapter: 0, turn: 1, kind: 'action', text: 'The warehouse path opens.', success: true,
    result: { changed: true, expedition: { storyTable: { factIds: ['ledger-copy'], before: 'No lead', after: 'The delivery is traced', next: 'Choose the warehouse path' } } } },
});

describe('accepted teammate counters', () => {
  it('draws only accepted visible teammate moves without changing the room', () => {
    const room = fixture();
    expect(gemwardPlacedMoves(room, 'moss', 'shop')).toEqual([]);
    room.commits.moss = prices; room.commits.wren = prices;
    room.commits.unseated = prices;
    const companion = room.seats.find(seat => seat.kind === 'companion')!;
    room.commits[companion.actorId] = prices;
    const original = JSON.stringify(room);
    expect(gemwardPlacedMoves(room, 'moss', 'shop')).toEqual([expect.objectContaining({ actorId: 'wren', actorName: 'Wren', targetId: 'iris', label: 'Ask about gem prices' })]);
    expect(gemwardPlacedMoves(room, 'moss', 'docks')).toEqual([]);
    expect(JSON.stringify(room)).toBe(original);
    expect(room.expedition!.storyTable!.facts).toEqual([]);
  });
  it('retains an accepted departing actor and restores the same static identity on reload', () => {
    const room = fixture(); room.commits.wren = prices; room.seats[1].leaving = true;
    const original = gemwardPlacedMoves(room, 'moss', 'shop');
    expect(original).toHaveLength(1);
    expect(gemwardPlacedMoves(JSON.parse(JSON.stringify(room)), 'moss', 'shop')).toEqual(original);
  });
  it.each(['reveal', 'travel', 'completed', 'parked', 'v2'] as const)('hides stale counters for %s', state => {
    const room = fixture(); room.commits.wren = prices;
    if (state === 'v2') room.adventureVersion = 2;
    else if (state === 'reveal' || state === 'travel') room.phase = state;
    else room.status = state;
    expect(gemwardPlacedMoves(room, 'moss', 'shop')).toEqual([]);
  });
  it('keeps hero protection visible and omits missing destinations', () => {
    const room = fixture();
    room.commits.wren = { token: 'assist', targetId: 'moss', targetKind: 'hero' };
    expect(gemwardPlacedMoves(room, 'moss', 'shop')[0]).toMatchObject({ targetKind: 'hero', targetName: 'Moss' });
    room.commits.wren = { ...prices, targetId: 'missing' };
    expect(gemwardPlacedMoves(room, 'moss', 'shop')).toEqual([]);
  });
  it('does not expose Spotlight ideas, proposals or signatures', () => {
    const room = fixture();
    room.commits.wren = { ...prices, token: 'spotlight', proposal: { id: 'private-signature', turn: 1, targetId: 'iris', effect: 'reveal', label: 'Secret', description: 'Not public', idea: 'Private draft', supported: true, source: 'authored' } };
    const mark = gemwardPlacedMoves(room, 'moss', 'shop')[0];
    expect(mark.label).toBe('Spotlight at Iris the jeweller');
    expect(JSON.stringify(mark)).not.toMatch(/private|secret|proposal|signature/i);
  });
});

describe('confirmed fact ink stamps', () => {
  it('waits for the existing contact and expires with that beat', () => {
    expect(gemwardFactStamp(beat(), 2299, false, true)).toBeUndefined();
    expect(gemwardFactStamp(beat(), 2300, false, true)).toMatchObject({ label: 'Delivery ledger', animate: true, elapsedMs: 0, durationMs: 360 });
    expect(gemwardFactStamp(beat(), 2660, false, true)).toMatchObject({ animate: false, elapsedMs: 360 });
    expect(gemwardFactStamp(beat(), 2900, false, true)).toBeUndefined();
  });
  it('fast-forwards compressed beats, never extending the stage schedule', () => {
    const busy = { ...beat(), duration: 150 };
    expect(gemwardFactStamp(busy, 2100, false, true)).toMatchObject({ durationMs: 100, elapsedMs: 50, animate: true });
    expect(gemwardFactStamp(busy, 2150, false, true)).toBeUndefined();
    expect(gemwardFactStamp(beat(), 5000, false, true)).toBeUndefined();
  });
  it('keeps a static readable fact in quiet mode and produces nothing for hidden or reload-without-cache playback', () => {
    expect(gemwardFactStamp(beat(), 2400, true, true)).toMatchObject({ label: 'Delivery ledger', animate: false });
    expect(gemwardFactStamp(beat(), 2400, false, false)).toBeUndefined();
    expect(gemwardFactStamp(undefined, 2400, false, true)).toBeUndefined();
  });
  it('does not stamp repeated facts, failed actions or generic unrecorded success', () => {
    const repeated = beat(); repeated.event.result!.expedition!.storyTable!.repeated = true;
    const failed = beat(); failed.event.success = false;
    const ordinary = beat(); ordinary.event.result!.expedition!.storyTable = undefined;
    for (const value of [repeated, failed, ordinary]) expect(gemwardFactStamp(value, 2400, false, true)).toBeUndefined();
  });
  it('uses authored labels, deduplicates recorded facts and leaves events untouched', () => {
    const found = beat(); found.event.result!.expedition!.storyTable!.factIds = ['road-lead', 'watcher-tell', 'road-lead'];
    const original = JSON.stringify(found);
    expect(gemwardFactStamp(found, 2400, false, true)?.label).toBe('Hill-road lead + Watcher’s habit');
    expect(JSON.stringify(found)).toBe(original);
  });
});
