import { create } from 'zustand';
import { multiplayerApi } from '../lib/multiplayer/api';
import type { CharacterProfile } from '../lib/character';
import type { RoomView } from '../lib/multiplayer/roomEngine';
import { getSelectedCharacter, usePlayerStore } from './playerStore';

interface MultiplayerState {
  room: RoomView | null;
  loading: boolean;
  error: string | null;

  clearError: () => void;
  createRoom: (character: CharacterProfile) => Promise<void>;
  joinRoom: (roomCode: string, character: CharacterProfile) => Promise<void>;
  syncRoom: () => Promise<void>;
  startRoom: () => Promise<void>;
  commitAction: (actionId: string) => Promise<void>;
  continueRoom: () => Promise<void>;
  leaveRoom: () => Promise<void>;
  claimReward: () => Promise<boolean>;
}

const withRequest = async (
  set: (partial: Partial<MultiplayerState>) => void,
  run: () => Promise<void>,
  options: { loading?: boolean } = {},
) => {
  const loading = options.loading ?? true;
  if (loading) {
    set({ loading: true, error: null });
  } else {
    set({ error: null });
  }
  try {
    await run();
  } catch (error) {
    set({ error: error instanceof Error ? error.message : 'Something went wrong.' });
  } finally {
    if (loading) {
      set({ loading: false });
    }
  }
};

const getSession = () => usePlayerStore.getState().sessionId;

export const useMultiplayerStore = create<MultiplayerState>((set, get) => ({
  room: null,
  loading: false,
  error: null,

  clearError: () => set({ error: null }),

  createRoom: async (character) => withRequest(set, async () => {
    const response = await multiplayerApi.createRoom(getSession(), character);
    usePlayerStore.getState().setActiveRoomCode(response.room.roomCode);
    set({ room: response.room });
  }),

  joinRoom: async (roomCode, character) => withRequest(set, async () => {
    const response = await multiplayerApi.joinRoom(roomCode, getSession(), character);
    usePlayerStore.getState().setActiveRoomCode(response.room.roomCode);
    set({ room: response.room });
  }),

  syncRoom: async () => withRequest(set, async () => {
    const playerState = usePlayerStore.getState();
    const selectedCharacter = getSelectedCharacter(playerState);
    if (!playerState.activeRoomCode || !selectedCharacter) return;

    const response = await multiplayerApi.syncRoom(playerState.activeRoomCode, playerState.sessionId, selectedCharacter);
    set({ room: response.room });
  }, { loading: false }),

  startRoom: async () => withRequest(set, async () => {
    const roomCode = get().room?.roomCode ?? usePlayerStore.getState().activeRoomCode;
    if (!roomCode) return;

    const response = await multiplayerApi.startRoom(roomCode, getSession());
    set({ room: response.room });
  }),

  commitAction: async (actionId) => withRequest(set, async () => {
    const roomCode = get().room?.roomCode ?? usePlayerStore.getState().activeRoomCode;
    if (!roomCode) return;

    const response = await multiplayerApi.commitAction(roomCode, getSession(), actionId);
    set({ room: response.room });
  }),

  continueRoom: async () => withRequest(set, async () => {
    const roomCode = get().room?.roomCode ?? usePlayerStore.getState().activeRoomCode;
    if (!roomCode) return;

    const response = await multiplayerApi.continueRoom(roomCode, getSession());
    set({ room: response.room });
  }),

  leaveRoom: async () => withRequest(set, async () => {
    const roomCode = get().room?.roomCode ?? usePlayerStore.getState().activeRoomCode;
    if (roomCode) {
      await multiplayerApi.leaveRoom(roomCode, getSession());
    }

    usePlayerStore.getState().setActiveRoomCode(null);
    set({ room: null });
  }),

  claimReward: async () => {
    let claimed = false;

    await withRequest(set, async () => {
      const roomCode = get().room?.roomCode ?? usePlayerStore.getState().activeRoomCode;
      if (!roomCode) return;

      const before = get().room;
      const response = await multiplayerApi.claimReward(roomCode, getSession());
      set({ room: response.room });

      claimed = Boolean(before?.canClaimReward && !response.room.canClaimReward);
    });

    return claimed;
  },
}));
