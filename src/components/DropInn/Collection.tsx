import type { CharacterProfile } from '../../lib/character';
import { HERO_HATS, type HeroEquipment } from '../../lib/cosmetics';
import { HAT_STYLES, STARTER_PACK, threadBalance } from '../../lib/dropinn/collection';
import { ADVENTURES } from '../../lib/dropinn/registry';
import { useAdventureStore } from '../../store/adventureStore';
import { HeroHatPreview } from './HeroAvatar';
import './collection.css';

export function CollectionGoal({ earned }: { earned?: number }) {
  const collection = useAdventureStore(state => state.collection);
  const goalId = useAdventureStore(state => state.collectionGoal);
  const goal = HAT_STYLES.find(style => style.id === goalId);
  return <span className="di-thread-goal">{earned !== undefined ? `+${earned} Thread` : `${threadBalance(collection)} Thread`}
    {goal && <> · {goal.label}: {collection.styles.includes(goal.id) ? 'unlocked' : `${Math.min(threadBalance(collection),goal.cost)}/${goal.cost}`}</>}
  </span>;
}

export function CollectionWardrobe({ hero, onEquip }: { hero: CharacterProfile; onEquip: (equipment: HeroEquipment) => void }) {
  const { collection, collectionGoal, setCollectionGoal, craftStyle, pendingCraft, loading, error } = useAdventureStore();
  const hat = HERO_HATS.find(hat => hat.id === 'shepherd')!;
  const baseOwned = collection.hats.includes(hat.id);
  const balance = threadBalance(collection);
  const owned = HAT_STYLES.filter(style => collection.styles.includes(style.id)).length;
  return <section className="di-collection" aria-label="First tales collection">
    <h3>Make your keepsake yours.</h3>
    <p><strong>{STARTER_PACK.name} · {balance} Thread</strong> · {owned}/{HAT_STYLES.length} styles collected</p>
    <p>Contribute to a chapter in any of the four stories to earn 1 Thread when it closes. Every outcome counts. Styles belong to all your heroes and never expire.</p>
    {!baseOwned && <p>First earn the Shepherd’s floppy hat in Briar Glen’s <strong>The missing livestock</strong>. You can save Thread and choose a goal now.</p>}
    <p className="di-fine">Crafting unlocks a style permanently. Wearing it is optional; Save hero applies your outfit.</p>
    {pendingCraft && <p role="status">Checking {HAT_STYLES.find(style => style.id === pendingCraft.recipeId)?.label ?? 'your style'}. Retry the same craft safely.</p>}
    {error && <p role="alert">{error}</p>}
    <div className="di-style-grid">{HAT_STYLES.map(style => {
      const unlocked = collection.styles.includes(style.id);
      const selected = collectionGoal === style.id;
      const field = style.kind === 'color' ? 'hatColor' : 'hatTrim';
      const equipped = hero.equipment?.hat === hat.id && hero.equipment?.[field] === style.id;
      const pending = pendingCraft?.recipeId === style.id;
      return <article key={style.id} className={selected ? 'is-goal' : ''}>
        <HeroHatPreview hat={hat} hatColor={style.kind === 'color' ? style.id : undefined} hatTrim={style.kind === 'trim' ? style.id : undefined} />
        <h4>{style.label}</h4><p>{unlocked ? 'Yours permanently' : `${style.cost} Thread`}</p>
        <button type="button" aria-pressed={selected} onClick={() => setCollectionGoal(selected ? null : style.id)}>{selected ? `${style.label} goal selected` : `Aim for ${style.label}`}</button>
        {unlocked ? <button type="button" disabled={equipped} onClick={() => onEquip({ ...hero.equipment, hat:hat.id, [field]:style.id })}>{equipped ? `${style.label} selected` : `Wear ${style.label}`}</button>
          : <button type="button" disabled={loading || (!pending && (!baseOwned || balance < style.cost || !!pendingCraft))} onClick={() => void craftStyle(style.id)}>{pending ? `Retry ${style.label}` : `Craft ${style.label}`}</button>}
      </article>;
    })}</div>
    {hero.equipment?.hat === hat.id && <div className="di-style-reset">
      <button type="button" onClick={() => onEquip({ ...hero.equipment,hat:hat.id,hatColor:null })}>Original hat color</button>
      <button type="button" onClick={() => onEquip({ ...hero.equipment,hat:hat.id,hatTrim:null })}>Remove feather trim</button>
    </div>}
  </section>;
}

export function DiscoveryJournal() {
  const discoveries = useAdventureStore(state => state.collection.discoveries);
  return <section className="di-discoveries">
    <p className="di-eyebrow">First tales</p><h2>Your discoveries</h2>
    <p>A record of chapters you helped shape. Every route earns the same Thread. Unseen endings stay a surprise.</p>
    {ADVENTURES.map(adventure => {
      const entries = discoveries.filter(entry => entry.adventureId === adventure.id && entry.adventureVersion === adventure.version);
      const endings = new Set(entries.filter(entry => entry.chapter === 2).map(entry => entry.endingId));
      const routes = adventure.branchEndings ? Object.keys(adventure.branchEndings) : ['restored','driven-away'];
      return <article key={adventure.id}><h3>{adventure.title}</h3>
        <p>{new Set(entries.map(entry => entry.chapter)).size}/{adventure.chapters.length} chapters discovered</p>
        {entries.length === 0 ? <p>Your first chapter is waiting.</p> : adventure.chapters.map((chapter,index) => {
          const chapterEntries = entries.filter(entry => entry.chapter === index);
          return <div key={chapter.id}><h4>Chapter {index+1} · {chapter.title}</h4>{chapterEntries.length ? chapterEntries.map(entry =>
            <details key={`${entry.outcome}:${entry.endingId}`}><summary>{entry.outcome === 'success' ? 'Success' : entry.outcome === 'mixed' ? 'Mixed outcome' : 'Setback'} · Read your discovery</summary><p>{entry.text}</p></details>) : <p>Undiscovered</p>}</div>;
        })}
        {routes.some(route => !endings.has(route)) && <p className="di-fine">Another ending is waiting to be discovered.</p>}
      </article>;
    })}
  </section>;
}
