import { chaptersFor } from './registry';
import type { AdventureRoom, ChapterChoiceDefinition, ChapterChoiceState, ChoiceContributor, ChoiceCredit, PlayerAction, SceneChange, SceneTarget, TokenKind } from './types';

export type ChoiceMove = 'prepare' | 'spend-safe' | 'spend-risk' | 'save' | 'rescue-risk' | 'salvage' | 'recover' | 'push' | 'bank' | 'stabilize';
export interface ChoiceAttempt { move: ChoiceMove; success: boolean; contributor?: ChoiceContributor }
export const choiceDefinition = (room: AdventureRoom) => chaptersFor(room)[room.chapter]?.choice;
export function choiceState(room: AdventureRoom): ChapterChoiceState | undefined {
  const definition = choiceDefinition(room);
  return definition ? room.chapterChoices?.[definition.id] ?? { phase: 'open', level: 0, uses: 0 } : undefined;
}
const points = (room: AdventureRoom, amount: number) => Number((amount / Math.max(1, room.seats.filter(seat => seat.kind === 'human').length)).toFixed(2));
const finale = (room: AdventureRoom) => room.chapter === chaptersFor(room).length - 1;

/** Call with the pre-vote, pre-action room throughout resolution. Spotlight never spends a choice. */
export function choiceMove(room: AdventureRoom, action: PlayerAction): ChoiceMove | undefined {
  const definition = choiceDefinition(room), state = choiceState(room);
  if (!definition || !state || state.phase === 'settled' || action.targetKind === 'hero' || action.token === 'spotlight') return;
  if (!room.storyBranch && action.token === 'assist' && chaptersFor(room)[room.chapter]?.branch?.options.some(option => option.targetId === action.targetId)) return;
  const primary = action.targetId === definition.primaryId, secondary = action.targetId === definition.secondaryId;
  if (definition.mode === 'prepare') {
    if (primary && action.token === 'assist') return 'prepare';
    if (secondary && state.phase === 'ready') {
      if (action.token === 'assist') return 'spend-safe';
      if (action.token === definition.riskToken) return 'spend-risk';
    }
  }
  if (definition.mode === 'rescue') {
    if (primary && action.token === 'assist') return state.phase === 'setback' ? 'salvage' : 'save';
    if (primary && state.phase !== 'setback' && action.token === definition.riskToken) return 'rescue-risk';
    if (secondary && state.phase === 'setback' && action.token === 'investigate') return 'recover';
  }
  if (definition.mode === 'press') {
    if (primary && action.token === definition.riskToken) return 'push';
    if (secondary && action.token === 'assist') return state.level > 0 ? 'bank' : 'stabilize';
    if (primary && action.token === 'assist' && state.phase === 'setback') return 'stabilize';
  }
}

