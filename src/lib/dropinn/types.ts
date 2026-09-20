import type { CharacterProfile, CharacterClassKey, TraitSet } from '../character';

export type TokenKind = 'fight' | 'influence' | 'investigate' | 'assist' | 'spotlight';
export type CreativeEffect = 'cover' | 'distract' | 'reveal' | 'rescue';
export type ReactionKind = 'cheer' | 'thanks' | 'clever';
export interface TableReaction { id: string; userId: string; kind: ReactionKind; at: number }
export interface SceneTarget {
  id: string;
  name: string;
  description: string;
  tokens: TokenKind[];
  effects: CreativeEffect[];
  changed?: boolean;
  artKey?: string;
  development?: { name: string; description: string; artKey?: string; tokens?: TokenKind[] };
}
export interface SceneChange { title: string; text: string; next: string }
export interface ChapterDefinition {
  id: string;
  title: string;
  location: string;
  intro: string;
  objective: string;
  threat: string;
  art: string;
  firstTarget?: string;
  enemySource?: string;
  catchUp?: string;
  branch?: { prompt: string; fallback: string; options: { id: string; targetId: string; label: string; consequence: string }[]; fallbackText: string };
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
  /** Omitted on older clients: targets the scene. Hero targets are Help/Protect. */
  targetKind?: 'scene' | 'hero';
  /** Hold duration, validated by the server; never a client-selected roll bonus. */
  releaseMs?: number;
  proposal?: CreativeProposal;
}
export interface EnemyIntent {
  turn: number;
  sourceId: string;
  targetActorId: string;
  baseDamage: number;
}
/** Presentation reads numeric outcomes, never guesses effects from story prose. */
export interface ActionResult {
  targetKind?: 'scene' | 'hero';
  targetId?: string;
  token?: TokenKind;
  executionBonus?: number;
  progress?: number;
  danger?: number;
  protection?: number;
  healing?: number;
  damage?: number;
  hp?: number;
  changed?: boolean;
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
  /** Real player contribution, including guaranteed actions without a die roll. */
  contribution?: boolean;
  result?: ActionResult;
}
export interface ChapterOutcome {
  chapter: number;
  result: 'success' | 'mixed' | 'setback';
  text: string;
  at: number;
}
export interface AdventureRoom {
  adventureId?: string;
  adventureVersion?: number;
  storyBranch?: string;
  visibility?: 'public' | 'private';
  inviteKey?: string;
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
  /** Absent on older snapshots until the next choosing boundary. */
  enemyIntent?: EnemyIntent;
  events: StoryEvent[];
  outcomes: ChapterOutcome[];
  appliedCommands: string[];
  variation?: { title: string; atmosphere: string };
  reactions?: TableReaction[];
}
export interface RoomSummary {
  adventureId?: string;
  adventureVersion?: number;
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
  inviteKey?: string;
  id: string;
  type: 'join' | 'leave' | 'tick' | 'act' | 'react';
  userId: string;
  expectedTurn?: number;
  expectedRevision?: number;
  character?: CharacterProfile;
  action?: PlayerAction;
  reaction?: ReactionKind;
}
export interface ChatMessage {
  id: string;
  userId: string;
  name: string;
  text: string;
  at: number;
}
export interface VisitRecap {
  adventureId?: string;
  adventureVersion?: number;
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
