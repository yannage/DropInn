import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Clock3 } from 'lucide-react';
import type { AdventureRoom, PlayerAction } from '../../lib/dropinn/types';
import type { RoundEntry, RoundSummary } from '../../lib/dropinn/roundSummary';
import { roundHero } from '../../lib/dropinn/roundIllustrations';
import { revealBeatFor, revealEntryDelay } from '../../lib/dropinn/revealSequence';
import { contextualActionLabel } from '../../lib/dropinn/playerGuidance';
import { adventureFor } from '../../lib/dropinn/registry';
import { TargetArtwork } from './TargetArtwork';
import { ChapterReward } from './ChapterReward';
import { ScrollRoller } from './StoryScroll';
import { IllustratedRoundRow } from './IllustratedRoundRow';
import './round-scroll.css';

export interface RoundScrollProps {
  room: AdventureRoom; userId: string; summary?: RoundSummary; action?: PlayerAction;
  pending: boolean; loading: boolean; error: string | null; historical: boolean;
  now: number; seconds: number; bypass: boolean; reducedMotion: boolean;
  canVote: boolean; skipped: boolean; skipping: boolean;
  onClose: () => void; onShowAll: () => void; onNext: () => void; onRetry: () => void; onCollect: () => void;
  narratorHost: (node: HTMLDivElement | null) => void;
}

