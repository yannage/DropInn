import { TabletopArtwork } from './TabletopArtwork';
import { NarratorDownload } from './NarratorDownload';
import { SupporterShop } from './SupporterShop';
import { MerchTeaser } from '../Merch/Merch';
import './tabletop-art.css';
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  Clock3,
  Compass,
  Copy,
  Dices,
  DoorOpen,
  Flag,
  Flame,
  Heart,
  Lightbulb,
  LoaderCircle,
  MessageCircle,
  Search,
  Send,
  Shield,
  Sparkles,
  Star,
  Swords,
  Users,
  Volume2,
  VolumeX,
  WandSparkles,
  X,
} from 'lucide-react';
import { useAdventureStore } from '../../store/adventureStore';
import { ADVENTURES, DEFAULT_ADVENTURE, chaptersFor } from '../../lib/dropinn/registry';
import {
  CHARACTER_CLASS_PRESETS,
  heroAccent,
} from '../../lib/character';
import type {
  AdventureRoom,
  RoomSummary,
  VisitRecap,
} from '../../lib/dropinn/types';
import { SceneArt } from './SceneArt';
import { KeepsakeArtwork } from './KeepsakeArtwork';
import { SceneAdventure, SceneDrawer } from './SceneAdventure';
import { HeroAvatar, HeroHatPreview, type AvatarHero } from './HeroAvatar';
import { HeroCustomizer } from './HeroCustomizer';
import { hatForKeepsake } from '../../lib/cosmetics';
import { AccountPanel, SaveStatus } from './AccountPanel';
import { localPlay } from '../../lib/dropinn/api';
import { getSupabaseClient } from '../../lib/supabase/client';
import { CollectionGoal, DiscoveryJournal } from './Collection';
import { threadBalance } from '../../lib/dropinn/collection';
import { CustomizeHeroContext, useCustomizeHero, NextLook, StoryRewards, type HeroCustomizerTarget } from './HeroProgression';
import './mobile-layout.css';
import './lobby-clarity.css';

function HeroMark({
  hero,
  small = false,
}: {
  hero: AvatarHero;
  small?: boolean;
}) {
  const accent = heroAccent(hero.accent, hero.classKey);
  return (
    <span
      className={`di-hero-mark ${small ? 'di-small' : ''} di-class-${hero.classKey}`}
      style={{ color: accent, borderColor: `${accent}80`, background: `radial-gradient(circle at 30% 20%, ${accent}44, ${accent}12)` }}
      aria-hidden="true"
    >
      <HeroAvatar hero={hero} decorative />
    </span>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeRef.current();
      if (event.key !== 'Tab') return;
      const items = Array.from(
        ref.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input, textarea, select, summary, a[href], [tabindex="0"]',
        ) ?? [],
      );
      const first = items[0];
      const last = items[items.length - 1];
      if (
        event.shiftKey &&
        (document.activeElement === first ||
          document.activeElement === ref.current)
      ) {
        event.preventDefault();
        last?.focus();
      }
      if (
        !event.shiftKey &&
        (document.activeElement === last ||
          document.activeElement === ref.current)
      ) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = oldOverflow;
      previous?.focus();
    };
  }, []);
  return (
    <div
      className="di-modal-shade"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="di-modal"
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
      >
        <button
          className="di-icon-button di-modal-close"
          aria-label="Close"
          onClick={onClose}
        >
          <X size={20} />
        </button>
        {children}
      </div>
    </div>
  );
}

