import { describe, expect, it, vi } from 'vitest';
import { createCharacterProfile } from '../src/lib/character';
import { createAvalonEpisode } from '../src/lib/dropinn/avalonContent';
import type { AdventureRoom } from '../src/lib/dropinn/types';
import type { QuestAction } from '../src/lib/dropinn/questRunTypes';
import { createDropinnHandler } from './dropinn';

describe('Avalon real command and persistence contract', () => {
  it('preserves generated truth, two identities, receipts, parked admission and deliberate closing rewards', async () => {
    let now = 1000, sequence = 0;
    const inference = vi.fn(async () => { throw new Error('Avalon requires no inference.'); });
    const handler = createDropinnHandler({ local: true, env: {}, now: () => now, fetch: inference });
    async function call(operation: string, fields: Record<string, unknown> = {}, user = 'avalon_host', status = 200) {
      const response = await handler(new Request('http://localhost/api/dropinn', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ operation, sessionId: user, ...fields }) }));
      const data = await response.json(); expect(response.status, data.error ?? operation).toBe(status); return data;
    }
    const seed = Array.from({ length: 120 }, (_, index) => `00000000-0000-4000-8000-${String(index).padStart(12, '0')}` as ReturnType<typeof crypto.randomUUID>).find(seed => {
      const episode = createAvalonEpisode(seed); return episode.manifest.startNodeId === 'larch-inn' && episode.manifest.conflictIds.includes('missing-carter');
    })!;
    const random = vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue(seed);
    let room: AdventureRoom;
    try { room = (await call('play', { adventureId: 'avalon', adventureVersion: 1, visibility: 'private', character: createCharacterProfile('Rowan', 'fighter') })).room; }
    finally { random.mockRestore(); }
    expect(room.adventureId).toBe('avalon'); expect(room.questRun!.nodeId).toBe('larch-inn');
    const manifest = structuredClone(room.questRun!.avalon!.manifest);
    const receipts: Record<string, unknown>[] = [];
    async function act(questAction: QuestAction) {
      const user = room.questRun!.focus!.actorId;
      const payload = { roomCode: room.code, command: { id: `avalon-service-${++sequence}`, type: 'quest-act', userId: 'forged-identity', expectedTurn: room.turn, expectedRevision: room.revision, questAction } };
      const accepted: AdventureRoom = (await call('command', payload, user)).room;
      const retry: AdventureRoom = (await call('command', JSON.parse(JSON.stringify(payload)), user)).room;
      expect(retry).toEqual(accepted); expect(retry.players['forged-identity']).toBeUndefined();
      expect(retry.questRun!.avalon!.manifest).toEqual(manifest);
      receipts.push({ payload, user }); room = accepted;
      const persisted: AdventureRoom = (await call('read', { roomCode: room.code }, user)).room;
      expect(persisted.questRun).toEqual(accepted.questRun);
      if (room.status !== 'completed') { now = room.revealUntil!; room = (await call('read', { roomCode: room.code }, user)).room; }
    }
    async function travel(from: string, to: string) { await act({ kind: 'travel', edgeId: `${from}-to-${to}` }); }
    async function interact(targetId: string, optionId: string) { await act({ kind: 'interact', targetId, optionId }); }
    room = (await call('join', { roomCode: room.code, inviteKey: room.inviteKey, character: createCharacterProfile('Fern', 'wizard') }, 'avalon_guest')).room;
    expect(room.players.avalon_guest.seatId).toBeNull();
    await call('command', { roomCode: room.code, command: { id: 'guest-cannot-steal', type: 'quest-act', expectedTurn: room.turn, questAction: { kind: 'pass' } } }, 'avalon_guest', 409);
    await travel('larch-inn', 'old-ford'); await interact('ford-waymark', 'ford-read-waybill');
    expect(room.questRun!.focus!.actorId).toBe('avalon_guest');
    await act({ kind: 'follow-thread', threadId: 'missing-carter' });
    await call('command', { roomCode: room.code, command: { id: 'not-an-exact-retry', type: 'quest-act', expectedTurn: room.turn, questAction: { kind: 'follow-thread', threadId: 'missing-carter' } } }, 'avalon_guest', 409);
    for (const user of ['avalon_host', 'avalon_guest']) room = (await call('command', { roomCode: room.code, command: { id: `leave-${user}`, type: 'leave' } }, user)).room;
    expect(room.status).toBe('parked'); const cycle = room.questRun!.avalon!.director.cycle;
    now += 1_000_000; room = (await call('read', { roomCode: room.code }, 'avalon_guest')).room;
    expect(room.questRun!.avalon!.director.cycle).toBe(cycle);
    room = (await call('join', { roomCode: room.code, inviteKey: room.inviteKey, character: createCharacterProfile('Changed draft', 'rogue') }, 'avalon_guest')).room;
    expect(room.players.avalon_guest.character.name).toBe('Fern'); expect(room.questRun!.avalon!.manifest).toEqual(manifest);
    await travel('old-ford', 'green-quarry'); await interact('quarry-cart', 'carter-check'); await interact('quarry-cart', 'carter-walk');
    expect(room.status).toBe('active'); expect(room.questRun!.ending).toBeUndefined();
    await travel('green-quarry', 'old-ford'); await travel('old-ford', 'larch-inn'); await act({ kind: 'return-episode' });
    expect(room.status).toBe('completed'); expect(room.questRun!.ending!.text).toContain('cart'); expect(room.questRun!.ending!.text).toContain('Still open');
    expect(room.outcomes).toHaveLength(3); expect(room.players.avalon_guest.keepsakes).toHaveLength(2);
    expect(new Set(room.players.avalon_guest.keepsakes).size).toBe(room.players.avalon_guest.keepsakes.length);
    for (const receipt of [receipts[0], receipts.at(-1)!]) {
      const retry: AdventureRoom = (await call('command', receipt.payload as Record<string, unknown>, receipt.user as string)).room;
      expect(retry.questRun).toEqual(room.questRun); expect(retry.players).toEqual(room.players); expect(retry.events).toEqual(room.events);
    }
    expect(inference).not.toHaveBeenCalled();
  });
});
