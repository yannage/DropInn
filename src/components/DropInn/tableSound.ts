let enabled = false;
try { enabled = localStorage.getItem('dropinn-table-sound') === 'on'; } catch { /* Optional preference. */ }
let audio: AudioContext | undefined;
export const tableSoundEnabled = () => enabled;
export function setTableSound(value: boolean) {
  enabled = value;
  try { localStorage.setItem('dropinn-table-sound', value ? 'on' : 'off'); } catch { /* Optional preference. */ }
}
export function playTableSound(kind: 'place' | 'pop' | 'result') {
  if (!enabled || typeof AudioContext === 'undefined') return;
  try {
    audio ??= new AudioContext();
    if (audio.state === 'suspended') void audio.resume().catch(() => {});
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    const at = audio.currentTime;
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(kind === 'pop' ? 430 : kind === 'result' ? 660 : 820, at);
    oscillator.frequency.exponentialRampToValueAtTime(kind === 'pop' ? 120 : 440, at + .13);
    gain.gain.setValueAtTime(.0001, at);
    gain.gain.exponentialRampToValueAtTime(.045, at + .008);
    gain.gain.exponentialRampToValueAtTime(.0001, at + .17);
    oscillator.connect(gain); gain.connect(audio.destination);
    oscillator.start(at); oscillator.stop(at + .18);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  } catch { /* Sound must never prevent play. */ }
}
