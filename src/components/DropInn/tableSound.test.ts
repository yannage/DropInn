import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const param = () => ({ setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() });
const makeNode = () => ({
  connect: vi.fn(), disconnect: vi.fn(), start: vi.fn(), stop: vi.fn(),
  frequency: param(), Q: param(), gain: param(), type: '',
  buffer: undefined as unknown, onended: null as (() => void) | null,
});

function audioHarness() {
  const nodes: ReturnType<typeof makeNode>[] = [];
  const sources: ReturnType<typeof makeNode>[] = [];
  const gains: ReturnType<typeof makeNode>[] = [];
  function node() {
    const value = makeNode();
    nodes.push(value);
    return value;
  }
  const context = {
    state: 'running', currentTime: 10, sampleRate: 44100, destination: {},
    resume: vi.fn(async () => { context.state = 'running'; }),
    createGain: vi.fn(() => { const gain = node(); gains.push(gain); return gain; }),
    createOscillator: vi.fn(() => { const source = node(); sources.push(source); return source; }),
    createBufferSource: vi.fn(() => { const source = node(); sources.push(source); return source; }),
    createBiquadFilter: vi.fn(node),
    createBuffer: vi.fn((_channels: number, length: number) => ({ getChannelData: () => new Float32Array(length) })),
  };
  const construct = vi.fn(function () { return context; });
  vi.stubGlobal('AudioContext', construct);
  return { context, nodes, sources, gains, construct };
}

beforeEach(() => {
  vi.resetModules();
  vi.stubGlobal('localStorage', { getItem: vi.fn(() => null), setItem: vi.fn() });
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('optional table sound', () => {
  it('stays silent by default and persists the explicit preference', async () => {
    const { construct } = audioHarness();
    const sound = await import('./tableSound');
    expect(sound.tableSoundEnabled()).toBe(false);
    sound.playTableSound('result');
    expect(construct).not.toHaveBeenCalled();
    sound.setTableSound(true);
    expect(localStorage.setItem).toHaveBeenCalledWith('dropinn-table-sound', 'on');
    sound.playTableSound('pick');
    expect(construct).toHaveBeenCalledOnce();
  });

  it('bounds every layered cue, ramps its envelope, and disconnects each completed voice', async () => {
    const { context, nodes, sources, gains } = audioHarness();
    const sound = await import('./tableSound');
    sound.setTableSound(true);
    for (const kind of ['pick', 'place', 'pop', 'roll', 'bonus', 'complication', 'result'] as const) {
      const sourceCount = sources.length;
      sound.playTableSound(kind);
      expect(sources.length - sourceCount).toBeGreaterThan(1);
      for (const source of sources.slice(sourceCount)) {
        const start = source.start.mock.calls[0][0] as number;
        const stop = source.stop.mock.calls[0][0] as number;
        expect(start).toBeGreaterThanOrEqual(context.currentTime);
        expect(stop).toBeGreaterThan(start);
        expect(stop - context.currentTime).toBeLessThan(.5);
        source.onended?.();
      }
    }
    for (const gain of gains) {
      expect(gain.gain.setValueAtTime.mock.calls[0][0]).toBe(0);
      expect(gain.gain.linearRampToValueAtTime.mock.calls[0][0]).toBeLessThanOrEqual(.035);
      expect(gain.gain.linearRampToValueAtTime.mock.calls.at(-1)?.[0]).toBe(0);
    }
    expect(nodes.every(node => node.disconnect.mock.calls.length === 1)).toBe(true);
    expect(context.createBuffer).toHaveBeenCalledOnce();
  });

  it('mutes active and scheduled voices immediately', async () => {
    const { sources, nodes } = audioHarness();
    const sound = await import('./tableSound');
    sound.setTableSound(true);
    sound.playTableSound('result');
    sound.setTableSound(false);
    expect(sources.every(source => source.stop.mock.calls.length === 2)).toBe(true);
    expect(nodes.every(node => node.disconnect.mock.calls.length === 1)).toBe(true);
    const count = sources.length;
    sound.playTableSound('place');
    expect(sources).toHaveLength(count);
  });

  it('waits for a suspended context and discards cues muted before permission arrives', async () => {
    const { context, sources } = audioHarness();
    context.state = 'suspended';
    let resume!: () => void;
    context.resume.mockImplementation(() => new Promise<void>(resolve => { resume = () => { context.state = 'running'; resolve(); }; }));
    const sound = await import('./tableSound');
    sound.setTableSound(true);
    sound.playTableSound('roll');
    expect(sources).toHaveLength(0);
    sound.setTableSound(false);
    sound.setTableSound(true);
    resume();
    await Promise.resolve();
    expect(sources).toHaveLength(0);
    sound.playTableSound('pick');
    expect(sources).toHaveLength(2);
  });

  it('does not play stale input after a delayed browser audio permission', async () => {
    vi.useFakeTimers();
    const { context, sources } = audioHarness();
    context.state = 'suspended';
    let resume!: () => void;
    context.resume.mockImplementation(() => new Promise<void>(resolve => { resume = () => { context.state = 'running'; resolve(); }; }));
    const sound = await import('./tableSound');
    sound.setTableSound(true);
    sound.playTableSound('roll');
    vi.advanceTimersByTime(250);
    resume();
    await Promise.resolve();
    expect(sources).toHaveLength(0);
  });

  it('contains unavailable audio, rejected resume, and partial voice creation failures', async () => {
    const { context, nodes } = audioHarness();
    const sound = await import('./tableSound');
    sound.setTableSound(true);
    context.state = 'suspended';
    context.resume.mockRejectedValue(new Error('autoplay blocked'));
    expect(() => sound.playTableSound('roll')).not.toThrow();
    await Promise.resolve(); await Promise.resolve();
    context.state = 'running';
    context.createOscillator.mockImplementation(() => { throw new Error('audio unavailable'); });
    expect(() => sound.playTableSound('result')).not.toThrow();
    expect(nodes.every(node => node.disconnect.mock.calls.length === 1)).toBe(true);
    vi.stubGlobal('AudioContext', undefined);
    expect(() => sound.playTableSound('result')).not.toThrow();
  });

  it('keeps play optional when preference storage is blocked', async () => {
    const { sources } = audioHarness();
    vi.stubGlobal('localStorage', {
      getItem: () => { throw new Error('storage blocked'); },
      setItem: () => { throw new Error('storage blocked'); },
    });
    const sound = await import('./tableSound');
    expect(sound.tableSoundEnabled()).toBe(false);
    expect(() => sound.setTableSound(true)).not.toThrow();
    sound.playTableSound('place');
    expect(sources.length).toBeGreaterThan(0);
  });
});
