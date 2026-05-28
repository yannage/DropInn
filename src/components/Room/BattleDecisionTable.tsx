import { ActionChip3D } from './ActionChip3D';
import { getLabelGlyph, getVisualById } from './actionVisuals';
import type { BattleActionDefinition } from '../../lib/battle/engine';

interface Props {
  actions: BattleActionDefinition[];
  labels: Record<string, string>;
  selectedActionId: string | null;
  committedActionId: string | null | undefined;
  canCommit: boolean;
  loading: boolean;
  onSelect: (actionId: string) => void;
  onCommit: () => void;
  onRefresh: () => void;
}

export const BattleDecisionTable = ({
  actions,
  labels,
  selectedActionId,
  committedActionId,
  canCommit,
  loading,
  onSelect,
  onCommit,
  onRefresh,
}: Props) => {
  const activeAction = actions.find((action) => action.id === (committedActionId ?? selectedActionId)) ?? null;
  const activeVisual = activeAction ? getVisualById(activeAction.id) : null;

  return (
    <section className="decision-shell">
      <div className="decision-shell__heading">
        <div>
          <div className="heading decision-shell__title">Decision Table</div>
          <div className="decision-shell__subtitle">
            Choose one action chip, place it in the center, then lock it for the round.
          </div>
        </div>
        <div className="decision-shell__badge" style={{ color: '#f3a37c', borderColor: 'rgba(243,163,124,0.35)' }}>
          Battle Phase
        </div>
      </div>

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
                disabled={!canCommit || loading}
                style={{ opacity: canCommit ? 1 : 0.58 }}
              >
                <div className="chip-dock__plate" style={selected ? { borderColor: `${visual.top}aa`, boxShadow: `0 0 24px ${visual.glow}` } : undefined}>
                  <ActionChip3D
                    label={label}
                    glyph={getLabelGlyph(label)}
                    topColor={visual.top}
                    edgeColor={visual.edge}
                    glowColor={visual.glow}
                    size={72}
                    isActive={selected || canCommit}
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
        <button className="btn-primary" onClick={onCommit} disabled={!canCommit || !selectedActionId || loading || Boolean(committedActionId)}>
          {committedActionId ? 'Waiting for Party' : 'Commit Action'}
        </button>
        <button className="btn-secondary" onClick={onRefresh} disabled={loading}>
          Refresh
        </button>
      </div>
    </section>
  );
};
