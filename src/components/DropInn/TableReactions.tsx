import { useEffect, useState } from 'react';
import { Heart, Lightbulb, PartyPopper } from 'lucide-react';
import type { AdventureRoom, ReactionKind } from '../../lib/dropinn/types';
import { useAdventureStore } from '../../store/adventureStore';

const reactions = [
  { kind: 'cheer' as const, label: 'Cheers!', Icon: PartyPopper },
  { kind: 'thanks' as const, label: 'Thanks!', Icon: Heart },
  { kind: 'clever' as const, label: 'Clever!', Icon: Lightbulb },
];

export function TableReactions({ room }: { room: AdventureRoom }) {
  const { userId, mutedUserIds, reacting, sendReaction } = useAdventureStore();
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 500); return () => window.clearInterval(timer); }, []);
  const seated = room.seats.some(seat => seat.kind === 'human' && seat.actorId === userId && !seat.leaving);
  const latestOwn = room.reactions?.filter(reaction => reaction.userId === userId).at(-1);
  const cooling = latestOwn && now - latestOwn.at < 4200;
  const visible = (room.reactions ?? []).filter(reaction => now - reaction.at < 8000 && !mutedUserIds.includes(reaction.userId));
  return <section className="di-table-reactions" aria-label="Table reactions">
    <div className="di-reaction-buttons" role="group" aria-label="Send a table reaction">
      {reactions.map(({ kind, label, Icon }) => <button type="button" key={kind} disabled={!seated || reacting || !!cooling || room.status !== 'active'}
        onClick={() => void sendReaction(kind as ReactionKind)} aria-label={`React: ${label}`}><Icon size={16} />{label}</button>)}
    </div>
    <div className="di-reaction-stream" aria-live="polite" aria-relevant="additions">
      {visible.slice(-3).map(reaction => {
        const style = reactions.find(item => item.kind === reaction.kind);
        if (!style) return null;
        return <span className={`di-reaction-bubble di-reaction-${reaction.kind}`} key={reaction.id}>
          <style.Icon size={14} /><b>{room.players[reaction.userId]?.character.name ?? 'Adventurer'}</b> {style.label}
        </span>;
      })}
    </div>
  </section>;
}
