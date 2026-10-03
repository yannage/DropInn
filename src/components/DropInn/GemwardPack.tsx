import { useState } from 'react';
import { ArrowRight, Backpack, Check, Gift, History, PackageOpen, X } from 'lucide-react';
import { CONSUMABLES, FAVOUR_CHOICES, expeditionStash } from '../../lib/dropinn/expedition';
import { journeyMap, journeyPouch, journeyLocations } from '../../lib/dropinn/journey';
import type { AdventureRoom, PlayerAction } from '../../lib/dropinn/types';
import { GemwardItem } from './GemwardArt';

type Attachments = NonNullable<PlayerAction['expedition']>;
export function GemwardConsumable({ kind }: { kind: string }) {
  const [failed, setFailed] = useState(false);
  return <span className={`gm-consumable-art is-${kind}`} aria-hidden="true">{!failed ? <img src={`/art/gemward-v2-${kind}.webp`} alt="" draggable={false} onError={() => setFailed(true)} /> : <span className="gm-bottle"><i /><b /></span>}</span>;
}
export function GemwardPack({ room, userId, mode, disabled, attachments, onChange, onClose }: {
  room: AdventureRoom; userId: string; mode: 'stash' | 'pouch'; disabled: boolean;
  attachments: Attachments; onChange: (next: Attachments) => void; onClose: () => void;
}) {
  const [tab, setTab] = useState(mode);
  const [inspected, setInspected] = useState<string>();
  const pouch = journeyPouch(room);
  const map = journeyMap(room);
  const places = journeyLocations(room);
  const stash = expeditionStash(room, userId);
  const battle = room.expedition?.battle?.status === 'active';
  const offer = room.expedition?.offers[userId]?.[0];
  const selected = stash.find(item => item.id === attachments.consumableId);
  const label = (kind: string) => CONSUMABLES.find(item => item.id === kind)?.label ?? kind;
  return <div className="gm-pack">
    <nav className="gm-pack-tabs" aria-label="Inventory type"><button aria-pressed={tab === 'stash'} onClick={() => setTab('stash')}><Backpack size={17} />Your stash <b>{stash.length}/3</b></button><button aria-pressed={tab === 'pouch'} onClick={() => setTab('pouch')}><History size={17} />Party discoveries <b>{pouch.filter(item => item.status === 'held').length}</b></button></nav>
    {tab === 'stash' ? <>
      <p className="gm-panel-intro">A little something for the right moment. Attach one item to your move; it is spent when that move resolves.</p>
      <div className="gm-stash-slots">{Array.from({ length: 3 }, (_, index) => {
        const item = stash[index];
        const definition = CONSUMABLES.find(option => option.id === item?.kind);
        const usable = definition && (definition.when === 'any' || (battle ? definition.when === 'combat' : definition.when === 'exploration')) && !(item?.kind === 'favour' && room.chapter !== 0);
        return item ? <button key={item.id} className={selected?.id === item.id ? 'is-selected' : ''} disabled={disabled || !usable} aria-pressed={selected?.id === item.id} onClick={() => onChange({ ...attachments, consumableId: selected?.id === item.id ? undefined : item.id, favourChoice: undefined, rewardChoice: attachments.rewardChoice?.replaceId === item.id ? undefined : attachments.rewardChoice })}>
          <span className="gm-slot-number">0{index + 1}</span><GemwardConsumable kind={item.kind} /><strong>{definition?.label}</strong><p>{definition?.description}</p><small>{selected?.id === item.id ? 'Packed with your move' : !usable ? item.kind === 'favour' ? 'Use in town' : `For ${definition?.when}` : 'Attach to your move'}</small>{selected?.id === item.id && <Check size={18} className="gm-slot-check" />}
        </button> : <div key={index} className="gm-empty-slot"><span className="gm-slot-number">0{index + 1}</span><PackageOpen size={32} /><span>Room for a find</span></div>;
      })}</div>
      {selected?.kind === 'favour' && <fieldset className="gm-favour"><legend>What will you ask for?</legend>{FAVOUR_CHOICES.map(choice => <label key={choice.id}><input type="radio" name="gm-favour" checked={attachments.favourChoice === choice.id} disabled={disabled} onChange={() => onChange({ ...attachments, favourChoice: choice.id })} /><GemwardItem id={choice.id} /><span>{choice.label}</span></label>)}</fieldset>}
      {offer && <section className="gm-reward-offer"><h3><Gift size={20} /> A gift is waiting</h3><div className="gm-offer-item"><GemwardConsumable kind={offer.item.kind} /><div><strong>{label(offer.item.kind)}</strong><p>{CONSUMABLES.find(item => item.id === offer.item.kind)?.description}</p></div></div><p>{stash.length < 3 ? 'There is room in your stash.' : 'Three things travel with you. Choose what to leave behind.'} This choice joins your next action.</p><div className="gm-replace-options">{stash.length < 3 && <button disabled={disabled} aria-pressed={attachments.rewardChoice?.offerId === offer.id && !attachments.rewardChoice.replaceId && !attachments.rewardChoice.decline} onClick={() => onChange({ ...attachments, rewardChoice: { offerId: offer.id } })}>Keep this gift</button>}{stash.map(item => <button key={item.id} disabled={disabled || selected?.id === item.id} aria-pressed={attachments.rewardChoice?.replaceId === item.id} onClick={() => onChange({ ...attachments, rewardChoice: { offerId: offer.id, replaceId: item.id } })}>Replace {label(item.kind)}</button>)}<button disabled={disabled} aria-pressed={!!attachments.rewardChoice?.decline} onClick={() => onChange({ ...attachments, rewardChoice: { offerId: offer.id, decline: true } })}>Leave the gift</button></div></section>}
    </> : <>
      <p className="gm-panel-intro">The party’s discoveries stay with the journey, even when a hero leaves. Their stories are written on the back.</p>
      <div className="gm-pouch-items">{pouch.map(item => <article key={item.id} data-quest-item={item.id} className={item.status === 'spent' ? 'is-spent' : ''}><button onClick={() => setInspected(inspected === item.id ? undefined : item.id)} aria-expanded={inspected === item.id}><GemwardItem id={item.id} /><span><strong>{item.label}</strong><small>{item.status === 'spent' ? 'Used in the story' : 'In the shared pouch'}</small></span><ArrowRight size={17} /></button>{inspected === item.id && <div className="gm-item-story"><p>{item.description}</p>{item.sources.map(source => <p key={source.eventId}><History size={13} /><span>{source.actorName ?? 'The party'} found it{source.locationId ? ` at ${places.find(place => place.id === source.locationId)?.label ?? source.locationId.replace(/-/g, ' ')}` : ''} · turn {source.turn}</span></p>)}{item.unlocks.length > 0 && <p><strong>Opened:</strong> {item.unlocks.map(edgeId => map.edges.find(edge => edge.id === edgeId)?.label ?? 'A path ahead').join(' · ')}</p>}</div>}</article>)}</div>
      {!pouch.length && <div className="gm-empty-pouch"><PackageOpen size={44} /><p>The pouch is waiting for its first story.<br />Ask a question or follow a curious detail.</p></div>}
    </>}
    <button className="gm-primary" onClick={onClose}>Back to the scene <ArrowRight size={16} /></button>
  </div>;
}

