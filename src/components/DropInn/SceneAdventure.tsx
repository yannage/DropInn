import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from 'react';
import { useReducedMotion } from 'framer-motion';
import { latestRound, roundCallouts } from '../../lib/dropinn/roundSummary';
import { RoundRecap } from './RoundRecap';
import { ChapterReward } from './ChapterReward';
import { RoundSequence } from './RoundSequence';
import { InspectionBubble } from './InspectionBubble';
import { Narrator } from './Narrator';
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
import { currentTurnResults } from '../../lib/dropinn/turnPresentation';
import { HeroAvatar } from './HeroAvatar';
import { TargetArtwork } from './TargetArtwork';
import { TokenArtwork, type IllustratedToken } from './TokenArtwork';
import { TabletopArtwork } from './TabletopArtwork';
import { TimedRelease } from './TimedRelease';
import { TableReactions } from './TableReactions';
import { playTableSound, tableSoundEnabled, setTableSound } from './tableSound';
import { SceneStageArt } from './SceneStageArt';
import { TurnResolution } from './TurnResolution';
import { FocusedActionStage, FocusedActionChoices } from './FocusedAction';
import { approachDetail, approachOption, approachOptions, isDuel } from '../../lib/dropinn/approaches';
import { contextualActionLabel, derivePlayerGuidance, suggestedTargetIds } from '../../lib/dropinn/playerGuidance';
import './scene-adventure.css';
import './game-feel.css';
import './shared-story.css';
import './tabletop-art.css';
import './player-guidance.css';

const TOKENS: { kind: IllustratedToken; label: string }[] = [
  { kind: 'fight', label: 'Fight' }, { kind: 'influence', label: 'Influence' },
  { kind: 'investigate', label: 'Investigate' }, { kind: 'assist', label: 'Help' },
];
const effects: Record<IllustratedToken, string> = { fight: 'Progress · block 2', influence: 'Progress · ease danger', investigate: 'Progress · next-turn insight', assist: 'Progress · class support' };
const pacedTurnsKey = 'dropinn-paced-turn-results';
function initialPacedTurns() { try { return localStorage.getItem(pacedTurnsKey) !== 'off'; } catch { return true; } }
const firstMoveKey = 'dropinn:first-move-guide:v1';
function initialGuide(): { enabled: boolean; afterResult?: string } {
  try { const saved = JSON.parse(localStorage.getItem(firstMoveKey) ?? 'null'); return { enabled: saved?.enabled !== false, afterResult: typeof saved?.afterResult === 'string' ? saved.afterResult : undefined }; }
  catch { return { enabled: true }; }
}
type Drawer = 'party' | 'chat' | 'invite' | 'details' | 'spotlight' | 'choice' | 'round' | null;

export function SceneDrawer({ title, onClose, children, presentation = 'sheet' }: { title: string; onClose: () => void; children: ReactNode; presentation?: 'sheet' | 'dialog' }) {
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
  return <div className={`di-scene-shade is-${presentation}`} onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className={`di-scene-drawer is-${presentation}`} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={ref}>
      <header><h2>{title}</h2><button onClick={onClose} aria-label={`Close ${title}`}><X size={22} /></button></header>
      <div className="di-scene-drawer-body">{children}</div>
    </div>
  </div>;
}

