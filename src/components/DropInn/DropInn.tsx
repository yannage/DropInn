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
import { CHAPTERS } from '../../lib/dropinn/content';
import { describeAction, getCatchUp } from '../../lib/dropinn/engine';
import {
  CHARACTER_CLASS_PRESETS,
  type CharacterClassKey,
  type CharacterProfile,
} from '../../lib/character';
import type {
  AdventureRoom,
  RoomSummary,
  TokenKind,
  VisitRecap,
} from '../../lib/dropinn/types';
import { SceneArt } from './SceneArt';
import { ActionTable } from './ActionTable';
import { getScene, spotlightExample } from '../../lib/dropinn/scene';
import { playTableSound } from './tableSound';
import { spotlightSuggestions } from '../../lib/dropinn/suggestions';

const classes: CharacterClassKey[] = ['wizard', 'fighter', 'rogue', 'cleric'];
const roleCopy: Record<CharacterClassKey, string> = {
  wizard: 'Read the magic. Change the odds.',
  fighter: 'Stand your ground. Protect your friends.',
  rogue: 'Find an opening. Make trouble.',
  cleric: 'Lift spirits. Keep hope alive.',
};
const classIcons = {
  wizard: WandSparkles,
  fighter: Shield,
  rogue: Compass,
  cleric: Sparkles,
};
const tokens = [
  {
    kind: 'fight' as const,
    label: 'Fight',
    icon: Swords,
    hint: 'Confront danger',
  },
  {
    kind: 'influence' as const,
    label: 'Influence',
    icon: MessageCircle,
    hint: 'Change a mind',
  },
  {
    kind: 'investigate' as const,
    label: 'Investigate',
    icon: Search,
    hint: 'Find an answer',
  },
  {
    kind: 'assist' as const,
    label: 'Assist',
    icon: Heart,
    hint: 'Help the party',
  },
];
const traitLabels = {
  INT: 'Intellect',
  ATH: 'Athletics',
  ING: 'Ingenuity',
  CHA: 'Charisma',
};

