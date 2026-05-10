import { HourglassIcon, CornerOrnament } from '../icons';
import type { Action, SceneType } from '../../data/campaign';

interface Props {
  actions: Action[];
  sceneType: SceneType;
  coinRef: React.RefObject<HTMLDivElement>;
  onPointerDown: (e: React.PointerEvent, action: Action) => void;
  onTapAction: (action: Action) => void;
  draggingActionId: string | null;
  hiddenActionId: string | null;
  timer: number;
  phase: string;
}

const SCENE_LABELS: Record<SceneType, { label: string; color: string; bg: string }> = {
  social:  { label: 'CONVERSATION', color: '#C9B888', bg: 'rgba(232,199,96,0.08)'  },
  combat:  { label: 'BATTLE SPELLS',  color: '#F87171', bg: 'rgba(220,38,38,0.12)'  },
  dragon:  { label: 'DRAGON LAIR',    color: '#C084FC', bg: 'rgba(124,58,237,0.12)' },
};

export const ActionTray = ({
  actions, sceneType, coinRef, onPointerDown, onTapAction,
  draggingActionId, hiddenActionId, timer, phase,
}: Props) => {
  const isPlayerPhase = phase === 'player';
  const meta = SCENE_LABELS[sceneType];

  return (
    <div className="panel-bg" style={{
      position: 'relative', display: 'flex', flexDirection: 'column',
      borderTop: '1px solid rgba(232,199,96,0.25)',
      flexShrink: 0,
    }}>
      {/* scene-type label strip */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 6, padding: '4px 0 2px',
        background: meta.bg,
        borderBottom: '1px solid rgba(232,199,96,0.12)',
      }}>
        <div style={{
          fontFamily: 'Cinzel, serif', fontSize: 8, letterSpacing: '0.22em',
          color: meta.color, textTransform: 'uppercase',
        }}>
          {meta.label}
        </div>
        <div style={{
          fontFamily: 'Inter, sans-serif', fontSize: 8,
          color: 'rgba(201,184,136,0.4)', letterSpacing: '0.08em',
        }}>
          · drag or tap to commit ·
        </div>
      </div>

      {/* coins row */}
      <div style={{
        position: 'relative', display: 'flex', alignItems: 'center',
        gap: 6, padding: '12px 8px 16px',
      }}>
        <CornerOrnament style={{ top: 4, left: 4 }}/>
        <CornerOrnament style={{ top: 4, right: 4, transform: 'scaleX(-1)' }}/>

        {actions.map((a, i) => {
          const hidden = hiddenActionId === a.id;
          const isDragging = draggingActionId === a.id;
          const isFirst = i === 0;
          return (
            <div key={a.id} style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              visibility: hidden ? 'hidden' : 'visible',
            }}>
              <div
                ref={isFirst ? coinRef : undefined}
                onPointerDown={e => onPointerDown(e, a)}
                onClick={() => isPlayerPhase && !isDragging && onTapAction(a)}
                className={isFirst ? 'coin-glow idle-bob' : 'idle-bob'}
                style={{
                  width: 62, height: 62, borderRadius: '50%',
                  cursor: isPlayerPhase ? 'grab' : 'default',
                  position: 'relative', touchAction: 'none',
                  animationDelay: `${i * 0.2}s`,
                  opacity: isDragging ? 0.25 : !isPlayerPhase ? 0.5 : 1,
                  transition: 'opacity 0.15s',
                }}
              >
                <a.Coin size={62}/>
              </div>
              <div className="heading gold-text" style={{ fontSize: 10, marginTop: 1, textAlign: 'center', lineHeight: 1.15 }}>
                {a.label}
              </div>
              <div style={{
                fontFamily: 'Inter, sans-serif', fontSize: 8,
                color: 'rgba(201,184,136,0.55)', textAlign: 'center', lineHeight: 1.2,
                maxWidth: 56,
              }}>
                {a.trait} DC{a.dc}
              </div>
            </div>
          );
        })}

        <div style={{
          width: 72, padding: '6px 4px',
          marginLeft: 4, marginRight: 2,
          display: 'flex', alignItems: 'center', gap: 2,
          flexDirection: 'column',
          background: 'linear-gradient(180deg,rgba(0,0,0,0.35),rgba(0,0,0,0.15))',
          borderRadius: 6,
          border: '1px solid rgba(232,199,96,0.25)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <HourglassIcon size={26}/>
            <div className="ui-num gold-text" style={{
              fontSize: 18, lineHeight: 1,
              color: timer <= 5 ? '#F87171' : undefined,
            }}>{timer}s</div>
          </div>
          <div className="heading" style={{ fontSize: 9, color: '#C9B888', marginTop: -2, letterSpacing: '0.06em' }}>left</div>
        </div>
      </div>
    </div>
  );
};
