import { specialActionPreview } from './actionPreview';
import { approachOption } from './approaches';
import { choiceDefinition, choiceMove, choiceMoveEffects, choiceState } from './chapterChoices';
import { contextualActionLabel } from './playerGuidance';
import { chaptersFor } from './registry';
import { isRiverSuppliesChapter, riverMove } from './river';
import { getScene } from './scene';
import type { AdventureRoom, PlayerAction, TokenKind } from './types';

/** Safe presentation fields only: never return an action, proposal, signature or draft. */
export interface PartyIntent {
  actorId: string;
  actorName: string;
  token: TokenKind;
  targetId: string;
  targetKind: 'scene' | 'hero';
  label: string;
  certainty: 'guaranteed' | 'roll' | 'vote';
  cue: string;
}

export interface PartyIntentContext {
  targetId?: string;
  targetKind?: 'scene' | 'hero';
  action?: PlayerAction | null;
}

export interface PartyIntentPresentation {
  intents: PartyIntent[];
  note?: string;
  /** One-line alternative for the compact action dock; at most 110 characters. */
  shortNote?: string;
  /** Immediate effects when the cooperation note already explains the shared state. */
  outcomeDetail?: string;
}

function accepted(room: AdventureRoom, userId: string) {
  if (room.phase !== 'choosing' || room.status !== 'active') return [];
  const scene = getScene(room);
  return room.seats.flatMap(seat => {
    const action = room.commits[seat.actorId];
    // Accepted moves survive departure until resolution. Companions and pending seats do not commit.
    if (seat.kind !== 'human' || seat.actorId === userId || !action) return [];
    const targetKind = action.targetKind ?? 'scene';
    const vote = targetKind === 'scene' && action.token === 'assist' && !room.storyBranch
      && scene.branch?.options.some(option => option.targetId === action.targetId);
    const guaranteed = specialActionPreview(room, action)?.guaranteed
      || targetKind === 'hero' && action.token === 'assist';
    const certainty: PartyIntent['certainty'] = vote ? 'vote' : guaranteed ? 'guaranteed' : 'roll';
    const targetName = targetKind === 'hero' ? room.seats.find(target => target.actorId === action.targetId)?.character.name
      : scene.targets.find(target => target.id === action.targetId)?.name;
    const approach = targetKind === 'scene' ? approachOption(room, action)?.label : undefined;
    const intent: PartyIntent = {
      actorId: seat.actorId, actorName: seat.character.name, token: action.token, targetId: action.targetId, targetKind,
      // A confirmed Spotlight is visible, but its free text and signed proposal are not a planning cue.
      label: action.token === 'spotlight' ? `Spotlight at ${targetName ?? 'the scene'}` : contextualActionLabel(room, action),
      certainty, cue: vote ? 'Route vote; the party decides' : guaranteed ? 'Guaranteed on resolution' : `${approach ? `${approach} · ` : ''}Roll pending`,
    };
    return [{ intent, action }];
  });
}

/** All other accepted human moves, suitable for the existing party drawer. */
export function committedPartyIntents(room: AdventureRoom, userId: string): PartyIntent[] {
  return accepted(room, userId).map(entry => entry.intent);
}

function subject(intents: PartyIntent[]) {
  const name = intents.length > 1 ? `${intents[0].actorName} + ${intents.length - 1} ${intents.length === 2 ? 'other' : 'others'}` : intents[0].actorName;
  return { name, has: intents.length === 1 ? 'has' : 'have', is: intents.length === 1 ? 'is' : 'are' };
}

