import { useState } from 'react';
import { Modal } from './Modal';
import { useLobbyStore } from '../../store/lobbyStore';

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
  const { closeOverlay, hasSalve } = useLobbyStore();
  const [sel, setSel] = useState<number | null>(null);

  const items: Item[] = [
    { i:0, name:'Apprentice Staff',  glyph:'⚝', kind:'legendary', desc:'+2 INT spells. Hums faintly when an arcane creature is near.' },
    { i:1, name:'Spellbook',         glyph:'✦', kind:'has',        desc:'Three prepared spells: Fire Bolt, Mage Hand, Light.' },
    { i:2, name:'Healing Salve',     glyph:'❀', kind:'consumable', desc:'Restore 1d4+2 HP. Smells of mint and old herbs.', hidden: !hasSalve, qty:1 },
    { i:3, name:'Coin Pouch',        glyph:'◉', kind:'has',        desc:'24 gold pieces. Heavier than it should be.', qty:24 },
    { i:4, name:'Travel Rations',    glyph:'◈', kind:'has',        desc:'3 days of dried bread and salted meat.', qty:3 },
  ];

  const slots = Array.from({ length: 16 }).map((_, i) => items.find(it => it.i === i && !it.hidden));
  const cur = sel != null ? items.find(it => it.i === sel) : null;

  return (
    <Modal title="Backpack" onClose={closeOverlay}
      footer={cur ? (
        <>
          <button className="btn-secondary" onClick={() => setSel(null)}>Back</button>
          <button className="btn-primary">{cur.kind === 'consumable' ? 'Use' : 'Equip'}</button>
        </>
      ) : (
        <>
          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: '#7a6a44' }}>
            {items.filter(it => !it.hidden).length} / 16 slots
          </span>
          <button className="btn-primary disabled" disabled>Sort</button>
        </>
      )}
    >
      {cur ? (
        <div style={{ padding: '4px 0', textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>{cur.glyph}</div>
          <div style={{ fontFamily: 'Cinzel, serif', fontSize: 14, color: '#E8C760', marginBottom: 6 }}>{cur.name}</div>
          <div style={{ fontFamily: 'EB Garamond, serif', fontStyle: 'italic', fontSize: 13, color: '#FFEFCB', lineHeight: 1.5 }}>{cur.desc}</div>
          {cur.qty != null && (
            <div style={{ marginTop: 8, fontFamily: 'Inter, sans-serif', fontSize: 11, color: '#A99668' }}>
              Qty: {cur.qty}
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
          {slots.map((item, idx) => (
            <div
              key={idx}
              onClick={() => item && setSel(item.i)}
              style={{
                height: 52, borderRadius: 6,
                background: item ? 'linear-gradient(180deg,#1F2A40,#141E30)' : 'rgba(0,0,0,0.2)',
                border: `1px solid ${item ? 'rgba(232,199,96,0.3)' : 'rgba(255,255,255,0.06)'}`,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
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
