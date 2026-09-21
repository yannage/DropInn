import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from 'react';
import { StoryScroll, type StoryScrollMode } from './StoryScroll';
import { ArrowLeft, Check, Clock3, Copy, Dices, Flame, Heart, Info, MessageCircle, Shield, Sparkles, Users, Volume2, VolumeX, X } from 'lucide-react';
import { useAdventureStore } from '../../store/adventureStore';
import { chaptersFor, adventureFor } from '../../lib/dropinn/registry';
import { describeAction } from '../../lib/dropinn/engine';
import { getScene, spotlightExample } from '../../lib/dropinn/scene';
import { rollSupport, supportText, teammatesAt } from '../../lib/dropinn/teamwork';
import { spotlightSuggestions } from '../../lib/dropinn/suggestions';
import { invitationUrl } from '../../lib/dropinn/invites';
import { CHARACTER_CLASS_PRESETS } from '../../lib/character';
import type { AdventureRoom, PlayerAction } from '../../lib/dropinn/types';
import { currentTurnResults, resultLine } from '../../lib/dropinn/turnPresentation';
import { HeroAvatar } from './HeroAvatar';
import { TargetArtwork } from './TargetArtwork';
import { TokenArtwork, type IllustratedToken } from './TokenArtwork';
import { TimedRelease } from './TimedRelease';
import { TableReactions } from './TableReactions';
import { playTableSound, tableSoundEnabled, setTableSound } from './tableSound';
import { SceneStageArt } from './SceneStageArt';
import { TurnResolution } from './TurnResolution';
import { FocusedActionStage, FocusedActionChoices } from './FocusedAction';
import { approachDetail, approachOption, approachOptions, isDuel, turnInsight } from '../../lib/dropinn/approaches';
import './scene-adventure.css';
import './game-feel.css';

const TOKENS: { kind: IllustratedToken; label: string }[] = [
  { kind: 'fight', label: 'Fight' }, { kind: 'influence', label: 'Influence' },
  { kind: 'investigate', label: 'Investigate' }, { kind: 'assist', label: 'Help' },
];
const objectives = ['Help Mara. Find the missing herd.', 'Cross before the shadow pack strikes.', 'Free the herd. Restore the ward.'];
const verbs: Record<string, string> = { mara: 'Help Mara', tracks: 'Follow the tracks', gate: 'Clear the gate', herd: 'Calm the herd', pack: 'Face the pack', reeds: 'Find a hidden path', boat: 'Free the boat', ferryman: 'Ask the ferryman', gloamfang: 'Face Gloamfang', ward: 'Restore the ward', bell: 'Ring the bell', captives: 'Free the captives' };
const effects: Record<IllustratedToken, string> = { fight: 'Progress · block 2', influence: 'Progress · ease danger', investigate: 'Progress · next-turn insight', assist: 'Progress · class support' };
type Drawer = 'party' | 'chat' | 'invite' | 'details' | 'spotlight' | 'choice' | null;

export function SceneDrawer({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const close = useRef(onClose); close.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const old = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.focus();
    const key = (event: KeyboardEvent) => {
      // A report sheet may be opened from Chat; only the top sheet traps input.
      if (Array.from(document.querySelectorAll('[role="dialog"]')).at(-1) !== ref.current) return;
      if (event.key === 'Escape') { event.preventDefault(); close.current(); }
      if (event.key !== 'Tab') return;
      const items = Array.from(ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),textarea:not(:disabled),select:not(:disabled),[tabindex="0"]') ?? []).filter(node => node.getClientRects().length);
      const first = items[0], last = items.at(-1);
      if (event.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === ref.current)) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', key);
    return () => { document.body.style.overflow = old; document.removeEventListener('keydown', key); previous?.isConnected && previous.focus(); };
  }, []);
  return <div className="di-scene-shade" onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="di-scene-drawer" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={ref}>
      <header><h2>{title}</h2><button onClick={onClose} aria-label={`Close ${title}`}><X size={22} /></button></header>
      <div className="di-scene-drawer-body">{children}</div>
    </div>
  </div>;
}

