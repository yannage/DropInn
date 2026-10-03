import { CHAPTERS } from './content';
import { NEW_ADVENTURES } from './adventures';
import { BRIAR_COMBINATIONS } from './combinations';
import { CHAPTER_CHOICES } from './chapterChoiceContent';
import type { ChapterDefinition } from './types';
import { GEMWARD_DEFINITION } from './expedition';
import { JOURNEY_DEFINITION, STORY_TABLE_DEFINITION } from './journey';

export interface AdventureDefinition {
  id: string;
  version: number;
  title: string;
  pitch: string;
  chapters: ChapterDefinition[];
  branchEndings?: Record<string, string>;
  closing?: Record<string, { artKey: string; caption: string }>;
}
export const DEFAULT_ADVENTURE = 'briar-glen';
export const ADVENTURE_VERSIONS: AdventureDefinition[] = [
  { id: DEFAULT_ADVENTURE, version: 1, title: 'Briar Glen: The Broken Bell', pitch: 'Follow a missing herd and restore a fallen guardian.', chapters: CHAPTERS },
  { id: DEFAULT_ADVENTURE, version: 2, title: 'Briar Glen: The Broken Bell', pitch: 'Prepare a little magic together. Follow the herd and restore a fallen guardian.', chapters: CHAPTERS.map((chapter, index) => ({ ...chapter, combination: BRIAR_COMBINATIONS[index] })) },
  { id: DEFAULT_ADVENTURE, version: 3, title: 'Briar Glen: The Broken Bell', pitch: 'Brave a river crossing, save what you can, and face the fallen guardian together.', chapters: CHAPTERS.map((chapter, index) => ({
    ...chapter, combination: BRIAR_COMBINATIONS[index],
    ...(index === 1 ? {
      riverSupplies: true as const, firstTarget: 'boat',
      targets: chapter.targets.map(target => target.id === 'boat' ? { ...target, name: 'The loaded boat', artKey: 'boat-afloat', tokens: ['fight', 'assist'] as import('./types').TokenKind[] } : target),
      intro: 'The shadow pack guards the crossing while a loaded boat drifts against its rope. Its supplies will help at the chapel, but the current will carry them away after river round 3—or sooner if you leave them behind.',
      situation: 'The pack closes in. Secure the drifting supplies, risk rushing them across, or press on without them.',
      objective: 'Cross the river and decide what supplies to save.',
      catchUp: 'The missing herd was taken to the ruined chapel. The supplies in the drifting boat could help there; protect them before the third river round ends or you cross.',
      endings: { ...chapter.endings, setback: 'A desperate crossing gets everyone to the chapel. A ward-mark on the boat reveals how its fallen guardian can be freed.' },
    } : {}),
  })) },
  ...NEW_ADVENTURES,
  GEMWARD_DEFINITION,
  JOURNEY_DEFINITION,
  STORY_TABLE_DEFINITION,
];
// Add new rules without mutating any definition used by an already-pinned room.
const briarThree = ADVENTURE_VERSIONS.find(item => item.id === DEFAULT_ADVENTURE && item.version === 3)!;
ADVENTURE_VERSIONS.push({
  ...briarThree, version: 4,
  pitch: 'Prepare a shelter, brave the river, and give the guardian a way home.',
  chapters: briarThree.chapters.map((chapter, index) => index === 1 ? chapter : {
    ...chapter, combination: undefined, choice: CHAPTER_CHOICES[chapter.id],
  }),
});
ADVENTURE_VERSIONS.push(...NEW_ADVENTURES.map(adventure => ({
  ...adventure, version: 2,
  chapters: adventure.chapters.map(chapter => ({ ...chapter, choice: CHAPTER_CHOICES[chapter.id] })),
})));
/** Discovery selects current releases; snapshot readers always resolve pinned versions. */
export const ADVENTURES = ADVENTURE_VERSIONS.filter(item => !ADVENTURE_VERSIONS.some(other => other.id === item.id && other.version > item.version));
export function currentAdventure(id = DEFAULT_ADVENTURE): AdventureDefinition {
  const definition = ADVENTURES.find(item => item.id === id);
  if (!definition) throw new Error('This adventure is unavailable.');
  return definition;
}

/** Keep published versions addressable. Missing fields identify legacy Briar Glen rooms. */
export function adventureFor(value: { adventureId?: string; adventureVersion?: number } = {}): AdventureDefinition {
  const id = value.adventureId ?? DEFAULT_ADVENTURE;
  const version = value.adventureVersion ?? 1;
  const definition = ADVENTURE_VERSIONS.find(item => item.id === id && item.version === version);
  if (!definition) throw new Error('This adventure version is unavailable. Please update the app or contact the host.');
  return definition;
}
export const chaptersFor = (value: { adventureId?: string; adventureVersion?: number }) => adventureFor(value).chapters;
