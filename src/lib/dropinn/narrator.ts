import type { AdventureRoom, StoryEvent } from './types';
import { getScene } from './scene';
import { latestRound } from './roundSummary';

export interface NarratorCue { id: string; text: string }

function actionImportance(event: StoryEvent) {
  if (event.success === false) return 0;
  const result = event.result;
  return (event.change ? 100 : 0) + (result?.combination?.kind === 'payoff' ? 40 : 0)
    + ((result?.healing ?? 0) > 0 || (result?.protection ?? 0) > 0 ? 30 : 0)
    + ((result?.insight ?? 0) > 0 || (result?.opening ?? 0) > 0 ? 20 : 0)
    + (event.success ? 10 : 0) + Math.min(9, result?.progress ?? 0);
}

function consequenceImportance(event: StoryEvent) {
  const result = event.result;
  if (!result || event.kind !== 'consequence') return 0;
  if ((result.damage ?? 0) > 0 && result.hp === 0) return 90;
  if ((result.healing ?? 0) > 0 && result.hp === result.healing) return 80;
  if (result.damage === 0) return 60;
  if ((result.healing ?? 0) > 0) return 40;
  if ((result.damage ?? 0) > 0) return 30;
  return 0;
}

/** Authored history supplies facts. No generated promises, chat, or roll arithmetic. */
export function narratorCue(room: AdventureRoom): NarratorCue {
  if (room.phase === 'travel' && room.expedition?.travel) return {
    id: `${room.id}:travel:${room.expedition.travel.id}`,
    text: getScene(room).catchUp ?? 'The chapter is settled. Choose the party’s next destination on the Journey map.',
  };
  const round = latestRound(room);
  if (round && round.chapter === room.chapter) {
    const outcome = room.outcomes.find(item => item.chapter === round.chapter);
    if (outcome) return {id:`${round.id}:ending`,text:outcome.text};
    const seen = new Set<string>();
    const events = room.events.filter(event => event.chapter === round.chapter && event.turn === round.turn
      && !seen.has(event.id) && !!seen.add(event.id));
    // A confirmed party choice establishes the cost for everyone. Its saved copy
    // remains authoritative even after a player leaves or the scene develops.
    const decision = events.find(event => event.kind === 'consequence' && !event.actorId && !event.result);
    if (decision) return { id: round.id, text: decision.text };
    const humanEvents = events.filter(event => !event.actorId?.startsWith('companion-'));
    const action = humanEvents.filter(event => event.kind === 'action' && event.contribution !== false)
      .sort((a, b) => actionImportance(b) - actionImportance(a))[0];
    const consequence = humanEvents.filter(event => consequenceImportance(event) > 0)
      .sort((a, b) => consequenceImportance(b) - consequenceImportance(a))[0];
    const changed = action?.success !== false && action?.change ? action : undefined;
    const development = changed ? `${changed.actorName ? `${changed.actorName}: ` : ''}${changed.change!.title}. ${changed.change!.text}` : undefined;
    // Prefer the changed world to routine token bookkeeping, but let a blocked
    // attack or a fallen/revived hero carry rounds without a new discovery.
    const primary = development ?? consequence?.text ?? action?.text ?? round.headline;
    const secondary = development && consequence ? consequence.text : undefined;
    const text = secondary && secondary !== primary && `${primary} ${secondary}`.split(/\s+/).length <= 55
      ? `${primary} ${secondary}` : primary;
    return { id: round.id, text };
  }
  return {id:`${room.id}:chapter:${room.chapter}`,text:getScene(room).intro};
}

/** Short display captions; speech uses independent sentence boundaries. */
export function narratorCaptions(text: string, limit = 88): string[] {
  const sentences = text.replace(/\s+/g,' ').trim().match(/[^.!?]+[.!?]+(?:[”"’']|$)?|[^.!?]+$/g) ?? [];
  return sentences.flatMap(sentence => {
    const words = sentence.trim().split(' '), lines: string[] = [];
    let line = '';
    for (const word of words) {
      if (line && `${line} ${word}`.length > limit) { lines.push(line); line = ''; }
      line = line ? `${line} ${word}` : word;
    }
    if (line) lines.push(line);
    return lines;
  });
}

export const captionDuration = (text: string) => Math.max(3200, Math.min(8500, text.split(/\s+/).length * 430));

/** Only installed English voices: an unspecified or online voice may send text away. */
export function narratorVoice<T extends {voiceURI:string;name:string;lang:string;default:boolean;localService?:boolean}>(voices:T[], preferred:string): T | undefined {
  const english=voices.filter(voice=>voice.localService === true && /^en(?:[-_]|$)/i.test(voice.lang));
  const exact=english.find(voice=>voice.voiceURI===preferred);
  if(exact) return exact;
  return english.find(voice=>/natural|premium|enhanced/i.test(voice.name))
    ?? english.find(voice=>voice.default) ?? english[0];
}
