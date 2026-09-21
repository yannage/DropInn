import type { RoundSummary } from '../../lib/dropinn/roundSummary';

export function RoundRecap({ summary, announce = false }: { summary: RoundSummary; announce?: boolean }) {
  return <section className="di-round-recap" aria-label="Your party’s round">
    <header><strong>Your party’s round</strong><small>Chapter {summary.chapter + 1} · Round {summary.turn}</small></header>
    <div className="di-round-entries" tabIndex={0} role="region" aria-label="Round actions and consequences">
      {summary.entries.map(item => <article key={item.id} data-round-entry={item.id} data-kind={item.kind}>
        <strong>{item.kind === 'consequence' ? 'Together' : item.actorName ?? 'A hero'}{item.kind === 'companion' ? ' · companion' : item.kind === 'inactive' ? ' · sat out' : ''}</strong>
        <p>{item.text}</p>{item.consequence && item.consequence !== item.text && <p className="di-round-effect">{item.consequence}</p>}
        {item.math && <small>Dice: {item.math}</small>}
      </article>)}
    </div>
    {announce && <span className="di-game-sr" role="status">{summary.entries.map(item => `${item.text} ${item.consequence}`).join(' ')}</span>}
  </section>;
}