function HeroMark({
  hero,
  small = false,
}: {
  hero: Pick<CharacterProfile, 'classKey' | 'name'>;
  small?: boolean;
}) {
  const Icon = classIcons[hero.classKey];
  return (
    <span
      className={`di-hero-mark ${small ? 'di-small' : ''} di-class-${hero.classKey}`}
      aria-hidden="true"
    >
      <Icon strokeWidth={1.45} />
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
  const markRecapSeen = useAdventureStore(state => state.markRecapSeen);
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
            return <article className="di-keepsake-story" key={item}>
              <Star size={22} />
              <div><strong>{item}</strong>
                <small>{chapter >= 0 ? `Chapter ${chapter + 1} · ${CHAPTERS[chapter].title}` : recap.title}</small>
                <p>{['A little bell to remember the villagers and the missing herd.', 'A river reed to remember the crossing to the chapel.', 'A moonstone to remember the guardian and Briar Glen’s fate.'][chapter] ?? 'A memento of the adventure you helped tell.'}</p>
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
      url.searchParams.delete('room');
      window.history.replaceState({}, '', url.toString());
      if (room?.code !== code.toUpperCase()) void joinRoom(code);
    }
  }, [ready, room?.code, joinRoom]);
  useEffect(() => {
    if (!ready) return;
    const poll = () => {
      if (!document.hidden) void (room ? syncRoom() : refreshRooms());
    };
    const interval = window.setInterval(poll, room ? 1000 : 8000);
    const onVisibility = () => {
      if (!document.hidden) poll();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [ready, Boolean(room), syncRoom, refreshRooms]);

  return (
    <div className="di-app">
      <header className="di-header">
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
      </header>
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
      ) : room ? (
        <Adventure key={room.id} room={room} />
      ) : (
        <Lobby />
      )}
      <footer className="di-footer">
        <span>
          <Dices size={14} /> A story is better with you in it.
        </span>
        <span>
          {backend === 'local'
            ? 'Local playtest · rooms on this computer'
            : 'Live adventures · come and go freely'}
        </span>
      </footer>
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
                <strong>Make your move.</strong> Choose a target and an action
                token. Everyone has 30 seconds; ready parties move on sooner.
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
    joinRoom,
    prepareAdventure,
    setHero,
    recaps,
    seenOutcomes,
  } = useAdventureStore();
  const [code, setCode] = useState('');
  const [name, setName] = useState(character?.name ?? '');
  const [heroClass, setHeroClass] = useState<CharacterClassKey>(
    character?.classKey ?? 'wizard',
  );
  const [editingHero, setEditingHero] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [viewRecap, setViewRecap] = useState<VisitRecap | null>(null);
  const unseen = (visit: VisitRecap) => Math.max(0, visit.outcomes.length - (seenOutcomes[`${visit.code}:${visit.characterId}`] ?? 0));
  const recentVisits = [...recaps].sort((a, b) => Number(unseen(b) > 0) - Number(unseen(a) > 0));
  const liveRooms = rooms.filter(
    (item) => item.status !== 'completed' && item.openSeats > 0,
  );
  useEffect(() => {
    if (character) {
      setName(character.name);
      setHeroClass(character.classKey);
    }
  }, [character?.name, character?.classKey]);
  const saveHero = async (event: FormEvent) => {
    event.preventDefault();
    await setHero(name.trim() || 'Wren', heroClass);
    setEditingHero(false);
  };
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
            onClick={() => void playNow()}
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
                  onClick={() => void playNow()}
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
              {editingHero && (
                <form
                  className="di-hero-editor"
                  onSubmit={(event) => void saveHero(event)}
                >
                  <label htmlFor="hero-name">
                    Hero name <span>optional</span>
                  </label>
                  <input
                    id="hero-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    maxLength={18}
                    placeholder="Wren"
                  />
                  <div
                    className="di-class-options"
                    role="group"
                    aria-label="Hero class"
                  >
                    {classes.map((key) => {
                      const Icon = classIcons[key];
                      return (
                        <button
                          type="button"
                          key={key}
                          className={heroClass === key ? 'selected' : ''}
                          aria-pressed={heroClass === key}
                          onClick={() => setHeroClass(key)}
                        >
                          <Icon size={18} />
                          <span>{CHARACTER_CLASS_PRESETS[key].label}</span>
                        </button>
                      );
                    })}
                  </div>
                  <p className="di-fine">
                    {roleCopy[heroClass]} All heroes start with equal power.
                  </p>
                  <button
                    className="di-button di-secondary di-full"
                    disabled={loading}
                  >
                    Save hero <Check size={16} />
                  </button>
                </form>
              )}
            </section>
          )}
          <section className="di-join-card">
            <span className="di-eyebrow">Friends saved you a seat?</span>
            <h3>Follow them in.</h3>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (code.trim()) void joinRoom(code.trim());
              }}
            >
              <label className="di-sr-only" htmlFor="room-code">
                Adventure code
              </label>
              <input
                id="room-code"
                value={code}
                onChange={(event) => setCode(event.target.value.toUpperCase())}
                placeholder="Adventure code"
                maxLength={12}
                autoCapitalize="characters"
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
  const chapter = CHAPTERS[Math.min(summary.chapter, CHAPTERS.length - 1)];
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
  const { userId, loading, leaveRoom, joinRoom, narration } =
    useAdventureStore();
  const [now, setNow] = useState(Date.now());
  const [copied, setCopied] = useState(false);
  const [showCatchUp, setShowCatchUp] = useState(true);
  const [showNarrative, setShowNarrative] = useState(false);
  const [inviteText, setInviteText] = useState('');
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, []);
  const chapter = getScene(room);
  const seat = room.seats.find(
    (item) => item.actorId === userId && item.kind === 'human',
  );
  const participant = room.players[userId];
  const pending = room.pendingJoins.includes(userId);
  const away = !seat && !pending;
  const paused = room.status === 'parked' || away;
  const committed = Boolean(room.commits[userId]);
  const seconds = Math.max(
    0,
    Math.ceil(
      ((room.phase === 'reveal'
        ? (room.revealUntil ?? room.deadline)
        : room.deadline) -
        now) /
        1000,
    ),
  );
  const copyInvite = async () => {
    const url = new URL(window.location.href);
    url.search = '';
    url.searchParams.set('room', room.code);
    try {
      await navigator.clipboard.writeText(url.toString());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setInviteText(url.toString());
    }
  };
  const humanSeats = room.seats.filter(
    (item) => item.kind === 'human' && !item.leaving,
  );
  const chosenCount = humanSeats.filter(
    (item) => room.commits[item.actorId],
  ).length;
  const resolvedEvents = room.events.filter(
    (event) => event.kind === 'action' || event.kind === 'consequence',
  );
  const latestResolvedTurn = resolvedEvents[resolvedEvents.length - 1]?.turn;
  const recentEvents = resolvedEvents.filter(
    (event) => event.turn === latestResolvedTurn,
  );
  const latestOutcome = room.outcomes[room.outcomes.length - 1];
  const myLastMove = [...room.events].reverse().find(event => event.actorId === userId && event.roll !== undefined && event.chapter === room.chapter);
  const heardResult = useRef(myLastMove?.id);
  useEffect(() => {
    if (myLastMove && heardResult.current !== myLastMove.id) playTableSound('result');
    heardResult.current = myLastMove?.id;
  }, [myLastMove?.id]);
  return (
    <main className="di-adventure di-shell">
      <div className="di-room-topline">
        <button
          className="di-text-button"
          disabled={loading}
          onClick={() => void leaveRoom()}
        >
          <ArrowLeft size={17} />
          <span>
            {room.status === 'completed' ? 'Back to the inn' : 'Leave & save'}
          </span>
        </button>
        <span className="di-room-title">{room.title}</span>
        <button className="di-text-button" onClick={() => void copyInvite()}>
          {copied ? <Check size={15} /> : <Copy size={15} />}
          <span>{copied ? 'Invite copied' : `Invite · ${room.code}`}</span>
        </button>
      </div>
      {inviteText && (
        <div className="di-invite-fallback">
          <label htmlFor="invite-link">Copy your invitation link</label>
          <input
            id="invite-link"
            readOnly
            value={inviteText}
            onFocus={(event) => event.currentTarget.select()}
          />
          <button
            className="di-icon-button"
            aria-label="Close invitation link"
            onClick={() => setInviteText('')}
          >
            <X size={16} />
          </button>
        </div>
      )}
      <div className="di-chapter-track" aria-label="Adventure chapters">
        {CHAPTERS.map((item, i) => (
          <span
            className={
              i === room.chapter ? 'current' : i < room.chapter ? 'done' : ''
            }
            key={item.id}
          >
            <b>{i < room.chapter ? <Check size={11} /> : i + 1}</b>
            <span>{item.title}</span>
            {i < CHAPTERS.length - 1 && <i />}
          </span>
        ))}
      </div>
      {showCatchUp && (
        <aside className="di-catchup">
          <BookOpen size={18} />
          <div>
            <span className="di-eyebrow">You’re right on time</span>
            <p>{getCatchUp(room)}</p>
          </div>
          <button
            className="di-icon-button"
            aria-label="Dismiss catch-up"
            onClick={() => setShowCatchUp(false)}
          >
            <X size={17} />
          </button>
        </aside>
      )}
      <div className="di-adventure-grid">
        <div className="di-story-column">
          <section className="di-scene">
            <SceneArt scene={chapter.art} />
            <div className="di-scene-scrim" />
            <div className="di-scene-heading">
              <span className="di-eyebrow">
                Chapter {room.chapter + 1} · {chapter.location}
              </span>
              <h1>{chapter.title}</h1>
              <div className="di-scene-meta">
                <span>
                  <Clock3 size={13} /> A 5–8 minute chapter
                </span>
                <span>Round {room.chapterRound} / 10</span>
              </div>
            </div>
          </section>
          <section className="di-narrative">
            <button
              className="di-narrative-toggle"
              onClick={() => setShowNarrative(!showNarrative)}
              aria-expanded={showNarrative}
              aria-controls="scene-narration"
            >
              <BookOpen size={14} />
              {showNarrative ? 'Close the scene' : 'Read the scene'}
              <ChevronDown size={14} />
            </button>
            <div
              id="scene-narration"
              className={`di-narrative-intro ${showNarrative ? 'di-expanded' : ''}`}
            >
              <span className="di-eyebrow">
                The scene now
              </span>
              <p>
                {room.variation?.atmosphere && room.chapter === 0
                  ? `${room.variation.atmosphere} `
                  : ''}
                {chapter.intro}
              </p>
            </div>
            <div className="di-objective">
              <Compass size={20} />
              <span>
                <small>Your shared objective</small>
                <strong>{chapter.objective}</strong>
              </span>
            </div>
            <div className="di-progress-row">
              <div>
                <span>
                  Chapter progress{' '}
                  <b>
                    {Math.round(
                      (100 * Math.min(room.progress, chapter.progressGoal)) /
                        chapter.progressGoal,
                    )}
                    %
                  </b>
                </span>
                <div className="di-meter">
                  <span
                    style={{
                      width: `${Math.min(100, (100 * room.progress) / chapter.progressGoal)}%`,
                    }}
                  />
                </div>
              </div>
              <div
                className={`di-danger ${room.danger >= 5 ? 'di-danger-high' : ''}`}
              >
                <Flame size={16} />
                <span>
                  Danger <strong>{room.danger}</strong>
                </span>
              </div>
            </div>
            {chapter.combat && (
              <p className="di-threat">
                <Shield size={14} />
                {chapter.threat}
              </p>
            )}
          </section>
          {latestOutcome && room.status !== 'completed' && (
            <section className="di-chapter-outcome">
              <span className="di-eyebrow">
                <Star size={13} />
                Chapter {latestOutcome.chapter + 1} complete ·{' '}
                {latestOutcome.result}
              </span>
              <h2>{CHAPTERS[latestOutcome.chapter].title}</h2>
              <p>{latestOutcome.text}</p>
            </section>
          )}
          <section className="di-party">
            <div className="di-section-heading">
              <h2>At your side</h2>
              <span className="di-fine">
                {room.seats.filter((item) => item.kind === 'human').length}{' '}
                human
                {room.seats.filter((item) => item.kind === 'human').length !== 1
                  ? 's'
                  : ''}{' '}
                ·{' '}
                {room.seats.filter((item) => item.kind === 'companion').length}{' '}
                AI companions
              </span>
            </div>
            <div className="di-party-grid">
              {room.seats.map((member) => (
                <div
                  className={`di-party-member ${member.actorId === userId ? 'di-you' : ''}`}
                  key={member.id}
                >
                  <HeroMark hero={member.character} small />
                  <div>
                    <strong>
                      {member.character.name}
                      {member.actorId === userId && <small>you</small>}
                    </strong>
                    <span>
                      {member.kind === 'companion'
                        ? 'AI companion'
                        : CHARACTER_CLASS_PRESETS[member.character.classKey]
                            .label}
                    </span>
                    <div className="di-party-state">
                      {member.leaving ? (
                        'Leaving this turn'
                      ) : room.commits[member.actorId] ? (
                        <>
                          <Check size={10} /> Ready
                        </>
                      ) : member.kind === 'companion' ? (
                        roleCopy[member.character.classKey].split('.')[0]
                      ) : member.hp === 0 ? (
                        'Downed · can assist'
                      ) : (
                        'Choosing…'
                      )}
                    </div>
                  </div>
                  <span className="di-party-hp">
                    <Heart size={10} />
                    {member.hp}
                  </span>
                </div>
              ))}
            </div>
          </section>
          {room.status === 'completed' && (
            <section className="di-ending">
              <span className="di-recap-seal">
                <Star size={28} />
              </span>
              <p className="di-eyebrow">The tale is yours now</p>
              <h2>A story worth telling.</h2>
              {room.outcomes.map((outcome) => (
                <div className="di-outcome" key={outcome.chapter}>
                  <strong>{CHAPTERS[outcome.chapter]?.title}</strong>
                  <p>{outcome.text}</p>
                </div>
              ))}
              <p>
                You contributed {participant?.actions ?? 0}{' '}
                {participant?.actions === 1 ? 'action' : 'actions'} and earned{' '}
                {participant?.xp ?? 0} XP.
              </p>
              <button
                className="di-button di-primary"
                onClick={() => void leaveRoom()}
                disabled={loading}
              >
                Collect your recap <ArrowRight size={16} />
              </button>
            </section>
          )}
          <section
            className={`di-recent-actions ${room.phase === 'reveal' ? 'di-revealing' : ''}`}
          >
            <div className="di-section-heading">
              <h2>
                {room.phase === 'reveal'
                  ? 'The dice have spoken'
                  : 'What just happened'}
              </h2>
              <Dices size={21} />
            </div>
            <div aria-live="polite" aria-atomic="false">
              {narration && narration.turn === room.turn && (
                <p className="di-generated-narration">{narration.text}</p>
              )}
              {recentEvents.length === 0 ? (
                <p className="di-muted">
                  The next line of the story is yours. Choose a token to make
                  your first move.
                </p>
              ) : (
                recentEvents.map((event) => (
                  <div
                    className={`di-story-event ${event.actorId === userId ? 'di-own-event' : ''}`}
                    key={event.id}
                  >
                    {event.roll !== undefined ? (
                      <span
                        className={`di-roll ${event.success ? 'di-roll-success' : ''}`}
                        title={`Rolled ${event.roll}${event.modifier !== undefined ? ` + ${event.modifier}` : ''}`}
                      >
                        {event.roll}
                      </span>
                    ) : (
                      <span className="di-event-icon">
                        <Sparkles size={16} />
                      </span>
                    )}
                    <div className="di-event-content">
                      {event.actorId === userId && (
                        <span className="di-event-you">Your move</span>
                      )}
                      <p>{event.text}</p>
                      {event.effect && (
                        <p className="di-event-effect">{event.effect}</p>
                      )}
                      {event.change && <p className="di-event-change"><strong>{event.change.title}.</strong> {event.change.text}</p>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
          <details className="di-journal">
            <summary>
              <BookOpen size={17} /> The story journal{' '}
              <span>{room.events.length} moments</span>
              <ChevronDown size={16} />
            </summary>
            <div>
              {room.events
                .slice()
                .reverse()
                .map((event) => (
                  <p key={event.id}>
                    <small>
                      CH. {event.chapter + 1} · TURN {event.turn}
                      {event.actorId === userId ? ' · YOU' : ''}
                    </small>
                    {event.text}
                    {event.effect && (
                      <span className="di-journal-effect">{event.effect}</span>
                    )}
                  </p>
                ))}
            </div>
          </details>
        </div>
        <aside className="di-play-column">
          {room.status !== 'completed' && (
            <section className="di-action-panel">
              <div className="di-turn-header">
                <div>
                  <span className="di-eyebrow">
                    {pending
                      ? 'Pulling up a chair'
                      : paused
                        ? 'Your story is saved'
                        : room.phase === 'reveal'
                          ? 'The story moves forward'
                          : committed
                            ? 'Your move is in'
                            : 'A little courage goes a long way'}
                  </span>
                  <h2>
                    {pending
                      ? 'You’re joining next.'
                      : paused
                        ? 'Ready when you are.'
                        : room.phase === 'reveal'
                          ? 'A moment of magic.'
                          : committed
                            ? 'Nicely played.'
                            : 'What do you do?'}
                  </h2>
                </div>
                <div
                  className={`di-timer ${!paused && seconds <= 8 && room.phase === 'choosing' ? 'di-timer-urgent' : ''}`}
                  aria-label={
                    paused
                      ? room.status === 'parked'
                        ? 'Adventure paused'
                        : 'You are away from the table'
                      : `${seconds} seconds ${room.phase === 'reveal' ? 'until next turn' : 'to choose'}`
                  }
                >
                  {paused ? <Clock3 size={18} /> : <span>{seconds}</span>}
                  <small>
                    {paused
                      ? room.status === 'parked'
                        ? 'paused'
                        : 'away'
                      : 'sec'}
                  </small>
                </div>
              </div>
              <div className="di-time-track">
                <span
                  style={{
                    width: paused
                      ? '0%'
                      : `${Math.min(100, (seconds / (room.phase === 'choosing' ? 30 : 6)) * 100)}%`,
                  }}
                />
              </div>
              {pending ? (
                <div className="di-waiting">
                  <Users size={30} />
                  <h3>Your seat is saved.</h3>
                  <p>
                    You’ll replace an AI companion at the next turn. Take a
                    moment to read the scene.
                  </p>
                </div>
              ) : away ? (
                <div className="di-waiting" role="status">
                  <DoorOpen size={28} />
                  <h3>There’s still a place for you.</h3>
                  <p>
                    Your seat was released while you were away. Your progress is
                    safe.
                    {room.status === 'parked'
                      ? ' The adventure is paused until someone rejoins.'
                      : ' Rejoin when you’re ready to make your next move.'}
                  </p>
                  <button
                    className="di-button di-primary"
                    disabled={loading}
                    onClick={() => void joinRoom(room.code)}
                  >
                    Rejoin the adventure <ArrowRight size={16} />
                  </button>
                </div>
              ) : room.phase === 'reveal' ? (
                <div className="di-waiting">
                  <Dices size={36} />
                  <h3>{myLastMove?.turn === room.turn ? myLastMove.change?.title ?? (myLastMove.success ? 'Your move made a difference.' : 'A complication opens the next step.') : 'See what you set in motion.'}</h3>
                  {myLastMove?.turn === room.turn && <>
                    <p>{myLastMove.change?.text ?? myLastMove.text}</p>
                    <p className="di-result-effect">Rolled {myLastMove.roll} + {myLastMove.modifier ?? 0} · {myLastMove.effect}</p>
                    {myLastMove.change && <p>{myLastMove.change.next}</p>}
                  </>}
                  <p>
                    Your next move opens automatically in {seconds}s.
                  </p>
                  <a
                    href="#di-result-anchor"
                    className="di-text-button"
                    onClick={(event) => {
                      event.preventDefault();
                      document
                        .querySelector('.di-recent-actions')
                        ?.scrollIntoView({
                          behavior: matchMedia(
                            '(prefers-reduced-motion: reduce)',
                          ).matches
                            ? 'auto'
                            : 'smooth',
                          block: 'nearest',
                        });
                    }}
                  >
                    Read the results <ArrowDown size={15} />
                  </a>
                </div>
              ) : committed ? (
                <div className="di-waiting">
                  <span className="di-committed-check">
                    <Check size={28} />
                  </span>
                  <h3>
                    {room.commits[userId].token === 'spotlight'
                      ? (room.commits[userId].proposal?.label ??
                        'Your bright idea')
                      : `${tokens.find((item) => item.kind === room.commits[userId].token)?.label ?? 'Action'} committed`}
                  </h3>
                  <p>
                    {chosenCount} of {humanSeats.length} adventurers ready. The
                    party moves as soon as everyone chooses.
                  </p>
                  <span className="di-soft-tag">
                    Next move in {seconds}s or sooner
                  </span>
                </div>
              ) : seat ? (
                <ActionChoices
                  room={room}
                  character={seat.character}
                  downed={seat.hp === 0}
                />
              ) : null}
              {!committed && room.phase === 'choosing' && !pending && !away && (
                <p className="di-turn-note">
                  {chapter.combat
                    ? 'No move? You’ll defend this turn.'
                    : 'No move? You’ll sit this turn out.'}{' '}
                  No rare tokens are spent.
                </p>
              )}
            </section>
          )}
            {myLastMove && room.phase !== 'reveal' && <section className="di-personal-result" key={myLastMove.id} aria-label="Your last move" aria-live="polite">
            <div className={`di-result-die ${myLastMove.success ? 'di-result-success' : ''}`} aria-label={`Rolled ${myLastMove.roll} plus ${myLastMove.modifier ?? 0}`}>
              <Dices size={18} /><strong>{myLastMove.roll}</strong><small>+{myLastMove.modifier ?? 0}</small>
            </div>
            <div><span className="di-eyebrow">Your last move · Turn {myLastMove.turn}</span>
              <h3>{myLastMove.change?.title ?? (myLastMove.success ? 'You moved the story forward.' : 'A complication. An opening.')}</h3>
              <p>{myLastMove.change?.text ?? myLastMove.text}</p>
              <p className="di-result-effect">{myLastMove.effect}</p>
              {myLastMove.change && <p className="di-next-opening"><ArrowRight size={13} /> {myLastMove.change.next}</p>}
            </div>
          </section>}
          <Chat room={room} />
          {participant && participant.actions > 0 && (
            <div className="di-visit-progress">
              <Sparkles size={17} />
              <span>
                Your visit so far{' '}
                <strong>
                  {participant.actions}{' '}
                  {participant.actions === 1 ? 'contribution' : 'contributions'}{' '}
                  · +{participant.xp} XP
                </strong>
              </span>
            </div>
          )}
          <p className="di-leave-note">
            <DoorOpen size={15} /> Life calling? Leave whenever. Your story
            stays.
          </p>
        </aside>
      </div>
    </main>
  );
}

function ActionChoices({
  room,
  character,
  downed,
}: {
  room: AdventureRoom;
  character: CharacterProfile;
  downed: boolean;
}) {
  const {
    userId,
    commitAction,
    propose,
    proposal,
    proposing,
    clearProposal,
    loading,
  } = useAdventureStore();
  const chapter = getScene(room);
  const [targetId, setTargetId] = useState(chapter.targets[0]?.id ?? '');
  const [token, setToken] = useState<TokenKind>('investigate');
  const [showSpotlight, setShowSpotlight] = useState(false);
  const [idea, setIdea] = useState('');
  const guideKey = `dropinn-first-move-${userId}`;
  const [guideDismissed, setGuideDismissed] = useState(() => {
    try { return localStorage.getItem(guideKey) === 'seen'; } catch { return false; }
  });
  const dismissGuide = () => {
    setGuideDismissed(true);
    try { localStorage.setItem(guideKey, 'seen'); } catch { /* Guidance still dismisses for this visit. */ }
  };
  const target =
    chapter.targets.find((item) => item.id === targetId) ?? chapter.targets[0];
  const spent =
    room.players[userId]?.spotlightChapters.includes(room.chapter) ?? false;
  const available = target.tokens.filter(
    (item) => item !== 'spotlight' && (!downed || item === 'assist'),
  );
  const effectiveToken = available.includes(token) ? token : available[0];
  const description = effectiveToken
    ? describeAction(character.classKey, effectiveToken, target.id, room)
    : null;
  const relevantProposal =
    proposal?.turn === room.turn && proposal.targetId === target.id
      ? proposal
      : null;
  useEffect(() => {
    clearProposal();
    setShowSpotlight(false);
    setIdea('');
  }, [room.turn, clearProposal]);
  useEffect(() => {
    if (!chapter.targets.some((item) => item.id === targetId))
      setTargetId(chapter.targets[0]?.id ?? '');
  }, [room.chapter, targetId]);
  return (
    <div className="di-action-choices">
      {!guideDismissed && <aside className="di-first-move" aria-label="Your first move">
        <div><strong>A coin. A choice. Your story.</strong>
          <p>Drag a coin onto a scene card—or tap both. Read the effect, then press <b>Confirm move</b> beneath your coin. Bigger coins don’t change your odds.</p></div>
        <button type="button" className="di-icon-button" aria-label="Dismiss first-move guide" onClick={dismissGuide}><X size={16} /></button>
      </aside>}
      <ActionTable targets={chapter.targets} token={effectiveToken} targetId={target.id}
        downed={downed} disabled={loading} turn={room.turn}
        active={!showSpotlight} preview={description?.description ?? ''}
        onConfirm={() => { dismissGuide(); void commitAction({ token: effectiveToken, targetId: target.id }); }}
        onChoose={(nextToken, nextTarget) => {
          setToken(nextToken); setTargetId(nextTarget); setShowSpotlight(false); clearProposal();
        }} />
      {!showSpotlight && description && (
        <div className="di-action-preview">
          <div>
            <span className="di-eyebrow">
              {CHARACTER_CLASS_PRESETS[character.classKey].label} ·{' '}
              {traitLabels[description.trait]} +
              {character.traits[description.trait]}
            </span>
            <h3>{description.label}</h3>
            <p>{description.description}</p>
            <p className="di-selected-scene-detail">{target.description}</p>
          </div>
          <div className="di-check-label">
            <Dices size={14} /> Check total {description.dc}+ succeeds. Failure
            still moves the story.
          </div>
          <p className="di-fine">Place your coin, then confirm on its scene card.</p>
        </div>
      )}
      <button
        className={`di-spotlight-toggle ${showSpotlight ? 'di-spotlight-open' : ''}`}
        disabled={spent || downed}
        aria-expanded={showSpotlight}
        onClick={() => {
          setShowSpotlight(!showSpotlight);
          clearProposal();
        }}
      >
        <span className="di-spotlight-icon">
          <Sparkles size={21} />
        </span>
        <span>
          <strong>
            {spent ? 'A Spotlight well spent' : 'Or, try something unexpected'}
          </strong>
          <small>
            {spent
              ? 'A new token arrives next chapter'
              : downed
                ? 'Support your friends while downed'
                : 'Your Spotlight · one creative move per chapter'}
          </small>
        </span>
        {!spent && <ChevronDown size={17} />}
      </button>
      {showSpotlight && (
        <form
          className="di-spotlight-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (idea.trim()) void propose(idea.trim(), target.id);
          }}
        >
          <div className="di-suggested-ideas" role="group" aria-label="Suggested Spotlight ideas">
            <span className="di-eyebrow">Borrow a spark—or write your own</span>
            {spotlightSuggestions(room).map(suggestion => <button type="button" key={suggestion.label} disabled={proposing || loading}
              onClick={() => { setTargetId(suggestion.targetId); setIdea(suggestion.idea); clearProposal(); void propose(suggestion.idea, suggestion.targetId); }}>
              <Sparkles size={15} /><span><strong>{suggestion.label}</strong><small>{suggestion.idea}</small></span><ArrowRight size={14} />
            </button>)}
            <p className="di-fine">Suggested ideas work without AI. Review the attempt before spending your Spotlight.</p>
          </div>
          <label htmlFor="creative-idea">How would you change the scene?</label>
          <textarea
            id="creative-idea"
            value={idea}
            onChange={(event) => {
              setIdea(event.target.value);
              clearProposal();
            }}
            maxLength={280}
            rows={3}
            placeholder={spotlightExample(room)}
          />
          <p className="di-fine">
            Use something in the scene. We’ll show your attempt before you spend
            the token.
          </p>
          {relevantProposal ? (
            <div className="di-proposal" aria-live="polite">
              <span className="di-eyebrow">
                {relevantProposal.supported
                  ? 'Your idea, ready to try'
                  : 'Try this nearby idea'}
              </span>
              <h3>{relevantProposal.label}</h3>
              <p>{relevantProposal.description}</p>
              <span className="di-fine">
                {relevantProposal.supported
                  ? `On success: ${relevantProposal.effect}.`
                  : 'Your Spotlight token has not been spent.'}
              </span>
              {relevantProposal.supported ? (
                <button
                  type="button"
                  className="di-button di-primary di-full"
                  disabled={loading}
                  onClick={() => {
                    dismissGuide();
                    void commitAction({
                      token: 'spotlight',
                      targetId: target.id,
                      proposal: relevantProposal,
                    });
                  }}
                >
                  <Sparkles size={16} />
                  Spend Spotlight & try it
                </button>
              ) : (
                <button
                  type="button"
                  className="di-button di-secondary di-full"
                  onClick={() => {
                    setShowSpotlight(false);
                    clearProposal();
                  }}
                >
                  Use a standard token <ArrowRight size={16} />
                </button>
              )}
            </div>
          ) : (
            <button
              className="di-button di-secondary di-full"
              disabled={!idea.trim() || proposing}
            >
              {proposing ? (
                <LoaderCircle size={16} className="di-spin" />
              ) : (
                <Sparkles size={16} />
              )}{' '}
              {proposing ? 'Considering your idea…' : 'Preview my idea'}
            </button>
          )}
        </form>
      )}
    </div>
  );
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
      <details className="di-chat">
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
        <Modal
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
        </Modal>
      )}
    </>
  );
}