export const choiceGuaranteed = (move: ChoiceMove) => ['prepare', 'spend-safe', 'save', 'salvage', 'bank', 'stabilize'].includes(move);
export function choiceActionPreview(room: AdventureRoom, action: PlayerAction): { label: string; detail: string; compactDetail: string; guaranteed: boolean } | undefined {
  const move = choiceMove(room, action), definition = choiceDefinition(room), state = choiceState(room);
  if (!move || !definition || !state) return;
  const labels = definition.labels, p = (n: number) => points(room, n);
  const miss = `Miss: +${p(1)} progress, +${p(1)} danger.`;
  const destination = finale(room) ? 'this finale' : 'next chapter';
  const deadline = `Save by round ${definition.deadlineRound ?? 3} or chapter end; otherwise +1 ${destination} danger.`;
  const lastTurn = room.chapterRound >= 10;
  const preparationEndsChapter = lastTurn || room.progress + 1 / Math.max(1, room.seats.filter(seat => seat.kind === 'human').length) >= chaptersFor(room)[room.chapter].progressGoal;
  let label = labels.risk, detail = '';
  if (move === 'prepare') {
    label = state.phase === 'setback' ? labels.recover : labels.prepare;
    detail = `Guaranteed +${p(1)} progress. ${preparationEndsChapter ? 'No later turn remains to spend this preparation.' : state.phase === 'ready' ? 'Keeps the preparation ready unless the party spends it this turn.' : 'Readies a safe payoff or risky burst if the chapter continues.'} Replaces usual Help.`;
  } else if (move === 'spend-safe') {
    label = labels.secure;
    detail = `Guaranteed +${p(3)} progress and ${chaptersFor(room)[room.chapter].combat ? '2 party cover; strongest cover wins' : `ease danger by up to ${p(2)}`}. Uses the preparation. Replaces usual Help.`;
  } else if (move === 'spend-risk') {
    detail = `Win: +${p(7)} progress, +${p(1)} danger. ${miss} Uses the preparation; a missed attempt needs repair unless an ally succeeds.`;
  } else if (move === 'save' || move === 'salvage') {
    label = move === 'save' ? labels.secure : labels.recover;
    detail = `Guaranteed +${p(1)} progress; ${move === 'save' ? 'save all' : 'save some'} ${definition.resource} (+${move === 'save' ? 2 : 1} ${destination} progress). Replaces usual Help.${move === 'salvage' ? ' A full rescue this turn takes priority.' : ''}`;
  } else if (move === 'rescue-risk' || move === 'recover') {
    label = move === 'recover' ? labels.recover : labels.risk;
    detail = `Win: +${p(move === 'recover' ? 2 : 4)} progress; save all (+2 ${destination} progress). ${miss} ${deadline}`;
  } else if (move === 'push') {
    detail = `Win: +${p(2)} progress, ${state.level >= 2 ? 'already at the 2-level limit' : '+1 shared level this turn'}. ${miss} Any missed push loses all unbanked ${definition.resource}; Help banks the starting level first.${lastTurn ? ' Last turn: new levels cannot be banked later.' : ' Chapter end loses unbanked levels.'}`;
  } else if (move === 'bank') {
    label = labels.secure;
    detail = `Guaranteed +${p(3 * state.level)} progress. Banks ${state.level}/2 ${definition.resource} and closes this choice. This turn’s pushes cannot change the banked level. Replaces usual Help.`;
  } else {
    label = state.phase === 'setback' ? labels.recover : labels.prepare;
    detail = `Guaranteed +${p(1)} progress; steadies the scene with no ${definition.resource} to bank. Does not protect another player’s push. Replaces usual Help.`;
  }
  const compactDetail = move === 'prepare' ? `Guaranteed +${p(1)} progress. ${preparationEndsChapter ? 'No later turn to spend this preparation.' : state.phase === 'ready' ? 'Keeps preparation unless it is spent this turn.' : 'Prepares safe/risky payoff if chapter continues.'} Replaces usual Help.`
    : move === 'spend-safe' ? `Guaranteed +${p(3)} progress; ${chaptersFor(room)[room.chapter].combat ? '2 party cover' : `danger −${p(2)} (minimum 0)`}. Uses preparation; replaces usual Help.`
    : move === 'spend-risk' ? `Win +${p(7)} progress; miss +${p(1)}. Both +${p(1)} danger. Uses preparation; miss needs Help repair unless an ally succeeds.`
    : move === 'push' ? `Win +${p(2)} progress, ${state.level >= 2 ? 'already at max 2 levels' : '+1 level (max 2)'}. Miss +${p(1)} progress, +${p(1)} danger; any miss loses unbanked levels. Help banks first.${lastTurn ? ' No later bank turn.' : ''}`
    : move === 'bank' ? `Guaranteed +${p(3 * state.level)} progress. Bank starting ${state.level}/2; this turn’s pushes cannot change it. Replaces usual Help.`
    : move === 'save' || move === 'salvage' ? `Guaranteed +${p(1)} progress, ${move === 'save' ? 'all saved' : 'some saved'} (+${move === 'save' ? 2 : 1} ${destination} progress). Replaces usual Help.${move === 'salvage' ? ' Full rescue wins ties.' : ''}`
    : move === 'rescue-risk' || move === 'recover' ? `Win +${p(move === 'recover' ? 2 : 4)} progress, +2 ${destination} progress. Miss +${p(1)} progress, +${p(1)} danger. Save by round ${definition.deadlineRound ?? 3}/chapter end or +1 ${destination} danger.`
    : `Guaranteed +${p(1)} progress; stabilize with nothing to bank. Other pushes stay at risk. Replaces usual Help.`;
  return { label, detail, compactDetail, guaranteed: choiceGuaranteed(move) };
}

