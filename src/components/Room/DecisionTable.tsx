import React from 'react';
import { Envelope, SealHeart, SealStar, SealSwords } from '../icons';
import type { Action, SceneType } from '../../data/campaign';
import type { EnvelopeState } from '../../store/gameStore';
import { ActionChip3D } from './ActionChip3D';
import { SCENE_VISUALS, getActionGlyph, getActionVisual } from './actionVisuals';

interface Props {
  actions: Action[];
  sceneType: SceneType;
  envelopes: Record<string, EnvelopeState>;
  dropZoneHot: boolean;
  dropZoneRef: React.RefObject<HTMLDivElement>;
  coinRef: React.RefObject<HTMLDivElement>;
  onPointerDown: (e: React.PointerEvent, action: Action) => void;
  onTapAction: (action: Action) => void;
  draggingActionId: string | null;
  hiddenActionId: string | null;
  phase: string;
}

const SEAL_ICONS: Record<string, React.FC<{ size?: number }>> = {
  yanni: SealStar,
  bram: SealSwords,
  aria: SealHeart,
};

const ENVELOPE_ORDER = [
  { id: 'bram', name: 'Bram', sealColor: 'green' },
  { id: 'aria', name: 'Aria', sealColor: 'red' },
  { id: 'yanni', name: 'Yanni', sealColor: 'purple' },
];

export const DecisionTable = ({
  actions,
  sceneType,
  envelopes,
  dropZoneHot,
  dropZoneRef,
  coinRef,
  onPointerDown,
  onTapAction,
  draggingActionId,
  hiddenActionId,
  phase,
}: Props) => {
  const visual = SCENE_VISUALS[sceneType];
  const isPlayerPhase = phase === 'player';
  const revealed = Object.values(envelopes).some(entry => entry.revealed);

  return (
    <section className="decision-shell">
      <div className="decision-shell__heading">
        <div>
          <div className="heading decision-shell__title">Decision Table</div>
          <div className="decision-shell__subtitle">
            Slide one chip into the commit ring to lock Yanni&apos;s move.
          </div>
        </div>
        <div className="decision-shell__badge" style={{ color: visual.accent, borderColor: `${visual.accent}55` }}>
          {visual.label}
        </div>
      </div>

      <div className="decision-surface">
        <div className="decision-surface__felt" />
        <div className="decision-surface__grain" />

        <div className="decision-surface__intents">
          {ENVELOPE_ORDER.map((player, index) => {
            const env = envelopes[player.id];
            const SealIcon = SEAL_ICONS[player.id];
            return (
              <div
                key={player.id}
                className="decision-surface__intent"
                style={{
                  transform: `rotate(${index === 1 ? '0deg' : index === 0 ? '-6deg' : '6deg'})`,
                  animation: env?.appearing ? 'envelopeIn 0.6s cubic-bezier(.34,1.56,.64,1) both' : 'none',
                }}
              >
                <Envelope
                  width={92}
                  height={66}
                  name={player.name}
                  action={env?.revealed ? env.actionLabel : undefined}
                  revealed={env?.revealed}
                  sealColor={player.sealColor}
                  sealIcon={SealIcon}
                  broken={env?.revealed}
                />
              </div>
            );
          })}
        </div>

        <div className="decision-surface__well-wrap">
          <div
            ref={dropZoneRef}
            className={dropZoneHot ? 'decision-well decision-well--hot' : 'decision-well'}
            style={{ opacity: revealed ? 0.28 : 1 }}
          >
            <div className="decision-well__core" />
            <div className="heading decision-well__label">Commit</div>
            <div className="decision-well__sub">Drop chip here</div>
          </div>
        </div>

        <div className="decision-surface__chips">
          {actions.map((action, index) => {
            const hidden = hiddenActionId === action.id;
            const isDragging = draggingActionId === action.id;
            const visualStyle = getActionVisual(action);
            return (
              <div
                key={action.id}
                ref={index === 0 ? coinRef : undefined}
                className="chip-dock"
                style={{
                  visibility: hidden ? 'hidden' : 'visible',
                  opacity: isDragging ? 0.22 : !isPlayerPhase ? 0.56 : 1,
                  cursor: isPlayerPhase ? 'grab' : 'default',
                }}
                onPointerDown={e => onPointerDown(e, action)}
                onClick={() => isPlayerPhase && !isDragging && onTapAction(action)}
              >
                <div className="chip-dock__plate">
                  <ActionChip3D
                    label={action.label}
                    glyph={getActionGlyph(action)}
                    topColor={visualStyle.top}
                    edgeColor={visualStyle.edge}
                    glowColor={visualStyle.glow}
                    size={88}
                    isActive={isPlayerPhase && !isDragging}
                  />
                </div>
                <div className="heading chip-dock__label">{action.label}</div>
                <div className="chip-dock__meta">{action.trait} DC{action.dc}</div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
