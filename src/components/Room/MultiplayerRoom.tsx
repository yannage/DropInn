import { useEffect, useMemo, useState } from 'react';
import { getBattleReward, getClassActionLabel } from '../../lib/battle/engine';
import { getCharacterInitial, getCharacterLabel } from '../../lib/character';
import type { CharacterProfile } from '../../lib/character';
import type { RoomView } from '../../lib/multiplayer/roomEngine';
import { useLobbyStore } from '../../store/lobbyStore';
import { useMultiplayerStore } from '../../store/multiplayerStore';
import { getSelectedCharacter, usePlayerStore } from '../../store/playerStore';
import { BattleStoryScroll } from './BattleStoryScroll';
import { PhaseShowcase } from './PhaseShowcase';
import { BattleDecisionTable } from './BattleDecisionTable';

const buildMockRoomView = (character: CharacterProfile, sessionId: string): RoomView => ({
  roomCode: 'MOCK',
  campaignTitle: 'The Dragon of Ash Hollow',
  status: 'active',
  sceneRound: 2,
  turn: 4,
  turnStartedAt: Date.now(),
  timeRemainingMs: 18000,
  currentStoryText: 'The ash warg lunges over the broken cart as the market stalls splinter.',
  storyLog: [
    { turn: 3, text: 'Bram drives the beast back with a shield rush.', kind: 'resolution' },
    { turn: 3, text: 'Yanni catches the opening and cracks it with an arcane dart.', kind: 'resolution' },
    { turn: 4, text: 'The warg circles low, looking for the weakest flank.', kind: 'resolution' },
  ],
  participants: [
    {
      sessionId,
      character,
      isHost: true,
      online: true,
      committedActionId: null,
      hasContinued: false,
      rewardClaimed: false,
      hp: Math.max(1, character.hp - 2),
      maxHp: character.maxHp,
      downed: false,
    },
    {
      sessionId: 'ally-bram',
      character: { ...character, id: 'bram', name: 'Bram', classKey: 'fighter', accent: '#6EE7B7' },
      isHost: false,
      online: true,
      committedActionId: 'guard',
      hasContinued: false,
      rewardClaimed: false,
      hp: 14,
      maxHp: 18,
      downed: false,
    },
    {
      sessionId: 'ally-aria',
      character: { ...character, id: 'aria', name: 'Aria', classKey: 'cleric', accent: '#F59EAA' },
      isHost: false,
      online: true,
      committedActionId: 'aid',
      hasContinued: false,
      rewardClaimed: false,
      hp: 10,
      maxHp: 16,
      downed: false,
    },
  ],
  participantCount: 3,
  committedCount: 2,
  continueCount: 0,
  currentPlayer: {
    sessionId,
    character,
    isHost: true,
    online: true,
    committedActionId: null,
    hasContinued: false,
    rewardClaimed: false,
    hp: Math.max(1, character.hp - 2),
    maxHp: character.maxHp,
    downed: false,
  },
  isHost: true,
  canStart: false,
  canCommit: true,
  canContinue: false,
  canClaimReward: false,
  lastResults: [
    {
      sessionId: 'ally-bram',
      characterId: 'bram',
      characterName: 'Bram',
      actionId: 'guard',
      actionLabel: 'Guard',
      roll: 14,
      mod: 3,
      total: 17,
      success: true,
      damage: 2,
      healing: 0,
      incomingDamage: 0,
      remainingHp: 14,
      narrative: 'Bram braces the line and blunts the charge.',
      trait: 'ATH',
      dc: 11,
    },
  ],
  battleState: {
    status: 'active',
    round: 2,
    enemyName: 'Ash Warg',
    enemyHp: 19,
    enemyMaxHp: 34,
    enemyIntent: 'Leap on the front line for 5 damage unless the party wards the strike.',
    partyHpByCharacterId: {
      [character.id]: Math.max(1, character.hp - 2),
      bram: 14,
      aria: 10,
    },
    downedCharacterIds: [],
    lastResolvedTurn: 3,
    rewardClaimedByCharacterId: {},
  },
  battleActions: [
    { id: 'strike', label: 'Strike', trait: 'ATH', dc: 11, successDamage: 6, failureDamage: 2, description: 'Reliable damage.' },
    { id: 'heavy', label: 'Heavy', trait: 'ATH', dc: 15, successDamage: 11, failureDamage: 0, description: 'Risky burst damage.' },
    { id: 'guard', label: 'Guard', trait: 'ATH', dc: 11, successDamage: 2, failureDamage: 0, guardReduction: 6, description: 'Brace the line.' },
    { id: 'aid', label: 'Aid', trait: 'CHA', dc: 10, heal: 5, description: 'Patch up the weakest ally.' },
  ],
  rewardLabel: 'No reward yet',
  rewardXp: 0,
  rewardItem: undefined,
  roomTheme: 'Ash Hollow Ambush',
});

