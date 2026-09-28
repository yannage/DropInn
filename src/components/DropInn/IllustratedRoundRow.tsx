import { ArrowRight, ScrollText, UserRound } from 'lucide-react';
import type { AdventureRoom } from '../../lib/dropinn/types';
import type { RoundEntry } from '../../lib/dropinn/roundSummary';
import { roundIllustrations } from '../../lib/dropinn/roundIllustrations';
import { HeroAvatar } from './HeroAvatar';
import { TargetArtwork } from './TargetArtwork';
import { TokenArtwork } from './TokenArtwork';
import { TabletopArtwork } from './TabletopArtwork';
import { ResultBenefits } from './RoundRecap';

const tokenLabels = { fight: 'Fight', influence: 'Influence', investigate: 'Investigate', assist: 'Help', spotlight: 'Spotlight' };

export function IllustratedRoundRow({ room, chapter, entry, userId, animate = false }: {
  room: AdventureRoom; chapter: number; entry: RoundEntry; userId: string; animate?: boolean;
}) {
  const { actor, target, targetHero } = roundIllustrations(room, chapter, entry);
  const extra = entry.kind !== 'companion' && entry.consequence && entry.consequence !== entry.text && entry.consequence !== entry.benefits.join(' · ');
  return <article className="di-illustrated-result" data-round-entry={entry.id} data-kind={entry.kind} data-own={entry.actorId === userId} data-animate={animate}>
    <div className="di-result-identity">
      <span className="di-result-portrait">{actor ? <HeroAvatar hero={actor} decorative /> : entry.actorId ? <UserRound aria-hidden="true" /> : <ScrollText aria-hidden="true" />}</span>
      <strong>{entry.actorName ?? (entry.kind === 'consequence' ? 'Together' : 'A hero')}{entry.actorId === userId && <small>You</small>}{entry.kind === 'companion' && <small>Companion</small>}</strong>
      {entry.kind === 'action' && entry.token && <span className="di-result-token">{entry.token === 'spotlight' ? <TabletopArtwork kind="spotlight" /> : <TokenArtwork token={entry.token} />}<small>{tokenLabels[entry.token]}</small></span>}
      {entry.kind === 'action' && entry.targetId && <><ArrowRight size={18} aria-hidden="true" /><span className="di-result-target" title={target?.name ?? targetHero?.name ?? 'Recorded target'}>{targetHero ? <HeroAvatar hero={targetHero} decorative /> : target ? <><ScrollText className="di-art-fallback" aria-hidden="true" /><TargetArtwork target={target} /></> : <UserRound aria-hidden="true" />}</span></>}
    </div>
    <p>{entry.text}</p>
    <ResultBenefits benefits={entry.benefits} />
    {extra && <p className="di-result-change">{entry.consequence}</p>}
    {(entry.math || entry.kind === 'companion') && <details><summary>Details</summary>{entry.math && <p>Dice: {entry.math}</p>}{entry.kind === 'companion' && <p>Companions provide protection, openings, insight, or healing; your actions advance the objective.</p>}</details>}
  </article>;
}

