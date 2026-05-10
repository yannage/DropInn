import { useState } from 'react';
import { getCharacterLabel } from '../../lib/character';
import { useLobbyStore } from '../../store/lobbyStore';
import { getSelectedCharacter, usePlayerStore } from '../../store/playerStore';
import { Modal } from './Modal';

interface Item {
  i: number;
  name: string;
  glyph: string;
  kind: string;
  desc: string;
  qty?: number;
  hidden?: boolean;
}

export const Inventory = () => {
  const closeOverlay = useLobbyStore((state) => state.closeOverlay);
  const selectedCharacter = usePlayerStore(getSelectedCharacter);
  const [sel, setSel] = useState<number | null>(null);

  const inventory = selectedCharacter?.inventory ?? [];
  const hasSalve = inventory.includes('Healing Salve');

  const items: Item[] = [
    {
      i: 0,
      name: selectedCharacter?.classKey === 'fighter' ? 'Guarded Blade' : 'Apprentice Staff',
      glyph: selectedCharacter?.classKey === 'fighter' ? 'S' : 'A',
      kind: 'legendary',
      desc: selectedCharacter?.classKey === 'fighter'
        ? 'A weight-balanced sword that turns a quick response into a strong one.'
        : '+2 INT spells. Hums faintly when an arcane creature is near.',
    },
    {
      i: 1,
      name: selectedCharacter?.classKey === 'rogue' ? 'Lockroll Kit' : 'Field Notes',
      glyph: selectedCharacter?.classKey === 'rogue' ? 'R' : 'F',
      kind: 'has',
      desc: selectedCharacter?.classKey === 'rogue'
        ? 'Needles, picks, and folded wire hidden under soft cloth.'
        : `${getCharacterLabel(selectedCharacter?.classKey ?? 'wizard')} notes, route sketches, and half-finished plans.`,
    },
    {
      i: 2,
      name: 'Healing Salve',
      glyph: '+',
      kind: 'consumable',
      desc: 'Restore 1d4+2 HP. Smells of mint and old herbs.',
      hidden: !hasSalve,
      qty: 1,
    },
    { i: 3, name: 'Coin Pouch', glyph: 'O', kind: 'has', desc: '24 gold pieces. Heavier than it should be.', qty: 24 },
    { i: 4, name: 'Travel Rations', glyph: 'D', kind: 'has', desc: '3 days of dried bread and salted meat.', qty: 3 },
  ];

  const slots = Array.from({ length: 16 }).map((_, index) => items.find((item) => item.i === index && !item.hidden));
  const cur = sel != null ? items.find((item) => item.i === sel) : null;

  return (
    <Modal
      title="Backpack"
      onClose={closeOverlay}
      footer={cur ? (
        <>
          <button className="btn-secondary" onClick={() => setSel(null)}>Back</button>
          <button className="btn-primary">{cur.kind === 'consumable' ? 'Use' : 'Equip'}</button>
        </>
      ) : (
        <>
          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: '#7a6a44' }}>
            {items.filter((item) => !item.hidden).length} / 16 slots
          </span>
          <button className="btn-primary disabled" disabled>Sort</button>
        </>
      )}
    >
      {cur ? (
        <div style={{ padding: '4px 0', textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>{cur.glyph}</div>
          <div style={{ fontFamily: 'Cinzel, serif', fontSize: 14, color: '#E8C760', marginBottom: 6 }}>{cur.name}</div>
          <div style={{ fontFamily: 'EB Garamond, serif', fontStyle: 'italic', fontSize: 13, color: '#FFEFCB', lineHeight: 1.5 }}>
            {cur.desc}
          </div>
          {cur.qty != null && (
            <div style={{ marginTop: 8, fontFamily: 'Inter, sans-serif', fontSize: 11, color: '#A99668' }}>
              Qty: {cur.qty}
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
          {slots.map((item, index) => (
            <div
              key={index}
              onClick={() => item && setSel(item.i)}
              style={{
                height: 52,
                borderRadius: 6,
                background: item ? 'linear-gradient(180deg,#1F2A40,#141E30)' : 'rgba(0,0,0,0.2)',
                border: `1px solid ${item ? 'rgba(232,199,96,0.3)' : 'rgba(255,255,255,0.06)'}`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: item ? 'pointer' : 'default',
                gap: 2,
              }}
            >
              {item && (
                <>
                  <span style={{ fontSize: 20 }}>{item.glyph}</span>
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 7, color: '#A99668', textAlign: 'center' }}>
                    {item.name.split(' ')[0]}
                  </span>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
};
