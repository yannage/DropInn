import type { AdventureRoom } from './types';
import { getScene } from './scene';
import { latestRound } from './roundSummary';

export interface NarratorCue { id: string; text: string }

/** Authored history supplies facts. No generated promises, chat, or roll arithmetic. */
export function narratorCue(room: AdventureRoom): NarratorCue {
  const round = latestRound(room);
  if (round && round.chapter === room.chapter) {
    const outcome = room.outcomes.find(item => item.chapter === round.chapter);
    if (outcome) return {id:`${round.id}:ending`,text:outcome.text};
    const changed = room.events.find(event => event.chapter === round.chapter && event.turn === round.turn && event.success !== false && event.change);
    if (changed) return {id:round.id,text:`${changed.actorName ? `${changed.actorName}: ` : ''}${changed.change!.title}. ${changed.change!.text}`};
    return {id:round.id,text:round.entries.filter(item=>item.kind==='action').slice(0,2).map(item=>item.text).join(' ') || round.headline};
  }
  return {id:`${room.id}:chapter:${room.chapter}`,text:getScene(room).intro};
}

/** Each caption is also one utterance, keeping displayed and spoken words together. */
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

/** Prefer a natural English device voice, while respecting an explicit selection. */
export function narratorVoice<T extends {voiceURI:string;name:string;lang:string;default:boolean}>(voices:T[], preferred:string): T | undefined {
  const exact=voices.find(voice=>voice.voiceURI===preferred);
  if(exact) return exact;
  const english=voices.filter(voice=>/^en(?:[-_]|$)/i.test(voice.lang));
  return english.find(voice=>/natural|premium|enhanced|online/i.test(voice.name))
    ?? english.find(voice=>voice.default) ?? english[0] ?? voices.find(voice=>voice.default) ?? voices[0];
}
