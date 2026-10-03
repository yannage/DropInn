import { describe, expect, it, vi } from 'vitest';
import { createCharacterProfile } from '../src/lib/character';
import { createExpedition } from '../src/lib/dropinn/expedition';
import type { AdventureRoom, PlayerAction } from '../src/lib/dropinn/types';
import { createDropinnHandler } from './dropinn';

type Variant = 'smugglers' | 'ward';
function seedFor(variant: Variant) {
  for (let i = 0; i < 100; i++) {
    const uuid = `00000000-0000-4000-8000-${String(i).padStart(12, '0')}` as ReturnType<typeof crypto.randomUUID>;
    if (createExpedition(uuid).variant === variant) return uuid;
  }
  throw new Error('No deterministic story seed found.');
}

async function journey(variant: Variant) {
  let now = 1000;
  let id = 0;
  const external = vi.fn(async () => { throw new Error('A complete authored expedition needs no external model.'); });
  const handler = createDropinnHandler({ local: true, env: {}, now: () => now, fetch: external });
  const hero = createCharacterProfile('Journey guest', 'fighter');
  async function call(operation: string, fields: Record<string, unknown> = {}) {
    now++;
    const response = await handler(new Request('http://localhost/api/dropinn', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ operation, sessionId: 'journey_host', ...fields }) }));
    const data = await response.json();
    expect(response.status, data.error ?? operation).toBe(200);
    return data;
  }
  // Control only randomness at creation. Every gameplay mutation below crosses the public command boundary.
  const random = vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue(seedFor(variant));
  let opened: { room: AdventureRoom };
  try { opened = await call('play', { character: hero, adventureId: 'gemward', visibility: 'private' }); }
  finally { random.mockRestore(); }
  expect(opened!.room.expedition!.variant).toBe(variant);
  async function command(room: AdventureRoom, type: 'act' | 'skip-reveal', action?: PlayerAction): Promise<AdventureRoom> {
    const payload = { roomCode: room.code, command: { id: `journey-${++id}`, type, expectedTurn: room.turn, expectedRevision: room.revision, ...(action ? { action } : {}) } };
    const accepted = (await call('command', payload)).room as AdventureRoom;
    const duplicate = (await call('command', payload)).room as AdventureRoom;
    const readback = (await call('read', { roomCode: room.code })).room as AdventureRoom;
    expect(duplicate.revision).toBe(accepted.revision);
    expect(duplicate.expedition).toEqual(accepted.expedition);
    expect(readback.expedition).toEqual(accepted.expedition);
    expect(readback.players.journey_host).toEqual(accepted.players.journey_host);
    return accepted;
  }
  async function turn(room: AdventureRoom, action: PlayerAction) {
    const resolved = await command(room, 'act', action);
    return resolved.status === 'completed' ? resolved : command(resolved, 'skip-reveal');
  }
  return { room: opened!.room, turn, call, external };
}

describe('Gemward full journeys through the local command service', () => {
  it.each((['warehouse', 'canal', 'road'] as const).flatMap(route => (['smugglers', 'ward'] as const).map(variant => ({ route, variant }))))('persists $route through all three chapters for the $variant telling', async ({ route, variant }) => {
    const api = await journey(variant);
    let room = api.room;
    if (route === 'warehouse') room = await api.turn(room, { token: 'investigate', targetId: 'iris' });
    if (route === 'canal') room = await api.turn(room, { token: 'assist', targetId: 'bram', expedition: { locationId: 'docks' } });
    room = await api.turn(room, { token: 'assist', targetId: 'iris', expedition: { routeId: route } });
    expect(room.chapter).toBe(1);
    expect(room.expedition!.routeId).toBe(route);
    if (route === 'canal') {
      room = await api.turn(room, { token: 'assist', targetId: 'ramp' });
      expect(room.expedition!.questItems).toContain('mooring-line');
      room = await api.turn(room, { token: 'influence', targetId: 'watcher' });
      expect(room.expedition!.questItems).toContain('quiet-passage');
      expect(room.expedition!.battle).toBeUndefined();
      expect(room.events.some(event => event.result?.expedition?.battleProgress !== undefined)).toBe(false);
    } else {
      if (route === 'warehouse') {
        room = await api.turn(room, { token: 'investigate', targetId: 'crate' });
        expect(room.expedition!.questItems).toContain('buyer-evidence');
        expect(room.expedition!.battle).toBeUndefined();
      }
      room = await api.turn(room, { token: 'assist', targetId: 'ramp' });
      let exchanges = 0;
      while (room.expedition?.battle?.status === 'active') {
        expect(room.enemyIntent?.sourceId).toBe('encounter');
        const token = ({ strike: 'investigate', trick: 'fight', guard: 'influence' } as const)[room.expedition.battle.stance];
        room = await api.turn(room, { token, targetId: 'encounter' });
        expect(++exchanges).toBeLessThanOrEqual(4);
      }
      expect(exchanges).toBeGreaterThanOrEqual(2);
      expect(room.expedition!.rewarded.filter(source => source.includes('fight:'))).toHaveLength(1);
    }
    expect(room.chapter).toBe(1);
    expect(room.expedition!.questItems).toContain('recovered-prism');
    room = await api.turn(room, { token: 'assist', targetId: 'crate' });
    expect(room.chapter).toBe(2);
    expect(room.outcomes[1].text).toContain(variant === 'smugglers' ? 'maker mark' : 'living spark');
    room = await api.turn(room, { token: variant === 'smugglers' ? 'assist' : 'influence', targetId: 'beacon' });
    expect(room.expedition!.finaleChoice).toBe(variant === 'smugglers' ? 'restore' : 'release');
    room = await api.turn(room, { token: 'assist', targetId: 'town' });
    expect(room.status).toBe('completed');
    expect(room.outcomes).toHaveLength(3);
    expect(room.players.journey_host.keepsakes).toHaveLength(3);
    expect(room.outcomes[2].text).toContain(variant === 'smugglers' ? 'evidence' : 'spark is free');
    expect(room.expedition!.stashes.journey_host.length).toBeLessThanOrEqual(3);
    const history = await api.call('history');
    const recap = history.recaps.find((entry: { code: string }) => entry.code === room.code);
    expect(recap.outcomes).toEqual(room.outcomes);
    expect(recap.keepsakes).toEqual(room.players.journey_host.keepsakes);
    expect(api.external).not.toHaveBeenCalled();
  });
});