function Recap({ recap, onClose }: { recap: VisitRecap; onClose: () => void }) {
  const CHAPTERS = chaptersFor(recap);
  const openHero = useCustomizeHero();
  const [newHats] = useState(() => useAdventureStore.getState().newRewardHats[`${recap.code}:${recap.characterId}`] ?? []);
  const rewardHats = recap.keepsakes.flatMap(item => { const hat = hatForKeepsake(item); return hat ? [hat] : []; });
  const markRecapSeen = useAdventureStore(state => state.markRecapSeen);
  const joinRoom = useAdventureStore(state => state.joinRoom);
  const loading = useAdventureStore(state => state.loading);
  const [returnError, setReturnError] = useState<string | null>(null);
  useEffect(() => { markRecapSeen(recap); }, [recap.code, recap.characterId, recap.outcomes.length, markRecapSeen]);
  return (
    <Modal title="Your adventure recap" onClose={onClose}>
      <span className="di-recap-seal">
        <Star size={32} />
      </span>
      <p className="di-eyebrow">A little time, well spent</p>
      <h2>You made a difference.</h2>
      <p className="di-muted">Your visit to {recap.title}</p>
      {!!recap.collectionCredits?.length && <p><CollectionGoal earned={recap.collectionCredits.length}/><small>Saved to your First tales collection.</small></p>}
      {(rewardHats.length > 0 || !!recap.collectionCredits?.length) && <section className="di-recap-rewards" aria-label="Your cosmetic rewards">
        {rewardHats.map(hat => <div className="di-recap-hat" key={hat.id}><HeroHatPreview hat={hat}/><div><small>{newHats.includes(hat.id) ? 'New hat unlocked' : 'In your collection'}</small><strong>{hat.label}</strong><button type="button" onClick={() => { onClose(); openHero({ tab: 'hats', hatId: hat.id }); }}>View your hat</button></div></div>)}
        <CustomizeHeroContext.Provider value={target => { onClose(); openHero(target); }}><NextLook /></CustomizeHeroContext.Provider>
      </section>}
      <div className="di-recap-stats">
        <div>
          <strong>{recap.actions}</strong>
          <span>{recap.actions === 1 ? 'contribution' : 'contributions'}</span>
        </div>
        <div>
          <strong>+{recap.xp}</strong>
          <span>XP earned</span>
        </div>
        <div>
          <strong>{recap.keepsakes.length}</strong>
          <span>keepsakes</span>
        </div>
      </div>
      {recap.highlights.length > 0 ? (
        <div className="di-recap-highlights">
          {recap.highlights.slice(-3).map((text, i) => (
            <p key={i}>
              <Sparkles size={15} />
              <span>{text}</span>
            </p>
          ))}
        </div>
      ) : (
        <p className="di-muted">The door is always open for your next move.</p>
      )}
      {recap.keepsakes.length > 0 && (
        <div className="di-keepsake-stories">
          <h3>Little things. Stories worth keeping.</h3>
          {recap.keepsakes.map(item => {
            const chapter = CHAPTERS.findIndex(chapter => chapter.keepsake === item);
            const memory = recap.chapterHighlights?.[chapter];
            return <article className="di-keepsake-story" key={item}>
              <KeepsakeArtwork name={item} />
              <div><strong>{item}</strong>
                <small>{chapter >= 0 ? `Chapter ${chapter + 1} · ${CHAPTERS[chapter].title}` : recap.title}</small>
                <p>{!recap.adventureId || recap.adventureId === 'briar-glen' ? ['A little bell to remember the villagers and the missing herd.', 'A river reed to remember the crossing to the chapel.', 'A moonstone to remember the guardian and Briar Glen’s fate.'][chapter] ?? 'A memento of the adventure you helped tell.' : 'A memento of the chapter you helped shape.'}</p>
                {memory?.length ? <p className="di-keepsake-contribution"><b>Your part:</b> {memory.at(-1)}</p> : <p className="di-fine">Earned through your contributions to this chapter.</p>}
              </div>
            </article>;
          })}
        </div>
      )}
      {recap.outcomes.map((outcome) => (
        <div className="di-outcome" key={outcome.chapter}>
          <span className="di-eyebrow">
            Chapter {outcome.chapter + 1} · {outcome.result}
          </span>
          <p>{outcome.text}</p>
        </div>
      ))}
      <p className="di-fine">
        Check your recent visits for the chapter’s
        outcome.
      </p>
      <SaveStatus/>
      {!useAdventureStore.getState().room && (!useAdventureStore.getState().account || useAdventureStore.getState().account?.guest) && <button className="di-button di-secondary di-full" onClick={()=>{onClose();window.dispatchEvent(new Event('dropinn-open-account'));}}>Save your hero</button>}
      {recap.outcomes.length < CHAPTERS.length && <button className="di-button di-secondary di-full" disabled={loading}
        onClick={async () => {
          setReturnError(null);
          await joinRoom(recap.code);
          if (useAdventureStore.getState().room?.code === recap.code) onClose();
          else setReturnError(useAdventureStore.getState().error ?? 'This table could not be reopened.');
        }}>{loading ? 'Finding your seat…' : 'Return to this table'} <Users size={16} /></button>}
      {returnError && <p role="alert" className="di-fine">{returnError}</p>}
      <button className="di-button di-primary di-full" onClick={onClose}>
        Back to the inn <ArrowRight size={17} />
      </button>
    </Modal>
  );
}