export function RoundScroll({ room, userId, summary, action, pending, loading, error, historical, now, seconds, bypass, reducedMotion, canVote, skipped, skipping, onClose, onShowAll, onNext, onRetry, onCollect, narratorHost }: RoundScrollProps) {
  const panel = useRef<HTMLDivElement>(null), body = useRef<HTMLDivElement>(null);
  const follow = useRef(true), close = useRef(onClose); close.current = onClose;
  const [unread, setUnread] = useState(false);
  const beat = summary ? revealBeatFor(summary, now, historical || bypass || reducedMotion) : undefined;
  const entries = beat?.entries ?? [];
  const humans = room.seats.filter(seat => seat.kind === 'human' && !seat.leaving);
  const complete = room.status === 'completed' && !historical;
  const chapterComplete = summary && room.outcomes.some(outcome => outcome.chapter === summary.chapter && outcome.at === summary.at);
  const nextLabel = chapterComplete ? 'Next chapter' : 'Next round';
  const closing = complete && room.storyBranch ? adventureFor(room).closing?.[room.storyBranch] : undefined;
  const waitingEntry: RoundEntry | undefined = action ? { id: 'submitted', kind: 'action', actorId: userId, actorName: roundHero(room, userId)?.name, token: action.token, targetId: action.targetId, targetKind: action.targetKind, text: contextualActionLabel(room, action), benefits: [], consequence: '' } : undefined;
  useLayoutEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const app = document.querySelector<HTMLElement>('.di-app');
    const overflow = document.body.style.overflow;
    if (app) app.inert = true;
    document.body.style.overflow = 'hidden'; panel.current?.focus();
    return () => {
      if (app) app.inert = false;
      document.body.style.overflow = overflow;
      if (previous?.isConnected && !previous.closest('[inert]') && !previous.matches(':disabled')) previous.focus();
      else document.querySelector<HTMLElement>('.di-scene-stage [data-scene-target]')?.focus();
    };
  }, []);
  useLayoutEffect(() => {
    // Story history may just have released its own modal state.
    const app = document.querySelector<HTMLElement>('.di-app'); if (app) app.inert = true;
  });
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (event.key === 'Escape') { event.preventDefault(); close.current(); }
      if (event.key !== 'Tab') return;
      const controls = [...panel.current!.querySelectorAll<HTMLElement>('button:not(:disabled),summary,input:not(:disabled),select:not(:disabled),a[href],[tabindex="0"]')].filter(node => node.getClientRects().length && !node.closest('details:not([open]) > :not(summary)'));
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === panel.current)) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', key); return () => document.removeEventListener('keydown', key);
  }, []);
  useLayoutEffect(() => {
    if (historical || !entries.length || !body.current) return;
    if (follow.current) { body.current.scrollTop = body.current.scrollHeight; setUnread(false); }
    else setUnread(true);
  }, [entries.length, historical]);
  return createPortal(<div className="di-round-shade">
    <div className="di-round-scroll" role="dialog" aria-modal="true" aria-label={historical ? 'Last round' : 'Round story'} tabIndex={-1} ref={panel}>
      <ScrollRoller />
      <div className="di-round-paper">
        <header className="di-round-heading"><div><small>Chapter {(summary?.chapter ?? room.chapter) + 1} · Turn {summary?.turn ?? room.turn}</small><h2>{historical ? 'Last round' : summary ? complete ? 'A little legend' : 'This round' : pending ? 'Checking your move…' : 'Waiting for the party'}</h2></div><button onClick={onClose}>View scene</button></header>
        <div className="di-round-narrator" ref={narratorHost} />
        <div className="di-round-body" data-beat={beat?.kind ?? 'waiting'} ref={body} tabIndex={0} role="region" aria-label="Round results" onClick={event => { if ((event.target as HTMLElement).closest('summary')) follow.current = false; }} onScroll={() => {
          const node = body.current!; follow.current = node.scrollHeight - node.scrollTop - node.clientHeight < 28;
          if (follow.current) setUnread(false);
        }}>
          {!summary && <><p className="di-round-wait-copy">{pending ? 'Your move is being confirmed. Your token and release are saved.' : 'Your move is on the table. Everyone’s choices will unfold here.'}</p>{waitingEntry && <IllustratedRoundRow room={room} chapter={room.chapter} entry={waitingEntry} userId={userId} />}<div className="di-round-party" aria-label="Party readiness">{humans.map(seat => <span key={seat.actorId}>{room.commits[seat.actorId] ? <Check size={16} /> : <Clock3 size={16} />}{seat.actorId === userId ? 'You' : seat.character.name}<small>{room.commits[seat.actorId] ? 'Move ready' : 'Choosing'}</small></span>)}</div>{pending && error && <p role="alert">{error}</p>}</>}
          {summary && !entries.length && <p className="di-round-wait-copy">The party’s moves land together…</p>}
          {entries.map((entry, index) => <IllustratedRoundRow key={entry.id} room={room} chapter={summary!.chapter} entry={entry} userId={userId} animate={!historical && !bypass && !reducedMotion && now - summary!.at - revealEntryDelay(summary!.entries.length, index) < 200} />)}
          {beat?.kind === 'full' && chapterComplete && <ChapterReward room={{ ...room, chapter: summary!.chapter }} />}
          {beat?.kind === 'full' && closing && <div className="di-round-ending"><TargetArtwork target={{ id: 'closing', artKey: closing.artKey }} /><strong>{closing.caption}</strong></div>}
        </div>
        {unread && <button className="di-round-new" onClick={() => { follow.current = true; body.current!.scrollTop = body.current!.scrollHeight; setUnread(false); }}>New results ↓</button>}
        <footer className="di-round-footer"><div><strong>{historical ? 'Saved in your story' : summary ? complete ? 'Adventure complete' : `${humans.filter(seat => room.revealSkips?.includes(seat.actorId)).length} of ${humans.length} ready` : pending ? 'Checking confirmation' : `${humans.filter(seat => room.commits[seat.actorId]).length} of ${humans.length} moves ready`}</strong><small>{historical ? 'Read at your own pace.' : complete ? 'Your keepsakes are ready.' : `${summary ? `${nextLabel} in` : 'Resolves within'} ${seconds}s`}</small></div>
          {summary && beat?.kind !== 'full' && <button onClick={onShowAll}>Show all</button>}
          {historical ? <button onClick={onClose}>Back to scene</button> : complete ? <button className="di-round-primary" disabled={loading} onClick={onCollect}>Collect your recap</button> : summary && canVote ? <button className="di-round-primary" disabled={skipped || skipping} onClick={onNext}>{skipped ? 'Ready' : skipping ? 'Marking ready…' : nextLabel}</button> : pending && <button disabled={loading} onClick={onRetry}>{loading ? 'Checking…' : 'Retry same move'}</button>}
        </footer>
        <span className="di-game-sr" role="status">{entries.at(-1)?.text ?? (pending ? 'Checking your move.' : !summary ? 'Waiting for the party.' : '')}</span>
      </div>
      <ScrollRoller />
    </div>
  </div>, document.body);
}