export function SceneAdventure({ room, chat }: { room: AdventureRoom; chat: ReactNode }) {
  const { userId, loading, leaveRoom, joinRoom, commitAction, pendingMove, propose, proposal, proposing, clearProposal, messages, narration } = useAdventureStore();
  const scene = getScene(room);
  const CHAPTERS = chaptersFor(room);
  const branchOpen = !!scene.branch && !room.storyBranch;
  const closing = room.storyBranch ? adventureFor(room).closing?.[room.storyBranch] : undefined;
  const self = room.seats.find(seat => seat.actorId === userId && seat.kind === 'human');
  const participant = room.players[userId];
  const intent = room.enemyIntent?.turn === room.turn ? room.enemyIntent : undefined;
  const victim = room.seats.find(seat => seat.actorId === intent?.targetActorId);
  const joining = room.pendingJoins.includes(userId);
  const committed = Boolean(room.commits[userId]);
  const [now, setNow] = useState(Date.now());
  const [drawer, setDrawer] = useState<Drawer>(null);
  const [storyMode,setStoryMode] = useState<StoryScrollMode>('collapsed');
  useEffect(() => {setStoryMode('collapsed');},[room.id]);
  const [token, setToken] = useState<IllustratedToken>('investigate');
  const [selection, setSelection] = useState<PlayerAction | null>(null);
  const [holding, setHolding] = useState(false);
  const [idea, setIdea] = useState('');
  const [spotlightTarget, setSpotlightTarget] = useState(scene.targets[0]?.id ?? '');
  const [copied, setCopied] = useState(false);
  const [sound, setSound] = useState(tableSoundEnabled);
  const [seenMessages, setSeenMessages] = useState(messages.length);
  const [hint, setHint] = useState('Place a token on something in the scene.');
  const [drag, setDrag] = useState<{ kind: IllustratedToken; x: number; y: number; over: string | null } | null>(null);
  const gesture = useRef<{ id: number; kind: IllustratedToken; x: number; y: number; moving: boolean } | null>(null);
  const suppressClick = useRef(false);
  const stage = useRef<HTMLDivElement>(null);
  const [threatPath, setThreatPath] = useState<{ width: number; height: number; path: string } | null>(null);
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 100); return () => window.clearInterval(timer); }, []);
  useEffect(() => {
    setSelection(null); setHolding(false); setDrag(null); gesture.current = null;
    setIdea(''); setSpotlightTarget(scene.targets[0]?.id ?? ''); clearProposal(); setDrawer(current => current === 'spotlight' || current === 'choice' ? null : current);
    setHint('Place a token on something in the scene.');
  }, [room.turn, clearProposal]);
  useEffect(() => { if (drawer === 'chat') setSeenMessages(messages.length); }, [drawer, messages.length]);
  const pending = pendingMove?.turn === room.turn ? pendingMove : null;
  const canAct = !!self && !self.leaving && !joining && room.status === 'active' && room.phase === 'choosing' && !committed && now < room.deadline;
  useLayoutEffect(() => {
    const node = stage.current;
    if (!node || !intent) { setThreatPath(null); return; }
    const update = () => {
      const nodes = Array.from(node.querySelectorAll<HTMLElement>('[data-scene-target]'));
      const from = nodes.find(item => item.dataset.sceneTarget === intent.sourceId);
      const to = nodes.find(item => item.dataset.sceneTarget === intent.targetActorId);
      if (!from || !to) { setThreatPath(null); return; }
      const box = node.getBoundingClientRect(), a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
      const x1 = a.x + a.width / 2 - box.x, y1 = a.y - box.y + 6;
      const x2 = b.x + b.width / 2 - box.x, y2 = b.bottom - box.y + 3;
      setThreatPath({ width: box.width, height: box.height, path: `M ${x1} ${y1} Q ${x1} ${y2 + 20} ${x2} ${y2}` });
    };
    update(); const observer = new ResizeObserver(update); observer.observe(node);
    return () => observer.disconnect();
  }, [room.chapter, intent?.targetActorId, intent?.sourceId, intent?.turn]);
  const locked = !canAct || loading || holding || !!pending;
  const target = scene.targets.find(target => target.id === selection?.targetId);
  const protect = selection?.targetKind === 'hero';
  const downed = self?.hp === 0;
  const seconds = Math.max(0, Math.ceil((((room.phase === 'reveal' ? room.revealUntil : room.deadline) ?? room.deadline) - now) / 1000));
  const results = currentTurnResults(room);
  const strike = results.find(event => event.turn === room.turn && event.result?.targetKind === 'hero' && event.result.targetId === intent?.targetActorId && event.result.damage !== undefined)?.result;
  const threatLabel = room.phase === 'reveal' ? strike ? strike.damage ? 'The strike lands' : 'Attack blocked' : 'Strike averted' : `${victim?.actorId === userId ? 'You are' : `${victim?.character.name} is`} in danger`;
  const ownResult = results.find(event => event.actorId === userId && (event.contribution || event.roll !== undefined));
  const support = selection && !protect ? rollSupport(room, userId, selection) : null;
  const description = selection && self && !protect ? describeAction(self.character.classKey, selection.token, selection.targetId, room) : null;
  const successChance = (bonus: number) => description && self ? Math.max(0, Math.min(20, 21 + self.character.traits[description.trait] + (support?.total ?? 0) + bonus - description.dc)) * 5 : null;
  const availableProposal = proposal?.turn === room.turn && proposal.idea === idea.trim() && proposal.targetId === spotlightTarget ? proposal : null;
  const spent = participant?.spotlightChapters.includes(room.chapter) ?? false;
  const canPlace = (kind: IllustratedToken, id: string, type = 'scene') => {
    if (downed && kind !== 'assist') return false;
    return type === 'hero' ? kind === 'assist' && (intent?.targetActorId === id || (room.mechanicsVersion === 1 && room.seats.some(member => member.actorId === id && !member.leaving && member.hp < member.character.maxHp))) : !!scene.targets.find(target => target.id === id)?.tokens.includes(kind);
  };
  const choose = (kind: IllustratedToken, id: string, type: 'scene' | 'hero' = 'scene') => {
    if (locked) { if (!canAct) { if (type === 'hero') setDrawer('party'); else if (!holding && !drag) setStoryMode('compact'); } return; }
    if (!canPlace(kind, id, type)) { setHint(type === 'hero' ? 'Use Help to protect the threatened hero.' : 'Try a highlighted object, or choose another token.'); return; }
    const action: PlayerAction = { token: kind, targetId: id, targetKind: type };
    if (type === 'hero') { if (intent?.targetActorId !== id) action.approach = 'mend'; }
    else action.approach = approachOptions(room, action)[0]?.id;
    setToken(kind); setSelection(action); clearProposal();
    if (branchOpen && kind === 'assist' && type === 'scene' && scene.branch?.options.some(option => option.targetId === id)) setDrawer('choice');
    setHint('Hold the die, then release in the bright zone.'); playTableSound('place');
  };
  const hit = (x: number, y: number) => {
    const node = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-scene-target]');
    return node && stage.current?.contains(node) ? { id: node.dataset.sceneTarget!, type: node.dataset.targetKind as 'scene' | 'hero' } : null;
  };
  const startDrag = (event: PointerEvent<HTMLButtonElement>, kind: IllustratedToken) => {
    if (locked || !event.isPrimary || event.button !== 0 || (downed && kind !== 'assist')) return;
    suppressClick.current = false; event.currentTarget.setPointerCapture(event.pointerId);
    gesture.current = { id: event.pointerId, kind, x: event.clientX, y: event.clientY, moving: false };
  };
  const moveDrag = (event: PointerEvent<HTMLButtonElement>) => {
    const current = gesture.current;
    if (!current || current.id !== event.pointerId) return;
    if (Math.hypot(event.clientX - current.x, event.clientY - current.y) > 9) current.moving = true;
    if (current.moving) {
      const hovered = hit(event.clientX, event.clientY); setToken(current.kind);
      setDrag({ kind: current.kind, x: event.clientX, y: event.clientY, over: hovered && canPlace(current.kind, hovered.id, hovered.type) ? hovered.id : null });
    }
  };
  const endDrag = (event: PointerEvent<HTMLButtonElement>) => {
    const current = gesture.current;
    if (current?.id !== event.pointerId) return;
    if (current.moving) {
      suppressClick.current = true;
      const hovered = hit(event.clientX, event.clientY);
      if (hovered) choose(current.kind, hovered.id, hovered.type);
      else setHint('Token returned. Drop it on a highlighted object.');
    }
    gesture.current = null; setDrag(null);
  };
  useEffect(() => { if (!canAct || loading) { gesture.current = null; setDrag(null); } }, [canAct, loading]);
  const commit = (releaseMs?: number) => {
    if (!selection || !canAct) return;
    void commitAction({ ...selection, ...(releaseMs === undefined ? {} : { releaseMs }) });
  };
  const branchOption = branchOpen && selection?.token === 'assist' ? scene.branch?.options.find(option => option.targetId === selection.targetId && selection.targetKind !== 'hero') : undefined;
  const focusAction = selection ?? pending?.action ?? room.commits[userId] ?? (ownResult?.result?.approach && ownResult.result.token && ownResult.result.targetId ? { token: ownResult.result.token, targetId: ownResult.result.targetId, targetKind: ownResult.result.targetKind, approach: ownResult.result.approach } : null);
  const focus = !!self && room.mechanicsVersion === 1 && !!focusAction && (focusAction.approach !== undefined || focusAction.targetKind === 'hero');
  const focusedOption = focusAction ? approachOption(room, focusAction) : undefined;
  const focusDescription = focusAction && self ? describeAction(self.character.classKey, focusAction.token, focusAction.targetId, room) : null;
  const focusModifier = self && focusDescription && focusAction ? self.character.traits[focusDescription.trait] + rollSupport(room, userId, focusAction).total + (focusedOption?.modifier ?? 0) : 0;
  const backToScene = () => {
    if (locked) return;
    const id = selection?.targetId;
    setSelection(null);
    requestAnimationFrame(() => { Array.from(stage.current?.querySelectorAll<HTMLElement>('[data-scene-target]') ?? []).find(node => node.dataset.sceneTarget === id)?.focus(); });
  };
  useEffect(() => {
    if (focus && !locked) document.querySelector<HTMLElement>('.di-focus-choices button[aria-pressed="true"]')?.focus();
  }, [focus]);
  const compactLabel = branchOption ? branchOption.label : protect ? `Protect ${victim?.character.name ?? 'your ally'}` : selection?.token === 'spotlight' ? selection.proposal?.label : target ? target.changed ? target.name : verbs[target.id] ?? target.name : 'Your move';
  const helpEffect = self ? { fighter: 'Progress · cover', rogue: 'Progress · next-turn opening', wizard: 'Progress · next-turn insight', cleric: 'Progress · heal up to 4' }[self.character.classKey] : effects.assist;
  const readyHumans = room.seats.filter(member => member.kind === 'human' && !member.leaving);
  const phaseLabel = room.status === 'completed' ? 'Adventure complete' : room.phase === 'reveal' ? 'The payoff' : committed ? 'Move committed' : selection ? 'Ready your move' : 'Choose your move';
  const handEffects: Record<IllustratedToken, string> = { fight: scene.combat ? 'Push · cover' : 'Clear the way', influence: 'Ease danger', investigate: 'Set up next turn', assist: downed ? 'Still in the fight' : 'Support · protect' };
  const activeSupport = [turnInsight(room) ? `+${turnInsight(room)} insight` : '', room.flags.includes(`opening:${room.turn}`) ? '+1 opening' : '', support?.teamwork ? '+1 teamwork' : ''].filter(Boolean).join(' · ');
  const compactEffect = branchOption ? 'Your route vote counts even if the roll misses.' : protect ? 'Block 2 · great release blocks 3' : selection?.token === 'spotlight' ? `On success: ${selection.proposal?.effect}` : selection ? `${selection.token === 'assist' ? helpEffect : selection.token === 'fight' && !scene.combat ? 'Progress · clear the way' : effects[selection.token as IllustratedToken]}${support?.total ? ` · +${support.total}` : ''}` : branchOpen ? 'Place Help on a route to review its cost.' : hint;
  const openSpotlight = () => { if (holding || pending || !canAct || downed || spent) return; setDrawer('spotlight'); setSpotlightTarget(target?.id ?? scene.targets[0].id); setIdea(''); clearProposal(); };
  const closeDrawer = () => { setDrawer(null); if (drawer === 'spotlight') { clearProposal(); setIdea(''); } };
  const chooseSpotlight = () => {
    if (!availableProposal?.supported || !canAct) return;
    setSelection({ token: 'spotlight', targetKind: 'scene', targetId: availableProposal.targetId, proposal: availableProposal }); setDrawer(null);
  };
  const share = async () => { try { await navigator.clipboard.writeText(invitationUrl(room, window.location.origin)); setCopied(true); } catch { setCopied(false); } };
  return <main className="di-theater" aria-label="Adventure table" onKeyDown={event => { if (event.key === 'Escape' && focus && !drawer && storyMode === 'collapsed') { event.preventDefault(); backToScene(); } }}>
    <header className="di-stage-header">
      <div className="di-stage-header-left">
      <button aria-label={room.status === 'completed' ? 'Back to the inn' : 'Leave & save'} disabled={loading || holding} onClick={() => void leaveRoom()}><ArrowLeft size={20} /><span>Leave</span></button>
      <StoryScroll key={room.id} room={room} userId={userId} mode={storyMode} onMode={setStoryMode} suspended={drawer!==null} locked={holding || !!drag} seconds={seconds} narration={narration?.turn===room.turn ? narration.text : undefined}/>
      </div>
      <div className="di-stage-chapters" aria-label={`Chapter ${room.chapter + 1} of ${CHAPTERS.length}`}>
        {CHAPTERS.map((chapter, index) => <span key={chapter.id} className={index === room.chapter ? 'current' : index < room.chapter ? 'done' : ''} title={chapter.title}>{index < room.chapter ? <Check size={12} /> : index + 1}</span>)}
      </div>
      <span className={`di-stage-clock ${seconds <= 8 && room.phase === 'choosing' ? 'urgent' : ''}`} role="timer" aria-label={room.status !== 'active' ? 'Table paused' : `${Math.ceil(seconds)} seconds ${room.phase === 'reveal' ? 'until next turn' : 'to choose'}`}><small>Turn {room.chapterRound}</small><Clock3 size={16} />{room.status === 'active' ? Math.ceil(seconds) : '—'}</span>
    </header>
    <div className="di-stage-objective"><strong>{room.status === 'completed' ? 'You made a little legend.' : branchOpen ? scene.branch!.prompt : adventureFor(room).id === 'briar-glen' ? objectives[room.chapter] : scene.objective}</strong><div role="progressbar" aria-label="Chapter progress" aria-valuenow={Math.round(Math.min(100, room.progress / scene.progressGoal * 100))} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${Math.min(100, room.progress / scene.progressGoal * 100)}%` }} /></div><span className="di-stage-pressure" aria-label={`Danger ${room.danger}`}><Flame size={12} />{Number(room.danger.toFixed(1))}</span></div>
    <div className={`di-scene-stage di-stage-${scene.art} ${scene.combat ? 'di-stage-combat' : ''} ${room.phase === 'reveal' ? 'is-resolving' : ''} ${holding ? 'is-charging' : ''} ${focus ? 'is-focused' : ''}`} ref={stage}>
      <SceneStageArt chapter={room.chapter} art={scene.art} />
      {focus && focusAction && self ? <FocusedActionStage room={room} action={focusAction} actor={self} modifier={focusModifier} result={room.phase === 'reveal' ? ownResult : undefined} /> : <>
      {threatPath && <svg className="di-threat-link" aria-hidden="true" viewBox={`0 0 ${threatPath.width} ${threatPath.height}`}><defs><marker id="stage-threat-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#b44e35" /></marker></defs><path d={threatPath.path} fill="none" stroke="#b44e35" strokeWidth="2.5" strokeDasharray="5 6" markerEnd="url(#stage-threat-arrow)" /></svg>}
      <div className="di-stage-party" aria-label="Heroes at the table">
        {room.seats.map(member => {
          const threatened = intent?.targetActorId === member.actorId;
          const ready = room.commits[member.actorId];
          const guard = Object.values(room.commits).filter(action => action.targetKind === 'hero' && action.targetId === member.actorId).length;
          const damage = results.find(event => event.result?.targetId === member.actorId && event.result?.damage !== undefined);
          const healing = results.filter(event => event.result?.targetKind === 'hero' && event.result.targetId === member.actorId).reduce((total, event) => total + (event.result?.healing ?? 0), 0);
          return <button key={member.id} className={`di-stage-hero ${threatened ? 'is-threatened' : ''} ${selection?.targetKind === 'hero' && selection.targetId === member.actorId ? 'is-selected' : ''} ${drag?.over === member.actorId ? 'is-over' : ''}`} data-scene-target={member.actorId} data-target-kind="hero"
            aria-label={`${member.character.name}${member.actorId === userId ? ', you' : ''}, ${member.hp} HP${member.kind === 'companion' ? ', companion' : ''}${threatened ? ', threatened: place Help to protect' : room.mechanicsVersion === 1 && member.hp < member.character.maxHp ? ', wounded: place Help to heal' : ', party details'}`} onClick={() => token === 'assist' && canPlace('assist', member.actorId, 'hero') ? choose('assist', member.actorId, 'hero') : setDrawer('party')}>
            <HeroAvatar hero={member.character} decorative /><span className="di-stage-hero-name">{member.actorId === userId ? 'You' : member.character.name}</span>
            <span className="di-stage-health"><Heart size={10} />{member.hp}{member.kind === 'companion' && <small>C</small>}</span>
            {ready && <span className="di-stage-ready"><Check size={12} /></span>}{guard > 0 && <span className="di-stage-guard"><Shield size={14} /></span>}
            {room.phase === 'reveal' && (damage || healing > 0) && <span key={`${room.turn}-${member.actorId}`} className="di-stage-damage" aria-label={`${healing ? `Recovered ${healing} HP. ` : ''}${damage ? damage.result?.damage ? `Lost ${damage.result.damage} HP.` : 'Attack blocked.' : ''}`}>{healing > 0 && <span className="di-stage-healing">+{healing}</span>}{damage && <span>{damage.result?.damage ? `−${damage.result.damage}` : <Shield size={18} />}</span>}</span>}
          </button>;
        })}
      </div>
      {intent && victim && <div className="di-stage-threat" aria-label={room.phase === 'reveal' ? `${threatLabel}: ${victim.character.name}, ${strike?.damage ?? 0} damage` : `Incoming attack on ${victim.character.name}: ${intent.baseDamage} damage`}><span className="di-threat-arrow">{room.phase === 'reveal' && !strike?.damage ? '✓' : '↗'}</span><strong>{threatLabel}</strong><span>{room.phase === 'reveal' ? strike?.damage ?? 0 : intent.baseDamage}<Heart size={12} /></span></div>}
      <div className="di-stage-targets" aria-label="Objects in the scene">
        {scene.targets.map((item, index) => {
          const selected = selection?.targetKind !== 'hero' && selection?.targetId === item.id;
          const can = canPlace(token, item.id);
          const teammates = teammatesAt(room, userId, item.id);
          const teamwork = teammates.some(mate => mate.token !== token) && can && canAct;
          const targetResults = results.filter(event => event.result?.targetKind !== 'hero' && event.result?.targetId === item.id && event.result?.token);
          const event = targetResults.find(event => event.result?.changed || event.success) ?? targetResults[0];
          const source = intent?.sourceId === item.id;
          return <button type="button" key={item.id} data-scene-target={item.id} data-target-kind="scene" className={`di-scene-object object-${index} ${can && canAct ? 'is-compatible' : ''} ${selected ? 'is-selected' : ''} ${drag?.over === item.id ? 'is-over' : ''} ${item.changed ? 'is-developed' : ''} ${source ? 'is-enemy' : ''} ${room.phase === 'reveal' && event ? 'has-result' : ''}`}
            aria-label={`${item.name}${item.changed ? ', changed' : ''}${can && canAct ? `, place ${TOKENS.find(item => item.kind === token)?.label}` : ''}`} aria-pressed={selected} onClick={() => choose(token, item.id)}>
            <TargetArtwork target={item} pose={source ? room.phase === 'reveal' ? 'reaction' : 'windup' : 'idle'} />
            <span className="di-object-label">{!selection && room.chapterRound === 1 && item.id === scene.firstTarget && <span aria-label="Suggested first target">✦ </span>}{item.name}{item.changed && <Check size={12} />}</span>
            {selected && <span className="di-object-coin">{selection.token === 'spotlight' ? <Sparkles /> : <TokenArtwork token={selection.token} />}</span>}
            <span className="di-object-teammates">{teammates.map(mate => <span key={mate.userId} title={mate.name}>{mate.token === 'spotlight' ? <Sparkles size={12} /> : <TokenArtwork token={mate.token as IllustratedToken} />}</span>)}</span>
            {teamwork && <span className="di-object-teamwork">+1 teamwork</span>}
            {room.phase === 'reveal' && event && <span className="di-object-result" key={event.id}>{event.success ? <Check size={18} /> : '!'}</span>}
          </button>;
        })}
      </div>
      </>}
      {room.phase === 'reveal' && ownResult && room.status !== 'completed' && <TurnResolution key={ownResult.id} event={ownResult} room={room} now={now} userId={userId} />}
      {joining && <div className="di-stage-notice" role="status"><Users size={20} />Joining next turn. Explore the scene.</div>}
      {!self && !joining && room.status !== 'completed' && <div className="di-stage-notice"><button disabled={loading} onClick={() => void joinRoom(room.code)}>Rejoin the adventure</button></div>}
      {room.status === 'completed' && <div className="di-stage-finale"><Sparkles size={30} /><h2>A story worth telling.</h2>{closing && <><TargetArtwork target={{ id: "closing", artKey: closing.artKey }} /><strong>{closing.caption}</strong></>}<p>{participant?.actions ?? 0} contributions · +{participant?.xp ?? 0} XP</p><button onClick={() => void leaveRoom()} disabled={loading}>Collect your recap</button></div>}
    </div>
    <section className="di-scene-dock" aria-label="Your move" data-phase={room.phase} data-holding={holding}>
      <div className="di-dock-beat"><span>{phaseLabel}</span><span>{room.phase === 'choosing' && canAct ? activeSupport || 'Choose → place → release' : room.phase === 'reveal' ? 'Results saved in Story' : 'Your party moves together'}</span></div>
      {focus && focusAction ? <FocusedActionChoices room={room} action={focusAction} locked={locked} onBack={backToScene} onChange={action => { if (!locked) { setSelection(action); playTableSound('pick'); } }} /> : <div className="di-scene-hand" role="group" aria-label="Action tokens">
        {TOKENS.map(item => <button key={item.kind} data-token={item.kind} className={token === item.kind && selection?.token !== 'spotlight' ? 'is-chosen' : ''} aria-label={`${item.label} token`} aria-pressed={token === item.kind && selection?.token !== 'spotlight'} disabled={locked || (downed && item.kind !== 'assist')}
          onPointerDown={event => startDrag(event, item.kind)} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={() => { gesture.current = null; setDrag(null); suppressClick.current = true; }}
          onClick={() => { if (suppressClick.current) { suppressClick.current = false; return; } setToken(item.kind); setSelection(null); clearProposal(); playTableSound('pick'); setHint(item.kind === 'assist' && victim ? `Place Help on ${victim.character.name} to protect.` : 'Choose a highlighted object.'); }}>
          <TokenArtwork token={item.kind} /><span>{item.label}<small>{handEffects[item.kind]}</small></span>
        </button>)}
        <button className={`di-scene-spark ${selection?.token === 'spotlight' ? 'is-chosen' : ''}`} disabled={locked || spent || downed} onClick={openSpotlight} aria-label="Spotlight idea"><Sparkles size={25} /><span>Spotlight</span></button>
      </div>}
      <div className="di-scene-selection" aria-live="polite"><div><strong>{pending ? 'Move sent · checking receipt' : committed ? 'Ready with your party' : room.phase === 'reveal' ? 'The scene moves forward' : focusedOption?.label ?? compactLabel}</strong><span>{pending ? 'Retry uses the same move and release.' : committed ? 'Watch the scene for everyone’s results.' : room.phase === 'reveal' ? ownResult ? resultLine(ownResult) : 'Your next move is coming up.' : focusedOption ? `${focusAction?.targetKind === 'hero' ? '' : 'On success: '}${approachDetail(room, focusedOption)}` : compactEffect}</span></div><button aria-label="Action details and help" onClick={() => setDrawer('details')}><Info size={20} /></button></div>
      {committed || room.phase === 'reveal' || room.status === 'completed' ? <div className="di-turn-rest">
        <strong role="status">{room.status === 'completed' ? 'A keepsake. A story. Your next adventure.' : room.phase === 'reveal' ? room.outcomes.some(outcome => outcome.chapter === room.chapter) ? 'A chapter closes. The journey continues.' : 'See what your party changed.' : 'Your move is on the table.'}</strong>
        <div className="di-party-readiness" role="status" aria-label="Party readiness">{readyHumans.map(member => <span key={member.actorId} data-ready={room.phase === 'reveal' || !!room.commits[member.actorId]}>{room.phase === 'reveal' || room.commits[member.actorId] ? <Check size={12} /> : <Clock3 size={12} />}{member.actorId === userId ? 'You' : member.character.name}</span>)}</div>
        <small>{room.status === 'completed' ? 'Collect your recap above.' : room.status === 'parked' ? 'Table resting until someone returns.' : room.phase === 'reveal' ? `Next turn in ${seconds}s` : `Resolves when everyone is ready · ${seconds}s left`}</small>
      </div> : pending && canAct ? <button className="di-scene-retry" disabled={loading} onClick={() => void commitAction(pending.action)}>{loading ? 'Checking your move…' : 'Retry same move'}</button> : <TimedRelease key={room.turn} turn={room.turn} deadline={room.deadline} disabled={!selection || !canAct || loading || !!pending || drawer !== null} onCommit={commit} onHoldingChange={setHolding} />}
    </section>
    <nav className="di-scene-tools" aria-label="Adventure tools">
      <button onClick={() => setDrawer('party')}><Users size={18} /><span>Party</span></button>
      <button onClick={() => setDrawer('chat')}><MessageCircle size={18} /><span>Chat</span>{messages.length > seenMessages && <i>{messages.length - seenMessages}</i>}</button>
      <button onClick={() => setDrawer('invite')}><Copy size={18} /><span>Invite</span></button>
      <button aria-label={sound ? 'Mute table sounds' : 'Enable table sounds'} onClick={() => { setSound(!sound); setTableSound(!sound); }}>{sound ? <Volume2 size={18} /> : <VolumeX size={18} />}<span>Sound</span></button>
    </nav>
    {drag && <div className="di-scene-drag" style={{ left: drag.x, top: drag.y } as CSSProperties}><TokenArtwork token={drag.kind} /></div>}
    {drawer && <SceneDrawer title={{ party: 'Your party', chat: 'Table chat', invite: 'Invite a friend', details: 'Your action', spotlight: 'A Spotlight idea', choice: 'Choose your route' }[drawer]} onClose={() => { if (drawer === 'choice') setSelection(null); closeDrawer(); }}>
      {drawer === 'choice' && scene.branch && <><h3>{branchOption?.label}</h3><p>{branchOption?.consequence}</p><p>Everyone chooses this turn. Most Help votes wins; timing and die results do not change your vote. Other actions contribute without voting.</p><p>{scene.branch.fallbackText}</p><button className="di-scene-primary" disabled={!canAct || !branchOption} onClick={() => setDrawer(null)}>Ready this route</button></>}
      {drawer === 'party' && <>{room.seats.map(member => <article className="di-scene-party-detail" key={member.id}><HeroAvatar hero={member.character} /><div><h3>{member.character.name}{member.actorId === userId ? ' · you' : ''}</h3><p>{member.kind === 'companion' ? 'Rules-based companion' : CHARACTER_CLASS_PRESETS[member.character.classKey].label} · {member.hp}/{member.character.maxHp} HP</p><p>{member.hp === 0 ? 'Downed · Help is still available' : member.leaving ? 'Leaving at the boundary' : room.commits[member.actorId] ? 'Move committed' : 'Choosing a move'}</p></div></article>)}<TableReactions room={room} /></>}
      {drawer === 'chat' && chat}
      {drawer === 'invite' && <><p>{room.visibility === 'private' ? 'This is a private friend table. New players need the full invitation.' : 'Friends can join your table through this link.'}</p><input aria-label="Full invitation link" value={invitationUrl(room, window.location.origin)} readOnly onFocus={event => event.target.select()} /><button className="di-scene-primary" onClick={() => void share()}>{copied ? 'Copied!' : 'Copy invitation'}</button></>}
      {drawer === 'details' && <><h3>{focusedOption?.label ?? compactLabel}</h3><p>{focusedOption ? `${focusAction?.targetKind === 'hero' ? 'Guaranteed: ' : 'On success: '}${approachDetail(room, focusedOption)}.` : protect ? 'Protect the threatened hero for 2 damage, or 3 with a great release. The strongest protection wins; it does not stack. No objective progress.' : description?.description ?? 'Choose a token, then an object. Drag it there, or tap both.'}</p>{target && <p>{target.description}</p>}{focusAction && isDuel(room, focusAction) ? <p>Your d20 + {focusModifier} must beat the enemy’s d20 + {room.enemyIntent?.duelModifier}. Ties favor the enemy. All attackers face the same enemy roll. Good timing adds +1 to your total. On a loss, you make some progress but danger rises; the announced attack still resolves against its original victim.</p> : description && <p>Roll + {self?.character.traits[description.trait]} {description.trait}{support?.total ? ` + ${supportText(support)}` : ''}. Total {description.dc}+ succeeds on a d20. With current support: {successChance(0)}% success, or {successChance(1)}% with a good or assisted release.</p>}<h3>A little timing</h3><p>Hold the die and release in the bright zone for +1. An early or late release keeps your normal move. Roll now skips timing. Assisted release earns the same maximum bonus.</p><h3>Help each other</h3><p>Different tokens committed on the same scene object give both players +1. Help can Protect the threatened hero{room.mechanicsVersion === 1 ? ' or Mend a wounded hero' : ''}. Downed heroes can still Help. Insight and opening expire after the following turn; repeated setup takes the strongest bonus rather than stacking.</p><p>Moves resolve together in 30 seconds, or sooner when everyone is ready. The results stay in Story. Leave whenever you need.</p></>}
      {drawer === 'spotlight' && <div className="di-scene-spotlight"><p>Borrow a spark, or use something in the scene. Previewing never spends your token.</p>{spotlightSuggestions(room).map(suggestion => <button key={suggestion.label} disabled={proposing || !canAct} onClick={() => { setIdea(suggestion.idea); setSpotlightTarget(suggestion.targetId); clearProposal(); void propose(suggestion.idea, suggestion.targetId); }}><Sparkles size={17} /><span>{suggestion.label}</span></button>)}<label htmlFor="stage-idea">Your idea</label><textarea id="stage-idea" maxLength={280} value={idea} rows={3} placeholder={spotlightExample(room)} onChange={event => { setIdea(event.target.value); clearProposal(); }} /><label htmlFor="stage-idea-target">Use something in the scene</label><select id="stage-idea-target" value={spotlightTarget} onChange={event => { setSpotlightTarget(event.target.value); clearProposal(); }}>{scene.targets.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select><button className="di-scene-primary" disabled={!idea.trim() || proposing || !canAct} onClick={() => void propose(idea.trim(), spotlightTarget)}>{proposing ? 'Considering…' : 'Preview my idea'}</button>{availableProposal && <div role="status"><h3>{availableProposal.label}</h3><p>{availableProposal.description}</p>{availableProposal.supported ? <button className="di-scene-primary" disabled={!canAct} onClick={chooseSpotlight}>Ready this Spotlight</button> : <p>Your token is safe. Try a normal move or another idea.</p>}</div>}</div>}
    </SceneDrawer>}
  </main>;
}
