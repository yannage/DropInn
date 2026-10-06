import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { createQuestDiceGesture, questDiceLanding, questDieRotation, questMotionImpulse, type QuestDiceContext } from './questDiceGesture';

describe('explicit quest die release', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(10_000); });
  afterEach(() => vi.useRealTimers());
  function setup() {
    const context: QuestDiceContext = { key: 'room:turn:challenge', enabled: true, pending: false, visible: true, deadline: 20_000 };
    const onRoll = vi.fn(), onChange = vi.fn();
    const control = createQuestDiceGesture({ getContext: () => context, onRoll, onChange });
    return { context, onRoll, onChange, control };
  }
  it('swirling prepares decoration and only an inside release sends one argument-free move', () => {
    const { control, onRoll } = setup();
    expect(control.start(1, 100, 100)).toBe(true);
    control.move(1, 150, 130); control.move(1, 90, 110);
    expect(control.snapshot().charge).toBeGreaterThan(0);
    expect(onRoll).not.toHaveBeenCalled();
    expect(control.release(1, true)).toBe(true);
    control.release(1, true); control.roll(); control.roll();
    expect(onRoll).toHaveBeenCalledExactlyOnceWith();
  });
  it('a plain tap and keyboard/AT roll need no shake charge', () => {
    const first = setup(); first.control.start(1, 10, 10); first.control.release(1, true);
    expect(first.onRoll).toHaveBeenCalledExactlyOnceWith();
    const second = setup(); expect(second.control.roll()).toBe(true);
    expect(second.onRoll).toHaveBeenCalledExactlyOnceWith();
  });
  it.each(['outside', 'cancel', 'hidden', 'disabled', 'pending', 'deadline', 'new-key', 'new-deadline'] as const)('%s cancels the prepared pointer without sending', reason => {
    const { context, control, onRoll } = setup();
    control.start(2, 10, 10); control.move(2, 30, 50);
    if (reason === 'cancel') control.cancel();
    if (reason === 'hidden') context.visible = false;
    if (reason === 'disabled') context.enabled = false;
    if (reason === 'pending') context.pending = true;
    if (reason === 'deadline') vi.setSystemTime(context.deadline);
    if (reason === 'new-key') context.key = 'next challenge';
    if (reason === 'new-deadline') context.deadline++;
    expect(control.release(2, reason !== 'outside')).toBe(false);
    expect(onRoll).not.toHaveBeenCalled();
    expect(control.snapshot().holding).toBe(false);
  });
  it('ignores a second pointer and lets only the original pointer release', () => {
    const { control, onRoll } = setup();
    control.start(1, 0, 0);
    expect(control.start(2, 0, 0)).toBe(false);
    control.move(2, 100, 100); expect(control.snapshot().charge).toBe(0);
    expect(control.release(2, true)).toBe(false);
    expect(onRoll).not.toHaveBeenCalled();
    control.release(1, true); expect(onRoll).toHaveBeenCalledOnce();
  });
  it('holds one submission latch through disabled and pending states until the challenge changes', () => {
    const { context, control, onRoll } = setup();
    control.roll(); context.pending = true; context.enabled = false; control.sync();
    context.pending = false; context.enabled = true; control.sync();
    expect(control.roll()).toBe(false);
    context.key = 'new turn'; control.sync();
    expect(control.roll()).toBe(true);
    expect(onRoll).toHaveBeenCalledTimes(2);
  });
  it('deadline guards every alternative even when the parent UI has not rendered the clock tick', () => {
    const { context, control, onRoll } = setup();
    vi.setSystemTime(context.deadline);
    expect(control.roll()).toBe(false); expect(control.start(1, 0, 0)).toBe(false);
    expect(control.jostle(10, 10, 1)).toBe(false);
    expect(onRoll).not.toHaveBeenCalled();
  });
  it('many strong motion samples can never send a move or change its payload', () => {
    const { control, onRoll } = setup();
    for (let index = 0; index < 100; index++) control.jostle(index, -index, 10);
    expect(control.snapshot()).toMatchObject({ charge: 1, holding: false, submitted: false });
    expect(Math.abs(control.snapshot().tiltX)).toBeLessThanOrEqual(18);
    expect(onRoll).not.toHaveBeenCalled();
    control.roll(); expect(onRoll).toHaveBeenCalledExactlyOnceWith();
  });
  it('disposal suppresses stale callbacks and StrictMode activation starts a safe new mounted scope', () => {
    const { control, onRoll } = setup();
    control.start(1, 0, 0); control.dispose();
    expect(control.release(1, true)).toBe(false); expect(control.roll()).toBe(false);
    control.activate(); expect(control.roll()).toBe(true);
    expect(onRoll).toHaveBeenCalledOnce();
  });
  it('invalid pointer and sensor values cannot poison subsequent input', () => {
    const { control, onRoll } = setup();
    expect(control.start(1, NaN, 0)).toBe(false);
    expect(control.jostle(Infinity, 0, 1)).toBe(false);
    control.start(1, 0, 0); control.move(1, 1, NaN); control.release(1, true);
    expect(onRoll).toHaveBeenCalledOnce();
  });
});

describe('motion and confirmed die presentation', () => {
  it('ignores missing sensors, gravity at rest, small noise and impossible samples', () => {
    const still = { x: 0, y: 0, z: 9.8 };
    expect(questMotionImpulse(undefined, still)).toBeUndefined();
    expect(questMotionImpulse(still, still)).toBeUndefined();
    expect(questMotionImpulse(still, { x: .3, y: .2, z: 10 })).toBeUndefined();
    expect(questMotionImpulse(still, { x: null, y: 0, z: 9.8 })).toBeUndefined();
    expect(questMotionImpulse(still, { x: Infinity, y: 0, z: 9.8 })).toBeUndefined();
    expect(questMotionImpulse(still, { x: 200, y: 0, z: 9.8 })).toBeUndefined();
    expect(questMotionImpulse(still, { x: 5, y: -4, z: 11 })?.strength).toBeGreaterThan(0);
  });
  it('maps exactly the six server faces; never clamps an invalid result into a face', () => {
    for (let value = 1; value <= 6; value++) expect(questDieRotation(value)).toHaveLength(2);
    for (const value of [0, 7, 1.5, NaN]) expect(questDieRotation(value)).toBeUndefined();
  });
  it('only newly observed live results animate inside their existing timestamp window', () => {
    expect(questDiceLanding(1000, 1200, true, false, true)).toEqual({ elapsed: 200, animate: true });
    expect(questDiceLanding(1000, 1650, true, false, true).animate).toBe(false);
    expect(questDiceLanding(1000, 8000, true, false, true).animate).toBe(false);
    expect(questDiceLanding(1000, 900, true, false, true).animate).toBe(false);
    expect(questDiceLanding(1000, 1200, false, false, true).animate).toBe(false);
    expect(questDiceLanding(1000, 1200, true, true, true).animate).toBe(false);
    expect(questDiceLanding(1000, 1200, true, false, false).animate).toBe(false);
  });
});
