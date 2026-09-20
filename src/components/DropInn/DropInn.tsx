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
import { ADVENTURES, chaptersFor } from '../../lib/dropinn/registry';
import {
  CHARACTER_CLASS_PRESETS,
  heroAccent,
  type CharacterClassKey,
  type CharacterProfile,
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

const roleCopy: Record<CharacterClassKey, string> = {
  wizard: 'Read the magic. Change the odds.',
  fighter: 'Stand your ground. Protect your friends.',
  rogue: 'Find an opening. Make trouble.',
  cleric: 'Lift spirits. Keep hope alive.',
};
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
          'button:not(:disabled), input, textarea, select, [tabindex="0"]',
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
            const hat = hatForKeepsake(item);
            return <article className="di-keepsake-story" key={item}>
              <KeepsakeArtwork name={item} />
              <div><strong>{item}</strong>
                {hat && <div className="di-hat-reward"><HeroHatPreview hat={hat} /><span>Hat unlocked: {hat.label}<small>Ready to wear in your hero builder between visits.</small></span></div>}
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
        Your progress is saved. Check your recent visits for the chapter’s
        outcome.
      </p>
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
  useEffect(() => {
    void initialize();
  }, [initialize]);
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
    <div className={`di-app ${room ? 'di-app-playing' : ''}`}>
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
          <button
            className="di-nav-link"
            aria-label="How to play"
            onClick={() => setHelp(true)}
          >
            <BookOpen size={16} />
            <span>How to play</span>
          </button>
          {character && (
            <div className="di-header-hero">
              <HeroMark hero={character} small />
              <span>{character.name}</span>
            </div>
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
      </footer>}
      {recap && <Recap recap={recap} onClose={dismissRecap} />}
      {help && (
        <Modal title="How to play DropInn" onClose={() => setHelp(false)}>
          <p className="di-eyebrow">Your first adventure starts here</p>
          <h2>No rulebook required.</h2>
          <div className="di-help-steps">
            <p>
              <b>01</b>
              <span>
                <strong>Drop in.</strong> Pick a hero and press Play Now.
                Companions fill empty seats, so you can always get started.
              </span>
            </p>
            <p>
              <b>02</b>
              <span>
                <strong>Make your move.</strong> Place a token on the scene, then hold
                and release the die. Good timing adds +1. Everyone has 30 seconds; ready parties move sooner.
              </span>
            </p>
            <p>
              <b>03</b>
              <span>
                <strong>Try something unexpected.</strong> Once per chapter,
                your Spotlight token turns a creative idea into an action.
                Preview it before committing.
              </span>
            </p>
            <p>
              <b>04</b>
              <span>
                <strong>Leave when life calls.</strong> Your contribution and
                rewards are saved. The story can keep going with your friends.
              </span>
            </p>
          </div>
          <p className="di-fine">
            Miss a turn? You sit it out, or defend in combat. XP and keepsakes
            remember your story; all heroes start on equal footing.
          </p>
          <button
            className="di-button di-primary di-full"
            onClick={() => setHelp(false)}
          >
            Got it. Let’s adventure. <ArrowRight size={17} />
          </button>
        </Modal>
      )}
    </div>
  );
}