/** Base points; the reducer scales progress/danger and clamps their recorded deltas. */
export function choiceMoveEffects(move: ChoiceMove, success: boolean, state: ChapterChoiceState, combat: boolean) {
  if (!success) return { progress: 1, danger: 1, cover: 0 };
  if (move === 'spend-risk') return { progress: 7, danger: 1, cover: 0 };
  if (move === 'spend-safe') return { progress: 3, danger: combat ? 0 : -2, cover: combat ? 2 : 0 };
  if (move === 'rescue-risk') return { progress: 4, danger: 0, cover: 0 };
  if (move === 'recover' || move === 'push') return { progress: 2, danger: 0, cover: 0 };
  if (move === 'bank') return { progress: 3 * state.level, danger: 0, cover: 0 };
  return { progress: 1, danger: 0, cover: 0 };
}

/** Shared changes happen once; no seat can consume another human's frozen opportunity. */
export function aggregateChoice(definition: ChapterChoiceDefinition, before: ChapterChoiceState, attempts: ChoiceAttempt[]): ChapterChoiceState {
  const state = { ...before };
  if (state.phase === 'settled') return state;
  const tried = (move: ChoiceMove) => attempts.some(attempt => attempt.move === move);
  if (definition.mode === 'prepare') {
    const spending = attempts.filter(attempt => attempt.move === 'spend-safe' || attempt.move === 'spend-risk');
    if (spending.length) return { ...state, phase: spending.some(attempt => attempt.success) ? 'open' : 'setback', level: 0,
      uses: (state.uses ?? 0) + Number(spending.some(attempt => attempt.success)) };
    if (tried('prepare')) return { ...state, phase: 'ready', level: 1 };
  } else if (definition.mode === 'rescue') {
    if (attempts.some(attempt => attempt.success && ['save', 'rescue-risk', 'recover'].includes(attempt.move))) return { ...state, phase: 'settled', level: 2, outcome: 'full' };
    if (tried('salvage')) return { ...state, phase: 'settled', level: 1, outcome: 'partial' };
    if (attempts.some(attempt => !attempt.success && ['rescue-risk', 'recover'].includes(attempt.move))) return { ...state, phase: 'setback', level: 0 };
  } else {
    if (tried('bank')) return { ...state, phase: 'settled', outcome: state.level >= 2 ? 'full' : 'partial' };
    const pushes = attempts.filter(attempt => attempt.move === 'push');
    if (pushes.some(attempt => !attempt.success)) return { ...state, phase: 'setback', level: 0 };
    if (pushes.length) return { ...state, phase: 'open', level: Math.min(2, state.level + 1) };
    if (tried('stabilize')) return { ...state, phase: 'open', level: 0 };
  }
  return state;
}

export function closeChoice(definition: ChapterChoiceDefinition, state: ChapterChoiceState): ChapterChoiceState {
  if (state.phase === 'settled') return state;
  const outcome = definition.mode === 'prepare' ? (state.uses ?? 0) > 0 ? 'full' : state.phase === 'ready' ? 'partial' : 'lost' : 'lost';
  return { ...state, phase: 'settled', level: definition.mode === 'press' ? 0 : state.level, outcome };
}

const uniqueContributors = (contributors: ChoiceContributor[]) => [...new Map(contributors.map(contributor => [contributor.actorId, contributor])).values()];
const names = (contributors: ChoiceContributor[]) => {
  const list = uniqueContributors(contributors).map(contributor => contributor.actorName);
  return list.length > 1 ? `${list.slice(0, -1).join(', ')} and ${list.at(-1)}` : list[0] ?? '';
};
export function choiceCreditText(credit: ChoiceCredit): string {
  const actors = names(credit.actors), sources = names(credit.sources ?? []);
  if (!actors) return '';
  if (credit.kind === 'prepared') return `Prepared by ${actors}.`;
  if (credit.kind === 'built') return `Built by ${actors}.`;
  if (credit.kind === 'rescued') return `Saved with ${actors}.`;
  if (credit.kind === 'banked') return `Banked by ${actors}${sources ? ` · built by ${sources}` : ''}.`;
  return `Used by ${actors}${sources ? ` · prepared by ${sources}` : ''}.`;
}

