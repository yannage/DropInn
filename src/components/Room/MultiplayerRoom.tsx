import { useEffect, useMemo, useState } from 'react';
import { ACTIONS_BY_ROUND, BOT_PLAYS_BY_ROUND } from '../../data/campaign';
import { getCharacterInitial, getCharacterLabel } from '../../lib/character';
import { useLobbyStore } from '../../store/lobbyStore';
import { useMultiplayerStore } from '../../store/multiplayerStore';
import { getSelectedCharacter, usePlayerStore } from '../../store/playerStore';
import { StoryScroll } from './StoryScroll';
import { PlayerCard } from './PlayerCard';

const tableSlots = [
  { left: '8%', top: '10%', rotate: '-10deg' },
  { left: '36%', top: '-2%', rotate: '2deg' },
  { left: '62%', top: '12%', rotate: '10deg' },
  { left: '26%', top: '54%', rotate: '-6deg' },
];

export const MultiplayerRoom = () => {
  const lobby = useLobbyStore();
  const room = useMultiplayerStore((state) => state.room);
  const loading = useMultiplayerStore((state) => state.loading);
  const error = useMultiplayerStore((state) => state.error);
  const clearError = useMultiplayerStore((state) => state.clearError);
  const syncRoom = useMultiplayerStore((state) => state.syncRoom);
  const startRoom = useMultiplayerStore((state) => state.startRoom);
  const commitAction = useMultiplayerStore((state) => state.commitAction);
  const continueRoom = useMultiplayerStore((state) => state.continueRoom);
  const leaveRoom = useMultiplayerStore((state) => state.leaveRoom);
  const claimReward = useMultiplayerStore((state) => state.claimReward);

  const playerState = usePlayerStore();
  const selectedCharacter = getSelectedCharacter(playerState);
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);

  useEffect(() => {
    syncRoom();
    const id = window.setInterval(() => { void syncRoom(); }, 2500);
    return () => window.clearInterval(id);
  }, [syncRoom]);

  useEffect(() => {
    if (room?.status !== 'active') {
      setSelectedActionId(null);
    }
  }, [room?.status, room?.sceneRound, room?.turn]);

  const actions = ACTIONS_BY_ROUND[room?.sceneRound ?? 1] ?? ACTIONS_BY_ROUND[1];
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
  const botPlay = BOT_PLAYS_BY_ROUND[room.sceneRound]?.bram;

  const handleFinish = async () => {
    const claimed = await claimReward();
    if (claimed) {
      usePlayerStore.getState().updateSelectedCharacter((character) => ({
        ...character,
        xp: character.xp + 50,
        inventory: character.inventory.includes('Healing Salve')
          ? character.inventory
          : [...character.inventory, 'Healing Salve'],
      }));
    }

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
      background: '#0F1B2D',
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
            {room.campaignTitle}
          </div>
          <div style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: 10,
            color: '#A99668',
            marginTop: 2,
          }}>
            Room {room.roomCode} · {room.participantCount} adventurer{room.participantCount === 1 ? '' : 's'}
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
                border: '1.5px solid #E8C760',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'Cinzel, serif',
                fontWeight: 700,
                fontSize: 11,
                color: '#1F1408',
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
        position: 'relative',
        background: 'linear-gradient(180deg,#1F3160 0%, #182747 100%)',
        border: '1px solid rgba(232,199,96,0.35)',
        borderLeft: 'none',
        borderRight: 'none',
        minHeight: 82,
        display: 'flex',
        alignItems: 'center',
        padding: '10px 12px',
        gap: 12,
        flexShrink: 0,
      }}>
        <div>
          <div className="heading gold-text" style={{ fontSize: 15, lineHeight: 1.1 }}>
            Thornwick<br />Market
          </div>
          <button
            onClick={() => lobby.openOverlay('npc')}
            style={{
              marginTop: 4,
              background: 'rgba(232,199,96,0.1)',
              border: '1px solid rgba(232,199,96,0.3)',
              borderRadius: 4,
              padding: '2px 6px',
              cursor: 'pointer',
              fontFamily: 'EB Garamond, serif',
              fontStyle: 'italic',
              fontSize: 11,
              color: '#C9B888',
            }}
          >
            👤 Pip
          </button>
        </div>

        <div style={{ flex: 1, textAlign: 'center' }}>
          <div className="heading gold-text" style={{ fontSize: 12, letterSpacing: '0.14em' }}>
            ROUND {room.sceneRound} / 3
          </div>
          <div style={{
            marginTop: 4,
            fontFamily: 'Inter, sans-serif',
            fontSize: 11,
            color: '#E8D9B4',
          }}>
            Turn {room.turn} · {room.committedCount}/{room.participantCount} committed
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div className="ui-num" style={{ fontSize: 18, color: timerSeconds <= 5 ? '#F87171' : '#FFE9A8' }}>
            {room.status === 'active' ? `${timerSeconds}s` : room.status.toUpperCase()}
          </div>
          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: '#A99668' }}>
            {botPlay ? `Bram: ${botPlay.label}` : 'Shared scene'}
          </div>
        </div>
      </div>

      <StoryScroll
        text={room.currentStoryText}
        refreshKey={`${room.status}-${room.sceneRound}-${room.turn}-${room.storyLog.length}`}
        rollResult={ownResult}
        storyLog={room.storyLog}
      />

      <div className="cobblestones" style={{
        position: 'relative',
        height: 230,
        padding: '8px 8px 0',
        borderTop: '1px solid rgba(0,0,0,0.5)',
        borderBottom: '1px solid rgba(0,0,0,0.5)',
        flexShrink: 0,
      }}>
        <div className="wood" style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: '92%',
          height: 190,
          borderRadius: '50%',
          boxShadow: '0 12px 24px rgba(0,0,0,0.6), inset 0 -8px 14px rgba(0,0,0,0.4), inset 0 4px 8px rgba(255,210,150,0.1)',
          border: '4px solid #3A2414',
        }}>
          <div style={{
            position: 'absolute',
            inset: 6,
            borderRadius: '50%',
            border: '1.5px solid rgba(255,210,150,0.18)',
            pointerEvents: 'none',
          }} />

          {room.participants.map((participant, index) => {
            const slot = tableSlots[index] ?? tableSlots[tableSlots.length - 1];
            const result = room.lastResults.find((entry) => entry.sessionId === participant.sessionId);
            const committedAction = actions.find((action) => action.id === participant.committedActionId);

            return (
              <div key={participant.sessionId} style={{
                position: 'absolute',
                left: slot.left,
                top: slot.top,
                transform: `rotate(${slot.rotate})`,
                width: 106,
                minHeight: 76,
                borderRadius: 8,
                border: '1.5px solid rgba(232,199,96,0.45)',
                background: room.status === 'reward' || room.status === 'completed'
                  ? 'linear-gradient(180deg,#E8D9B4,#C9B888)'
                  : 'linear-gradient(180deg,#F2E3BE,#E8D9B4)',
                color: '#1F1408',
                boxShadow: '0 6px 12px rgba(0,0,0,0.35)',
                padding: '8px 10px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{
                    width: 26,
                    height: 26,
                    borderRadius: '50%',
                    background: participant.character.accent,
                    border: '1px solid #5C3F09',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'Cinzel, serif',
                    fontSize: 11,
                    fontWeight: 700,
                  }}>
                    {getCharacterInitial(participant.character.name)}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div className="heading" style={{ fontSize: 9, color: '#5C3F09', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {participant.character.name}
                    </div>
                    <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 8, color: '#7a6a44' }}>
                      {getCharacterLabel(participant.character.classKey)}
                    </div>
                  </div>
                </div>

                <div style={{
                  marginTop: 8,
                  fontFamily: 'Cinzel, serif',
                  fontSize: 9,
                  color: '#3A2410',
                }}>
                  {result
                    ? `${result.actionLabel} · ${result.success ? 'Success' : 'Miss'}`
                    : committedAction
                      ? `${committedAction.label} locked in`
                      : 'Choosing action…'}
                </div>
              </div>
            );
          })}

          <div style={{
            position: 'absolute',
            left: '50%',
            bottom: '18%',
            transform: 'translate(-50%, 0)',
            width: 120,
            textAlign: 'center',
            color: '#FFE9A8',
          }}>
            <div className="heading gold-text" style={{ fontSize: 11 }}>
              {room.status === 'lobby'
                ? 'Awaiting the party'
                : room.status === 'active'
                  ? 'Seal your move'
                  : room.status === 'reward'
                    ? 'Resolution ready'
                    : 'Scene complete'}
            </div>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 9, color: '#C9B888', marginTop: 2 }}>
              {room.participantCount} players · code {room.roomCode}
            </div>
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
              Share room code <strong style={{ fontStyle: 'normal', color: '#FFE9A8' }}>{room.roomCode}</strong> and wait for the party to gather.
            </div>
            <button
              className="btn-primary"
              onClick={() => { void startRoom(); }}
              disabled={!room.canStart || loading}
            >
              {room.canStart ? 'Begin Adventure' : 'Waiting for host'}
            </button>
          </>
        )}

        {room.status === 'active' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
              {actions.map((action) => {
                const selected = selectedActionId === action.id;
                const committed = room.currentPlayer?.committedActionId === action.id;
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
                    <div className="heading" style={{ fontSize: 10, letterSpacing: '0.12em' }}>{action.label}</div>
                    <div style={{
                      marginTop: 4,
                      fontFamily: 'Inter, sans-serif',
                      fontSize: 10,
                      color: selected || committed ? '#5C3F09' : '#C9B888',
                    }}>
                      {action.trait} DC{action.dc}
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
                {room.currentPlayer?.committedActionId ? 'Waiting for party' : 'Commit Action'}
              </button>
              <button className="btn-secondary" onClick={() => { void syncRoom(); }} disabled={loading}>
                Refresh
              </button>
            </div>
          </>
        )}

        {room.status === 'reward' && (
          <>
            <div style={{ fontFamily: 'EB Garamond, serif', fontStyle: 'italic', color: '#E8D9B4', fontSize: 14 }}>
              {ownResult
                ? `${ownResult.characterName} rolled ${ownResult.total}. The rest of the party is ready to press on.`
                : 'The turn has resolved. Review the chronicle, then continue when ready.'}
            </div>
            <button className="btn-primary" onClick={() => { void continueRoom(); }} disabled={loading}>
              {room.isHost ? 'Advance Scene' : 'Ready Up'}
            </button>
          </>
        )}

        {room.status === 'completed' && (
          <>
            <div style={{ fontFamily: 'EB Garamond, serif', fontStyle: 'italic', color: '#E8D9B4', fontSize: 14 }}>
              The first multiplayer scene is complete. Claim the reward, then return to the lobby for the next pass.
            </div>
            <button className="btn-primary" onClick={() => { void handleFinish(); }} disabled={loading}>
              {room.canClaimReward ? 'Claim +50 XP & Finish' : 'Finish & Return'}
            </button>
          </>
        )}

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
