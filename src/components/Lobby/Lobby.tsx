import { useEffect, useMemo, useState } from 'react';
import {
  CHARACTER_CLASS_PRESETS,
  getCharacterInitial,
  getCharacterLabel,
} from '../../lib/character';
import { useLobbyStore } from '../../store/lobbyStore';
import { useMultiplayerStore } from '../../store/multiplayerStore';
import { getSelectedCharacter, usePlayerStore } from '../../store/playerStore';
import { BellIcon } from '../icons';
import { RoomCard } from './RoomCard';

const partyColors = ['purple', 'green', 'red', 'purple'] as const;

export const Lobby = () => {
  const lobby = useLobbyStore();
  const selectedCharacter = usePlayerStore(getSelectedCharacter);
  const characters = usePlayerStore((state) => state.characters);
  const playerReady = usePlayerStore((state) => state.ready);
  const playerBackend = usePlayerStore((state) => state.backend);
  const playerError = usePlayerStore((state) => state.playerError);
  const clearPlayerError = usePlayerStore((state) => state.clearPlayerError);
  const selectCharacter = usePlayerStore((state) => state.selectCharacter);
  const activeRoomCode = usePlayerStore((state) => state.activeRoomCode);
  const room = useMultiplayerStore((state) => state.room);
  const loading = useMultiplayerStore((state) => state.loading);
  const error = useMultiplayerStore((state) => state.error);
  const clearError = useMultiplayerStore((state) => state.clearError);
  const createRoom = useMultiplayerStore((state) => state.createRoom);
  const joinRoom = useMultiplayerStore((state) => state.joinRoom);
  const syncRoom = useMultiplayerStore((state) => state.syncRoom);
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [handledRoomLink, setHandledRoomLink] = useState(false);
  const [hostMode, setHostMode] = useState<'battle' | 'story'>('battle');

  useEffect(() => {
    if (playerReady && activeRoomCode && !room) {
      void syncRoom();
    }
  }, [activeRoomCode, playerReady, room, syncRoom]);

  useEffect(() => {
    if (handledRoomLink || !playerReady || !selectedCharacter || room || activeRoomCode) return;

    const params = new URLSearchParams(window.location.search);
    const linkedRoomCode = (params.get('room') ?? params.get('join'))?.trim().toUpperCase();
    if (!linkedRoomCode || linkedRoomCode.length < 4) return;

    setHandledRoomLink(true);
    void joinRoom(linkedRoomCode, selectedCharacter).then(() => {
      const joinedRoom = useMultiplayerStore.getState().room;
      if (joinedRoom?.roomCode === linkedRoomCode) {
        lobby.setScreen('room');
      }
    });
  }, [activeRoomCode, handledRoomLink, joinRoom, lobby, playerReady, room, selectedCharacter]);

  const featuredRoom = useMemo(() => {
    if (!room) return null;

    const storyArc = room.storyArc;
    const isStory = room.roomMode === 'story';
    const statusMeta = isStory
      ? {
          lobby: { dot: 'sleeping', badge: 'sleeping', label: 'Gathering Party' },
          active: {
            dot: 'active',
            badge: 'active',
            label: storyArc
              ? `Story · ${storyArc.chapter.charAt(0).toUpperCase()}${storyArc.chapter.slice(1)}`
              : 'Story Arc',
          },
          completed: {
            dot: 'complete',
            badge: 'complete',
            label: 'Story Complete',
          },
        }[room.status]
      : {
          lobby: { dot: 'sleeping', badge: 'sleeping', label: 'Gathering Party' },
          active: { dot: 'active', badge: 'active', label: `Battle Round ${room.sceneRound}` },
          completed: {
            dot: 'complete',
            badge: 'complete',
            label: room.battleState?.status === 'victory' ? 'Victory' : 'Aftermath',
          },
        }[room.status];
    const progress = isStory
      ? room.status === 'completed'
        ? 100
        : storyArc?.chapter === 'beginning'
          ? 18 + (storyArc.clues.length * 22)
          : storyArc?.chapter === 'middle'
            ? 68
            : storyArc?.phase === 'battle'
              ? 92
              : 84
      : room.battleState
        ? Math.round(((room.battleState.enemyMaxHp - room.battleState.enemyHp) / room.battleState.enemyMaxHp) * 100)
        : 10;
    const progressLabel = isStory
      ? storyArc
        ? `Clues ${storyArc.clues.length}/${storyArc.clueTarget} · Setbacks ${storyArc.setbackCount}`
        : 'Story Arc'
      : room.battleState
        ? `Enemy HP ${room.battleState.enemyHp}/${room.battleState.enemyMaxHp}`
        : 'Waiting for battle';

    return {
      title: room.campaignTitle,
      statusDot: statusMeta.dot,
      statusBadge: statusMeta.badge,
      statusLabel: statusMeta.label,
      theme: room.roomTheme,
      party: room.participants.map((participant, index) => ({
        color: partyColors[index % partyColors.length],
        initial: getCharacterInitial(participant.character.name),
        name: participant.character.name,
      })),
      maxPlayers: 4,
      turnDuration: '30s',
      visibilityIcon: isStory ? 'ARC' : 'MP',
      progress: room.status === 'lobby' ? 10 : Math.min(100, Math.max(10, progress)),
      progressLabel,
      lastBeat: room.currentStoryText,
      cta: room.status === 'lobby'
        ? `Enter ${isStory ? 'Story' : 'Battle'} Room`
        : `Resume ${isStory ? 'Story Arc' : 'Battle'}`,
    };
  }, [room]);

  const handleCreateRoom = async () => {
    if (!selectedCharacter || !playerReady) return;
    await createRoom(selectedCharacter, hostMode);

    if (useMultiplayerStore.getState().room) {
      lobby.setScreen('room');
    }
  };

  const handleJoinRoom = async () => {
    if (!selectedCharacter || !playerReady) return;

    const normalizedCode = roomCodeInput.trim().toUpperCase();
    if (!normalizedCode) return;

    await joinRoom(normalizedCode, selectedCharacter);
    const joinedRoom = useMultiplayerStore.getState().room;
    if (joinedRoom?.roomCode === normalizedCode) {
      lobby.setScreen('room');
    }
  };

  return (
    <div className="lobby-bg">
      <div
        className="navbar-bg"
        style={{
          height: 54,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 12px',
          borderBottom: '1px solid rgba(232,199,96,0.18)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            onClick={() => lobby.openOverlay('profile')}
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: selectedCharacter?.accent ?? 'linear-gradient(180deg,#B68CF0,#4A1F8A)',
              border: '2px solid #E8C760',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'Cinzel, serif',
              fontWeight: 700,
              color: '#FFEFCB',
              fontSize: 14,
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3), 0 0 6px rgba(232,199,96,0.4)',
            }}
          >
            {selectedCharacter ? getCharacterInitial(selectedCharacter.name) : '?'}
          </div>
          <div>
            <div
              style={{
                fontFamily: 'Cinzel, serif',
                fontWeight: 700,
                fontSize: 16,
                letterSpacing: '0.06em',
                background: 'linear-gradient(180deg, #FCE89B 0%, #E8C760 45%, #B8902E 100%)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
                lineHeight: 1,
              }}
            >
              Adventures
            </div>
            <div
              style={{
                fontFamily: 'EB Garamond, serif',
                fontStyle: 'italic',
                fontSize: 11,
                color: '#A99668',
                marginTop: 1,
              }}
            >
              {selectedCharacter
                ? `${selectedCharacter.name} · ${getCharacterLabel(selectedCharacter.classKey)} · Lvl ${selectedCharacter.level} · ${selectedCharacter.xp} XP`
                : playerReady ? 'Create a hero to begin' : 'Loading profile...'}
            </div>
          </div>
        </div>

        <div
          onClick={() => lobby.openOverlay('notifs')}
          style={{
            position: 'relative',
            cursor: 'pointer',
            width: 36,
            height: 36,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(180deg,#1B2C4A,#0E1A30)',
            border: '1px solid rgba(232,199,96,0.3)',
            borderRadius: 8,
          }}
        >
          <BellIcon size={18} />
          <div
            style={{
              position: 'absolute',
              top: -3,
              right: -3,
              width: 14,
              height: 14,
              borderRadius: '50%',
              background: '#A02828',
              border: '1.5px solid #0F1B2D',
              color: '#FFE9A8',
              fontFamily: 'Inter, sans-serif',
              fontSize: 9,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            2
          </div>
        </div>
      </div>

      <div className="lobby-list">
        <div
          style={{
            background: 'linear-gradient(180deg, rgba(232,199,96,0.12), rgba(15,27,45,0.6))',
            border: '1px solid rgba(232,199,96,0.22)',
            borderRadius: 12,
            padding: 14,
          }}
        >
          <div
            style={{
              fontFamily: 'Cinzel, serif',
              fontSize: 10,
              letterSpacing: '0.16em',
              color: '#7a6a44',
              textTransform: 'uppercase',
            }}
          >
            Saved Characters
          </div>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginTop: 10, paddingBottom: 2 }}>
            {characters.map((character) => {
              const selected = selectedCharacter?.id === character.id;
              const preset = CHARACTER_CLASS_PRESETS[character.classKey];
              return (
                <button
                  key={character.id}
                  onClick={() => selectCharacter(character.id)}
                  style={{
                    minWidth: 122,
                    borderRadius: 10,
                    border: selected ? '1.5px solid #E8C760' : '1px solid rgba(232,199,96,0.18)',
                    background: selected
                      ? 'linear-gradient(180deg, rgba(232,199,96,0.24), rgba(27,44,74,0.96))'
                      : 'linear-gradient(180deg, rgba(27,44,74,0.92), rgba(14,26,48,0.96))',
                    color: '#FFE9A8',
                    padding: '10px 10px 12px',
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: '50%',
                        background: preset.accent,
                        border: '1.5px solid rgba(255,239,203,0.45)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontFamily: 'Cinzel, serif',
                        fontSize: 12,
                        fontWeight: 700,
                        color: '#1F1408',
                      }}
                    >
                      {getCharacterInitial(character.name)}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontFamily: 'Cinzel, serif',
                          fontSize: 10,
                          color: '#FFE9A8',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {character.name}
                      </div>
                      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 9, color: '#A99668' }}>
                        {preset.label} · {character.xp} XP
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          <button className="btn-secondary" style={{ marginTop: 12 }} onClick={() => lobby.openOverlay('profile')}>
            Manage Characters
          </button>
        </div>

        {featuredRoom ? (
          <>
            <div
              style={{
                fontFamily: 'Cinzel, serif',
                fontSize: 10,
                letterSpacing: '0.16em',
                color: '#7a6a44',
                textTransform: 'uppercase',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span style={{ flex: 1, height: 1, background: 'rgba(232,199,96,0.18)' }} />
              <span>Current Party</span>
              <span style={{ flex: 1, height: 1, background: 'rgba(232,199,96,0.18)' }} />
            </div>
            <RoomCard room={featuredRoom} featured onTap={() => lobby.setScreen('room')} />
          </>
        ) : activeRoomCode ? (
          <div
            style={{
              background: 'linear-gradient(180deg,#1A2B47 0%, #0F1B2D 100%)',
              border: '1px solid rgba(232,199,96,0.22)',
              borderRadius: 10,
              padding: 14,
            }}
          >
            <div style={{ fontFamily: 'Cinzel, serif', fontSize: 12, color: '#FFE9A8' }}>
              Reconnect to room {activeRoomCode}
            </div>
            <div style={{ fontFamily: 'EB Garamond, serif', fontStyle: 'italic', color: '#A99668', marginTop: 6 }}>
              The last room code is still saved. Refresh the shared state, then step back in.
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button className="btn-secondary" onClick={() => { void syncRoom(); }} disabled={loading}>
                Refresh Room
              </button>
            </div>
          </div>
        ) : null}

        <div
          style={{
            background: 'linear-gradient(180deg,#1A2B47 0%, #0F1B2D 100%)',
            border: '1px solid rgba(232,199,96,0.22)',
            borderRadius: 12,
            padding: 14,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <div
            style={{
              fontFamily: 'Cinzel, serif',
              fontSize: 10,
              letterSpacing: '0.16em',
              color: '#7a6a44',
              textTransform: 'uppercase',
            }}
          >
            Multiplayer Setup
          </div>
          <div
            style={{
              fontFamily: 'EB Garamond, serif',
              fontStyle: 'italic',
              fontSize: 14,
              lineHeight: 1.45,
              color: '#E8D9B4',
            }}
          >
            Host either a straight battle or a low-friction story arc. Your selected character is saved and follows you into every session.
            {playerBackend === 'local' ? ' Local dev fallback is active until Supabase env vars are set.' : ''}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setHostMode('battle')}
              style={hostMode === 'battle' ? { borderColor: '#E8C760', color: '#FFE9A8' } : undefined}
            >
              Battle
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setHostMode('story')}
              style={hostMode === 'story' ? { borderColor: '#E8C760', color: '#FFE9A8' } : undefined}
            >
              Story Arc
            </button>
          </div>
          <button className="btn-primary" onClick={() => { void handleCreateRoom(); }} disabled={loading || !selectedCharacter || !playerReady}>
            {hostMode === 'story' ? 'Create Story Arc Room' : 'Create Battle Room'}
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={roomCodeInput}
              onChange={(event) => setRoomCodeInput(event.target.value.toUpperCase().slice(0, 6))}
              placeholder="ROOM CODE"
              style={{
                flex: 1,
                borderRadius: 8,
                border: '1px solid rgba(232,199,96,0.3)',
                background: 'rgba(0,0,0,0.2)',
                color: '#FFE9A8',
                padding: '0 12px',
                fontFamily: 'Cinzel, serif',
                fontSize: 13,
                letterSpacing: '0.18em',
                minHeight: 42,
              }}
            />
            <button className="btn-secondary" onClick={() => { void handleJoinRoom(); }} disabled={loading || !playerReady || roomCodeInput.trim().length < 4}>
              Join
            </button>
          </div>
        </div>

        <div
          style={{
            background: 'linear-gradient(180deg,#1A2B47 0%, #0F1B2D 100%)',
            border: '1px solid rgba(232,199,96,0.12)',
            borderRadius: 12,
            padding: 14,
          }}
        >
          <div
            style={{
              fontFamily: 'Cinzel, serif',
              fontSize: 10,
              letterSpacing: '0.16em',
              color: '#7a6a44',
              textTransform: 'uppercase',
            }}
          >
            What Changed
          </div>
          <div
            style={{
              marginTop: 8,
              fontFamily: 'EB Garamond, serif',
              fontStyle: 'italic',
              fontSize: 14,
              lineHeight: 1.45,
              color: '#A99668',
            }}
          >
            V1 now centers on a co-op battle MVP: saved heroes, room-code parties, shared enemy HP, damage, rewards, and Supabase-ready persistence.
          </div>
        </div>

        {playerError && (
          <button
            onClick={clearPlayerError}
            style={{
              background: 'rgba(160,40,40,0.18)',
              border: '1px solid rgba(248,113,113,0.45)',
              borderRadius: 8,
              color: '#FFE9A8',
              fontFamily: 'Inter, sans-serif',
              fontSize: 11,
              padding: '10px 12px',
              textAlign: 'left',
            }}
          >
            {playerError}
          </button>
        )}

        {error && (
          <button
            onClick={clearError}
            style={{
              background: 'rgba(160,40,40,0.18)',
              border: '1px solid rgba(248,113,113,0.45)',
              borderRadius: 8,
              color: '#FFE9A8',
              fontFamily: 'Inter, sans-serif',
              fontSize: 11,
              padding: '10px 12px',
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
