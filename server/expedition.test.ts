import { describe, expect, it } from 'vitest';
import { createCharacterProfile } from '../src/lib/character';
import type { AdventureRoom, PlayerAction } from '../src/lib/dropinn/types';
import { getScene } from '../src/lib/dropinn/scene';
import { createDropinnHandler } from './dropinn';

function service() {
  let time = 1000;
  const handler = createDropinnHandler({ local: true, env: {}, now: () => time,
    fetch: async () => { throw new Error('Expeditions must work without external inference.'); } });
  const hero = createCharacterProfile('Gemward guest', 'rogue');
  async function call(operation: string, fields: Record<string, unknown> = {}, sessionId = 'gemward_host') {
    const response = await handler(new Request('http://localhost/api/dropinn', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operation, sessionId, ...fields }),
    }));
    return { status: response.status, ...(await response.json()) };
  }
  const open = () => call('play', { adventureId: 'gemward', visibility: 'private', character: hero });
  const act = (room: AdventureRoom, action: PlayerAction, id = crypto.randomUUID()) => ({
    roomCode: room.code, command: { id, type: 'act', userId: 'forged-owner', expectedTurn: room.turn,
      expectedRevision: room.revision, action },
  });
  return { call, hero, open, act, advance: (now: number) => { time = now; } };
}

function firstAction(room: AdventureRoom): PlayerAction {
  const target = getScene(room).targets.find(item => item.tokens.includes('investigate'))!;
  return { targetId: target.id, token: 'investigate', releaseMs: 812 };
}

describe('Gemward service boundary', () => {
  it('pins generated run state in stored room JSON and keeps it out of other adventures', async () => {
    const { open, call, hero } = service();
    const created = await open();
    expect(created.status).toBe(200);
    expect(created.backend).toBe('local');
    expect(created.room.expedition).toBeDefined();
    const read = await call('read', { roomCode: created.room.code });
    expect(read.room.expedition).toEqual(created.room.expedition);
    const other = await call('play', { adventureId: 'briar-glen', visibility: 'private', character: hero });
    expect(other.room.expedition).toBeUndefined();
    expect(other.room.code).not.toBe(created.room.code);
  });

  it('stores an authenticated discovery once across lost-response retries and fresh reads', async () => {
    const { open, call, act } = service();
    const { room } = await open();
    const command = act(room, firstAction(room));
    const accepted = await call('command', command);
    expect(accepted.status).toBe(200);
    expect(accepted.room.players.gemward_host.actions).toBe(1);
    expect(accepted.room.players['forged-owner']).toBeUndefined();
    const duplicate = await call('command', command);
    const read = await call('read', { roomCode: room.code });
    for (const response of [duplicate, read]) {
      expect(response.status).toBe(200);
      expect(response.room.revision).toBe(accepted.room.revision);
      expect(response.room.expedition).toEqual(accepted.room.expedition);
      expect(response.room.players.gemward_host).toEqual(accepted.room.players.gemward_host);
    }
    const history = await call('history');
    expect(history.recaps.find((entry: { code: string }) => entry.code === room.code).adventureId).toBe('gemward');
  });

  it('rejects forged consumables, unavailable routes, and unknown topics without mutating the room', async () => {
    const { open, call, act } = service();
    const { room } = await open();
    for (const metadata of [
      { consumableId: 'invented-supply' }, { routeId: 'warehouse' },
      { interactionId: 'invented-topic' }, { locationId: 'unreachable-finale' },
    ]) {
      const response = await call('command', act(room, { ...firstAction(room), expedition: metadata }));
      expect(response.status, JSON.stringify(metadata)).toBe(409);
      expect(typeof response.error).toBe('string');
    }
    const after = await call('read', { roomCode: room.code });
    expect(after.room.expedition).toEqual(room.expedition);
    expect(after.room.revision).toBe(room.revision);
  });

  it('admits a second player at a boundary and resolves their independent actions together', async () => {
    const { open, call, act, hero } = service();
    let { room } = await open();
    const joined = await call('join', { roomCode: room.code, inviteKey: room.inviteKey,
      character: { ...hero, id: 'gemward-guest-hero', name: 'Second visitor' } }, 'gemward_guest');
    expect(joined.status).toBe(200);
    expect(joined.room.pendingJoins).toContain('gemward_guest');
    room = (await call('command', act(room, firstAction(room)))).room;
    room = (await call('command', { roomCode: room.code, command: {
      id: crypto.randomUUID(), type: 'skip-reveal', expectedTurn: room.turn,
    } })).room;
    expect(room.seats.filter((seat: { kind: string }) => seat.kind === 'human')).toHaveLength(2);
    const initial = structuredClone(room.expedition);
    const a = await call('command', act(room, firstAction(room)));
    expect(a.status).toBe(200);
    expect(a.room.phase).toBe('choosing');
    expect(a.room.expedition).toEqual(initial);
    const b = await call('command', act(room, firstAction(room)), 'gemward_guest');
    expect(b.status).toBe(200);
    expect(b.room.phase).toBe('reveal');
    expect(b.room.players.gemward_guest.actions).toBe(1);
    const host = await call('read', { roomCode: room.code });
    expect(host.room.expedition).toEqual(b.room.expedition);
    expect(host.room.players.gemward_host.actions).toBe(2);
  });
});
