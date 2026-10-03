import { combatMoves, expeditionStash } from './expedition';
import { expeditionCombatMove, type ExpeditionCombatEffect } from './expeditionCombatMove';
import { journeyActionPreview, journeyInteractions, journeyLocations, journeyScene } from './journey';
import { isStoryTable, storyFactCopy } from './storyTable';
import type { AdventureRoom, PlayerAction, TokenKind } from './types';

/** Safe public fields from accepted commands. No draft, free-form idea or signed proposal is exposed. */
export interface GemwardRoundIntent {
  actorId: string; actorName: string; token: TokenKind; targetId: string; targetKind: 'scene' | 'hero';
  locationId: string; location: string; label: string; detail: string;
  kind: 'exploration' | 'combat' | 'spotlight' | 'plan'; cue: string;
}
export interface GemwardCombatForecast {
  label: string; summary: string; detail: string; progress: number; protection: number; improvedProtection: number;
  knownCover: number; exchange: ExpeditionCombatEffect['exchange'];
}
export interface GemwardRoundView {
  intents: GemwardRoundIntent[];
  waitingFor: string[];
  notices: { id: string; kind: 'overlap' | 'closing' | 'coordination'; text: string }[];
  forecast?: GemwardCombatForecast;
  blockingReason?: string;
}
const rounded = (value: number) => Number(value.toFixed(2));
const named = (names: string[]) => names.length > 1 ? `${names[0]} and ${names.length - 1} ${names.length === 2 ? 'other' : 'others'}` : names[0];
const consumable = (room: AdventureRoom, actorId: string, action: PlayerAction) => expeditionStash(room, actorId).find(item => item.id === action.expedition?.consumableId)?.kind;
const intention = (room: AdventureRoom, action: PlayerAction) => {
  const options = journeyInteractions(room, action.expedition?.locationId ?? room.expedition!.locationId, action.targetId, action.token);
  return options.find(option => option.id === action.expedition?.interactionId) ?? options[0];
};
function factsFor(room: AdventureRoom, actorId: string, action: PlayerAction) {
  if (action.token === 'spotlight') return [];
  const option = intention(room, action);
  return [...new Set([...(option?.storyFacts ?? []), ...(option?.questItem ? [option.questItem] : []),
    ...(consumable(room, actorId, action) === 'favour' && action.expedition?.favourChoice ? [action.expedition.favourChoice] : [])])];
}
function combatEffect(room: AdventureRoom, actorId: string, action: PlayerAction, improved = false) {
  const seat = room.seats.find(candidate => candidate.actorId === actorId && candidate.kind === 'human');
  const battle = room.expedition?.battle;
  if (!seat || battle?.status !== 'active' || action.token === 'spotlight') return;
  const effect = expeditionCombatMove({ classKey: seat.character.classKey, token: action.token, stance: battle.stance,
    humanCount: room.seats.filter(candidate => candidate.kind === 'human').length, protect: action.targetKind === 'hero', downed: seat.hp <= 0,
    releaseMs: improved ? 800 : action.releaseMs });
  const item = consumable(room, actorId, action);
  return { ...effect, progress: effect.progress + (item === 'binding' ? 2 / Math.max(1, room.seats.filter(candidate => candidate.kind === 'human').length) : 0),
    protection: Math.max(effect.protection, item === 'smoke' ? 3 : 0) };
}
function knownCover(room: AdventureRoom, actorId: string) {
  let cover = room.expedition?.routeId === 'canal' || room.seats.some(seat => seat.kind === 'companion') ? 1 : 0;
  for (const seat of room.seats) {
    const action = room.commits[seat.actorId];
    if (seat.kind !== 'human' || seat.actorId === actorId || !action) continue;
    // Spotlight outcomes are unresolved; a carried Smoke flask is already an accepted guaranteed use.
    cover = Math.max(cover, combatEffect(room, seat.actorId, action)?.protection ?? (consumable(room, seat.actorId, action) === 'smoke' ? 3 : 0));
  }
  return cover;
}
function forecast(room: AdventureRoom, actorId: string, action: PlayerAction): GemwardCombatForecast | undefined {
  const effect = combatEffect(room, actorId, action);
  if (!effect) return;
  const seat = room.seats.find(candidate => candidate.actorId === actorId)!;
  const move = combatMoves(seat.character.classKey, room.seats.filter(candidate => candidate.kind === 'human').length).find(candidate => candidate.token === action.token)!;
  const cover = knownCover(room, actorId), improved = combatEffect(room, actorId, action, true)!.protection;
  const exchange = { counter: 'Winning counter', even: 'Even exchange', difficult: 'Difficult exchange', help: 'Class Help', protect: 'Protect the threatened hero' }[effect.exchange];
  const parts = [`${exchange}: +${rounded(effect.progress)} battle progress.`];
  if (effect.protection) parts.push(`Block ${effect.protection} damage${improved > effect.protection ? `, or ${improved} with a good release` : ''}; strongest cover wins.`);
  else parts.push('This move adds no cover.');
  if (cover) parts.push(`${cover} cover is already supplied by the route, companions or accepted moves; it does not stack.`);
  if (effect.healSelf) parts.push('Restore up to 1 of your HP.');
  if (effect.healParty) parts.push('Heal the most wounded hero by up to 3 HP.');
  if (effect.opensNextRound) parts.push('Prepare +1 party progress next round if the battle continues; several openings do not stack.');
  const summary = [parts[0], effect.protection ? parts[1] : effect.healParty ? 'Heal the most wounded hero by up to 3 HP.' : effect.opensNextRound ? '+1 party progress next round if the battle continues.' : effect.healSelf ? 'Restore up to 1 of your HP.' : 'This move adds no cover.'].join(' ');
  return { label: effect.exchange === 'protect' ? 'Protect' : move.label, summary, detail: parts.join(' '), progress: rounded(effect.progress),
    protection: effect.protection, improvedProtection: improved, knownCover: cover, exchange: effect.exchange };
}

