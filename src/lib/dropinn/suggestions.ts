import { getScene } from './scene';
import { adventureFor } from './registry';
import type { AdventureRoom, CreativeEffect } from './types';

interface SuggestedIdea { label: string; idea: string; targetId: string; effect: CreativeEffect; description: string; until?: string }
const ideas: SuggestedIdea[][] = [
  [
    { label: 'Make a shelter', targetId: 'gate', effect: 'cover', until: 'gate-cleared', idea: 'I brace the broken gate timbers into a shelter for the party.', description: 'Try to brace the existing timbers into cover. On success, protect the party this round.' },
    { label: 'Follow the claw marks', targetId: 'tracks', effect: 'reveal', idea: 'I compare the claw marks with the hoofprints to trace the missing herd.', description: 'Try to trace the herd through the overlapping tracks. On success, reveal a clue and advance the objective.' },
  ],
  [
    { label: 'Hide in the reeds', targetId: 'reeds', effect: 'cover', idea: 'I bend the tall reeds into a screen to hide our crossing from the pack.', description: 'Try to turn the existing reeds into a screen. On success, protect the party this round.' },
    { label: 'Draw the pack away', targetId: 'pack', effect: 'distract', idea: 'I call from the bank to draw the shadow pack away from the crossing.', description: 'Try to lure the pack’s attention away from the crossing. On success, create an opening for the next round.' },
  ],
  [
    { label: 'Sound the bell', targetId: 'bell', effect: 'distract', until: 'bell-rung', idea: 'I swing the chapel bell rope to break Gloamfang’s concentration.', description: 'Try to interrupt the guardian with the chapel bell. On success, create an opening for the next round.' },
    { label: 'Guide the captives', targetId: 'captives', effect: 'rescue', idea: 'I guide the frightened animals along the altar while the guardian is distracted.', description: 'Try to guide the captives past the altar. On success, advance their rescue and the objective.' },
  ],
];

/** Authored attempts still require server validation, a signed preview and a roll. */
export function spotlightSuggestions(room: AdventureRoom) {
  const targets = getScene(room).targets;
  if (adventureFor(room).id !== 'briar-glen') return targets.slice(0, 2).map(target => ({ label: `Help with ${target.name}`, targetId: target.id, effect: 'reveal' as const, idea: `I study ${target.name.toLowerCase()} and show the party a way forward.`, description: `Study ${target.name.toLowerCase()}. On success, gain extra progress and next-turn insight. This does not cast a route vote.` }));
  return ideas[room.chapter].filter(idea => (!idea.until || !room.flags.includes(idea.until))
    && targets.some(target => target.id === idea.targetId && target.effects.includes(idea.effect)));
}
