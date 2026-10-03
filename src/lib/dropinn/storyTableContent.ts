/** Authored copy for pinned Gemward v3. This module does not resolve state. */
export const GEMWARD_STORY_COPY = {
  opening: 'Gemward’s beacon goes dark as the evening ferry approaches. Iris shows you an empty velvet stand. “That light brings our neighbours home. Can you help us find it?”',
  townObjective: 'Find a lead to the missing prism.',
  townCatchUp: 'Gemward’s beacon is dark and its prism is missing. Follow a lead, or help the neighbours before setting out.',
  townReady: 'You have a lead. Set out together, or make another preparation.',
  townNotReady: 'Ask Iris about prices or news, or find a lead at the docks.',
  repeat: 'Already recorded. The party still has this preparation.',
  setOutLabel: 'Set out together',
  setOutPreview: 'Gather the party. Everyone’s accepted work finishes, then you choose a route together.',
  finishLabel: 'Finish together',
  finishPreview: 'Finish after everyone’s accepted work.',
  finaleObjective: 'Prepare the light and neighbours, then finish together.',
  finaleReady: 'The light and neighbours are ready. Finish together, or arrange tomorrow’s repairs.',
  finaleNotReady: 'Prepare the light and the neighbours. Finish together becomes available on a later turn.',
  noChange: 'You confirm what the party already knows. No new preparation is added.',
  townCap: 'After six active rounds, the party sets out with the leads it has.',
  finaleCap: 'After four active rounds, the keeper completes the chosen ending with the preparations available.',
  pricingLabel: 'Ask about gem prices',
  newsLabel: 'Ask what has changed',
} as const;

export interface StoryTableFactCopy {
  label: string;
  preview: string;
  result: string;
  repeat: string;
  callback?: string;
}

export const GEMWARD_STORY_FACT_COPY: Record<string, StoryTableFactCopy> = {
  'ward-warning': {
    label: 'Beacon warning',
    preview: 'Learn what the beacon changes when it uses a prism.',
    result: 'The warning explains a lasting cost of using the prism.',
    repeat: 'The warning is already recorded. You can hear it again.',
  },
  'ledger-copy': {
    label: 'Delivery ledger',
    preview: 'Compare Iris’s prices with the unpaid delivery. Opens the warehouse path.',
    result: 'The copied ledger reveals an unpaid delivery. The warehouse path opens.',
    repeat: 'The delivery is already recorded. The warehouse path remains open.',
  },
  'canal-key': {
    label: 'Canal key',
    preview: 'Get permission to use the canal gate. Opens the canal path.',
    result: 'The canal key enters the shared pouch. The canal path opens.',
    repeat: 'The key is already in the pouch. The canal path remains open.',
  },
  'road-lead': {
    label: 'Hill-road lead',
    preview: 'Ask about the late delivery. Find a road lead and learn the watcher’s habit.',
    result: 'The late delivery crossed the hill road. You have a lead to follow.',
    repeat: 'The hill-road lead is already recorded. You can still follow it.',
  },
  'watcher-tell': {
    label: 'Watcher’s habit',
    preview: 'Learn the watcher’s blind turn. Adds 1 party progress when a battle begins, once.',
    result: 'The watcher checks the left bend first. The party knows an opening.',
    repeat: 'The watcher’s habit is already recorded; it cannot add a second opening.',
    callback: 'The party used the watcher’s habit to gain an opening.',
  },
  'packed-lantern': {
    label: 'Shuttered lantern',
    preview: 'Help Oren pack a lantern. Once, it prevents 1 damage from the first strike that gets through your protection. Unused if you avoid battle.',
    result: 'Oren packs a shuttered lantern to reveal an incoming strike.',
    repeat: 'Oren’s lantern is already recorded. Asking again cannot add or replenish its protection.',
    callback: 'Oren’s lantern helped the party see an incoming strike.',
  },
  'light-ready': {
    label: 'Light prepared',
    preview: 'Prepare the light for the chosen ending. The prism stays intact until you finish.',
    result: 'The light is prepared. The prism remains safe in the shared pouch.',
    repeat: 'The light is already prepared. The prism still waits for completion.',
    callback: 'The prepared light answers the keeper’s signal without a hurried repair.',
  },
  'people-ready': {
    label: 'Neighbours prepared',
    preview: 'Organize safe quay guides. They can bring the evening ferry home when you finish.',
    result: 'The neighbours prepare quay guides for the evening ferry.',
    repeat: 'The quay guides are already arranged. Their preparation remains ready.',
    callback: 'The neighbours’ quay guides bring the evening ferry safely home.',
  },
  'repair-plan': {
    label: 'Tomorrow’s repair crew',
    preview: 'Arrange tools and a repair crew for dawn. Adds a community payoff; the chosen cost remains.',
    result: 'The keeper gathers tools and volunteers. A repair crew will meet at dawn.',
    repeat: 'The dawn repair crew is already arranged. The chosen cost still stands.',
    callback: 'Because you arranged tools and volunteers, the repair crew will meet at dawn.',
  },
};

export function storyTableWarning(variant: 'smugglers' | 'ward'): string {
  return variant === 'smugglers'
    ? 'Once the beacon swallows a prism, its identifying mark is gone.'
    : 'The light inside a prism is alive. Putting it back will bind it again.';
}

export function storyTableCost(variant: 'smugglers' | 'ward', choice: 'restore' | 'release'): string {
  if (choice === 'restore') return variant === 'smugglers'
    ? 'Finish here to relight Gemward. The beacon consumes the prism and destroys its maker-mark evidence.'
    : 'Finish here to relight Gemward. The spark survives, bound to the beacon again.';
  return variant === 'smugglers'
    ? 'Finish here to release the light and preserve the maker-mark evidence. Gemward shares lanterns through dark evenings until repairs.'
    : 'Finish here to free the living spark. Gemward shares lanterns through dark evenings until repairs.';
}

export function storyTableEnding(
  variant: 'smugglers' | 'ward',
  choice: 'restore' | 'release',
  facts: readonly string[],
  missing: readonly string[] = [],
): string {
  const held = new Set(facts);
  const absent = new Set(missing);
  const result = [choice === 'restore'
    ? variant === 'smugglers'
      ? 'Gemward’s beacon shines again. It consumed the prism; the maker-mark evidence against the smugglers is gone.'
      : 'Gemward’s beacon shines again. Its living spark survives, bound to the beacon once more.'
    : variant === 'smugglers'
      ? 'The prism’s light is free and its maker mark remains evidence. Gemward shares lanterns through dark evenings until repairs.'
      : 'The living spark is free. Gemward shares lanterns through dark evenings while its beacon awaits repairs.'];
  if (held.has('light-ready')) result.push(GEMWARD_STORY_FACT_COPY['light-ready'].callback!);
  else if (absent.has('light-ready')) result.push('The light was not prepared; the keeper finishes the fitting with a hurried repair.');
  if (held.has('people-ready')) result.push(GEMWARD_STORY_FACT_COPY['people-ready'].callback!);
  else if (absent.has('people-ready')) result.push('The quay guides were not arranged, so the ferry waits safely offshore until morning.');
  if (held.has('repair-plan')) result.push(GEMWARD_STORY_FACT_COPY['repair-plan'].callback!);
  return result.join(' ');
}
