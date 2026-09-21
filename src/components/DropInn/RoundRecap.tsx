import { useRef, type CSSProperties } from 'react';
import { useReducedMotion } from 'framer-motion';
import { CircleDot, Flag, HandHeart, Moon } from 'lucide-react';
import { TabletopArtwork } from './TabletopArtwork';
import type { RoundSummary } from '../../lib/dropinn/roundSummary';
import './payoff-feel.css';

/** Style the recorded values, without estimating or adding effects together. */
export function ResultBenefits({ benefits }: { benefits: string[] }) {
  if (!benefits.length) return null;
  return <div className="di-payoff-benefits">{benefits.map(benefit => {
    const parts = /^([+−]?\d+(?:\.\d+)?) (.+)$/.exec(benefit);
    const tone = benefit.includes('danger') ? benefit.startsWith('+') ? 'cost' : 'relief'
      : benefit.includes('HP') || benefit.includes('protection') ? 'care' : 'gain';
    return <span key={benefit} data-effect={tone}>{parts ? <><b>{parts[1]}</b> {parts[2]}</> : benefit}</span>;
  })}</div>;
}

export function RoundRecap({ summary, announce = false }: { summary: RoundSummary; announce?: boolean }) {
  const reducedMotion = !!useReducedMotion();
  const mountedAt = useRef(Date.now());
  const elapsed = mountedAt.current - summary.at;
  // Recovered rounds and drawer visits are already settled. Negative delays continue
  // the recorded round's beat instead of starting the sequence again on reconnect.
  const fresh = announce && !reducedMotion && elapsed >= 0 && elapsed < 650;
  return <section className="di-round-recap" aria-label="Your party’s round" data-fresh={fresh}>
    <header><strong><TabletopArtwork kind="journal" /> Your party’s round</strong><small>Chapter {summary.chapter + 1} · Round {summary.turn}</small></header>
    <div className="di-round-entries" tabIndex={0} role="region" aria-label="Round actions and consequences">
      {summary.entries.map((item, index) => {
        const Mark = item.kind === 'consequence' ? Flag : item.kind === 'companion' ? HandHeart : item.kind === 'inactive' ? Moon : CircleDot;
        const narrativeEffect = item.consequence && item.consequence !== item.text && item.consequence !== item.benefits.join(' · ');
        return <article key={item.id} data-round-entry={item.id} data-kind={item.kind}
          style={{ '--payoff-delay': `${Math.min(index, 4) * 65 - elapsed}ms` } as CSSProperties}>
          <strong><Mark className="di-round-mark" size={15} aria-hidden="true" />{item.kind === 'consequence' ? 'Together' : item.actorName ?? 'A hero'}{item.kind === 'companion' ? <span className="di-round-role">companion</span> : item.kind === 'inactive' ? <span className="di-round-role">sat out</span> : null}</strong>
          <p>{item.text}</p>{narrativeEffect && <p className="di-round-effect">{item.consequence}</p>}
          <ResultBenefits benefits={item.benefits} />
          {item.math && <small className="di-round-math">Dice: {item.math}</small>}
        </article>;
      })}
    </div>
    {announce && <span className="di-game-sr" role="status">{summary.entries.map(item => `${item.text} ${item.consequence}`).join(' ')}</span>}
  </section>;
}