export function DropInn() {
  const {
    ready,
    room,
    character,
    initialize,
    refreshRooms,
    syncRoom,
    joinRoom,
    error,
    clearError,
    syncError,
    syncing,
    restoringCode,
    backend,
    recap,
    dismissRecap,
  } = useAdventureStore();
  const inviteHandled = useRef(false);
  const [help, setHelp] = useState(false);
  const [heroTarget, setHeroTarget] = useState<HeroCustomizerTarget | null>(null);
  const openHero = (target: HeroCustomizerTarget = {}) => {
    if (!useAdventureStore.getState().room && !useAdventureStore.getState().restoringCode) {
      dismissRecap();
      setHeroTarget(target);
    }
  };
  useEffect(() => {
    void initialize();
  }, [initialize]);
  useEffect(()=>{
    if(localPlay) return;
    const client=getSupabaseClient();if(!client)return;
    let stopped=false;
    const timers=new Set<ReturnType<typeof setTimeout>>();
    const {data}=client.auth.onAuthStateChange((event,session)=>{
      if(event==='INITIAL_SESSION' || event==='TOKEN_REFRESHED') return;
      // Leave the Supabase auth callback before making further authenticated requests.
      const refresh=()=>{
        if(stopped)return;
        const state=useAdventureStore.getState();
        if(state.loading) {const timer=setTimeout(()=>{timers.delete(timer);refresh();},100);timers.add(timer);return;}
        if(session?.user.id!==state.account?.id || session?.user.is_anonymous!==state.account?.guest || event==='USER_UPDATED') void state.refreshAccount();
      };
      const timer=setTimeout(()=>{timers.delete(timer);refresh();},0);timers.add(timer);
    });
    return ()=>{stopped=true;timers.forEach(clearTimeout);data.subscription.unsubscribe();};
  },[]);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [room?.id]);
  useEffect(() => {
    if (!ready || inviteHandled.current) return;
    inviteHandled.current = true;
    const code = new URLSearchParams(window.location.search).get('room');
    if (code) {
      const url = new URL(window.location.href);
      const inviteKey = new URLSearchParams(url.hash.slice(1)).get('invite') ?? undefined;
      url.searchParams.delete('room');
      url.hash = '';
      window.history.replaceState({}, '', url.toString());
      if (room?.code !== code.toUpperCase()) void joinRoom(code, inviteKey);
    }
  }, [ready, room?.code, joinRoom]);
  useEffect(() => {
    if (!ready) return;
    const poll = () => {
      if (!document.hidden && navigator.onLine) void (room || restoringCode ? syncRoom() : refreshRooms());
    };
    const interval = window.setInterval(poll, room || restoringCode ? 1000 : 8000);
    const onVisibility = () => {
      if (!document.hidden) poll();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('online', poll);
    const onOffline = () => {
      if (room || restoringCode) useAdventureStore.setState({ syncError: 'You are offline. Reconnecting when your connection returns...' });
    };
    window.addEventListener('offline', onOffline);
    if (!navigator.onLine) onOffline();
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('online', poll);
      window.removeEventListener('offline', onOffline);
    };
  }, [ready, Boolean(room), restoringCode, syncRoom, refreshRooms]);

  return (
    <CustomizeHeroContext.Provider value={openHero}><div className={`di-app ${room ? 'di-app-playing' : ''}`}>
      {!room && <header className="di-header">
        <a
          className="di-brand"
          href={room ? undefined : '/'}
          aria-label="DropInn home"
        >
          <span className="di-brand-icon">
            <Dices size={23} strokeWidth={1.4} />
          </span>
          Drop<span>Inn</span>
          <i />
        </a>
        <span className="di-header-tag">Small moments. Legendary stories.</span>
        <nav aria-label="Main navigation">
          {!room && <a className="di-nav-link di-merch-nav" href="/merch">Merch</a>}
          <button
            className="di-nav-link"
            aria-label="How to play"
            onClick={() => setHelp(true)}
          >
            <BookOpen size={16} />
            <span>How to play</span>
          </button>
          {character && (
            <button type="button" className="di-header-hero" aria-label="Customize hero from header" onClick={() => openHero()}>
              <HeroMark hero={character} small />
              <span>{character.name}</span>
            </button>
          )}
        </nav>
      </header>}
      {syncError && (
        <div className="di-connection" role="status">
          <div><strong>{syncError}</strong><p>The table may keep moving. We will check your latest turn before you continue.</p></div>
          <button className="di-secondary" disabled={syncing} onClick={() => void syncRoom()}>{syncing ? 'Checking...' : 'Retry now'}</button>
        </div>
      )}
      {error && (
        <div className="di-error" role="alert">
          <span>{error}</span>
          <button
            className="di-icon-button"
            onClick={clearError}
            aria-label="Dismiss error"
          >
            <X size={17} />
          </button>
        </div>
      )}
      {!ready ? (
        <main className="di-loading">
          <Dices size={40} />
          <h1>Pull up a chair.</h1>
          <p>Opening the inn…</p>
          <LoaderCircle className="di-spin" />
        </main>
      ) : restoringCode && !room ? (
        <main className="di-loading"><Dices size={40} /><h1>Your chair is still bookmarked.</h1><p>Reconnecting to table {restoringCode}. Your saved hero stays here.</p></main>
      ) : room ? (
        <Adventure key={room.id} room={room} />
      ) : (
        <Lobby />
      )}
      {!room && <footer className="di-footer">
        <span>
          <Dices size={14} /> A story is better with you in it.
        </span>
        <span>
          {backend === 'local'
            ? 'Local playtest · rooms on this computer'
            : 'Live adventures · come and go freely'}
        </span>
        <nav className="di-legal-links" aria-label="Legal information">
          <a href="/merch">Merch</a><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="/refunds">Refunds</a><a href="mailto:themainyak@gmail.com">Contact</a>
        </nav>
      </footer>}
      {recap && <Recap recap={recap} onClose={dismissRecap} />}
      {heroTarget && character && !room && !restoringCode && <HeroCustomizer character={character} initialTarget={heroTarget} onClose={() => setHeroTarget(null)} />}
      {help && (
        <Modal title="How to play DropInn" onClose={() => setHelp(false)}>
          <p className="di-eyebrow">Your first adventure starts here</p>
          <h2>No rulebook required.</h2>
          <div className="di-help-steps">
            <p>
              <b>01</b>
              <span>
                <strong>Drop in.</strong> Your hero is ready. Press Play to join a
                table or start with companions. Work together toward the chapter’s goal.
              </span>
            </p>
            <p>
              <b>02</b>
              <span>
                <strong>Choose a target, then a move.</strong> Tap something in the
                scene to see how you can help. Choose a move and read what it will do.
              </span>
            </p>
            <p>
              <b>03</b>
              <span>
                <strong>Hold, release, then watch.</strong> Hold the die and release
                in the bright zone for a small bonus, or use Roll now. Everyone chooses
                together within 60 seconds. Once you commit, wait for the party’s results.
              </span>
            </p>
            <p>
              <b>04</b>
              <span>
                <strong>See what changed.</strong> Your party’s moves advance the
                story. Choose again in the next round, or leave when life calls.
                Your contribution and earned rewards are saved.
              </span>
            </p>
          </div>
          <p className="di-fine">
            Once per chapter, Spotlight lets you preview a creative idea before
            committing it. Miss a turn? You sit it out, or defend in combat.
            All heroes start on equal footing.
          </p>
          <button
            className="di-button di-primary di-full"
            onClick={() => setHelp(false)}
          >
            Got it. Let’s adventure. <ArrowRight size={17} />
          </button>
        </Modal>
      )}
    </div></CustomizeHeroContext.Provider>
  );
}