/** Compare committed plans without predicting a die result or spending a shared opportunity. */
export function partyIntentPresentation(room: AdventureRoom, userId: string, context: PartyIntentContext = {}): PartyIntentPresentation {
  const all = accepted(room, userId);
  if (!all.length) return { intents: [] };
  const action = context.action ?? undefined;
  const targetId = action?.targetId ?? context.targetId;
  const targetKind = action?.targetKind ?? context.targetKind ?? 'scene';
  const definition = choiceDefinition(room), state = choiceState(room);
  const localMove = action ? choiceMove(room, action) : undefined;
  const compareChoice = !action || !!localMove;
  const compareRiver = !action || !!riverMove(room, action);
  const choiceRelated = targetKind === 'scene' && definition && (!targetId || [definition.primaryId, definition.secondaryId].includes(targetId));
  const riverRelated = !choiceRelated && targetKind === 'scene' && isRiverSuppliesChapter(room)
    && (!targetId || ['boat', 'reeds'].includes(targetId));
  const entries = all.filter(({ intent }) => targetId && intent.targetId === targetId && intent.targetKind === targetKind
    || choiceRelated && compareChoice && intent.targetKind === 'scene' && [definition.primaryId, definition.secondaryId].includes(intent.targetId)
    || riverRelated && compareRiver && intent.targetKind === 'scene' && ['boat', 'reeds'].includes(intent.targetId));
  if (!entries.length) return { intents: [] };
  const intents = entries.map(entry => entry.intent);
  const finish = (note: string, shortNote: string, outcomeDetail?: string): PartyIntentPresentation => ({ intents, note,
    shortNote: shortNote.length <= 110 ? shortNote : 'A teammate has committed a move here.',
    ...(outcomeDetail ? { outcomeDetail } : {}) });
  const signature = entries.filter(entry => entry.intent.certainty !== 'vote' && entry.action.token !== 'spotlight');
  const withMoves = signature.map(entry => ({ ...entry, move: choiceMove(room, entry.action) }));
  const moves = (...kinds: ReturnType<typeof choiceMove>[]) => withMoves.filter(entry => entry.move && kinds.includes(entry.move)).map(entry => entry.intent);
  const say = (group: PartyIntent[]) => subject(group);
  const points = (amount: number) => Number((amount / Math.max(1, room.seats.filter(seat => seat.kind === 'human').length)).toFixed(2));
  const effects = (success: boolean) => localMove && state
    ? choiceMoveEffects(localMove, success, state, chaptersFor(room)[room.chapter].combat) : undefined;
  const immediateRoll = () => {
    const win = effects(true), miss = effects(false);
    return win && miss ? `Progress: win +${points(win.progress)} / miss +${points(miss.progress)}; miss +${points(miss.danger)} danger.` : undefined;
  };

  if (choiceRelated && definition && state?.phase !== 'settled') {
    const resource = definition.resource.toLowerCase();
    if (definition.mode === 'prepare') {
      const spending = moves('spend-safe', 'spend-risk');
      const preparing = moves('prepare');
      const preparationEndsChapter = room.chapterRound >= 10
        || room.progress + 1 / Math.max(1, room.seats.filter(seat => seat.kind === 'human').length) >= chaptersFor(room)[room.chapter].progressGoal;
      const terminalPreparation = localMove === 'prepare' && preparationEndsChapter;
      const outcomeDetail = localMove === 'prepare'
        ? `Guaranteed +${points(effects(true)!.progress)} progress. Replaces usual Help.` : undefined;
      if (spending.length) {
        const who = say(spending);
        return localMove === 'prepare' || targetId === definition.primaryId
          ? finish(`${who.name} ${who.has} committed to use ${resource}. Preparing again cannot refresh it this turn${terminalPreparation ? '; no later turn remains to spend a new opening' : ''}.`,
            terminalPreparation ? `${who.name} ${who.is} using it; no later turn to spend a new opening.` : `${who.name} ${who.is} using the opening; another preparation cannot refresh it this turn.`, outcomeDetail)
          : finish(`${who.name} ${who.has} committed to use ${resource}. You can still use the same opening this turn.`, `${who.name} ${who.is} using the opening; you can use it this turn too.`);
      }
      if (preparing.length) {
        const who = say(preparing);
        if (state?.phase === 'ready') return finish(`${who.name} ${who.has} committed to maintain ${resource}. Spending it this turn still uses it up${terminalPreparation ? '; no later turn remains to spend it' : ''}.`,
          terminalPreparation ? `${who.name} ${who.is} preparing too; no later turn to spend it.` : `${who.name} ${who.is} maintaining the opening; spending it still uses it up.`, outcomeDetail);
        if (localMove === 'prepare') return finish(`${who.name} ${who.has} committed to prepare ${resource}. Another Help adds progress, not another opening${terminalPreparation ? '; no later turn remains to spend it' : ''}.`,
          terminalPreparation ? `${who.name} ${who.is} preparing too; no later turn to spend it.` : `${who.name} ${who.is} preparing; another Help adds progress, not another opening.`, outcomeDetail);
        return finish(`${who.name} ${who.has} committed to prepare ${resource}. It cannot help this turn; it opens next turn only if the chapter continues.`, `${who.name} ${who.is} preparing for next turn, if this chapter continues.`);
      }
    }
    if (definition.mode === 'rescue') {
      const saving = moves('save'), salvaging = moves('salvage'), trying = moves('rescue-risk', 'recover');
      if (saving.length) {
        const who = say(saving);
        const destination = room.chapter === chaptersFor(room).length - 1 ? 'this finale' : 'next chapter';
        const outcomeDetail = localMove === 'save'
          ? `Guaranteed +${points(effects(true)!.progress)} progress; all saved gives +2 ${destination} progress.`
          : localMove === 'rescue-risk' || localMove === 'recover' ? immediateRoll() : undefined;
        return finish(`${who.name} ${who.has} committed to save all of the ${resource}. Your move can add progress, but cannot save extra.`, `${who.name} ${who.is} saving it all; another rescue cannot save extra.`, outcomeDetail);
      }
      if (salvaging.length) {
        const who = say(salvaging);
        return finish(`${who.name} ${who.has} committed to salvage some ${resource}. A successful full recovery this turn still takes priority.`, `${who.name} ${who.is} salvaging some; a full recovery can still save the rest.`);
      }
      if (trying.length) {
        const who = say(trying);
        return finish(`${who.name} ${who.has} committed a rescue attempt for ${resource}; the roll can still miss.`, `${who.name} ${who.is} attempting a rescue; its roll can still miss.`);
      }
    }
    if (definition.mode === 'press') {
      const banking = moves('bank'), pushing = moves('push');
      if (banking.length) {
        const who = say(banking);
        return finish(`${who.name} ${who.has} committed to bank the starting ${state?.level ?? 0}/2 ${resource}. New pushes cannot increase what is banked this turn.`, `${who.name} ${who.is} banking ${state?.level ?? 0}/2; this turn’s pushes cannot add to the bank.`, localMove === 'push' ? immediateRoll() : undefined);
      }
      if (pushing.length) {
        const who = say(pushing);
        if (localMove === 'bank') return finish(`${who.name} ${who.has} committed to push ${resource}. Your bank would preserve the starting ${state?.level ?? 0}/2 even if a push misses.`, `${who.name} ${who.is} pushing; your bank would preserve the starting ${state?.level ?? 0}/2.`);
        if (localMove === 'stabilize') return finish(`${who.name} ${who.has} committed to push ${resource}. Steadying the scene does not protect their push.`, `${who.name} ${who.is} pushing; steadying the scene does not protect that attempt.`);
        return finish(`${who.name} ${who.has} committed to push ${resource}. Any missed push loses unbanked levels unless someone banks the starting level.`, `${who.name} ${who.is} pushing; unbanked levels are still at risk.`);
      }
    }
  }

  if (riverRelated) {
    const supplyMoves = signature.map(entry => ({ ...entry, move: riverMove(room, entry.action) }));
    const secured = supplyMoves.filter(entry => entry.move === 'secure').map(entry => entry.intent);
    const salvage = supplyMoves.filter(entry => entry.move === 'salvage').map(entry => entry.intent);
    const attempted = supplyMoves.filter(entry => ['rush', 'recover', 'rescue'].includes(entry.move ?? '')).map(entry => entry.intent);
    if (secured.length) {
      const who = say(secured);
      return finish(`${who.name} ${who.has} committed to secure all supplies. Another rescue cannot save extra supplies; rolled moves can still add crossing progress.`, `${who.name} ${who.is} securing all supplies; another rescue cannot save extra.`);
    }
    if (salvage.length) {
      const who = say(salvage);
      return finish(`${who.name} ${who.has} committed to salvage some supplies. A successful full recovery this turn still takes priority.`, `${who.name} ${who.is} salvaging some supplies; full recovery can still save the rest.`);
    }
    if (attempted.length) {
      const who = say(attempted);
      return finish(`${who.name} ${who.has} committed a supplies rescue attempt; the roll can still miss.`, `${who.name} ${who.is} attempting a supplies rescue; its roll can still miss.`);
    }
  }

  const sameTarget = intents.filter(intent => intent.targetId === targetId && intent.targetKind === targetKind);
  if (!sameTarget.length) return { intents };
  const first = sameTarget[0];
  const additional = sameTarget.length > 1 ? ` ${sameTarget.length - 1} more ${sameTarget.length === 2 ? 'teammate has' : 'teammates have'} committed here.` : '';
  return finish(`${first.actorName} has committed: ${first.label}.${additional}`, `${first.actorName} has committed: ${first.label}.`);
}
