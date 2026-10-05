import { ADVENTURES, adventureFor, type AdventureDefinition } from './registry';

export const storyChoiceKey = (story: Pick<AdventureDefinition, 'id' | 'version'>) => `${story.id}@${story.version}`;
export function storyEdition(story: Pick<AdventureDefinition, 'id' | 'version'>) {
  if (story.id === 'avalon') return 'Living world';
  if (story.id === 'mosswater') return 'Quest crawl';
  if (story.id === 'gemward') return story.version === 3 ? 'Story table' : story.version === 2 ? 'Branching map' : 'Original expedition';
  return 'Classic tale';
}
export function storyPlayStyle(story: Pick<AdventureDefinition, 'id' | 'version'>) {
  if (story.id === 'avalon') return 'Arrive somewhere new in a familiar woodland. Follow clues, make promises and choose which troubles become your adventure.';
  if (story.id === 'mosswater') return 'Take turns exploring six places. Build your hero, fight together, or find a peaceful way.';
  if (story.id === 'gemward') return story.version === 3
    ? 'Prepare a plan together, play a scene, and watch its consequences unfold on the table.'
    : story.version === 2 ? 'Choose a branch together. Find quest items and follow your party’s trail across the map.'
    : 'Explore the town, gather clues, and uncover the missing prism across three chapters.';
  return 'Choose your moves together through three short chapters. Companions fill the empty seats.';
}

/** Explicit comparison releases stay available without changing current or pinned definitions. */
export const STORY_CHOICES = [
  adventureFor({ adventureId: 'avalon', adventureVersion: 1 }),
  adventureFor({ adventureId: 'mosswater', adventureVersion: 1 }),
  adventureFor({ adventureId: 'gemward', adventureVersion: 3 }),
  adventureFor({ adventureId: 'gemward', adventureVersion: 2 }),
  ...ADVENTURES.filter(story => !['avalon', 'mosswater', 'gemward'].includes(story.id)),
  adventureFor({ adventureId: 'gemward', adventureVersion: 1 }),
];

export function selectedStory(saved: string | null) {
  // Older preferences contain only the story ID; keep their current-release behavior.
  return STORY_CHOICES.find(story => storyChoiceKey(story) === saved)
    ?? ADVENTURES.find(story => story.id === saved) ?? STORY_CHOICES[0];
}
