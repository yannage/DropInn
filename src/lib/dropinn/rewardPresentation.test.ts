import { describe, expect, it } from 'vitest';
import { createCharacterProfile } from '../character';
import { createAdventure, getVisitRecap, summarizeRoom } from './engine';
import { emptyCollection, HAT_STYLES } from './collection';
import { newlyEarnedHats, nextLook, storyRewards } from './rewardPresentation';

describe('cosmetic reward presentation', () => {
  it('suggests an unowned look without changing a chosen goal or collection', () => {
    const collection = { ...emptyCollection(), earned: 2, hats: ['shepherd'] };
    expect(nextLook(collection, null)).toMatchObject({ style: { id: 'shepherd-blue' }, ready: false, balance: 2 });
    expect(nextLook(collection, 'shepherd-feather')?.style.id).toBe('shepherd-feather');
    expect(collection.styles).toEqual([]);
    collection.styles.push('shepherd-feather', 'shepherd-blue');
    expect(nextLook(collection, 'shepherd-feather')?.style.id).toBe('shepherd-green');
    collection.styles = HAT_STYLES.map(style => style.id);
    expect(nextLook(collection, null)).toBeNull();
  });
  it('requires both the base hat and sufficient unspent Thread', () => {
    const collection = { ...emptyCollection(), earned: 6, spent: 3 };
    expect(nextLook(collection, null)).toMatchObject({ baseOwned: false, ready: false, balance: 3 });
    collection.hats.push('shepherd');
    expect(nextLook(collection, null)?.ready).toBe(true);
    expect(nextLook(collection, 'shepherd-feather')?.ready).toBe(false);
  });
  it('shows chapter-specific hats, shared Thread, and no Thread promise on old tables', () => {
    const collection = { ...emptyCollection(), hats: ['shepherd'] };
    const briar = storyRewards({ adventureId: 'briar-glen' }, collection, undefined, 1);
    expect(briar.hats.map(entry => [entry.hat.id, entry.owned])).toEqual([['shepherd', true], ['reed', false], ['moonstone', false]]);
    expect(storyRewards({ adventureId: 'briar-glen' }, collection, 1, 1).hats.map(entry => entry.hat.id)).toEqual(['reed']);
    expect(storyRewards({ adventureId: 'last-flight-teacup' }, collection, undefined, 1)).toEqual({ hats: [], earnsThread: true });
    const room = createAdventure(createCharacterProfile('Wren', 'wizard'), 'alice', 1000, 'REWARD');
    expect(summarizeRoom(room).collectionVersion).toBe(1);
    delete room.collectionVersion;
    const summary = summarizeRoom(room);
    expect(storyRewards(summary, collection, summary.chapter, summary.collectionVersion).earnsThread).toBe(false);
  });
  it('announces only newly observed live hats, never repeats or historical recovery', () => {
    const room = createAdventure(createCharacterProfile('Wren', 'wizard'), 'alice', 1000, 'REWARD');
    room.players.alice.keepsakes = ['Mara’s copper bell'];
    const recap = getVisitRecap(room, 'alice');
    expect(newlyEarnedHats(recap, [], [], true)).toEqual(['shepherd']);
    expect(newlyEarnedHats(recap, ['shepherd'], [], true)).toEqual([]);
    expect(newlyEarnedHats(recap, [], recap.keepsakes, true)).toEqual([]);
    expect(newlyEarnedHats(recap, [], [], false)).toEqual([]);
    expect(newlyEarnedHats(getVisitRecap(room, 'spectator'), [], [], true)).toEqual([]);
  });
});