/** Metadata only, after the aggregate and chapter closure: never awards progress or XP. */
export function attributeChoice(definition: ChapterChoiceDefinition, before: ChapterChoiceState, after: ChapterChoiceState, attempts: ChoiceAttempt[]): { state: ChapterChoiceState; credit?: ChoiceCredit } {
  const state = { ...after };
  if (before.phase === 'settled') return { state };
  const contributors = (moves: ChoiceMove[]) => uniqueContributors(attempts.filter(attempt => attempt.success && moves.includes(attempt.move) && attempt.contributor).map(attempt => ({ ...attempt.contributor! })));
  const sourceCredit = (kind: 'payoff' | 'banked', actors: ChoiceContributor[]): ChoiceCredit => ({ kind, actors,
    ...(before.sources?.length ? { sources: before.sources.map(source => ({ ...source })) } : {}) });
  if (definition.mode === 'prepare') {
    if (attempts.some(attempt => attempt.move === 'spend-safe' || attempt.move === 'spend-risk')) {
      delete state.sources;
      const actors = contributors(['spend-safe', 'spend-risk']);
      return { state, ...(actors.length ? { credit: sourceCredit('payoff', actors) } : {}) };
    }
    const actors = contributors(['prepare']);
    if (before.phase !== 'ready' && actors.length) {
      state.sources = actors;
      return { state, credit: { kind: 'prepared', actors } };
    }
  } else if (definition.mode === 'press') {
    const bankers = contributors(['bank']);
    if (bankers.length) return { state, credit: sourceCredit('banked', bankers) };
    if (state.level === 0) delete state.sources;
    if (state.level > before.level) {
      const actors = contributors(['push']);
      if (actors.length) {
        state.sources = uniqueContributors([...(before.sources ?? []), ...actors]);
        return { state, credit: { kind: 'built', actors } };
      }
    }
  } else if (state.phase === 'settled') {
    delete state.sources;
    if (state.outcome !== 'lost') {
      const actors = contributors(['save', 'rescue-risk', 'recover', 'salvage']);
      if (actors.length) {
        state.sources = actors;
        return { state, credit: { kind: 'rescued', actors } };
      }
    }
  }
  return { state };
}

export function choiceStatus(room: AdventureRoom): { id: string; mode: ChapterChoiceDefinition['mode']; targetId: string; label: string; badge: string; detail: string; credit?: string; level: number; phase: ChapterChoiceState['phase']; outcome?: ChapterChoiceState['outcome'] } | undefined {
  const definition = choiceDefinition(room), state = choiceState(room);
  if (!definition || !state) return;
  const { mode, resource } = definition;
  let label: string, detail: string;
  if (state.phase === 'settled') {
    label = state.outcome === 'full' ? `${resource} secured` : state.outcome === 'partial' ? `${resource}: some saved` : `${resource}: opportunity closed`;
    detail = definition.endings[state.outcome ?? 'lost'];
  } else if (mode === 'prepare') {
    label = `${resource}: ${state.phase === 'ready' ? 'ready' : state.phase === 'setback' ? 'needs repair' : 'unprepared'}`;
    detail = state.phase === 'ready' ? 'Use Help for steady progress or risk a larger burst. The preparation is shared this turn.' : room.chapterRound >= 10 ? 'Last turn: new preparation cannot be spent later. Ordinary moves still advance the chapter.' : 'Help prepares a stronger choice if the chapter continues; ordinary moves still advance the chapter.';
  } else if (mode === 'rescue') {
    label = `${resource}: ${state.phase === 'setback' ? 'in trouble' : 'at risk'}`;
    detail = `Help saves ${state.phase === 'setback' ? 'some' : 'all'} safely; risk a roll for progress and a full rescue. Resolve by round ${definition.deadlineRound ?? 3} or chapter end.`;
  } else {
    label = `${resource}: ${state.level}/2`;
    detail = state.level ? `Help banks the starting level. ${state.level >= 2 ? 'The shared benefit is full; another push risks it without adding a level.' : 'Another push may grow it; any failed push loses unbanked gains.'} Chapter end loses unbanked gains.`
      : room.chapterRound >= 10 ? 'Last turn: new levels cannot be banked later. Ordinary moves still advance the chapter.' : 'Push to build a shared benefit, then bank it with Help. Each turn can add one level; unbanked gains are at risk.';
  }
  const roundsLeft = Math.max(0, (definition.deadlineRound ?? 3) - room.chapterRound + (room.phase === 'choosing' ? 1 : 0));
  const badge = mode === 'prepare' ? state.phase === 'ready' ? 'Ready' : state.phase === 'setback' ? 'Repair' : state.phase === 'settled' ? (state.uses ?? 0) > 0 ? 'Done' : 'Not used' : 'Prepare'
    : mode === 'rescue' ? state.phase === 'settled' ? state.outcome === 'full' ? 'All saved' : state.outcome === 'partial' ? 'Some saved' : 'Lost' : state.phase === 'setback' ? 'Recover' : `${roundsLeft} ${roundsLeft === 1 ? 'round' : 'rounds'}`
    : state.phase === 'settled' ? state.outcome === 'lost' ? 'Not banked' : 'Banked' : `${state.level}/2 unbanked`;
  return { id: definition.id, mode, targetId: (mode === 'prepare' && state.phase === 'ready') || (mode === 'rescue' && state.phase === 'setback') || (mode === 'press' && state.level > 0) ? definition.secondaryId : definition.primaryId,
    label, badge, detail, ...(state.sources?.length ? { credit: `${mode === 'prepare' ? 'Prepared by' : mode === 'press' ? 'Built by' : 'Saved with'} ${names(state.sources)}` } : {}), level: state.level, phase: state.phase, outcome: state.outcome };
}

