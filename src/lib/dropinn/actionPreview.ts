import type { AdventureRoom, PlayerAction } from './types';
import { riverActionPreview } from './river';
import { choiceActionPreview } from './chapterChoices';

/** The same authored exception drives selection, help, and available approaches. */
export function specialActionPreview(room: AdventureRoom, action: PlayerAction) {
  return choiceActionPreview(room, action) ?? riverActionPreview(room, action);
}
