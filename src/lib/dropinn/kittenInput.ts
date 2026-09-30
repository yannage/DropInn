import { unzipSync } from 'fflate';
import { narratorNaturalVoiceProfile } from './narratorVoices';

// KittenML TextCleaner vocabulary and token boundaries (Apache-2.0).
// Duplicate symbols intentionally take their LAST index, as in the Python dict.
const symbols = '$' + ';:,.!?¡¿—…"«»"" ' + 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
  + "ɑɐɒæɓʙβɔɕçɗɖðʤəɘɚɛɜɝɞɟʄɡɠɢʛɦɧħɥʜɨɪʝɭɬɫɮʟɱɯɰŋɳɲɴøɵɸθœɶʘɹɺɾɻʀʁɽʂʃʈʧʉʊʋⱱʌɣɤʍχʎʏʑʐʒʔʡʕʢǀǁǂǃˈˌːˑʼʴʰʱʲʷˠˤ˞↓↑→↗↘'̩'ᵻ";
const vocabulary = new Map(Array.from(symbols, (symbol, index) => [symbol, index]));

export function kittenTokens(ipa: string): BigInt64Array {
  const separated = (ipa.match(/[\p{L}\p{N}_]+|[^\p{L}\p{N}_\s]/gu) ?? []).join(' ');
  const ids = Array.from(separated).flatMap(char => vocabulary.has(char) ? [vocabulary.get(char)!] : []);
  return BigInt64Array.from([0, ...ids, 10, 0], BigInt);
}

export function kittenText(text: string): string {
  // eSpeak expands numbers and abbreviations. Preserve names, meaning, and punctuation.
  const cleaned = text.normalize('NFKC').replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/\s+/g, ' ').trim();
  return cleaned && !/[.!?;:,]$/.test(cleaned) ? cleaned + '.' : cleaned;
}

export function kittenVoice(bytes: ArrayBuffer, selected: unknown = 'Bella'): Float32Array {
  const voice = narratorNaturalVoiceProfile(selected), filename = `${voice.embedding}.npy`;
  const file = unzipSync(new Uint8Array(bytes), { filter: entry => entry.name === filename })[filename];
  if (!file || file.length < 10 || file[0] !== 0x93 || new TextDecoder().decode(file.slice(1, 6)) !== 'NUMPY') throw Error(`Invalid ${voice.name} voice file.`);
  const view = new DataView(file.buffer, file.byteOffset, file.byteLength);
  const version = file[6], offset = version === 1 ? 10 : 12;
  if (version !== 1 && version !== 2) throw Error('Unsupported voice file version.');
  if (file.length < offset) throw Error('Incomplete voice file.');
  const length = version === 1 ? view.getUint16(8, true) : view.getUint32(8, true);
  if (offset + length > file.length) throw Error('Incomplete voice header.');
  const header = new TextDecoder().decode(file.slice(offset, offset + length));
  const shape = /'shape':\s*\((\d+),\s*256,?\s*\)/.exec(header);
  if (!shape || Number(shape[1]) < 1 || !/'descr':\s*'<f4'/.test(header) || !/'fortran_order':\s*False/.test(header)) throw Error(`Unsupported ${voice.name} voice format.`);
  const data = file.slice(offset + length);
  if (data.byteLength !== Number(shape[1]) * 256 * 4) throw Error(`Incomplete ${voice.name} voice file.`);
  const values = new Float32Array(data.buffer);
  if (values.some(value => !Number.isFinite(value))) throw Error(`Invalid ${voice.name} voice data.`);
  return values;
}

export const bellaVoice = (bytes: ArrayBuffer): Float32Array => kittenVoice(bytes, 'Bella');