export function choiceTarget(room: AdventureRoom, target: SceneTarget): SceneTarget {
  const definition = choiceDefinition(room), status = choiceStatus(room);
  if (!definition || !status || ![definition.primaryId, definition.secondaryId].includes(target.id)) return target;
  const tokens = [...target.tokens], actionCues = { ...target.actionCues };
  for (const token of ['fight', 'influence', 'investigate', 'assist'] as TokenKind[]) {
    const preview = choiceActionPreview(room, { token, targetId: target.id });
    if (preview) { if (!tokens.includes(token)) tokens.push(token); actionCues[token] = preview.label; }
  }
  // Choice markers carry state; do not switch existing art to an unrelated developed illustration.
  return { ...target, tokens, actionCues, context: `${status.phase === 'settled' ? '' : `${definition.context} `}${status.detail}` };
}

export function choiceChange(definition: ChapterChoiceDefinition, before: ChapterChoiceState, after: ChapterChoiceState, closing: boolean): SceneChange {
  const resource = definition.resource;
  if (after.phase === 'settled') return { title: definition.title, text: `${definition.endings[after.outcome ?? 'lost']}${closing && definition.mode === 'press' && before.level > 0 && after.outcome === 'lost' ? ` ${before.level} unbanked ${resource} levels are lost.` : ''}`,
    next: closing ? 'Your contributions and chapter rewards stay with you.' : 'Ordinary moves remain available; finish the chapter together.' };
  if (definition.mode === 'prepare') return after.phase === 'ready'
    ? { title: `${resource} is ready`, text: 'The preparation opens a stronger choice on the following turn.', next: 'Use Help for a steady payoff, or risk the larger burst.' }
    : after.phase === 'setback' ? { title: `${resource} needs repair`, text: 'The attempt used the preparation without securing its payoff.', next: 'Help repairs it for another turn; ordinary moves still advance the chapter.' }
    : { title: `${resource} was put to use`, text: 'The party spent the preparation together.', next: 'Prepare again, or continue with ordinary moves.' };
  if (definition.mode === 'rescue') return { title: `${resource} is in trouble`, text: 'The attempt leaves a new recovery choice.', next: 'Help salvages some; Investigate the other marked target to try recovering all.' };
  return after.phase === 'setback' ? { title: `${resource} slipped away`, text: 'A missed push loses all unbanked levels. Earned progress and rewards remain.', next: 'Help steadies the scene, or try another push.' }
    : { title: `${resource}: ${after.level}/2`, text: after.level > before.level ? 'The party builds one shared level this turn.' : 'The scene is steady again.', next: after.level ? 'Bank with Help, or risk another push. Unbanked gains are lost when the chapter ends.' : 'Build a level before banking it.' };
}
