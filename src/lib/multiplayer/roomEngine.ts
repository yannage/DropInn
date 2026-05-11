import type { StoryEntry } from '../engine';
import type { CharacterProfile } from '../character';
import {
  BATTLE_ACTIONS,
  createInitialBattleState,
  getBattleReward,
  resolveBattleTurn,
  type BattleActionDefinition,
  type BattleActionId,
  type BattleCommit,
  type BattleResolution,
  type BattleState,
} from '../battle/engine';

export type MultiplayerStatus = 'lobby' | 'active' | 'completed';

export interface RoomParticipantState {
  sessionId: string;
  character: CharacterProfile;
  joinedAt: number;
  lastSeenAt: number;
  leftAt: number | null;
}

export interface CommittedAction extends BattleCommit {}

export interface ActionResolution extends BattleResolution {}

export interface RoomState {
  id?: string;
  roomCode: string;
  campaignTitle: string;
  hostSessionId: string;
  createdAt: number;
  updatedAt: number;
  roundDurationMs: number;
  status: MultiplayerStatus;
  sceneRound: number;
  turn: number;
  turnStartedAt: number | null;
  currentStoryText: string;
  storyLog: StoryEntry[];
  actionCommits: Record<string, CommittedAction>;
  continueVotes: Record<string, number>;
  rewardClaims: Record<string, number>;
  lastResults: ActionResolution[];
  battleState: BattleState;
  participants: RoomParticipantState[];
  completedAt: number | null;
  lastResolvedTurnKey: string | null;
}

export interface RoomParticipantView {
  sessionId: string;
  character: CharacterProfile;
  isHost: boolean;
  online: boolean;
  committedActionId: BattleActionId | null;
  hasContinued: boolean;
  rewardClaimed: boolean;
  hp: number;
  maxHp: number;
  downed: boolean;
}

export interface RoomView {
  roomCode: string;
  campaignTitle: string;
  status: MultiplayerStatus;
  sceneRound: number;
  turn: number;
  turnStartedAt: number | null;
  timeRemainingMs: number;
  currentStoryText: string;
  storyLog: StoryEntry[];
  participants: RoomParticipantView[];
  participantCount: number;
  committedCount: number;
  continueCount: number;
  currentPlayer: RoomParticipantView | null;
  isHost: boolean;
  canStart: boolean;
  canCommit: boolean;
  canContinue: boolean;
  canClaimReward: boolean;
  lastResults: ActionResolution[];
  battleState: BattleState;
  battleActions: BattleActionDefinition[];
  rewardLabel: string;
  rewardXp: number;
  rewardItem?: string;
  roomTheme: string;
}

const ONLINE_WINDOW_MS = 20_000;
const ROUND_DURATION_MS = 30_000;
const CAMPAIGN_TITLE = 'The Dragon of Ash Hollow';
const BATTLE_INTRO = 'Ash Hollow erupts in smoke as an ash-black warg breaks from the tree line. The party has one job: drop it before it drops you.';

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const makeLobbyBattleState = (characters: CharacterProfile[]): BattleState => ({
  ...createInitialBattleState(characters),
  status: 'lobby',
  enemyIntent: 'Waiting for the party to begin.',
});

const turnKeyFor = (room: RoomState) => `${room.sceneRound}:${room.turn}`;

const getOnlineParticipants = (room: RoomState, now: number) => (
  room.participants.filter((participant) => (
    participant.leftAt == null && (now - participant.lastSeenAt) <= ONLINE_WINDOW_MS
  ))
);

const getActiveBattleParticipants = (room: RoomState, now: number) => (
  getOnlineParticipants(room, now).filter((participant) => (
    !room.battleState.downedCharacterIds.includes(participant.character.id)
  ))
);

const appendLogLines = (
  room: RoomState,
  turn: number,
  logLines: string[],
  results: ActionResolution[],
) => {
  const resultByCharacterId = new Map(results.map((result) => [result.characterId, result]));
  const entries = logLines.map<StoryEntry>((text) => {
    const matchingRoll = [...resultByCharacterId.values()].find((result) => text.includes(result.characterName));
    return {
      turn,
      text,
      kind: 'resolution',
      roll: matchingRoll,
    };
  });

  room.storyLog = [...room.storyLog, ...entries].slice(-24);
  room.currentStoryText = logLines.join(' ');
};

const ensureRosterHp = (room: RoomState) => {
  room.participants.forEach((participant) => {
    if (room.battleState.partyHpByCharacterId[participant.character.id] == null) {
      room.battleState.partyHpByCharacterId[participant.character.id] = Math.max(1, participant.character.hp);
    }
  });
};