const lobbyStoryKey = 'dropinn:lobby-story:v1';
function initialLobbyStory(): string {
  try {
    const saved = localStorage.getItem(lobbyStoryKey);
    if (saved && ADVENTURES.some(adventure => adventure.id === saved)) return saved;
  } catch { /* A browser preference must never prevent entering an adventure. */ }
  return DEFAULT_ADVENTURE;
}

function Lobby() {
  const {
    character,
    collection,
    rooms,
    loading,
    error,
    clearError,
    playNow,
    startFriendTable,
    joinRoom,
    prepareAdventure,
    recaps,
    seenOutcomes,
  } = useAdventureStore();
  const [code, setCode] = useState('');
  const openHero = useCustomizeHero();
  const [preparing, setPreparing] = useState(false);
  const [adventureId, setAdventureId] = useState(initialLobbyStory);
  const [storyChooser, setStoryChooser] = useState(false);
  const [friends, setFriends] = useState(false);
  const [viewRecap, setViewRecap] = useState<VisitRecap | null>(null);
  const [journal, setJournal] = useState(false);
  const adventure = ADVENTURES.find(item => item.id === adventureId) ?? ADVENTURES[0];
  useEffect(() => {
    try { localStorage.setItem(lobbyStoryKey, adventure.id); }
    catch { /* Story selection still works when browser storage is unavailable. */ }
  }, [adventure.id]);
  const unseen = (visit: VisitRecap) => Math.max(0, visit.outcomes.length - (seenOutcomes[`${visit.code}:${visit.characterId}`] ?? 0));
  const recentVisits = [...recaps].sort((a, b) => Number(unseen(b) > 0) - Number(unseen(a) > 0));
  const liveRooms = rooms.filter(item => item.status !== 'completed' && item.openSeats > 0);
  const newTelling = async () => {
    setPreparing(true);
    try { await prepareAdventure(); } finally { setPreparing(false); }
  };
  return (
    <main className="di-lobby di-shell di-lobby-clear">
      <section className="di-lobby-entrance" aria-label="Start your adventure">
        <div className="di-lobby-intro">
          <div className="di-lobby-intro-copy">
            <h1>A short adventure.<br /><em>Together.</em></h1>
            <p className="di-lobby-explanation">Play a fantasy story together. <span className="di-lobby-story-hook">{adventure.pitch}</span></p>
            <ol className="di-lobby-loop" aria-label="Each round">
              <li><b>1</b><span>Pick a target</span></li>
              <li><b>2</b><span>Choose a move</span></li>
              <li><b>3</b><span>Hold &amp; release</span></li>
              <li><b>4</b><span>See what changed</span></li>
            </ol>
          </div>
          <div className="di-lobby-intro-art" aria-hidden="true"><SceneArt scene={adventure.chapters[0].art} /></div>
        </div>

        <div className="di-lobby-ready">
          {character && <div className="di-lobby-ready-hero">
            <div className="di-arrival-identity"><HeroAvatar hero={character} /><div><span className="di-lobby-ready-label">Your hero is ready</span><strong>{character.name}</strong><small>{CHARACTER_CLASS_PRESETS[character.classKey].label}</small></div></div>
            <button type="button" className="di-lobby-change" aria-haspopup="dialog" disabled={loading} onClick={() => openHero()}>Customize hero</button>
          </div>}
          <div className="di-lobby-ready-story">
            <div><span className="di-lobby-ready-label">Your story</span><strong>{adventure.title}</strong></div>
            <button type="button" className="di-lobby-change" aria-haspopup="dialog" disabled={loading} onClick={() => setStoryChooser(true)}>Change story</button>
          </div>
        </div>

        <div className="di-lobby-start">
          <div className="di-lobby-start-actions">
            <button type="button" className="di-button di-primary di-lobby-play" disabled={loading} onClick={() => void playNow(adventure.id)}>
              {loading ? <LoaderCircle className="di-spin" size={20} /> : <TabletopArtwork kind="dice" />}
              <span>{loading ? preparing ? 'Preparing a new telling…' : 'Opening your adventure…' : `Play ${adventure.title}`}</span>
              <ArrowRight size={18} />
            </button>
            <button type="button" className="di-button di-secondary di-lobby-friends" aria-haspopup="dialog" disabled={loading} onClick={() => { clearError(); setFriends(true); }}>
              <Users size={18} /> Play with friends
            </button>
          </div>
          <p className="di-lobby-start-note">Join players or start with companions. No group needed. Leave whenever.</p>
          <p className="di-lobby-round-note">Everyone chooses together · 60 seconds per round · Ready parties move sooner</p>
        </div>
      </section>

      <details className="di-lobby-story-options" key={adventure.id}>
        <summary>About {adventure.title} &amp; rewards</summary>
        <div className="di-lobby-story-details">
          <p>{adventure.pitch}</p>
          <p className="di-fine">Three chapters · 1–4 adventurers · Contribute for as long as you like</p>
          <StoryRewards adventureId={adventure.id} adventureVersion={adventure.version} collectionVersion={1} />
          {adventure.id === 'briar-glen' && <div className="di-lobby-new-telling">
            <p>Try a fresh telling of this story with the same adventure rules.</p>
            <button type="button" className="di-button di-secondary" disabled={loading} onClick={() => void newTelling()}>
              <Sparkles size={16} /> {preparing ? 'Preparing…' : 'Start a new telling of Briar Glen'}
            </button>
          </div>}
        </div>
      </details>

      <div className="di-lobby-grid">
        <div className="di-lobby-main">
          <section className="di-lobby-live" aria-label="Public tables">
            <div className="di-section-heading">
              <div><p className="di-eyebrow">Join a story in progress</p><h2>Open tables</h2></div>
              <span className="di-soft-tag"><span className="di-live-dot" />{liveRooms.length} open {liveRooms.length === 1 ? 'table' : 'tables'}</span>
            </div>
            {liveRooms.length > 0 ? <div className="di-room-list">
              {liveRooms.map(summary => <RoomCard key={summary.code} summary={summary} disabled={loading} onJoin={() => void joinRoom(summary.code)} />)}
            </div> : <p className="di-lobby-empty">No public tables have an open seat right now. Press Play above to begin with companions.</p>}
          </section>

          {recaps.length > 0 && <section className="di-recent">
            <div className="di-section-heading"><h2>Your recent visits</h2><BookOpen size={20} /></div>
            {recentVisits.slice(0, 4).map((visit, i) => <button className="di-visit" key={`${visit.code}-${i}`} onClick={() => setViewRecap(visit)}>
              <span className="di-visit-icon"><BookOpen size={20} /></span>
              <span><strong>{visit.title}</strong>
                {unseen(visit) > 0 && <span className="di-new-outcome"><Sparkles size={12} /> {unseen(visit)} unread chapter {unseen(visit) === 1 ? 'ending' : 'endings'}</span>}
                <small>{visit.actions} {visit.actions === 1 ? 'contribution' : 'contributions'} · {visit.xp} XP · {visit.outcomes.length ? `${visit.outcomes.length} chapter outcomes` : 'Story in progress'}</small>
              </span><ArrowRight size={17} />
            </button>)}
          </section>}

          <section className="di-lobby-collection" aria-label="Your collection">
            <div className="di-section-heading"><h2>Your collection</h2><button type="button" className="di-lobby-change" aria-label="Your discoveries" aria-haspopup="dialog" onClick={() => setJournal(true)}>Discoveries</button></div>
            <p>Contribute to a chapter. Earn 1 Thread when it ends. Every outcome counts.</p>
            <span className="di-thread-goal">{threadBalance(collection)} Thread to spend</span>
            <CollectionGoal />
            <NextLook compact />
          </section>
        </div>
        <aside className="di-lobby-aside"><AccountPanel /></aside>
      </div>
      <NarratorDownload compact />
      <SupporterShop />
      <MerchTeaser />

      {storyChooser && <Modal title="Choose a story" onClose={() => setStoryChooser(false)}>
        <div className="di-lobby-story-picker">
          <p className="di-eyebrow">Four free adventures</p><h2>Choose a story</h2>
          <p>Choose what to play, then start when you’re ready.</p>
          <div className="di-lobby-story-choices" role="group" aria-label="Story choices">
            {ADVENTURES.map(item => <article key={item.id} className={item.id === adventure.id ? 'is-selected' : ''}>
              <SceneArt scene={item.chapters[0].art} />
              <div className="di-lobby-story-choice-copy"><h3>{item.title}</h3><p>{item.pitch}</p></div>
              <button type="button" className="di-button di-secondary" aria-label={`Select story: ${item.title}`} aria-pressed={item.id === adventure.id} disabled={loading} onClick={() => { setAdventureId(item.id); setStoryChooser(false); }}>
                {item.id === adventure.id ? <><Check size={16} /> Selected story</> : <>Choose this story <ArrowRight size={16} /></>}
              </button>
              <details className="di-lobby-choice-rewards"><summary>View rewards</summary><StoryRewards adventureId={item.id} adventureVersion={item.version} collectionVersion={1} /></details>
            </article>)}
          </div>
        </div>
      </Modal>}

      {friends && <Modal title="Play with friends" onClose={() => setFriends(false)}>
        <div className="di-lobby-friend-options">
          <p className="di-eyebrow">Just your people</p><h2>Play with friends</h2>
          <section>
            <h3>Start a private table</h3>
            <p>Play {adventure.title} with companions, then invite up to three friends. Your table stays out of public discovery.</p>
            <button type="button" className="di-button di-primary di-full" disabled={loading} onClick={() => void startFriendTable(adventure.id)}><Users size={17} />{loading ? 'Opening your table…' : 'Start a friend table'}</button>
            <small>Anyone with the full invitation can join.</small>
          </section>
          <section>
            <h3>Have an invitation?</h3>
            <form onSubmit={event => { event.preventDefault(); if (code.trim()) void joinRoom(code.trim()); }}>
              <label htmlFor="room-code">Adventure code or invitation link</label>
              <input id="room-code" value={code} onChange={event => setCode(event.target.value)} placeholder="Code or invitation link" maxLength={2048} autoCapitalize="none" autoComplete="off" />
              <button type="submit" className="di-button di-secondary" aria-label="Join adventure by code" disabled={!code.trim() || loading}>Join friends <ArrowRight size={17} /></button>
            </form>
          </section>
          {error && <p role="alert" className="di-lobby-friend-error">{error}</p>}
        </div>
      </Modal>}
      {journal && <Modal title="Your discoveries" onClose={() => setJournal(false)}><DiscoveryJournal /></Modal>}
      {viewRecap && <Recap recap={viewRecap} onClose={() => setViewRecap(null)} />}
    </main>
  );
}

