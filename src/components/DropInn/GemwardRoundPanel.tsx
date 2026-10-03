import { ArrowRight, Check, Sparkles } from 'lucide-react';
import type { buildGemwardRound } from '../../lib/dropinn/gemwardRound';
import { TokenArtwork } from './TokenArtwork';
import './gemward-round.css';

type RoundView = ReturnType<typeof buildGemwardRound>;

/** Accepted intentions remain prospective until the ordinary server round resolves. */
export function GemwardRoundPanel({ model, userId, onInspect }: {
  model: RoundView; userId: string; onInspect: (intent: RoundView['intents'][number]) => void;
}) {
  return <div className="gm-round-panel">
    <p>These moves are placed. They resolve together when everyone is ready or the round ends.</p>
    {model.intents.length === 0 && <p>No moves are placed yet. Everyone is still choosing.</p>}
    <ol>{model.intents.map(intent => <li key={intent.actorId} data-round-intent={intent.actorId}>
      <span className="gm-round-token" aria-hidden="true">{intent.token === 'spotlight' ? <Sparkles /> : <TokenArtwork token={intent.token} />}</span>
      <div><small><Check size={13} />{intent.actorId === userId ? 'You' : intent.actorName} · placed</small><h3>{intent.label}</h3><p>{intent.detail}</p><button type="button" onClick={() => onInspect(intent)}>Look at {intent.location} <ArrowRight size={14} /></button></div>
    </li>)}</ol>
    {model.waitingFor.length > 0 && <p className="gm-round-waiting">Still choosing: {model.waitingFor.join(', ')}.</p>}
  </div>;
}