const ensureRoomResolved = (roomInput: RoomState, now = Date.now()) => {
  const room = clone(roomInput);
  if (room.status !== 'active' || room.turnStartedAt == null) return room;

  ensureRosterHp(room);

  const activeParticipants = getActiveBattleParticipants(room, now);
  if (activeParticipants.length === 0) {
    room.status = 'completed';
    room.completedAt = now;
    room.battleState.status = 'failure';
    room.currentStoryText = 'The party is down. Ash Hollow is lost for now, but every survivor keeps what they learned.';
    room.updatedAt = now;
    return room;
  }

  const everyoneCommitted = activeParticipants.every((participant) => room.actionCommits[participant.sessionId]);
  const timedOut = now >= room.turnStartedAt + room.roundDurationMs;
  const turnKey = turnKeyFor(room);

  if ((!everyoneCommitted && !timedOut) || room.lastResolvedTurnKey === turnKey) {
    return room;
  }

  const result = resolveBattleTurn(
    room.roomCode,
    room.turn,
    room.battleState,
    activeParticipants.map((participant) => ({
      sessionId: participant.sessionId,
      character: participant.character,
      online: true,
      leftAt: participant.leftAt,
    })),
    room.actionCommits,
  );

  room.lastResults = result.results;
  room.battleState = result.battleState;
  appendLogLines(room, room.turn, result.logLines, result.results);
  room.lastResolvedTurnKey = turnKey;

  if (result.battleState.status === 'victory' || result.battleState.status === 'failure') {
    room.status = 'completed';
    room.completedAt = now;
    room.actionCommits = {};
    room.continueVotes = {};
    room.currentStoryText = result.logLines.join(' ');
  } else {
    room.turn += 1;
    room.sceneRound = result.battleState.round;
    room.turnStartedAt = now;
    room.actionCommits = {};
    room.continueVotes = {};
    room.lastResolvedTurnKey = null;
  }

  room.updatedAt = now;
  return room;
};

export const createRoomCode = () => Math.random().toString(36).slice(2, 6).toUpperCase();

export const createRoomState = (character: CharacterProfile, sessionId: string, now = Date.now()): RoomState => ({
  roomCode: createRoomCode(),
  campaignTitle: CAMPAIGN_TITLE,
  hostSessionId: sessionId,
  createdAt: now,
  updatedAt: now,
  roundDurationMs: ROUND_DURATION_MS,
  status: 'lobby',
  sceneRound: 1,
  turn: 1,
  turnStartedAt: null,
  currentStoryText: 'Share the room code, pick saved heroes, then start the Ash Hollow Ambush.',
  storyLog: [],
  actionCommits: {},
  continueVotes: {},
  rewardClaims: {},
  lastResults: [],
  battleState: makeLobbyBattleState([character]),
  participants: [{
    sessionId,
    character,
    joinedAt: now,
    lastSeenAt: now,
    leftAt: null,
  }],
  completedAt: null,
  lastResolvedTurnKey: null,
});

export const touchParticipant = (
  roomInput: RoomState,
  sessionId: string,
  character: CharacterProfile,
  now = Date.now(),
) => {
  const room = clone(roomInput);
  const existing = room.participants.find((participant) => participant.sessionId === sessionId);

  if (existing) {
    existing.character = character;
    existing.lastSeenAt = now;
    existing.leftAt = null;
  } else {
    room.participants.push({
      sessionId,
      character,
      joinedAt: now,
      lastSeenAt: now,
      leftAt: null,
    });
  }

  ensureRosterHp(room);

  if (room.status === 'lobby') {
    room.battleState = makeLobbyBattleState(room.participants.map((participant) => participant.character));
  }

  room.updatedAt = now;
  return ensureRoomResolved(room, now);
};

export const leaveRoomState = (roomInput: RoomState, sessionId: string, now = Date.now()) => {
  const room = clone(roomInput);
  const participant = room.participants.find((entry) => entry.sessionId === sessionId);
  if (participant) {
    participant.leftAt = now;
    participant.lastSeenAt = now;
  }

  const remaining = room.participants.find((entry) => entry.leftAt == null && entry.sessionId !== sessionId);
  if (room.hostSessionId === sessionId && remaining) {
    room.hostSessionId = remaining.sessionId;
  }

  room.updatedAt = now;
  return room;
};