function RoomCard({
  summary,
  disabled,
  onJoin,
}: {
  summary: RoomSummary;
  disabled: boolean;
  onJoin: () => void;
}) {
  const chapters = chaptersFor(summary);
  const chapter = chapters[Math.min(summary.chapter, chapters.length - 1)];
  return (
    <article className="di-live-room">
      <div className="di-live-room-art">
        <SceneArt scene={chapter.art} />
      </div>
      <div className="di-live-room-copy">
        <span className="di-eyebrow">
          <span
            className={`di-live-dot ${summary.status === 'parked' ? 'di-parked' : ''}`}
          />
          {summary.status === 'parked' ? 'Ready to wake' : 'Happening now'} ·
          Chapter {summary.chapter + 1}
        </span>
        <h3>{summary.chapterTitle}</h3>
        <p>{summary.predicament}</p><StoryRewards adventureId={summary.adventureId} adventureVersion={summary.adventureVersion} chapter={summary.chapter} collectionVersion={summary.collectionVersion} />
        <div className="di-room-people">
          <span>
            <Users size={13} />
            {summary.humans} human{summary.humans === 1 ? '' : 's'} ·{' '}
            {summary.companions} AI companions
          </span>
          <span>
            {summary.openSeats} open{' '}
            {summary.openSeats === 1 ? 'seat' : 'seats'}
          </span>
        </div>
        <div
          className="di-meter"
          role="progressbar"
          aria-label="Chapter progress"
          aria-valuemin={0}
          aria-valuemax={summary.progressGoal}
          aria-valuenow={Math.min(summary.progress, summary.progressGoal)}
        >
          <span
            style={{
              width: `${Math.min(100, (100 * summary.progress) / summary.progressGoal)}%`,
            }}
          />
        </div>
      </div>
      <button
        className="di-button di-secondary"
        onClick={onJoin}
        disabled={disabled}
      >
        Drop in <ArrowRight size={16} />
      </button>
    </article>
  );
}

