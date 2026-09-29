import { CHAPTERS } from './content';
import { NEW_ADVENTURES } from './adventures';
import { BRIAR_COMBINATIONS } from './combinations';
import type { ChapterDefinition } from './types';

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
  ...NEW_ADVENTURES,
];
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
