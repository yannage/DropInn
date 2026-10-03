import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, Backpack, Check, ChevronRight, Clock3, Compass, Eye, FileText, Flame, Gem, Heart, Landmark, Lightbulb, LockKeyhole, Map, MessageCircle, Package, PackageOpen, Route, Sparkles, Users, X } from 'lucide-react';
import { useAdventureStore } from '../../store/adventureStore';
import { CONSUMABLES, FAVOUR_CHOICES, QUEST_ITEMS, combatMoves, expeditionActionPreview, expeditionInteractions, expeditionLocations, expeditionRoutes, expeditionScene, expeditionStash } from '../../lib/dropinn/expedition';
import { latestRound } from '../../lib/dropinn/roundSummary';
import { remainingTurnSeconds } from '../../lib/dropinn/playerGuidance';
import { spotlightSuggestions } from '../../lib/dropinn/suggestions';
import { invitationUrl } from '../../lib/dropinn/invites';
import type { AdventureRoom, PlayerAction } from '../../lib/dropinn/types';
import { CHARACTER_CLASS_PRESETS } from '../../lib/character';
import { SceneDrawer } from './SceneAdventure';
import { HeroAvatar } from './HeroAvatar';
import { TokenArtwork, type IllustratedToken } from './TokenArtwork';
import { TargetArtwork } from './TargetArtwork';
import { SceneStageArt } from './SceneStageArt';
import { TimedRelease } from './TimedRelease';
import { StoryScroll, type StoryScrollMode } from './StoryScroll';
import { RoundScroll } from './RoundScroll';
import { Narrator } from './Narrator';
import { useLiveReducedMotion } from './TableContact';
import { ExpeditionCombat } from './ExpeditionCombat';
import './expedition-adventure.css';

const TOKENS: { kind: IllustratedToken; label: string }[] = [
  { kind: 'fight', label: 'Fight' }, { kind: 'influence', label: 'Influence' },
  { kind: 'investigate', label: 'Investigate' }, { kind: 'assist', label: 'Help' },
];
const PROP_ICONS: Record<string, typeof Gem> = { 'price-board': FileText, 'display-case': PackageOpen, noticeboard: FileText, manifest: FileText, hearth: Flame, crate: Package, watcher: Eye, ramp: Route, 'prism-trail': Lightbulb, cradle: Landmark, beacon: Sparkles };
type Drawer = 'map' | 'stash' | 'party' | 'chat' | 'history' | 'details' | 'inspect' | 'spotlight' | null;
type ExpeditionAction = NonNullable<PlayerAction['expedition']>;
function itemName(kind: string) { return CONSUMABLES.find(item => item.id === kind)?.label ?? kind; }
function itemDescription(kind: string) { return CONSUMABLES.find(item => item.id === kind)?.description ?? ''; }

