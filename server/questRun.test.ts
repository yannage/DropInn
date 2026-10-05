import { describe, expect, it, vi } from 'vitest';
import { createCharacterProfile } from '../src/lib/character';
import { createQuestRun } from '../src/lib/dropinn/questRun';
import type { AdventureRoom } from '../src/lib/dropinn/types';
import type { QuestAction } from '../src/lib/dropinn/questRunTypes';
import { createDropinnHandler } from './dropinn';

async function service(weather: 'high-water' | 'low-water') {
  let now = 1000, sequence = 0;
  const external = vi.fn(async () => { throw new Error('This authored quest needs no model.'); });
  const handler = createDropinnHandler({ local: true, env: {}, now: () => now, fetch: external });
  async function call(operation: string, fields: Record<string, unknown> = {}, status = 200, user = 'quest_host') {
    now++;
    const response = await handler(new Request('http://localhost/api/dropinn', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ operation, sessionId: user, ...fields }) }));
    const data = await response.json(); expect(response.status, data.error ?? operation).toBe(status); return data;
  }
  const seed = Array.from({ length: 20 }, (_, index) => `00000000-0000-4000-8000-${String(index).padStart(12, '0')}` as ReturnType<typeof crypto.randomUUID>).find(seed => createQuestRun(seed).facts[0].id === weather)!;
  const random = vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue(seed); let room: AdventureRoom;
  try { room = (await call('play', { adventureId: 'mosswater', character: createCharacterProfile('Quest host', 'fighter'), visibility: 'private' })).room; }
  finally { random.mockRestore(); }
  const receipts: Record<string, unknown>[] = [];
  const envelope = (room: AdventureRoom, questAction: QuestAction) => ({ roomCode: room.code, command: { id: `quest-service-${++sequence}`, type: 'quest-act', userId: 'forged-player', expectedTurn: room.turn, expectedRevision: room.revision, questAction } });
  async function action(room: AdventureRoom, questAction: QuestAction, user = 'quest_host') {
    const payload = envelope(room, questAction); receipts.push(payload);
    const accepted: AdventureRoom = (await call('command', payload, 200, user)).room;
    const retry: AdventureRoom = (await call('command', JSON.parse(JSON.stringify(payload)), 200, user)).room;
    expect(retry.revision).toBe(accepted.revision); expect(retry.events).toEqual(accepted.events); expect(retry.players).toEqual(accepted.players);
    expect(retry.players['forged-player']).toBeUndefined();
    const readback: AdventureRoom = (await call('read', { roomCode: room.code }, 200, user)).room;
    expect(readback.questRun).toEqual(accepted.questRun); return readback;
  }
  async function advance(room: AdventureRoom) {
    if (room.status === 'completed') return room;
    now = Math.max(now, room.revealUntil!);
    return (await call('read', { roomCode: room.code })).room as AdventureRoom;
  }
  const turn = async (room: AdventureRoom, questAction: QuestAction, user?: string) => advance(await action(room, questAction, user));
  return { room: room!, call, action, turn, advance, envelope, receipts, external };
}
const interact = (targetId: string, optionId: string): QuestAction => ({ kind: 'interact', targetId, optionId });
const travel = (edgeId: string): QuestAction => ({ kind: 'travel', edgeId });

