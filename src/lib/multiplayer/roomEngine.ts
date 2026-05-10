import { ACTIONS_BY_ROUND, BOT_PLAYS_BY_ROUND, CAMPAIGN_TITLE, YANNI_TRAITS, type Action } from '../../data/campaign';
import { OUTCOMES, ROUND_INTROS } from '../../data/outcomes';
import type { RollResult, StoryEntry } from '../engine';
import type { CharacterProfile } from '../character';

export type MultiplayerStatus = 'lobby' | 'active' | 'reward' | 'completed';

export interface RoomParticipantState {
  sessionId: string;
  character: CharacterProfile;
  joinedAt: number;
  lastSeenAt: number;
  leftAt: number | null;
}

export interface CommittedAction {
  actionId: string;
  committedAt: number;
}

export interface ActionResolution extends RollResult {
  sessionId: string;
  characterId: string;
  characterName: string;
  actionId: string;
  actionLabel: string;
}

export interface RoomState {
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
  participants: RoomParticipantState[];
  completedAt: number | null;
  lastResolvedTurnKey: string | null;
}

export interface RoomParticipantView {
  sessionId: string;
  character: CharacterProfile;
  isHost: boolean;
  online: boolean;
  committedActionId: string | null;
  hasContinued: boolean;
  rewardClaimed: boolean;
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
  roomTheme: string;
}

const ONLINE_WINDOW_MS = 20_000;
const ROUND_DURATION_MS = 30_000;
const MAX_SCENE_ROUND = 3;

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const turnKeyFor = (room: RoomState) => `${room.sceneRound}:${room.turn}`;

const actionHash = (seed: string) => {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = ((hash << 5) - hash + seed.charCodeAt(index)) | 0;
  }
  return Math.abs(hash);
};

const deterministicD20 = (seed: string) => (actionHash(seed) % 20) + 1;

const getActionForRound = (sceneRound: number, actionId: string) => {
  const actions = ACTIONS_BY_ROUND[sceneRound] ?? ACTIONS_BY_ROUND[1];
  return actions.find((action) => action.id === actionId) ?? actions[actions.length - 1];
};

const getOnlineParticipants = (room: RoomState, now: number) => (
  room.participants.filter((participant) => (
    participant.leftAt == null && (now - participant.lastSeenAt) <= ONLINE_WINDOW_MS
  ))
);

const makeOutcome = (action: Action, success: boolean) => {
  const outcome = OUTCOMES[action.id];
  if (!outcome) {
    return success ? 'The party presses forward.' : 'The effort falters, but the story moves on.';
  }

  return success
    ? outcome.success
    : outcome.failure ?? outcome.success;
};

const resolveDeterministicAction = (
  room: RoomState,
  participant: RoomParticipantState,
  action: Action,
): ActionResolution => {
  if (action.id === 'disengage' || action.id === 'dash') {
    return {
      sessionId: participant.sessionId,
      characterId: participant.character.id,
      characterName: participant.character.name,
      actionId: action.id,
      actionLabel: action.label,
      roll: 20,
      mod: 0,
      total: 20,
      success: true,
      narrative: makeOutcome(action, true),
      trait: action.trait,
      dc: action.dc,
    };
  }

  const seed = [
    room.roomCode,
    room.sceneRound,
    room.turn,
    participant.sessionId,
    action.id,
  ].join(':');

  const roll = deterministicD20(seed);
  const mod = participant.character.traits[action.trait] ?? YANNI_TRAITS[action.trait] ?? 0;
  const total = roll + mod;
  const success = total >= action.dc;

  return {
    sessionId: participant.sessionId,
    characterId: participant.character.id,
    characterName: participant.character.name,
    actionId: action.id,
    actionLabel: action.label,
    roll,
    mod,
    total,
    success,
    narrative: makeOutcome(action, success),
    trait: action.trait,
    dc: action.dc,
  };
};

const appendRoundResults = (room: RoomState) => {
  const lines = room.lastResults.map((result) => `${result.characterName}: ${result.narrative}`);
  const botPlay = BOT_PLAYS_BY_ROUND[room.sceneRound]?.bram;

  if (botPlay) {
    lines.push(`Bram ${botPlay.label.toLowerCase()} while Pip keeps one eye on the stall and the other on the smoke outside.`);
  }

  room.currentStoryText = lines.join(' ');
  room.storyLog = [
    ...room.storyLog,
    ...room.lastResults.map((result) => ({
      turn: room.turn,
      text: `${result.characterName}: ${result.narrative}`,
      kind: 'resolution' as const,
      roll: result,
    })),
  ];
};

