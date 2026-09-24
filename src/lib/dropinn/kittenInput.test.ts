import { describe, expect, it } from 'vitest';
import { bellaVoice, kittenText, kittenTokens } from './kittenInput';

describe('Kitten input fidelity', () => {
  it('preserves names, numbers and punctuation while normalizing typography', () => {
    expect(kittenText('  “Yanni’s boat” costs 25 coins  ')).toBe('"Yanni\'s boat" costs 25 coins.');
    expect(kittenText('Dr. Mara: help!')).toBe('Dr. Mara: help!');
    expect(kittenText('  ')).toBe('');
  });
  it('matches Kitten token boundaries and Unicode word handling', () => {
    const tokens = [...kittenTokens('a b!')].map(Number);
    expect(tokens).toEqual([0, 43, 16, 44, 16, 5, 10, 0]);
    expect([...kittenTokens('ɑː')].map(Number)).toEqual([0, 69, 158, 10, 0]);
  });
  it('rejects invalid voice archives instead of generating with arbitrary data', () => {
    expect(() => bellaVoice(new ArrayBuffer(8))).toThrow();
  });
});
