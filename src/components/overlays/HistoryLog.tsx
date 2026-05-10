import type { StoryEntry } from '../../lib/engine';
import { useGameStore } from '../../store/gameStore';
import { useLobbyStore } from '../../store/lobbyStore';
import { useMultiplayerStore } from '../../store/multiplayerStore';

const EntryRow = ({ entry }: { entry: StoryEntry }) => (
  <div
    style={{
      marginBottom: 16,
      paddingBottom: 16,
      borderBottom: '1px dashed rgba(160,130,80,0.3)',
    }}
  >
    {entry.kind === 'spotlight' && entry.spotlightText && (
      <div
        style={{
          fontFamily: 'Caveat, cursive',
          fontSize: 16,
          color: '#E8C760',
          borderLeft: '3px solid #E8C760',
          paddingLeft: 10,
          marginBottom: 6,
        }}
      >
        * {entry.spotlightText}
      </div>
    )}
    <p className="body-serif" style={{ fontSize: 13, color: '#1F1408', lineHeight: 1.5, margin: 0 }}>
      {entry.text}
    </p>
    {entry.roll && (
      <div
        style={{
          marginTop: 4,
          fontFamily: 'Cinzel, serif',
          fontSize: 9,
          letterSpacing: '0.12em',
          color: entry.roll.success ? '#22863a' : '#7E1A1A',
        }}
      >
        d20+{entry.roll.mod} = {entry.roll.total} - {entry.roll.success ? 'Success' : 'Partial'}
      </div>
    )}
  </div>
);

export const HistoryLog = () => {
  const room = useMultiplayerStore((state) => state.room);
  const storyLog = room?.storyLog ?? useGameStore((state) => state.storyLog);
  const closeOverlay = useLobbyStore((state) => state.closeOverlay);

  return (
    <>
      <div className="modal-shade" onClick={closeOverlay} />
      <div
        style={{
          position: 'absolute',
          left: 12,
          right: 12,
          top: 40,
          bottom: 40,
          zIndex: 100,
          background: 'linear-gradient(180deg, #F2E3BE 0%, #E8D9B4 50%, #C9B888 100%)',
          borderRadius: 10,
          border: '2px solid #A08040',
          boxShadow: '0 20px 40px rgba(0,0,0,0.7)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '14px 16px',
            borderBottom: '1px solid #B8A66A',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(160,130,80,0.2)',
          }}
        >
          <span className="heading" style={{ fontSize: 13, letterSpacing: '0.12em', color: '#3A2414' }}>
            CHRONICLE - {room?.campaignTitle ?? 'The Dragon of Ash Hollow'}
          </span>
          <button
            onClick={closeOverlay}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'Cinzel, serif',
              fontSize: 14,
              color: '#5C3F09',
            }}
          >
            x
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          {storyLog.length === 0 ? (
            <p className="body-serif" style={{ color: '#7a6a44', fontStyle: 'italic', textAlign: 'center', marginTop: 40 }}>
              The chronicle is empty. Play a turn to begin the story.
            </p>
          ) : (
            storyLog.map((entry, index) => <EntryRow key={index} entry={entry} />)
          )}
        </div>

        <div
          style={{
            padding: '10px 16px',
            borderTop: '1px solid #B8A66A',
            background: 'rgba(160,130,80,0.2)',
            fontFamily: 'EB Garamond, serif',
            fontStyle: 'italic',
            fontSize: 11,
            color: '#7a6a44',
          }}
        >
          {room
            ? `Room ${room.roomCode} · ${room.participantCount} adventurer${room.participantCount === 1 ? '' : 's'} in party`
            : 'Previously: Yanni and Bram arrived in Thornwick, following smoke on the northern road.'}
        </div>
      </div>
    </>
  );
};
