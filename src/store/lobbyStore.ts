import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { RollResult } from '../lib/engine';

export type Screen = 'lobby' | 'previously' | 'room';
export type Overlay = 'inventory' | 'help' | 'leave' | 'npc' | 'spotlight' | 'notifs' | 'profile' | 'v2stub' | 'history';

interface LobbyState {
  screen: Screen;
  overlay: Overlay | null;
  completed: boolean;
  xp: number;
  hasSalve: boolean;
  spotlightTokens: number;
  lastRoll: RollResult | null;

  setScreen: (s: Screen) => void;
  openOverlay: (o: Overlay) => void;
  closeOverlay: () => void;
  onSceneComplete: (roll: RollResult | null) => void;
  onLeave: () => void;
  onSpotlightCommit: (text: string) => void;
}

export const useLobbyStore = create<LobbyState>()(
  persist(
    (set) => ({
      screen: 'lobby',
      overlay: null,
      completed: false,
      xp: 240,
      hasSalve: false,
      spotlightTokens: 2,
      lastRoll: null,

      setScreen: (s) => set({ screen: s }),
      openOverlay: (o) => set({ overlay: o }),
      closeOverlay: () => set({ overlay: null }),

      onSceneComplete: (roll) => set(s => ({
        completed: true,
        xp: s.xp + 50,
        hasSalve: true,
        spotlightTokens: 2,
        lastRoll: roll,
      })),

      onLeave: () => set({ screen: 'lobby', overlay: null }),

      onSpotlightCommit: (_text) => set(s => ({
        spotlightTokens: Math.max(0, s.spotlightTokens - 1),
        overlay: null,
      })),
    }),
    {
      name: 'sfq-v1-state',
      // Only persist these fields — never screen (always boot to lobby)
      partialize: (s) => ({
        completed: s.completed,
        xp: s.xp,
        hasSalve: s.hasSalve,
        spotlightTokens: s.spotlightTokens,
      }),
    }
  )
);
