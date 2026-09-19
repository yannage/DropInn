import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import WebSocket from 'ws';
import { CHARACTER_CLASS_PRESETS, createCharacterProfile, heroAccent, type CharacterClassKey, type CharacterProfile } from '../src/lib/character';
import type { AdventureCommand, AdventureRoom, ChatMessage, CreativeProposal, VisitRecap } from '../src/lib/dropinn/types';
import { createAdventure, getVisitRecap, reduceAdventure, summarizeRoom, validateProposal } from '../src/lib/dropinn/engine';
import { interpretSpotlight, narrateOutcome, prepareVariation, validatePlayerText, type AIOptions, type AdventureVariation, type ServerEnv } from './ai';

interface RequestBody {
  operation: 'list' | 'play' | 'join' | 'read' | 'command' | 'propose' | 'chat' | 'report' | 'history' | 'prepare' | 'narrate';
  sessionId?: string; roomCode?: string; characterId?: string; character?: CharacterProfile;
  command?: AdventureCommand; idea?: string; targetId?: string; text?: string;
  reportedUserId?: string; reason?: string; variationId?: string;
  visibility?: 'public' | 'private'; inviteKey?: string;
}
interface Prepared { owner: string; variation: AdventureVariation; expires: number }
interface LocalState {
  rooms: Map<string, AdventureRoom>; messages: Map<string, ChatMessage[]>;
  reports: { roomCode: string; userId: string; reportedUserId?: string; reason: string; at: number }[];
  commands: Map<string, string>; presence: Map<string, number>;
}
export interface HandlerOptions extends AIOptions { local?: boolean; now?: () => number }
type SaveResult = 'applied' | 'duplicate' | 'conflict';
class RequestError extends Error { constructor(message: string, readonly status = 400) { super(message); } }

function runtimeEnv(): ServerEnv {
  return (globalThis as typeof globalThis & { process?: { env: ServerEnv } }).process?.env ?? {};
}
function codeFrom(value: unknown): string {
  if (typeof value !== 'string' || !/^[A-Z0-9]{4,6}$/.test(value.trim().toUpperCase())) throw new RequestError('Enter a valid adventure code.');
  return value.trim().toUpperCase();
}
function characterFromRow(row: Record<string, unknown>): CharacterProfile {
  const key = row.class_key as CharacterClassKey;
  const base = createCharacterProfile(String(row.name), key);
  return { ...base, id: String(row.id), xp: Number(row.xp), level: Number(row.level), accent: heroAccent(row.accent, key),
    inventory: Array.isArray(row.inventory) ? row.inventory as string[] : [] };
}
function localCharacter(value: CharacterProfile | undefined): CharacterProfile {
  if (!value || typeof value.id !== 'string' || value.id.length > 100 || !CHARACTER_CLASS_PRESETS[value.classKey]) throw new RequestError('Choose a hero first.');
  const name = validatePlayerText(value.name, 18);
  const base = createCharacterProfile(name, value.classKey);
  return { ...base, id: value.id, xp: Math.max(0, Number(value.xp) || 0), level: 3, accent: heroAccent(value.accent, value.classKey),
    inventory: Array.isArray(value.inventory) ? value.inventory.filter((item) => typeof item === 'string').slice(0, 100) : [] };
}
function membership(room: AdventureRoom, userId: string) {
  if (!Object.hasOwn(room.players, userId)) throw new RequestError('Join this adventure to view it.', 403);
}
function activeMembership(room: AdventureRoom, userId: string) {
  membership(room, userId);
  if (room.players[userId].leftAt !== null) throw new RequestError('Rejoin this adventure first.', 403);
}
function recap(room: AdventureRoom, userId: string): VisitRecap {
  return getVisitRecap(room, userId);
}
function bytesToBase64(bytes: Uint8Array): string { return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
function base64ToBytes(value: string): Uint8Array { return Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), (char) => char.charCodeAt(0)); }

