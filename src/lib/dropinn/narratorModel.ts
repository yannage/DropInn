/** Public static weights, pinned to a reviewed release; never a speech API. */
export const narratorModel = 'KittenML/kitten-tts-nano-0.8-int8';
export const narratorRevision = '84781d74e29ee25217551556398b42f80593a813';
export const narratorAssetBase = `https://huggingface.co/${narratorModel}/resolve/${narratorRevision}/`;
export const narratorCache = `dropinn-kitten-${narratorRevision}-v1`;
export const narratorModelFiles = [
  { name: 'model', path: 'kitten_tts_nano_v0_8.onnx', bytes: 24369971 },
  { name: 'voices', path: 'voices.npz', bytes: 3278902 },
  { name: 'config', path: 'config.json', bytes: 688 },
] as const;
export interface NarratorAsset { name: string; url: string; bytes: number }
export interface NarratorAssets {
  model: ArrayBuffer; voices: ArrayBuffer; config: ArrayBuffer;
  wasm: ArrayBuffer; module: ArrayBuffer;
}