export const startRoomState = (roomInput: RoomState, sessionId: string, now = Date.now()) => {
  const room = clone(roomInput);
  if (room.hostSessionId !== sessionId || room.status !== 'lobby') return ensureRoomResolved(room, now);

  const activeCharacters = room.participants
    .filter((participant) => participant.leftAt == null)
    .map((participant) => participant.character);

  room.status = 'active';
  room.sceneRound = 1;
  room.turn = 1;
  room.turnStartedAt = now;
  room.battleState = createInitialBattleState(activeCharacters);
  room.currentStoryText = BATTLE_INTRO;
  room.storyLog = [{ turn: 1, text: BATTLE_INTRO, kind: 'intro' }];
  room.actionCommits = {};
  room.continueVotes = {};
  room.rewardClaims = {};
  room.lastResults = [];
  room.completedAt = null;
  room.lastResolvedTurnKey = null;
  room.updatedAt = now;

  return room;
};

export const commitRoomAction = (
  roomInput: RoomState,
  sessionId: string,
  actionId: string,
  now = Date.now(),
) => {
  const room = ensureRoomResolved(roomInput, now);
  if (room.status !== 'active') return room;

  const participant = getActiveBattleParticipants(room, now)
    .find((entry) => entry.sessionId === sessionId);
  if (!participant || room.actionCommits[sessionId]) return room;

  room.actionCommits[sessionId] = {
    actionId: (BATTLE_ACTIONS.some((action) => action.id === actionId) ? actionId : 'strike') as BattleActionId,
    committedAt: now,
  };
  room.updatedAt = now;

  return ensureRoomResolved(room, now);
};

export const continueRoomState = (roomInput: RoomState, sessionId: string, now = Date.now()) => {
  const room = clone(roomInput);
  room.continueVotes[sessionId] = now;
  room.updatedAt = now;
  return ensureRoomResolved(room, now);
};

export const claimRoomReward = (roomInput: RoomState, sessionId: string, now = Date.now()) => {
  const room = clone(roomInput);
  const participant = room.participants.find((entry) => entry.sessionId === sessionId);

  room.rewardClaims[sessionId] = now;
  if (participant) {
    room.battleState.rewardClaimedByCharacterId[participant.character.id] = now;
  }

  room.updatedAt = now;
  return room;
};

export const buildRoomView = (roomInput: RoomState, sessionId: string, now = Date.now()): RoomView => {
  const room = ensureRoomResolved(roomInput, now);
  const participants = room.participants
    .filter((participant) => participant.leftAt == null)
    .map((participant) => {
      const hp = room.battleState.partyHpByCharacterId[participant.character.id] ?? participant.character.hp;
      const downed = room.battleState.downedCharacterIds.includes(participant.character.id) || hp <= 0;

      return {
        sessionId: participant.sessionId,
        character: participant.character,
        isHost: participant.sessionId === room.hostSessionId,
        online: (now - participant.lastSeenAt) <= ONLINE_WINDOW_MS,
        committedActionId: room.actionCommits[participant.sessionId]?.actionId ?? null,
        hasContinued: Boolean(room.continueVotes[participant.sessionId]),
        rewardClaimed: Boolean(room.rewardClaims[participant.sessionId]),
        hp,
        maxHp: participant.character.maxHp,
        downed,
      };
    });

  const currentPlayer = participants.find((participant) => participant.sessionId === sessionId) ?? null;
  const committedCount = participants.filter((participant) => participant.committedActionId).length;
  const continueCount = participants.filter((participant) => participant.hasContinued).length;
  const timeRemainingMs = room.status === 'active' && room.turnStartedAt != null
    ? Math.max(0, (room.turnStartedAt + room.roundDurationMs) - now)
    : 0;
  const reward = getBattleReward(room.battleState.status);

  return {
    roomCode: room.roomCode,
    campaignTitle: room.campaignTitle,
    status: room.status,
    sceneRound: room.sceneRound,
    turn: room.turn,
    turnStartedAt: room.turnStartedAt,
    timeRemainingMs,
    currentStoryText: room.currentStoryText,
    storyLog: room.storyLog,
    participants,
    participantCount: participants.length,
    committedCount,
    continueCount,
    currentPlayer,
    isHost: currentPlayer?.isHost ?? false,
    canStart: room.status === 'lobby' && (currentPlayer?.isHost ?? false),
    canCommit: room.status === 'active' && currentPlayer != null && !currentPlayer.downed && currentPlayer.committedActionId == null,
    canContinue: false,
    canClaimReward: room.status === 'completed' && currentPlayer != null && !currentPlayer.rewardClaimed,
    lastResults: room.lastResults,
    battleState: room.battleState,
    battleActions: BATTLE_ACTIONS,
    rewardLabel: reward.label,
    rewardXp: reward.xp,
    rewardItem: reward.item,
    roomTheme: 'Co-op Battle',
  };
};

