import { describe, expect, it, vi } from 'vitest';
import { createCharacterProfile } from '../src/lib/character';
import { createAvalonEpisode } from '../src/lib/dropinn/avalonContent';
import { questHash } from '../src/lib/dropinn/questRun';
import type { AdventureRoom } from '../src/lib/dropinn/types';
import type { QuestAction } from '../src/lib/dropinn/questRunTypes';
import { createDropinnHandler } from './dropinn';

describe('Avalon v2 authoritative challenge contract', () => {
  it('persists one die and a named setup, then lets a second identity complete it exactly once', async () => {
    let now = 1000, serial = 0;
    const handler = createDropinnHandler({ local: true, env: {}, now: () => now });
    async function call(operation: string, fields: Record<string, unknown> = {}, user = 'dice_host', status = 200) {
      const response = await handler(new Request('http://localhost/api/dropinn', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ operation, sessionId: user, ...fields }) }));
      const data = await response.json(); expect(response.status, data.error ?? operation).toBe(status); return data;
    }
    const seed = Array.from({ length: 1000 }, (_, index) => `00000000-0000-4000-8000-${String(index).padStart(12, '0')}` as ReturnType<typeof crypto.randomUUID>).find(seed =>
      createAvalonEpisode(seed).manifest.startNodeId === 'larch-inn'
      && 1 + questHash(`${seed}:1:dice_host:challenge:inn-rations`) % 6 + 2 < 6
      && 1 + questHash(`${seed}:3:dice_guest:challenge:inn-rations`) % 6 + 4 >= 6)!;
    expect(seed).toBeTruthy();
    const random = vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue(seed);
    let room: AdventureRoom;
    try { room = (await call('play', { adventureId: 'avalon', visibility: 'private', character: createCharacterProfile('Rowan', 'fighter') })).room; }
    finally { random.mockRestore(); }
    expect(room.adventureVersion).toBe(2); expect(room.questRun!.avalon!.manifest.contentVersion).toBe(2);
    const manifest = structuredClone(room.questRun!.avalon!.manifest);
    room = (await call('join', { roomCode: room.code, inviteKey: room.inviteKey, character: createCharacterProfile('Fern', 'wizard') }, 'dice_guest')).room;
    const envelope = (action: QuestAction) => ({ roomCode: room.code, command: { id: `dice-service-${++serial}`, type: 'quest-act', userId: 'forged-player', expectedTurn: room.turn, expectedRevision: room.revision, questAction: action } });
    const attempt = envelope({ kind: 'interact', targetId: 'wren', optionId: 'inn-request-reserve' });
    await call('command', { ...attempt, command: { ...attempt.command, id: 'forged-die', questAction: { ...attempt.command.questAction, roll: 6 } } }, 'dice_host', 409);
    await call('command', attempt, 'dice_guest', 409);
    room = (await call('command', attempt)).room;
    const failed = room.events.filter(event => event.quest?.check).at(-1)!;
    expect(failed.quest!.check).toMatchObject({ success: false, sides: 6, attribute: 'heart', baseModifier: 2, helpModifier: 0, attempt: 1 });
    expect(room.questRun!.supplies).toBe(3); expect(room.players.dice_host.xp).toBe(3);
    expect(room.questRun!.usedOptions).not.toContain('inn-request-reserve'); expect(room.players['forged-player']).toBeUndefined();
    const retry: AdventureRoom = (await call('command', JSON.parse(JSON.stringify(attempt)))).room;
    expect(retry).toEqual(room);
    const reload: AdventureRoom = (await call('read', { roomCode: room.code })).room;
    expect(reload.questRun!.challenges).toEqual(room.questRun!.challenges); expect(reload.questRun!.avalon!.manifest).toEqual(manifest);
    await call('command', { ...attempt, command: { ...attempt.command, id: 'reroll-same-turn' } }, 'dice_host', 409);
    now = room.revealUntil!; room = (await call('read', { roomCode: room.code })).room;
    room = (await call('command', envelope({ kind: 'pass' }))).room;
    now = room.revealUntil!; room = (await call('read', { roomCode: room.code })).room;
    expect(room.questRun!.focus!.actorId).toBe('dice_guest'); expect(room.turn).toBe(3);
    const help = envelope({ kind: 'interact', targetId: 'wren', optionId: 'inn-request-reserve' });
    room = (await call('command', help, 'dice_guest')).room;
    const completed = room.events.filter(event => event.quest?.check).at(-1)!;
    expect(completed.quest!.check).toMatchObject({ success: true, helperActorId: 'dice_host', helperName: 'Rowan', helpModifier: 2, baseModifier: 2, modifier: 4, helpSourceEventId: failed.id, attempt: 2 });
    expect(room.questRun!.supplies).toBe(6); expect(room.questRun!.challenges!['inn-rations'].completedEventId).toBe(completed.id);
    expect(room.players.dice_guest.xp).toBe(3); expect(room.players.dice_host.xp).toBe(3);
    expect((await call('command', JSON.parse(JSON.stringify(help)), 'dice_guest')).room).toEqual(room);
    expect((await call('command', JSON.parse(JSON.stringify(attempt)))).room).toEqual(room);
    now = room.revealUntil!; room = (await call('read', { roomCode: room.code }, 'dice_guest')).room;
    await call('command', envelope({ kind: 'interact', targetId: 'wren', optionId: 'inn-release-reserve' }), 'dice_guest', 409);
    const old: AdventureRoom = (await call('play', { adventureId: 'avalon', adventureVersion: 1, visibility: 'private', character: createCharacterProfile('Old visit', 'fighter') }, 'old_guest')).room;
    expect(old.questRun!.avalon!.manifest.contentVersion).toBe(1); expect(old.questRun!.challenges).toBeUndefined(); expect(old.code).not.toBe(room.code);
  });
});
