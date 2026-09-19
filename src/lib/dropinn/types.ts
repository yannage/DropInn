import type { CharacterProfile, CharacterClassKey, TraitSet } from '../character';

export type TokenKind = 'fight' | 'influence' | 'investigate' | 'assist' | 'spotlight';
export type CreativeEffect = 'cover' | 'distract' | 'reveal' | 'rescue';
export interface SceneTarget {
  id: string;
  name: string;
  description: string;
  tokens: TokenKind[];
  effects: CreativeEffect[];
  changed?: boolean;
}
export interface SceneChange { title: string; text: string; next: string }
export interface ChapterDefinition {
  id: string;
  title: string;
  location: string;
  intro: string;
  objective: string;
  threat: string;
  art: 'village' | 'river' | 'chapel';
  targets: SceneTarget[];
  progressGoal: number;
  combat: boolean;
  keepsake: string;
  endings: Record<'success' | 'mixed' | 'setback', string>;
}
export interface CreativeProposal {
  id: string;
  turn: number;
  targetId: string;
  effect: CreativeEffect;
  label: string;
  description: string;
  idea: string;
  supported: boolean;
  source: 'authored' | 'openai' | 'ollama';
}
export interface PlayerAction {
  token: TokenKind;
  targetId: string;
  proposal?: CreativeProposal;
}
export interface Seat {
  id: string;
  actorId: string;
  kind: 'human' | 'companion';
  character: CharacterProfile;
  hp: number;
  missedTurns: number;
  leaving: boolean;
}
export interface Participant {
  userId: string;
  character: CharacterProfile;
  seatId: string | null;
  joinedAt: number;
  leftAt: number | null;
  actions: number;
  xp: number;
  keepsakes: string[];
  spotlightChapters: number[];
  highlights: string[];
}
export interface StoryEvent {
  id: string;
  turn: number;
  chapter: number;
  at: number;
  kind: 'arrival' | 'action' | 'consequence' | 'chapter' | 'departure';
  actorId?: string;
  actorName?: string;
  text: string;
  roll?: number;
  modifier?: number;
  success?: boolean;
  effect?: string;
  change?: SceneChange;
}
export interface ChapterOutcome {
  chapter: number;
  result: 'success' | 'mixed' | 'setback';
  text: string;
  at: number;
}
export interface AdventureRoom {
  version: 2;
  id: string;
  code: string;
  revision: number;
  title: string;
  status: 'active' | 'parked' | 'completed';
  phase: 'choosing' | 'reveal';
  chapter: number;
  chapterRound: number;
  turn: number;
  deadline: number;
  revealUntil: number | null;
  createdAt: number;
  updatedAt: number;
  progress: number;
  danger: number;
  flags: string[];
  seats: Seat[];
  players: Record<string, Participant>;
  pendingJoins: string[];
  commits: Record<string, PlayerAction>;
  events: StoryEvent[];
  outcomes: ChapterOutcome[];
  appliedCommands: string[];
  variation?: { title: string; atmosphere: string };
}
export interface RoomSummary {
  code: string;
  title: string;
  status: AdventureRoom['status'];
  chapter: number;
  chapterTitle: string;
  predicament: string;
  humans: number;
  companions: number;
  openSeats: number;
  progress: number;
  progressGoal: number;
  updatedAt: number;
}
export interface AdventureCommand {
  id: string;
  type: 'join' | 'leave' | 'tick' | 'act';
  userId: string;
  expectedTurn?: number;
  expectedRevision?: number;
  character?: CharacterProfile;
  action?: PlayerAction;
}
export interface ChatMessage {
  id: string;
  userId: string;
  name: string;
  text: string;
  at: number;
}
export interface VisitRecap {
  code: string;
  characterId: string;
  title: string;
  actions: number;
  xp: number;
  keepsakes: string[];
  highlights: string[];
  outcomes: ChapterOutcome[];
  chapterHighlights?: Record<number, string[]>;
}
export interface ActionDescription {
  label: string;
  description: string;
  trait: keyof TraitSet;
  dc: number;
}
export type HeroClass = CharacterClassKey;
