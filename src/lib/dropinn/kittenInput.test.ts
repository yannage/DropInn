import { describe, expect, it } from 'vitest';
import { zipSync } from 'fflate';
import { bellaVoice, kittenVoice, kittenText, kittenTokens } from './kittenInput';
import { narratorNaturalVoice, narratorNaturalVoiceProfile, narratorNaturalVoices } from './narratorVoices';

function numpyVoice(value: number, header = "{'descr': '<f4', 'fortran_order': False, 'shape': (1, 256), }", version = 1) {
  const encoded = new TextEncoder().encode(header), offset = version === 1 ? 10 : 12;
  const bytes = new Uint8Array(offset + encoded.length + 256 * 4), view = new DataView(bytes.buffer);
  bytes.set([0x93, ...new TextEncoder().encode('NUMPY'), version, 0]);
  if (version === 1) view.setUint16(8, encoded.length, true);
  else view.setUint32(8, encoded.length, true);
  bytes.set(encoded, offset);
  for (let index = 0; index < 256; index++) view.setFloat32(offset + encoded.length + index * 4, value, true);
  return bytes;
}

const archive = (files: Record<string, Uint8Array>) => zipSync(files).buffer as ArrayBuffer;

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
  it('selects each natural voice from the shared archive, including version 2 arrays', () => {
    const bytes = archive(Object.fromEntries(narratorNaturalVoices.map((voice, index) => [
      `${voice.embedding}.npy`, numpyVoice(index + 1, undefined, index % 2 + 1),
    ])));
    narratorNaturalVoices.forEach((voice, index) => {
      const values = kittenVoice(bytes, voice.id);
      expect(values).toHaveLength(256);
      expect(values.every(value => value === index + 1)).toBe(true);
    });
    expect(bellaVoice(bytes)).toEqual(kittenVoice(bytes, 'Bella'));
    expect(kittenVoice(bytes, '../../other.npy')).toEqual(bellaVoice(bytes));
  });
  it('uses Bella for missing or invalid preferences and preserves Hugo’s distinct speed', () => {
    expect(narratorNaturalVoice(undefined)).toBe('Bella');
    expect(narratorNaturalVoice({ id: 'Bruno' })).toBe('Bella');
    expect(narratorNaturalVoice('Bruno')).toBe('Bruno');
    expect(narratorNaturalVoiceProfile('Hugo').speedPrior).toBe(0.9);
    expect(narratorNaturalVoiceProfile('Bella').speedPrior).toBe(0.8);
  });
  it('rejects missing selected embeddings and invalid numeric or shape data', () => {
    const onlyBella = archive({ 'expr-voice-2-f.npy': numpyVoice(1) });
    expect(() => kittenVoice(onlyBella, 'Bruno')).toThrow('Invalid Bruno voice file');
    expect(() => kittenVoice(archive({ 'expr-voice-3-m.npy': numpyVoice(NaN) }), 'Bruno')).toThrow('Invalid Bruno voice data');
    const invalidShape = numpyVoice(1, "{'descr': '<f4', 'fortran_order': False, 'shape': (2, 256), }");
    expect(() => kittenVoice(archive({ 'expr-voice-3-m.npy': invalidShape }), 'Bruno')).toThrow('Incomplete Bruno voice file');
    const empty = numpyVoice(1, "{'descr': '<f4', 'fortran_order': False, 'shape': (0, 256), }");
    expect(() => kittenVoice(archive({ 'expr-voice-3-m.npy': empty }), 'Bruno')).toThrow('Unsupported Bruno voice format');
  });
});
