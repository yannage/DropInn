/** Presentation and input only. Neither shaking strength nor die appearance enters the command. */
export interface QuestDiceContext { key: string; enabled: boolean; pending: boolean; visible: boolean; deadline: number }
export interface QuestDiceGestureState { holding: boolean; charge: number; tiltX: number; tiltY: number; submitted: boolean }
export const QUEST_DICE_REST: QuestDiceGestureState = { holding: false, charge: 0, tiltX: 0, tiltY: 0, submitted: false };
const clamp = (value: number, limit: number) => Math.max(-limit, Math.min(limit, value));

/** The one submission latch covers pointer release, tap, keyboard and AT activation. */
export function createQuestDiceGesture(options: {
  getContext: () => QuestDiceContext;
  onChange: (state: QuestDiceGestureState) => void;
  onRoll: () => void;
  now?: () => number;
}) {
  const now = options.now ?? Date.now;
  let key = options.getContext().key;
  let state = { ...QUEST_DICE_REST };
  let held: { pointerId: number; x: number; y: number; key: string; deadline: number } | undefined;
  let disposed = false;
  const publish = () => { if (!disposed) options.onChange({ ...state }); };
  const allowed = () => {
    const context = options.getContext();
    return !disposed && context.enabled && !context.pending && context.visible && Number.isFinite(context.deadline) && now() < context.deadline;
  };
  const cancel = () => { held = undefined; state = { ...QUEST_DICE_REST, submitted: state.submitted }; publish(); };
  const sync = () => {
    const context = options.getContext();
    if (key !== context.key) { key = context.key; state = { ...QUEST_DICE_REST }; cancel(); }
    else if (!allowed() || held && held.deadline !== context.deadline) cancel();
  };
  const roll = () => {
    sync();
    if (held || state.submitted || !allowed()) return false;
    state = { ...QUEST_DICE_REST, submitted: true }; publish();
    options.onRoll();
    return true;
  };
  return {
    start(pointerId: number, x: number, y: number) {
      sync();
      if (held || state.submitted || !allowed() || ![pointerId, x, y].every(Number.isFinite)) return false;
      held = { pointerId, x, y, key, deadline: options.getContext().deadline };
      state = { ...state, holding: true }; publish();
      return true;
    },
    move(pointerId: number, x: number, y: number) {
      if (!held || held.pointerId !== pointerId || ![x, y].every(Number.isFinite)) return;
      sync(); if (!held) return;
      const dx = x - held.x, dy = y - held.y;
      held.x = x; held.y = y;
      state = { ...state, charge: Math.min(1, state.charge + Math.hypot(dx, dy) / 200), tiltX: clamp(-dy * 1.8, 22), tiltY: clamp(dx * 1.8, 26) };
      publish();
    },
    release(pointerId: number, inside: boolean) {
      if (!held || held.pointerId !== pointerId) return false;
      const started = held;
      const context = options.getContext();
      const valid = inside && started.key === context.key && started.deadline === context.deadline && allowed();
      cancel();
      return valid ? roll() : false;
    },
    /** Sensor input can only jostle preparation. Explicit release/button input owns submission. */
    jostle(x: number, y: number, strength: number) {
      sync();
      if (!allowed() || held || state.submitted || ![x, y, strength].every(Number.isFinite) || strength <= 0) return false;
      state = { ...state, charge: Math.min(1, state.charge + Math.min(strength, 1) * .18), tiltX: clamp(y * 3, 18), tiltY: clamp(x * 3, 22) };
      publish(); return true;
    },
    roll, cancel, sync,
    activate() { disposed = false; sync(); },
    snapshot: () => ({ ...state }),
    dispose() { disposed = true; held = undefined; },
  };
}

export interface QuestMotionVector { x: number | null; y: number | null; z: number | null }
/** Ignore missing sensors, gravity at rest and implausible samples. */
export function questMotionImpulse(previous: QuestMotionVector | undefined, current: QuestMotionVector | undefined) {
  if (!previous || !current || ![previous.x, previous.y, previous.z, current.x, current.y, current.z].every(value => typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= 100)) return undefined;
  const x = current.x! - previous.x!, y = current.y! - previous.y!, z = current.z! - previous.z!;
  const magnitude = Math.hypot(x, y, z);
  return magnitude >= 3 ? { x, y, strength: Math.min(1, magnitude / 15) } : undefined;
}

export const QUEST_DICE_LAND_MS = 650;
export function questDieRotation(value: number) {
  return ({ 1: [0, 0], 2: [0, -90], 3: [-90, 0], 4: [90, 0], 5: [0, 90], 6: [0, 180] } as Record<number, number[]>)[value];
}
export function questDiceLanding(at: number, now: number, live: boolean, quiet: boolean, visible: boolean) {
  const elapsed = now - at;
  return { elapsed: Math.max(0, Number.isFinite(elapsed) ? elapsed : QUEST_DICE_LAND_MS), animate: live && visible && !quiet && elapsed >= 0 && elapsed < QUEST_DICE_LAND_MS };
}
