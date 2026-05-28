import type { CSSProperties } from 'react';
import { CrossedSwords, DragonHead, ShieldEmblem } from '../icons';
import type { SceneType } from '../../data/campaign';
import { SCENE_VISUALS } from './actionVisuals';

interface Props {
  sceneType: SceneType;
  phase: string;
  timer: number;
  title?: string;
  description?: string;
}

const PHASE_STATUS: Record<string, string> = {
  idle: 'Setting the stage',
  bots: 'Allies are choosing',
  player: 'Your move',
  reveal: 'Revealing intentions',
  resolve: 'Resolving outcome',
  reward: 'Aftermath',
};

const SceneGlyph = ({ sceneType }: { sceneType: SceneType }) => {
  if (sceneType === 'combat') return <CrossedSwords size={42} />;
  if (sceneType === 'dragon') return <DragonHead size={42} />;
  return <ShieldEmblem size={42} />;
};

export const PhaseShowcase = ({ sceneType, phase, timer, title, description }: Props) => {
  const visual = SCENE_VISUALS[sceneType];

  return (
    <section className="phase-card" style={{ '--phase-glow': visual.glow } as CSSProperties}>
      <div className="phase-card__meta">
        <div className="phase-card__eyebrow heading" style={{ color: visual.accent }}>
          {visual.label}
        </div>
        <div className="phase-card__status">
          <span className="phase-card__status-dot" style={{ background: visual.accent }} />
          <span>{PHASE_STATUS[phase] ?? 'In motion'}</span>
        </div>
      </div>

      <div className="phase-card__art" style={{ background: visual.background }}>
        <div className="phase-card__veil" style={{ background: visual.detail }} />
        <div className="phase-card__glyph">
          <SceneGlyph sceneType={sceneType} />
        </div>
        <div className="phase-card__beams" />
        <div className="phase-card__copy">
          <div className="heading phase-card__title">{title ?? visual.title}</div>
          <p className="body-serif phase-card__description">{description ?? visual.description}</p>
        </div>
        <div className="phase-card__timer">
          <div className="heading">Decision Window</div>
          <div className="ui-num" style={{ color: timer <= 5 ? '#ff9d8b' : '#ffe8b7' }}>
            {timer}s
          </div>
        </div>
      </div>
    </section>
  );
};
