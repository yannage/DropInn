import { CHAPTERS } from './content';
import { NEW_ADVENTURES } from './adventures';
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
export const ADVENTURES: AdventureDefinition[] = [
  { id: DEFAULT_ADVENTURE, version: 1, title: 'Briar Glen: The Broken Bell', pitch: 'Follow a missing herd and restore a fallen guardian.', chapters: CHAPTERS },
  ...NEW_ADVENTURES,
];

/** Keep published versions addressable. Missing fields identify legacy Briar Glen rooms. */
export function adventureFor(value: { adventureId?: string; adventureVersion?: number } = {}): AdventureDefinition {
  const id = value.adventureId ?? DEFAULT_ADVENTURE;
  const version = value.adventureVersion ?? 1;
  const definition = ADVENTURES.find(item => item.id === id && item.version === version);
  if (!definition) throw new Error('This adventure version is unavailable. Please update the app or contact the host.');
  return definition;
}
export const chaptersFor = (value: { adventureId?: string; adventureVersion?: number }) => adventureFor(value).chapters;
