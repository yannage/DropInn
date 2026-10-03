import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FLICK_COASTERS, FLICK_DURATION, FLICK_ORIGIN, adjustFlickAim, boundedFlickAim, createTabletopFlickController, landFlick, pullFlickAim, type FlickContext } from './tabletopFlick';

describe('a spare counter on the local table', () => {
  it('has a reproducible landing that teaches force and aim without random dice', () => {
    const coaster = FLICK_COASTERS[0];
    const aim = { angle: Math.atan2(coaster.y - FLICK_ORIGIN.y, coaster.x - FLICK_ORIGIN.x) * 180 / Math.PI, power: (Math.hypot(coaster.x - FLICK_ORIGIN.x, coaster.y - FLICK_ORIGIN.y) / 230) ** .8 * 100 };
    const landing = landFlick(aim, coaster);
    expect(landing.distance).toBeLessThan(.001);
    expect(landing.onCoaster).toBe(true);
    expect(landFlick(aim, coaster)).toEqual(landing);
    expect(landFlick({ ...aim, power: 35 }, coaster).feedback).toContain('short');
    expect(landFlick({ ...aim, power: 100 }, coaster).feedback).toContain('far');
    expect(landFlick({ ...aim, angle: 10 }, coaster).feedback).toContain('low');
  });

  it('maps touch pull and keyboard adjustments to the same bounded shot', () => {
    const aim = pullFlickAim(-23, 0);
    expect(aim).toEqual({ angle: -0, power: 50 });
    expect(adjustFlickAim(aim, 'ArrowRight').power).toBe(54);
    expect(adjustFlickAim(aim, 'ArrowUp').angle).toBe(-2);
    expect(pullFlickAim(20, 0).power).toBe(0);
    expect(boundedFlickAim({ angle: -999, power: 999 })).toEqual({ angle: -28, power: 100 });
    expect(boundedFlickAim({ angle: NaN, power: Infinity })).toEqual({ angle: -28, power: 0 });
    for (const angle of [-28, 0, 28]) for (const power of [0, 25, 75, 100]) {
      const { point } = landFlick({ angle, power }, FLICK_COASTERS[0]);
      expect(point.x).toBeGreaterThanOrEqual(12); expect(point.x).toBeLessThanOrEqual(288);
      expect(point.y).toBeGreaterThanOrEqual(12); expect(point.y).toBeLessThanOrEqual(88);
    }
  });
});

describe('local flick lifecycle', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());
  function setup() {
    const context: FlickContext = { active: true, visible: true, roundKey: 'table:3', reducedMotion: false };
    const onChange = vi.fn(), onLand = vi.fn();
    const control = createTabletopFlickController({ getContext: () => context, onChange, onLand });
    return { context, onChange, onLand, control };
  }
  const aim = { angle: -8, power: 82 };
  it('permits only one short animation at a time and rests without another timer', () => {
    const { control, onChange, onLand } = setup();
    expect(control.flick(aim, FLICK_COASTERS[0])).toBe(true);
    expect(control.flick(aim, FLICK_COASTERS[0])).toBe(false);
    expect(vi.getTimerCount()).toBe(1);
    vi.advanceTimersByTime(FLICK_DURATION);
    expect(onChange.mock.lastCall?.[0].running).toBe(false);
    expect(onLand).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
    expect(control.flick(aim, FLICK_COASTERS[0])).toBe(true);
  });
  it.each(['round', 'hidden', 'inactive'] as const)('cancels stale %s work before a delayed completion can run', change => {
    const { control, context, onChange, onLand } = setup();
    control.flick(aim, FLICK_COASTERS[0]);
    if (change === 'round') context.roundKey = 'table:4';
    if (change === 'hidden') context.visible = false;
    if (change === 'inactive') context.active = false;
    vi.advanceTimersByTime(FLICK_DURATION + 100);
    expect(onChange).toHaveBeenLastCalledWith(undefined);
    expect(onLand).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
  it('places a reduced-motion shot immediately, and follows a live preference change', () => {
    const { control, context, onChange, onLand } = setup();
    context.reducedMotion = true;
    control.flick(aim, FLICK_COASTERS[0]);
    expect(onChange.mock.lastCall?.[0].running).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
    context.reducedMotion = false;
    control.flick(aim, FLICK_COASTERS[0]);
    context.reducedMotion = true; control.sync();
    expect(onChange.mock.lastCall?.[0].running).toBe(false);
    expect(onLand).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(0);
  });
  it('cleans cancellation and unmount with no late callback', () => {
    const { control, onChange, onLand } = setup();
    control.flick(aim, FLICK_COASTERS[0]); control.cancel();
    expect(vi.getTimerCount()).toBe(0);
    control.flick(aim, FLICK_COASTERS[0]); control.dispose();
    const calls = onChange.mock.calls.length;
    vi.advanceTimersByTime(1000);
    expect(onChange).toHaveBeenCalledTimes(calls);
    expect(onLand).not.toHaveBeenCalled();
    expect(control.flick(aim, FLICK_COASTERS[0])).toBe(false);
  });
  it('does not start during an inactive or hidden wait', () => {
    const { control, context, onChange } = setup();
    context.active = false;
    expect(control.flick(aim, FLICK_COASTERS[0])).toBe(false);
    context.active = true; context.visible = false;
    expect(control.flick(aim, FLICK_COASTERS[0])).toBe(false);
    expect(onChange).not.toHaveBeenCalled();
  });
});