export function ExpeditionAdventure({ room, chat }: { room: AdventureRoom; chat: ReactNode }) {
  const { userId, loading, leaveRoom, joinRoom, commitAction, pendingMove, error, narration, skipReveal, skippingReveal, propose, proposal, proposing, clearProposal } = useAdventureStore();
  const expedition = room.expedition;
  const self = room.seats.find(seat => seat.actorId === userId && seat.kind === 'human');
  const classKey = self?.character.classKey ?? room.players[userId]?.character.classKey ?? 'wizard';
  const [now, setNow] = useState(Date.now);
  const [locationId, setLocationId] = useState(expedition?.locationId ?? 'shop');
  const [token, setToken] = useState<IllustratedToken>('investigate');
  const [targetId, setTargetId] = useState<string>();
  const [protectTargetId, setProtectTargetId] = useState<string>();
  const [interactionId, setInteractionId] = useState<string>();
  const [inspectedId, setInspectedId] = useState<string>();
  const [inspectedMove, setInspectedMove] = useState<IllustratedToken>();
  const [spotlightAction, setSpotlightAction] = useState<PlayerAction | null>(null);
  const [idea, setIdea] = useState('');
  const [spotlightTarget, setSpotlightTarget] = useState('');
  const [routeId, setRouteId] = useState<string>();
  const [consumableId, setConsumableId] = useState<string>();
  const [favourChoice, setFavourChoice] = useState<ExpeditionAction['favourChoice']>();
  const [rewardChoice, setRewardChoice] = useState<ExpeditionAction['rewardChoice']>();
  const [drawer, setDrawer] = useState<Drawer>(null);
  const [holding, setHolding] = useState(false);
  const [storyMode, setStoryMode] = useState<StoryScrollMode>('collapsed');
  const [dismissedRound, setDismissedRound] = useState('');
  const [manualRound, setManualRound] = useState('');
  const [showAllRound, setShowAllRound] = useState('');
  const [narratorHost, setNarratorHost] = useState<HTMLDivElement | null>(null);
  const [pacedTurns, setPacedTurns] = useState(true);
  const [inviteCopyLabel, setInviteCopyLabel] = useState('Copy invitation');
  const reducedMotion = useLiveReducedMotion();
  const locations = expeditionLocations(room);
  const routes = expeditionRoutes(room);
  const scene = expeditionScene(room, locationId);
  const battle = expedition?.battle;
  const inCombat = battle?.status === 'active';
  const showCombat = inCombat || (room.phase === 'reveal' && (battle?.status === 'won' || battle?.status === 'escaped'));
  const stash = expeditionStash(room, userId);
  const offers = expedition?.offers[userId] ?? [];
  const selectedItem = stash.find(item => item.id === consumableId);
  const selectedDefinition = CONSUMABLES.find(item => item.id === selectedItem?.kind);
  const target = scene.targets.find(item => item.id === targetId);
  const interactions = targetId && !inCombat ? expeditionInteractions(room, locationId, targetId, token) : [];
  const humanCount = room.seats.filter(seat => seat.kind === 'human').length;
  const moves = combatMoves(classKey, humanCount);
  const move = moves.find(item => item.token === token);
  const inspected = scene.targets.find(item => item.id === inspectedId);
  const spotlightScene = expeditionScene(room);
  const spotlightUsed = room.players[userId]?.spotlightChapters.includes(room.chapter) ?? false;
  const needsFavourChoice = selectedItem?.kind === 'favour' && !favourChoice;
  const joining = room.pendingJoins.includes(userId);
  const pending = pendingMove?.turn === room.turn ? pendingMove : null;
  const committed = room.commits[userId];
  const completed = room.status === 'completed';
  const canAct = !!self && !self.leaving && !joining && room.status === 'active' && room.phase === 'choosing' && !committed && !pending && now < room.deadline;
  const locked = !canAct || loading || holding;
  const roundKey = `${room.id}:${room.turn}`;
  const roundRest = !!pending || !!committed || room.phase === 'reveal' || completed;
  const restAt = useRef({ key: '', at: 0 });
  if (!roundRest) restAt.current = { key: '', at: 0 };
  else if (restAt.current.key !== roundKey) restAt.current = { key: roundKey, at: Date.now() };
  const lastRound = useMemo(() => latestRound(room), [room.id, room.events, room.outcomes, room.turn, room.chapter, room.phase]);
  const confirmed = room.phase === 'reveal' || completed;
  const liveSummary = confirmed ? lastRound : undefined;
  const readyAt = confirmed && lastRound ? lastRound.at + (reducedMotion ? 1600 : 2800) : restAt.current.at + 1800;
  const historical = drawer === 'history';
  const roundOpen = historical || (drawer === null && storyMode === 'collapsed' && roundRest && (manualRound === roundKey || (dismissedRound !== roundKey && now >= readyAt)));
  const seconds = remainingTurnSeconds(room, now);
  const skipped = room.revealSkips?.includes(userId) ?? false;
  const canSkip = room.status === 'active' && room.phase === 'reveal' && !!self && !self.leaving;
  const bypass = !pacedTurns || skipped || showAllRound === lastRound?.id;
  const visibleResult = liveSummary?.entries.find(entry => entry.actorId === userId && entry.kind === 'action') ?? liveSummary?.entries.find(entry => entry.kind === 'action');
  const consequence = liveSummary?.entries.find(entry => entry.kind === 'consequence' && !entry.actorId);

  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 150); return () => window.clearInterval(timer); }, []);
  useEffect(() => {
    setTargetId(undefined); setProtectTargetId(undefined); setInteractionId(undefined); setRouteId(undefined); setConsumableId(undefined); setFavourChoice(undefined); setRewardChoice(undefined); setHolding(false); setSpotlightAction(null); setIdea(''); clearProposal(); setSpotlightTarget(expeditionScene(room).targets[0]?.id ?? '');
  }, [room.turn, clearProposal]);
  useEffect(() => {
    setLocationId(expedition?.locationId ?? 'shop'); setTargetId(undefined); setInteractionId(undefined);
  }, [room.chapter, expedition?.locationId, inCombat]);
  useEffect(() => { if (!locations.some(place => place.id === locationId && place.available)) setLocationId(expedition?.locationId ?? locations.find(place => place.available)?.id ?? 'shop'); }, [locationId, expedition?.locationId, locations.map(place => `${place.id}:${place.available}`).join('|')]);
  const autoSkip = useRef('');
  useEffect(() => {
    if (pacedTurns || !canSkip || skipped || skippingReveal || !lastRound || now < readyAt || autoSkip.current === lastRound.id) return;
    autoSkip.current = lastRound.id; void skipReveal();
  }, [pacedTurns, canSkip, skipped, skippingReveal, lastRound?.id, now, readyAt, skipReveal]);

  const attachments = { ...(routeId ? { routeId } : {}), ...(consumableId ? { consumableId } : {}), ...(favourChoice ? { favourChoice } : {}), ...(rewardChoice ? { rewardChoice } : {}) };
  const selection: PlayerAction | null = spotlightAction ? { ...spotlightAction, expedition: { ...spotlightAction.expedition, ...attachments } } : protectTargetId && inCombat ? { token: 'assist', targetId: protectTargetId, targetKind: 'hero', expedition: attachments } : targetId && (inCombat || interactions.some(item => item.id === interactionId)) ? {
    token, targetId: inCombat ? 'encounter' : targetId, targetKind: 'scene',
    expedition: { locationId, ...(interactionId && !inCombat ? { interactionId } : {}), ...(routeId ? { routeId } : {}), ...(consumableId ? { consumableId } : {}), ...(favourChoice ? { favourChoice } : {}), ...(rewardChoice ? { rewardChoice } : {}) },
  } : null;
  const preview = selection?.token === 'spotlight' ? selection.proposal : selection ? expeditionActionPreview(room, userId, selection) : undefined;
  function chooseTarget(id: string, nextToken = token) {
    if (holding) return;
    if (locked) { setInspectedId(id); setInspectedMove(undefined); setDrawer('inspect'); return; }
    setSpotlightAction(null);
    setProtectTargetId(undefined);
    if (inCombat) { setToken(nextToken); setTargetId('encounter'); setInteractionId(undefined); return; }
    const availableTarget = scene.targets.find(item => item.id === id);
    if (!availableTarget) return;
    const supported = self?.hp === 0 ? 'assist' : availableTarget.tokens.includes(nextToken) ? nextToken : availableTarget.tokens.find(kind => kind !== 'spotlight') as IllustratedToken | undefined;
    setTargetId(id);
    if (supported) { setToken(supported); setInteractionId(expeditionInteractions(room, locationId, id, supported)[0]?.id); }
    else setInteractionId(undefined);
  }
  function chooseToken(kind: IllustratedToken) {
    if (locked || (self?.hp === 0 && kind !== 'assist')) return;
    setSpotlightAction(null);
    setProtectTargetId(undefined);
    setToken(kind);
    if (inCombat) { setTargetId('encounter'); setInteractionId(undefined); }
    else if (targetId) setInteractionId(expeditionInteractions(room, locationId, targetId, kind)[0]?.id);
  }
  function changeLocation(id: string) {
    if (holding || loading || pending) return;
    setLocationId(id); setTargetId(undefined); setInteractionId(undefined); setSpotlightAction(null);
  }
  function closeRound() { if (historical) setDrawer(null); else { setDismissedRound(roundKey); setManualRound(''); } }
  function openDrawer(next: Drawer) { if (holding) return; setStoryMode('collapsed'); setDrawer(next); }
  async function copyInvitation() {
    try { await navigator.clipboard.writeText(invitationUrl(room, window.location.origin)); setInviteCopyLabel('Copied!'); }
    catch { setInviteCopyLabel('Select the link to copy'); document.querySelector<HTMLInputElement>('#expedition-invitation')?.select(); }
  }
  function commit(releaseMs?: number) { if (!selection || !canAct || needsFavourChoice) return; void commitAction({ ...selection, ...(releaseMs === undefined ? {} : { releaseMs }) }); }
  const statusTitle = completed ? 'Gemward remembers your party.' : pending ? 'Checking your move…' : self?.leaving ? 'Finishing your visit' : joining ? 'Your seat is ready next turn' : !self ? 'A place at the table' : room.phase === 'reveal' ? 'Your choices change the town' : committed ? 'Your move is on the table' : room.status === 'parked' ? 'The table is resting' : now >= room.deadline ? 'The party’s moves are resolving…' : selection ? preview?.label ?? 'Your move is ready' : inCombat ? 'Choose your class move' : target ? `Choose how to approach ${target.name}` : 'Pick someone or something to interact with';
  const statusDetail = pending ? 'Your token, item and release are saved. Retry keeps the same move.' : committed ? 'Your party is still choosing. Explore the map while you wait.' : joining ? 'You can inspect the town while this turn finishes.' : completed ? room.outcomes.at(-1)?.text : selection ? preview?.description : inCombat ? 'Read the enemy intent, then prepare one move.' : target?.description ?? 'Looking around is free. Only releasing a token spends your turn.';

  return <main aria-label="Adventure table" data-expedition-mode={showCombat ? 'combat' : completed ? 'completed' : 'exploration'} className={`exp-adventure ${showCombat ? 'is-combat' : ''} ${reducedMotion ? 'reduced-motion' : ''}`}>
    <header className="exp-header">
      <button type="button" className="exp-icon-button" aria-label="Leave expedition" disabled={loading || holding} onClick={() => void leaveRoom()}><ArrowLeft size={19} /></button>
      <div className="exp-title"><span>DropInn / a living adventure</span><strong>{room.title}</strong></div>
      <StoryScroll room={room} userId={userId} mode={storyMode} onMode={setStoryMode} suspended={drawer !== null || roundOpen} locked={holding} seconds={seconds} narration={narration?.turn === room.turn ? narration.text : undefined} />
      <span className={`exp-clock ${seconds <= 10 && room.phase === 'choosing' ? 'is-urgent' : ''}`} aria-label={`${seconds} seconds ${room.phase === 'reveal' ? 'until next turn' : 'to choose'}`}><Clock3 size={15} />{seconds}s</span>
    </header>
    <div className="exp-objective"><div><span className="exp-eyebrow">{completed ? 'A changed town' : inCombat ? 'Party encounter' : `Chapter ${room.chapter + 1} · ${scene.location}`}</span><strong>{completed ? 'Bring the light home.' : scene.objective}</strong></div><button type="button" onClick={() => openDrawer('map')} disabled={holding} className="exp-map-peek"><Map size={18} /><span>Town → Trail → Beacon</span><ChevronRight size={14} /></button></div>
    <div className="exp-workspace">
      <section className="exp-table" aria-label="Your adventure table">
        {!showCombat && <nav className="exp-places" aria-label="Explore nearby places">{locations.filter(place => place.available).map(place => <button type="button" data-expedition-location={place.id} key={place.id} aria-pressed={locationId === place.id} disabled={holding || loading || !!pending} onClick={() => changeLocation(place.id)}><Compass size={14} />{place.label}</button>)}</nav>}
        <div className="exp-board di-scene-stage">
          <SceneStageArt chapter={room.chapter} art={scene.art} />
          <div className="exp-board-wash" />
          <div className="exp-party" aria-label="Party readiness">{room.seats.map(seat => <span className={`exp-hero ${seat.actorId === userId ? 'is-you' : ''} ${seat.hp === 0 ? 'is-downed' : ''}`} key={seat.id} title={`${seat.character.name} · ${seat.kind === 'companion' ? 'companion' : seat.leaving ? 'leaving' : room.commits[seat.actorId] ? 'move ready' : 'choosing'} · ${seat.hp} health`}><HeroAvatar hero={seat.character} decorative /><span>{seat.actorId === userId ? 'You' : seat.character.name}</span><small><Heart size={9} />{seat.hp}{room.commits[seat.actorId] && <Check size={11} />}{seat.kind === 'companion' && ' · pal'}</small></span>)}</div>
          {showCombat ? <ExpeditionCombat room={room} classKey={classKey} selectedToken={targetId && !protectTargetId ? token : undefined} disabled={holding} canProtect={!locked && !!room.enemyIntent} onProtect={() => { if (!locked && room.enemyIntent) { setProtectTargetId(room.enemyIntent.targetActorId); setToken('assist'); setSpotlightAction(null); } }} onSelect={kind => { if (locked) { setInspectedMove(kind); setInspectedId(undefined); setDrawer('inspect'); } else chooseToken(kind); }} /> : <div className="exp-targets">{scene.targets.map((item, index) => <button type="button" key={item.id} data-expedition-target={item.id} data-scene-target={item.id} className={`exp-target exp-target-${index} ${item.id === targetId ? 'is-selected' : ''} ${item.changed ? 'is-developed' : ''}`} disabled={holding} aria-pressed={item.id === targetId} onClick={() => chooseTarget(item.id)} aria-label={`${item.name}${item.changed ? ', changed by your party' : ''}`}>
            {item.artKey === '' ? <span className="exp-prop-icon" aria-hidden="true">{(() => { const Icon = PROP_ICONS[item.id] ?? Gem; return <Icon strokeWidth={1.4} />; })()}</span> : <TargetArtwork target={item} />}<span className="exp-target-name">{item.name}</span>{item.changed && <span className="exp-developed"><Check size={12} /> Changed</span>}{item.id === targetId && <span className="exp-target-seal"><TokenArtwork token={token} /></span>}
          </button>)}</div>}
          {liveSummary && <div key={liveSummary.id} className="exp-confirmed-result" role="status"><span><Sparkles size={16} />{consequence ? 'The story moves' : 'Your move landed'}</span><strong>{consequence?.text ?? visibleResult?.consequence ?? liveSummary.headline}</strong></div>}
          {!liveSummary && !showCombat && <div className="exp-location-caption">{room.chapter === 2 && !expedition?.finaleChoice ? 'At the beacon: Help restores; Influence releases. Other actions abstain; ties release.' : scene.situation ?? scene.intro}</div>}
        </div>
        <div className="exp-evidence-strip"><span><Gem size={14} /> Shared clues</span>{expedition?.questItems.length ? expedition.questItems.slice(-3).map(id => <button key={id} onClick={() => openDrawer('map')} disabled={holding}>{QUEST_ITEMS[id]?.label ?? id}</button>) : <small>Your discoveries will open new paths.</small>}<button type="button" className="exp-evidence-more" onClick={() => openDrawer('map')} disabled={holding} aria-label="View map and all shared clues"><ChevronRight size={16} /></button></div>
      </section>
      <aside className="exp-dock" aria-label="Prepare your turn">
        <div className="exp-dock-top"><span className="exp-eyebrow">{inCombat ? `${CHARACTER_CLASS_PRESETS[classKey].label} moves` : 'One turn. Your choice.'}</span><button type="button" onClick={() => openDrawer('stash')} disabled={holding}><Backpack size={15} />{stash.length}/3{offers.length > 0 && <i>{offers.length} new</i>}</button></div>
        <div className="exp-hand" aria-label="Your four action tokens">{TOKENS.map(item => {
          const combatMove = moves.find(option => option.token === item.kind);
          const unavailable = locked || (self?.hp === 0 && item.kind !== 'assist') || (!inCombat && !!target && !target.tokens.includes(item.kind));
          return <button type="button" data-token={item.kind} key={item.kind} disabled={unavailable} aria-pressed={!spotlightAction && token === item.kind} aria-label={inCombat ? `${item.label}: ${combatMove?.label}` : item.label} className={!spotlightAction && token === item.kind ? 'is-selected' : ''} onClick={() => chooseToken(item.kind)}><TokenArtwork token={item.kind} /><span>{item.label}</span>{showCombat && <small>{combatMove?.label}</small>}</button>;
        })}</div>
        {!roundRest && interactions.length > 1 && <div className="exp-topics" aria-label="Choose an interaction">{interactions.map(item => <button type="button" data-expedition-interaction={item.id} key={item.id} disabled={locked} aria-pressed={interactionId === item.id} className={interactionId === item.id ? 'is-selected' : ''} onClick={() => setInteractionId(item.id)}>{item.label}</button>)}</div>}
        <div className="exp-action-summary" aria-live="polite"><div><strong>{statusTitle}</strong><p>{needsFavourChoice ? 'Choose a ledger or canal key in your stash before releasing.' : statusDetail}</p></div>{selection && !roundRest && <button type="button" className="exp-icon-button" aria-label={interactions.length > 1 ? 'Choose a topic or read action details' : 'Read action details'} disabled={holding} onClick={() => openDrawer('details')}>{interactions.length > 1 && <span className="exp-topic-count">{interactions.length} topics</span>}<ChevronRight size={19} /></button>}</div>
        {!roundRest && (routeId || consumableId || rewardChoice) && <div className="exp-attached" aria-label="Attached to your action">{routeId && <span><Map size={12} />{routes.find(route => route.id === routeId)?.label}<button type="button" disabled={locked} aria-label="Remove route vote" onClick={() => setRouteId(undefined)}><X size={12} /></button></span>}{selectedItem && <span><Backpack size={12} />{itemName(selectedItem.kind)}<button type="button" disabled={locked} aria-label="Remove consumable" onClick={() => { setConsumableId(undefined); setFavourChoice(undefined); }}><X size={12} /></button></span>}{rewardChoice && <span><PackageOpen size={12} />Reward choice ready</span>}</div>}
        {selection && !roundRest && <TimedRelease key={`${room.id}:${room.turn}`} turn={room.turn} deadline={room.deadline} timingBonus={selection.token === 'spotlight' || inCombat && (!!protectTargetId || self?.hp === 0 || move?.stance === 'guard' && classKey !== 'wizard')} disabled={!canAct || loading || drawer !== null || needsFavourChoice} onCommit={commit} onHoldingChange={setHolding} />}
        {!selection && !roundRest && canAct && <div className="exp-release-placeholder"><span>1 · Pick a target</span><ArrowRight size={14} /><span>2 · Choose a token</span></div>}
        {pending && <button type="button" className="exp-primary" disabled={loading} onClick={() => void commitAction(pending.action)}>Retry same move</button>}
        {canSkip && <button type="button" className="exp-primary" disabled={skipped || skippingReveal} onClick={() => { setDismissedRound(roundKey); void skipReveal(); }}>{skipped ? 'Ready for the next turn' : 'Ready · next turn'}</button>}
        {completed && <button type="button" className="exp-primary" disabled={loading} onClick={() => void leaveRoom()}>Collect your recap <ArrowRight size={15} /></button>}
        {!self && !joining && !completed && <button type="button" className="exp-primary" disabled={loading} onClick={() => void joinRoom(room.code)}>Join the party</button>}
        {roundRest && <button type="button" className="exp-round-link" disabled={holding} onClick={() => { setStoryMode('collapsed'); setDrawer(null); setManualRound(roundKey); }}>Open round parchment</button>}
        {error && <p className="exp-error" role="alert">{error}</p>}
        <div className="exp-narrator"><Narrator room={room} compact pacedTurns={pacedTurns} onPacedTurns={setPacedTurns} suppressCue={false} deferCue={confirmed && now < readyAt} portalTarget={roundOpen ? narratorHost : null} /></div>
      </aside>
    </div>
    <footer className="exp-tools"><button type="button" onClick={() => openDrawer('map')} disabled={holding}><Map size={18} /><span>Map & clues</span></button><button type="button" onClick={() => openDrawer('stash')} disabled={holding}><Backpack size={18} /><span>Stash {stash.length}/3</span>{offers.length > 0 && <i>{offers.length}</i>}</button><button type="button" onClick={() => openDrawer('party')} disabled={holding}><Users size={18} /><span>Party</span></button><button type="button" onClick={() => openDrawer('chat')} disabled={holding}><MessageCircle size={18} /><span>Chat</span></button><button type="button" onClick={() => openDrawer('spotlight')} disabled={locked || spotlightUsed || self?.hp === 0} aria-label={spotlightUsed ? 'Spotlight used this chapter' : 'Create a Spotlight idea'}><Sparkles size={18} /><span>Spotlight</span></button>{lastRound && <button type="button" onClick={() => openDrawer('history')} disabled={holding}><Clock3 size={18} /><span>Last round</span></button>}</footer>
    {drawer && drawer !== 'history' && <SceneDrawer title={{ map: 'Paths through Gemward', stash: 'Your action stash', party: 'The party', chat: 'Table chat', details: 'Your prepared move', inspect: 'A closer look', spotlight: 'A Spotlight idea' }[drawer]} onClose={() => setDrawer(null)}>
      {drawer === 'map' && <div className="exp-map-panel"><p className="exp-drawer-intro">Your party travels together. Explore nearby places freely; add a route vote to your normal action when you are ready.</p><ol className="exp-map-track"><li className={room.chapter === 0 ? 'is-current' : 'is-done'}><Compass /><strong>Gemward town</strong><small>Meet people · follow leads</small></li><li className={room.chapter === 1 ? 'is-current' : room.chapter > 1 ? 'is-done' : ''}><Map /><strong>{routes.find(route => route.id === expedition?.routeId)?.label ?? 'Choose a trail'}</strong><small>Recover the missing gems</small></li><li className={room.chapter === 2 ? 'is-current' : ''}><Sparkles /><strong>The beacon</strong><small>Decide what returns home</small></li></ol><h3>Ways forward</h3><div className="exp-route-list">{routes.map(route => <button type="button" key={route.id} className={routeId === route.id ? 'is-selected' : ''} aria-pressed={routeId === route.id} disabled={locked || !route.available || room.chapter !== 0} onClick={() => { setRouteId(route.id); setDrawer(null); }}><span>{route.available ? <Compass size={21} /> : <LockKeyhole size={21} />}<strong>{route.label}</strong>{routeId === route.id && <Check size={18} />}</span><p>{route.description}</p><small>{room.chapter !== 0 ? expedition?.routeId === route.id ? 'Your party’s chosen route' : 'Another path for another visit' : route.available ? 'Add this vote to your next action' : `Needs ${Array.isArray(route.requires) ? route.requires.map(id => QUEST_ITEMS[id]?.label ?? id).join(' or ') : QUEST_ITEMS[route.requires ?? '']?.label ?? route.requires ?? 'a new lead'}`}</small></button>)}</div><p className="exp-fine-print">The most route votes wins after everyone acts. A tie takes the Hill road. After four town turns without a vote, the party takes that road too; its longer journey costs supplies.</p><h3><Gem size={17} /> Shared quest pouch</h3><p>These discoveries belong to the party. They stay when a hero leaves and do not use stash slots.</p><div className="exp-quest-items">{expedition?.questItems.map(id => <article key={id}><Gem size={19} /><div><strong>{QUEST_ITEMS[id]?.label ?? id}</strong><p>{QUEST_ITEMS[id]?.description}</p></div></article>)}{!expedition?.questItems.length && <p>Nothing found yet. Start a conversation or inspect something unusual.</p>}</div>{!!expedition?.costs.length && <><h3>What your choices changed</h3>{expedition.costs.map(cost => <p key={cost}>{cost}</p>)}</>}</div>}
      {drawer === 'stash' && <div className="exp-stash-panel"><p className="exp-drawer-intro">Three slots. One consumable alongside your ordinary action. Items are used only when that action resolves.</p><div className="exp-stash-slots">{Array.from({ length: 3 }, (_, index) => {
        const item = stash[index]; const definition = CONSUMABLES.find(option => option.id === item?.kind);
        const usable = (!definition || definition.when === 'any' || (inCombat ? definition.when === 'combat' : definition.when === 'exploration')) && !(item?.kind === 'favour' && room.chapter !== 0);
        return item ? <button type="button" key={item.id} disabled={locked || !usable} aria-pressed={consumableId === item.id} className={consumableId === item.id ? 'is-selected' : ''} onClick={() => { setConsumableId(consumableId === item.id ? undefined : item.id); setFavourChoice(undefined); if (rewardChoice?.replaceId === item.id) setRewardChoice(undefined); }}><Backpack size={23} /><strong>{itemName(item.kind)}</strong><p>{itemDescription(item.kind)}</p><small>{consumableId === item.id ? 'Attached to your next move' : !usable ? item.kind === 'favour' ? 'Use while exploring town' : `Use during ${definition?.when}` : 'Use with your next move'}</small></button> : <div className="exp-empty-slot" key={`empty-${index}`}><PackageOpen size={24} /><span>Empty slot</span></div>;
      })}</div>{selectedDefinition?.id === 'favour' && <fieldset className="exp-favour"><legend>Choose the favour</legend>{FAVOUR_CHOICES.map(choice => <label key={choice.id}><input type="radio" name="exp-favour" checked={favourChoice === choice.id} disabled={locked} onChange={() => setFavourChoice(choice.id)} />{choice.label}</label>)}</fieldset>}{offers.length > 0 && <div className="exp-overflow"><h3>A reward is waiting</h3><p><strong>{itemName(offers[0].item.kind)}</strong> · {itemDescription(offers[0].item.kind)}</p><p>{stash.length < 3 ? 'You have an empty slot for this reward.' : 'Keep it by replacing a slot, or leave it.'} This choice travels with your next action.</p><div>{stash.length < 3 && <button type="button" disabled={locked} className={rewardChoice?.offerId === offers[0].id && !rewardChoice.replaceId && !rewardChoice.decline ? 'is-selected' : ''} onClick={() => setRewardChoice({ offerId: offers[0].id })}>Keep reward</button>}{stash.map(item => <button type="button" key={item.id} disabled={locked || consumableId === item.id} className={rewardChoice?.replaceId === item.id ? 'is-selected' : ''} onClick={() => setRewardChoice({ offerId: offers[0].id, replaceId: item.id })}>Replace {itemName(item.kind)}</button>)}<button type="button" disabled={locked} className={rewardChoice?.decline ? 'is-selected' : ''} onClick={() => setRewardChoice({ offerId: offers[0].id, decline: true })}>Leave this reward</button></div></div>}<button type="button" className="exp-primary" onClick={() => setDrawer(null)}>Back to my move <ArrowRight size={15} /></button></div>}
      {drawer === 'party' && <div><p>Table <strong>{room.code}</strong> · All heroes choose together. Humans can join or leave at turn boundaries.</p><h3>Invite a friend</h3><p>{room.visibility === 'private' ? 'This private table needs the full invitation link.' : 'Send this invitation to bring a friend to your table.'}</p><label htmlFor="expedition-invitation">Full invitation link</label><input id="expedition-invitation" value={invitationUrl(room, window.location.origin)} readOnly onFocus={event => event.target.select()} /><button type="button" className="exp-primary" onClick={() => void copyInvitation()}>{inviteCopyLabel}</button>{room.seats.map(seat => <article className="exp-party-detail" key={seat.id}><HeroAvatar hero={seat.character} /><div><strong>{seat.character.name}{seat.actorId === userId ? ' · you' : ''}</strong><p>{CHARACTER_CLASS_PRESETS[seat.character.classKey].label} · {seat.hp} health</p><small>{seat.kind === 'companion' ? 'Rules-based companion' : seat.leaving ? 'Leaving after this turn' : room.commits[seat.actorId] ? 'Move committed' : 'Choosing a move'}</small></div></article>)}</div>}
      {drawer === 'chat' && chat}
      {drawer === 'details' && <div>{interactions.length > 1 && <div className="exp-dialog-topics"><h3>Choose your topic</h3>{interactions.map(item => <button type="button" key={item.id} disabled={locked} aria-pressed={interactionId === item.id} onClick={() => { setInteractionId(item.id); setSpotlightAction(null); }}><strong>{item.label}</strong><span>{item.description}</span></button>)}</div>}<h3>{preview?.label}</h3><p>{preview?.description ?? move?.description}</p>{target && <p>{target.context ?? target.description}</p>}{interactions.find(item => item.id === interactionId)?.consumable && <p><strong>First-time reward:</strong> {itemName(interactions.find(item => item.id === interactionId)!.consumable!)}</p>}{routeId && <p><strong>Route vote:</strong> {routes.find(route => route.id === routeId)?.label}</p>}{selectedItem && <p><strong>Consumable:</strong> {itemName(selectedItem.kind)} — {itemDescription(selectedItem.kind)}</p>}<p>Choosing prepares your move. Use the release controls on the table to commit it.</p><button type="button" className="exp-primary" onClick={() => setDrawer(null)}>Back to my move</button></div>}
      {drawer === 'inspect' && <div><h3>{inspected?.name ?? moves.find(item => item.token === inspectedMove)?.label}</h3><p>{inspected?.context ?? inspected?.description ?? moves.find(item => item.token === inspectedMove)?.description}</p><p>{scene.objective}</p><p>You can inspect freely. Your submitted move stays saved exactly as released.</p></div>}
      {drawer === 'spotlight' && <div className="exp-spotlight"><p>One creative move per chapter. Build an idea around the party’s shared scene: <strong>{spotlightScene.location}</strong>. A preview never spends your turn.</p><div className="exp-dialog-topics">{spotlightSuggestions(room).map(suggestion => <button type="button" key={suggestion.label} disabled={proposing || !canAct} onClick={() => { setIdea(suggestion.idea); setSpotlightTarget(suggestion.targetId); clearProposal(); void propose(suggestion.idea, suggestion.targetId); }}>{suggestion.label}</button>)}</div><label htmlFor="exp-spotlight-idea">Your idea</label><textarea id="exp-spotlight-idea" maxLength={280} rows={3} value={idea} onChange={event => { setIdea(event.target.value); clearProposal(); }} placeholder="Describe something your hero could try with the scene." /><label htmlFor="exp-spotlight-target">Use something in the shared scene</label><select id="exp-spotlight-target" value={spotlightTarget || spotlightScene.targets[0]?.id} onChange={event => { setSpotlightTarget(event.target.value); clearProposal(); }}>{spotlightScene.targets.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select><button type="button" className="exp-primary" disabled={!idea.trim() || proposing || !canAct} onClick={() => void propose(idea.trim(), spotlightTarget || spotlightScene.targets[0].id)}>{proposing ? 'Considering…' : 'Preview my idea'}</button>{proposal?.turn === room.turn && <div role="status"><h3>{proposal.label}</h3><p>{proposal.description}</p>{proposal.supported ? <button type="button" className="exp-primary" disabled={!canAct} onClick={() => { setSpotlightAction({ token: 'spotlight', targetId: proposal.targetId, proposal, targetKind: 'scene', expedition: { locationId: expedition?.locationId } }); setLocationId(expedition?.locationId ?? locationId); setTargetId(proposal.targetId); setDrawer(null); }}>Ready this Spotlight</button> : <p>Your turn is safe. Try another idea or a normal token.</p>}</div>}{error && <p role="alert">{error}</p>}</div>}
    </SceneDrawer>}
    {roundOpen && <RoundScroll key={`${roundKey}:${historical ? 'history' : 'live'}`} room={room} userId={userId} summary={historical ? lastRound : liveSummary} action={pending?.action ?? committed} pending={!!pending} loading={loading} error={error} historical={historical} now={now} seconds={seconds} bypass={bypass} reducedMotion={reducedMotion} canVote={canSkip} skipped={skipped} skipping={skippingReveal} onClose={closeRound} onShowAll={() => lastRound && setShowAllRound(lastRound.id)} onNext={() => void skipReveal()} onRetry={() => pending && void commitAction(pending.action)} onCollect={() => void leaveRoom()} narratorHost={setNarratorHost} />}
  </main>;
}
