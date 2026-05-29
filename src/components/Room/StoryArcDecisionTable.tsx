import { useState } from 'react';
import type { StoryActionDefinition } from '../../lib/storyArc/engine';
import { DoorIcon, HelpIcon } from '../icons';
import { ActionChip3D } from './ActionChip3D';
import { getLabelGlyph, getVisualById } from './actionVisuals';

interface Props {
  actions: StoryActionDefinition[];
  selectedActionId: string | null;
  committedActionId: string | null | undefined;
  interactionLocked: boolean;
  canCommit: boolean;
  loading: boolean;
  sceneTitle: string;
  objective: string;
  currentPlayerLabel: string;
  timerSeconds: number;
  chapterLabel: string;
  clueCount: number;
  clueTarget: number;
  setbackCount: number;
  onSelect: (actionId: string) => void;
  onCommit: () => void;
  onRefresh: () => void;
  onLeave: () => void;
}

export const StoryArcDecisionTable = ({
  actions,
  selectedActionId,
  committedActionId,
  interactionLocked,
  canCommit,
  loading,
  sceneTitle,
  objective,
  currentPlayerLabel,
  timerSeconds,
  chapterLabel,
  clueCount,
  clueTarget,
  setbackCount,
  onSelect,
  onCommit,
  onRefresh,
  onLeave,
}: Props) => {
  const activeAction = actions.find((action) => action.id === (committedActionId ?? selectedActionId)) ?? null;
  const activeVisual = activeAction ? getVisualById(activeAction.id) : null;
  const chipsLocked = interactionLocked || Boolean(committedActionId) || !canCommit;
  const [showHelp, setShowHelp] = useState(false);
  const timerRatio = Math.max(0, Math.min(1, timerSeconds / 30));

  return (
    <section className="decision-shell">
      <div className="decision-shell__heading">
        <div className="decision-shell__hud">
          <div className="decision-shell__vitals">
            <div className="decision-pill">
              <div className="decision-pill__stack">
                <div className="decision-pill__copy">
                  <span className="decision-pill__label">{sceneTitle}</span>
                  <span className="decision-pill__value">{chapterLabel}</span>
                </div>
                <div className="decision-pill__bar">
                  <span style={{ width: `${clueTarget > 0 ? (clueCount / clueTarget) * 100 : 0}%` }} />
                </div>
              </div>
            </div>
            <div className="decision-pill decision-pill--player">
              <div className="decision-pill__stack">
                <div className="decision-pill__copy">
                  <span className="decision-pill__label">Setbacks</span>
                  <span className="decision-pill__value">{setbackCount}</span>
                </div>
                <div className="decision-pill__bar decision-pill__bar--player">
                  <span style={{ width: `${Math.min(100, setbackCount * 25)}%` }} />
                </div>
              </div>
            </div>
          </div>
          <div className="decision-shell__turninfo">
            <div className="decision-shell__turnline">Leads {clueCount}/{clueTarget}</div>
            <div className="decision-shell__turnline decision-shell__turnline--strong">Player: {currentPlayerLabel}</div>
          </div>
          <div className="decision-shell__tools">
            <button type="button" className="decision-icon-btn" onClick={() => setShowHelp((value) => !value)} aria-label="Decision table info">
              <HelpIcon size={16} />
            </button>
            <button type="button" className="decision-icon-btn" onClick={onLeave} aria-label="Leave room">
              <DoorIcon size={16} />
            </button>
            <div
              className="decision-clock"
              style={{ ['--timer-fill' as string]: `${timerRatio * 360}deg` }}
              aria-label={`${timerSeconds} seconds remaining`}
            >
              <span>{timerSeconds}</span>
            </div>
          </div>
        </div>
        <div className="decision-shell__titlebar">
          <button type="button" className="decision-shell__titlebutton" onClick={() => setShowHelp((value) => !value)}>
            <span className="heading decision-shell__title">Vote Table</span>
          </button>
        </div>
      </div>

      {showHelp && (
        <div className="decision-shell__help">
          Pick one coin. The room resolves on majority vote when everyone locks in or the timer expires.
        </div>
      )}

      <div className="decision-surface battle-surface">
        <div className="decision-surface__felt" />
        <div className="decision-surface__grain" />

        <div className="battle-surface__well">
          <div
            className={activeAction ? 'decision-well decision-well--hot' : 'decision-well'}
            style={activeVisual ? { boxShadow: `0 0 0 10px rgba(13,19,32,0.18), 0 0 44px ${activeVisual.glow}` } : undefined}
          >
            <div className="decision-well__core" />
            {activeAction ? (
              <>
                <ActionChip3D
                  label={activeAction.label}
                  glyph={getLabelGlyph(activeAction.label)}
                  topColor={activeVisual!.top}
                  edgeColor={activeVisual!.edge}
                  glowColor={activeVisual!.glow}
                  size={82}
                />
                <div className="battle-surface__well-copy">
                  <div className="heading">{committedActionId ? 'Vote Locked' : 'Selected'}</div>
                  <div>{activeAction.label}</div>
                </div>
              </>
            ) : (
              <>
                <div className="heading decision-well__label">Vote</div>
                <div className="decision-well__sub">Choose a coin below</div>
              </>
            )}
          </div>
        </div>

        <div className="decision-surface__chips">
          {actions.map((action) => {
            const visual = getVisualById(action.id);
            const selected = selectedActionId === action.id || committedActionId === action.id;
            const meta = action.trait && action.dc != null
              ? `${action.trait} DC${action.dc}`
              : 'Majority vote';

            return (
              <button
                key={action.id}
                type="button"
                className="chip-dock battle-chip"
                onClick={() => onSelect(action.id)}
                disabled={chipsLocked || loading}
                style={{ opacity: chipsLocked ? 0.5 : 1 }}
              >
                <div className="chip-dock__plate" style={selected ? { borderColor: `${visual.top}aa`, boxShadow: `0 0 24px ${visual.glow}` } : undefined}>
                  <ActionChip3D
                    label={action.label}
                    glyph={getLabelGlyph(action.label)}
                    topColor={visual.top}
                    edgeColor={visual.edge}
                    glowColor={visual.glow}
                    size={72}
                    isActive={selected || !chipsLocked}
                  />
                </div>
                <div className="heading chip-dock__label">{action.label}</div>
                <div className="chip-dock__meta">{meta}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="battle-actions">
        <button className="btn-primary" onClick={onCommit} disabled={!canCommit || !selectedActionId || loading || interactionLocked || Boolean(committedActionId)}>
          {committedActionId ? 'Waiting for Party' : interactionLocked ? 'Locked In' : 'Lock Vote'}
        </button>
        <button className="battle-actions__mini" onClick={onRefresh} disabled={loading || interactionLocked || Boolean(committedActionId)}>
          Refresh
        </button>
      </div>

      <div style={{
        marginTop: 10,
        padding: '10px 12px',
        borderRadius: 12,
        background: 'rgba(7,16,30,0.34)',
        border: '1px solid rgba(232,199,96,0.14)',
        fontFamily: 'EB Garamond, serif',
        fontStyle: 'italic',
        color: '#E8D9B4',
        lineHeight: 1.4,
      }}>
        {objective}
      </div>
    </section>
  );
};
