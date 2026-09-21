import type { AdventureRoom, StoryEvent } from './types';

/** Presentation follows the resolved event's clock, including after reconnect. */
export function revealBeat(event: StoryEvent, now: number, reducedMotion = false) {
  const elapsed = Math.max(0, now - event.at);
  return reducedMotion || elapsed >= 1100 ? 'payoff' : elapsed >= 450 ? 'bonuses' : 'roll';
}

export function currentTurnResults(room: AdventureRoom) {
  return room.events.filter(event => event.turn === room.turn && event.chapter === room.chapter
    && (event.kind === 'action' || event.kind === 'consequence'));
}

const amount = (value: number) => Number(value.toFixed(2));

/** Only display effects the authoritative event actually contains. */
export function resultBenefits(event: StoryEvent) {
  const result = event.result;
  if (!result) return [];
  return [
    result.progress ? `+${amount(result.progress)} progress` : '',
    result.danger ? `${result.danger > 0 ? '+' : '−'}${amount(Math.abs(result.danger))} danger` : '',
    result.protection ? `${amount(result.protection)} protection` : '',
    result.healing ? `+${amount(result.healing)} HP` : '',
  ].filter(Boolean);
}

export function resultLine(event: StoryEvent) {
  const result = event.result;
  if (!result) return event.change?.title ?? event.text;
  if (result.damage !== undefined) return result.damage ? `−${result.damage} HP` : 'Attack blocked!';
  if (result.targetKind === 'hero' && result.protection) return `Protected · blocks ${result.protection}`;
  if (result.healing) return `Recovered ${result.healing} HP`;
  if (event.change) return event.change.title;
  if (event.success === false) return 'A complication · keep going';
  return result.progress ? 'Your move made a difference' : 'Your help made a difference';
}