describe('Mosswater real command and snapshot contract', () => {
  it.each((['high-water', 'low-water'] as const).flatMap(weather => (['bargain', 'isolate', 'repair'] as const).map(ending => ({ weather, ending }))))('completes $ending in $weather with exact action retries and one reward per milestone', async ({ weather, ending }) => {
    const api = await service(weather); let room = api.room;
    expect(room.adventureId).toBe('mosswater'); expect(room.questRun!.facts[0].id).toBe(weather);
    if (ending === 'repair') {
      room = await api.turn(room, interact('tool-cache', 'cache-open'));
      room = await api.turn(room, travel('yard-to-bank'));
      room = await api.turn(room, { kind: 'interact', targetId: 'reed-patch', optionId: 'herbs-safe' });
      room = await api.turn(room, travel('bank-to-hill'));
      room = await api.turn(room, interact('spring-pool', 'spring-test'));
      room = await api.turn(room, travel('hill-to-arch'));
      room = await api.turn(room, interact('old-sluice', 'sluice-inspect'));
      room = await api.turn(room, interact('old-sluice', 'sluice-use-tools'));
      room = await api.turn(room, interact('carry-rope', 'relay-rig'));
      expect(room.status).toBe('active'); room = await api.turn(room, interact('carry-rope', 'relay-open'));
    } else {
      room = await api.turn(room, interact('well', 'well-inspect'));
      room = await api.turn(room, interact('well', 'well-trace-stain'));
      room = await api.turn(room, travel('yard-to-watercourse'));
      if (ending === 'bargain') {
        room = await api.turn(room, interact('mossback', 'mossback-listen'));
        expect(room.questRun!.ending).toBeUndefined(); room = await api.turn(room, interact('mossback', 'mossback-bargain'));
      } else {
        room = await api.turn(room, interact('mossback', 'mossback-challenge'));
        for (let count = 0; room.questRun!.combat && count < 6; count++) room = await api.turn(room, { kind: 'combat', move: 'attack' });
        expect(room.questRun!.facts.some(fact => fact.id === 'defeated:mossback')).toBe(true);
        const offer = room.questRun!.lootOffers.find(offer => offer.actorId === 'quest_host')!;
        const turn = room.turn, deadline = room.deadline;
        room = await api.action(room, { kind: 'loot', offerId: offer.id, choiceId: offer.choices[0] });
        room = await api.action(room, { kind: 'upgrade', attribute: 'might' });
        expect(room.turn).toBe(turn); expect(room.deadline).toBe(deadline);
        expect(room.questRun!.ending).toBeUndefined();
        room = await api.turn(room, interact('dye-vat', 'vat-haul-after-fight'));
      }
    }
    expect(room.status).toBe('completed'); expect(room.questRun!.ending!.id).toBe(ending); expect(room.outcomes).toHaveLength(3);
    expect(room.players.quest_host.keepsakes).toHaveLength(3);
    expect(new Set(room.questRun!.completedObjectives).size).toBe(3);
    for (const payload of [api.receipts[0], api.receipts.at(-1)!]) {
      const retry: AdventureRoom = (await api.call('command', payload)).room;
      expect(retry.questRun).toEqual(room.questRun); expect(retry.events).toEqual(room.events); expect(retry.players).toEqual(room.players);
    }
    expect(api.external).not.toHaveBeenCalled();
  });
  it('admits at the focus boundary, rejects spectator actions and keeps offturn upgrades on their owning hero', async () => {
    const api = await service('high-water'); let room = api.room;
    room = (await api.call('join', { roomCode: room.code, inviteKey: room.inviteKey, character: createCharacterProfile('Guest', 'wizard') }, 200, 'quest_guest')).room;
    await api.call('command', api.envelope(room, interact('well', 'well-inspect')), 409, 'quest_guest');
    await api.call('propose', { roomCode: room.code, targetId: 'well', idea: 'Inspect the stain.' }, 409);
    await api.call('command', { roomCode: room.code, command: { id: 'old-token-invalid', type: 'act', expectedTurn: room.turn, action: { token: 'assist', targetId: 'well' } } }, 409);
    room = await api.turn(room, interact('well', 'well-inspect'));
    expect(room.players.quest_guest.seatId).toBeNull();
    room = await api.turn(room, interact('well', 'well-trace-stain'));
    expect(room.questRun!.focus!.actorId).toBe('quest_guest');
    await api.call('command', api.envelope(room, { kind: 'pass' }), 409);
    room = await api.turn(room, travel('yard-to-watercourse'), 'quest_guest');
    room = await api.turn(room, interact('mossback', 'mossback-listen'), 'quest_guest');
    expect(room.questRun!.heroes.quest_guest.runXp).toBe(2);
    await api.call('command', api.envelope(room, { kind: 'upgrade', attribute: 'might' }), 409, 'quest_guest');
    room = await api.turn(room, interact('dye-vat', 'vat-inspect'));
    expect(room.questRun!.heroes.quest_host.points).toBe(1);
    const before = room.questRun!.heroes.quest_guest.attributes.might;
    room = await api.action(room, { kind: 'upgrade', attribute: 'might' });
    expect(room.questRun!.heroes.quest_guest.attributes.might).toBe(before);
    expect(room.players.quest_guest.keepsakes).toHaveLength(1); // Joined after the first milestone; source credit is earned through real play.
  });
});
