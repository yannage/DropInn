import type { AdventureRoom, PlayerAction, Seat, StoryEvent } from './types';
import type { ConsumableKind, ExpeditionInteraction, ExpeditionResult } from './expeditionTypes';
import { CONSUMABLES, FAVOUR_CHOICES, combatMoves, expeditionHash, expeditionInteractions, expeditionLocations, expeditionRoutes, expeditionScene, expeditionStash, QUEST_ITEMS } from './expedition';
import { isStoryTable, storyTableConsumable, storyTableHas } from './storyTable';
import { applyStoryTableIntention, closeStoryTableRound } from './storyTableEngine';
import { expeditionCombatMove } from './expeditionCombatMove';

const add = (items: string[], value: string) => { if (!items.includes(value)) items.push(value); };
const event = (room: AdventureRoom, now: number, data: Omit<StoryEvent, 'id' | 'turn' | 'chapter' | 'at'>) => room.events.push({ id: `${room.id}:${room.events.length}`, turn: room.turn, chapter: room.chapter, at: now, ...data });
const activeBattle = (room: AdventureRoom) => room.expedition?.battle?.status === 'active';
const timing = (action: PlayerAction) => Number.isInteger(action.releaseMs) && action.releaseMs! >= 650 && action.releaseMs! <= 950 ? 1 : 0;
export interface ExpeditionRuntime {
  journey?: boolean;
  interactions: typeof expeditionInteractions;
  locations: typeof expeditionLocations;
  scene: typeof expeditionScene;
}
const classic: ExpeditionRuntime = { interactions: expeditionInteractions, locations: expeditionLocations, scene: expeditionScene };
function selectedInteraction(room: AdventureRoom, action: PlayerAction, runtime = classic): ExpeditionInteraction | undefined {
  const options = runtime.interactions(room, action.expedition?.locationId ?? room.expedition!.locationId, action.targetId, action.token);
  return action.expedition?.interactionId ? options.find(option => option.id === action.expedition!.interactionId) : options[0];
}

