import { chaptersFor } from './registry';
import type { AdventureRoom } from './types';

export interface StoryEntry { id: string; chapter: number; turn: number; at: number; text: string; details: string[]; actorId?: string }

/** Authored prose remains intact. IDs deduplicate delivery; outcomes fill legacy gaps. */
export function storyEntries(room: AdventureRoom): StoryEntry[] {
  const seen = new Set<string>();
  const entries: StoryEntry[] = room.events.filter(event => !seen.has(event.id) && !!seen.add(event.id)).map(event => ({
    id: event.id, chapter: event.chapter, turn: event.turn, at: event.at, actorId: event.actorId,
    text: event.change?.title ?? event.text,
    details: [...new Set([
      ...(event.change ? [event.text, event.change.text, event.change.next] : []),
      event.effect,
      event.roll !== undefined ? `Die ${event.roll} + ${event.modifier ?? 0} = ${event.roll + (event.modifier ?? 0)}${event.success === undefined ? '' : event.success ? ' · Success' : ' · Complication'}` : undefined,
    ].filter((text): text is string => !!text && text !== (event.change?.title ?? event.text)))],
  }));
  for (const outcome of room.outcomes) if (!room.events.some(event => event.kind === 'chapter' && event.chapter === outcome.chapter && event.text === outcome.text)) {
    entries.push({ id:`outcome:${outcome.chapter}`,chapter:outcome.chapter,turn:0,at:outcome.at,text:outcome.text,details:[] });
  }
  if (!entries.some(entry => entry.chapter === 0)) entries.unshift({id:'opening',chapter:0,turn:0,at:room.createdAt,text:chaptersFor(room)[0].intro,details:[]});
  return entries.sort((a,b) => a.chapter-b.chapter || a.at-b.at);
}
