import type { RealtimeChannel } from '@supabase/supabase-js';
import type { CharacterProfile } from '../character';
import { isLocalhost, isSupabaseConfigured, requireSupabaseClient, shouldUseLocalDevFallback } from '../supabase/client';
import {
  buildRoomView,
  claimRoomReward,
  commitRoomAction,
  continueRoomState,
  createRoomState,
  leaveRoomState,
  startRoomState,
  touchParticipant,
  type RoomMode,
  type RoomParticipantState,
  type RoomState,
  type RoomView,
} from './roomEngine';

const LOCAL_ROOMS_KEY = 'dropinn-local-multiplayer-rooms';

type RoomAction =
  | 'create'
  | 'join'
  | 'sync'
  | 'start'
  | 'commit'
  | 'continue'
  | 'leave'
  | 'claimReward';

interface RoomRequestPayload {
  action: RoomAction;
  roomCode?: string;
  sessionId: string;
  character?: CharacterProfile;
  actionId?: string;
  roomMode?: RoomMode;
}

interface RoomResponsePayload {
  room: RoomView;
}

interface RoomRow {
  id: string;
  room_code: string;
  room_mode: RoomMode | null;
  campaign_title: string;
  host_user_id: string;
  created_at: string;
  updated_at: string;
  round_duration_ms: number;
  status: RoomState['status'];
  scene_round: number;
  turn: number;
  turn_started_at: string | null;
  current_story_text: string;
  story_log: RoomState['storyLog'];
  action_commits: RoomState['actionCommits'];
  continue_votes: RoomState['continueVotes'];
  reward_claims: RoomState['rewardClaims'];
  last_results: RoomState['lastResults'];
  battle_state: RoomState['battleState'] | null;
  story_arc_state: RoomState['storyArcState'] | null;
  completed_at: string | null;
  last_resolved_turn_key: string | null;
}

interface ParticipantRow {
  room_id: string;
  user_id: string;
  character_snapshot: CharacterProfile;
  joined_at: string;
  last_seen_at: string;
  left_at: string | null;
}

type RoomSubscriber = (room: RoomView) => void;

const normalizeRoomCode = (roomCode: string) => roomCode.trim().toUpperCase();

const toIso = (timestamp: number | null) => (
  timestamp == null ? null : new Date(timestamp).toISOString()
);

const fromIso = (timestamp: string | null) => (
  timestamp == null ? null : new Date(timestamp).getTime()
);

const shouldFallbackToLocalSchema = (error: unknown) => {
  const message = typeof error === 'object' && error != null && 'message' in error
    ? String((error as { message?: unknown }).message ?? '')
    : error instanceof Error
      ? error.message
      : String(error);
  return isLocalhost() && /(room_mode|story_arc_state|battle_state)/i.test(message);
};

const normalizeStoredRoom = (room: RoomState): RoomState => ({
  ...room,
  roomMode: room.roomMode ?? 'battle',
  battleState: room.battleState ?? null,
  storyArcState: room.storyArcState ?? null,
});

const readLocalRooms = (): Record<string, RoomState> => {
  if (typeof window === 'undefined') return {};

  const raw = window.localStorage.getItem(LOCAL_ROOMS_KEY);
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw) as Record<string, RoomState>;
    return Object.fromEntries(
      Object.entries(parsed).map(([code, room]) => [code, normalizeStoredRoom(room)]),
    );
  } catch {
    return {};
  }
};

const writeLocalRooms = (rooms: Record<string, RoomState>) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(LOCAL_ROOMS_KEY, JSON.stringify(rooms));
};

const hasLocalRoom = (roomCode?: string) => {
  if (!roomCode) return false;
  const rooms = readLocalRooms();
  return Boolean(rooms[normalizeRoomCode(roomCode)]);
};

const requireLocalRoom = (rooms: Record<string, RoomState>, roomCode?: string) => {
  if (!roomCode) {
    throw new Error('A room code is required.');
  }

  const normalizedCode = normalizeRoomCode(roomCode);
  const room = rooms[normalizedCode];
  if (!room) {
    throw new Error(`Room ${normalizedCode} was not found.`);
  }

  return room;
};