/** All eligibility uses the choosing snapshot. Nothing learned by another action unlocks a same-turn move. */
export function validateExpeditionAction(room: AdventureRoom, userId: string, action: PlayerAction, runtime = classic) {
  if (!room.expedition) throw new Error('This expedition is missing its saved run state.');
  const seat = room.seats.find(item => item.actorId === userId)!;
  const metadata = action.expedition;
  if (metadata !== undefined && (!metadata || typeof metadata !== 'object' || Array.isArray(metadata))) throw new Error('Choose a valid expedition action.');
  if (action.approach || action.combination) throw new Error('This expedition uses its displayed intentions and battle moves.');
  if (metadata) {
    if (Object.keys(metadata).some(key => !['locationId', 'interactionId', 'routeId', 'consumableId', 'favourChoice', 'rewardChoice'].includes(key))) throw new Error('Unknown expedition action field.');
    for (const key of ['locationId', 'interactionId', 'routeId', 'consumableId', 'favourChoice'] as const) if (metadata[key] !== undefined && (typeof metadata[key] !== 'string' || !metadata[key]!.length || metadata[key]!.length > 200)) throw new Error('Choose a valid expedition intention.');
  }
  if (seat.hp <= 0 && action.token !== 'assist') throw new Error('While downed, use Help to keep helping your party.');
  if (action.targetKind === 'hero') {
    if (!activeBattle(room) || action.token !== 'assist' || room.enemyIntent?.targetActorId !== action.targetId) throw new Error('Protect the announced hero with Help.');
    if (metadata?.interactionId) throw new Error('Hero protection has no conversation topic.');
  } else {
    const location = metadata?.locationId ?? room.expedition.locationId;
    if (!runtime.locations(room).some(item => item.id === location && item.available)) throw new Error('That location is not available in this chapter.');
    const target = runtime.scene(room, location).targets.find(item => item.id === action.targetId);
    if (!target) throw new Error('Choose a target at this location.');
    if (action.token !== 'spotlight' && !target.tokens.includes(action.token)) throw new Error('Choose an available token.');
    if (activeBattle(room)) {
      if (metadata?.interactionId) throw new Error('Choose a battle move, not a conversation topic.');
    } else if (action.token !== 'spotlight' && !selectedInteraction(room, action, runtime)) throw new Error('Choose a displayed intention for this target and token.');
  }
  if (runtime.journey && metadata?.routeId !== undefined) throw new Error('Choose travel on the map after the chapter has settled.');
  if (metadata?.routeId !== undefined && (room.chapter !== 0 || !expeditionRoutes(room).some(route => route.id === metadata.routeId && route.available))) throw new Error('That route is not available yet. Discover its clue on an earlier turn.');
  const stash = expeditionStash(room, userId);
  const item = metadata?.consumableId ? stash.find(candidate => candidate.id === metadata.consumableId) : undefined;
  if (metadata?.consumableId && !item) throw new Error('That consumable is not in your stash.');
  if (item) {
    const definition = CONSUMABLES.find(candidate => candidate.id === item.kind)!;
    if (definition.when === 'combat' && !activeBattle(room) || definition.when === 'exploration' && activeBattle(room)) throw new Error('That consumable cannot be used here.');
    if (item.kind === 'favour' && (room.chapter !== 0 || !FAVOUR_CHOICES.some(choice => choice.id === metadata?.favourChoice))) throw new Error('Choose the delivery ledger or canal key for your town favour.');
    if (isStoryTable(room) && !storyTableConsumable(room, item.kind, action).usable) throw new Error(storyTableConsumable(room, item.kind, action).reason);
    if (isStoryTable(room) && item.kind === 'dust' && Object.entries(room.commits).some(([actorId, committed]) => actorId !== userId && expeditionStash(room, actorId).some(candidate => candidate.id === committed.expedition?.consumableId && candidate.kind === 'dust'))) throw new Error('Another player already attached Spark dust for this area. Keep yours for later.');
  }
  if (metadata?.favourChoice && item?.kind !== 'favour') throw new Error('A local favour is required for that item choice.');
  if (metadata?.rewardChoice !== undefined) {
    const choice = metadata.rewardChoice;
    if (!choice || typeof choice !== 'object' || Array.isArray(choice) || Object.keys(choice).some(key => !['offerId', 'replaceId', 'decline'].includes(key)) || typeof choice.offerId !== 'string'
      || choice.replaceId !== undefined && typeof choice.replaceId !== 'string' || choice.decline !== undefined && typeof choice.decline !== 'boolean') throw new Error('Choose a valid stash offer.');
    const offer = room.expedition.offers[userId]?.find(candidate => candidate.id === choice.offerId);
    if (!offer) throw new Error('That reward offer is no longer available.');
    if (choice.decline && choice.replaceId) throw new Error('Decline the offer or replace one item.');
    if (choice.replaceId && (!stash.some(candidate => candidate.id === choice.replaceId) || choice.replaceId === metadata.consumableId)) throw new Error('Choose another owned stash item to replace.');
    if (!choice.decline && stash.length >= 3 && !choice.replaceId) throw new Error('Your stash is full. Replace one item or decline the offer.');
  }
}

