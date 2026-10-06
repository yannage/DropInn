/** Avalon v1 saves its generated facts once. Runtime changes never reroll this manifest. */
export type AvalonConflictId = 'bitter-water' | 'missing-carter' | 'stranded-herd';
export type AvalonPlaceId = 'larch-inn' | 'old-ford' | 'mill-yard' | 'reed-bank' | 'hill-spring' | 'green-quarry';
export interface AvalonCastMember { npcId: string; nodeId: AvalonPlaceId; role: string }
export interface AvalonManifest {
  worldId: 'avalon-larch-hills'; worldVersion: 1; generatorVersion: 1; contentVersion: 1 | 2;
  seed: string; startNodeId: AvalonPlaceId; conflictIds: AvalonConflictId[];
  weather: 'mist' | 'clear' | 'rain'; linked: boolean;
  cast: Record<string, AvalonCastMember>;
  clueAssignments: Record<string, { npcRole: string; physicalTargetIds: string[] }>;
}
export interface AvalonThreadState {
  id: AvalonConflictId; status: 'hidden' | 'discovered' | 'active' | 'resolved';
  pressure: number; resolutionId?: string; sourceEventId?: string;
  pressureSupplySpent?: boolean;
}
export interface AvalonEpisode {
  schemaVersion: 1; manifest: AvalonManifest;
  threads: AvalonThreadState[];
  director: {
    cycle: number; participants: string[]; finished: string[]; acted: string[]; meaningful: boolean;
    interest: Record<string, Record<string, number>>; opportunities: string[];
  };
  promise?: { id: string; status: 'owed' | 'kept'; sourceEventId?: string };
}
export interface AvalonOptionEffect {
  threadId?: AvalonConflictId; discoverThread?: AvalonConflictId; resolveThread?: AvalonConflictId;
  discoverThreads?: AvalonConflictId[];
  resolutionId?: string; promise?: string; fulfillPromise?: string;
}
export interface AvalonThreadDefinition {
  id: AvalonConflictId; title: string; question: string; teaser: string;
  leadNodeId: AvalonPlaceId; pressureWarnings: [string, string, string];
  pressureFact: string;
  resolutions: Record<string, { label: string; change: string; cost: string }>;
}
export interface AvalonPromiseDefinition {
  id: string; name: string; description: string; nodeId: AvalonPlaceId; optionId: string;
  fulfillmentText: string;
}
