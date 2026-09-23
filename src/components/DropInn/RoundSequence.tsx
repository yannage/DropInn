import { useReducedMotion } from 'framer-motion';
import type { RoundSummary } from '../../lib/dropinn/roundSummary';
import { revealBeatFor } from '../../lib/dropinn/revealSequence';
import { RoundRecap } from './RoundRecap';
import './round-sequence.css';

export function RoundSequence({ summary, now, bypass, skipped, skipping, canVote, skipCount, playerCount, onSkip }: {
  summary: RoundSummary; now: number; bypass: boolean; skipped: boolean; skipping: boolean;
  canVote: boolean; skipCount: number; playerCount: number; onSkip: () => void;
}) {
  const reducedMotion = !!useReducedMotion();
  const beat = revealBeatFor(summary, now, bypass);
  const label = beat.kind === 'intro' ? 'The party’s dice settle.'
    : beat.kind === 'actions' ? beat.entries[0].text
      : beat.kind === 'consequences' ? beat.entries.map(entry => entry.text).join(' ') : 'The complete round is ready to read.';
  return <div className="di-round-sequence" data-beat={beat.kind}>
    <div className="di-round-sequence-header"><strong>Your party’s round</strong><small>{skipCount}/{playerCount} ready</small>
      {!bypass && <button type="button" onClick={onSkip} disabled={skipping} aria-label="Skip result sequence">Skip</button>}
      {bypass && !skipped && canVote && <button type="button" onClick={onSkip} disabled={skipping} aria-label="Vote to start the next turn early">{skipping ? 'Skipping…' : 'Next turn'}</button>}
    </div>
    {beat.kind === 'intro' ? <div className="di-round-sequence-intro">The party’s moves land together. Watch what each one changed.</div>
      : <div key={`card:${beat.key}`} className={`di-round-sequence-card ${reducedMotion ? 'no-motion' : ''}`}>
        <RoundRecap summary={{ ...summary, entries: beat.entries }} showHeader={false} />
      </div>}
    <span className="di-game-sr" role="status" key={`status:${beat.key}`}>{label}</span>
  </div>;
}
