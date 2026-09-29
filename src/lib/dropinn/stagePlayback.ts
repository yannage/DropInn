import type { AdventureRoom, StoryEvent } from './types';
import { getScene } from './scene';

export function stageEvents(room: AdventureRoom) {
  const seen = new Set<string>();
  return room.events.filter(event => event.chapter === room.chapter && event.turn === room.turn && event.result
    && !seen.has(event.id) && !!seen.add(event.id));
}
export function stageTimeline(room: AdventureRoom) {
  const events = stageEvents(room);
  const origin = events[0]?.at ?? room.updatedAt;
  const spacing = Math.min(1050, 4700 / Math.max(1, events.length - 1));
  // Busy rounds compress the whole beat, not just its start: overlapping windows
  // made `find` keep an earlier event active while later consequences disappeared.
  const duration = Math.min(900, spacing);
  return events.map((event, index) => ({ event, start: origin + 150 + index * spacing, duration }));
}

/** Let the player's confirmed hit settle before automatic history covers it. */
export function roundScrollReadyAt(room: AdventureRoom, actorId: string) {
  const timeline = stageTimeline(room);
  const origin = timeline[0] ? timeline[0].start - 150 : room.updatedAt;
  const own = timeline.find(beat => beat.event.actorId === actorId && beat.event.kind === 'action');
  return Math.min(origin + 5850, Math.max(origin + 1800, own ? own.start + own.duration + 650 : origin + 1800));
}

/** Presentation only. Never feed this projection back to the command store. */
export function stageProjection(room: AdventureRoom, before: AdventureRoom | undefined, now: number, immediate = false) {
  const timeline = stageTimeline(room);
  const canAnimate = !immediate && room.phase === 'reveal' && before?.id === room.id && before.turn === room.turn && before.chapter === room.chapter;
  const landed = timeline.filter(beat => !canAnimate || now >= beat.start + beat.duration / 3).map(beat => beat.event);
  const active = canAnimate ? timeline.find(beat => now >= beat.start && now < beat.start + beat.duration) : undefined;
  const settled = !canAnimate || timeline.every(beat => now >= beat.start + beat.duration);
  if (!canAnimate || settled) return { scene: getScene(room), seats: room.seats, progress: room.progress, danger: room.danger, active, landed, settled };
  const scene = getScene(room), previous = getScene(before!);
  const changed = new Set(landed.filter(event => event.result?.changed).map(event => event.result?.targetId));
  return {
    scene: { ...previous, targets: scene.targets.map(target => changed.has(target.id) ? target : previous.targets.find(old => old.id === target.id) ?? target) },
    seats: room.seats.map(seat => {
      const health = landed.filter(event => event.result?.targetKind === 'hero' && event.result.targetId === seat.actorId && event.result.hp !== undefined).at(-1)?.result?.hp;
      return { ...seat, hp: health ?? before!.seats.find(old => old.actorId === seat.actorId)?.hp ?? seat.hp };
    }),
    progress: Math.min(scene.progressGoal, before!.progress + landed.reduce((sum, event) => sum + (event.result?.progress ?? 0), 0)),
    danger: landed.reduce((value, event) => Math.max(0, value + (event.result?.danger ?? 0)), before!.danger),
    active, landed, settled,
  };
}
export function stageCaption(event: StoryEvent) {
  const r = event.result;
  const labels = [r?.progress ? `+${r.progress} progress` : '', r?.damage ? `−${r.damage} HP` : '',
    r?.healing ? `+${r.healing} HP` : '', r?.protection ? `${r.protection} protection` : '',
    r?.danger ? `${r.danger > 0 ? '+' : '−'}${Math.abs(r.danger)} danger` : ''].filter(Boolean);
  return `${event.actorName ?? ''}${event.actorName ? ': ' : ''}${r?.combination && event.success === false ? `${r.combination.label} · missed; attempt spent` : r?.combination?.label ?? event.change?.title ?? (event.success === false ? 'A complication' : r?.damage === 0 ? 'Attack blocked' : 'A little magic')}${labels.length ? ` · ${labels.join(' · ')}` : ''}`;
}

/** Shared across view remounts; mounted-mid-reveal clients never replay old effects. */
const played = new Set<string>();
export function claimStageSound(eventId: string) {
  if (played.has(eventId)) return false;
  played.add(eventId);
  if (played.size > 512) played.delete(played.values().next().value!);
  return true;
}
