import { useLobbyStore } from '../../store/lobbyStore';
import { useMultiplayerStore } from '../../store/multiplayerStore';
import { getSelectedCharacter, usePlayerStore } from '../../store/playerStore';
import { Modal } from './Modal';

export const LeaveConfirm = () => {
  const { closeOverlay, onLeave } = useLobbyStore();
  const leaveRoom = useMultiplayerStore((state) => state.leaveRoom);
  const selectedCharacter = usePlayerStore(getSelectedCharacter);

  const handleLeave = async () => {
    await leaveRoom();
    onLeave();
  };

  return (
    <Modal
      title="Leave the Room?"
      onClose={closeOverlay}
      footer={(
        <>
          <button className="btn-secondary" onClick={closeOverlay}>Stay</button>
          <button
            className="btn-primary"
            onClick={() => { void handleLeave(); }}
            style={{ background: 'linear-gradient(180deg,#C53030,#7E1A1A)', color: '#FFEFCB' }}
          >
            Leave
          </button>
        </>
      )}
    >
      <div style={{ fontFamily: 'EB Garamond, serif', fontStyle: 'italic', fontSize: 14, color: '#E8D9B4', lineHeight: 1.55 }}>
        {selectedCharacter?.name ?? 'Your hero'} steps back from the shared table. The room stays available for whoever remains, and you can rejoin later from the lobby with the same saved character.
      </div>
      <div style={{ marginTop: 10, fontFamily: 'Inter, sans-serif', fontSize: 11, color: '#7a6a44' }}>
        Your progress is saved. You can return from the lobby.
      </div>
    </Modal>
  );
};