/** Present plans, never their future outcomes. Only current accepted human commits form the shared round. */
export function buildGemwardRound(room: AdventureRoom, userId: string, selection?: PlayerAction | null): GemwardRoundView {
  const view: GemwardRoundView = { intents: [], waitingFor: [], notices: [] };
  if (!isStoryTable(room) || room.phase !== 'choosing' || room.status !== 'active') return view;
  const entries = room.seats.flatMap(seat => seat.kind === 'human' && room.commits[seat.actorId] ? [{ seat, action: room.commits[seat.actorId] }] : []);
  view.waitingFor = room.seats.filter(seat => seat.kind === 'human' && !seat.leaving && !room.commits[seat.actorId]).map(seat => seat.character.name);
  view.intents = entries.map(({ seat, action }) => {
    const locationId = action.expedition?.locationId ?? room.expedition!.locationId;
    const location = journeyLocations(room).find(place => place.id === locationId)?.label ?? journeyScene(room, locationId).location;
    const targetKind = action.targetKind ?? 'scene';
    const targetName = targetKind === 'hero' ? room.seats.find(target => target.actorId === action.targetId)?.character.name
      : journeyScene(room, locationId).targets.find(target => target.id === action.targetId)?.name;
    const battle = room.expedition?.battle?.status === 'active';
    const preview = action.token === 'spotlight' ? { label: `Spotlight at ${targetName ?? 'the scene'}`, description: 'A creative attempt is accepted. Its result is still pending.' }
      : battle ? forecast(room, seat.actorId, action)! : journeyActionPreview(room, seat.actorId, action);
    const kind: GemwardRoundIntent['kind'] = action.token === 'spotlight' ? 'spotlight' : battle ? 'combat' : action.expedition?.interactionId?.startsWith('story-plan:') ? 'plan' : 'exploration';
    return { actorId: seat.actorId, actorName: seat.character.name, token: action.token, targetId: action.targetId, targetKind, locationId, location,
      label: preview.label, detail: 'detail' in preview ? preview.detail : preview.description, kind,
      cue: action.token === 'spotlight' ? 'Accepted · outcome pending' : 'Accepted · settles at round end' };
  });
  const others = entries.filter(entry => entry.seat.actorId !== userId);
  const closing = others.find(entry => entry.action.expedition?.interactionId?.startsWith('story-plan:'));
  if (closing) view.notices.push({ id: 'closing', kind: 'closing', text: `${closing.seat.character.name} has placed ${closing.action.expedition!.interactionId === 'story-plan:gather' ? 'Set out together' : 'Finish together'}. This is your last move here; all accepted actions settle before the party moves on.` });
  if (!selection) return view;
  if (consumable(room, userId, selection) === 'dust' && others.some(entry => consumable(room, entry.seat.actorId, entry.action) === 'dust')) {
    view.blockingReason = 'A teammate already attached Spark dust. This area can be extended once; remove yours before releasing.';
    view.notices.unshift({ id: 'dust', kind: 'overlap', text: view.blockingReason });
  }
  view.forecast = forecast(room, userId, selection);
  if (view.forecast) {
    const effect = combatEffect(room, userId, selection)!;
    if (effect.protection && view.forecast.knownCover >= view.forecast.improvedProtection) view.notices.push({ id: 'cover', kind: 'overlap', text: `${view.forecast.knownCover} cover is already supplied. Your protection will not add to it${effect.progress ? `; your move still adds ${rounded(effect.progress)} battle progress` : ''}.` });
    if (effect.opensNextRound && others.some(entry => combatEffect(room, entry.seat.actorId, entry.action)?.opensNextRound)) view.notices.push({ id: 'opening', kind: 'overlap', text: 'A teammate already prepares next round’s opening. Your progress still counts; the shared +1 opening happens once.' });
    return view;
  }
  if (selection.token === 'spotlight') return view;
  const selectedFacts = factsFor(room, userId, selection);
  const newFacts = selectedFacts.filter(id => !room.expedition!.questItems.includes(id) && !room.expedition!.storyTable!.facts.some(fact => fact.id === id));
  const selectedGift = intention(room, selection)?.consumable;
  const giftAvailable = !!selectedGift && !room.expedition!.rewarded.includes(`${userId}:npc:${selection.targetId}`);
  const overlapping = others.filter(entry => factsFor(room, entry.seat.actorId, entry.action).some(fact => selectedFacts.includes(fact)));
  if (overlapping.length) {
    const names = named(overlapping.map(entry => entry.seat.character.name));
    const covered = [...new Set(overlapping.flatMap(entry => factsFor(room, entry.seat.actorId, entry.action)))];
    const addsOtherFact = selectedFacts.some(fact => !covered.includes(fact) && !room.expedition!.storyTable!.facts.some(known => known.id === fact));
    view.notices.push({ id: 'shared-preparation', kind: 'overlap', text: `${names} ${overlapping.length === 1 ? 'has' : 'have'} already placed a move for this shared discovery or preparation. It is recorded once${addsOtherFact ? '; your other new preparation still counts' : ''}.${giftAvailable ? ' Your first personal gift is still available.' : ''}` });
  } else if (newFacts.length) {
    const different = others.find(entry => factsFor(room, entry.seat.actorId, entry.action).length);
    if (different) view.notices.push({ id: 'different-preparation', kind: 'coordination', text: `${different.seat.character.name} is handling another part of the plan. Your move can establish ${newFacts.map(id => storyFactCopy(id as Parameters<typeof storyFactCopy>[0]).label.toLowerCase()).join(' and ')}.` });
  }
  return view;
}