function Lobby() {
  const {
    character,
    rooms,
    loading,
    playNow,
    startFriendTable,
    joinRoom,
    prepareAdventure,
    recaps,
    seenOutcomes,
  } = useAdventureStore();
  const [code, setCode] = useState('');
  const [editingHero, setEditingHero] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [adventureId, setAdventureId] = useState('briar-glen');
  const [viewRecap, setViewRecap] = useState<VisitRecap | null>(null);
  const unseen = (visit: VisitRecap) => Math.max(0, visit.outcomes.length - (seenOutcomes[`${visit.code}:${visit.characterId}`] ?? 0));
  const recentVisits = [...recaps].sort((a, b) => Number(unseen(b) > 0) - Number(unseen(a) > 0));
  const liveRooms = rooms.filter(
    (item) => item.status !== 'completed' && item.openSeats > 0,
  );
  const newTelling = async () => {
    setPreparing(true);
    await prepareAdventure();
    setPreparing(false);
  };
  return (
    <main className="di-lobby di-shell">
      <section className="di-welcome">
        <div className="di-welcome-art">
          <SceneArt />
          <div className="di-welcome-art-fade" />
        </div>
        <div className="di-welcome-copy">
          <p className="di-eyebrow">
            <span className="di-live-dot" /> The door’s always open
          </p>
          <h1>
            A little time.
            <br />
            <em>A great adventure.</em>
          </h1>
          <p>
            Step into a story. Make a little mischief.
            <br className="di-desktop-break" /> Be someone’s unexpected hero.
          </p>
          <button
            className="di-button di-primary di-play"
            disabled={loading}
            onClick={() => void playNow(adventureId)}
          >
            {loading ? (
              <LoaderCircle className="di-spin" size={20} />
            ) : (
              <Dices size={21} />
            )}{' '}
            {loading
              ? preparing
                ? 'Preparing a new telling…'
                : 'Opening your adventure…'
              : 'Play Now'}
            <ArrowRight size={20} />
          </button>
          <div className="di-welcome-meta">
            <span>
              <Clock3 size={14} /> Got 5 minutes?
            </span>
            <i />
            <span>No experience needed</span>
          </div>
        </div>
        <div className="di-location-stamp">
          <span>Stories from</span>
          <strong>Briar Glen</strong>
          <div>Est. somewhere beyond the ordinary</div>
        </div>
      </section>

      <section className="di-story-library" aria-label="Choose an adventure">
        <h2>Choose your next story</h2>
        <div>{ADVENTURES.map(adventure => <article key={adventure.id} className={adventure.id === adventureId ? 'is-selected' : ''}>
          <SceneArt scene={adventure.chapters[0].art} />
          <h3>{adventure.title}</h3><p>{adventure.pitch}</p>
          <button className="di-button di-secondary" aria-pressed={adventure.id === adventureId} onClick={() => setAdventureId(adventure.id)}>Select story</button>
          <button className="di-button di-primary" disabled={loading} onClick={() => void playNow(adventure.id)} aria-label={`Play ${adventure.title}`}>Play this story</button>
          <button className="di-text-button" disabled={loading} onClick={() => void startFriendTable(adventure.id)} aria-label={`Start a friend table for ${adventure.title}`}>Start with friends</button>
        </article>)}</div>
      </section>
      <div className="di-lobby-grid">
        <div className="di-lobby-main">
          <div className="di-section-heading">
            <div>
              <p className="di-eyebrow">Find your next moment</p>
              <h2>Adventures at the inn</h2>
            </div>
            <span className="di-soft-tag">
              <span className="di-live-dot" />
              {liveRooms.length} open{' '}
              {liveRooms.length === 1 ? 'table' : 'tables'}
            </span>
          </div>
          {liveRooms.length > 0 && (
            <div className="di-room-list">
              {liveRooms.map((summary) => (
                <RoomCard
                  key={summary.code}
                  summary={summary}
                  disabled={loading}
                  onJoin={() => void joinRoom(summary.code)}
                />
              ))}
            </div>
          )}
          <article className="di-featured-adventure">
            <div className="di-featured-art">
              <SceneArt scene="chapel" />
              <span className="di-art-tag">The Briar Glen story</span>
            </div>
            <div className="di-featured-copy">
              <p className="di-eyebrow">A mystery in three little chapters</p>
              <h3>
                Something stirs
                <br />
                beyond the village.
              </h3>
              <p>
                Livestock missing. Strange lights in the reeds. A chapel that
                should have stayed quiet. The villagers could use someone like
                you.
              </p>
              <div className="di-adventure-tags">
                <span>
                  <Users size={14} /> 1–4 adventurers
                </span>
                <span>
                  <Clock3 size={14} /> 5–8 min / chapter
                </span>
              </div>
              <div className="di-featured-actions">
                <button
                  className="di-button di-secondary"
                  disabled={loading}
                  onClick={() => void playNow('briar-glen')}
                >
                  {liveRooms.length ? 'Find me a seat' : 'Start the adventure'}
                  <ArrowRight size={16} />
                </button>
                <button
                  className="di-text-button"
                  disabled={loading}
                  onClick={() => void newTelling()}
                  title="Prepare a fresh telling before starting a new table"
                >
                  <Sparkles size={14} />{' '}
                  {preparing ? 'Preparing…' : 'New telling'}
                </button>
              </div>
            </div>
          </article>
          <div className="di-three-promises">
            <span>
              <DoorOpen size={19} />
              <strong>Come as you are</strong>
              <small>A ready hero. An open seat.</small>
            </span>
            <span>
              <Lightbulb size={19} />
              <strong>Your ideas matter</strong>
              <small>Change what happens next.</small>
            </span>
            <span>
              <Heart size={19} />
              <strong>Leave whenever</strong>
              <small>Keep the story you helped tell.</small>
            </span>
          </div>
          {recaps.length > 0 && (
            <section className="di-recent">
              <div className="di-section-heading">
                <h2>Your recent visits</h2>
                <BookOpen size={20} />
              </div>
              {recentVisits.slice(0, 4).map((visit, i) => (
                <button
                  className="di-visit"
                  key={`${visit.code}-${i}`}
                  onClick={() => setViewRecap(visit)}
                >
                  <span className="di-visit-icon">
                    <BookOpen size={20} />
                  </span>
                  <span>
                    <strong>{visit.title}</strong>
                    {unseen(visit) > 0 && <span className="di-new-outcome"><Sparkles size={12} /> {unseen(visit)} unread chapter {unseen(visit) === 1 ? 'ending' : 'endings'}</span>}
                    <small>
                      {visit.actions}{' '}
                      {visit.actions === 1 ? 'contribution' : 'contributions'} ·{' '}
                      {visit.xp} XP ·{' '}
                      {visit.outcomes.length
                        ? `${visit.outcomes.length} chapter outcomes`
                        : 'Story in progress'}
                    </small>
                  </span>
                  <ArrowRight size={17} />
                </button>
              ))}
            </section>
          )}
        </div>

        <aside className="di-lobby-aside">
          {character && (
            <section className="di-hero-card">
              <p className="di-eyebrow">Your seat at the table</p>
              <div className="di-profile">
                <HeroMark hero={character} />
                <h2>{character.name}</h2>
                <span>{CHARACTER_CLASS_PRESETS[character.classKey].label}</span>
                <p>{roleCopy[character.classKey]}</p>
              </div>
              <div className="di-profile-stats">
                <span>
                  <Star size={14} />
                  {character.xp} XP
                </span>
                <span>
                  <BookOpen size={14} />
                  {character.inventory.length} keepsakes
                </span>
              </div>
              <button
                className="di-text-button di-customize"
                onClick={() => setEditingHero(!editingHero)}
                aria-expanded={editingHero}
              >
                Make this hero yours <ChevronDown size={15} />
              </button>
              {editingHero && <HeroCustomizer character={character} onClose={() => setEditingHero(false)} />}
            </section>
          )}
          <section className="di-join-card">
            <div className="di-friend-table-start">
              <span className="di-eyebrow">Just your people</span>
              <h3>Save a table for friends.</h3>
              <p>Start with companions and invite up to three friends. Your table stays out of public discovery.</p>
              <button type="button" className="di-button di-secondary di-full" disabled={loading} onClick={() => void startFriendTable(adventureId)}>
                <Users size={17} /> Start a friend table
              </button>
              <small>Anyone you share the full invitation with can join.</small>
            </div>
            <span className="di-eyebrow">Friends saved you a seat?</span>
            <h3>Follow them in.</h3>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (code.trim()) void joinRoom(code.trim());
              }}
            >
              <label className="di-sr-only" htmlFor="room-code">
                Adventure code or invitation link
              </label>
              <input
                id="room-code"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder="Code or invitation link"
                maxLength={2048}
                autoCapitalize="none"
                autoComplete="off"
              />
              <button
                aria-label="Join adventure by code"
                className="di-button di-secondary"
                disabled={!code.trim() || loading}
              >
                <ArrowRight size={19} />
              </button>
            </form>
          </section>
          <blockquote className="di-innkeeper-note">
            <span>From the innkeeper</span>“You don’t need a whole evening to
            have a story worth telling.”
            <Dices size={22} />
          </blockquote>
        </aside>
      </div>
      {viewRecap && (
        <Recap recap={viewRecap} onClose={() => setViewRecap(null)} />
      )}
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
        <p>{summary.predicament}</p>
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
