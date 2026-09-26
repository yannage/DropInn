import type { AdventureRoom } from './types';
import type { PaidCollection } from './payments';

export const STARTER_PACK = {
  id: 'first-tales', name: 'First tales',
  adventures: ['briar-glen', 'last-flight-teacup', 'inn-misplaced-tomorrow', 'orchard-walked-away'],
} as const;
export const HAT_STYLES = [
  { id: 'shepherd-blue', hat: 'shepherd', label: 'Blue', kind: 'color', color: '#76aada', cost: 3 },
  { id: 'shepherd-green', hat: 'shepherd', label: 'Green', kind: 'color', color: '#87aa69', cost: 3 },
  { id: 'shepherd-red', hat: 'shepherd', label: 'Red', kind: 'color', color: '#d77968', cost: 3 },
  { id: 'shepherd-gold', hat: 'shepherd', label: 'Gold', kind: 'color', color: '#e2bd60', cost: 3 },
  { id: 'shepherd-feather', hat: 'shepherd', label: 'Feather trim', kind: 'trim', color: undefined, cost: 6 },
] as const;
export type HatStyle = typeof HAT_STYLES[number];
export interface Discovery {
  adventureId: string;
  adventureVersion: number;
  chapter: number;
  outcome: 'success' | 'mixed' | 'setback';
  endingId: string;
  text: string;
}
export interface ChapterCredit extends Discovery { roomId: string; at: number }
export interface CosmeticUnlocks { hats: string[]; styles: string[] }
export interface CollectionSnapshot extends CosmeticUnlocks {
  paid?: PaidCollection;
  earned: number;
  spent: number;
  discoveries: Discovery[];
}
export const emptyCollection = (): CollectionSnapshot => ({ earned: 0, spent: 0, hats: [], styles: [], discoveries: [] });
export const collectionUnlocks = (collection: CollectionSnapshot): CosmeticUnlocks => ({
  hats: [...new Set([...collection.hats, ...(collection.paid?.hats ?? [])])],
  styles: [...new Set([...collection.styles, ...(collection.paid?.styles ?? [])])],
});
export const threadBalance = (collection: CollectionSnapshot) => Math.max(0, collection.earned - collection.spent);
export const discoveryKey = (entry: Discovery) => `${entry.adventureId}:${entry.adventureVersion}:${entry.chapter}:${entry.outcome}:${entry.endingId}`;
export const creditKey = (entry: ChapterCredit) => `${entry.roomId}:${entry.chapter}`;
/** Cumulative snapshots may arrive out of order during a craft or a reward refresh. */
export function mergeCollection(a: CollectionSnapshot, b: CollectionSnapshot): CollectionSnapshot {
  const paid = !a.paid || (b.paid && (a.paid.environment !== b.paid.environment || b.paid.revision >= a.paid.revision)) ? b.paid : a.paid;
  return { ...(paid ? { paid } : {}), earned: Math.max(a.earned, b.earned), spent: Math.max(a.spent, b.spent),
    hats: [...new Set([...a.hats, ...b.hats])], styles: [...new Set([...a.styles, ...b.styles])],
    discoveries: [...new Map([...a.discoveries, ...b.discoveries].map(d => [discoveryKey(d), d])).values()] };
}
/** Local preview equivalent of the transactional hosted craft operation. */
export function craftCollection(collection: CollectionSnapshot, recipeId: string): CollectionSnapshot {
  const recipe = HAT_STYLES.find(style => style.id === recipeId);
  if (!recipe) throw new Error('Choose an available style.');
  if (collection.styles.includes(recipe.id)) return collection;
  if (!collection.hats.includes(recipe.hat)) throw new Error('Earn the Shepherd’s floppy hat in The missing livestock first.');
  if (threadBalance(collection) < recipe.cost) throw new Error(`This style needs ${recipe.cost} Thread.`);
  return { ...collection, spent: collection.spent + recipe.cost, styles: [...collection.styles, recipe.id] };
}
/** Only new pilot tables issue Thread; historical keepsakes are still backfilled. */
export function chapterCredits(room: AdventureRoom, userId: string): ChapterCredit[] {
  const adventureId = room.adventureId ?? 'briar-glen';
  if (room.collectionVersion !== 1 || !STARTER_PACK.adventures.some(id => id === adventureId)) return [];
  return room.outcomes.filter(outcome => room.events.some(event => event.chapter === outcome.chapter && event.kind === 'action'
    && event.actorId === userId && (event.contribution === true || event.roll !== undefined))).map(outcome => ({
    roomId: room.id, adventureId, adventureVersion: room.adventureVersion ?? 1, chapter: outcome.chapter,
    outcome: outcome.result, text: outcome.text, at: outcome.at,
    endingId: outcome.chapter === 2 ? room.storyBranch ?? (adventureId === 'briar-glen'
      ? outcome.result !== 'success' ? 'unresolved' : room.flags.includes('ward-repaired') ? 'restored' : 'driven-away' : '') : '',
  }));
}