function grantReward(room: AdventureRoom, userId: string, source: string, kind: ConsumableKind): ExpeditionResult['reward'] {
  const state = room.expedition!;
  const key = `${userId}:${source}`;
  if (state.rewarded.includes(key)) return;
  state.rewarded.push(key);
  const item = { id: `${source}:${userId}`, kind };
  const offer = { id: `offer:${source}:${userId}`, item, source };
  const stash = state.stashes[userId] ??= [];
  if (stash.length < 3) stash.push(item);
  else (state.offers[userId] ??= []).push(offer);
  return offer;
}
function applyStashChoices(room: AdventureRoom, userId: string, action: PlayerAction): ConsumableKind | undefined {
  const state = room.expedition!;
  const stash = state.stashes[userId] ??= [];
  // Choices refer to the accepted inventory; newly offered items cannot be spent in this batch.
  const reward = action.expedition?.rewardChoice;
  if (reward) {
    const offers = state.offers[userId] ?? [];
    const offer = offers.find(candidate => candidate.id === reward.offerId)!;
    if (!reward.decline) {
      if (reward.replaceId) stash.splice(stash.findIndex(item => item.id === reward.replaceId), 1);
      stash.push(offer.item);
    }
    state.offers[userId] = offers.filter(candidate => candidate.id !== reward.offerId);
  }
  const index = stash.findIndex(item => item.id === action.expedition?.consumableId);
  return index >= 0 ? stash.splice(index, 1)[0].kind : undefined;
}
function heal(room: AdventureRoom, target: Seat, amount: number, now: number) {
  const healing = Math.min(amount, target.character.maxHp - target.hp);
  if (!healing) return;
  target.hp += healing;
  event(room, now, { kind: 'consequence', actorId: target.actorId, actorName: target.character.name, text: `${target.character.name} recovers ${healing} HP.`, result: { targetKind: 'hero', targetId: target.actorId, healing, hp: target.hp } });
}

