import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createCharacterProfile } from '../../lib/character';
import { createAdventure } from '../../lib/dropinn/engine';
import { roundHero, roundIllustrations } from '../../lib/dropinn/roundIllustrations';
import { latestRound, type RoundEntry } from '../../lib/dropinn/roundSummary';
import { IllustratedRoundRow } from './IllustratedRoundRow';

const room = createAdventure(createCharacterProfile('Wren', 'wizard'), 'wren', 0, 'SCROLL');
const entry: RoundEntry = { id: 'action', kind: 'action', actorId: 'wren', actorName: 'Wren', text: 'Wren studies the tracks.', benefits: ['+1 progress'], consequence: '', targetId: 'tracks', targetKind: 'scene', token: 'investigate', math: '12 + 2 = 14' };
const row = (item = entry) => renderToStaticMarkup(<IllustratedRoundRow room={room} chapter={0} entry={item} userId="wren" />);

describe('illustrated recorded rows', () => {
  it('puts the saved story and effects before optional arithmetic', () => {
    const html = row();
    expect(html).toContain(entry.text);
    expect(html).toContain('Investigate');
    expect(html).toContain('<small>You</small>');
    expect(html.indexOf('+1')).toBeLessThan(html.indexOf('<details>'));
    expect(html).toContain('<summary>Details</summary><p>Dice: 12 + 2 = 14</p>');
    expect(roundIllustrations(room, 0, entry).target?.id).toBe('tracks');
    expect(roundIllustrations(room, 1, entry).target).toBeUndefined();
  });
  it('keeps a departed human portrait and does not confuse reused companion seats', () => {
    expect(roundHero({ ...room, seats: [] }, 'wren')).toEqual(room.players.wren.character);
    const companion = room.seats.find(seat => seat.kind === 'companion')!;
    expect(roundHero(room, companion.actorId, companion.character.name)).toEqual(companion.character);
    expect(roundHero(room, companion.actorId, 'Some previous companion')).toBeUndefined();
  });
  it('does not invent a token, attacker, target, or die for shared damage and legacy entries', () => {
    for (const kind of ['consequence', 'inactive', 'companion'] as const) {
      const html = row({ ...entry, kind, token: undefined, math: undefined, text: 'Wren takes 2 damage.', benefits: ['−2 HP'] });
      expect(html).not.toContain('di-result-token');
      expect(html).not.toContain('di-result-target');
      expect(html).not.toContain('Dice:');
      expect(html).toContain('Wren takes 2 damage.');
    }
  });
  it('uses actual Help metadata for Protect and Mend without fabricated dice', () => {
    for (const result of [{ protection: 3 }, { healing: 2 }]) {
      const source = { ...room, phase: 'reveal' as const, events: [{ id: 'help', chapter: 0, turn: room.turn, at: 1000, kind: 'action' as const, actorId: 'wren', actorName: 'Wren', text: 'Wren helps a friend.', contribution: true, result: { ...result, token: 'assist' as const, targetKind: 'hero' as const, targetId: 'wren' } }] };
      const item = latestRound(source)!.entries[0];
      expect(row(item)).toContain('Help');
      expect(row(item)).not.toContain('Dice:');
      expect(roundIllustrations(source, 0, item).targetHero).toEqual(room.players.wren.character);
    }
  });
});
