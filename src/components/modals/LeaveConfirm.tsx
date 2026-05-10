import { Modal } from './Modal';
import { useLobbyStore } from '../../store/lobbyStore';

export const LeaveConfirm = () => {
  const { closeOverlay, onLeave } = useLobbyStore();
  return (
    <Modal title="Leave the Room?" onClose={closeOverlay}
      footer={
        <>
          <button className="btn-secondary" onClick={closeOverlay}>Stay</button>
          <button className="btn-primary" onClick={onLeave} style={{ background: 'linear-gradient(180deg,#C53030,#7E1A1A)', color: '#FFEFCB' }}>
            Leave
          </button>
        </>
      }
    >
      <div style={{ fontFamily: 'EB Garamond, serif', fontStyle: 'italic', fontSize: 14, color: '#E8D9B4', lineHeight: 1.55 }}>
        Yanni steps back from the market stall. Pip eyes him with practiced suspicion, already
        counting his coins again. The smoke on the northern road hasn't thinned.
      </div>
      <div style={{ marginTop: 10, fontFamily: 'Inter, sans-serif', fontSize: 11, color: '#7a6a44' }}>
        Your progress is saved. You can return from the lobby.
      </div>
    </Modal>
  );
};
