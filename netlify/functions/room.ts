import { getStore } from '@netlify/blobs';
import type { CharacterProfile } from '../../src/lib/character';
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
} from '../../src/lib/multiplayer/roomEngine';

type RoomAction =
  | 'create'
  | 'join'
  | 'sync'
  | 'start'
  | 'commit'
  | 'continue'
  | 'leave'
  | 'claimReward';

interface RoomRequestBody {
  action: RoomAction;
  roomCode?: string;
  sessionId: string;
  character?: CharacterProfile;
  actionId?: string;
}

const store = getStore({ name: 'dropinn-rooms' });

const roomKey = (roomCode: string) => `rooms/${roomCode.toUpperCase()}.json`;

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: {
    'content-type': 'application/json',
    'cache-control': 'no-store',
  },
});

const loadRoom = async (roomCode?: string) => {
  if (!roomCode) {
    throw new Error('Room code is required.');
  }

  const room = await store.get(roomKey(roomCode), { type: 'json' }) as RoomState | null;
  if (!room) {
    throw new Error(`Room ${roomCode.toUpperCase()} was not found.`);
  }

  return room;
};

export default async (request: Request) => {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed.' }, 405);
  }

  try {
    const body = await request.json() as RoomRequestBody;
    const now = Date.now();

    if (body.action === 'create') {
      if (!body.character) {
        return json({ error: 'A character is required.' }, 400);
      }

      let room = createRoomState(body.character, body.sessionId, now);
      for (let attempts = 0; attempts < 6; attempts += 1) {
        const modified = await store.setJSON(roomKey(room.roomCode), room, { onlyIfNew: true });
        if (modified) {
          return json({ room: buildRoomView(room, body.sessionId, now) });
        }

        room = createRoomState(body.character, body.sessionId, now);
      }

      return json({ error: 'Could not allocate a room code. Please try again.' }, 500);
    }

    const existing = await loadRoom(body.roomCode);
    let nextRoom = existing;

    switch (body.action) {
      case 'join':
      case 'sync':
        if (!body.character) {
          return json({ error: 'A character is required.' }, 400);
        }
        nextRoom = touchParticipant(existing, body.sessionId, body.character, now);
        break;
      case 'start':
        nextRoom = startRoomState(existing, body.sessionId, now);
        break;
      case 'commit':
        if (!body.actionId) {
          return json({ error: 'An action is required.' }, 400);
        }
        nextRoom = commitRoomAction(existing, body.sessionId, body.actionId, now);
        break;
      case 'continue':
        nextRoom = continueRoomState(existing, body.sessionId, now);
        break;
      case 'leave':
        nextRoom = leaveRoomState(existing, body.sessionId, now);
        break;
      case 'claimReward':
        nextRoom = claimRoomReward(existing, body.sessionId, now);
        break;
      default:
        return json({ error: 'Unknown room action.' }, 400);
    }

    await store.setJSON(roomKey(nextRoom.roomCode), nextRoom);
    return json({ room: buildRoomView(nextRoom, body.sessionId, now) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected room error.';
    return json({ error: message }, 500);
  }
};
