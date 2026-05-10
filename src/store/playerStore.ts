import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  DEFAULT_CHARACTER,
  createCharacterProfile,
  sanitizeCharacterName,
  type CharacterClassKey,
  type CharacterProfile,
} from '../lib/character';

interface PlayerState {
  sessionId: string;
  characters: CharacterProfile[];
  selectedCharacterId: string;
  activeRoomCode: string | null;

  createCharacter: (name: string, classKey: CharacterClassKey) => CharacterProfile | null;
  selectCharacter: (characterId: string) => void;
  updateSelectedCharacter: (updater: (character: CharacterProfile) => CharacterProfile) => void;
  setActiveRoomCode: (roomCode: string | null) => void;
}

const makeSessionId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `session_${Math.random().toString(36).slice(2, 10)}`;
};

const getPlayerStoreName = () => {
  if (typeof window === 'undefined') {
    return 'dropinn-player-state';
  }

  const namespace = new URLSearchParams(window.location.search).get('session')?.trim();
  return namespace
    ? `dropinn-player-state-${namespace.slice(0, 24)}`
    : 'dropinn-player-state';
};

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set) => ({
      sessionId: makeSessionId(),
      characters: [DEFAULT_CHARACTER],
      selectedCharacterId: DEFAULT_CHARACTER.id,
      activeRoomCode: null,

      createCharacter: (name, classKey) => {
        const trimmed = sanitizeCharacterName(name);
        if (!trimmed) return null;

        const character = createCharacterProfile(trimmed, classKey);
        set((state) => ({
          characters: [...state.characters, character],
          selectedCharacterId: character.id,
        }));
        return character;
      },

      selectCharacter: (characterId) => set((state) => ({
        selectedCharacterId: state.characters.some((character) => character.id === characterId)
          ? characterId
          : state.selectedCharacterId,
      })),

      updateSelectedCharacter: (updater) => set((state) => ({
        characters: state.characters.map((character) => (
          character.id === state.selectedCharacterId ? updater(character) : character
        )),
      })),

      setActiveRoomCode: (roomCode) => set({ activeRoomCode: roomCode }),
    }),
    {
      name: getPlayerStoreName(),
      partialize: (state) => ({
        sessionId: state.sessionId,
        characters: state.characters,
        selectedCharacterId: state.selectedCharacterId,
        activeRoomCode: state.activeRoomCode,
      }),
    },
  ),
);

export const getSelectedCharacter = (state: PlayerState) => (
  state.characters.find((character) => character.id === state.selectedCharacterId) ?? state.characters[0]
);
