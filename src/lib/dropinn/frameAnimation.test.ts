import { describe, expect, it } from 'vitest';
import { frameBackgroundPosition, framePlayback } from './frameAnimation';

describe('painted frame playback', () => {
  it('selects a whole cell across the row boundary without exposing adjacent cells', () => {
    expect(frameBackgroundPosition(0)).toBe('0% 0%');
    expect(frameBackgroundPosition(3)).toBe('100% 0%');
    expect(frameBackgroundPosition(4)).toBe('0% 100%');
    expect(frameBackgroundPosition(7)).toBe('100% 100%');
    expect(frameBackgroundPosition(99)).toBe('100% 100%');
  });
  it('rejoins an existing confirmed beat at its recorded age instead of restarting', () => {
    expect(framePlayback('discovery', 800, 525)).toEqual({ duration: 800, offset: 525, frame: 5, completed: false });
    expect(framePlayback('discovery', 800, 1200)).toEqual({ duration: 800, offset: 800, frame: 7, completed: true });
  });
  it('wraps a looping loader while a one-shot visual stays on its last frame', () => {
    expect(framePlayback('sheep-loading', 800, 1700, true)).toEqual({ duration: 800, offset: 100, frame: 1, completed: false });
    expect(framePlayback('encounter', 800, 1700, false).frame).toBe(7);
  });
  it('uses a safe authored pace for invalid input and never introduces a wait', () => {
    expect(framePlayback('discovery', NaN, Infinity)).toEqual({ duration: 800, offset: 0, frame: 0, completed: false });
    expect(framePlayback('discovery', -1, -100).duration).toBe(800);
    expect(framePlayback('discovery', 10, 1000).completed).toBe(true);
    expect(frameBackgroundPosition(NaN)).toBe('0% 0%');
  });
});
