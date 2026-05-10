import React from 'react';
import { PLAYERS, SLOT_POS } from '../../data/campaign';
import { SealStar, SealSwords, SealHeart, Envelope, CrossedSwords } from '../icons';
import type { EnvelopeState } from '../../store/gameStore';

const SEAL_ICONS: Record<string, React.FC<{ size?: number }>> = {
  yanni: SealStar,
  bram:  SealSwords,
  aria:  SealHeart,
};

interface Props {
  envelopes: Record<string, EnvelopeState>;
  dropZoneHot: boolean;
  dropZoneRef: React.RefObject<HTMLDivElement>;
  onTableMount: (el: HTMLDivElement | null) => void;
}

export const SharedTable = ({ envelopes, dropZoneHot, dropZoneRef, onTableMount }: Props) => {
  const revealed = Object.values(envelopes).some(e => e.revealed);

  return (
    <div className="cobblestones" style={{
      position: 'relative', height: 240, padding: '8px 8px 0',
      borderTop: '1px solid rgba(0,0,0,0.5)',
      borderBottom: '1px solid rgba(0,0,0,0.5)',
      flexShrink: 0,
    }}>
      <div ref={onTableMount} className="wood" style={{
        position: 'absolute', left: '50%', top: '50%',
        transform: 'translate(-50%, -50%)',
        width: '92%', height: 200,
        borderRadius: '50%',
        boxShadow: '0 12px 24px rgba(0,0,0,0.6), inset 0 -8px 14px rgba(0,0,0,0.4), inset 0 4px 8px rgba(255,210,150,0.1)',
        border: '4px solid #3A2414',
      }}>
        <div style={{
          position: 'absolute', inset: 6, borderRadius: '50%',
          border: '1.5px solid rgba(255,210,150,0.18)',
          pointerEvents: 'none',
        }}/>

        {PLAYERS.map(p => {
          const env = envelopes[p.id];
          if (!env) return null;
          const slot = SLOT_POS[p.id];
          const SealIcon = SEAL_ICONS[p.id];
          return (
            <div key={p.id} style={{
              position: 'absolute',
              left: slot.left, top: slot.top,
              transform: `rotate(${slot.rot})`,
              animation: env.appearing ? 'envelopeIn 0.6s cubic-bezier(.34,1.56,.64,1) both' : 'none',
              filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.55))',
              transformStyle: 'preserve-3d',
            }}>
              <div style={{
                transformStyle: 'preserve-3d',
                transition: 'transform 0.5s ease-out',
                transform: env.revealed ? 'rotateY(180deg)' : 'rotateY(0deg)',
                position: 'relative', width: 104, height: 74,
              }}>
                <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden' }}>
                  <Envelope width={104} height={74} name={p.name}
                    sealColor={p.sealColor} sealIcon={SealIcon} broken={false}/>
                </div>
                <div style={{
                  position: 'absolute', inset: 0, backfaceVisibility: 'hidden',
                  transform: 'rotateY(180deg)',
                }}>
                  <Envelope width={104} height={74} name={p.name}
                    action={env.actionLabel} revealed={true}
                    sealColor={p.sealColor} sealIcon={SealIcon} broken={true}/>
                </div>
              </div>
              {env.sealFlash && (
                <div style={{
                  position: 'absolute', left: '50%', top: '50%',
                  transform: 'translate(-50%,-50%)',
                  width: 46, height: 46, borderRadius: '50%',
                  animation: 'goldFlash 0.6s ease-out',
                  pointerEvents: 'none',
                }}/>
              )}
            </div>
          );
        })}

        <div ref={dropZoneRef} style={{
          position: 'absolute', left: '50%', bottom: '18%',
          transform: 'translate(-50%, 0)',
          width: 88, height: 88,
          opacity: revealed ? 0 : 1,
          transition: 'opacity 0.4s',
          pointerEvents: 'none',
        }}>
          <div className={dropZoneHot ? 'dz-fast' : 'dz-breathe'} style={{
            position: 'absolute', inset: 0,
            borderRadius: '50%',
            border: '2.5px dashed rgba(255,221,120,0.9)',
            background: 'radial-gradient(circle, rgba(255,221,120,0.18), transparent 70%)',
          }}>
            <div style={{
              position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)',
            }}>
              <CrossedSwords size={56}/>
            </div>
          </div>
          {dropZoneHot && (
            <>
              {[0, 1, 2, 3, 4, 5].map(i => (
                <div key={i} style={{
                  position: 'absolute', left: '50%', top: '50%',
                  width: 4, height: 4, borderRadius: '50%',
                  background: '#FFE9A8',
                  boxShadow: '0 0 6px #FFE9A8',
                  ['--sx' as string]: `${Math.cos(i * Math.PI / 3) * 30}px`,
                  ['--sy' as string]: `${Math.sin(i * Math.PI / 3) * 30}px`,
                  animation: `sparkleFade 0.7s ease-out ${i * 0.05}s infinite`,
                }}/>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
