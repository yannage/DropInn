export type JourneyNodeId = 'town' | 'warehouse' | 'canal' | 'road' | 'beacon' | 'lantern-square';
export interface TravelVote { decisionId: string; edgeId: string }
export interface JourneyTravel {
  id: string;
  fromNodeId: JourneyNodeId;
  options: { edgeId: string; toNodeId: JourneyNodeId; unlockEventIds: string[]; costIds: string[] }[];
  fallbackEdgeId: string;
  eligibleActorIds: string[];
  votes: Record<string, { edgeId: string; actorName: string }>;
}
export interface JourneyEvent {
  nodeId: JourneyNodeId;
  locationId?: string;
  questChanges?: { itemId: string; kind: 'gained' | 'spent'; sourceEventIds: string[] }[];
  unlocks?: { edgeId: string; sourceEventIds: string[] }[];
  encounter?: 'won' | 'escaped' | 'bypassed';
  transition?: { edgeId: string; from: JourneyNodeId; to: JourneyNodeId; reason: 'vote' | 'fallback'; unlockEventIds: string[]; costIds: string[]; votes: JourneyTravel['votes'] };
}
export interface JourneyMapNode {
  id: JourneyNodeId; label: string; chapter: number; description: string;
  state: 'current' | 'visited' | 'available' | 'locked' | 'mystery'; locations: string[];
}
export interface JourneyMapEdge {
  id: string; from: JourneyNodeId; to: JourneyNodeId; label: string; requires: string[];
  state: 'taken' | 'available' | 'locked' | 'mystery'; unlockEventIds: string[]; transitionEventId?: string;
}
export interface JourneyTravelOption {
  edgeId: string; toNodeId: JourneyNodeId; label: string; description: string; cost: string;
  available: boolean; requires: string[]; unlockEventIds: string[];
}
