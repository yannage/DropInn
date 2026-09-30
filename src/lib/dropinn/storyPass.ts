export const STORY_PASS = {
  id: 'first-tales-pass',
  name: 'First Tales Story Pass',
  version: 1,
  stories: ['briar-glen', 'last-flight-teacup', 'inn-misplaced-tomorrow', 'orchard-walked-away'],
  pointsPerStep: 100,
  steps: 10,
  saleDays: 56,
} as const;

export type PassTier = 'free' | 'standard' | 'super';
export interface PassCredit {
  roomId: string;
  adventureId: string;
  adventureVersion: number;
  chapter: number;
  at: number;
}
export interface PassQuest {
  id: string;
  label: string;
  current: number;
  target: number;
  points: number;
  done: boolean;
}
export interface PassProgress {
  id: string;
  version: number;
  tier: PassTier;
  points: number;
  step: number;
  quests: PassQuest[];
  credits: PassCredit[];
  items: string[];
  hats: string[];
}

export const PASS_REWARDS = [
  { step: 1, id: 'hair:wayward-curls', label: 'Wayward Curls' },
  { step: 2, id: 'eyes:starry', label: 'Starry Eyes' },
  { step: 3, id: 'nose:rosy-button', label: 'Rosy Button nose' },
  { step: 4, id: 'title:tale-seeker', label: 'the Tale Seeker' },
  { step: 5, id: 'color:moonlit-blue', label: 'Moonlit Blue' },
  { step: 6, id: 'mouth:victorious', label: 'Victorious Grin' },
  { step: 7, id: 'shoes:trail-boots', label: 'Trail Boots' },
  { step: 8, id: 'hair:cloud-tuft', label: 'Cloud Tuft' },
  { step: 9, id: 'title:keeper-first-tales', label: 'the Keeper of First Tales' },
  { step: 10, id: 'shoes:ruby', label: 'Ruby Shoes' },
] as const;

export const PASS_TITLES = [
  { id: 'tale-seeker', label: 'the Tale Seeker' },
  { id: 'keeper-first-tales', label: 'the Keeper of First Tales' },
  { id: 'inn-patron', label: 'the Inn’s Patron' },
  { id: 'gilded-taleweaver', label: 'the Gilded Taleweaver' },
] as const;

export const PASS_FREE_HATS: Record<string, string> = {
  'last-flight-teacup': 'pilot-cap',
  'inn-misplaced-tomorrow': 'breakfast-nightcap',
  'orchard-walked-away': 'apple-blossom-crown',
};

export const STORY_PASS_PRODUCTS = [
  { id: 'first-tales-standard', amount: 500, tier: 'standard' },
  { id: 'first-tales-super', amount: 1000, tier: 'super' },
  { id: 'first-tales-upgrade', amount: 500, tier: 'super' },
] as const;

export function passSale(launchAt?: string | null, now = Date.now()) {
  const start = launchAt ? Date.parse(launchAt) : NaN;
  if (!Number.isFinite(start)) return { startsAt: null, endsAt: null, open: false };
  const end = start + STORY_PASS.saleDays * 86_400_000;
  return { startsAt: new Date(start).toISOString(), endsAt: new Date(end).toISOString(), open: now >= start && now < end };
}

export function storyPassProgress(input: readonly PassCredit[], tier: PassTier): PassProgress {
  const credits = [...new Map(input.filter(c => STORY_PASS.stories.some(id => id === c.adventureId) && Number.isInteger(c.chapter) && c.chapter >= 0 && c.chapter < 3)
    .map(c => [`${c.roomId}:${c.chapter}`, c])).values()];
  const endings = credits.filter(c => c.chapter === 2);
  const quests: PassQuest[] = [];
  for (const id of STORY_PASS.stories) {
    const count = new Set(endings.filter(c => c.adventureId === id).map(c => c.roomId)).size;
    quests.push({ id: `${id}:first`, label: `Finish ${id} once`, current: Math.min(count, 1), target: 1, points: 100, done: count >= 1 });
    quests.push({ id: `${id}:third`, label: `Finish ${id} three times`, current: Math.min(count, 3), target: 3, points: 100, done: count >= 3 });
  }
  for (const target of [1, 6, 12, 18]) quests.push({ id: `chapters:${target}`, label: `Contribute to ${target} completed chapters`, current: Math.min(credits.length, target), target, points: 100, done: credits.length >= target });
  const distinct = new Set(endings.map(c => c.adventureId)).size;
  quests.push({ id: 'all-stories', label: 'Finish all four stories', current: distinct, target: 4, points: 100, done: distinct >= 4 });
  const points = Math.min(STORY_PASS.pointsPerStep * STORY_PASS.steps, quests.reduce((total, quest) => total + (quest.done ? quest.points : 0), 0));
  const step = points / STORY_PASS.pointsPerStep;
  const items: string[] = tier === 'free' ? [] : PASS_REWARDS.filter(reward => reward.step <= step || (tier === 'super' && reward.step <= 2)).map(reward => reward.id);
  if (tier === 'super') {
    items.push('frame:inn-border');
    if (step >= 4) items.push('title:inn-patron');
    if (step >= 9) items.push('title:gilded-taleweaver');
    if (step >= 10) items.push('shoes:ruby-sparkle');
  }
  const hats = [...new Set(endings.map(c => PASS_FREE_HATS[c.adventureId]).filter((id): id is string => !!id))];
  return { id: STORY_PASS.id, version: STORY_PASS.version, tier, points, step, quests, credits, items, hats };
}