const localRequest = async (payload: RoomRequestPayload): Promise<RoomResponsePayload> => {
  const now = Date.now();
  const rooms = readLocalRooms();

  if (payload.action === 'create') {
    if (!payload.character) throw new Error('A character is required to create a room.');

    let room = createRoomState(payload.character, payload.sessionId, now, payload.roomMode ?? 'battle');
    while (rooms[room.roomCode]) {
      room = createRoomState(payload.character, payload.sessionId, now, payload.roomMode ?? 'battle');
    }

    rooms[room.roomCode] = room;
    writeLocalRooms(rooms);
    return { room: buildRoomView(room, payload.sessionId, now) };
  }

  const existing = requireLocalRoom(rooms, payload.roomCode);
  let nextRoom = existing;

  switch (payload.action) {
    case 'join':
    case 'sync':
      if (!payload.character) throw new Error('A character is required.');
      nextRoom = touchParticipant(existing, payload.sessionId, payload.character, now);
      break;
    case 'start':
      nextRoom = startRoomState(existing, payload.sessionId, now);
      break;
    case 'commit':
      if (!payload.actionId) throw new Error('An action is required.');
      nextRoom = commitRoomAction(existing, payload.sessionId, payload.actionId, now);
      break;
    case 'continue':
      nextRoom = continueRoomState(existing, payload.sessionId, now);
      break;
    case 'leave':
      nextRoom = leaveRoomState(existing, payload.sessionId, now);
      break;
    case 'claimReward':
      nextRoom = claimRoomReward(existing, payload.sessionId, now);
      break;
    default:
      break;
  }

  rooms[nextRoom.roomCode] = nextRoom;
  writeLocalRooms(rooms);

  return { room: buildRoomView(nextRoom, payload.sessionId, now) };
};

const roomRowToState = (row: RoomRow, participants: ParticipantRow[]): RoomState => ({
  id: row.id,
  roomCode: row.room_code,
  roomMode: row.room_mode ?? 'battle',
  campaignTitle: row.campaign_title,
  hostSessionId: row.host_user_id,
  createdAt: fromIso(row.created_at) ?? Date.now(),
  updatedAt: fromIso(row.updated_at) ?? Date.now(),
  roundDurationMs: row.round_duration_ms,
  status: row.status,
  sceneRound: row.scene_round,
  turn: row.turn,
  turnStartedAt: fromIso(row.turn_started_at),
  currentStoryText: row.current_story_text,
  storyLog: row.story_log ?? [],
  actionCommits: row.action_commits ?? {},
  continueVotes: row.continue_votes ?? {},
  rewardClaims: row.reward_claims ?? {},
  lastResults: row.last_results ?? [],
  battleState: row.battle_state ?? null,
  storyArcState: row.story_arc_state ?? null,
  participants: participants.map<RoomParticipantState>((participant) => ({
    sessionId: participant.user_id,
    character: participant.character_snapshot,
    joinedAt: fromIso(participant.joined_at) ?? Date.now(),
    lastSeenAt: fromIso(participant.last_seen_at) ?? Date.now(),
    leftAt: fromIso(participant.left_at),
  })),
  completedAt: fromIso(row.completed_at),
  lastResolvedTurnKey: row.last_resolved_turn_key,
});

const roomStateToPatch = (room: RoomState) => ({
  room_code: room.roomCode,
  room_mode: room.roomMode,
  campaign_title: room.campaignTitle,
  host_user_id: room.hostSessionId,
  round_duration_ms: room.roundDurationMs,
  status: room.status,
  scene_round: room.sceneRound,
  turn: room.turn,
  turn_started_at: toIso(room.turnStartedAt),
  current_story_text: room.currentStoryText,
  story_log: room.storyLog,
  action_commits: room.actionCommits,
  continue_votes: room.continueVotes,
  reward_claims: room.rewardClaims,
  last_results: room.lastResults,
  battle_state: room.battleState,
  story_arc_state: room.storyArcState,
  completed_at: toIso(room.completedAt),
  last_resolved_turn_key: room.lastResolvedTurnKey,
  updated_at: toIso(room.updatedAt),
});

