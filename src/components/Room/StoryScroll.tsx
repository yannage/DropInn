import { useMemo } from 'react';
import { ScrollRod, CastleWatermark, BookIcon } from '../icons';
import { useLobbyStore } from '../../store/lobbyStore';
import type { StoryEntry, RollResult } from '../../lib/engine';

interface Props {
  text: string;
  refreshKey: number | string;
  rollResult: RollResult | null;
  storyLog: StoryEntry[];
}

export const StoryScroll = ({ text, refreshKey, rollResult, storyLog }: Props) => {
  const openOverlay = useLobbyStore(s => s.openOverlay);
  const lines = useMemo(() => text.split(/(?<=\.)\s+/).filter(Boolean), [text]);
  const lastSpotlight = useMemo(() => {
    const last = storyLog[storyLog.length - 1];
    return last?.kind === 'spotlight' ? last : null;
  }, [storyLog]);

  return (
    <div style={{
      position: 'relative', padding: '8px 4px 12px',
      display: 'flex', alignItems: 'stretch',
      filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.5))',
      flexShrink: 0,
    }}>
      <div style={{ flexShrink: 0, alignSelf: 'center' }}>
        <ScrollRod side="left" height={148}/>
      </div>

      <div style={{
        flex: 1, position: 'relative',
        background: 'linear-gradient(180deg, #F2E3BE 0%, #E8D9B4 50%, #C9B888 100%)',
        backgroundImage: 'radial-gradient(ellipse at 20% 30%, rgba(160,130,80,0.22) 0 30%, transparent 60%), radial-gradient(ellipse at 80% 70%, rgba(160,130,80,0.18) 0 30%, transparent 60%), linear-gradient(180deg, #F2E3BE 0%, #E8D9B4 50%, #C9B888 100%)',
        boxShadow: 'inset 0 0 30px rgba(120,90,40,0.35), inset 0 2px 4px rgba(160,130,80,0.25)',
        borderTop: '1px solid #B8A66A',
        borderBottom: '1px solid #B8A66A',
        padding: '14px 18px 14px 12px',
        marginLeft: -4, marginRight: -4,
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', right: 4, bottom: 0, pointerEvents: 'none' }}>
          <CastleWatermark width={120} height={104} opacity={0.22}/>
        </div>

        <div key={refreshKey} className="body-serif" style={{
          fontSize: 14.5, lineHeight: 1.45, color: '#1F1408', position: 'relative', maxWidth: '80%',
        }}>
          {lines.map((line, i) => (
            <div key={i} style={{
              animation: `textRise 0.5s ease-out ${i * 0.08}s both`,
              marginBottom: 2,
            }}>{line}</div>
          ))}
        </div>

        {/* spotlight entry — player's spoken words + outcome */}
        {lastSpotlight && (
          <div style={{
            marginTop: 8, maxWidth: '82%',
            borderLeft: '3px solid #E8C760',
            paddingLeft: 8,
            animation: 'textRise 0.5s ease-out both',
          }}>
            <div style={{
              fontFamily: '"Caveat", cursive', fontSize: 15, color: '#5C3F09',
              lineHeight: 1.3, fontStyle: 'italic',
            }}>
              "{lastSpotlight.spotlightText}"
            </div>
            <div className="body-serif" style={{
              fontSize: 12.5, color: '#3A2410', lineHeight: 1.4, marginTop: 4,
            }}>
              {lastSpotlight.text}
            </div>
          </div>
        )}

        {rollResult && (
          <div style={{
            position: 'absolute', bottom: 8, left: 10,
            background: rollResult.success
              ? 'linear-gradient(180deg,#22863a,#0c4a1a)'
              : 'linear-gradient(180deg,#7E1A1A,#3A0606)',
            border: `1px solid ${rollResult.success ? '#6EE7B7' : '#F87171'}`,
            borderRadius: 4, padding: '3px 8px',
            fontFamily: 'Cinzel, serif', fontSize: 9, letterSpacing: '0.12em',
            color: rollResult.success ? '#6EE7B7' : '#F87171',
            animation: 'textRise 0.4s ease both',
          }}>
            d20+{rollResult.mod} = {rollResult.total} {rollResult.success ? '✓' : '✗'} ({rollResult.trait} DC{rollResult.dc})
          </div>
        )}

        <button
          onClick={() => openOverlay('history')}
          style={{
            position: 'absolute', bottom: 8, right: 8,
            width: 34, height: 34, borderRadius: '50%',
            background: 'linear-gradient(180deg,#1F3160,#0E1A30)',
            border: '2px solid #E8C760',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', padding: 0,
            boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
          }}
        >
          <BookIcon size={18}/>
        </button>
      </div>

      <div style={{ flexShrink: 0, alignSelf: 'center' }}>
        <ScrollRod side="right" height={148}/>
      </div>
    </div>
  );
};
