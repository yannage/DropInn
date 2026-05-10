import type { CharacterProfile } from '../character';
import {
  buildRoomView,
  claimRoomReward,
  commitRoomAction,
  continueRoomState,
  createRoomState,
  leaveRoomState,
  startRoomState,
  touchParticipant,
  type RoomState,
  type RoomView,
} from './roomEngine';

const LOCAL_ROOMS_KEY = 'dropinn-local-multiplayer-rooms';
const ROOM_ENDPOINT = '/.netlify/functions/room';

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
}

interface RoomResponsePayload {
  room: RoomView;
}

const usesLocalFallback = () => (
  typeof window !== 'undefined' &&
  (
    window.location.hostname === 'localhost'
    || window.location.hostname === '127.0.0.1'
    || window.location.hostname === '::1'
  )
);

const readLocalRooms = (): Record<string, RoomState> => {
  if (typeof window === 'undefined') return {};

  const raw = window.localStorage.getItem(LOCAL_ROOMS_KEY);
  if (!raw) return {};

  try {
    return JSON.parse(raw) as Record<string, RoomState>;
  } catch {
    return {};
  }
};

const writeLocalRooms = (rooms: Record<string, RoomState>) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(LOCAL_ROOMS_KEY, JSON.stringify(rooms));
};

const requireRoom = (rooms: Record<string, RoomState>, roomCode?: string) => {
  if (!roomCode) {
    throw new Error('A room code is required.');
  }

  const room = rooms[roomCode.toUpperCase()];
  if (!room) {
    throw new Error(`Room ${roomCode.toUpperCase()} was not found.`);
  }

  return room;
};

const localRequest = async (payload: RoomRequestPayload): Promise<RoomResponsePayload> => {
  const now = Date.now();
  const rooms = readLocalRooms();

  if (payload.action === 'create') {
    if (!payload.character) throw new Error('A character is required to create a room.');

    let room = createRoomState(payload.character, payload.sessionId, now);
    while (rooms[room.roomCode]) {
      room = createRoomState(payload.character, payload.sessionId, now);
    }

    rooms[room.roomCode] = room;
    writeLocalRooms(rooms);
    return { room: buildRoomView(room, payload.sessionId, now) };
  }

  const existing = requireRoom(rooms, payload.roomCode);
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

const remoteRequest = async (payload: RoomRequestPayload): Promise<RoomResponsePayload> => {
  const response = await fetch(ROOM_ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Room request failed.');
  }

  return response.json() as Promise<RoomResponsePayload>;
};

const requestRoom = async (payload: RoomRequestPayload): Promise<RoomResponsePayload> => {
  if (usesLocalFallback()) {
    return localRequest(payload);
  }

  return remoteRequest(payload);
};

export const multiplayerApi = {
  createRoom: (sessionId: string, character: CharacterProfile) => requestRoom({
    action: 'create',
    sessionId,
    character,
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
};
