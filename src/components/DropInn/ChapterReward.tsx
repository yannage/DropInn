import type { AdventureRoom } from '../../lib/dropinn/types';
import { chaptersFor } from '../../lib/dropinn/registry';
import { chapterCredits } from '../../lib/dropinn/collection';
import { nextLook } from '../../lib/dropinn/rewardPresentation';
import { hatForKeepsake } from '../../lib/cosmetics';
import { useAdventureStore } from '../../store/adventureStore';
import { HeroHatPreview } from './HeroAvatar';
import { KeepsakeArtwork } from './KeepsakeArtwork';

export function ChapterReward({ room }: { room: AdventureRoom }) {
  const { userId, collection, collectionGoal, newRewardHats } = useAdventureStore();
  const scene = chaptersFor(room)[room.chapter];
  const participant = room.players[userId];
  const earnedKeepsake = participant?.keepsakes.includes(scene.keepsake);
  const hat = earnedKeepsake ? hatForKeepsake(scene.keepsake) : undefined;
  const credit = chapterCredits(room, userId).some(credit => credit.chapter === room.chapter);
  const next = nextLook(collection, collectionGoal);
  const isNew = hat && newRewardHats[`${room.code}:${participant?.character.id}`]?.includes(hat.id);
  return <div className="di-party-keepsake di-chapter-reward" role="status">
    {hat ? <HeroHatPreview hat={hat}/> : earnedKeepsake ? <KeepsakeArtwork name={scene.keepsake}/> : null}
    <div><span>Chapter {room.chapter + 1} complete</span>
      {hat ? <strong>{isNew ? 'New hat unlocked' : 'In your collection'}: {hat.label}</strong> : earnedKeepsake ? <strong>{scene.keepsake}</strong> : null}
      {credit && <span>+1 Thread{next ? ` · ${next.label}: ${Math.min(next.balance, next.style.cost)}/${next.style.cost}` : ' · All First tales styles collected'}</span>}
      {credit && next && <small>{!next.baseOwned ? 'Unlock the base hat in Briar Glen.' : next.ready ? 'Ready to unlock after your visit.' : 'Replay any First tales story to earn more Thread.'}</small>}
      {hat && !credit && <small>Ready to wear after your visit.</small>}
    </div>
  </div>;
}