/** Mutates only the already-cloned room. The caller retains command receipts, admission and the reveal lifecycle. */
export function resolveExpeditionRound(room: AdventureRoom, now: number, runtime = classic): boolean {
  const frozen: AdventureRoom = JSON.parse(JSON.stringify(room));
  const state = room.expedition!;
  const battle = activeBattle(frozen) ? state.battle! : undefined;
  const storyTable = isStoryTable(room);
  const seats = room.seats.filter(seat => seat.kind === 'human').sort((a, b) => a.actorId.localeCompare(b.actorId));
  const share = 1 / Math.max(1, seats.length);
  const routeVotes: string[] = [];
  const finalVotes: ('restore' | 'release')[] = [];
  let battleProgress = 0;
  let cover = battle && state.routeId === 'canal' ? 1 : 0;
  let actualActions = 0;
  for (const seat of seats) {
    const action = room.commits[seat.actorId];
    if (!action) {
      if (!seat.leaving) { seat.missedTurns++; event(room, now, { kind: 'action', actorId: seat.actorId, actorName: seat.character.name, text: battle ? `${seat.character.name} defends while away.` : `${seat.character.name} sits this round out.`, contribution: false }); }
      continue;
    }
    actualActions++;
    seat.missedTurns = 0;
    const consumed = applyStashChoices(room, seat.actorId, action);
    const result: ExpeditionResult = { ...(consumed ? { consumed } : {}) };
    let text: string;
    let progress = 0;
    let personalCover = 0;
    let success = true;
    let roll: number | undefined;
    let modifier: number | undefined;
    if (consumed === 'second-wind') heal(room, seat, 4, now);
    if (consumed === 'smoke') personalCover = 3;
    if (action.token === 'spotlight') {
      roll = 1 + expeditionHash(`${state.seed}:${room.turn}:${seat.actorId}:spotlight`) % 20;
      modifier = seat.character.traits[{ fighter: 'ATH', rogue: 'ING', wizard: 'INT', cleric: 'CHA' }[seat.character.classKey] as 'ATH'] + timing(action);
      success = roll + modifier >= 10 + room.chapter;
      progress = (success ? 2 : 1) * share;
      if (success && action.proposal?.effect === 'cover') personalCover = Math.max(personalCover, 2);
      if (success && action.proposal?.effect === 'distract') personalCover = Math.max(personalCover, 2);
      if (success && action.proposal?.effect === 'rescue') heal(room, seat, 2, now);
      text = `${seat.character.name} tries ${action.proposal!.label}: ${success ? 'the idea helps the party' : 'a complication still reveals a way forward'}.`;
      if (storyTable && !battle) {
        const location = action.expedition?.locationId ?? state.locationId;
        const intention = runtime.interactions(frozen, location, action.targetId, action.proposal?.effect === 'reveal' ? 'investigate' : 'assist')[0];
        if (success && intention) {
          if (intention.questItem) { add(state.questItems, intention.questItem); if (!frozen.expedition!.questItems.includes(intention.questItem)) result.questItems = [intention.questItem]; }
          result.storyTable = applyStoryTableIntention(room, frozen, intention);
          result.locationId = location; result.interactionId = intention.id;
          text = `${seat.character.name} tries ${action.proposal!.label}. ${result.storyTable.after}`;
        } else {
          result.storyTable = { factIds: [], before: 'This preparation was not complete.', after: 'The idea needs another approach. No new preparation is complete.', next: 'Try a supported practical intention next turn.' };
          text = `${seat.character.name} tries ${action.proposal!.label}. ${result.storyTable.after}`;
        }
        if (room.chapter !== 1) progress = 0;
      }
      room.players[seat.actorId].spotlightChapters.push(room.chapter);
    } else if (battle) {
      const move = combatMoves(seat.character.classKey, seats.length).find(candidate => candidate.token === action.token)!;
      const wasDowned = frozen.seats.find(candidate => candidate.actorId === seat.actorId)!.hp <= 0;
      const effect = expeditionCombatMove({ classKey: seat.character.classKey, token: action.token, stance: battle.stance, humanCount: seats.length, releaseMs: action.releaseMs, protect: action.targetKind === 'hero', downed: wasDowned });
      progress = effect.progress;
      personalCover = Math.max(personalCover, effect.protection);
      if (effect.exchange === 'protect') { text = `${seat.character.name} protects the announced hero. Help remains useful while downed.`; }
      else if (move.stance) {
        if (effect.healSelf) heal(room, seat, effect.healSelf, now);
        text = `${seat.character.name} uses ${move.label} against ${battle.stance}: ${effect.exchange === 'counter' ? 'a winning counter' : effect.exchange === 'even' ? 'an even exchange' : 'a difficult exchange'}.${effect.signature ? ` Their class adds ${Number(share.toFixed(2))} battle progress.` : ''}`;
      } else {
        if (effect.opensNextRound) add(room.flags, `expedition-opening:${room.turn + 1}`);
        if (effect.healParty) {
          const mostWounded = [...frozen.seats].filter(candidate => candidate.kind === 'human').sort((a, b) => a.hp / a.character.maxHp - b.hp / b.character.maxHp || a.actorId.localeCompare(b.actorId))[0];
          const recipient = room.seats.find(candidate => candidate.actorId === mostWounded?.actorId);
          if (recipient) heal(room, recipient, effect.healParty, now);
        }
        text = `${seat.character.name} uses ${move.label}. ${move.description}`;
      }
      result.battleStance = battle.stance;
    } else {
      const intention = selectedInteraction(frozen, action, runtime)!;
      const locationId = action.expedition?.locationId ?? state.locationId;
      add(state.visited, locationId);
      add(state.discoveries, intention.id);
      result.locationId = locationId; result.interactionId = intention.id;
      if (intention.questItem) { add(state.questItems, intention.questItem); if (!storyTable || !frozen.expedition!.questItems.includes(intention.questItem)) result.questItems = [intention.questItem]; }
      if (intention.consumable) result.reward = grantReward(room, seat.actorId, `npc:${action.targetId}`, intention.consumable);
      if (intention.finaleChoice && !frozen.expedition!.finaleChoice) finalVotes.push(intention.finaleChoice);
      progress = share;
      text = `${seat.character.name}: ${intention.label}. ${intention.description}`;
      if (storyTable) {
        result.storyTable = applyStoryTableIntention(room, frozen, intention);
        if (result.reward) {
          const gift = `${CONSUMABLES.find(item => item.id === result.reward!.item.kind)!.label} is ${state.stashes[seat.actorId].some(item => item.id === result.reward!.item.id) ? 'added to your stash' : 'offered for a stash replacement'}.`;
          result.storyTable.after = result.storyTable.factIds.length || result.storyTable.repeated || result.questItems?.length ? `${result.storyTable.after} ${gift}` : gift;
        }
        text = `${seat.character.name}: ${intention.label}. ${result.storyTable.after}`;
        if (room.chapter !== 1) progress = 0;
      }
    }
    if (consumed === 'favour') {
      const item = action.expedition!.favourChoice!; add(state.questItems, item); result.questItems = [...new Set([...(result.questItems ?? []), item])]; text += ` A local contact provides ${QUEST_ITEMS[item].label}; its route opens next turn.`;
      if (storyTable) {
        const favour = applyStoryTableIntention(room, frozen, { id: 'local-favour', label: 'A local favour', description: '', storyFacts: [item as 'ledger-copy' | 'canal-key'] });
        result.storyTable = { ...favour, factIds: [...new Set([...(result.storyTable?.factIds ?? []), ...favour.factIds])], after: `${result.storyTable?.after ?? ''} ${favour.after}`.trim(), ...(result.storyTable?.completion ? { completion: result.storyTable.completion } : {}) };
      }
    }
    if (consumed === 'dust') {
      if (storyTable) { state.storyTable!.extraOpportunity = true; result.storyTable = { ...result.storyTable!, extraOpportunity: true, after: `${result.storyTable!.after} Spark dust gives this area one extra preparation opportunity.` }; }
      else progress *= 2;
    }
    if (consumed === 'binding') progress += 2 * share;
    if (consumed) text += ` ${CONSUMABLES.find(item => item.id === consumed)!.label} is spent.`;
    if (action.expedition?.routeId) routeVotes.push(action.expedition.routeId);
    if (battle) { battleProgress += progress; result.battleProgress = Number(progress.toFixed(2)); }
    else room.progress += progress;
    cover = Math.max(cover, personalCover);
    const player = room.players[seat.actorId];
    player.actions++; player.xp += success ? 5 : 3;
    player.highlights = [...player.highlights, text].slice(-8);
    const timingApplies = action.token === 'spotlight' || battle && (action.token === 'investigate' && seat.character.classKey !== 'wizard' || action.targetKind === 'hero' || frozen.seats.find(candidate => candidate.actorId === seat.actorId)!.hp <= 0);
    const changed = !battle && (!storyTable || !!result.storyTable?.factIds.length || !!result.storyTable?.completion || !!result.reward || !!consumed || !!result.questItems?.length);
    event(room, now, { kind: 'action', actorId: seat.actorId, actorName: seat.character.name, text, success, contribution: true, ...(roll === undefined ? {} : { roll, modifier }), effect: battle ? `+${Number(progress.toFixed(2))} battle progress.${personalCover ? ` ${personalCover} protection; strongest wins.` : ''}` : storyTable ? result.storyTable?.after : `+${Number(progress.toFixed(2))} progress.`, result: { targetKind: action.targetKind ?? 'scene', targetId: action.targetId, token: action.token, executionBonus: timingApplies ? timing(action) : 0, progress: battle ? 0 : Number(progress.toFixed(2)), protection: personalCover, changed, expedition: result }, ...(changed ? { change: { title: result.storyTable?.completion ? 'The party is ready' : 'A discovery on the table', text: result.storyTable?.after ?? (result.questItems?.map(item => QUEST_ITEMS[item].label).join(', ') || 'Your intention is recorded.'), next: result.storyTable?.next ?? 'Use the new information on your next turn.' } } : {}) });
  }
  if (battle) {
    if (actualActions && room.flags.includes(`expedition-opening:${room.turn}`)) battleProgress += 1;
    if (actualActions && room.seats.some(seat => seat.kind === 'companion')) {
      cover = Math.max(cover, 1);
      event(room, now, { kind: 'consequence', text: 'Your labeled companions hold the escape route and provide 1 cover.', result: { protection: 1 } });
    }
    battle.progress = Math.min(battle.goal, Number((battle.progress + battleProgress).toFixed(2)));
    const won = battle.round >= 2 && battle.progress >= battle.goal;
    if (!won) {
      const target = room.seats.find(seat => seat.actorId === room.enemyIntent?.targetActorId);
      if (target) {
        const absentDefense = room.commits[target.actorId] ? 0 : 2;
        const incoming = Math.max(0, (room.enemyIntent?.baseDamage ?? 3) - cover - absentDefense);
        const lantern = storyTable && incoming > 0 && storyTableHas(room, 'packed-lantern') && !state.storyTable!.lanternSpent ? 1 : 0;
        if (lantern) {
          state.storyTable!.lanternSpent = true;
          event(room, now, { kind: 'consequence', text: 'Oren’s packed lantern lights a sheltered step and prevents 1 damage. Its preparation is now spent.', result: { protection: 1, changed: true, expedition: { storyTable: { factIds: [], before: 'The packed lantern was ready.', after: 'Oren’s lantern prevented 1 damage from this strike.', next: 'The lantern preparation is spent; class protection remains available.', lanternSpent: true } } } });
        }
        const damage = Math.min(target.hp, Math.max(0, incoming - lantern));
        target.hp -= damage;
        event(room, now, { kind: 'consequence', actorId: target.actorId, actorName: target.character.name, text: damage ? `${target.character.name} takes ${damage} damage from the announced strike.` : `${target.character.name} is protected from the announced strike.`, result: { targetKind: 'hero', targetId: target.actorId, damage, hp: target.hp, protection: cover + absentDefense } });
      }
    }
    if (won || battle.round >= 4) {
      battle.status = won ? 'won' : 'escaped';
      state.encounterResolved = true;
      add(state.questItems, 'recovered-prism');
      if (!won) { add(state.costs, 'The hurried escape leaves travel supplies behind.'); room.danger++; }
      room.progress += won ? 6 : 3;
      const truth = state.variant === 'smugglers' ? 'The maker mark proves the theft. Restoring the beacon destroys that evidence; releasing the light keeps it but leaves dark evenings until repairs.' : 'Nella saved the living spark from a failing ward. Restoring the beacon keeps the spark alive but binds it again; releasing it leaves dark evenings until repairs.';
      event(room, now, { kind: 'consequence', text: `${won ? 'The encounter is overcome.' : 'The party escapes at the fourth exchange.'} The prism is recovered. ${truth} Return to the route and prepare the journey home.`, result: { changed: true, expedition: { questItems: ['recovered-prism'] } }, change: { title: 'The prism is safe', text: truth, next: 'Resume exploration, then bring the prism home.' } });
      for (const seat of seats) if (room.players[seat.actorId].actions && room.events.some(entry => entry.actorId === seat.actorId && entry.kind === 'action' && entry.contribution && entry.chapter === 1)) {
        const reward = grantReward(room, seat.actorId, `fight:${battle.id}`, won ? 'binding' : 'second-wind');
        if (reward) event(room, now, { kind: 'consequence', actorId: seat.actorId, actorName: seat.character.name, text: `${seat.character.name} earns ${CONSUMABLES.find(item => item.id === reward.item.kind)!.label}. ${state.stashes[seat.actorId].some(item => item.id === reward.item.id) ? 'It is in their stash.' : 'Their stash is full; a replacement offer is waiting.'}`, result: { expedition: { reward } } });
      }
    }
    return runtime.journey ? !!state.encounterResolved : false;
  }
  state.explorationTurns++;
  room.progress = Math.round(room.progress * 100) / 100;
  if (storyTable && (room.chapter === 0 || room.chapter === 2)) return closeStoryTableRound(room, now, actualActions);
  if (runtime.journey && room.chapter === 0) return state.explorationTurns >= 2 && room.progress >= 4 || state.explorationTurns >= 4;
  if (room.chapter === 0 && (routeVotes.length || state.explorationTurns >= 4)) {
    const tally = expeditionRoutes(frozen).map(route => ({ id: route.id, count: routeVotes.filter(id => id === route.id).length }));
    const best = Math.max(...tally.map(route => route.count));
    const winners = tally.filter(route => route.count === best && best > 0);
    state.pendingRouteId = winners.length === 1 ? winners[0].id : 'road';
    event(room, now, { kind: 'consequence', text: `The party chooses the ${state.pendingRouteId} route for next turn.${winners.length !== 1 ? ' Ties and no votes use the open hill road.' : ''} Every accepted town interaction has resolved.`, result: { expedition: { routeId: state.pendingRouteId }, changed: true } });
    return true;
  }
  if (room.chapter === 1) {
    if (state.encounterResolved) return true;
    if (state.routeId === 'warehouse' && !frozen.expedition!.questItems.includes('buyer-evidence') && state.explorationTurns < 3) {
      event(room, now, { kind: 'consequence', text: 'The warehouse holds a buyer’s trail. Investigate the crate or light trail, or question the watcher, before confronting the guard. New evidence can guide the approach next turn.', result: { changed: true } });
      return false;
    }
    if (state.routeId === 'canal') {
      if (state.questItems.includes('quiet-passage')) {
        state.encounterResolved = true;
        add(state.questItems, 'recovered-prism');
        room.progress += 6;
        event(room, now, { kind: 'consequence', text: `The prepared mooring and quiet passage let everyone recover the prism without a battle. ${expeditionTruth(room)} Prepare the return journey on your next turn.`, result: { changed: true, expedition: { questItems: ['recovered-prism'] } }, change: { title: 'A quiet recovery', text: 'The mooring holds while the party retrieves the prism.', next: 'Bring the prism safely home next turn.' } });
        for (const seat of seats) if (room.commits[seat.actorId]) {
          const reward = grantReward(room, seat.actorId, 'quiet-recovery', 'dust');
          if (reward) event(room, now, { kind: 'consequence', actorId: seat.actorId, actorName: seat.character.name, text: `${seat.character.name} earns Spark dust for the peaceful recovery.`, result: { expedition: { reward } } });
        }
        return !!runtime.journey;
      }
      if (state.explorationTurns < 3) {
        event(room, now, { kind: 'consequence', text: state.questItems.includes('mooring-line') ? 'The mooring is ready. Next turn, distract the watcher or trace the light to recover the prism quietly.' : 'Help the landing or crate to set a mooring. A later distraction or investigation can avoid the encounter.', result: { changed: true } });
        return false;
      }
    }
    state.battle = { id: `${state.seed}:${state.routeId}`, status: 'queued', round: 1, progress: state.routeId === 'warehouse' ? 1 : 0, goal: 6, stance: 'strike', returnLocationId: state.locationId };
    if (storyTable && storyTableHas(room, 'watcher-tell')) {
      state.battle.progress++;
      event(room, now, { kind: 'consequence', text: 'Iris’s account of the watcher gives the party 1 starting battle progress.', result: { changed: true, expedition: { storyTable: { factIds: [], before: 'The party remembered Iris’s watcher tell.', after: 'The watcher tell gives 1 starting battle progress.', next: 'Read the announced stance and choose a class move.' } } } });
    }
    event(room, now, { kind: 'consequence', text: runtime.journey ? 'Every exploration move settles before a watcher steps into the path. Battle begins next turn; the party’s discoveries remain safe.' : 'Every exploration move settles before a watcher steps into the path. Battle begins next turn; the party will return here afterwards.', result: { changed: true }, change: { title: 'A watcher blocks the path', text: 'The party’s discoveries remain safe.', next: 'Prepare for a short battle next turn.' } });
  }
  if (room.chapter === 2) {
    if (runtime.journey) return state.explorationTurns >= 2 && room.progress >= 4 || state.explorationTurns >= 4;
    if (!state.finaleChoice) {
      const restore = finalVotes.filter(choice => choice === 'restore').length;
      const release = finalVotes.filter(choice => choice === 'release').length;
      // Resolve the final choice on the first choosing boundary; absence never supplies a vote.
      state.finaleChoice = restore > release ? 'restore' : 'release';
      if (state.finaleChoice === 'restore') {
        state.questItems = state.questItems.filter(item => item !== 'recovered-prism');
        add(state.costs, state.variant === 'smugglers' ? 'The consumed prism destroys the maker-mark evidence.' : 'The living spark survives, bound to the beacon again.');
      } else add(state.costs, 'Gemward faces dark evenings until neighbours repair the beacon.');
      state.ending = state.finaleChoice === 'restore' ? `Gemward’s beacon shines again. ${state.costs[state.costs.length - 1]} Neighbours reopen the evening market beneath its light.` : `${state.variant === 'smugglers' ? 'The prism’s maker mark remains evidence against the smugglers.' : 'The living spark is free.'} Gemward shares lanterns through dark evenings and begins repairing the beacon together.`;
      event(room, now, { kind: 'consequence', text: `${restore === release ? 'Tied or absent votes use the announced release fallback. ' : ''}${state.ending}`, result: { changed: true, expedition: { finaleChoice: state.finaleChoice } }, change: { title: state.finaleChoice === 'restore' ? 'The beacon shines' : 'Lanterns replace the beacon', text: state.ending, next: 'Help the neighbours through their changed evening.' } });
    }
    return state.explorationTurns >= 2 && room.progress >= 2 || state.explorationTurns >= 4;
  }
  return false;
}

