let enabled = false;
try { enabled = localStorage.getItem('dropinn-table-sound') === 'on'; } catch { /* Optional preference. */ }
let audio: AudioContext | undefined;
type SoundKind = 'pick' | 'place' | 'pop' | 'roll' | 'bonus' | 'complication' | 'result';
type Layer = { at?: number; duration: number; volume: number; from: number; to?: number; wave?: OscillatorType; noise?: true };
// Dry contacts for routine input; only resolved results get a little musical tail.
const cues: Record<SoundKind, Layer[]> = {
  pick: [
    { duration: .035, volume: .018, from: 2300, noise: true },
    { at: .008, duration: .065, volume: .017, from: 530, to: 740, wave: 'triangle' },
  ],
  place: [
    { duration: .045, volume: .032, from: 1300, noise: true },
    { duration: .12, volume: .035, from: 165, to: 68 },
    { at: .018, duration: .055, volume: .012, from: 340, to: 170, wave: 'triangle' },
  ],
  pop: [
    { duration: .085, volume: .027, from: 420, to: 95 },
    { duration: .025, volume: .02, from: 1900, noise: true },
  ],
  roll: [
    { duration: .028, volume: .027, from: 2600, noise: true },
    { at: .045, duration: .035, volume: .024, from: 1850, noise: true },
    { at: .105, duration: .04, volume: .02, from: 2200, noise: true },
    { at: .185, duration: .045, volume: .017, from: 1500, noise: true },
    { at: .185, duration: .085, volume: .027, from: 230, to: 95, wave: 'triangle' },
  ],
  bonus: [
    { duration: .16, volume: .022, from: 660 },
    { at: .055, duration: .2, volume: .02, from: 990 },
    { at: .055, duration: .08, volume: .006, from: 1980 },
  ],
  complication: [
    { duration: .06, volume: .026, from: 800, noise: true },
    { duration: .17, volume: .025, from: 220, to: 165, wave: 'triangle' },
    { at: .085, duration: .16, volume: .019, from: 147, to: 110 },
  ],
  result: [
    { duration: .18, volume: .023, from: 523.25 },
    { at: .06, duration: .2, volume: .019, from: 659.25 },
    { at: .12, duration: .23, volume: .019, from: 783.99 },
  ],
};
let noise: AudioBuffer | undefined;
const active = new Set<() => void>();
let preferenceRevision = 0;
export const tableSoundEnabled = () => enabled;
export function setTableSound(value: boolean) {
  enabled = value;
  preferenceRevision++;
  if (!value) for (const stop of [...active]) stop();
  try { localStorage.setItem('dropinn-table-sound', value ? 'on' : 'off'); } catch { /* Optional preference. */ }
}

function contactBuffer(context: AudioContext) {
  if (noise) return noise;
  noise = context.createBuffer(1, Math.ceil(context.sampleRate * .1), context.sampleRate);
  const samples = noise.getChannelData(0);
  // Reusable noise, independent of any game randomness or dice calculation.
  let seed = 2749;
  for (let i = 0; i < samples.length; i++) {
    seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
    samples[i] = (seed >>> 0) / 0xffffffff * 2 - 1;
  }
  return noise;
}

function playLayer(context: AudioContext, layer: Layer, origin: number) {
  let source: AudioScheduledSourceNode | undefined;
  const nodes: AudioNode[] = [];
  let disconnected = false;
  const disconnect = () => {
    if (disconnected) return;
    disconnected = true;
    active.delete(stop);
    for (const node of nodes) { try { node.disconnect(); } catch { /* Already disposed. */ } }
  };
  const stop = () => {
    try { source?.stop(); } catch { /* A partially created or ended voice. */ }
    disconnect();
  };
  try {
    const at = origin + (layer.at ?? 0);
    const end = at + layer.duration;
    const gain = context.createGain();
    nodes.push(gain);
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(layer.volume, at + .004);
    gain.gain.exponentialRampToValueAtTime(.0001, end - .004);
    gain.gain.linearRampToValueAtTime(0, end);
    gain.connect(context.destination);
    if (layer.noise) {
      const buffer = context.createBufferSource();
      source = buffer; nodes.push(buffer);
      buffer.buffer = contactBuffer(context);
      const filter = context.createBiquadFilter();
      nodes.push(filter);
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(layer.from, at);
      filter.Q.setValueAtTime(.7, at);
      buffer.connect(filter); filter.connect(gain);
    } else {
      const tone = context.createOscillator();
      source = tone; nodes.push(tone);
      tone.type = layer.wave ?? 'sine';
      tone.frequency.setValueAtTime(layer.from, at);
      if (layer.to) tone.frequency.exponentialRampToValueAtTime(layer.to, end);
      tone.connect(gain);
    }
    source.onended = disconnect;
    active.add(stop);
    source.start(at);
    source.stop(end + .006);
  } catch { stop(); }
}

export function playTableSound(kind: SoundKind) {
  if (!enabled || typeof AudioContext === 'undefined') return;
  try {
    if (!audio || audio.state === 'closed') { audio = new AudioContext(); noise = undefined; }
    const context = audio;
    const revision = preferenceRevision;
    const requested = Date.now();
    const play = () => {
      // A late autoplay permission must not replay a queue of old table actions.
      if (!enabled || preferenceRevision !== revision || context.state !== 'running' || Date.now() - requested > 200) return;
      const origin = context.currentTime;
      for (const layer of cues[kind]) playLayer(context, layer, origin);
    };
    if (context.state === 'suspended') void context.resume().then(play).catch(() => {});
    else play();
  } catch { /* Sound must never prevent play. */ }
}
