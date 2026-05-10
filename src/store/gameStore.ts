import type { FC } from 'react';
import { create } from 'zustand';
import type { RollResult, StoryEntry } from '../lib/engine';
import type { Action } from '../data/campaign';

export type Phase = 'idle' | 'bots' | 'player' | 'reveal' | 'resolve' | 'reward';

export interface EnvelopeState {
  appearing: boolean;
  sealFlash: boolean;
  revealed: boolean;
  actionLabel: string;
}

export interface DragState {
  Coin: FC<{ size?: number }>;
  action: Action;
  actionId: string;
  x: number;
  y: number;
  hover: boolean;
  trail: TrailParticle[];
}

export interface TrailParticle {
  id: number;
  x: number;
  y: number;
  life: number;
}

export interface HintState {
  visible: boolean;
  x: number;
  y: number;
}

interface GameState {
  phase: Phase;
  turn: number;
  sceneRound: number;
  timer: number;
  envelopes: Record<string, EnvelopeState>;
  hiddenAction: string | null;
  storyLog: StoryEntry[];
  currentStoryText: string;
  storyKey: number;
  rollResult: RollResult | null;
  pendingSpotlight: string | null;
  drag: DragState | null;
  dropZoneHot: boolean;
  hint: HintState;
  dismissing: boolean;
  tapAction: Action | null;

  // actions
  setPhase: (p: Phase) => void;
  setTurn: (t: number | ((prev: number) => number)) => void;
  setSceneRound: (r: number) => void;
  setTimer: (t: number | ((prev: number) => number)) => void;
  setEnvelopes: (e: Record<string, EnvelopeState> | ((prev: Record<string, EnvelopeState>) => Record<string, EnvelopeState>)) => void;
  setHiddenAction: (a: string | null) => void;
  appendStoryEntry: (entry: StoryEntry) => void;
  clearStoryLog: () => void;
  setCurrentStoryText: (t: string) => void;
  bumpStoryKey: () => void;
  setRollResult: (r: RollResult | null) => void;
  setPendingSpotlight: (t: string | null) => void;
  setDrag: (d: DragState | null | ((prev: DragState | null) => DragState | null)) => void;
  setDropZoneHot: (h: boolean) => void;
  setHint: (h: HintState) => void;
  setDismissing: (d: boolean) => void;
  setTapAction: (a: Action | null) => void;
  resetForNewRound: (introText: string) => void;
}

export const useGameStore = create<GameState>((set) => ({
  phase: 'idle',
  turn: 1,
  sceneRound: 1,
  timer: 30,
  envelopes: {},
  hiddenAction: null,
  storyLog: [],
  currentStoryText: '',
  storyKey: 0,
  rollResult: null,
  pendingSpotlight: null,
  drag: null,
  dropZoneHot: false,
  hint: { visible: false, x: 0, y: 0 },
  dismissing: false,
  tapAction: null,

  setPhase: (p) => set({ phase: p }),
  setTurn: (t) => set(s => ({ turn: typeof t === 'function' ? t(s.turn) : t })),
  setSceneRound: (r) => set({ sceneRound: r }),
  setTimer: (t) => set(s => ({ timer: typeof t === 'function' ? t(s.timer) : t })),
  setEnvelopes: (e) => set(s => ({ envelopes: typeof e === 'function' ? e(s.envelopes) : e })),
  setHiddenAction: (a) => set({ hiddenAction: a }),
  appendStoryEntry: (entry) => set(s => ({ storyLog: [...s.storyLog, entry] })),
  clearStoryLog: () => set({ storyLog: [] }),
  setCurrentStoryText: (t) => set({ currentStoryText: t }),
  bumpStoryKey: () => set(s => ({ storyKey: s.storyKey + 1 })),
  setRollResult: (r) => set({ rollResult: r }),
  setPendingSpotlight: (t) => set({ pendingSpotlight: t }),
  setDrag: (d) => set(s => ({ drag: typeof d === 'function' ? d(s.drag) : d })),
  setDropZoneHot: (h) => set({ dropZoneHot: h }),
  setHint: (h) => set({ hint: h }),
  setDismissing: (d) => set({ dismissing: d }),
  setTapAction: (a) => set({ tapAction: a }),
  resetForNewRound: (introText) => set({
    phase: 'idle',
    envelopes: {},
    hiddenAction: null,
    currentStoryText: introText,
    timer: 30,
    hint: { visible: false, x: 0, y: 0 },
    rollResult: null,
    tapAction: null,
  }),
}));