const fetchSupabaseRoomState = async (roomCode: string) => {
  const supabase = requireSupabaseClient();
  const normalizedCode = normalizeRoomCode(roomCode);
  const { data: roomRow, error: roomError } = await supabase
    .from('rooms')
    .select('*')
    .eq('room_code', normalizedCode)
    .maybeSingle();

  if (roomError) throw roomError;
  if (!roomRow) throw new Error(`Room ${normalizedCode} was not found.`);

  const { data: participantRows, error: participantsError } = await supabase
    .from('room_participants')
    .select('*')
    .eq('room_id', roomRow.id)
    .order('joined_at', { ascending: true });

  if (participantsError) throw participantsError;

  return roomRowToState(roomRow as RoomRow, (participantRows ?? []) as ParticipantRow[]);
};

const saveSupabaseRoomState = async (room: RoomState) => {
  if (!room.id) throw new Error('Room database id is missing.');

  const supabase = requireSupabaseClient();
  const { error } = await supabase
    .from('rooms')
    .update(roomStateToPatch(room))
    .eq('id', room.id);

  if (error) throw error;
};

const upsertSupabaseParticipant = async (
  roomId: string,
  sessionId: string,
  character: CharacterProfile,
  now: number,
  leftAt: number | null = null,
) => {
  const supabase = requireSupabaseClient();
  const { error } = await supabase
    .from('room_participants')
    .upsert({
      room_id: roomId,
      user_id: sessionId,
      character_id: character.id,
      character_snapshot: character,
      last_seen_at: toIso(now),
      left_at: toIso(leftAt),
    }, { onConflict: 'room_id,user_id' });

  if (error) throw error;
};

const insertTurnAction = async (
  room: RoomState,
  sessionId: string,
  character: CharacterProfile,
  actionId: string,
  now: number,
) => {
  if (!room.id) return;

  const supabase = requireSupabaseClient();
  const { error } = await supabase
    .from('turn_actions')
    .insert({
      room_id: room.id,
      user_id: sessionId,
      character_id: character.id,
      scene_round: room.sceneRound,
      turn: room.turn,
      action_id: actionId,
      committed_at: toIso(now),
    });

  if (error && error.code !== '23505') throw error;
};

const supabaseRequest = async (payload: RoomRequestPayload): Promise<RoomResponsePayload> => {
  const now = Date.now();

  if (payload.action === 'create') {
    if (!payload.character) throw new Error('A character is required to create a room.');

    let room = createRoomState(payload.character, payload.sessionId, now, payload.roomMode ?? 'battle');
    let insertedRoom: RoomRow | null = null;
    const supabase = requireSupabaseClient();

    for (let attempts = 0; attempts < 5 && !insertedRoom; attempts += 1) {
      const { data, error } = await supabase
        .from('rooms')
        .insert({
          ...roomStateToPatch(room),
          created_at: toIso(room.createdAt),
        })
        .select('*')
        .single();

      if (!error) {
        insertedRoom = data as RoomRow;
      } else if (error.code === '23505') {
        room = createRoomState(payload.character, payload.sessionId, now, payload.roomMode ?? 'battle');
      } else {
        throw error;
      }
    }

    if (!insertedRoom) throw new Error('Unable to create a unique room code.');

    room.id = insertedRoom.id;
    await upsertSupabaseParticipant(insertedRoom.id, payload.sessionId, payload.character, now);

    return { room: buildRoomView(room, payload.sessionId, now) };
  }

  const existing = await fetchSupabaseRoomState(payload.roomCode ?? '');
  let nextRoom = existing;

  switch (payload.action) {
    case 'join':
    case 'sync':
      if (!payload.character) throw new Error('A character is required.');
      nextRoom = touchParticipant(existing, payload.sessionId, payload.character, now);
      if (nextRoom.id) {
        await upsertSupabaseParticipant(nextRoom.id, payload.sessionId, payload.character, now);
      }
      break;
    case 'start':
      nextRoom = startRoomState(existing, payload.sessionId, now);
      break;
    case 'commit': {
      if (!payload.actionId) throw new Error('An action is required.');
      const participant = existing.participants.find((entry) => entry.sessionId === payload.sessionId);
      if (participant && !existing.actionCommits[payload.sessionId]) {
        await insertTurnAction(existing, payload.sessionId, participant.character, payload.actionId, now);
      }
      nextRoom = commitRoomAction(existing, payload.sessionId, payload.actionId, now);
      break;
    }
    case 'continue':
      nextRoom = continueRoomState(existing, payload.sessionId, now);
      break;
    case 'leave': {
      nextRoom = leaveRoomState(existing, payload.sessionId, now);
      const participant = existing.participants.find((entry) => entry.sessionId === payload.sessionId);
      if (participant && existing.id) {
        await upsertSupabaseParticipant(existing.id, payload.sessionId, participant.character, now, now);
      }
      break;
    }
    case 'claimReward':
      nextRoom = claimRoomReward(existing, payload.sessionId, now);
      break;
    default:
      break;
  }

  await saveSupabaseRoomState(nextRoom);

  return { room: buildRoomView(nextRoom, payload.sessionId, now) };
};