function expeditionTruth(room: AdventureRoom) {
  return room.expedition!.variant === 'smugglers' ? 'The maker mark proves the theft. Restoring the beacon consumes that evidence; releasing the light preserves it but leaves dark evenings until repairs.' : 'Nella moved the failing prism to save its living spark. Restoration keeps the spark alive but binds it to the beacon again; release grants freedom and leaves dark evenings until repairs.';
}

export function expeditionChapterOutcome(room: AdventureRoom): { result: 'success' | 'mixed' | 'setback'; text: string } {
  const state = room.expedition!;
  if (room.chapter === 0) {
    const route = state.pendingRouteId ?? 'road';
    return { result: route === 'road' ? 'mixed' : 'success', text: `The party leaves Gemward by the ${route === 'road' ? 'open hill road' : route}. ${route === 'road' ? 'The extra distance will cost travel supplies.' : route === 'canal' ? 'Bram’s key opens a sheltered approach with a chance of quiet recovery.' : 'The copied ledger opens the warehouse; the buyer’s trail awaits inside.'} The missing prism carries the beacon’s light. ${expeditionTruth(room)}` };
  }
  if (room.chapter === 1) return { result: state.costs.some(cost => cost.includes('hurried escape')) ? 'mixed' : 'success', text: `The party carries the recovered prism home. ${expeditionTruth(room)} The keeper asks everyone to choose its future at the beacon.` };
  return { result: room.progress >= 2 ? 'success' : 'setback', text: state.ending ?? 'Neighbours share lanterns while the beacon awaits repair. The town has a way forward.' };
}

