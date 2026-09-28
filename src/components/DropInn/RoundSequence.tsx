import { useReducedMotion } from 'framer-motion';
import type { RoundSummary } from '../../lib/dropinn/roundSummary';
import { revealBeatFor } from '../../lib/dropinn/revealSequence';
import { RoundRecap } from './RoundRecap';
import './round-sequence.css';

export interface RoundAdvanceControlProps {
  bypass: boolean;
  skipped: boolean;
  skipping: boolean;
  canVote: boolean;
  skipCount: number;
  playerCount: number;
  nextStep?: 'round' | 'chapter' | null;
  onSkip: () => void;
}

/** Keep readiness outside the scrolling result list when the scene provides a fixed dock. */
export function RoundAdvanceControl({ bypass, skipped, skipping, canVote, skipCount, playerCount, nextStep = 'round', onSkip }: RoundAdvanceControlProps) {
  const nextLabel = nextStep === 'chapter' ? 'Next chapter' : nextStep === 'round' ? 'Next round' : null;
  if (!nextLabel && bypass) return null;
  return <div className="di-round-advance" data-ready={skipped}>
    <div className="di-round-advance-copy">
      <strong role="status">{nextLabel ? `${skipCount} of ${playerCount} ready` : 'Adventure complete'}</strong>
      <p>{skipped ? 'You’re ready. Waiting for the party or timer.'
        : canVote && nextLabel ? 'Show all results and mark yourself ready.'
          : nextLabel ? `The seated party starts the next ${nextStep} together.` : 'Your complete results stay in the journal.'}</p>
    </div>
    {canVote && nextLabel ? <button type="button" onClick={onSkip} disabled={skipping || skipped}
      aria-label={skipped ? `Ready for the next ${nextStep}` : nextLabel}>
      {skipped ? 'Ready' : skipping ? 'Marking ready…' : nextLabel}
    </button> : !bypass && <button type="button" onClick={onSkip} disabled={skipping}>Show all results</button>}
  </div>;
}

export function RoundSequence({ summary, now, bypass, showAdvance = true, ...advance }: RoundAdvanceControlProps & {
  summary: RoundSummary; now: number; showAdvance?: boolean;
}) {
  const reducedMotion = !!useReducedMotion();
  const beat = revealBeatFor(summary, now, bypass);
  const label = beat.kind === 'intro' ? 'The party’s dice settle.'
    : beat.kind === 'actions' ? beat.entries[0].text
      : beat.kind === 'consequences' ? beat.entries.map(entry => entry.text).join(' ') : 'The complete round is ready to read.';
  return <div className="di-round-sequence" data-beat={beat.kind}>
    {showAdvance && <RoundAdvanceControl bypass={bypass} {...advance} />}
    <div className="di-round-sequence-header"><strong>Your party’s round</strong></div>
    {beat.kind === 'intro' ? <div className="di-round-sequence-intro">The party’s moves land together. Watch what each one changed.</div>
      : <div key={`card:${beat.key}`} className={`di-round-sequence-card ${reducedMotion ? 'no-motion' : ''}`}>
        <RoundRecap summary={{ ...summary, entries: beat.entries }} showHeader={false} />
      </div>}
    <span className="di-game-sr" role="status" key={`status:${beat.key}`}>{label}</span>
  </div>;
}