/** A handler instance is an isolated local game service, or a stateless Supabase service. */
export function createDropinnHandler(options: HandlerOptions = {}): (request: Request) => Promise<Response> {
  const env = options.env ?? runtimeEnv();
  const local = options.local ?? env.DROPINN_LOCAL === '1';
  const backend = local ? 'local' : 'supabase';
  const now = options.now ?? Date.now;
  const state: LocalState = { rooms: new Map(), messages: new Map(), reports: [], commands: new Map(), presence: new Map() };
  const prepared = new Map<string, Prepared>();
  const limits = new Map<string, { count: number; reset: number }>();
  const narrationCache = new Map<string, Awaited<ReturnType<typeof narrateOutcome>>>();
  const aiOptions = { env, fetch: options.fetch, timeoutMs: options.timeoutMs };
  let supabase: SupabaseClient | undefined;
  let signingKey: Promise<CryptoKey> | undefined;

  function client(): SupabaseClient {
    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) throw new RequestError('The adventure service needs its Supabase server configuration.', 503);
    supabase ??= createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
      // Supabase initializes Realtime even though this handler only uses HTTP.
      // Explicit transport also supports hosts without a global WebSocket.
      // ws uses Node event types; Supabase's transport interface uses DOM events.
      realtime: { transport: WebSocket as unknown as typeof globalThis.WebSocket },
      global: options.fetch ? { fetch: options.fetch } : undefined,
    });
    return supabase;
  }
  function key(): Promise<CryptoKey> {
    const secret = env.DROPINN_SIGNING_SECRET ?? env.SUPABASE_SERVICE_ROLE_KEY ?? (local ? localSecret : '');
    if (!secret) throw new RequestError('Adventure signing is unavailable.', 503);
    signingKey ??= crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
    return signingKey;
  }
  const localSecret = crypto.randomUUID();

  async function signProposal(room: AdventureRoom, userId: string, proposal: CreativeProposal): Promise<CreativeProposal> {
    const value = { ...proposal, id: crypto.randomUUID() };
    const payload = bytesToBase64(new TextEncoder().encode(JSON.stringify({ room: room.code, userId, proposal: value })));
    const signature = await crypto.subtle.sign('HMAC', await key(), new TextEncoder().encode(payload));
    // The effect and text are authenticated too, not merely an opaque proposal ID.
    return { ...value, id: `${payload}.${bytesToBase64(new Uint8Array(signature))}` };
  }
  async function verifyProposal(room: AdventureRoom, userId: string, submitted: CreativeProposal): Promise<CreativeProposal> {
    try {
      if (!submitted || typeof submitted.id !== 'string' || submitted.id.length > 5000) throw new Error();
      const [payload, signature, extra] = submitted.id.split('.');
      if (!payload || !signature || extra) throw new Error();
      if (!await crypto.subtle.verify('HMAC', await key(), base64ToBytes(signature), new TextEncoder().encode(payload))) throw new Error();
      const signed = JSON.parse(new TextDecoder().decode(base64ToBytes(payload)));
      if (signed.room !== room.code || signed.userId !== userId || signed.proposal.turn !== room.turn) throw new Error();
      const expected = { ...signed.proposal, id: submitted.id } as CreativeProposal;
      for (const field of ['turn', 'targetId', 'effect', 'label', 'description', 'idea', 'supported', 'source'] as const) {
        if (expected[field] !== submitted[field]) throw new Error();
      }
      // Engine IDs remain short; only this endpoint accepts and verifies the signed envelope.
      if (!validateProposal(room, signed.proposal)) throw new Error();
      return signed.proposal;
    } catch { throw new RequestError('That creative proposal expired or changed. Preview your idea again.', 409); }
  }
  async function authenticate(request: Request, body: RequestBody): Promise<string> {
    if (local) {
      if (typeof body.sessionId !== 'string' || !/^[a-zA-Z0-9_-]{8,100}$/.test(body.sessionId) || Object.hasOwn(Object.prototype, body.sessionId)) throw new RequestError('A local player session is required.', 401);
      return body.sessionId;
    }
    const token = request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
    if (!token) throw new RequestError('Sign in to play.', 401);
    const { data, error } = await client().auth.getUser(token);
    if (error || !data.user) throw new RequestError('Your session expired. Please reconnect.', 401);
    return data.user.id;
  }
  async function rateLimit(userId: string, bucket: string, maximum: number, seconds = 60) {
    if (!local) {
      const { data, error } = await client().rpc('dropinn_rate_limit', { p_user_id: userId, p_bucket: bucket, p_limit: maximum, p_window_seconds: seconds });
      if (error) throw new RequestError('The adventure service is unavailable. Please retry shortly.', 503);
      if (!data) throw new RequestError('A little too fast. Please try again shortly.', 429);
      return;
    }
    const id = `${userId}:${bucket}`;
    let record = limits.get(id);
    if (!record || record.reset <= now()) { record = { count: 0, reset: now() + seconds * 1000 }; limits.set(id, record); }
    record.count++;
    if (record.count > maximum) throw new RequestError('A little too fast. Please try again shortly.', 429);
  }
  async function load(code: string): Promise<AdventureRoom> {
    if (local) {
      const room = state.rooms.get(code);
      if (!room) throw new RequestError('That adventure could not be found.', 404);
      return structuredClone(room);
    }
    const { data, error } = await client().from('adventure_rooms').select('snapshot').eq('code', code).maybeSingle();
    if (error) throw new RequestError('The adventure could not be loaded.', 503);
    if (!data) throw new RequestError('That adventure could not be found.', 404);
    return data.snapshot as AdventureRoom;
  }
  async function list(): Promise<AdventureRoom[]> {
    if (local) return Promise.all([...state.rooms.values()].filter((room) => room.status !== 'completed' && room.visibility !== 'private').map((room) => reconcilePresence(structuredClone(room))));
    const { data, error } = await client().from('adventure_rooms').select('snapshot').neq('status', 'completed')
      .or('snapshot->>visibility.is.null,snapshot->>visibility.eq.public').order('updated_at', { ascending: false }).limit(50);
    if (error) throw new RequestError('Adventures could not be loaded.', 503);
    return Promise.all(data.map((row) => reconcilePresence(row.snapshot as AdventureRoom)));
  }
  async function wasApplied(code: string, commandId: string, userId: string): Promise<boolean> {
    if (local) {
      const actor = state.commands.get(`${code}:${commandId}`);
      if (actor && actor !== userId) throw new RequestError('Use a new command identifier.', 409);
      return !!actor;
    }
    const { data, error } = await client().from('adventure_commands').select('user_id').eq('room_code', code).eq('command_id', commandId).maybeSingle();
    if (error) throw new RequestError('Your action could not be checked.', 503);
    if (data && data.user_id !== userId) throw new RequestError('Use a new command identifier.', 409);
    return !!data;
  }
  async function save(room: AdventureRoom, expectedRevision: number, commandId: string, userId: string): Promise<SaveResult> {
    if (local) {
      if (state.commands.has(`${room.code}:${commandId}`)) return 'duplicate';
      const previous = state.rooms.get(room.code);
      if ((previous?.revision ?? -1) !== expectedRevision) return 'conflict';
      state.rooms.set(room.code, structuredClone(room));
      state.commands.set(`${room.code}:${commandId}`, userId);
      return 'applied';
    }
    const { data, error } = await client().rpc('dropinn_apply_snapshot', { p_code: room.code, p_expected_revision: expectedRevision,
      p_command_id: commandId, p_user_id: userId, p_snapshot: room });
    if (error) throw new RequestError('Your action could not be saved. Please retry.', 503);
    return data as SaveResult;
  }
  async function characterFor(body: RequestBody, userId: string): Promise<CharacterProfile> {
    if (local) return localCharacter(body.character);
    if (!body.characterId) throw new RequestError('Choose a saved hero first.');
    const { data, error } = await client().from('characters').select('*').eq('id', body.characterId).eq('user_id', userId).maybeSingle();
    if (error) {
      if (error.code === '42501') throw new RequestError('The adventure server cannot read saved heroes. Apply the server character access migration in Supabase.', 503);
      throw new RequestError('Your saved hero could not be loaded. Please retry shortly.', 503);
    }
    if (!data) throw new RequestError('That hero is not available to your account.', 403);
    return characterFromRow(data);
  }
  async function heartbeat(code: string, userId: string) {
    if (local) { state.presence.set(`${code}:${userId}`, now()); return; }
    const { error } = await client().from('adventure_members').update({ last_seen_at: new Date(now()).toISOString() }).eq('room_code', code).eq('user_id', userId);
    if (error) throw new RequestError('Presence could not be updated. Please reconnect.', 503);
  }
  async function reconcilePresence(input: AdventureRoom): Promise<AdventureRoom> {
    if (input.status === 'completed') return input;
    let room = input;
    const active = Object.values(input.players).filter((player) => player.leftAt === null);
    const seen = new Map<string, number>();
    if (local) active.forEach((player) => seen.set(player.userId, state.presence.get(`${room.code}:${player.userId}`) ?? player.joinedAt));
    else {
      const { data, error } = await client().from('adventure_members').select('user_id,last_seen_at').eq('room_code', room.code).is('left_at', null);
      if (error) throw new RequestError('Adventure presence could not be checked.', 503);
      data.forEach((row) => seen.set(row.user_id, Date.parse(row.last_seen_at)));
    }
    for (const player of active) {
      if ((seen.get(player.userId) ?? player.joinedAt) + 65_000 < now()) {
        room = await mutate(room.code, { id: crypto.randomUUID(), type: 'leave', userId: player.userId });
      }
    }
    return room;
  }
  async function mutate(code: string, command: AdventureCommand): Promise<AdventureRoom> {
    for (let attempt = 0; attempt < 8; attempt++) {
      const room = await load(code);
      if (command.type !== 'join') membership(room, command.userId);
      if (await wasApplied(code, command.id, command.userId)) return room;
      let verified = command;
      if (command.type === 'act' && command.action?.token === 'spotlight') {
        verified = { ...command, action: { ...command.action, proposal: await verifyProposal(room, command.userId, command.action.proposal!) } };
      }
      let next: AdventureRoom;
      try { next = reduceAdventure(room, verified, now()); }
      catch (error) { throw new RequestError(error instanceof Error ? error.message.slice(0, 180) : 'That action is unavailable.', 409); }
      if (next.revision === room.revision) return room;
      const outcome = await save(next, room.revision, command.id, command.userId);
      if (outcome === 'applied') return next;
      if (outcome === 'duplicate') return load(code);
    }
    throw new RequestError('The party is moving quickly. Please retry your action.', 409);
  }
  async function messagesFor(code: string): Promise<ChatMessage[]> {
    if (local) return state.messages.get(code) ?? [];
    const { data, error } = await client().from('adventure_chat').select('id,user_id,name,text,created_at').eq('room_code', code).order('created_at', { ascending: false }).limit(60);
    if (error) throw new RequestError('Conversation could not be loaded.', 503);
    return data.reverse().map((row) => ({ id: row.id, userId: row.user_id, name: row.name, text: row.text, at: Date.parse(row.created_at) }));
  }

  return async function handle(request: Request): Promise<Response> {
    const reply = (value: Record<string, unknown>, status = 200) => new Response(JSON.stringify({ ...value, backend }), {
      status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
    });
    if (request.method !== 'POST') return reply({ error: 'Use POST for adventure requests.' }, 405);
    try {
      const text = await request.text();
      if (text.length > 16000) throw new RequestError('That request is too large.', 413);
      let body: RequestBody;
      try { body = JSON.parse(text); } catch { throw new RequestError('Send a valid JSON request.'); }
      if (!body || typeof body !== 'object' || Array.isArray(body)) throw new RequestError('Send a valid adventure request.');
      const userId = await authenticate(request, body);
      await rateLimit(userId, 'requests', 240);
      if (body.operation === 'list') return reply({ rooms: (await list()).map(summarizeRoom) });
      if (body.operation === 'history') {
        let rooms: AdventureRoom[];
        if (local) rooms = [...state.rooms.values()].filter((room) => room.players[userId]);
        else {
          const { data, error } = await client().from('adventure_members').select('room_code').eq('user_id', userId).order('joined_at', { ascending: false }).limit(40);
          if (error) throw new RequestError('Your adventure history could not be loaded.', 503);
          rooms = await Promise.all(data.map((row) => load(row.room_code)));
        }
        return reply({ recaps: rooms.sort((a, b) => b.updatedAt - a.updatedAt).map((room) => recap(room, userId)) });
      }
      if (body.operation === 'prepare') {
        await rateLimit(userId, 'ai', 12);
        const variation = await prepareVariation(aiOptions);
        const variationId = crypto.randomUUID();
        const expires = now() + 15 * 60_000;
        if (local) prepared.set(variationId, { owner: userId, variation, expires });
        else {
          const { error } = await client().from('adventure_prepared').insert({ id: variationId, user_id: userId, variation, expires_at: new Date(expires).toISOString() });
          if (error) throw new RequestError('Your new telling could not be prepared.', 503);
        }
        return reply({ variationId, variation });
      }
      if (body.operation === 'play' || body.operation === 'join') {
        if (body.visibility !== undefined && !['public', 'private'].includes(body.visibility)) throw new RequestError('Choose a public or friend table.');
        await rateLimit(userId, 'join', 20);
        const character = await characterFor(body, userId);
        const command = { id: crypto.randomUUID(), type: 'join' as const, userId, character, inviteKey: typeof body.inviteKey === 'string' ? body.inviteKey : undefined };
        if (body.operation === 'join') {
          const code = codeFrom(body.roomCode);
          const current = await load(code);
          if (current.visibility === 'private' && !current.players[userId]
            && (!current.inviteKey || current.inviteKey !== command.inviteKey)) throw new RequestError('Use the invitation link to join this friend table.', 409);
          // Private rooms are not scanned by public discovery. Reclaim stale
          // seats for an authorized visitor before checking admission.
          await reconcilePresence(current);
          const room = await mutate(code, command);
          await heartbeat(room.code, userId);
          return reply({ room, messages: await messagesFor(room.code) });
        }
        if (!body.variationId && body.visibility !== 'private') {
          const candidates = (await list()).sort((a, b) => Number(b.status === 'active') - Number(a.status === 'active') || b.updatedAt - a.updatedAt);
          for (const candidate of candidates) {
            if (summarizeRoom(candidate).openSeats === 0 && !candidate.players[userId]) continue;
            try {
              const room = await mutate(candidate.code, command);
              await heartbeat(room.code, userId);
              return reply({ room, messages: await messagesFor(room.code) });
            } catch (error) {
              if (error instanceof RequestError && error.status >= 500) throw error;
              // Another join may have filled the final seat; try another room.
            }
          }
        }
        let variation: AdventureVariation | undefined;
        if (body.variationId) {
          if (local) {
            const draft = prepared.get(body.variationId);
            if (draft?.owner === userId && draft.expires > now()) { variation = draft.variation; prepared.delete(body.variationId); }
          } else {
            const { data, error } = await client().from('adventure_prepared').delete().eq('id', body.variationId).eq('user_id', userId).gt('expires_at', new Date(now()).toISOString()).select('variation').maybeSingle();
            if (error) throw new RequestError('Your prepared telling could not be loaded.', 503);
            variation = data?.variation;
          }
          if (!variation) throw new RequestError('That prepared telling expired. Prepare it again.', 409);
        }
        for (let attempt = 0; attempt < 8; attempt++) {
          const room = createAdventure(character, userId, now());
          if (body.visibility === 'private') {
            room.visibility = 'private';
            room.inviteKey = crypto.randomUUID().replace(/-/g, '');
          }
          if (variation) room.variation = variation;
          if (await save(room, -1, command.id, userId) === 'applied') return reply({ room, messages: [] });
        }
        throw new RequestError('A fresh adventure could not be opened. Please retry.', 503);
      }
      const code = codeFrom(body.roomCode);
      let room = await load(code);
      membership(room, userId);
      if (body.operation === 'read') {
        await heartbeat(code, userId);
        room = await reconcilePresence(room);
        room = await mutate(code, { id: crypto.randomUUID(), type: 'tick', userId });
        return reply({ room, messages: await messagesFor(code) });
      }
      if (body.operation === 'command') {
        const input = body.command;
        if (!input || typeof input.id !== 'string' || !/^[a-zA-Z0-9_-]{8,100}$/.test(input.id) || !['act', 'leave', 'tick', 'react'].includes(input.type)) throw new RequestError('That action is not supported.');
        const command: AdventureCommand = { id: input.id, type: input.type, userId,
          expectedTurn: input.expectedTurn, expectedRevision: input.expectedRevision, action: input.action, reaction: input.reaction };
        room = await mutate(code, command);
        return reply({ room, messages: await messagesFor(code) });
      }
      if (body.operation === 'propose') {
        activeMembership(room, userId);
        if (room.phase !== 'choosing' || room.status !== 'active' || now() >= room.deadline || !room.players[userId].seatId) throw new RequestError('Wait for the next action window.', 409);
        if (room.players[userId].spotlightChapters.includes(room.chapter)) throw new RequestError('Your Spotlight token returns next chapter.', 409);
        if (room.commits[userId]) throw new RequestError('Your action is already committed for this turn.', 409);
        await rateLimit(userId, 'ai', 12);
        const proposal = await interpretSpotlight(room, body.idea, body.targetId ?? '', aiOptions);
        return reply({ proposal: proposal.supported ? await signProposal(room, userId, proposal) : proposal });
      }
      if (body.operation === 'narrate') {
        if (room.phase !== 'reveal' && room.status !== 'completed') throw new RequestError('There is no new resolution to narrate yet.', 409);
        const cacheKey = `${code}:${room.turn}:${room.events.at(-1)?.id}`;
        let narration = narrationCache.get(cacheKey);
        if (!narration) {
          await rateLimit(userId, 'ai', 12);
          narration = await narrateOutcome(room, aiOptions);
          narrationCache.set(cacheKey, narration);
          if (narrationCache.size > 200) narrationCache.delete(narrationCache.keys().next().value!);
        }
        return reply(narration);
      }
      if (body.operation === 'chat') {
        activeMembership(room, userId);
        await rateLimit(userId, 'chat', 8, 30);
        const message: ChatMessage = { id: crypto.randomUUID(), userId, name: room.players[userId].character.name, text: validatePlayerText(body.text, 300), at: now() };
        if (local) state.messages.set(code, [...(state.messages.get(code) ?? []), message].slice(-60));
        else {
          const { error } = await client().from('adventure_chat').insert({ id: message.id, room_code: code, user_id: userId, name: message.name, text: message.text });
          if (error) throw new RequestError('Your message could not be sent.', 503);
        }
        return reply({ messages: await messagesFor(code) });
      }
      if (body.operation === 'report') {
        await rateLimit(userId, 'report', 5, 300);
        const reason = validatePlayerText(body.reason, 500);
        if (body.reportedUserId && !room.players[body.reportedUserId]) throw new RequestError('That player is not in this adventure.');
        if (local) state.reports.push({ roomCode: code, userId, reportedUserId: body.reportedUserId, reason, at: now() });
        else {
          const { error } = await client().from('adventure_reports').insert({ room_code: code, user_id: userId, reported_user_id: body.reportedUserId ?? null, reason });
          if (error) throw new RequestError('Your report could not be saved.', 503);
        }
        return reply({ reported: true });
      }
      throw new RequestError('That operation is not supported.');
    } catch (error) {
      if (error instanceof RequestError) return reply({ error: error.message }, error.status);
      // Validation messages are deliberately readable; infrastructure errors never expose credentials.
      if (error instanceof Error && /^(?:Please |Use between |Choose something)/.test(error.message)) return reply({ error: error.message }, 400);
      return reply({ error: 'The adventure service hit a snag. Please retry.' }, 503);
    }
  };
}

let defaultHandler: ReturnType<typeof createDropinnHandler> | undefined;
export async function handleDropinnRequest(request: Request): Promise<Response> {
  defaultHandler ??= createDropinnHandler();
  return defaultHandler(request);
}
