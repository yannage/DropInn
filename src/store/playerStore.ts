import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  DEFAULT_CHARACTER,
  createCharacterProfile,
  sanitizeCharacterName,
  type CharacterClassKey,
  type CharacterProfile,
} from '../lib/character';
import { applyCharacterReward } from '../lib/progression';
import { getErrorMessage } from '../lib/errors';
import { ensureAnonymousUser, isSupabaseConfigured } from '../lib/supabase/client';
import { listSupabaseCharacters, upsertSupabaseCharacter } from '../lib/supabase/characters';

type PlayerBackend = 'loading' | 'local' | 'supabase' | 'error';

interface PlayerState {
  ready: boolean;
  backend: PlayerBackend;
  playerError: string | null;
  sessionId: string;
  authUserId: string | null;
  characters: CharacterProfile[];
  selectedCharacterId: string;
  activeRoomCode: string | null;

  initializePlayer: () => Promise<void>;
  clearPlayerError: () => void;
  createCharacter: (name: string, classKey: CharacterClassKey) => Promise<CharacterProfile | null>;
  selectCharacter: (characterId: string) => void;
  updateSelectedCharacter: (updater: (character: CharacterProfile) => CharacterProfile) => Promise<void>;
  applyRewardToSelected: (xpAward: number, itemName?: string) => Promise<CharacterProfile | null>;
  setActiveRoomCode: (roomCode: string | null) => void;
}

const getSessionNamespace = () => {
  if (typeof window === 'undefined') return null;
  const namespace = new URLSearchParams(window.location.search).get('session')?.trim();
  return namespace ? namespace.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 24) : null;
};

const makeSessionId = () => {
  const namespace = getSessionNamespace();
  if (namespace) {
    return `session_${namespace}`;
  }

  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `session_${Math.random().toString(36).slice(2, 10)}`;
};

const getPlayerStoreName = () => {
  if (typeof window === 'undefined') {
    return 'dropinn-player-state';
  }

  const namespace = getSessionNamespace();
  return namespace
    ? `dropinn-player-state-${namespace}`
    : 'dropinn-player-state';
};

const persistCharacterIfNeeded = async (
  state: PlayerState,
  character: CharacterProfile,
) => {
  if (state.backend !== 'supabase' || !state.authUserId) return character;
  return upsertSupabaseCharacter(state.authUserId, character);
};

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => ({
      ready: false,
      backend: isSupabaseConfigured() ? 'loading' : 'local',
      playerError: null,
      sessionId: makeSessionId(),
      authUserId: null,
      characters: [DEFAULT_CHARACTER],
      selectedCharacterId: DEFAULT_CHARACTER.id,
      activeRoomCode: null,

      initializePlayer: async () => {
        if (!isSupabaseConfigured()) {
          const sessionId = makeSessionId();
          set((state) => ({
            ready: true,
            backend: 'local',
            playerError: null,
            sessionId,
            characters: state.characters.length > 0 ? state.characters : [DEFAULT_CHARACTER],
            selectedCharacterId: state.characters.length > 0 ? state.selectedCharacterId : DEFAULT_CHARACTER.id,
          }));
          return;
        }

        set({ backend: 'loading', playerError: null });

        try {
          const user = await ensureAnonymousUser();
          if (!user) {
            set({ ready: true, backend: 'local', playerError: null });
            return;
          }

          let characters = await listSupabaseCharacters(user.id);
          if (characters.length === 0) {
            const starter = createCharacterProfile('Yanni', 'wizard');
            characters = [await upsertSupabaseCharacter(user.id, starter)];
          }

          const currentSelectedId = get().selectedCharacterId;
          const selectedCharacterId = characters.some((character) => character.id === currentSelectedId)
            ? currentSelectedId
            : characters[0].id;

          set({
            ready: true,
            backend: 'supabase',
            sessionId: user.id,
            authUserId: user.id,
            characters,
            selectedCharacterId,
            playerError: null,
          });
        } catch (error) {
          set({
            ready: true,
            backend: 'error',
            playerError: getErrorMessage(error, 'Unable to initialize Supabase.'),
          });
        }
      },

      clearPlayerError: () => set({ playerError: null }),

      createCharacter: async (name, classKey) => {
        const trimmed = sanitizeCharacterName(name);
        if (!trimmed) return null;

        const character = createCharacterProfile(trimmed, classKey);
        set((state) => ({
          characters: [...state.characters, character],
          selectedCharacterId: character.id,
          playerError: null,
        }));

        try {
          const persisted = await persistCharacterIfNeeded(get(), character);
          set((state) => ({
            characters: state.characters.map((entry) => (
              entry.id === character.id ? persisted : entry
            )),
            selectedCharacterId: persisted.id,
          }));
          return persisted;
        } catch (error) {
          set({ playerError: getErrorMessage(error, 'Unable to save character.') });
          return character;
        }
      },

      selectCharacter: (characterId) => set((state) => ({
        selectedCharacterId: state.characters.some((character) => character.id === characterId)
          ? characterId
          : state.selectedCharacterId,
      })),

      updateSelectedCharacter: async (updater) => {
        let nextCharacter: CharacterProfile | null = null;

        set((state) => ({
          characters: state.characters.map((character) => {
            if (character.id !== state.selectedCharacterId) return character;
            nextCharacter = updater(character);
            return nextCharacter;
          }),
        }));

        if (!nextCharacter) return;

        try {
          const persisted = await persistCharacterIfNeeded(get(), nextCharacter);
          set((state) => ({
            characters: state.characters.map((character) => (
              character.id === persisted.id ? persisted : character
            )),
          }));
        } catch (error) {
          set({ playerError: getErrorMessage(error, 'Unable to save character progress.') });
        }
      },

      applyRewardToSelected: async (xpAward, itemName) => {
        let nextCharacter: CharacterProfile | null = null;

        await get().updateSelectedCharacter((character) => {
          nextCharacter = applyCharacterReward(character, xpAward, itemName);
          return nextCharacter;
        });

        return nextCharacter;
      },

      setActiveRoomCode: (roomCode) => set({ activeRoomCode: roomCode }),
    }),
    {
      name: getPlayerStoreName(),
      partialize: (state) => ({
        sessionId: state.sessionId,
        characters: state.backend === 'local' ? state.characters : [],
        selectedCharacterId: state.selectedCharacterId,
        activeRoomCode: state.activeRoomCode,
      }),
    },
  ),
);

export const getSelectedCharacter = (state: PlayerState) => (
  state.characters.find((character) => character.id === state.selectedCharacterId) ?? state.characters[0]
);
