import { useState, useEffect } from 'react';
import { Defs } from './components/icons';
import { AppBar } from './components/AppBar';
import { Lobby } from './components/Lobby/Lobby';
import { Room } from './components/Room/Room';
import { PreviouslyOn } from './components/overlays/PreviouslyOn';
import { DropInBanner } from './components/overlays/DropInBanner';
import { HistoryLog } from './components/overlays/HistoryLog';
import { Inventory } from './components/modals/Inventory';
import { Help } from './components/modals/Help';
import { LeaveConfirm } from './components/modals/LeaveConfirm';
import { NPCDetail } from './components/modals/NPCDetail';
import { SpotlightModal } from './components/modals/Spotlight';
import { Notifications } from './components/modals/Notifications';
import { Profile } from './components/modals/Profile';
import { V2Stub } from './components/modals/V2Stub';
import { useLobbyStore } from './store/lobbyStore';

export default function App() {
  const { screen, overlay, setScreen, completed } = useLobbyStore();
  const [showDropIn, setShowDropIn] = useState(false);

  const handleEnterRoom = () => {
    setShowDropIn(true);
    setScreen('room');
  };

  // When room loads, show drop-in banner
  useEffect(() => {
    if (screen === 'room' && showDropIn) {
      const id = setTimeout(() => setShowDropIn(false), 4500);
      return () => clearTimeout(id);
    }
  }, [screen, showDropIn]);

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: '100dvh',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      background: '#0F1B2D',
    }}>
      <Defs/>

      {screen === 'lobby' && (
        <>
          <Lobby/>
        </>
      )}

      {screen === 'previously' && (
        <PreviouslyOn
          completed={completed}
          onContinue={handleEnterRoom}
        />
      )}

      {screen === 'room' && (
        <>
          <AppBar/>
          <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
            <Room/>
            {showDropIn && <DropInBanner onClose={() => setShowDropIn(false)}/>}
          </div>
        </>
      )}

      {/* Overlays */}
      {overlay === 'history'   && <HistoryLog/>}
      {overlay === 'inventory' && <Inventory/>}
      {overlay === 'help'      && <Help/>}
      {overlay === 'leave'     && <LeaveConfirm/>}
      {overlay === 'npc'       && <NPCDetail/>}
      {overlay === 'spotlight' && <SpotlightModal/>}
      {overlay === 'notifs'    && <Notifications/>}
      {overlay === 'profile'   && <Profile/>}
      {overlay === 'v2stub'    && <V2Stub/>}
    </div>
  );
}