const hpColorFor = (hp: number, maxHp: number) => {
  const ratio = maxHp > 0 ? hp / maxHp : 0;
  if (ratio <= 0.25) return '#F87171';
  if (ratio <= 0.5) return '#FBBF24';
  return '#4ADE80';
};

const HealthBar = ({ hp, maxHp, height = 8 }: { hp: number; maxHp: number; height?: number }) => {
  const percent = maxHp > 0 ? Math.max(0, Math.min(100, Math.round((hp / maxHp) * 100))) : 0;

  return (
    <div style={{
      height,
      borderRadius: height,
      background: 'rgba(0,0,0,0.4)',
      border: '1px solid rgba(255,255,255,0.08)',
      overflow: 'hidden',
      boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.6)',
    }}>
      <div style={{
        width: `${percent}%`,
        height: '100%',
        background: `linear-gradient(90deg, ${hpColorFor(hp, maxHp)}, #FFE9A8)`,
        transition: 'width 280ms ease',
      }} />
    </div>
  );
};

export const MultiplayerRoom = () => {
  const lobby = useLobbyStore();
  const room = useMultiplayerStore((state) => state.room);
  const loading = useMultiplayerStore((state) => state.loading);
  const error = useMultiplayerStore((state) => state.error);
  const clearError = useMultiplayerStore((state) => state.clearError);
  const syncRoom = useMultiplayerStore((state) => state.syncRoom);
  const subscribeToCurrentRoom = useMultiplayerStore((state) => state.subscribeToCurrentRoom);
  const stopRoomSubscription = useMultiplayerStore((state) => state.stopRoomSubscription);
  const startRoom = useMultiplayerStore((state) => state.startRoom);
  const commitAction = useMultiplayerStore((state) => state.commitAction);
  const leaveRoom = useMultiplayerStore((state) => state.leaveRoom);
  const claimReward = useMultiplayerStore((state) => state.claimReward);

  const playerState = usePlayerStore();
  const selectedCharacter = getSelectedCharacter(playerState);
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);
  const [viewport, setViewport] = useState(() => ({
    width: typeof window === 'undefined' ? 1280 : window.innerWidth,
    height: typeof window === 'undefined' ? 900 : window.innerHeight,
  }));
  const [showStory, setShowStory] = useState(true);
  const [showRoster, setShowRoster] = useState(true);
  const [focusTable, setFocusTable] = useState(false);
  const previewMode = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('mockRoom') === '1';
  const roomView = room ?? (previewMode ? buildMockRoomView(selectedCharacter, playerState.sessionId) : null);
  const isWide = viewport.width >= 980;
  const isTablet = viewport.width >= 700 && viewport.width < 980;
  const needsCompact = viewport.width < 520 || viewport.height < 780;

  useEffect(() => {
    void syncRoom();
    void subscribeToCurrentRoom();
    const id = window.setInterval(() => { void syncRoom(); }, 2500);
    return () => {
      window.clearInterval(id);
      stopRoomSubscription();
    };
  }, [stopRoomSubscription, subscribeToCurrentRoom, syncRoom]);

  useEffect(() => {
    if (room?.status !== 'active' || room.currentPlayer?.committedActionId) {
      setSelectedActionId(null);
    }
  }, [room?.currentPlayer?.committedActionId, room?.status, room?.turn]);

  useEffect(() => {
    const onResize = () => {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (isWide) {
      setShowStory(true);
      setShowRoster(true);
      setFocusTable(false);
      return;
    }

    if (needsCompact) {
      setShowStory(false);
      setShowRoster(false);
    } else {
      setShowStory(true);
      setShowRoster(true);
    }
  }, [isWide, needsCompact]);

  const ownResult = useMemo(
    () => roomView?.lastResults.find((result) => result.sessionId === playerState.sessionId) ?? null,
    [playerState.sessionId, roomView?.lastResults],
  );

  if (!roomView) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        padding: 24,
        textAlign: 'center',
        color: '#E8D9B4',
        fontFamily: 'EB Garamond, serif',
        fontStyle: 'italic',
      }}>
        Join or create an adventuring party from the lobby first.
      </div>
    );
  }

  const timerSeconds = Math.ceil(roomView.timeRemainingMs / 1000);
  const battle = roomView.battleState;
  const reward = getBattleReward(battle.status);
  const recentLog = roomView.storyLog.slice(-5);
  const actionLabels = Object.fromEntries(
    roomView.battleActions.map((action) => [action.id, getClassActionLabel(selectedCharacter.classKey, action.id)]),
  ) as Record<string, string>;

  const handleFinish = async () => {
    await claimReward();
    await leaveRoom();
    lobby.setScreen('lobby');
  };

  const handleLeave = async () => {
    await leaveRoom();
    lobby.setScreen('lobby');
  };

  return (
    <div style={{
      position: 'relative',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      background: 'radial-gradient(ellipse at 50% 20%, #263A5E 0%, #101B2F 48%, #07101E 100%)',
    }}>
      <div style={{
        height: 58,
        background: 'linear-gradient(180deg,#0B1525,#0F1B2D)',
        borderBottom: '1px solid rgba(232,199,96,0.2)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 12px',
        gap: 10,
        flexShrink: 0,
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: 'Cinzel, serif',
            fontSize: 11,
            letterSpacing: '0.1em',
            background: 'linear-gradient(180deg,#FCE89B,#E8C760)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            Ash Hollow Ambush
          </div>
          <div style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: 10,
            color: '#A99668',
            marginTop: 2,
          }}>
            Room {roomView.roomCode} - {roomView.participantCount} hero{roomView.participantCount === 1 ? '' : 'es'}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {roomView.participants.map((participant) => (
            <div key={participant.sessionId} style={{ position: 'relative' }}>
              <div style={{
                width: 30,
                height: 30,
                borderRadius: '50%',
                background: participant.character.accent,
                border: participant.downed ? '1.5px solid #F87171' : '1.5px solid #E8C760',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'Cinzel, serif',
                fontWeight: 700,
                fontSize: 11,
                color: '#1F1408',
                opacity: participant.downed ? 0.55 : 1,
              }}>
                {getCharacterInitial(participant.character.name)}
              </div>
              <div style={{
                position: 'absolute',
                bottom: -1,
                right: -1,
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: participant.online ? '#22c55e' : '#6b7280',
                border: '1.5px solid #0F1B2D',
              }} />
            </div>
          ))}
        </div>
      </div>

      {roomView.status === 'active' ? (
        <div
          className={[
            'battle-room',
            isWide ? 'battle-room--wide' : isTablet ? 'battle-room--tablet' : 'battle-room--compact',
            focusTable ? 'battle-room--focus' : '',
          ].filter(Boolean).join(' ')}
        >
          <div className="battle-room__toolbar">
            <button
              type="button"
              className={`battle-room__toggle ${showStory ? 'battle-room__toggle--on' : ''}`}
              onClick={() => setShowStory(value => !value)}
              disabled={focusTable}
            >
              Story
            </button>
            <button
              type="button"
              className={`battle-room__toggle ${showRoster ? 'battle-room__toggle--on' : ''}`}
              onClick={() => setShowRoster(value => !value)}
              disabled={focusTable}
            >
              Party
            </button>
            <button
              type="button"
              className={`battle-room__toggle ${focusTable ? 'battle-room__toggle--on' : ''}`}
              onClick={() => setFocusTable(value => !value)}
            >
              Focus Table
            </button>
          </div>

          <div className="battle-room__content">
            <div className="battle-room__support">
              {showStory && (
                <BattleStoryScroll
                  enemyIntent={battle.enemyIntent}
                  lines={recentLog.length > 0 ? recentLog.map((entry) => entry.text) : []}
                />
              )}
              {!focusTable && (
                <PhaseShowcase
                  sceneType="combat"
                  phase={roomView.currentPlayer?.committedActionId ? 'reveal' : 'player'}
                  timer={timerSeconds}
                />
              )}
            </div>

            <div className="battle-room__primary">
              <BattleDecisionTable
                actions={roomView.battleActions}
                labels={actionLabels}
                selectedActionId={selectedActionId}
                committedActionId={roomView.currentPlayer?.committedActionId}
                canCommit={previewMode ? true : roomView.canCommit}
                loading={loading}
                onSelect={setSelectedActionId}
                onCommit={() => { if (selectedActionId && !previewMode) void commitAction(selectedActionId); }}
                onRefresh={() => { if (!previewMode) void syncRoom(); }}
              />
            </div>
          </div>

          {showRoster && (
            <div className="party-strip">
            {roomView.participants.map((participant) => {
              const result = roomView.lastResults.find((entry) => entry.sessionId === participant.sessionId);
              const committedAction = roomView.battleActions.find((action) => action.id === participant.committedActionId);

              return (
                <div
                  key={participant.sessionId}
                  className="party-strip__card"
                  style={{
                    borderColor: participant.sessionId === playerState.sessionId ? 'rgba(232,199,96,0.46)' : 'rgba(232,199,96,0.18)',
                    opacity: participant.downed ? 0.58 : 1,
                  }}
                >
                  <div className="party-strip__identity">
                    <div className="party-strip__avatar" style={{ background: participant.character.accent }}>
                      {getCharacterInitial(participant.character.name)}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div className="party-strip__name">{participant.character.name}</div>
                      <div className="party-strip__class">{getCharacterLabel(participant.character.classKey)}{participant.isHost ? ' · Host' : ''}</div>
                    </div>
                  </div>
                  <HealthBar hp={participant.hp} maxHp={participant.maxHp} />
                  <div className="party-strip__meta">
                    <span>HP {participant.hp}/{participant.maxHp}</span>
                    <span>{participant.downed ? 'Downed' : participant.online ? 'Online' : 'Away'}</span>
                  </div>
                  <div className="party-strip__result">
                    {result
                      ? `${result.actionLabel}: ${result.damage > 0 ? `${result.damage} dmg` : result.healing > 0 ? `${result.healing} heal` : result.success ? 'setup' : 'miss'}`
                      : committedAction
                        ? `${actionLabels[committedAction.id]} locked`
                        : 'Choosing...'}
                  </div>
                </div>
              );
            })}
            </div>
          )}
        </div>
      ) : (
        <div style={{
          position: 'relative',
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}>
          <div style={{
            padding: '12px',
            borderRadius: 16,
            border: '1px solid rgba(232,199,96,0.18)',
            background: 'linear-gradient(180deg, rgba(160,40,40,0.18), rgba(15,27,45,0.72))',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="heading gold-text" style={{ fontSize: 15 }}>
                  {battle.enemyName}
                </div>
                <div style={{ marginTop: 6 }}>
                  <HealthBar hp={battle.enemyHp} maxHp={battle.enemyMaxHp} height={10} />
                </div>
                <div style={{
                  marginTop: 5,
                  fontFamily: 'Inter, sans-serif',
                  fontSize: 10,
                  color: '#FFE9A8',
                  letterSpacing: '0.04em',
                }}>
                  HP {battle.enemyHp}/{battle.enemyMaxHp}
                </div>
              </div>
              <div style={{ textAlign: 'right', minWidth: 92 }}>
                <div className="ui-num" style={{ fontSize: 18, color: '#FFE9A8' }}>
                  {roomView.status.toUpperCase()}
                </div>
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: '#A99668', marginTop: 3 }}>
                  Round {roomView.sceneRound}
                </div>
              </div>
            </div>
            <div style={{
              marginTop: 8,
              padding: '8px 10px',
              borderRadius: 8,
              background: 'rgba(0,0,0,0.22)',
              border: '1px solid rgba(232,199,96,0.14)',
              fontFamily: 'EB Garamond, serif',
              fontStyle: 'italic',
              color: '#E8D9B4',
              fontSize: 14,
              lineHeight: 1.35,
            }}>
              Intent: {battle.enemyIntent}
            </div>
          </div>
        </div>
      )}

      <div className="panel-bg" style={{
        padding: '10px 12px',
        borderTop: '1px solid rgba(232,199,96,0.18)',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        flexShrink: 0,
      }}>
        {roomView.status === 'lobby' && (
          <>
            <div style={{ fontFamily: 'EB Garamond, serif', fontStyle: 'italic', color: '#E8D9B4', fontSize: 14 }}>
              Share room code <strong style={{ fontStyle: 'normal', color: '#FFE9A8' }}>{roomView.roomCode}</strong>. The host starts the Ash Hollow Ambush when everyone has selected a saved hero.
            </div>
            <button
              className="btn-primary"
              onClick={() => { void startRoom(); }}
              disabled={!roomView.canStart || loading || previewMode}
            >
              {roomView.canStart ? 'Begin Battle' : 'Waiting for Host'}
            </button>
          </>
        )}

        {roomView.status === 'completed' && (
          <>
            <div style={{ fontFamily: 'EB Garamond, serif', fontStyle: 'italic', color: '#E8D9B4', fontSize: 14 }}>
              {battle.status === 'victory'
                ? `Victory. Claim ${reward.label}, then return to the lobby.`
                : `The party fell back. Claim ${reward.label}, then regroup.`}
              {ownResult ? ` Your last action: ${ownResult.actionLabel} (${ownResult.total}).` : ''}
            </div>
            <button className="btn-primary" onClick={() => { void handleFinish(); }} disabled={loading || previewMode}>
              {roomView.canClaimReward ? `Claim ${reward.label}` : 'Return to Lobby'}
            </button>
          </>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-secondary" onClick={() => { void handleLeave(); }} disabled={loading}>
            Leave Room
          </button>
        </div>

        {error && (
          <button
            onClick={clearError}
            style={{
              background: 'rgba(160,40,40,0.18)',
              border: '1px solid rgba(248,113,113,0.45)',
              borderRadius: 6,
              color: '#FFE9A8',
              fontFamily: 'Inter, sans-serif',
              fontSize: 11,
              padding: '8px 10px',
              textAlign: 'left',
            }}
          >
            {error}
          </button>
        )}
      </div>
    </div>
  );
};
