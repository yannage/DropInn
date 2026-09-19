import { describe, expect, it, vi } from 'vitest';
import { createCharacterProfile } from '../src/lib/character';
import type { AdventureRoom, PlayerAction } from '../src/lib/dropinn/types';
import { CHAPTERS } from '../src/lib/dropinn/content';
import { createDropinnHandler } from './dropinn';

function harness(options: Parameters<typeof createDropinnHandler>[0] = {}) {
  let time = 1000;
  const handler = createDropinnHandler({ local: true, env: {}, now: () => time, ...options });
  async function call(operation: string, fields: Record<string, unknown> = {}, sessionId = 'player_one') {
    const response = await handler(new Request('http://localhost/.netlify/functions/dropinn', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ operation, sessionId, ...fields }),
    }));
    return { status: response.status, ...(await response.json()) };
  }
  const hero = createCharacterProfile('Ash', 'rogue');
  return { call, hero, advance: (milliseconds: number) => { time += milliseconds; } };
}
function action(room: AdventureRoom): PlayerAction {
  const target = CHAPTERS[room.chapter].targets.find((candidate) => candidate.tokens.some((token) => token !== 'spotlight'))!;
  return { targetId: target.id, token: target.tokens.find((token) => token !== 'spotlight')! };
}
function commit(room: AdventureRoom, id = crypto.randomUUID()) {
  return { roomCode: room.code, command: { type: 'act', id, expectedTurn: room.turn, action: action(room), userId: 'forged_user' } };
}