const requestRoom = async (payload: RoomRequestPayload): Promise<RoomResponsePayload> => {
  if (isLocalhost() && hasLocalRoom(payload.roomCode)) {
    return localRequest(payload);
  }

  if (isSupabaseConfigured()) {
    try {
      return await supabaseRequest(payload);
    } catch (error) {
      if (shouldFallbackToLocalSchema(error)) {
        return localRequest(payload);
      }
      throw error;
    }
  }

  if (shouldUseLocalDevFallback()) {
    return localRequest(payload);
  }

  throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Netlify.');
};

const subscribeToRoom = async (
  roomCode: string,
  sessionId: string,
  onRoom: RoomSubscriber,
) => {
  if (!isSupabaseConfigured()) return () => undefined;
  if (isLocalhost() && hasLocalRoom(roomCode)) return () => undefined;

  const supabase = requireSupabaseClient();
  let state: RoomState;
  try {
    state = await fetchSupabaseRoomState(roomCode);
  } catch (error) {
    if (shouldFallbackToLocalSchema(error)) {
      return () => undefined;
    }
    throw error;
  }
  const channelName = `room:${state.roomCode}:${sessionId}`;
  let channel: RealtimeChannel | null = supabase.channel(channelName);

  const publishLatest = async () => {
    try {
      const latest = await fetchSupabaseRoomState(roomCode);
      onRoom(buildRoomView(latest, sessionId, Date.now()));
    } catch {
      // Polling remains the fallback path in the store; subscriptions should not crash the UI.
    }
  };

  channel
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'rooms',
      filter: `room_code=eq.${state.roomCode}`,
    }, () => { void publishLatest(); })
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'room_participants',
      filter: `room_id=eq.${state.id}`,
    }, () => { void publishLatest(); })
    .subscribe();

  return () => {
    if (channel) {
      void supabase.removeChannel(channel);
      channel = null;
    }
  };
};

export const multiplayerApi = {
  createRoom: (sessionId: string, character: CharacterProfile, roomMode: RoomMode) => requestRoom({
    action: 'create',
    sessionId,
    character,
    roomMode,
  }),

  joinRoom: (roomCode: string, sessionId: string, character: CharacterProfile) => requestRoom({
    action: 'join',
    roomCode,
    sessionId,
    character,
  }),

  syncRoom: (roomCode: string, sessionId: string, character: CharacterProfile) => requestRoom({
    action: 'sync',
    roomCode,
    sessionId,
    character,
  }),

  startRoom: (roomCode: string, sessionId: string) => requestRoom({
    action: 'start',
    roomCode,
    sessionId,
  }),

  commitAction: (roomCode: string, sessionId: string, actionId: string) => requestRoom({
    action: 'commit',
    roomCode,
    sessionId,
    actionId,
  }),

  continueRoom: (roomCode: string, sessionId: string) => requestRoom({
    action: 'continue',
    roomCode,
    sessionId,
  }),

  leaveRoom: (roomCode: string, sessionId: string) => requestRoom({
    action: 'leave',
    roomCode,
    sessionId,
  }),

  claimReward: (roomCode: string, sessionId: string) => requestRoom({
    action: 'claimReward',
    roomCode,
    sessionId,
  }),

  subscribeToRoom,
};
