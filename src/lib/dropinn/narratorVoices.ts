/** All eight voices ship in the same pinned Nano archive; changing voice needs no download. */
export const narratorNaturalVoices = [
  { id: 'Bella', name: 'Bella', description: 'Warm and expressive', embedding: 'expr-voice-2-f', speedPrior: 0.8 },
  { id: 'Jasper', name: 'Jasper', description: 'Clear and conversational', embedding: 'expr-voice-2-m', speedPrior: 0.8 },
  { id: 'Luna', name: 'Luna', description: 'Calm and smooth', embedding: 'expr-voice-3-f', speedPrior: 0.8 },
  { id: 'Bruno', name: 'Bruno', description: 'Deep and steady', embedding: 'expr-voice-3-m', speedPrior: 0.8 },
  { id: 'Rosie', name: 'Rosie', description: 'Bright and friendly', embedding: 'expr-voice-4-f', speedPrior: 0.8 },
  { id: 'Hugo', name: 'Hugo', description: 'Authoritative', embedding: 'expr-voice-4-m', speedPrior: 0.9 },
  { id: 'Kiki', name: 'Kiki', description: 'Lively and energetic', embedding: 'expr-voice-5-f', speedPrior: 0.8 },
  { id: 'Leo', name: 'Leo', description: 'Relaxed and natural', embedding: 'expr-voice-5-m', speedPrior: 0.8 },
] as const;

export type NarratorNaturalVoice = typeof narratorNaturalVoices[number]['id'];

export function narratorNaturalVoiceProfile(value: unknown) {
  return narratorNaturalVoices.find(voice => voice.id === value) ?? narratorNaturalVoices[0];
}

export function narratorNaturalVoice(value: unknown): NarratorNaturalVoice {
  return narratorNaturalVoiceProfile(value).id;
}
