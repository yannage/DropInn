import { useState } from 'react';
import { Modal } from './Modal';
import { useLobbyStore } from '../../store/lobbyStore';
import { useGameStore } from '../../store/gameStore';

export const SpotlightModal = () => {
  const [text, setText] = useState('');
  const { closeOverlay, onSpotlightCommit } = useLobbyStore();
  const setPendingSpotlight = useGameStore(s => s.setPendingSpotlight);

  const handleCommit = () => {
    if (!text.trim()) return;
    setPendingSpotlight(text.trim());
    onSpotlightCommit(text.trim());
  };

  return (
    <Modal title="Spotlight" onClose={closeOverlay}
      footer={
        <>
          <button className="btn-secondary" onClick={closeOverlay}>Cancel</button>
          <button
            className={`btn-primary${!text.trim() ? ' disabled' : ''}`}
            onClick={handleCommit}
            disabled={!text.trim()}
          >
            Commit ✦
          </button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontFamily: 'EB Garamond, serif', fontStyle: 'italic', fontSize: 13, color: '#A99668', lineHeight: 1.5 }}>
          Describe what your character does. Keep it to one sentence. This will be woven into the next resolution.
        </div>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          maxLength={120}
          rows={3}
          placeholder="e.g. &quot;I pull out my spellbook and read Pip's aura...&quot;"
          style={{
            width: '100%', boxSizing: 'border-box',
            background: 'linear-gradient(180deg,#1F2A40,#141E30)',
            border: '1px solid rgba(232,199,96,0.35)',
            borderRadius: 6, padding: '10px',
            fontFamily: 'Caveat, cursive', fontSize: 16, color: '#FFE9A8',
            resize: 'none',
            outline: 'none',
          }}
        />
        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 9, color: '#5C3F09', textAlign: 'right' }}>
          {text.length} / 120
        </div>
      </div>
    </Modal>
  );
};
