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
    <section className="story-scroll-shell">
      <div style={{ flexShrink: 0, alignSelf: 'center' }}>
        <ScrollRod side="left" height={180}/>
      </div>

      <div className="story-scroll">
        <div style={{ position: 'absolute', right: 4, bottom: 0, pointerEvents: 'none' }}>
          <CastleWatermark width={120} height={104} opacity={0.22}/>
        </div>

        <div className="story-scroll__header">
          <div className="heading story-scroll__title">Story Scroll</div>
          <div className="story-scroll__hint">Latest scene text and outcome notes</div>
        </div>

        <div key={refreshKey} className="body-serif story-scroll__body">
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
            marginTop: 8, maxWidth: '92%',
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
            position: 'absolute', bottom: 10, left: 12,
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
        <ScrollRod side="right" height={180}/>
      </div>
    </section>
  );
};
