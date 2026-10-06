import type { AdventureRoom, SceneTarget } from './types';
import type { AvalonConflictId, AvalonEpisode, AvalonOptionEffect } from './avalonTypes';

export type QuestAttribute = 'might' | 'wits' | 'heart';
export type QuestMove = 'attack' | 'defend' | 'spell' | 'mend';
export type QuestEnding = 'isolate' | 'bargain' | 'repair' | 'return';
export type QuestAction =
  | { kind: 'interact'; targetId: string; optionId: string }
  | { kind: 'travel'; edgeId: string }
  | { kind: 'pass' }
  | { kind: 'follow-thread'; threadId: string }
  | { kind: 'return-episode' }
  | { kind: 'combat'; move: QuestMove; targetActorId?: string }
  | { kind: 'loot'; offerId: string; choiceId: string }
  | { kind: 'upgrade'; attribute: QuestAttribute };
export type QuestRunAction = QuestAction;
export interface QuestChallenge {
  id: string; label?: string; attribute: QuestAttribute; dc: number;
  success: string; failure: string; setupLabel?: string;
}
export interface QuestChallengeEffort {
  challengeId: string; nodeId: string; targetId: string; attempts: number;
  contributors: { actorId: string; actorName: string; sourceEventId: string }[];
  completedEventId?: string;
}
export interface QuestChallengePreview {
  id: string; attribute: QuestAttribute; dc: number; sides: 6;
  baseModifier: number; helpModifier: number; modifier: number; successes: number; total: 6; chance: number;
  helpKind: 'none' | 'learned' | 'party'; helperActorId?: string; helperName?: string; helpSourceEventId?: string;
  attempts: number; complete: boolean;
}
export interface QuestOption {
  id: string; label: string; preview: string; result: string;
  requires?: string[]; absent?: string[]; discover?: string[]; items?: string[]; supplyDelta?: number;
  followUp?: string[]; encounter?: string; completeObjective?: 'investigate' | 'source'; ending?: QuestEnding;
  check?: { attribute: QuestAttribute; dc: number; success: string; failure: string; bonusSupplies?: number; damageOnFailure?: number; successDiscover?: string[] };
  avalon?: AvalonOptionEffect;
  challenge?: QuestChallenge;
}
export interface QuestTarget { id: string; name: string; context: string; artKey: string; options: QuestOption[] }
export interface QuestNode { id: string; label: string; description: string; art: string; targets: QuestTarget[] }
export interface QuestEdge { id: string; from: string; to: string; label: string; description: string; requires?: string[]; absent?: string[] }
export interface QuestRunContent {
  id: string; version: number; title: string; pitch: string; opening: string; startNodeId: string;
  chapters: { id: string; title: string; keepsake: string }[];
  nodes: QuestNode[]; edges: QuestEdge[];
  items: Record<string, { label: string; description: string }>;
  facts: Record<string, { label: string; description: string }>;
  enemies: Record<string, { name: string; description: string; artKey: string }>;
}
export interface QuestHero {
  level: number; runXp: number; points: number; attributes: Record<QuestAttribute, number>;
  mana: number; maxMana: number; equipment: string[];
}
export interface QuestFact { id: string; sourceEventId: string; actorId: string; actorName: string; nodeId: string }
export interface QuestLootOffer { id: string; actorId: string; choices: string[]; sourceEventId: string }
export interface QuestFocus { actorId: string; remaining: number; endsAt: number }
export interface QuestCombat {
  id: string; enemyId: string; round: number; order: string[]; actedActorIds: string[];
  enemyHp: number; enemyMaxHp: number; enemyArmor: number; status: 'active' | 'won' | 'escaped';
  intent: { targetActorId: string; damage: number; label: string }; protection: Record<string, number>;
  returnNodeId: string; resumeAfterActorId: string;
  roundContributed: boolean;
  resumeFocus?: { actorId: string; remaining: number; remainingMs: number };
}
export interface QuestRunState {
  schemaVersion: 1; seed: string; nodeId: string; visitedNodeIds: string[];
  focus: QuestFocus | null; lastActorId?: string;
  followUp?: { id: string; targetId: string; optionIds: string[]; sourceEventId: string };
  heroes: Record<string, QuestHero>; facts: QuestFact[]; items: string[]; supplies: number;
  completedObjectives: string[]; usedOptions: string[]; lootOffers: QuestLootOffer[];
  combat?: QuestCombat; ending?: { id: QuestEnding; text: string; sourceEventId: string };
  pendingMilestone?: { result: 'success' | 'mixed' | 'setback'; text: string };
  avalon?: AvalonEpisode;
  challenges?: Record<string, QuestChallengeEffort>;
}
export interface QuestEvent {
  kind: 'discovery' | 'follow-up' | 'travel' | 'combat' | 'loot' | 'upgrade' | 'pass' | 'ending' | 'director';
  nodeId: string; optionId?: string; move?: QuestMove; fromNodeId?: string; toNodeId?: string;
  factIds?: string[]; itemIds?: string[]; supplyDelta?: number; enemyDamage?: number;
  spentItemIds?: string[];
  manaDelta?: number; runXp?: number; lootOfferId?: string; equipmentId?: string; attribute?: QuestAttribute;
  sourceEventId?: string; next?: string;
  encounterId?: string;
  threadId?: AvalonConflictId;
  check?: { roll: number; modifier: number; dc: number; success: boolean;
    sides?: 6; attribute?: QuestAttribute; baseModifier?: number; helpModifier?: number;
    helperActorId?: string; helperName?: string; helpSourceEventId?: string; helpKind?: QuestChallengePreview['helpKind'];
    challengeId?: string; attempt?: number;
  };
}
export interface QuestRunView {
  activeActorId: string | null; activeActorName: string; isActive: boolean; actionsRemaining: number;
  node: QuestNode; focusEndsAt: number; mode: 'exploration' | 'combat' | 'completed';
  objective: string; followUp?: QuestRunState['followUp'];
  hero?: QuestHero; lootOffers: QuestLootOffer[];
}
export interface QuestLifecycle {
  normalizeCharacter: (character: import('../character').CharacterProfile) => import('../character').CharacterProfile;
  seatPlayer: (room: AdventureRoom, player: AdventureRoom['players'][string], now: number) => void;
  releasePlayer: (room: AdventureRoom, seat: AdventureRoom['seats'][number], now: number, inactive?: boolean) => void;
  fillCompanions: (room: AdventureRoom) => void;
  finishChapter: (room: AdventureRoom, now: number) => void;
}
export type QuestSceneTarget = SceneTarget & { questOptions: QuestOption[] };
