import { useRef, useState } from 'react';
import { ArrowRight, Check, Clock3, Compass, Flag, Footprints, HelpCircle, LockKeyhole, MapPin } from 'lucide-react';
import { journeyHighlights, journeyLocations, journeyMap, journeyTravelOptions } from '../../lib/dropinn/journey';
import { remainingTurnSeconds } from '../../lib/dropinn/playerGuidance';
import { buildStoryTable } from '../../lib/dropinn/storyTablePresentation';
import { QUEST_ITEMS } from '../../lib/dropinn/expedition';
import type { AdventureRoom } from '../../lib/dropinn/types';
import { HeroAvatar } from './HeroAvatar';
import { gemwardBackdrop, GemwardItem } from './GemwardArt';

const positions: Record<string, [number, number]> = { town: [50, 84], warehouse: [21, 52], canal: [50, 47], road: [80, 54], beacon: [29, 15], 'lantern-square': [72, 17] };
const picture: Record<string, string> = { town: 'shop', warehouse: 'warehouse', canal: 'canal', road: 'road', beacon: 'beacon', 'lantern-square': 'lantern-square' };
export function GemwardJourney({ room, userId, now, loading, pending, onVote, onClose }: {
  room: AdventureRoom; userId: string; now: number; loading: boolean;
  pending: { turn: number; decisionId: string; edgeId: string } | null;
  onVote: (edgeId: string) => void; onClose: () => void;
}) {
  const map = journeyMap(room);
  const options = journeyTravelOptions(room);
  const travel = room.expedition?.travel;
  const traveling = room.phase === 'travel' && !!travel;
  const storyLed = room.adventureVersion === 3;
  const story = storyLed ? buildStoryTable(room, userId) : undefined;
  const [selectedId, setSelectedId] = useState(map.currentNodeId);
  const inspector = useRef<HTMLElement>(null);
  const selected = map.nodes.find(node => node.id === selectedId) ?? map.nodes.find(node => node.id === map.currentNodeId)!;
  const option = options.find(item => item.toNodeId === selected.id);
  const self = room.seats.find(seat => seat.actorId === userId);
  const vote = travel?.votes[userId];
  const eligible = traveling && room.status === 'active' && !!self && self.kind === 'human' && !self.leaving && travel.eligibleActorIds.includes(userId);
  const canVote = eligible && !vote && !pending && !loading && now < room.deadline;
  const fallback = options.find(item => item.edgeId === travel?.fallbackEdgeId);
  const seconds = remainingTurnSeconds(room, now);
  const selectedEdge = map.edges.find(edge => edge.to === selected.id && (edge.state === 'taken' || edge.from === map.currentNodeId));
  const evidence = (selectedEdge?.unlockEventIds ?? option?.unlockEventIds ?? []).flatMap(eventId => {
    const event = room.events.find(item => item.id === eventId);
    return event?.journey?.questChanges?.filter(change => change.kind === 'gained').map(change => ({ change, event })) ?? [];
  });
  const places = journeyLocations(room);
  const highlights = journeyHighlights(room);
  const memory = ['visited', 'current'].includes(selected.state) ? highlights.find(highlight => highlight.chapter === selected.chapter) : undefined;
  const moments = memory?.eventIds.flatMap(id => {
    const event = room.events.find(item => item.id === id);
    return event && event.text !== memory?.text && (event.journey?.questChanges?.length || event.journey?.encounter) ? [event] : [];
  }).slice(0, 3) ?? [];
  const sourceLabels = (ids: string[]) => {
    const sources = room.events.filter(event => ids.includes(event.id));
    const named = sources.filter(event => event.actorName);
    return [...new Set((named.length ? named : sources).map(source => `${source.actorName ?? 'The party'} · ${places.find(place => place.id === source.journey?.locationId)?.label ?? source.journey?.locationId?.replace(/-/g, ' ') ?? 'along the journey'} · turn ${source.turn}`))];
  };
  function inspectPlace(id: typeof map.currentNodeId) {
    setSelectedId(id);
    if (window.matchMedia('(max-width: 620px)').matches) requestAnimationFrame(() => inspector.current?.scrollIntoView({ block: 'start', behavior: 'instant' }));
  }
  return <div className={`gm-journey ${storyLed ? 'is-story-led' : ''}`}>
    <div className="gm-journey-heading"><span className="gm-overline">A story taking shape</span><h3>{story && traveling ? story.question : 'Your path through Gemward'}</h3><p>{story && traveling ? story.situation : traveling ? 'The party is ready to move. Choose your next place together.' : 'Every path you took is written here. Discoveries can open another way.'}</p>{traveling && <div className="gm-travel-clock" role="timer"><Clock3 size={17} /><strong>{seconds}s</strong><span>{vote ? 'Your vote is in' : eligible ? 'Choose the party’s next stop' : 'The party is choosing; your seat joins next turn'}</span></div>}</div>
    {storyLed && traveling && <nav className="gm-route-picker" aria-label="Choose a destination to inspect">{options.map(route => <button key={route.edgeId} type="button" data-journey-choice={route.toNodeId} aria-pressed={selectedId === route.toNodeId} onClick={() => inspectPlace(route.toNodeId)}>{route.label}<small>{route.available ? 'Inspect this route' : 'Discovery needed'}</small></button>)}</nav>}
    <div className="gm-journey-layout">
      <div className="gm-map-paper" aria-label="Branching adventure map">
        <span className="gm-map-chapter gm-map-chapter-3">III · A changed evening</span><span className="gm-map-chapter gm-map-chapter-2">II · Beyond the town</span><span className="gm-map-chapter gm-map-chapter-1">I · A light goes missing</span>
        <svg className="gm-map-paths" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><defs><filter id="gm-map-glow"><feGaussianBlur stdDeviation=".4" /></filter></defs>{map.edges.map(edge => {
          const from = positions[edge.from], to = positions[edge.to]; if (!from || !to) return null;
          const bend = (from[1] + to[1]) / 2;
          return <g key={edge.id} className={`is-${edge.state}`}><path className="gm-path-shadow" d={`M ${from[0]} ${from[1]} C ${from[0]} ${bend}, ${to[0]} ${bend}, ${to[0]} ${to[1]}`} /><path className="gm-path-ink" d={`M ${from[0]} ${from[1]} C ${from[0]} ${bend}, ${to[0]} ${bend}, ${to[0]} ${to[1]}`} /></g>;
        })}</svg>
        <span className="gm-map-hills gm-map-hills-left" aria-hidden="true">⌁<br />⌁ ⌁</span><span className="gm-map-hills gm-map-hills-right" aria-hidden="true">⌁<br />⌁ ⌁</span>
        {map.nodes.map(node => {
          const [x, y] = positions[node.id] ?? [50, 50];
          const unknown = node.state === 'mystery';
          return <button type="button" data-journey-node={node.id} key={node.id} className={`gm-map-node is-${node.state} ${selected.id === node.id ? 'is-inspected' : ''}`} style={{ left: `${x}%`, top: `${y}%` }} aria-pressed={selected.id === node.id} aria-label={`${unknown ? 'Unknown place' : node.label}: ${node.state}`} onClick={() => { setSelectedId(node.id); if (window.matchMedia('(max-width: 620px)').matches) inspector.current?.scrollIntoView({ block: 'start', behavior: 'instant' }); }}>
            <span className="gm-node-medallion">{unknown ? <HelpCircle size={26} /> : <img src={gemwardBackdrop(picture[node.id] ?? node.id)} alt="" draggable={false} />}{node.state === 'visited' && <Check className="gm-node-badge" size={15} />}{node.state === 'locked' && <LockKeyhole className="gm-node-badge" size={14} />}{node.state === 'current' && <span className="gm-map-pawn">{self ? <HeroAvatar hero={self.character} decorative /> : <MapPin size={24} />}</span>}</span><strong>{unknown ? 'A place ahead' : node.label}</strong>{node.state === 'current' && <small>You are here</small>}
          </button>;
        })}
        <div className="gm-map-key"><span><i className="is-taken" />Your journey</span><span><i className="is-available" />A possible way</span></div>
      </div>
      <aside className="gm-map-inspector" aria-label="Selected place" ref={inspector}>
        <span className="gm-overline">{selected.state === 'mystery' ? 'Beyond the next chapter' : `Chapter ${selected.chapter + 1}`}</span><h3>{selected.state === 'mystery' ? 'A story still to come' : selected.label}</h3><p>{selected.state === 'mystery' ? 'Its shape will become clear as the party follows the light.' : selected.description}</p>
        {selected.state === 'current' && <p className="gm-map-current"><MapPin size={16} />The party is here together.</p>}
        {memory && <section className="gm-node-memory" aria-label="This chapter’s memories"><h4><Footprints size={16} />What happened here</h4><p>{memory.text}</p>{moments.length > 0 && <ul>{moments.map(event => <li key={event.id}><span>Turn {event.turn}</span>{event.text}</li>)}</ul>}</section>}
        {option && selected.state !== 'mystery' && <><p className="gm-route-consequence">{option.description}</p>{option.cost && <p className="gm-route-cost"><Flag size={15} /><span>{option.cost}</span></p>}{option.requires.length > 0 && <div className="gm-route-keys">{option.requires.map(id => <span key={id}><GemwardItem id={id} /><span>{QUEST_ITEMS[id]?.label ?? id}</span></span>)}</div>}
          {traveling && option.available ? <button type="button" className="gm-primary" data-journey-edge={option.edgeId} disabled={!canVote} onClick={() => onVote(option.edgeId)}>{vote?.edgeId === option.edgeId ? <><Check size={17} />Your chosen path</> : <>Confirm route <ArrowRight size={16} /></>}</button> : <p className="gm-route-state">{option.available ? 'Open when the party is ready to travel.' : 'Find the discovery that opens this path.'}</p>}
        </>}
        {evidence.length > 0 && <section className="gm-route-provenance"><strong>{selectedEdge?.state === 'taken' ? 'What led you here' : 'How this path opened'}</strong>{evidence.map(({ change, event }) => <div key={`${event.id}:${change.itemId}`}><p><GemwardItem id={change.itemId} /><b>{QUEST_ITEMS[change.itemId]?.label ?? 'A shared discovery'}</b></p>{sourceLabels(change.sourceEventIds).map(label => <p key={label}>{label}</p>)}</div>)}</section>}
        {traveling && <section className="gm-travel-ballot"><h4>At this crossroads</h4>{travel.eligibleActorIds.map(id => <p key={id}><span>{room.players[id]?.character.name ?? travel.votes[id]?.actorName ?? 'A fellow traveler'}</span><strong>{travel.votes[id] ? map.nodes.find(node => node.id === options.find(item => item.edgeId === travel.votes[id].edgeId)?.toNodeId)?.label ?? 'Voted' : !room.seats.some(seat => seat.actorId === id && !seat.leaving) ? 'Left the table' : 'Choosing…'}</strong></p>)}<small>Most votes wins. A tie or no votes takes {fallback?.label ?? 'the announced fallback'}.{fallback?.cost ? ` ${fallback.cost}` : ''}</small></section>}
        {pending && <div className="gm-pending-travel" role="status"><p>Your route vote is saved while confirmation is checked.</p><button className="gm-primary" disabled={loading} onClick={() => onVote(pending.edgeId)}>Retry the same vote</button></div>}
        <button type="button" className="gm-quiet-button" onClick={onClose}>View the scene</button>
      </aside>
    </div>
    <section className="gm-chapter-memories" aria-label="Chapter highlights"><h3><Footprints size={19} /> What the party left behind</h3>{highlights.slice(0, 3).map(highlight => <article key={highlight.chapter}><span>0{highlight.chapter + 1}</span><div><strong>{highlight.title}</strong><p>{highlight.text}</p></div></article>)}{highlights.length === 0 && <p>Your first chapter is still being written.</p>}</section>
  </div>;
}


