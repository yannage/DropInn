import { createContext, useContext, useState, useSyncExternalStore } from 'react';
import { useAdventureStore } from '../../store/adventureStore';
import { nextLook, storyRewards } from '../../lib/dropinn/rewardPresentation';
import { HeroHatPreview } from './HeroAvatar';
import './hero-progression.css';

export type HeroCustomizerTarget = { tab?: 'character' | 'hats'; hatId?: string; styleId?: string };
export const CustomizeHeroContext = createContext<(target?: HeroCustomizerTarget) => void>(() => {});
export const useCustomizeHero = () => useContext(CustomizeHeroContext);

const mobileQuery = '(max-width: 759px)';
const subscribeMobile = (notify: () => void) => {
  const query = window.matchMedia(mobileQuery);
  query.addEventListener('change', notify);
  return () => query.removeEventListener('change', notify);
};
const isMobile = () => window.matchMedia(mobileQuery).matches;
const useMobileLayout = () => useSyncExternalStore(subscribeMobile, isMobile, () => false);

export function NextLook({ compact = false }: { compact?: boolean }) {
  const collection = useAdventureStore(state => state.collection);
  const goalId = useAdventureStore(state => state.collectionGoal);
  const open = useCustomizeHero();
  const mobile = useMobileLayout();
  const next = nextLook(collection, goalId);
  if (!next) return <div className="di-next-look"><strong>All First tales styles collected.</strong><button type="button" onClick={() => open({ tab: 'hats' })}>View your hats</button></div>;
  if (compact && mobile) return <button type="button" className="di-next-look-link" aria-label={next.ready ? 'Unlock a new look' : 'Choose a look'} onClick={() => open({ tab: 'hats', hatId: next.hat.id, styleId: next.style.id })}>
    <HeroHatPreview hat={next.hat} hatColor={next.style.kind === 'color' ? next.style.id : undefined} hatTrim={next.style.kind === 'trim' ? next.style.id : undefined}/>
    <span><strong>Next: {next.label}</strong><small>{next.ready ? 'Ready to unlock' : `${Math.min(next.balance, next.style.cost)}/${next.style.cost} Thread`}{!next.baseOwned && ' · Earn base hat in Briar Glen'}</small></span><span aria-hidden="true">›</span>
  </button>;
  return <div className={`di-next-look ${compact ? 'is-compact' : ''}`}>
    <HeroHatPreview hat={next.hat} hatColor={next.style.kind === 'color' ? next.style.id : undefined} hatTrim={next.style.kind === 'trim' ? next.style.id : undefined} />
    <div><small>{goalId === next.style.id ? 'Your next look' : 'A look to work toward'}</small><strong>{next.label}</strong>
      <span>{next.ready ? `Ready to unlock · ${next.style.cost} Thread` : `${Math.min(next.balance, next.style.cost)}/${next.style.cost} Thread`}</span>
      {!next.baseOwned && <small>First unlock the Shepherd’s hat in Briar Glen.</small>}
      <button type="button" onClick={() => open({ tab: 'hats', hatId: next.hat.id, styleId: next.style.id })}>{next.ready ? 'Unlock a new look' : 'Choose a look'}</button>
    </div>
  </div>;
}

export function StoryRewards({ adventureId, adventureVersion, chapter, collectionVersion, collapsible = false }: { adventureId?: string; adventureVersion?: number; chapter?: number; collectionVersion?: number; collapsible?: boolean }) {
  const collection = useAdventureStore(state => state.collection);
  const goalId = useAdventureStore(state => state.collectionGoal);
  const next = nextLook(collection, goalId);
  const rewards = storyRewards({ adventureId, adventureVersion }, collection, chapter, collectionVersion);
  const mobile = useMobileLayout();
  const [expanded, setExpanded] = useState(false);
  const content = <div className="di-story-rewards" aria-label="Story rewards">
    {rewards.hats.map(({ hat, chapter: title, owned }) => <div className="di-story-hat" key={hat.id}><HeroHatPreview hat={hat} /><span><strong>{hat.label}</strong><small>{owned ? 'Collected' : 'Hat to unlock'} · {title}</small></span></div>)}
    {rewards.earnsThread && <>
      <p><strong>+1 Thread per contributed chapter</strong><span>Every outcome counts. {next ? 'Replay to unlock new colors and a feather for your Shepherd’s hat.' : 'All First tales styles collected. Keep earning Thread.'}</span></p>
      {next && (next.baseOwned || !rewards.hats.length) && <div className="di-story-hat">
        <HeroHatPreview hat={next.hat} hatColor={next.style.kind === 'color' ? next.style.id : undefined} hatTrim={next.style.kind === 'trim' ? next.style.id : undefined}/>
        <span><strong>Next look: {next.label}</strong><small>{next.ready ? 'Ready to unlock' : `${Math.min(next.balance, next.style.cost)}/${next.style.cost} Thread`}{!next.baseOwned && ' · Base hat comes from Briar Glen'}</small></span>
      </div>}
    </>}
  </div>;
  if (!collapsible || !mobile) return content;
  const nextHat = rewards.hats.find(entry => !entry.owned)?.hat;
  const preview = nextHat ?? next?.hat;
  return <details className="di-reward-disclosure" open={expanded} onToggle={event => setExpanded(event.currentTarget.open)}>
    <summary aria-label="View story rewards">
      {preview && <HeroHatPreview hat={preview} hatColor={!nextHat && next?.style.kind === 'color' ? next.style.id : undefined} hatTrim={!nextHat && next?.style.kind === 'trim' ? next.style.id : undefined}/>}
      <span><strong>{nextHat ? nextHat.label : next ? 'Thread for your next look' : 'Collection complete'}</strong><small>{rewards.earnsThread ? '+1 Thread/chapter' : 'Chapter keepsake'}</small></span>
    </summary>
    {content}
  </details>;
}
