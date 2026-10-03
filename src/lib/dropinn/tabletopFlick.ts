/** A local table toy. It deliberately has no dependency on room state, dice or rewards. */
export interface FlickPoint { x: number; y: number }
export interface FlickAim { angle: number; power: number }
export interface FlickLanding { point: FlickPoint; distance: number; onCoaster: boolean; feedback: string }
export const FLICK_ORIGIN: FlickPoint = { x: 48, y: 64 };
export const FLICK_COASTERS: readonly FlickPoint[] = [{ x: 231, y: 38 }, { x: 207, y: 72 }, { x: 257, y: 53 }];
export const FLICK_DEFAULT_AIM: FlickAim = { angle: -8, power: 72 };
export const FLICK_DURATION = 520;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));

export function boundedFlickAim(aim: FlickAim): FlickAim {
  return { angle: clamp(aim.angle, -28, 28), power: clamp(aim.power, 0, 100) };
}

/** Pointer distances are in the SVG's 300 × 100 coordinates, not device pixels. */
export function pullFlickAim(deltaX: number, deltaY: number): FlickAim {
  const x = Math.max(0, -deltaX), y = -deltaY;
  return boundedFlickAim({ angle: Math.atan2(y, x || .001) * 180 / Math.PI, power: Math.hypot(x, y) / 46 * 100 });
}

export function adjustFlickAim(aim: FlickAim, key: string): FlickAim {
  return boundedFlickAim({ angle: aim.angle + (key === 'ArrowUp' ? -2 : key === 'ArrowDown' ? 2 : 0), power: aim.power + (key === 'ArrowRight' ? 4 : key === 'ArrowLeft' ? -4 : 0) });
}

/** One reproducible friction curve, so the previous landing teaches the next shot. */
export function landFlick(input: FlickAim, coaster: FlickPoint): FlickLanding {
  const aim = boundedFlickAim(input), radians = aim.angle * Math.PI / 180;
  const travel = 230 * (aim.power / 100) ** 1.25;
  const point = { x: clamp(FLICK_ORIGIN.x + Math.cos(radians) * travel, 12, 288), y: clamp(FLICK_ORIGIN.y + Math.sin(radians) * travel, 12, 88) };
  const distance = Math.hypot(point.x - coaster.x, point.y - coaster.y);
  // A 10-unit counter fits completely inside the 21-unit coaster at this distance.
  const onCoaster = distance <= 11;
  const horizontal = point.x - coaster.x, vertical = point.y - coaster.y;
  const feedback = onCoaster ? 'On the coaster. A tidy little flick.'
    : Math.abs(vertical) > 17 && Math.abs(vertical) > Math.abs(horizontal) * .6 ? (vertical < 0 ? 'A little high. Aim lower.' : 'A little low. Aim higher.')
      : horizontal < 0 ? 'A little short. Try more strength.' : 'A little far. Try a gentler flick.';
  return { point, distance, onCoaster, feedback };
}

export interface FlickContext { active: boolean; visible: boolean; roundKey: string; reducedMotion: boolean }
export interface FlickShot { id: number; roundKey: string; landing: FlickLanding; running: boolean }

/** Owns one bounded flight. No resumed tab or stale pointer may replay an old shot. */
export function createTabletopFlickController(options: { getContext: () => FlickContext; onChange: (shot: FlickShot | undefined) => void; onLand?: () => void }) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let shot: FlickShot | undefined;
  let serial = 0;
  let disposed = false;
  const clearTimer = () => { if (timer !== undefined) clearTimeout(timer); timer = undefined; };
  const cancel = () => { clearTimer(); if (shot) { shot = undefined; if (!disposed) options.onChange(undefined); } };
  const settle = () => {
    clearTimer();
    if (!shot || disposed) return;
    const context = options.getContext();
    if (!context.active || !context.visible || context.roundKey !== shot.roundKey) { cancel(); return; }
    shot = { ...shot, running: false };
    options.onChange(shot);
    options.onLand?.();
  };
  return {
    flick(aim: FlickAim, coaster: FlickPoint) {
      const context = options.getContext();
      if (disposed || !context.active || !context.visible || shot?.running) return false;
      shot = { id: ++serial, roundKey: context.roundKey, landing: landFlick(aim, coaster), running: !context.reducedMotion };
      options.onChange(shot);
      if (shot.running) timer = setTimeout(settle, FLICK_DURATION);
      else options.onLand?.();
      return true;
    },
    sync() {
      const context = options.getContext();
      if (!context.active || !context.visible || context.roundKey !== shot?.roundKey) cancel();
      else if (context.reducedMotion && shot?.running) settle();
    },
    cancel,
    dispose() { disposed = true; clearTimer(); shot = undefined; },
  };
}