function Adventure({ room }: { room: AdventureRoom }) {
  return <SceneAdventure room={room} chat={<Chat room={room} />} />;
}

function Chat({ room }: { room: AdventureRoom }) {
  const { messages, mutedUserIds, userId, sendChat, toggleMute, report } =
    useAdventureStore();
  const [text, setText] = useState('');
  const [reporting, setReporting] = useState<{
    userId: string;
    name: string;
  } | null>(null);
  const [reason, setReason] = useState('Harassment or unkind behavior');
  const [reported, setReported] = useState(false);
  const [sending, setSending] = useState(false);
  const visible = messages.filter(
    (message) => !mutedUserIds.includes(message.userId),
  );
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true);
    const sent = await sendChat(text.trim());
    if (sent) setText('');
    setSending(false);
  };
  return (
    <>
      <details className="di-chat" open>
        <summary>
          <MessageCircle size={17} /> Around the table{' '}
          <span>Optional chat</span>
          <ChevronDown size={16} />
        </summary>
        <div className="di-chat-body">
          <p className="di-fine">
            A shared adventure. Be kind to the people in it.
          </p>
          <div
            className="di-chat-messages"
            role="log"
            aria-label="Party messages"
          >
            {visible.length === 0 ? (
              <p className="di-muted">
                Say hello, share a plan, or let your actions do the talking.
              </p>
            ) : (
              visible.slice(-30).map((message) => (
                <div className="di-chat-message" key={message.id}>
                  <div>
                    <strong>
                      {message.name}
                      {message.userId === userId ? ' (you)' : ''}
                    </strong>
                    {message.userId !== userId && (
                      <span>
                        <button
                          className="di-icon-button"
                          aria-label={`Mute ${message.name}`}
                          title={`Mute ${message.name}`}
                          onClick={() => toggleMute(message.userId)}
                        >
                          <VolumeX size={13} />
                        </button>
                        <button
                          className="di-icon-button"
                          aria-label={`Report ${message.name}`}
                          title={`Report ${message.name}`}
                          onClick={() => {
                            setReporting({
                              userId: message.userId,
                              name: message.name,
                            });
                            setReported(false);
                          }}
                        >
                          <Flag size={12} />
                        </button>
                      </span>
                    )}
                  </div>
                  <p>{message.text}</p>
                </div>
              ))
            )}
          </div>
          {mutedUserIds.length > 0 && (
            <div className="di-muted-list">
              {mutedUserIds.map((id) => (
                <button
                  className="di-text-button"
                  key={id}
                  onClick={() => toggleMute(id)}
                >
                  <Volume2 size={12} />
                  Unmute {room.players[id]?.character.name ?? 'player'}
                </button>
              ))}
            </div>
          )}
          <form onSubmit={(event) => void submit(event)}>
            <label className="di-sr-only" htmlFor="chat-message">
              Message the party
            </label>
            <input
              id="chat-message"
              maxLength={280}
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="A word to your party…"
            />
            <button
              className="di-button di-secondary"
              disabled={!text.trim() || sending}
              aria-label="Send message"
            >
              <Send size={17} />
            </button>
          </form>
        </div>
      </details>
      {reporting && (
        <SceneDrawer
          title={`Report ${reporting.name}`}
          presentation="dialog"
          onClose={() => setReporting(null)}
        >
          <p className="di-eyebrow">Keep the table welcoming</p>
          <h2>{reported ? 'Report received.' : `Report ${reporting.name}`}</h2>
          {reported ? (
            <>
              <p className="di-muted">
                Your report is saved for review. You can also mute this player
                to hide their messages.
              </p>
              <button
                className="di-button di-secondary di-full"
                onClick={() => {
                  if (!mutedUserIds.includes(reporting.userId))
                    toggleMute(reporting.userId);
                  setReporting(null);
                }}
              >
                Mute & close <VolumeX size={16} />
              </button>
            </>
          ) : (
            <>
              <label htmlFor="report-reason">What happened?</label>
              <select
                id="report-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              >
                <option>Harassment or unkind behavior</option>
                <option>Inappropriate content</option>
                <option>Spam or disruptive behavior</option>
              </select>
              <button
                className="di-button di-primary di-full"
                onClick={async () => {
                  const saved = await report(reporting.userId, reason);
                  if (saved) setReported(true);
                }}
              >
                <Flag size={16} />
                Send report
              </button>
            </>
          )}
        </SceneDrawer>
      )}
    </>
  );
}
