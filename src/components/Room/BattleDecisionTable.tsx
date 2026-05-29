import { useState } from 'react';
import { ActionChip3D } from './ActionChip3D';
import { getLabelGlyph, getVisualById } from './actionVisuals';
import type { BattleActionDefinition } from '../../lib/battle/engine';
import { DoorIcon, HeartIcon, HelpIcon } from '../icons';

interface Props {
  actions: BattleActionDefinition[];
  labels: Record<string, string>;
  selectedActionId: string | null;
  committedActionId: string | null | undefined;
  interactionLocked: boolean;
  canCommit: boolean;
  loading: boolean;
  enemyName: string;
  enemyHp: number;
  enemyMaxHp: number;
  playerHp: number;
  playerMaxHp: number;
  round: number;
  turn: number;
  currentPlayerLabel: string;
  timerSeconds: number;
  onSelect: (actionId: string) => void;
  onCommit: () => void;
  onRefresh: () => void;
  onLeave: () => void;
}

export const BattleDecisionTable = ({
  actions,
  labels,
  selectedActionId,
  committedActionId,
  interactionLocked,
  canCommit,
  loading,
  enemyName,
  enemyHp,
  enemyMaxHp,
  playerHp,
  playerMaxHp,
  round,
  turn,
  currentPlayerLabel,
  timerSeconds,
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
  const enemyHpRatio = enemyMaxHp > 0 ? Math.max(0, Math.min(100, (enemyHp / enemyMaxHp) * 100)) : 0;
  const playerHpRatio = playerMaxHp > 0 ? Math.max(0, Math.min(100, (playerHp / playerMaxHp) * 100)) : 0;

  return (
    <section className="decision-shell">
      <div className="decision-shell__heading">
        <div className="decision-shell__hud">
          <div className="decision-shell__vitals">
            <div className="decision-pill">
              <div className="decision-pill__stack">
                <div className="decision-pill__copy">
                  <span className="decision-pill__label">{enemyName}</span>
                  <span className="decision-pill__value">{enemyHp}/{enemyMaxHp}</span>
                </div>
                <div className="decision-pill__bar">
                  <span style={{ width: `${enemyHpRatio}%` }} />
                </div>
              </div>
            </div>
            <div className="decision-pill decision-pill--player">
              <HeartIcon size={12} />
              <div className="decision-pill__stack">
                <div className="decision-pill__copy">
                  <span className="decision-pill__label">You</span>
                  <span className="decision-pill__value">{playerHp}/{playerMaxHp}</span>
                </div>
                <div className="decision-pill__bar decision-pill__bar--player">
                  <span style={{ width: `${playerHpRatio}%` }} />
                </div>
              </div>
            </div>
          </div>
          <div className="decision-shell__turninfo">
            <div className="decision-shell__turnline">Round {round} / Turn {turn}</div>
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
            <span className="heading decision-shell__title">Decision Table</span>
          </button>
        </div>
      </div>
      {showHelp && (
        <div className="decision-shell__help">
          Choose one action chip, place it in the center, then lock it for the round.
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
                  label={labels[activeAction.id]}
                  glyph={getLabelGlyph(labels[activeAction.id])}
                  topColor={activeVisual!.top}
                  edgeColor={activeVisual!.edge}
                  glowColor={activeVisual!.glow}
                  size={82}
                />
                <div className="battle-surface__well-copy">
                  <div className="heading">{committedActionId ? 'Locked In' : 'Selected'}</div>
                  <div>{labels[activeAction.id]}</div>
                </div>
              </>
            ) : (
              <>
                <div className="heading decision-well__label">Commit</div>
                <div className="decision-well__sub">Choose a chip below</div>
              </>
            )}
          </div>
        </div>

        <div className="decision-surface__chips">
          {actions.map((action) => {
            const label = labels[action.id];
            const visual = getVisualById(action.id);
            const selected = selectedActionId === action.id || committedActionId === action.id;
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
                    label={label}
                    glyph={getLabelGlyph(label)}
                    topColor={visual.top}
                    edgeColor={visual.edge}
                    glowColor={visual.glow}
                    size={72}
                    isActive={selected || !chipsLocked}
                  />
                </div>
                <div className="heading chip-dock__label">{label}</div>
                <div className="chip-dock__meta">{action.trait} DC{action.dc}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="battle-actions">
        <button className="btn-primary" onClick={onCommit} disabled={!canCommit || !selectedActionId || loading || interactionLocked || Boolean(committedActionId)}>
          {committedActionId ? 'Waiting for Party' : interactionLocked ? 'Locked In' : 'Commit Action'}
        </button>
        <button className="battle-actions__mini" onClick={onRefresh} disabled={loading || interactionLocked || Boolean(committedActionId)}>
          Refresh
        </button>
      </div>
    </section>
  );
};
