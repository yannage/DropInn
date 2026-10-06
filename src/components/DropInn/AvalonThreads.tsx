import { ArrowRight, Check, Compass, Flag, Footprints, Handshake, Leaf } from 'lucide-react';
import { AVALON_THREADS, AVALON_PROMISES } from '../../lib/dropinn/avalonContent';
import { avalonDiceResolutionCost } from '../../lib/dropinn/avalonDiceContent';
import { questContent } from '../../lib/dropinn/questRun';
import type { AdventureRoom } from '../../lib/dropinn/types';
import type { QuestRunAction } from '../../lib/dropinn/questRunTypes';
import { KeepsakeArtwork } from './KeepsakeArtwork';
import './avalon-adventure.css';

type Props = { room: AdventureRoom; canAct: boolean; onPrepare: (action: QuestRunAction, label: string, detail: string) => void };

/** The director offers possibilities. This view never makes a choice for the party. */
export function AvalonThreads({ room, canAct, onPrepare }: Props) {
  const episode = room.questRun!.avalon!;
  const content = questContent(room);
  const visible = episode.threads.filter(thread => thread.status !== 'hidden');
  const ordered = [...visible].sort((a, b) => Number(b.status === 'active') - Number(a.status === 'active') || Number(a.status === 'resolved') - Number(b.status === 'resolved') || episode.director.opportunities.indexOf(a.id) - episode.director.opportunities.indexOf(b.id));
  const promise = episode.promise && AVALON_PROMISES[episode.promise.id];
  const resolved = episode.threads.filter(thread => thread.status === 'resolved');
  return <div className="av-threads" data-avalon-threads>
    <div className="av-arrival-note"><Leaf size={20} /><p><strong>The same hills. Your own visit.</strong>You arrived at {content.nodes.find(node => node.id === episode.manifest.startNodeId)?.label}. {episode.manifest.weather === 'rain' ? 'Rain has come to the hills.' : episode.manifest.weather === 'mist' ? 'Mist hangs along the waterways.' : 'The woodland paths are clear today.'}</p></div>
    <p>Follow a lead to make it a party priority. It takes one action. Two threads can stay open together, and everyone’s discoveries belong to the party.</p>
    {!visible.length && <div className="av-empty-leads"><Compass size={30} /><h3>Start with what is in front of you.</h3><p>Help someone, inspect an object or ask a question. Your first discovery can become a lead.</p></div>}
    {ordered.map(thread => {
      const definition = AVALON_THREADS[thread.id];
      const ending = thread.resolutionId && definition.resolutions[thread.resolutionId];
      const events = room.events.filter(event => (event.quest?.threadId === thread.id || event.id === thread.sourceEventId) && event.actorId && event.quest?.kind !== 'pass').slice(-3);
      const offered = episode.director.opportunities.includes(thread.id);
      return <article key={thread.id} className={`av-thread is-${thread.status}`} data-avalon-thread={thread.id}>
        <div className="av-thread-heading"><span className="av-thread-pin">{thread.status === 'resolved' ? <Check size={20} /> : thread.status === 'active' ? <Flag size={20} /> : <Footprints size={20} />}</span><div><small>{thread.status === 'resolved' ? 'A change you made' : thread.status === 'active' ? 'The party is following this' : offered ? 'A lead from your discoveries' : 'A lead you can return to'}</small><h3>{definition.title}</h3></div></div>
        <p>{ending ? ending.change : definition.question}</p>
        {ending && <p className="av-cost"><strong>What it cost:</strong> {room.adventureVersion === 2 ? avalonDiceResolutionCost(thread.id, thread.resolutionId!, room.questRun!.facts.map(fact => fact.id)) : ending.cost}</p>}
        {thread.status === 'active' && <div className="av-pressure" data-avalon-pressure={thread.pressure}><span aria-hidden="true">{[1, 2, 3].map(step => <i key={step} className={step <= thread.pressure ? 'is-filled' : ''} />)}</span><p><strong>{thread.pressure >= 3 ? 'The setback has happened' : 'If this stays unresolved'}</strong>{thread.pressure === 3 && thread.pressureSupplySpent === false ? 'No shared supply was available. This request for help remains open.' : definition.pressureWarnings[Math.max(0, thread.pressure - 1)]}<small>Only rounds with real exploration advance this trouble. At the third step it costs one shared supply, once. Every solution stays available.</small></p></div>}
        {!!events.length && <details className="av-thread-evidence"><summary>How we got here</summary>{events.map(event => <p key={event.id}><strong>{event.actorName}</strong> · {content.nodes.find(node => node.id === event.quest?.nodeId)?.label}<span>{event.text}</span></p>)}</details>}
        {thread.status === 'discovered' && room.status === 'active' && <button type="button" className="qr-confirm" disabled={!canAct} data-avalon-follow={thread.id} onClick={() => onPrepare({ kind: 'follow-thread', threadId: thread.id }, `Follow: ${definition.title}`, 'Spend one action to make this a party priority. Its announced trouble advances with meaningful exploration rounds; the third step costs one shared supply once.')}><Flag size={16} />Follow this lead <ArrowRight size={16} /></button>}
      </article>;
    })}
    {promise && <section className={`av-promise ${episode.promise!.status === 'kept' ? 'is-kept' : ''}`} data-avalon-promise><Handshake size={23} /><div><h3>{episode.promise!.status === 'kept' ? 'A promise kept' : 'Your promise'}: {promise.name}</h3><p>{episode.promise!.status === 'kept' ? promise.fulfillmentText : promise.description}</p>{episode.promise!.status === 'owed' && <small>Return to {content.nodes.find(node => node.id === promise.nodeId)?.label} to keep your word.</small>}</div></section>}
    {!!resolved.length && room.status === 'active' && <section className="av-return"><KeepsakeArtwork name="Avalon’s return cup" /><div><h3>A story worth bringing home</h3><p>You have changed something here. You can follow another thread or return to the inn and close this visit. Unfinished leads and promises will be named in your ending.</p>{room.questRun!.nodeId === 'larch-inn' ? <button type="button" className="qr-confirm" disabled={!canAct} data-avalon-return onClick={() => onPrepare({ kind: 'return-episode' }, 'Tell the inn our story', 'Spend one action to close this visit. Keep the changes you made; unresolved troubles and any unkept promise remain part of the ending.')}><Check size={16} />Bring this story home</button> : <small>Make your way to Larch Inn when you are ready.</small>}</div></section>}
  </div>;
}

/** Permanent geographic features are separate from the party's changing trail. */
export function AvalonWaterways() {
  return <svg className="av-waterways" viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="Larch Run and Reed Brook flow into Merewater" role="img">
    <path d="M24 15 Q18 27 24 39 T48 61 Q52 78 58 91" />
    <path d="M78 36 Q89 58 79 81 T65 91" />
    <ellipse cx="61" cy="94" rx="23" ry="9" />
    <text x="18" y="59" transform="rotate(52 18 59)">Larch Run</text><text x="84" y="43" transform="rotate(86 84 43)">Reed Brook</text><text x="48" y="97">Merewater</text>
  </svg>;
}
