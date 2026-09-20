import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTimedReleaseController } from './TimedRelease';

describe('timed release lifecycle', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(10_000); });
  afterEach(() => vi.useRealTimers());

  function setup(deadline = 40_000) {
    const context = { disabled: false, turn: 2, deadline };
    const commit = vi.fn();
    const holding = vi.fn();
    const control = createTimedReleaseController({ getContext: () => context, onCommit: commit, onHoldingChange: holding });
    return { context, commit, holding, control };
  }

  it.each([200, 650, 800, 950, 1100])('submits the measured %ims release once, leaving the bonus to the server', release => {
    const { control, commit, holding } = setup();
    expect(control.start()).toBe(true);
    expect(control.start()).toBe(false);
    vi.advanceTimersByTime(release);
    control.release();
    control.release();
    control.rollNow();
    vi.advanceTimersByTime(2000);
    expect(commit).toHaveBeenCalledExactlyOnceWith(release);
    expect(holding.mock.calls).toEqual([[true], [false]]);
  });

  it('submits an ordinary move at 1200ms even if the player keeps holding', () => {
    const { control, commit } = setup();
    control.start();
    vi.advanceTimersByTime(1200);
    control.release();
    expect(commit).toHaveBeenCalledExactlyOnceWith(1200);
  });

  it('allows an assisted tap to finish at 800ms with the same timing payload', () => {
    const { control, commit } = setup();
    control.start(true);
    vi.advanceTimersByTime(50);
    control.release();
    expect(commit).not.toHaveBeenCalled();
    vi.advanceTimersByTime(750);
    expect(commit).toHaveBeenCalledExactlyOnceWith(800);
  });

  it('cancels pointer or keyboard interruption without spending the action and can retry', () => {
    const { control, commit, holding } = setup();
    control.start();
    vi.advanceTimersByTime(700);
    control.cancel();
    vi.advanceTimersByTime(1000);
    control.release();
    expect(commit).not.toHaveBeenCalled();
    expect(holding.mock.calls).toEqual([[true], [false]]);
    expect(control.start()).toBe(true);
    vi.advanceTimersByTime(800);
    control.release();
    expect(commit).toHaveBeenCalledExactlyOnceWith(800);
  });

  it('cancels an assisted attempt too', () => {
    const { control, commit } = setup();
    control.start(true);
    control.cancel();
    vi.advanceTimersByTime(800);
    expect(commit).not.toHaveBeenCalled();
  });

  it.each([false, true])('never submits when the turn expires during a hold (assisted: %s)', assisted => {
    const { control, commit, holding } = setup(10_700);
    control.start(assisted);
    vi.advanceTimersByTime(700);
    control.release();
    expect(commit).not.toHaveBeenCalled();
    expect(holding).toHaveBeenLastCalledWith(false);
    expect(control.start()).toBe(false);
    expect(control.rollNow()).toBe(false);
  });

  it.each(['turn', 'deadline', 'disabled'] as const)('rejects a stale hold when %s changes before cancellation renders', field => {
    const { context, control, commit } = setup();
    control.start();
    vi.advanceTimersByTime(800);
    if (field === 'disabled') context.disabled = true;
    else context[field] += 1;
    control.release();
    expect(commit).not.toHaveBeenCalled();
  });

  it('checks the actual deadline again when a suspended browser resumes before its timer callback', () => {
    const { control, commit } = setup(11_000);
    control.start(true);
    vi.setSystemTime(15_000);
    vi.advanceTimersByTime(800);
    expect(commit).not.toHaveBeenCalled();
  });

  it('skips timing without a payload, prevents duplicate activation, and resets for a new opportunity', () => {
    const { control, commit } = setup();
    expect(control.rollNow()).toBe(true);
    expect(control.rollNow()).toBe(false);
    expect(control.start()).toBe(false);
    expect(commit).toHaveBeenCalledExactlyOnceWith();
    control.reset();
    expect(control.start()).toBe(true);
    vi.advanceTimersByTime(800);
    control.release();
    expect(commit.mock.calls).toEqual([[], [800]]);
  });

  it('does not turn a second control activation during a hold into a second action', () => {
    const { control, commit } = setup();
    control.start();
    expect(control.rollNow()).toBe(false);
    expect(commit).not.toHaveBeenCalled();
  });
});