export function SceneAdventure({ room, chat }: { room: AdventureRoom; chat: ReactNode }) {
  const { userId, loading, leaveRoom, joinRoom, commitAction, pendingMove, propose, proposal, proposing, clearProposal, messages, narration, skipReveal, skippingReveal } = useAdventureStore();
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
  const [pacedTurns, setPacedTurns] = useState(initialPacedTurns);
  const [localSkipId, setLocalSkipId] = useState('');
  const autoSkipAttempt = useRef('');
  useEffect(() => { try { localStorage.setItem(pacedTurnsKey, pacedTurns ? 'on' : 'off'); } catch {/* Optional preference. */} }, [pacedTurns]);
  const [drawer, setDrawer] = useState<Drawer>(null);
  const [storyMode,setStoryMode] = useState<StoryScrollMode>('collapsed');
  useEffect(() => {setStoryMode('collapsed');},[room.id]);
  const [token, setToken] = useState<IllustratedToken>('investigate');
  const [selection, setSelection] = useState<PlayerAction | null>(null);
  const [inspectedId, setInspectedId] = useState<string | null>(null);
  const [armedToken, setArmedToken] = useState(false);
  const [showTokens, setShowTokens] = useState(false);
  const [guide, setGuide] = useState(initialGuide);
  const [focusDismissed, setFocusDismissed] = useState(false);
  const [bubbleVisible, setBubbleVisible] = useState(false);
  const inspected = scene.targets.find(item => item.id === inspectedId);
  const inspectedHero = room.seats.find(member => member.actorId === inspectedId);
  const hasInspection = !!(inspected || inspectedHero);
  const reducedMotion = !!useReducedMotion();
  const lastRound = useMemo(() => latestRound(room), [room.id, room.events, room.outcomes, room.turn, room.chapter, room.phase]);
  const skipVoted = room.revealSkips?.includes(userId) ?? false;
  const revealBypassed = !pacedTurns || skipVoted || (lastRound !== undefined && localSkipId === lastRound.id);
  const partyPayoff = room.phase === 'reveal' && (!lastRound || reducedMotion || revealBypassed || now - lastRound.at >= 1100);
  const revealVoters = room.seats.filter(seat => seat.kind === 'human' && !seat.leaving);
  const canSkipReveal = room.status === 'active' && room.phase === 'reveal' && revealVoters.some(seat => seat.actorId === userId);
  useEffect(() => {
    if (pacedTurns || !canSkipReveal || skipVoted || skippingReveal || !lastRound) return;
    if (autoSkipAttempt.current === lastRound.id) return;
    autoSkipAttempt.current = lastRound.id;
    void skipReveal();
  }, [pacedTurns, canSkipReveal, skipVoted, skippingReveal, lastRound?.id, skipReveal]);
  const callouts = lastRound ? roundCallouts(lastRound) : [];
  const calloutIndex = lastRound ? Math.floor((now - lastRound.at - 1100) / 1200) : -1;
  const callout = room.phase === 'reveal' && partyPayoff && calloutIndex >= 0 ? callouts[calloutIndex] : undefined;
  const [holding, setHolding] = useState(false);
  const [idea, setIdea] = useState('');
  const [spotlightTarget, setSpotlightTarget] = useState(scene.targets[0]?.id ?? '');
  const [copied, setCopied] = useState(false);
  const [sound, setSound] = useState(tableSoundEnabled);
  const [seenMessages, setSeenMessages] = useState(messages.length);
  const [hint, setHint] = useState('Choose a highlighted object.');
  const [drag, setDrag] = useState<{ kind: IllustratedToken; x: number; y: number; over: string | null } | null>(null);
  const gesture = useRef<{ id: number; kind: IllustratedToken; x: number; y: number; moving: boolean } | null>(null);
  const suppressClick = useRef(false);
  const stage = useRef<HTMLDivElement>(null);
  const [threatPath, setThreatPath] = useState<{ width: number; height: number; path: string } | null>(null);
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 100); return () => window.clearInterval(timer); }, []);
  useEffect(() => {
    setSelection(null); setInspectedId(null); setArmedToken(false); setShowTokens(false); setFocusDismissed(false); setHolding(false); setDrag(null); gesture.current = null;
    setIdea(''); setSpotlightTarget(scene.targets[0]?.id ?? ''); clearProposal(); setDrawer(current => current === 'spotlight' || current === 'choice' ? null : current);
    setHint('Choose a highlighted object.');
  }, [room.turn, clearProposal]);
  useEffect(() => { setInspectedId(null); setArmedToken(false); }, [room.phase]);
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
  }, [room.chapter, intent?.targetActorId, intent?.sourceId, intent?.turn, partyPayoff, inspectedId, selection?.targetId]);
  const locked = !canAct || loading || holding || !!pending;
  const target = scene.targets.find(target => target.id === selection?.targetId);
  const protect = selection?.targetKind === 'hero';
  const downed = self?.hp === 0;
  const seconds = Math.max(0, Math.ceil((((room.phase === 'reveal' ? room.revealUntil : room.deadline) ?? room.deadline) - now) / 1000));
  const results = currentTurnResults(room);
  const strike = results.find(event => event.turn === room.turn && event.result?.targetKind === 'hero' && event.result.targetId === intent?.targetActorId && event.result.damage !== undefined)?.result;
  const threatLabel = room.phase === 'reveal' ? strike ? strike.damage ? 'The strike lands' : 'Attack blocked' : 'Strike averted' : `${victim?.actorId === userId ? 'You are' : `${victim?.character.name} is`} in danger`;
  const ownResult = results.find(event => event.actorId === userId && (event.contribution || event.roll !== undefined));
  useEffect(() => {
    if (guide.enabled && ownResult && ownResult.id !== guide.afterResult) setGuide({ enabled: false });
  }, [ownResult?.id, guide.enabled, guide.afterResult]);
  useEffect(() => { try { localStorage.setItem(firstMoveKey, JSON.stringify(guide)); } catch { /* Guidance remains available without storage. */ } }, [guide]);
  const guidance = derivePlayerGuidance({ room, userId, now, selection, inspectedId, pending, armedToken: armedToken ? token : null, holding });
  const suggestedIds = guide.enabled && guidance.state === 'target' ? suggestedTargetIds(room, userId) : [];
  const coachVisible = guide.enabled && ['target', 'armed'].includes(guidance.state);
  const ownConsequence = lastRound?.entries.find(entry => entry.actorId === userId && entry.kind === 'action');
  const support = selection && !protect ? rollSupport(room, userId, selection) : null;
  const description = selection && self && !protect ? describeAction(self.character.classKey, selection.token, selection.targetId, room) : null;
  const successChance = (bonus: number) => description && self ? Math.max(0, Math.min(20, 21 + self.character.traits[description.trait] + (support?.total ?? 0) + bonus - description.dc)) * 5 : null;
  const availableProposal = proposal?.turn === room.turn && proposal.idea === idea.trim() && proposal.targetId === spotlightTarget ? proposal : null;
  const spent = participant?.spotlightChapters.includes(room.chapter) ?? false;
  const canPlace = (kind: IllustratedToken, id: string, type = 'scene') => {
    if (downed && kind !== 'assist') return false;
    return type === 'hero' ? kind === 'assist' && (intent?.targetActorId === id || (room.mechanicsVersion === 1 && room.seats.some(member => member.actorId === id && !member.leaving && member.hp < member.character.maxHp))) : !!scene.targets.find(target => target.id === id)?.tokens.includes(kind);
  };
  const choose = (kind: IllustratedToken, id: string, type: 'scene' | 'hero' = 'scene', approach?: PlayerAction['approach']) => {
    if (locked) return;
    if (type === 'hero' && approach === 'mend' && room.seats.find(member => member.actorId === id)?.leaving) return;
    if (!canPlace(kind, id, type)) { setHint(type === 'hero' ? 'Use Help to protect the threatened hero.' : 'Try a highlighted object, or choose another token.'); return; }
    const action: PlayerAction = { token: kind, targetId: id, targetKind: type };
    if (type === 'hero') { if (approach === 'mend' || intent?.targetActorId !== id) action.approach = 'mend'; }
    else action.approach = approachOptions(room, action)[0]?.id;
    setToken(kind); setInspectedId(null); setArmedToken(false); setShowTokens(false); setFocusDismissed(false); setSelection(action); clearProposal();
    if (branchOpen && kind === 'assist' && type === 'scene' && scene.branch?.options.some(option => option.targetId === id)) setDrawer('choice');
    setHint('Release the die to commit. Good timing adds a bonus.'); playTableSound('place');
  };
  const inspect = (id: string) => {
    if (holding || drag) return;
    if (id !== inspectedId) playTableSound('pick');
    setInspectedId(id); setArmedToken(false); setShowTokens(false);
    if (!locked) { setSelection(null); clearProposal(); }
  };
  const dismissInspection = (restore = false) => {
    const id = inspectedId; setInspectedId(null); setArmedToken(false);
    if (restore) requestAnimationFrame(() => Array.from(stage.current?.querySelectorAll<HTMLElement>('[data-scene-target]') ?? []).find(node => node.dataset.sceneTarget === id)?.focus());
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
  const focus = !focusDismissed && !hasInspection && !partyPayoff && !!self && room.mechanicsVersion === 1 && !!focusAction && (focusAction.approach !== undefined || focusAction.targetKind === 'hero');
  const focusedOption = focusAction ? approachOption(room, focusAction) : undefined;
  const focusDescription = focusAction && self ? describeAction(self.character.classKey, focusAction.token, focusAction.targetId, room) : null;
  const focusModifier = self && focusDescription && focusAction ? self.character.traits[focusDescription.trait] + rollSupport(room, userId, focusAction).total + (focusedOption?.modifier ?? 0) : 0;
  const backToScene = () => {
    if (holding || drag) return;
    const id = focusAction?.targetId;
    if (!locked) setSelection(null);
    setFocusDismissed(true); setInspectedId(null); setArmedToken(false);
    requestAnimationFrame(() => { Array.from(stage.current?.querySelectorAll<HTMLElement>('[data-scene-target]') ?? []).find(node => node.dataset.sceneTarget === id)?.focus(); });
  };
  useEffect(() => {
    if (selection && !locked && !hasInspection) document.querySelector<HTMLElement>(focus ? '.di-focus-choices button[aria-pressed="true"]' : '.di-focus-hold')?.focus();
  }, [focus, selection?.targetId, selection?.token]);
  const compactLabel = focusAction ? contextualActionLabel(room, focusAction) : 'Your move';
  const helpEffect = self ? { fighter: 'Progress · cover', rogue: 'Progress · next-turn opening', wizard: 'Progress · next-turn insight', cleric: 'Progress · heal up to 4' }[self.character.classKey] : effects.assist;
  const readyHumans = room.seats.filter(member => member.kind === 'human' && !member.leaving);
  const handEffects: Record<IllustratedToken, string> = { fight: scene.combat ? 'Attack or guard' : 'Clear the way', influence: 'Reassure or distract', investigate: 'Discover or prepare', assist: downed ? 'You can still help' : 'Support your party' };
  const compactEffect = branchOption ? 'Your route vote counts even if the roll misses.' : protect ? 'Block 2 · great release blocks 3' : selection?.token === 'spotlight' ? `On success: ${selection.proposal?.effect}` : selection ? selection.token === 'assist' ? helpEffect : selection.token === 'fight' && !scene.combat ? 'Progress · clear the way' : effects[selection.token as IllustratedToken] : '';
  const openSpotlight = () => { if (holding || pending || !canAct || downed || spent) return; setDrawer('spotlight'); setSpotlightTarget(inspected?.id ?? target?.id ?? scene.targets[0].id); setIdea(''); clearProposal(); };
  const closeDrawer = () => { setDrawer(null); if (drawer === 'spotlight') { clearProposal(); setIdea(''); } };
  const chooseSpotlight = () => {
    if (!availableProposal?.supported || !canAct) return;
    setInspectedId(null); setArmedToken(false); setSelection({ token: 'spotlight', targetKind: 'scene', targetId: availableProposal.targetId, proposal: availableProposal }); setDrawer(null);
  };
  const share = async () => { try { await navigator.clipboard.writeText(invitationUrl(room, window.location.origin)); setCopied(true); } catch { setCopied(false); } };
  const skipRound = () => { if (!lastRound) return; setLocalSkipId(lastRound.id); if (canSkipReveal && !skipVoted) void skipReveal(); };
  const clockLabel = room.status === 'completed' ? 'Complete' : room.status === 'parked' ? 'Paused'
    : room.phase === 'reveal' ? room.outcomes.some(outcome => outcome.chapter === room.chapter) ? 'Next chapter in' : 'Next round in'
      : guidance.state === 'pending' ? 'Checking move' : seconds === 0 ? 'Resolving'
        : ['committed', 'joining', 'leaving', 'unseated'].includes(guidance.state) ? 'Resolves within' : 'Choose within';
  return <main className={`di-theater di-guided-table ${bubbleVisible ? 'has-inspection-bubble' : ''}`} aria-label="Adventure table" data-completed={room.status === 'completed'} onKeyDown={event => { if (event.key === 'Escape' && !drawer && storyMode === 'collapsed') { if (hasInspection) { event.preventDefault(); dismissInspection(true); } else if (focus) { event.preventDefault(); backToScene(); } } }}>
    <header className="di-stage-header">
      <div className="di-stage-header-left">
      <button aria-label={room.status === 'completed' ? 'Back to the inn' : 'Leave & save'} disabled={loading || holding} onClick={() => void leaveRoom()}><ArrowLeft size={20} /><span>Leave</span></button>
      <StoryScroll key={room.id} room={room} userId={userId} mode={storyMode} onMode={setStoryMode} suspended={drawer!==null} locked={holding || !!drag} seconds={seconds} narration={narration?.turn===room.turn ? narration.text : undefined}/>
      </div>
      <div className="di-stage-chapters" aria-label={`Chapter ${room.chapter + 1} of ${CHAPTERS.length}`}>
        {CHAPTERS.map((chapter, index) => <span key={chapter.id} className={index === room.chapter ? 'current' : index < room.chapter ? 'done' : ''} title={chapter.title}>{index < room.chapter ? <Check size={12} /> : index + 1}</span>)}
      </div>
      <span className={`di-stage-clock ${seconds <= 8 && room.phase === 'choosing' && canAct && !pending ? 'urgent' : ''}`} role="timer" aria-label={`${clockLabel}${room.status === 'active' ? `: ${seconds} seconds` : ''}`}><small>{clockLabel}</small><Clock3 size={14} />{room.status === 'active' ? `${seconds}s` : '—'}</span>
    </header>
    <div className="di-stage-objective"><strong><span className="di-goal-label">Your shared goal</span>{room.status === 'completed' ? 'You made a little legend.' : scene.objective}</strong><Narrator key={room.id} room={room} pacedTurns={pacedTurns} onPacedTurns={setPacedTurns} suppressCue={room.phase === 'reveal' && revealBypassed} /><div className="di-objective-progress"><div className="di-chapter-meter"><span>Chapter progress <b>{Number(room.progress.toFixed(1))} / {scene.progressGoal}</b></span><div role="progressbar" aria-label="Chapter progress" aria-valuenow={Math.round(Math.min(100, room.progress / scene.progressGoal * 100))} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${Math.min(100, room.progress / scene.progressGoal * 100)}%` }} /></div></div><span className="di-danger-details" aria-label={`Danger ${room.danger}`}><Flame size={12} />Danger {Number(room.danger.toFixed(1))}</span></div></div>
    <div className={`di-scene-stage di-stage-${scene.art} ${scene.combat ? 'di-stage-combat' : ''} ${room.phase === 'reveal' ? 'is-resolving' : ''} ${holding ? 'is-charging' : ''} ${focus ? 'is-focused' : ''}`} ref={stage} onClick={event => { if (inspected && !(event.target as HTMLElement).closest('[data-scene-target],button')) dismissInspection(); }}>
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
            aria-label={`${member.character.name}${member.actorId === userId ? ', you' : ''}, ${member.hp} HP${member.kind === 'companion' ? ', companion' : ''}${threatened ? ', threatened: Help to protect' : room.mechanicsVersion === 1 && member.hp < member.character.maxHp ? ', wounded: Help to heal' : ', party details'}`} onClick={() => canPlace('assist', member.actorId, 'hero') ? armedToken && token === 'assist' && !locked ? choose('assist', member.actorId, 'hero') : inspect(member.actorId) : setDrawer('party')}>
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
          return <button type="button" key={item.id} data-scene-target={item.id} data-target-kind="scene" className={`di-scene-object object-${index} ${can && canAct && armedToken ? 'is-compatible' : ''} ${selected || inspectedId === item.id ? 'is-selected' : ''} ${suggestedIds.includes(item.id) ? 'is-suggested' : ''} ${drag?.over === item.id ? 'is-over' : ''} ${item.changed ? 'is-developed' : ''} ${source ? 'is-enemy' : ''} ${room.phase === 'reveal' && event ? 'has-result' : ''}`}
            aria-label={`${item.name}${item.changed ? ', changed' : ''}${can && canAct && armedToken ? `, place ${TOKENS.find(item => item.kind === token)?.label}` : ', inspect'}`} aria-pressed={selected || inspectedId === item.id} aria-expanded={inspectedId === item.id} onClick={() => armedToken && can && !locked ? choose(token, item.id) : inspect(item.id)}>
            <TargetArtwork target={item} pose={source ? room.phase === 'reveal' ? 'reaction' : 'windup' : 'idle'} />
            {suggestedIds.includes(item.id) && <span className="di-start-here">{branchOpen ? 'Explore this route' : 'Start here'}</span>}
            <span className="di-object-label">{item.name}{item.changed && <Check size={12} />}</span>
            {selected && selection && <span className="di-object-coin">{selection.token === 'spotlight' ? <TabletopArtwork kind="spotlight" /> : <TokenArtwork token={selection.token} />}</span>}
            <span className="di-object-teammates">{teammates.map(mate => <span key={mate.userId} title={mate.name}>{mate.token === 'spotlight' ? <Sparkles size={12} /> : <TokenArtwork token={mate.token as IllustratedToken} />}</span>)}</span>
            {teamwork && <span className="di-object-teamwork">+1 teamwork</span>}
            {inspectedId === item.id && <InspectionBubble text={item.context ?? item.description} onVisible={setBubbleVisible} />}
            {callout?.targetId === item.id && <span className="di-story-callout" key={`${lastRound?.id}:${callout.targetId}`} aria-hidden="true">{callout.text}</span>}
            {room.phase === 'reveal' && event && <span className="di-object-result" key={event.id}>{event.success ? <Check size={18} /> : '!'}</span>}
          </button>;
        })}
      </div>
      </>}
      {room.phase === 'reveal' && !partyPayoff && ownResult && room.status !== 'completed' && <TurnResolution key={ownResult.id} event={ownResult} room={room} now={now} userId={userId} announce={false} />}
      {joining && <div className="di-stage-notice" role="status"><Users size={20} />Joining next turn. Explore the scene.</div>}
      {!self && !joining && room.status !== 'completed' && <div className="di-stage-notice"><button disabled={loading} onClick={() => void joinRoom(room.code)}>Rejoin the adventure</button></div>}
      {room.status === 'completed' && <div className="di-stage-finale"><Sparkles size={30} /><h2>A story worth telling.</h2>{closing && <><TargetArtwork target={{ id: "closing", artKey: closing.artKey }} /><strong>{closing.caption}</strong></>}<p>{participant?.actions ?? 0} contributions · +{participant?.xp ?? 0} XP</p><button onClick={() => void leaveRoom()} disabled={loading}>Collect your recap</button></div>}
    </div>
    <section className={`di-scene-dock ${hasInspection ? 'is-inspecting' : ''} ${selection || focus ? 'has-action' : ''}`} aria-label="Your move" data-phase={room.phase} data-holding={holding}>
      <div className="di-player-guidance" data-state={guidance.state}>
        <div className="di-guidance-heading"><div className="di-guidance-copy"><strong role="status">{guidance.title}</strong><p>{guidance.state === 'armed' ? hint : branchOpen && guidance.state === 'target' ? scene.branch!.prompt : guidance.detail}</p></div><div className="di-guidance-controls">
          {!hasInspection && !selection && !focus && canAct && !pending && <button className="di-token-toggle" disabled={holding || loading} aria-expanded={showTokens} aria-controls="adventure-token-hand" onClick={() => { setShowTokens(!showTokens); setArmedToken(false); }}>{showTokens ? 'Hide tokens' : 'Show tokens'}</button>}
          <button aria-label="Action details and help" disabled={!!drag} onClick={() => setDrawer('details')}><Info size={20} /></button>
        </div></div>
        {coachVisible && <div className="di-first-move-guide"><ol aria-label="Your move, step by step">{[['target', 'Explore'], ['move', 'Choose'], ['commit', 'Release'], ['results', 'Results']].map(([step, label], index) => <li key={step} aria-current={guidance.activeStep === step ? 'step' : undefined}><span>{index + 1}</span>{label}</li>)}</ol><button aria-label="Dismiss first-move guide" onClick={() => setGuide({ enabled: false })}><X size={16} /></button></div>}
      </div>
      {room.phase === 'reveal' && lastRound ? <div className="di-reveal-content" tabIndex={0} role="region" aria-label="Round results">
        {ownConsequence && <div className="di-your-consequence"><strong>Your move</strong><p>{ownConsequence.text}</p>{ownConsequence.consequence && ownConsequence.consequence !== ownConsequence.text && <span>{ownConsequence.consequence}</span>}</div>}
        <RoundSequence summary={lastRound} now={now} bypass={revealBypassed} skipped={skipVoted} skipping={skippingReveal} canVote={canSkipReveal} skipCount={revealVoters.filter(seat => room.revealSkips?.includes(seat.actorId)).length} playerCount={revealVoters.length} onSkip={skipRound}/>{room.outcomes.some(outcome => outcome.chapter === room.chapter) && <ChapterReward room={room}/>}</div> : <>
      {inspected && <div className="di-inspection-context"><div><strong>{inspected.name}</strong><p>{inspected.context ?? inspected.description}</p></div><button aria-label="Close inspection" onClick={() => dismissInspection(true)}><X size={18}/></button></div>}
      {inspectedHero && <div className="di-inspection-context"><div><strong>{inspectedHero.character.name}</strong><p>{intent?.targetActorId === inspectedHero.actorId ? `Faces ${intent.baseDamage} damage this round. Protect them or tend their wounds.` : `${inspectedHero.hp} / ${inspectedHero.character.maxHp} HP. Help them recover.`}</p></div><button aria-label="Close inspection" onClick={() => dismissInspection(true)}><X size={18}/></button></div>}
      {inspectedHero ? <div className="di-context-moves" role="group" aria-label="Moves for this hero">
        {intent?.targetActorId === inspectedHero.actorId && <button disabled={locked} onClick={() => choose('assist', inspectedHero.actorId, 'hero')}><TokenArtwork token="assist"/><span><strong>Protect {inspectedHero.character.name}</strong><small>Help · block 2, or 3 with good timing</small></span></button>}
        {room.mechanicsVersion === 1 && !inspectedHero.leaving && inspectedHero.hp < inspectedHero.character.maxHp && <button disabled={locked} onClick={() => choose('assist', inspectedHero.actorId, 'hero', 'mend')}><TokenArtwork token="assist"/><span><strong>Mend {inspectedHero.character.name}</strong><small>Help · heal 2, or 3 with good timing</small></span></button>}
      </div> : inspected ? <div className="di-context-moves" role="group" aria-label="Moves for this target">{TOKENS.filter(item => inspected.tokens.includes(item.kind)).map(item => <button key={item.kind} aria-label={`${item.label}: ${inspected.actionCues?.[item.kind] ?? inspected.name}`} disabled={locked || !canPlace(item.kind, inspected.id)} onClick={() => choose(item.kind, inspected.id)}><TokenArtwork token={item.kind}/><span><strong>{inspected.actionCues?.[item.kind] ?? item.label}</strong><small>{item.label}</small></span></button>)}<button className="di-context-spotlight" disabled={locked || spent || downed} onClick={openSpotlight}><TabletopArtwork kind="spotlight"/><span>Spotlight</span></button></div> : focus && focusAction ? <FocusedActionChoices room={room} action={focusAction} locked={locked} backLocked={holding || !!drag} onBack={backToScene} onChange={action => { if (!locked) { setSelection(action); playTableSound('pick'); } }} /> : showTokens && !selection ? <div id="adventure-token-hand" className="di-scene-hand" role="group" aria-label="Action tokens">
        {TOKENS.map(item => <button key={item.kind} data-token={item.kind} className={armedToken && token === item.kind ? 'is-chosen' : ''} aria-label={`${item.label} token`} aria-pressed={armedToken && token === item.kind} disabled={locked || (downed && item.kind !== 'assist')}
          onPointerDown={event => startDrag(event, item.kind)} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={() => { gesture.current = null; setDrag(null); suppressClick.current = true; }}
          onClick={() => { if (suppressClick.current) { suppressClick.current = false; return; } setToken(item.kind); setArmedToken(true); setSelection(null); clearProposal(); playTableSound('pick'); setHint(item.kind === 'assist' && victim ? `Place Help on ${victim.character.name} to protect.` : 'Choose a highlighted object.'); }}>
          <TokenArtwork token={item.kind} /><span>{item.label}<small>{handEffects[item.kind]}</small></span>
        </button>)}
        <button className="di-scene-spark" disabled={locked || spent || downed} onClick={openSpotlight} aria-label="Spotlight idea"><TabletopArtwork kind="spotlight" /><span>Spotlight</span></button>
      </div> : null}
      {focusAction && !hasInspection && !committed && <div className="di-scene-selection" aria-live="polite"><TabletopArtwork kind="dice" /><div><strong>{compactLabel}</strong><span>{pending ? 'Retry keeps this exact move and release.' : focusedOption ? `${focusedOption.label} · ${focusAction?.targetKind === 'hero' ? '' : 'On success: '}${approachDetail(room, focusedOption)}` : compactEffect}{!pending && support?.total ? ` · ${supportText(support)}` : ''}</span></div>{!focus && selection && <button className="di-change-move" disabled={locked} onClick={() => inspect(selection.targetId)}>Change move</button>}</div>}
      {committed || room.phase === 'reveal' || room.status === 'completed' ? <div className="di-turn-rest">
        <strong role="status">{room.status === 'completed' ? 'A keepsake. A story. Your next adventure.' : room.phase === 'reveal' ? room.outcomes.some(outcome => outcome.chapter === room.chapter) ? 'A chapter closes. The journey continues.' : 'See what your party changed.' : 'Your move is on the table.'}</strong>
        <div className="di-party-readiness" role="status" aria-label="Party readiness">{readyHumans.map(member => <span key={member.actorId} data-ready={room.phase === 'reveal' || !!room.commits[member.actorId]}>{room.phase === 'reveal' || room.commits[member.actorId] ? <Check size={12} /> : <Clock3 size={12} />}{member.actorId === userId ? 'You' : member.character.name}</span>)}</div>
        <small>{room.status === 'completed' ? 'Collect your recap above.' : room.status === 'parked' ? 'Table resting until someone returns.' : room.phase === 'reveal' ? `${revealVoters.filter(seat => room.revealSkips?.includes(seat.actorId)).length} of ${revealVoters.length} ready · Next turn in ${seconds}s` : `Resolves when everyone is ready · ${seconds}s left`}</small>
      </div> : pending && canAct ? <button className="di-scene-retry" disabled={loading} onClick={() => void commitAction(pending.action)}>{loading ? 'Checking your move…' : 'Retry same move'}</button> : selection ? <TimedRelease key={room.turn} turn={room.turn} deadline={room.deadline} disabled={!canAct || loading || !!pending || drawer !== null} onCommit={commit} onHoldingChange={setHolding} /> : null}
      </>}
    </section>
    <nav className="di-scene-tools" aria-label="Adventure tools">
      {lastRound && <button className="di-last-round" aria-label="Last round" onClick={() => setDrawer('round')} disabled={holding || !!drag}><TabletopArtwork kind="journal" /><span>Last round</span></button>}
      <button onClick={() => setDrawer('party')}><Users size={18} /><span>Party</span></button>
      <button onClick={() => setDrawer('chat')}><MessageCircle size={18} /><span>Chat</span>{messages.length > seenMessages && <i>{messages.length - seenMessages}</i>}</button>
      <button onClick={() => setDrawer('invite')}><Copy size={18} /><span>Invite</span></button>
      <button aria-label={sound ? 'Mute table sounds' : 'Enable table sounds'} onClick={() => { setSound(!sound); setTableSound(!sound); }}>{sound ? <Volume2 size={18} /> : <VolumeX size={18} />}<span>Sound</span></button>
    </nav>
    {drag && <div className="di-scene-drag" style={{ left: drag.x, top: drag.y } as CSSProperties}><TokenArtwork token={drag.kind} /></div>}
    {drawer && <SceneDrawer title={{ party: 'Your party', chat: 'Table chat', invite: 'Invite a friend', details: 'Your action', spotlight: 'A Spotlight idea', choice: 'Choose your route', round: 'Last round' }[drawer]} onClose={() => { if (drawer === 'choice') setSelection(null); closeDrawer(); }}>
      {drawer === 'round' && lastRound && <RoundRecap summary={lastRound} />}
      {drawer === 'choice' && scene.branch && <><h3>{branchOption?.label}</h3><p>{branchOption?.consequence}</p><p>Everyone chooses this turn. Most Help votes wins; timing and die results do not change your vote. Other actions contribute without voting.</p><p>{scene.branch.fallbackText}</p><button className="di-scene-primary" disabled={!canAct || !branchOption} onClick={() => setDrawer(null)}>Ready this route</button></>}
      {drawer === 'party' && <>{room.seats.map(member => <article className="di-scene-party-detail" key={member.id}><HeroAvatar hero={member.character} /><div><h3>{member.character.name}{member.actorId === userId ? ' · you' : ''}</h3><p>{member.kind === 'companion' ? 'Rules-based companion' : CHARACTER_CLASS_PRESETS[member.character.classKey].label} · {member.hp}/{member.character.maxHp} HP</p><p>{member.hp === 0 ? 'Downed · Help is still available' : member.leaving ? 'Leaving at the boundary' : room.commits[member.actorId] ? 'Move committed' : 'Choosing a move'}</p></div></article>)}<TableReactions room={room} /></>}
      {drawer === 'chat' && chat}
      {drawer === 'invite' && <><p>{room.visibility === 'private' ? 'This is a private friend table. New players need the full invitation.' : 'Friends can join your table through this link.'}</p><input aria-label="Full invitation link" value={invitationUrl(room, window.location.origin)} readOnly onFocus={event => event.target.select()} /><button className="di-scene-primary" onClick={() => void share()}>{copied ? 'Copied!' : 'Copy invitation'}</button></>}
      {drawer === 'details' && <>
        <h3>Your shared goal</h3><p>{scene.objective} Build shared progress to finish this chapter. The chapter also ends after ten rounds, with an outcome shaped by the party’s progress.</p>
        <p>Danger makes enemy attacks stronger in combat. Protecting or healing helps your party survive, but adds no chapter progress.</p>
        <h3>{compactLabel}</h3><p>{focusedOption ? `${focusedOption.label}. ${focusAction?.targetKind === 'hero' ? 'Guaranteed: ' : 'On success: '}${approachDetail(room, focusedOption)}.` : protect ? 'Protect the threatened hero for 2 damage, or 3 with a great release. The strongest protection wins; it does not stack. No objective progress.' : description?.description ?? 'Tap something in the scene, choose how to help, then hold and release the die to commit. Choosing a move does not send it. Show tokens offers token-first play and dragging.'}</p>
        {target && <p>{target.description}</p>}
        {focusAction && isDuel(room, focusAction) ? <p>Your d20 + {focusModifier} must beat the enemy’s d20 + {room.enemyIntent?.duelModifier}. Ties favor the enemy. All attackers face the same enemy roll. Good timing adds +1 to your total. On a loss, you make some progress but danger rises; the announced attack still resolves against its original victim.</p> : description && <p>Roll + {self?.character.traits[description.trait]} {description.trait}{support?.total ? ` + ${supportText(support)}` : ''}. Total {description.dc}+ succeeds on a d20. With current support: {successChance(0)}% success, or {successChance(1)}% with a good or assisted release.</p>}
        <h3>Release to commit</h3><p>Hold the die and release in the bright zone for +1. An early or late release keeps your normal move. Roll now skips timing. Assisted release earns the same maximum bonus.</p>
        <h3>Help each other</h3><p>Different tokens committed on the same scene object give both players +1. Help can Protect the threatened hero{room.mechanicsVersion === 1 ? ' or Mend a wounded hero' : ''}. Downed heroes can still Help. Insight and opening expire after the following turn; repeated setup takes the strongest bonus rather than stacking.</p>
        <p>Everyone chooses at the same time. The round resolves when everyone commits, or after 30 seconds. The results stay in Story. Leave whenever you need.</p>
        <button className="di-scene-primary" onClick={() => { setGuide({ enabled: true, afterResult: ownResult?.id }); setDrawer(null); }}>Replay first-move guide</button>
      </>}
      {drawer === 'spotlight' && <div className="di-scene-spotlight"><p>Borrow a spark, or use something in the scene. Previewing never spends your token.</p>{spotlightSuggestions(room).map(suggestion => <button key={suggestion.label} disabled={proposing || !canAct} onClick={() => { setIdea(suggestion.idea); setSpotlightTarget(suggestion.targetId); clearProposal(); void propose(suggestion.idea, suggestion.targetId); }}><Sparkles size={17} /><span>{suggestion.label}</span></button>)}<label htmlFor="stage-idea">Your idea</label><textarea id="stage-idea" maxLength={280} value={idea} rows={3} placeholder={spotlightExample(room)} onChange={event => { setIdea(event.target.value); clearProposal(); }} /><label htmlFor="stage-idea-target">Use something in the scene</label><select id="stage-idea-target" value={spotlightTarget} onChange={event => { setSpotlightTarget(event.target.value); clearProposal(); }}>{scene.targets.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select><button className="di-scene-primary" disabled={!idea.trim() || proposing || !canAct} onClick={() => void propose(idea.trim(), spotlightTarget)}>{proposing ? 'Considering…' : 'Preview my idea'}</button>{availableProposal && <div role="status"><h3>{availableProposal.label}</h3><p>{availableProposal.description}</p>{availableProposal.supported ? <button className="di-scene-primary" disabled={!canAct} onClick={chooseSpotlight}>Ready this Spotlight</button> : <p>Your token is safe. Try a normal move or another idea.</p>}</div>}</div>}
    </SceneDrawer>}
  </main>;
}