const ensureRoomResolved = (roomInput: RoomState, now = Date.now()) => {
  const room = clone(roomInput);
  if (room.status !== 'active' || room.turnStartedAt == null) return room;

  const onlineParticipants = getOnlineParticipants(room, now);
  if (onlineParticipants.length === 0) return room;

  const everyoneCommitted = onlineParticipants.every((participant) => room.actionCommits[participant.sessionId]);
  const timedOut = now >= room.turnStartedAt + room.roundDurationMs;
  const turnKey = turnKeyFor(room);

  if ((!everyoneCommitted && !timedOut) || room.lastResolvedTurnKey === turnKey) {
    return room;
  }

  room.lastResults = onlineParticipants.map((participant) => {
    const fallbackAction = (ACTIONS_BY_ROUND[room.sceneRound] ?? ACTIONS_BY_ROUND[1]).slice(-1)[0];
    const committed = room.actionCommits[participant.sessionId];
    const action = getActionForRound(room.sceneRound, committed?.actionId ?? fallbackAction.id);
    return resolveDeterministicAction(room, participant, action);
  });

  appendRoundResults(room);
  room.status = 'reward';
  room.lastResolvedTurnKey = turnKey;
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
  currentStoryText: 'Gather your party, choose your drop-in hero, and step into Thornwick together.',
  storyLog: [],
  actionCommits: {},
  continueVotes: {},
  rewardClaims: {},
  lastResults: [],
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
  if (room.hostSessionId !== sessionId) return ensureRoomResolved(room, now);

  room.status = 'active';
  room.sceneRound = 1;
  room.turn = 1;
  room.turnStartedAt = now;
  room.currentStoryText = ROUND_INTROS[1];
  room.storyLog = [{ turn: 1, text: ROUND_INTROS[1], kind: 'intro' }];
  room.actionCommits = {};
  room.continueVotes = {};
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

  room.actionCommits[sessionId] = { actionId, committedAt: now };
  room.updatedAt = now;

  return ensureRoomResolved(room, now);
};

export const continueRoomState = (roomInput: RoomState, sessionId: string, now = Date.now()) => {
  const room = ensureRoomResolved(roomInput, now);
  if (room.status !== 'reward' && room.status !== 'completed') return room;

  room.continueVotes[sessionId] = now;
  room.updatedAt = now;

  const onlineParticipants = getOnlineParticipants(room, now);
  const hostTriggered = room.hostSessionId === sessionId;
  const everyoneReady = onlineParticipants.length > 0 && onlineParticipants.every((participant) => room.continueVotes[participant.sessionId]);

  if (!hostTriggered && !everyoneReady) {
    return room;
  }

  if (room.sceneRound >= MAX_SCENE_ROUND) {
    room.status = 'completed';
    room.completedAt = now;
    room.currentStoryText = 'Thornwick exhales. The scene is complete, the party levels up, and the road to Ash Hollow waits for whoever returns first.';
    return room;
  }

  const nextRound = room.sceneRound + 1;
  room.sceneRound = nextRound;
  room.turn += 1;
  room.status = 'active';
  room.turnStartedAt = now;
  room.currentStoryText = ROUND_INTROS[nextRound] ?? ROUND_INTROS[1];
  room.storyLog = [
    ...room.storyLog,
    { turn: room.turn, text: room.currentStoryText, kind: 'intro' },
  ];
  room.actionCommits = {};
  room.continueVotes = {};
  room.lastResults = [];
  room.lastResolvedTurnKey = null;

  return room;
};

export const claimRoomReward = (roomInput: RoomState, sessionId: string, now = Date.now()) => {
  const room = clone(roomInput);
  room.rewardClaims[sessionId] = now;
  room.updatedAt = now;
  return room;
};

export const buildRoomView = (roomInput: RoomState, sessionId: string, now = Date.now()): RoomView => {
  const room = ensureRoomResolved(roomInput, now);
  const participants = room.participants
    .filter((participant) => participant.leftAt == null)
    .map((participant) => ({
      sessionId: participant.sessionId,
      character: participant.character,
      isHost: participant.sessionId === room.hostSessionId,
      online: (now - participant.lastSeenAt) <= ONLINE_WINDOW_MS,
      committedActionId: room.actionCommits[participant.sessionId]?.actionId ?? null,
      hasContinued: Boolean(room.continueVotes[participant.sessionId]),
      rewardClaimed: Boolean(room.rewardClaims[participant.sessionId]),
    }));

  const currentPlayer = participants.find((participant) => participant.sessionId === sessionId) ?? null;
  const committedCount = participants.filter((participant) => participant.committedActionId).length;
  const continueCount = participants.filter((participant) => participant.hasContinued).length;
  const timeRemainingMs = room.status === 'active' && room.turnStartedAt != null
    ? Math.max(0, (room.turnStartedAt + room.roundDurationMs) - now)
    : 0;

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
    canCommit: room.status === 'active' && currentPlayer != null && currentPlayer.committedActionId == null,
    canContinue: room.status === 'reward' && currentPlayer != null && !(currentPlayer.hasContinued && !currentPlayer.isHost),
    canClaimReward: room.status === 'completed' && currentPlayer != null && !currentPlayer.rewardClaimed,
    lastResults: room.lastResults,
    roomTheme: 'Dragon Slaying',
  };
};
