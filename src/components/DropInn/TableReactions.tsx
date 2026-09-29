import { useEffect, useRef, useState } from 'react';
import { Heart, Lightbulb, PartyPopper } from 'lucide-react';
import type { AdventureRoom, ReactionKind, TableReaction } from '../../lib/dropinn/types';
import { useAdventureStore } from '../../store/adventureStore';
import { playTableSound } from './tableSound';
import './table-reactions.css';

const reactions = [
  { kind: 'cheer' as const, label: 'Cheers!', Icon: PartyPopper },
  { kind: 'thanks' as const, label: 'Thanks!', Icon: Heart },
  { kind: 'clever' as const, label: 'Clever!', Icon: Lightbulb },
];

export function TableReactions({ room, tabletop = false }: { room: AdventureRoom; tabletop?: boolean }) {
  const { userId, mutedUserIds, reacting, sendReaction } = useAdventureStore();
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 500); return () => window.clearInterval(timer); }, []);
  const seated = room.seats.some(seat => seat.kind === 'human' && seat.actorId === userId && !seat.leaving);
  const latestOwn = room.reactions?.filter(reaction => reaction.userId === userId).at(-1);
  const cooling = latestOwn && now - latestOwn.at < 4200;
  const visible = (room.reactions ?? []).filter(reaction => now - reaction.at < 8000 && !mutedUserIds.includes(reaction.userId));
  return <section className={`di-table-reactions ${tabletop ? "is-tabletop" : ""}`} aria-label="Table reactions">
    {tabletop && <p className="di-reaction-invitation">{reacting ? "Sending…" : cooling ? `Another cheer in ${Math.ceil((4200 - (now - latestOwn.at)) / 1000)}s` : "Cheer your party"}</p>}
    <div className="di-reaction-buttons" role="group" aria-label="Send a table reaction">
      {reactions.map(({ kind, label, Icon }) => <button type="button" key={kind} disabled={!seated || reacting || !!cooling || room.status !== 'active'}
        onClick={() => { playTableSound('pick'); void sendReaction(kind as ReactionKind); }} aria-label={`React: ${label}`}><Icon size={16} />{label}</button>)}
    </div>
    {!tabletop && <div className="di-reaction-stream" aria-live="polite" aria-relevant="additions">
      {visible.slice(-3).map(reaction => {
        const style = reactions.find(item => item.kind === reaction.kind);
        if (!style) return null;
        return <span className={`di-reaction-bubble di-reaction-${reaction.kind}`} key={reaction.id}>
          <style.Icon size={14} /><b>{room.players[reaction.userId]?.character.name ?? 'Adventurer'}</b> {style.label}
        </span>;
      })}
    </div>}
  </section>;
}


/** Confirmed social reactions sit with their actor, including while another player chooses. */
export function HeroReaction({ room, actorId, now }: { room: AdventureRoom; actorId: string; now: number }) {
  const muted = useAdventureStore(state => state.mutedUserIds.includes(actorId));
  const reaction = room.reactions?.filter(item => item.userId === actorId && now >= item.at && now - item.at < 8000).at(-1);
  if (muted || !reaction) return null;
  return <ReactionMark key={reaction.id} reaction={reaction} name={room.players[actorId]?.character.name ?? 'Adventurer'} now={now}/>;
}

function ReactionMark({ reaction, name, now }: { reaction: TableReaction; name: string; now: number }) {
  // Repeated snapshots retain this node; late snapshots/remounts start at elapsed time.
  const delay = useRef(-Math.max(0, now - reaction.at) / 1000);
  const style = reactions.find(item => item.kind === reaction.kind);
  if (!style) return null;
  return <span className={`di-hero-reaction is-${reaction.kind}`} data-reaction-id={reaction.id}
    role="status" aria-label={`${name}: ${style.label}`} style={{ animationDelay: `${delay.current}s` }}>
    <style.Icon size={18}/><span>{style.label}</span>
  </span>;
}
