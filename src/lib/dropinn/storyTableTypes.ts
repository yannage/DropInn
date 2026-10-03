import type { PlayerAction } from './types';

export type StoryTableFactId = 'ledger-copy' | 'canal-key' | 'road-lead' | 'watcher-tell' | 'packed-lantern' | 'light-ready' | 'people-ready' | 'repair-plan' | 'ward-warning';
export interface StoryTableFact { id: StoryTableFactId; turn: number; sourceEventIds: string[] }
export interface StoryTableRun {
  facts: StoryTableFact[];
  activeRounds: number;
  extraOpportunity: boolean;
  lanternSpent: boolean;
  completion?: 'gather' | 'finish' | 'fallback';
}
export interface StoryTableResult {
  factIds: StoryTableFactId[];
  before: string;
  after: string;
  next: string;
  repeated?: boolean;
  completion?: 'gather' | 'finish' | 'fallback';
  lanternSpent?: boolean;
  extraOpportunity?: boolean;
}
export interface StoryTableMilestone { id: string; label: string; description: string; complete: boolean; required: boolean }
export interface StoryTableView {
  facts: (StoryTableFact & { label: string; description: string })[];
  preparations: StoryTableMilestone[];
  milestoneStates: StoryTableMilestone[];
  plan: { label: string; description: string; available: boolean; action: PlayerAction; reason: string };
  activeRounds: number;
  activeRoundCap: number;
  remainingActiveRounds: number;
}
