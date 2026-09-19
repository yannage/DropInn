import { useEffect, useState } from 'react';
import { AppBar } from '../AppBar';
import { Defs } from '../icons';
import { Lobby } from '../Lobby/Lobby';
import { Help } from '../modals/Help';
import { Inventory } from '../modals/Inventory';
import { LeaveConfirm } from '../modals/LeaveConfirm';
import { Notifications } from '../modals/Notifications';
import { NPCDetail } from '../modals/NPCDetail';
import { Profile } from '../modals/Profile';
import { SpotlightModal } from '../modals/Spotlight';
import { V2Stub } from '../modals/V2Stub';
import { DropInBanner } from '../overlays/DropInBanner';
import { HistoryLog } from '../overlays/HistoryLog';
import { PreviouslyOn } from '../overlays/PreviouslyOn';
import { MultiplayerRoom } from '../Room/MultiplayerRoom';
import { useLobbyStore } from '../../store/lobbyStore';
import { useMultiplayerStore } from '../../store/multiplayerStore';
import { usePlayerStore } from '../../store/playerStore';

export default function LegacyApp() {
  const { screen, overlay, setScreen, completed } = useLobbyStore();
  const [showDropIn, setShowDropIn] = useState(false);
  const forceMockRoom =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('mockRoom') === '1';
  const syncRoom = useMultiplayerStore((state) => state.syncRoom);
  const room = useMultiplayerStore((state) => state.room);
  const activeRoomCode = usePlayerStore((state) => state.activeRoomCode);
  const playerReady = usePlayerStore((state) => state.ready);
  const initializePlayer = usePlayerStore((state) => state.initializePlayer);

  const handleEnterRoom = () => {
    setShowDropIn(true);
    setScreen('room');
  };

  useEffect(() => {
    void initializePlayer();
  }, [initializePlayer]);

  useEffect(() => {
    if (playerReady && activeRoomCode && !room) {
      void syncRoom();
    }
  }, [activeRoomCode, playerReady, room, syncRoom]);

  useEffect(() => {
    if (screen === 'room' && showDropIn) {
      const id = window.setTimeout(() => setShowDropIn(false), 4500);
      return () => window.clearTimeout(id);
    }

    return undefined;
  }, [screen, showDropIn]);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100dvh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        background: '#0F1B2D',
      }}
    >
      <Defs />

      {!forceMockRoom && screen === 'lobby' && <Lobby />}

      {!forceMockRoom && screen === 'previously' && (
        <PreviouslyOn completed={completed} onContinue={handleEnterRoom} />
      )}

      {(screen === 'room' || forceMockRoom) && (
        <>
          <AppBar />
          <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
            <MultiplayerRoom />
            {showDropIn && (
              <DropInBanner onClose={() => setShowDropIn(false)} />
            )}
          </div>
        </>
      )}

      {overlay === 'history' && <HistoryLog />}
      {overlay === 'inventory' && <Inventory />}
      {overlay === 'help' && <Help />}
      {overlay === 'leave' && <LeaveConfirm />}
      {overlay === 'npc' && <NPCDetail />}
      {overlay === 'spotlight' && <SpotlightModal />}
      {overlay === 'notifs' && <Notifications />}
      {overlay === 'profile' && <Profile />}
      {overlay === 'v2stub' && <V2Stub />}
    </div>
  );
}
