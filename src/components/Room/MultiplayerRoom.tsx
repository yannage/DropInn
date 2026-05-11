import { useEffect, useMemo, useState } from 'react';
import { getBattleReward, getClassActionLabel } from '../../lib/battle/engine';
import { getCharacterInitial, getCharacterLabel } from '../../lib/character';
import { useLobbyStore } from '../../store/lobbyStore';
import { useMultiplayerStore } from '../../store/multiplayerStore';
import { getSelectedCharacter, usePlayerStore } from '../../store/playerStore';
import { PlayerCard } from './PlayerCard';

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

  const ownResult = useMemo(
    () => room?.lastResults.find((result) => result.sessionId === playerState.sessionId) ?? null,
    [playerState.sessionId, room?.lastResults],
  );

  if (!room) {
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

  const timerSeconds = Math.ceil(room.timeRemainingMs / 1000);
  const battle = room.battleState;
  const reward = getBattleReward(battle.status);
  const recentLog = room.storyLog.slice(-5);

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
            Room {room.roomCode} - {room.participantCount} hero{room.participantCount === 1 ? '' : 'es'}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {room.participants.map((participant) => (
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

      <div style={{
        padding: '12px',
        borderBottom: '1px solid rgba(232,199,96,0.14)',
        background: 'linear-gradient(180deg, rgba(160,40,40,0.18), rgba(15,27,45,0.72))',
        flexShrink: 0,
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
            <div className="ui-num" style={{ fontSize: 18, color: timerSeconds <= 5 && room.status === 'active' ? '#F87171' : '#FFE9A8' }}>
              {room.status === 'active' ? `${timerSeconds}s` : room.status.toUpperCase()}
            </div>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: '#A99668', marginTop: 3 }}>
              Round {room.sceneRound}
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
          minHeight: 132,
          borderRadius: 16,
          border: '1px solid rgba(232,199,96,0.18)',
          background:
            'radial-gradient(circle at 50% 20%, rgba(248,113,113,0.22), transparent 34%), linear-gradient(180deg, rgba(27,44,74,0.78), rgba(8,14,27,0.92))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: 'inset 0 0 30px rgba(0,0,0,0.42)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'linear-gradient(120deg, transparent 0 42%, rgba(232,199,96,0.06) 42% 44%, transparent 44% 100%)',
            opacity: 0.9,
          }} />
          <div style={{
            width: 92,
            height: 92,
            borderRadius: '45% 55% 50% 50%',
            background: battle.status === 'victory'
              ? 'linear-gradient(180deg,#374151,#111827)'
              : 'linear-gradient(180deg,#D85B4C,#5B1010)',
            border: '2px solid rgba(255,233,168,0.45)',
            boxShadow: battle.status === 'active'
              ? '0 0 34px rgba(248,113,113,0.45), inset 0 -16px 24px rgba(0,0,0,0.35)'
              : 'inset 0 -16px 24px rgba(0,0,0,0.45)',
            transform: battle.status === 'victory' ? 'rotate(12deg) scale(0.72)' : 'rotate(-4deg)',
            transition: 'transform 260ms ease, opacity 260ms ease',
            opacity: battle.status === 'victory' ? 0.55 : 1,
            zIndex: 1,
          }}>
            <div style={{
              width: 16,
              height: 16,
              borderRadius: '50%',
              background: '#FFE9A8',
              margin: '22px 0 0 20px',
              boxShadow: '36px 2px 0 #FFE9A8',
            }} />
          </div>
          {room.lastResults.filter((result) => result.damage > 0).slice(-3).map((result, index) => (
            <div key={`${result.characterId}-${result.damage}-${index}`} style={{
              position: 'absolute',
              top: 24 + index * 16,
              right: 64 + index * 18,
              color: '#FFE9A8',
              fontFamily: 'Cinzel, serif',
              fontWeight: 700,
              fontSize: 18,
              textShadow: '0 2px 6px rgba(0,0,0,0.75)',
              animation: 'textRise 420ms ease both',
              zIndex: 2,
            }}>
              -{result.damage}
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
          {room.participants.map((participant) => {
            const result = room.lastResults.find((entry) => entry.sessionId === participant.sessionId);
            const committedAction = room.battleActions.find((action) => action.id === participant.committedActionId);

            return (
              <div key={participant.sessionId} style={{
                borderRadius: 12,
                border: participant.sessionId === playerState.sessionId
                  ? '1.5px solid #E8C760'
                  : '1px solid rgba(232,199,96,0.2)',
                background: participant.downed
                  ? 'linear-gradient(180deg, rgba(80,20,20,0.75), rgba(15,27,45,0.9))'
                  : 'linear-gradient(180deg, rgba(27,44,74,0.92), rgba(14,26,48,0.96))',
                padding: 10,
                minHeight: 104,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: participant.character.accent,
                    border: '1.5px solid rgba(255,239,203,0.45)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'Cinzel, serif',
                    fontWeight: 700,
                    fontSize: 12,
                    color: '#1F1408',
                  }}>
                    {getCharacterInitial(participant.character.name)}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontFamily: 'Cinzel, serif', fontSize: 10, color: '#FFE9A8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {participant.character.name}
                    </div>
                    <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 9, color: '#A99668' }}>
                      {getCharacterLabel(participant.character.classKey)} {participant.isHost ? '- Host' : ''}
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: 8 }}>
                  <HealthBar hp={participant.hp} maxHp={participant.maxHp} />
                  <div style={{ marginTop: 4, display: 'flex', justifyContent: 'space-between', fontFamily: 'Inter, sans-serif', fontSize: 9, color: '#C9B888' }}>
                    <span>HP {participant.hp}/{participant.maxHp}</span>
                    <span>{participant.downed ? 'Downed' : participant.online ? 'Online' : 'Away'}</span>
                  </div>
                </div>
                <div style={{ marginTop: 8, fontFamily: 'Cinzel, serif', fontSize: 9, color: '#E8C760' }}>
                  {result
                    ? `${result.actionLabel}: ${result.damage > 0 ? `${result.damage} dmg` : result.healing > 0 ? `${result.healing} heal` : result.success ? 'setup' : 'miss'}`
                    : committedAction
                      ? `${getClassActionLabel(participant.character.classKey, committedAction.id)} locked`
                      : room.status === 'active'
                        ? 'Choosing...'
                        : 'Ready'}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{
          borderRadius: 12,
          border: '1px solid rgba(232,199,96,0.18)',
          background: 'rgba(5,10,18,0.55)',
          padding: 10,
        }}>
          <div className="heading" style={{ fontSize: 9, color: '#7a6a44', marginBottom: 6 }}>
            Combat Log
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {recentLog.length > 0 ? recentLog.map((entry, index) => (
              <div key={`${entry.turn}-${index}`} style={{
                fontFamily: 'EB Garamond, serif',
                fontStyle: 'italic',
                fontSize: 13,
                lineHeight: 1.3,
                color: index === recentLog.length - 1 ? '#FFE9A8' : '#A99668',
              }}>
                {entry.text}
              </div>
            )) : (
              <div style={{ fontFamily: 'EB Garamond, serif', fontStyle: 'italic', fontSize: 13, color: '#A99668' }}>
                Battle notes will appear here once the first round resolves.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="panel-bg" style={{
        padding: '10px 12px',
        borderTop: '1px solid rgba(232,199,96,0.18)',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        flexShrink: 0,
      }}>
        {room.status === 'lobby' && (
          <>
            <div style={{ fontFamily: 'EB Garamond, serif', fontStyle: 'italic', color: '#E8D9B4', fontSize: 14 }}>
              Share room code <strong style={{ fontStyle: 'normal', color: '#FFE9A8' }}>{room.roomCode}</strong>. The host starts the Ash Hollow Ambush when everyone has selected a saved hero.
            </div>
            <button
              className="btn-primary"
              onClick={() => { void startRoom(); }}
              disabled={!room.canStart || loading}
            >
              {room.canStart ? 'Begin Battle' : 'Waiting for Host'}
            </button>
          </>
        )}

        {room.status === 'active' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
              {room.battleActions.map((action) => {
                const selected = selectedActionId === action.id;
                const committed = room.currentPlayer?.committedActionId === action.id;
                const label = getClassActionLabel(selectedCharacter.classKey, action.id);
                return (
                  <button
                    key={action.id}
                    onClick={() => setSelectedActionId(action.id)}
                    disabled={!room.canCommit || loading}
                    style={{
                      padding: '12px 10px',
                      borderRadius: 8,
                      textAlign: 'left',
                      background: selected || committed
                        ? 'linear-gradient(180deg,#E8C760,#8E6A1A)'
                        : 'linear-gradient(180deg,#1B2C4A,#0E1A30)',
                      border: selected || committed
                        ? '1.5px solid #5C3F09'
                        : '1px solid rgba(232,199,96,0.28)',
                      color: selected || committed ? '#3A2410' : '#FFE9A8',
                      cursor: room.canCommit ? 'pointer' : 'default',
                    }}
                  >
                    <div className="heading" style={{ fontSize: 10, letterSpacing: '0.12em' }}>{label}</div>
                    <div style={{
                      marginTop: 4,
                      fontFamily: 'Inter, sans-serif',
                      fontSize: 10,
                      color: selected || committed ? '#5C3F09' : '#C9B888',
                    }}>
                      {action.trait} DC{action.dc} - {action.description}
                    </div>
                  </button>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn-primary"
                onClick={() => { if (selectedActionId) void commitAction(selectedActionId); }}
                disabled={!room.canCommit || !selectedActionId || loading}
              >
                {room.currentPlayer?.committedActionId ? 'Waiting for Party' : 'Commit Action'}
              </button>
              <button className="btn-secondary" onClick={() => { void syncRoom(); }} disabled={loading}>
                Refresh
              </button>
            </div>
          </>
        )}

        {room.status === 'completed' && (
          <>
            <div style={{ fontFamily: 'EB Garamond, serif', fontStyle: 'italic', color: '#E8D9B4', fontSize: 14 }}>
              {battle.status === 'victory'
                ? `Victory. Claim ${reward.label}, then return to the lobby.`
                : `The party fell back. Claim ${reward.label}, then regroup.`}
              {ownResult ? ` Your last action: ${ownResult.actionLabel} (${ownResult.total}).` : ''}
            </div>
            <button className="btn-primary" onClick={() => { void handleFinish(); }} disabled={loading}>
              {room.canClaimReward ? `Claim ${reward.label}` : 'Return to Lobby'}
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

      <PlayerCard character={selectedCharacter} xp={selectedCharacter.xp} />
    </div>
  );
};

