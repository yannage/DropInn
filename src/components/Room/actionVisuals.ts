import type { Action, SceneType } from '../../data/campaign';

export const SCENE_VISUALS: Record<SceneType, {
  label: string;
  title: string;
  description: string;
  accent: string;
  glow: string;
  background: string;
  detail: string;
}> = {
  social: {
    label: 'Explore Phase',
    title: 'Thornwick Market',
    description: 'Read the crowd, press for information, and choose how Yanni enters the scene.',
    accent: '#e7c76d',
    glow: 'rgba(232, 199, 96, 0.38)',
    background:
      'radial-gradient(circle at 20% 25%, rgba(255,223,154,0.34), transparent 28%), radial-gradient(circle at 78% 32%, rgba(230,145,86,0.24), transparent 30%), linear-gradient(135deg, #314d71 0%, #1b2f49 42%, #0f1b2d 100%)',
    detail:
      'linear-gradient(180deg, rgba(255,238,188,0.18), rgba(15,27,45,0.04))',
  },
  combat: {
    label: 'Battle Phase',
    title: 'Market Ambush',
    description: 'Magic is in the air. Commit to a hard move before the field closes around you.',
    accent: '#f38061',
    glow: 'rgba(243, 128, 97, 0.34)',
    background:
      'radial-gradient(circle at 22% 28%, rgba(255,132,100,0.4), transparent 24%), radial-gradient(circle at 72% 24%, rgba(255,231,140,0.18), transparent 26%), linear-gradient(135deg, #4a2332 0%, #2a1f39 38%, #101829 100%)',
    detail:
      'linear-gradient(180deg, rgba(255,165,117,0.16), rgba(44,12,17,0.04))',
  },
  dragon: {
    label: 'Dragon Phase',
    title: 'Ash Hollow',
    description: 'Everything narrows to one choice. The next chip decides whether the dragon yields.',
    accent: '#b990ff',
    glow: 'rgba(185, 144, 255, 0.34)',
    background:
      'radial-gradient(circle at 22% 24%, rgba(172,132,255,0.36), transparent 28%), radial-gradient(circle at 78% 18%, rgba(255,120,92,0.18), transparent 26%), linear-gradient(135deg, #2a234d 0%, #191f3f 42%, #0d1326 100%)',
    detail:
      'linear-gradient(180deg, rgba(189,158,255,0.16), rgba(31,20,57,0.05))',
  },
};

const ACTION_ACCENTS: Record<string, { top: string; edge: string; glow: string }> = {
  charm: { top: '#df6f7d', edge: '#723142', glow: 'rgba(223,111,125,0.34)' },
  bluff: { top: '#57b0f6', edge: '#24476f', glow: 'rgba(87,176,246,0.34)' },
  scrutinize: { top: '#8f78ff', edge: '#40317c', glow: 'rgba(143,120,255,0.34)' },
  bribe: { top: '#e2bb4d', edge: '#775415', glow: 'rgba(226,187,77,0.34)' },
  firebolt: { top: '#ff8256', edge: '#7a3014', glow: 'rgba(255,130,86,0.35)' },
  thunderwave: { top: '#78a4ff', edge: '#2c4f94', glow: 'rgba(120,164,255,0.35)' },
  shield: { top: '#6fd2c2', edge: '#245f5b', glow: 'rgba(111,210,194,0.34)' },
  disengage: { top: '#89d36e', edge: '#355a1f', glow: 'rgba(137,211,110,0.32)' },
  strike: { top: '#5ca7f8', edge: '#244c79', glow: 'rgba(92,167,248,0.34)' },
  heavy: { top: '#ef8b5f', edge: '#79311e', glow: 'rgba(239,139,95,0.34)' },
  guard: { top: '#71d0c2', edge: '#235d57', glow: 'rgba(113,208,194,0.33)' },
  aid: { top: '#d89cfd', edge: '#66327c', glow: 'rgba(216,156,253,0.33)' },
  arcaneburst: { top: '#bb89ff', edge: '#532b89', glow: 'rgba(187,137,255,0.34)' },
  commune: { top: '#ffa0bf', edge: '#77385d', glow: 'rgba(255,160,191,0.32)' },
  dispel: { top: '#b7b8ff', edge: '#4a4d95', glow: 'rgba(183,184,255,0.34)' },
  dash: { top: '#7bdab0', edge: '#256047', glow: 'rgba(123,218,176,0.33)' },
};

export const getVisualById = (id: string) => {
  return ACTION_ACCENTS[id] ?? { top: '#d8c27a', edge: '#6d5722', glow: 'rgba(216,194,122,0.3)' };
};

export const getLabelGlyph = (label: string) => {
  return label
    .split(/\s+/)
    .map(part => part[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();
};

export const getActionVisual = (action: Action) => {
  return getVisualById(action.id);
};

export const getActionGlyph = (action: Action) => {
  return getLabelGlyph(action.label);
};
