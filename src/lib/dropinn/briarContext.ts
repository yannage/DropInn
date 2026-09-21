import type { SceneTarget, TokenKind } from './types';

type Cues = Partial<Record<TokenKind, string>>;
const initial: Record<string, Cues> = {
  mara: { influence: 'Ask what she saw', assist: 'Help her clear the gate' },
  tracks: { investigate: 'Follow the claw marks', assist: 'Mark a trail for the party' },
  gate: { fight: 'Lift the timbers', investigate: 'Examine the ward charms', assist: 'Brace the broken gate' },
  herd: { influence: 'Calm the scattered animals', assist: 'Guide them to shelter' },
  pack: { fight: 'Confront the pack', influence: 'Draw its attention', investigate: 'Study the ward-light', assist: 'Support the party against the pack' },
  reeds: { investigate: 'Find a concealed path', assist: 'Make cover for the crossing' },
  boat: { fight: 'Push the keel free', investigate: 'Find what holds the boat', assist: 'Work the rope together' },
  ferryman: { influence: 'Ask about the guardian', investigate: 'Learn the chapel’s history', assist: 'Help prepare the crossing' },
  gloamfang: { fight: 'Confront the guardian', influence: 'Appeal to its old purpose', investigate: 'Study the curse', assist: 'Support the party against Gloamfang' },
  ward: { influence: 'Call to the guardian', investigate: 'Match the broken stones', assist: 'Help restore the ward' },
  bell: { fight: 'Pull the bell rope', investigate: 'Find the right note', assist: 'Help sound the bell' },
  captives: { influence: 'Guide the frightened animals', assist: 'Clear their escape route' },
};
const developed: Record<string, Cues> = {
  mara: { influence: 'Ask about the river', investigate: 'Follow Mara’s lead', assist: 'Help mark the route' },
  tracks: { investigate: 'Read the ward markings', influence: 'Share the chapel clue', assist: 'Mark the way forward' },
  gate: { influence: 'Guide animals into the pen', investigate: 'Study the snapped charms', assist: 'Keep the shelter secure' },
  herd: { influence: 'Keep the herd calm', investigate: 'Inspect the torn ribbon', assist: 'Guide the gathered animals' },
  reeds: { investigate: 'Scout the far end', assist: 'Help others through the path' },
  boat: { influence: 'Guide the party aboard', investigate: 'Plan a steady crossing', assist: 'Keep everyone steady' },
  ferryman: { influence: 'Ask about the bell', investigate: 'Connect the warning to the curse', assist: 'Help follow his directions' },
  ward: { influence: 'Call the guardian back', assist: 'Sustain the ward’s light' },
  bell: { influence: 'Call the captives toward the sound', investigate: 'Follow the bell’s rhythm', assist: 'Keep the bell ringing' },
  captives: { influence: 'Guide the remaining animals', investigate: 'Check the escape route', assist: 'Keep the escape route clear' },
};

/** Presentation stays alongside the existing flag-driven Briar Glen projection. */
export function briarTargetContext(target: SceneTarget): SceneTarget {
  return { ...target, context: target.description, actionCues: target.changed ? developed[target.id] ?? initial[target.id] : initial[target.id] };
}
