import { HERO_HATS, hatForKeepsake } from '../cosmetics';
import { HAT_STYLES, STARTER_PACK, collectionUnlocks, threadBalance, type CollectionSnapshot } from './collection';
import { chaptersFor } from './registry';
import type { VisitRecap } from './types';

export function nextLook(collection: CollectionSnapshot, goalId: string | null) {
  const available = HAT_STYLES.filter(style => !collection.styles.includes(style.id));
  const style = available.find(style => style.id === goalId) ?? available[0];
  if (!style) return null;
  const hat = HERO_HATS.find(hat => hat.id === style.hat)!;
  const baseOwned = collection.hats.includes(hat.id);
  const balance = threadBalance(collection);
  return { style, hat, baseOwned, balance, ready: baseOwned && balance >= style.cost,
    label: style.kind === 'color' ? `${style.label} Shepherd’s hat` : 'Shepherd’s hat with feather trim' };
}

export function storyRewards(identity: { adventureId?: string; adventureVersion?: number }, collection: CollectionSnapshot, chapter?: number, collectionVersion?: number) {
  const chapters = chaptersFor(identity);
  const hats = chapters.flatMap((entry, index) => {
    if (chapter !== undefined && index !== chapter) return [];
    const hat = hatForKeepsake(entry.keepsake);
    return hat ? [{ hat, chapter: entry.title, owned: collectionUnlocks(collection).hats.includes(hat.id) }] : [];
  });
  return { hats, earnsThread: collectionVersion === 1 && STARTER_PACK.adventures.some(id => id === (identity.adventureId ?? 'briar-glen')) };
}

/** A live receipt can announce a new hat only against known pre-receipt ownership. */
export function newlyEarnedHats(recap: VisitRecap, owned: readonly string[], previousKeepsakes: readonly string[], live: boolean) {
  if (!live) return [];
  return recap.keepsakes.flatMap(item => {
    const hat = hatForKeepsake(item);
    return hat && !owned.includes(hat.id) && !previousKeepsakes.includes(item) ? [hat.id] : [];
  });
}