export function advanceExpeditionChapter(room: AdventureRoom, now: number) {
  const state = room.expedition!;
  state.explorationTurns = 0;
  room.progress = 0;
  if (room.chapter === 1) {
    state.routeId = state.pendingRouteId ?? 'road';
    delete state.pendingRouteId;
    state.locationId = state.routeId;
    if (state.routeId === 'road') { room.danger++; add(state.costs, 'The open hill road costs time and travel supplies.'); }
  } else state.locationId = 'beacon';
  add(state.visited, state.locationId);
  for (const seat of room.seats) { seat.hp = Math.min(seat.character.maxHp, seat.hp + 3); if (seat.kind === 'human') room.players[seat.actorId].character.hp = seat.hp; }
  event(room, now, { kind: 'chapter', text: expeditionScene(room).intro });
}
export function advanceExpeditionBoundary(room: AdventureRoom) {
  const battle = room.expedition?.battle;
  if (!battle) return;
  if (battle.status === 'won' || battle.status === 'escaped') { room.expedition!.locationId = battle.returnLocationId; delete room.expedition!.battle; return; }
  if (battle.status === 'queued') battle.status = 'active';
  else battle.round++;
  battle.stance = (['strike', 'trick', 'guard'] as const)[expeditionHash(`${room.expedition!.seed}:${battle.id}:${battle.round}`) % 3];
}
