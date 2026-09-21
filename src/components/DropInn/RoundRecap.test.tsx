import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createCharacterProfile } from '../../lib/character';
import { createAdventure } from '../../lib/dropinn/engine';
import { latestRound } from '../../lib/dropinn/roundSummary';
import type { StoryEvent } from '../../lib/dropinn/types';
import { RoundRecap } from './RoundRecap';
import { resolutionSoundCue, TurnResolution } from './TurnResolution';

const action: StoryEvent = { id: 'a', chapter: 0, turn: 1, at: 1000, kind: 'action', actorId: 'wren', actorName: 'Wren', text: 'Wren tries to clear the gate.', roll: 8, modifier: 2, success: false, contribution: true, result: { targetId: 'gate', targetKind: 'scene', progress: .5, danger: .5 } };
function roomWith(event = action) {
  const room = createAdventure(createCharacterProfile('Wren', 'wizard'), 'wren', 0, 'FEEL01');
  return { ...room, phase: 'reveal' as const, turn: 1, events: [event] };
}

afterEach(() => vi.restoreAllMocks());

describe('readable round payoff', () => {
  it('retains an unsuccessful attempt and its recorded cost, with one live announcement', () => {
    const html = renderToStaticMarkup(<RoundRecap summary={latestRound(roomWith())!} announce />);
    expect(html).toContain('Wren tries to clear the gate.');
    expect(html).toContain('data-effect="cost"><b>+0.5</b> danger');
    expect(html).toContain('data-effect="gain"><b>+0.5</b> progress');
    expect(html.match(/role="status"/g)).toHaveLength(1);
    expect(html).not.toContain('The gate is cleared');
  });

  it('continues the recorded beat on immediate reconnect and settles old or reopened rounds', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1200);
    const summary = latestRound(roomWith())!;
    const fresh = renderToStaticMarkup(<RoundRecap summary={summary} announce />);
    expect(fresh).toContain('data-fresh="true"');
    expect(fresh).toContain('--payoff-delay:-200ms');
    expect(renderToStaticMarkup(<RoundRecap summary={summary} />)).toContain('data-fresh="false"');
    vi.spyOn(Date, 'now').mockReturnValue(9000);
    expect(renderToStaticMarkup(<RoundRecap summary={summary} announce />)).toContain('data-fresh="false"');
  });

  it('keeps legacy prose without inventing benefit badges', () => {
    const legacy = { ...action, roll: undefined, modifier: undefined, result: undefined };
    const html = renderToStaticMarkup(<RoundRecap summary={latestRound(roomWith(legacy))!} />);
    expect(html).toContain(legacy.text);
    expect(html).not.toContain('di-payoff-benefits');
    expect(html).not.toContain('role="status"');
  });

  it('shows the final total inside the 1.1 second personal dice window', () => {
    const room = roomWith();
    const html = renderToStaticMarkup(<TurnResolution event={action} room={room} now={1600} userId="wren" announce={false} />);
    expect(html).toContain('data-beat="bonuses"');
    expect(html).toContain('class="di-resolution-total" data-visible="true">10');
    expect(html).not.toContain('role="status"');
    const initial = renderToStaticMarkup(<TurnResolution event={action} room={room} now={1200} userId="wren" announce={false} />);
    expect(initial).toContain('class="di-resolution-total" data-visible="false">10');
  });

  it('never invents guaranteed protection for a missed or legacy turn without a roll', () => {
    for (const contribution of [false, undefined]) {
      const event = { ...action, contribution, roll: undefined, result: undefined };
      const html = renderToStaticMarkup(<TurnResolution event={event} room={roomWith(event)} now={1200} userId="wren" announce={false} />);
      expect(html).not.toContain('guaranteed protection');
      expect(html).not.toContain('guaranteed healing');
      expect(html).toContain(event.text);
    }
  });

  it('sounds the real outcome when its total lands and deduplicates the later payoff beat', () => {
    expect(resolutionSoundCue(action, 'roll', 1200)?.cue).toBe('roll');
    const bonusBeat = resolutionSoundCue(action, 'bonuses', 1600);
    expect(bonusBeat?.cue).toBe('complication');
    expect(resolutionSoundCue(action, 'payoff', 2200)).toEqual(bonusBeat);
    expect(resolutionSoundCue({ ...action, success: true }, 'bonuses', 1600)?.cue).toBe('result');
    expect(resolutionSoundCue(action, 'payoff', 3000)).toBeUndefined();
    expect(resolutionSoundCue({ ...action, contribution: false }, 'payoff', 1600)).toBeUndefined();
  });
});
