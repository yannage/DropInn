import { describe, expect, it, vi } from 'vitest';
import { createCharacterProfile } from '../src/lib/character';
import type { AdventureRoom, PlayerAction } from '../src/lib/dropinn/types';
import { CHAPTERS } from '../src/lib/dropinn/content';
import { createDropinnHandler } from './dropinn';
import { spotlightSuggestions } from '../src/lib/dropinn/suggestions';
import { ADVENTURES } from '../src/lib/dropinn/registry';

describe('adventure selection contract', () => {
  it('isolates matchmaking by story and preserves identity through read and history', async () => {
    const { call, hero } = harness();
    const codes = new Set<string>();
    for (const definition of ADVENTURES) {
      const opened = await call('play', { character: hero, adventureId: definition.id });
      expect(opened.status).toBe(200);
      expect(opened.room).toMatchObject({ adventureId: definition.id, adventureVersion: 1, title: definition.title });
      codes.add(opened.room.code);
      const matched = await call('play', { character: hero, adventureId: definition.id }, 'player_two');
      expect(matched.room.code).toBe(opened.room.code);
      const read = await call('read', { roomCode: opened.room.code });
      expect(read.room.adventureId).toBe(definition.id);
    }
    expect(codes.size).toBe(4);
    const history = await call('history');
    expect(new Set(history.recaps.map((recap: { adventureId: string }) => recap.adventureId)).size).toBe(4);
    const invalid = await call('play', { character: hero, adventureId: 'made-up' });
    expect(invalid.status).toBe(400);
  });
  it.each(ADVENTURES.slice(1))('signs authored Spotlight for $id without an inference call', async definition => {
    const { call, hero } = harness({ fetch: vi.fn(() => { throw new Error('No external inference'); }) });
    const { room } = await call('play', { character: hero, adventureId: definition.id, visibility: 'private' });
    const idea = spotlightSuggestions(room)[0];
    const { proposal, status } = await call('propose', { roomCode: room.code, targetId: idea.targetId, idea: idea.idea });
    expect(status).toBe(200);
    expect(proposal.supported).toBe(true);
    const commit = await call('command', { roomCode: room.code, command: { id: 'signed-new-story', type: 'act', expectedTurn: room.turn, action: { token: 'spotlight', targetId: idea.targetId, proposal, releaseMs: 800 } } });
    expect(commit.status).toBe(200);
  });
});

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
  it('validates focused approaches and preserves them through receipts and reads', async () => {
    const { call, hero } = harness();
    const { room } = await call('play', { character: hero, visibility: 'private' });
    expect(room.mechanicsVersion).toBe(1);
    const invalid = await call('command', { roomCode: room.code, command: { id: 'invalid-approach', type: 'act', expectedTurn: room.turn,
      action: { token: 'investigate', targetId: 'tracks', approach: 'heavy' } } });
    expect(invalid.status).toBe(409);
    expect(invalid.error).toContain('available approach');
    const payload = { roomCode: room.code, command: { id: 'focused-study', type: 'act', expectedTurn: room.turn,
      action: { token: 'investigate', targetId: 'tracks', approach: 'study', releaseMs: 800 } } };
    const committed = await call('command', payload);
    expect(committed.status).toBe(200);
    const event = committed.room.events.find((event: { result?: { approach?: string } }) => event.result?.approach === 'study');
    expect(event).toBeDefined();
    const retried = await call('command', payload);
    const read = await call('read', { roomCode: room.code });
    expect(retried.room.players.player_one.xp).toBe(committed.room.players.player_one.xp);
    expect(read.room.events.filter((event: { result?: { approach?: string } }) => event.result?.approach === 'study')).toHaveLength(1);
  });
  it('retains face selections and validates hat ownership on admission', async () => {
    const { call, hero } = harness();
    const appearance = { body: 'round', eyes: 'sleepy', nose: 'triangle', mouth: 'flat' };
    const locked = await call('play', { character: { ...hero, appearance, equipment: { hat: 'moonstone' } } });
    expect(locked.room.seats[0].character).toMatchObject({ appearance, equipment: { hat: null } });
    const earned = await call('play', { character: { ...hero, appearance, inventory: ['The guardian’s moonstone'], equipment: { hat: 'moonstone' } } }, 'player_two');
    expect(earned.room.players.player_two.character).toMatchObject({ appearance, equipment: { hat: 'moonstone' } });
  });

  it('carries a validated hero color through server admission without accepting inflated stats', async () => {
    const { call, hero } = harness();
    const response = await call('play', { character: { ...hero, accent: '#7DD3FC', hp: 999, traits: { INT: 999, ATH: 999, CHA: 999, ING: 999 } } });
    expect(response.status).toBe(200);
    expect(response.room.seats[0].character.accent).toBe('#7DD3FC');
    expect(response.room.seats[0].character.traits.ING).toBe(4);
    expect(response.room.seats[0].hp).toBe(11);
  });

  it('reclaims disconnected seats when an invited visitor returns to a full private table', async () => {
    const { call, hero, advance } = harness();
    const room = (await call('play', { character: hero, visibility: 'private' })).room as AdventureRoom;
    for (const id of ['friend_a', 'friend_b', 'friend_c']) {
      expect((await call('join', { character: hero, roomCode: room.code, inviteKey: room.inviteKey }, id)).status).toBe(200);
    }
    await call('command', commit(room));
    advance(6000);
    const full = (await call('read', { roomCode: room.code })).room as AdventureRoom;
    expect(full.seats.filter(seat => seat.kind === 'human')).toHaveLength(4);
    advance(66000);
    const joined = await call('join', { character: hero, roomCode: room.code, inviteKey: room.inviteKey }, 'friend_d');
    expect(joined.status).toBe(200);
    expect(joined.room.players.friend_d.seatId).not.toBeNull();
    expect(joined.room.seats.filter((seat: { kind: string }) => seat.kind === 'human')).toHaveLength(1);
  });

  it('keeps friend tables out of discovery and matchmaking and requires invitations for new members', async () => {
    const { call, hero, advance } = harness();
    const created = await call('play', { character: hero, visibility: 'private' });
    expect(created.status).toBe(200);
    const room = created.room as AdventureRoom;
    expect(room.visibility).toBe('private');
    expect(room.inviteKey).toMatch(/^[a-f0-9]{32}$/);
    expect((await call('list', {}, 'outsider')).rooms).toEqual([]);
    expect((await call('read', { roomCode: room.code }, 'outsider')).status).toBe(403);
    const publicPlay = await call('play', { character: { ...hero, id: crypto.randomUUID() } }, 'outsider');
    expect(publicPlay.room.code).not.toBe(room.code);
    for (const inviteKey of [undefined, 'wrong-key']) {
      const denied = await call('join', { roomCode: room.code, character: hero, inviteKey }, 'player_friend');
      expect(denied.status).toBe(409);
    }
    const joined = await call('join', { roomCode: room.code, character: hero, inviteKey: room.inviteKey }, 'player_friend');
    expect(joined.status).toBe(200);
    expect(joined.room.pendingJoins).toContain('player_friend');
    await call('command', commit(room));
    advance(6000);
    expect((await call('read', { roomCode: room.code }, 'player_friend')).room.players.player_friend.seatId).not.toBeNull();
    await call('command', { roomCode: room.code, command: { id: crypto.randomUUID(), type: 'leave' } }, 'player_friend');
    const returning = await call('join', { roomCode: room.code, character: hero }, 'player_friend');
    expect(returning.status).toBe(200);
    expect((await call('history', {}, 'player_friend')).recaps.some((visit: { code: string }) => visit.code === room.code)).toBe(true);
    const listing = (await call('list', {}, 'player_friend')).rooms;
    expect(listing.some((summary: { code: string }) => summary.code === room.code)).toBe(false);
    expect(JSON.stringify(listing)).not.toContain(room.inviteKey);
  });

  it('shares reactions through the authoritative command path without awarding progress', async () => {
    const { call, hero } = harness();
    const room = (await call('play', { character: hero })).room as AdventureRoom;
    const command = { id: crypto.randomUUID(), type: 'react', reaction: 'thanks', userId: 'forged_user' };
    const result = await call('command', { roomCode: room.code, command });
    expect(result.status).toBe(200);
    expect(result.room.reactions[0].userId).toBe('player_one');
    expect(result.room.players.player_one.xp).toBe(0);
    expect(result.room.deadline).toBe(room.deadline);
    expect((await call('command', { roomCode: room.code, command })).room.reactions).toHaveLength(1);
    expect((await call('command', { roomCode: room.code, command: { ...command, id: crypto.randomUUID() } })).status).toBe(409);
  });

  it('signs an authored suggestion and spends Spotlight only once on confirmation', async () => {
    const { call, hero } = harness();
    const room = (await call('play', { character: hero })).room as AdventureRoom;
    const idea = spotlightSuggestions(room)[0];
    const preview = await call('propose', { roomCode: room.code, idea: idea.idea, targetId: idea.targetId });
    expect(preview.status).toBe(200);
    expect(preview.proposal.supported).toBe(true);
    const before = (await call('read', { roomCode: room.code })).room as AdventureRoom;
    expect(before.players.player_one.spotlightChapters).toEqual([]);
    const command = { id: crypto.randomUUID(), type: 'act', expectedTurn: room.turn,
      action: { token: 'spotlight', targetId: idea.targetId, proposal: preview.proposal, releaseMs: 800 } };
    const result = await call('command', { roomCode: room.code, command });
    expect(result.status).toBe(200);
    expect(result.room.players.player_one.spotlightChapters).toEqual([0]);
    expect(result.room.events.find((event: { actorId?: string; result?: { executionBonus: number } }) => event.actorId === 'player_one' && event.result)?.result.executionBonus).toBe(1);
    const retried = await call('command', { roomCode: room.code, command });
    expect(retried.room.players.player_one.actions).toBe(1);
    expect(retried.room.players.player_one.xp).toBe(result.room.players.player_one.xp);
  });

  it('validates release duration at the service boundary and ignores forged roll fields', async () => {
    const { call, hero } = harness();
    const room = (await call('play', { character: hero })).room as AdventureRoom;
    for (const releaseMs of [-1, 1201, 700.5, '800']) {
      const invalid = commit(room);
      invalid.command.action = { ...invalid.command.action, releaseMs: releaseMs as number };
      const result = await call('command', invalid);
      expect(result.status).toBe(409);
      expect(result.error).toContain('Release timing');
    }
    const valid = commit(room);
    Object.assign(valid.command.action, { releaseMs: 700, modifier: 999, roll: 20, executionBonus: 900 });
    const result = await call('command', valid);
    expect(result.status).toBe(200);
    const event = result.room.events.find((entry: { contribution?: boolean }) => entry.contribution);
    expect(event.result.executionBonus).toBe(1);
    expect(event.modifier).toBeLessThan(20);
    expect(event.roll).toBeGreaterThanOrEqual(1);
    expect(event.roll).toBeLessThanOrEqual(20);
  });

  it('persists announced intent and guaranteed protection results with idempotent rewards', async () => {
    const { call, hero, advance } = harness();
    let room = (await call('play', { character: hero })).room as AdventureRoom;
    for (let round = 0; room.chapter === 0 && round < 10; round++) {
      const response = await call('command', commit(room));
      expect(response.status).toBe(200);
      advance(6000);
      room = (await call('read', { roomCode: room.code })).room;
    }
    expect(room.chapter).toBe(1);
    expect(room.enemyIntent).toMatchObject({ sourceId: 'pack', targetActorId: 'player_one', turn: room.turn });
    const xp = room.players.player_one.xp;
    const progress = room.progress;
    const command = { id: crypto.randomUUID(), type: 'act', expectedTurn: room.turn,
      action: { token: 'assist', targetKind: 'hero', targetId: 'player_one', releaseMs: 850 } };
    const result = await call('command', { roomCode: room.code, command });
    expect(result.status).toBe(200);
    expect(result.room.progress).toBe(progress);
    expect(result.room.players.player_one.xp).toBe(xp + 3);
    const event = result.room.events.find((entry: { turn: number; contribution?: boolean }) => entry.turn === room.turn && entry.contribution);
    expect(event.roll).toBeUndefined();
    expect(event.result).toMatchObject({ protection: 3, executionBonus: 1, targetKind: 'hero', targetId: 'player_one' });
    const retry = await call('command', { roomCode: room.code, command });
    expect(retry.room.players.player_one.xp).toBe(xp + 3);
    expect(retry.room.events).toEqual(result.room.events);
  });

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
      if (url.pathname === '/rest/v1/player_ownership') return Response.json(url.searchParams.get('select')==='account_id'?{account_id:'11111111-1111-4111-8111-111111111111'}:[{player_id:'11111111-1111-4111-8111-111111111111'}]);
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
      expect(requested).toEqual(['/auth/v1/user', '/rest/v1/rpc/dropinn_rate_limit', '/rest/v1/player_ownership', '/rest/v1/player_ownership', '/rest/v1/adventure_rooms']);
    } finally { vi.unstubAllGlobals(); }
  });

  it.each([
    { queryStatus: 403, result: { code: '42501', message: 'permission denied for table characters' }, status: 503, message: 'Apply the server character access migration' },
    { queryStatus: 200, result: null, status: 403, message: 'That hero is not available to your account.' },
  ])('distinguishes hero lookup errors from missing ownership ($queryStatus)', async ({ queryStatus, result, status, message }) => {
    const userId = '11111111-1111-4111-8111-111111111111';
    const heroId = '22222222-2222-4222-8222-222222222222';
    const mock = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
      if (url.pathname === '/auth/v1/user') return Response.json({ id: userId });
      if (url.pathname === '/rest/v1/rpc/dropinn_rate_limit') return Response.json(true);
      if (url.pathname === '/rest/v1/player_ownership') return Response.json(url.searchParams.get('select')==='account_id'?{account_id:'11111111-1111-4111-8111-111111111111'}:[{player_id:'11111111-1111-4111-8111-111111111111'}]);
      if (url.pathname === '/rest/v1/characters') {
        expect(url.searchParams.get('id')).toBe(`eq.${heroId}`);
        expect(url.searchParams.get('user_id')).toContain(userId);
        return Response.json(result, { status: queryStatus });
      }
      throw new Error(`Unexpected test request: ${url.pathname}`);
    }) as unknown as typeof fetch;
    const handler = createDropinnHandler({ local: false, env: {
      SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'test-server-key',
    }, fetch: mock });
    const response = await handler(new Request('http://localhost/api/dropinn', {
      method: 'POST', headers: { Authorization: 'Bearer test-session' },
      body: JSON.stringify({ operation: 'play', characterId: heroId, sessionId: 'forged-owner' }),
    }));
    expect(response.status).toBe(status);
    expect((await response.json()).error).toContain(message);
  });

  it('uses stored hosted cosmetics and ignores forged client selections', async () => {
    const userId = '11111111-1111-4111-8111-111111111111';
    const heroId = '22222222-2222-4222-8222-222222222222';
    const appearance = { body: 'squish', eyes: 'sleepy', nose: 'none', mouth: 'flat' };
    const mock = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
      if (url.pathname === '/auth/v1/user') return Response.json({ id: userId });
      if (url.pathname === '/rest/v1/rpc/dropinn_rate_limit') return Response.json(true);
      if (url.pathname === '/rest/v1/player_ownership') return Response.json(url.searchParams.get('select')==='account_id'?{account_id:'11111111-1111-4111-8111-111111111111'}:[{player_id:'11111111-1111-4111-8111-111111111111'}]);
      if (url.pathname === '/rest/v1/characters') return Response.json({ id: heroId, user_id: userId, name: 'Moss', class_key: 'rogue', level: 3, xp: 240,
        accent: '#6EE7B7', appearance, equipment: { hat: 'reed' }, inventory: ['A silver river reed'] });
      if (url.pathname === '/rest/v1/adventure_rooms') return Response.json([]);
      if (url.pathname === '/rest/v1/rpc/dropinn_apply_account_snapshot') return Response.json('applied');
      throw new Error(`Unexpected test request: ${url.pathname}`);
    }) as unknown as typeof fetch;
    const handler = createDropinnHandler({ local: false, env: { SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'test-server-key' }, fetch: mock });
    const response = await handler(new Request('http://localhost/api/dropinn', {
      method: 'POST', headers: { Authorization: 'Bearer test-session' }, body: JSON.stringify({ operation: 'play', characterId: heroId,
        character: { ...createCharacterProfile('Forged', 'fighter'), equipment: { hat: 'moonstone' } } }),
    }));
    expect(response.status).toBe(200);
    const { room } = await response.json();
    expect(room.players[userId].character).toMatchObject({ appearance, equipment: { hat: 'reed' }, classKey: 'rogue', name: 'Moss' });
  });

  it('routes recovered-account commands to its active hero instead of a departed historical hero',async()=>{
    const account='11111111-1111-4111-8111-111111111111',active='22222222-2222-4222-8222-222222222222';
    const {call,hero}=harness();
    const opened=await call('play',{character:hero},account);
    const joined=await call('join',{roomCode:opened.room.code,character:createCharacterProfile('Moss','rogue')},active);
    joined.room.players[account].leftAt=999;
    let writtenActor:string|undefined;
    const unexpected:string[]=[];
    const mock=vi.fn(async(input:RequestInfo|URL,init?:RequestInit)=>{
      const url=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url);
      if(url.pathname==='/auth/v1/user')return Response.json({id:account});
      if(url.pathname==='/rest/v1/rpc/dropinn_rate_limit')return Response.json(true);
      if(url.pathname==='/rest/v1/player_ownership')return Response.json(url.searchParams.get('select')==='account_id'?{account_id:account}:[{player_id:account},{player_id:active}]);
      if(url.pathname==='/rest/v1/adventure_rooms')return Response.json({snapshot:joined.room});
      if(url.pathname==='/rest/v1/adventure_commands')return Response.json(null);
      if(url.pathname==='/rest/v1/adventure_chat')return Response.json([]);
      if(url.pathname==='/rest/v1/rpc/dropinn_apply_account_snapshot'){const body=input instanceof Request?await input.clone().json():JSON.parse(init!.body as string);writtenActor=body.p_user_id;return Response.json('applied');}
      unexpected.push(url.pathname);return Response.json({message:`Unexpected request ${url.pathname}`},{status:400});
    }) as unknown as typeof fetch;
    const handler=createDropinnHandler({local:false,now:()=>1000,fetch:mock,env:{SUPABASE_URL:'https://example.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'test-server-key'}});
    const response=await handler(new Request('http://localhost/api/dropinn',{method:'POST',headers:{Authorization:'Bearer test-session'},body:JSON.stringify({operation:'command',roomCode:joined.room.code,command:{id:'leave-active-hero',type:'leave'}})}));
    expect(unexpected).toEqual([]);expect(response.status,JSON.stringify(await response.json())).toBe(200);expect(writtenActor).toBe(active);
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