describe('adventure service local command contract', () => {
  it('opens a playable adventure immediately and discovers only public summaries', async () => {
    const { call, hero } = harness();
    const created = await call('play', { character: hero });
    expect(created.status).toBe(200);
    expect(created.backend).toBe('local');
    expect(created.room.seats.filter((seat: { kind: string }) => seat.kind === 'human')).toHaveLength(1);
    expect(created.room.seats.filter((seat: { kind: string }) => seat.kind === 'companion')).toHaveLength(3);
    const listed = await call('list', {}, 'player_two');
    expect(listed.rooms).toHaveLength(1);
    expect(listed.rooms[0].code).toBe(created.room.code);
    expect(listed.rooms[0]).not.toHaveProperty('players');
    expect((await call('read', { roomCode: created.room.code }, 'player_two')).status).toBe(403);
  });

  it('ignores forged user identity and durably deduplicates a committed action', async () => {
    const { call, hero } = harness();
    const initial = (await call('play', { character: hero })).room as AdventureRoom;
    const command = commit(initial);
    const first = await call('command', command);
    expect(first.status).toBe(200);
    expect(first.room.players.player_one.actions).toBe(1);
    expect(first.room.players.forged_user).toBeUndefined();
    const retry = await call('command', command);
    expect(retry.room.players.player_one.xp).toBe(first.room.players.player_one.xp);
    expect(retry.room.players.player_one.actions).toBe(1);
    expect(retry.room.revision).toBe(first.room.revision);
  });

  it('joins at a safe boundary and handles simultaneous commits without losing either', async () => {
    const { call, hero, advance } = harness();
    const initial = (await call('play', { character: hero })).room;
    let joined = (await call('join', { roomCode: initial.code, character: createCharacterProfile('Fern', 'cleric') }, 'player_two')).room as AdventureRoom;
    // A new arrival can queue until the next turn; advance the existing human once.
    if (!joined.players.player_two.seatId) {
      await call('command', commit(joined));
      advance(6000);
      joined = (await call('read', { roomCode: initial.code })).room;
    }
    expect(joined.players.player_two.seatId).not.toBeNull();
    const beforeOne = joined.players.player_one.actions;
    const beforeTwo = joined.players.player_two.actions;
    const outcomes = await Promise.all([
      call('command', commit(joined)),
      call('command', commit(joined), 'player_two'),
    ]);
    expect(outcomes.every((result) => result.status === 200)).toBe(true);
    const current = (await call('read', { roomCode: initial.code })).room;
    expect(current.players.player_one.actions).toBe(beforeOne + 1);
    expect(current.players.player_two.actions).toBe(beforeTwo + 1);
  });

  it('rejects stale turns and invented creative proposals', async () => {
    const { call, hero, advance } = harness();
    const initial = (await call('play', { character: hero })).room as AdventureRoom;
    const forged = await call('command', { roomCode: initial.code, command: { type: 'act', id: crypto.randomUUID(), expectedTurn: initial.turn,
      action: { token: 'spotlight', targetId: CHAPTERS[0].targets[0].id, proposal: { id: 'invented', supported: true, effect: 'reveal' } } } });
    expect(forged.status).toBe(409);
    await call('command', commit(initial));
    advance(6000);
    await call('read', { roomCode: initial.code });
    expect((await call('command', commit(initial))).status).toBe(409);
  });

  it('retires disconnected seats during discovery and parks an empty room', async () => {
    const { call, hero, advance } = harness();
    const initial = (await call('play', { character: hero })).room;
    advance(70_000);
    const listed = await call('list', {}, 'player_two');
    expect(listed.rooms[0].humans).toBe(0);
    expect(listed.rooms[0].status).toBe('parked');
    const rejoined = await call('join', { roomCode: initial.code, character: hero });
    expect(rejoined.room.status).toBe('active');
    expect(rejoined.room.players.player_one.character.id).toBe(hero.id);
  });

  it('preserves receipts after leaving and reconnects the pinned hero', async () => {
    const { call, hero } = harness();
    const initial = (await call('play', { character: hero })).room;
    await call('command', commit(initial));
    await call('command', { roomCode: initial.code, command: { id: crypto.randomUUID(), type: 'leave' } });
    const receipts = await call('history');
    expect(receipts.recaps[0].actions).toBe(1);
    expect((await call('read', { roomCode: initial.code })).status).toBe(200);
    const joined = await call('join', { roomCode: initial.code, character: createCharacterProfile('Other', 'fighter') });
    expect(joined.room.players.player_one.character.id).toBe(hero.id);
    expect(joined.room.players.player_one.actions).toBe(1);
  });

  it('validates chat and persists private reports only from members', async () => {
    const { call, hero } = harness();
    const { room } = await call('play', { character: hero });
    expect((await call('chat', { roomCode: room.code, text: '<script>x</script>' })).status).not.toBe(200);
    const chat = await call('chat', { roomCode: room.code, text: 'I will investigate the tracks.' });
    expect(chat.messages[0].text).toBe('I will investigate the tracks.');
    expect((await call('report', { roomCode: room.code, reason: 'A concern to review.' })).reported).toBe(true);
    expect((await call('report', { roomCode: room.code, reason: 'A concern to review.' }, 'stranger_123')).status).toBe(403);
  });

  it('prepares a telling once and starts a new room with it', async () => {
    const { call, hero } = harness();
    const draft = await call('prepare');
    const started = await call('play', { character: hero, variationId: draft.variationId });
    expect(started.room.variation).toEqual(draft.variation);
    expect((await call('play', { character: hero, variationId: draft.variationId })).status).toBe(409);
  });

  it('authenticates production independently of a client-supplied sessionId', async () => {
    const handler = createDropinnHandler({ env: {}, local: false });
    const response = await handler(new Request('http://localhost', { method: 'POST', body: JSON.stringify({ operation: 'list', sessionId: 'player_one' }) }));
    expect(response.status).toBe(401);
    expect((await response.json()).backend).toBe('supabase');
  });

  it('serves hosted discovery without a native WebSocket global', async () => {
    vi.stubGlobal('WebSocket', undefined);
    const requested: string[] = [];
    const mock = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
      requested.push(url.pathname);
      if (url.pathname === '/auth/v1/user') return Response.json({ id: '11111111-1111-4111-8111-111111111111' });
      if (url.pathname === '/rest/v1/rpc/dropinn_rate_limit') return Response.json(true);
      if (url.pathname === '/rest/v1/adventure_rooms') return Response.json([]);
      throw new Error(`Unexpected test request: ${url.pathname}`);
    }) as unknown as typeof fetch;
    try {
      const handler = createDropinnHandler({ local: false, env: {
        SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'test-server-key',
      }, fetch: mock });
      const response = await handler(new Request('http://localhost/api/dropinn', {
        method: 'POST', headers: { Authorization: 'Bearer test-session' }, body: JSON.stringify({ operation: 'list' }),
      }));
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ backend: 'supabase', rooms: [] });
      expect(requested).toEqual(['/auth/v1/user', '/rest/v1/rpc/dropinn_rate_limit', '/rest/v1/adventure_rooms']);
    } finally { vi.unstubAllGlobals(); }
  });

  it('authenticates the whole creative proposal before committing it', async () => {
    const target = CHAPTERS[0].targets.find((item) => item.effects.length)!;
    const mock = vi.fn(async () => new Response(JSON.stringify({ output: [{ content: [{ type: 'output_text', text: JSON.stringify({ targetId: target.id,
      effect: target.effects[0], supported: true, label: 'Use the surroundings', description: 'Try to use this detail to help the party.' }) }] }] }))) as unknown as typeof fetch;
    const { call, hero } = harness({ env: { DROPINN_AI_PROVIDER: 'openai', OPENAI_API_KEY: 'test', OPENAI_MODEL: 'test' }, fetch: mock });
    const { room } = await call('play', { character: hero });
    const { proposal } = await call('propose', { roomCode: room.code, targetId: target.id, idea: 'I use a nearby detail to help.' });
    expect(proposal.supported).toBe(true);
    const fields = { roomCode: room.code, command: { id: crypto.randomUUID(), type: 'act', expectedTurn: room.turn,
      action: { token: 'spotlight', targetId: target.id, proposal: { ...proposal, effect: 'rescue', description: 'Forged guaranteed success.' } } } };
    expect((await call('command', fields)).status).toBe(409);
    fields.command.id = crypto.randomUUID();
    fields.command.action.proposal = proposal;
    expect((await call('command', fields)).status).toBe(200);
  });
});
