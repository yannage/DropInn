export const HamburgerIcon = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect x="3" y="5"  width="18" height="2.6" rx="1.3" fill="url(#goldGrad)"/>
    <rect x="3" y="11" width="18" height="2.6" rx="1.3" fill="url(#goldGrad)"/>
    <rect x="3" y="17" width="18" height="2.6" rx="1.3" fill="url(#goldGrad)"/>
  </svg>
);

export const SwordIcon = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M19 4 L20 5 L11 14 L9.5 14.5 L9 13 Z" fill="url(#goldGrad)" stroke="#7A5A12" strokeWidth="0.6"/>
    <rect x="7.5" y="13" width="3.5" height="1.6" transform="rotate(45 9.25 13.8)" fill="#5C3F09"/>
    <path d="M5.6 17.4 L7 18.8 L9 16.8 L7.6 15.4 Z" fill="#A8722A"/>
    <circle cx="6.4" cy="18.2" r="0.7" fill="#3a2208"/>
    <path d="M19 6 l0.7 1.5 l1.5 0.7 l-1.5 0.7 l-0.7 1.5 l-0.7 -1.5 l-1.5 -0.7 l1.5 -0.7 z" fill="#FFE9A8" opacity="0.9"/>
  </svg>
);

export const CrownIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 16" fill="none">
    <path d="M2 14 L4 4 L8 9 L12 2 L16 9 L20 4 L22 14 Z"
      fill="url(#goldGrad)" stroke="#7A5A12" strokeWidth="0.7" strokeLinejoin="round"/>
    <circle cx="4"  cy="4" r="1.1" fill="#FFE9A8" stroke="#7A5A12" strokeWidth="0.4"/>
    <circle cx="12" cy="2" r="1.2" fill="#F36A6A" stroke="#7A5A12" strokeWidth="0.4"/>
    <circle cx="20" cy="4" r="1.1" fill="#FFE9A8" stroke="#7A5A12" strokeWidth="0.4"/>
  </svg>
);

export const StarSparkleIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 12 12">
    <path d="M6 0.5 L7 5 L11.5 6 L7 7 L6 11.5 L5 7 L0.5 6 L5 5 Z" fill="url(#goldGrad)"/>
  </svg>
);

export const BellIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M12 2.5 a1.6 1.6 0 0 1 1.6 1.6 v0.6 a6.4 6.4 0 0 1 4.8 6.2 v3 l1.4 2.4 a1 1 0 0 1 -0.86 1.5 H5.06 a1 1 0 0 1 -0.86 -1.5 L5.6 13.9 v-3 a6.4 6.4 0 0 1 4.8 -6.2 v-0.6 A1.6 1.6 0 0 1 12 2.5 z"
      fill="url(#goldGrad)" stroke="#5C3F09" strokeWidth="0.7"/>
    <path d="M9.6 19.5 a2.4 2.4 0 0 0 4.8 0 z" fill="url(#goldGrad)" stroke="#5C3F09" strokeWidth="0.7"/>
  </svg>
);

export const FriendsIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="9" cy="9" r="3.4" fill="url(#goldGrad)" stroke="#5C3F09" strokeWidth="0.7"/>
    <path d="M3.5 19.5 a5.5 5.5 0 0 1 11 0 z" fill="url(#goldGrad)" stroke="#5C3F09" strokeWidth="0.7"/>
    <circle cx="16.5" cy="8" r="2.6" fill="url(#goldGrad)" opacity="0.85" stroke="#5C3F09" strokeWidth="0.6"/>
    <path d="M13 14 a4 4 0 0 1 8 0 v3 h-3.5" fill="url(#goldGrad)" opacity="0.85" stroke="#5C3F09" strokeWidth="0.6"/>
  </svg>
);

export const ShieldEmblem = ({ size = 44 }) => (
  <svg width={size} height={size} viewBox="0 0 48 56" fill="none">
    <path d="M24 2 L44 8 V26 C44 38 36 50 24 54 C12 50 4 38 4 26 V8 Z"
      fill="url(#blueGrad)" stroke="url(#goldRimGrad)" strokeWidth="2.5"/>
    <path d="M24 8 L40 12 V26 C40 36 33 46 24 50 C15 46 8 36 8 26 V12 Z"
      fill="#1A3F8A" opacity="0.6"/>
    <path d="M24 14 L34 18 V28 C34 34 30 40 24 42 C18 40 14 34 14 28 V18 Z"
      fill="url(#blueGrad)" stroke="#FCE89B" strokeWidth="0.8"/>
  </svg>
);

export const TurnBadgeShield = ({ turn = 1, size = 78 }) => (
  <svg width={size} height={size * 1.18} viewBox="0 0 80 94" fill="none">
    <defs>
      <linearGradient id="badgeGrad" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stopColor="#FFE9A8"/>
        <stop offset="50%" stopColor="#E8C760"/>
        <stop offset="100%" stopColor="#8E6A1A"/>
      </linearGradient>
    </defs>
    <path d="M40 3 L74 11 V46 C74 66 60 84 40 91 C20 84 6 66 6 46 V11 Z"
      fill="url(#badgeGrad)" stroke="#5C3F09" strokeWidth="2.5"/>
    <path d="M40 9 L68 15 V46 C68 62 56 78 40 84 C24 78 12 62 12 46 V15 Z"
      fill="none" stroke="#9B7820" strokeWidth="1.2" strokeDasharray="1.5 2.5"/>
    <text x="40" y="38" textAnchor="middle"
      fontFamily="Cinzel, serif" fontSize="15" fontWeight="700" fill="#5C3F09" letterSpacing="2">TURN</text>
    <text x="40" y="68" textAnchor="middle"
      fontFamily="Cinzel, serif" fontSize="34" fontWeight="700" fill="#3A2410">{turn}</text>
  </svg>
);

export const DragonHead = ({ size = 40 }) => (
  <svg width={size} height={size} viewBox="0 0 50 50" fill="none">
    <defs>
      <radialGradient id="dragonGrad" cx="0.4" cy="0.4" r="0.7">
        <stop offset="0%" stopColor="#E04848"/>
        <stop offset="60%" stopColor="#9A1818"/>
        <stop offset="100%" stopColor="#3A0606"/>
      </radialGradient>
    </defs>
    <path d="M14 8 L9 1 L11 10 Z" fill="#5A0606"/>
    <path d="M30 8 L36 1 L33 10 Z" fill="#5A0606"/>
    <path d="M8 20 C8 12, 16 6, 25 6 C34 6, 42 12, 42 20 C42 24, 40 28, 36 30 L40 36 L32 34 L30 38 L26 33 L20 38 L18 33 L12 32 L13 28 C10 26, 8 24, 8 20 Z"
      fill="url(#dragonGrad)" stroke="#3A0606" strokeWidth="1.2" strokeLinejoin="round"/>
    <ellipse cx="20" cy="18" rx="2.4" ry="2.6" fill="#FCD34D"/>
    <ellipse cx="20.4" cy="18.2" rx="0.9" ry="1.6" fill="#1a0303"/>
    <ellipse cx="30" cy="18" rx="2.4" ry="2.6" fill="#FCD34D"/>
    <ellipse cx="30.4" cy="18.2" rx="0.9" ry="1.6" fill="#1a0303"/>
    <ellipse cx="22" cy="27" rx="0.8" ry="0.6" fill="#1a0303"/>
    <ellipse cx="28" cy="27" rx="0.8" ry="0.6" fill="#1a0303"/>
    <path d="M22 32 L23 36 L24 32 Z" fill="#FFEFCB"/>
    <path d="M27 32 L28 36 L29 32 Z" fill="#FFEFCB"/>
    <path d="M14 14 C14 10, 18 9, 22 10" stroke="#F47272" strokeWidth="1" fill="none" opacity="0.7"/>
  </svg>
);

export const CrossedSwords = ({ size = 72 }) => (
  <svg width={size} height={size} viewBox="0 0 60 60" fill="none">
    <g transform="rotate(45 30 30)">
      <rect x="28.5" y="6" width="3" height="38" rx="1" fill="url(#goldGrad)" stroke="#5C3F09" strokeWidth="0.6"/>
      <path d="M28 6 L32 6 L30 2 Z" fill="#FFEFCB"/>
      <rect x="24.5" y="42" width="11" height="3" rx="1" fill="#5C3F09"/>
      <rect x="28" y="44" width="4" height="9" rx="1" fill="#7A4A2A" stroke="#3A2414" strokeWidth="0.5"/>
      <circle cx="30" cy="54" r="1.6" fill="#3A2414"/>
    </g>
    <g transform="rotate(-45 30 30)">
      <rect x="28.5" y="6" width="3" height="38" rx="1" fill="url(#goldGrad)" stroke="#5C3F09" strokeWidth="0.6"/>
      <path d="M28 6 L32 6 L30 2 Z" fill="#FFEFCB"/>
      <rect x="24.5" y="42" width="11" height="3" rx="1" fill="#5C3F09"/>
      <rect x="28" y="44" width="4" height="9" rx="1" fill="#7A4A2A" stroke="#3A2414" strokeWidth="0.5"/>
      <circle cx="30" cy="54" r="1.6" fill="#3A2414"/>
    </g>
  </svg>
);

export const HourglassIcon = ({ size = 26 }) => (
  <svg width={size} height={size} viewBox="0 0 26 34" fill="none">
    <path d="M4 2 H22 L14 16 L22 30 H4 L12 16 Z" fill="url(#goldGrad)" stroke="#5C3F09" strokeWidth="1.2"/>
    <rect x="3" y="0" width="20" height="3" rx="1.5" fill="#5C3F09"/>
    <rect x="3" y="31" width="20" height="3" rx="1.5" fill="#5C3F09"/>
    <path d="M5 28 Q13 20 21 28" fill="#E8C760" opacity="0.6"/>
  </svg>
);

export const BookIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M4 4 C4 4 8 3 12 4 C16 3 20 4 20 4 V20 C20 20 16 19 12 20 C8 19 4 20 4 20 Z"
      fill="url(#goldGrad)" stroke="#5C3F09" strokeWidth="0.8"/>
    <line x1="12" y1="4" x2="12" y2="20" stroke="#5C3F09" strokeWidth="0.8"/>
    <line x1="6" y1="8"  x2="10" y2="8"  stroke="#5C3F09" strokeWidth="0.7"/>
    <line x1="6" y1="11" x2="10" y2="11" stroke="#5C3F09" strokeWidth="0.7"/>
    <line x1="14" y1="8"  x2="18" y2="8"  stroke="#5C3F09" strokeWidth="0.7"/>
    <line x1="14" y1="11" x2="18" y2="11" stroke="#5C3F09" strokeWidth="0.7"/>
  </svg>
);

export const HeartIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M12 21 C12 21 3 14 3 8 A4.5 4.5 0 0 1 12 6 A4.5 4.5 0 0 1 21 8 C21 14 12 21 12 21 Z"
      fill="#F87171" stroke="#7E1A1A" strokeWidth="1"/>
  </svg>
);

export const BackpackIcon = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect x="6" y="8" width="12" height="13" rx="3" fill="url(#goldGrad)" stroke="#5C3F09" strokeWidth="1"/>
    <path d="M9 8 V6 A3 3 0 0 1 15 6 V8" fill="none" stroke="#5C3F09" strokeWidth="1.2"/>
    <rect x="9" y="13" width="6" height="4" rx="1" fill="#5C3F09"/>
  </svg>
);

export const HelpIcon = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="9" fill="url(#goldGrad)" stroke="#5C3F09" strokeWidth="1"/>
    <text x="12" y="17" textAnchor="middle"
      fontFamily="Cinzel, serif" fontSize="13" fontWeight="700" fill="#5C3F09">?</text>
  </svg>
);

export const DoorIcon = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect x="4" y="3" width="16" height="18" rx="1" fill="url(#goldGrad)" stroke="#5C3F09" strokeWidth="1"/>
    <rect x="6" y="5" width="12" height="14" rx="0.5" fill="#7A5A1A" opacity="0.4"/>
    <circle cx="16" cy="12" r="1.2" fill="#5C3F09"/>
    <path d="M14 12 L20 12" stroke="#5C3F09" strokeWidth="0.8"/>
  </svg>
);

export const WizardAvatar = ({ size = 86 }) => (
  <svg width={size} height={size} viewBox="0 0 86 86" fill="none">
    <circle cx="43" cy="43" r="41" fill="url(#purpleGrad)" stroke="#E8C760" strokeWidth="2"/>
    <circle cx="43" cy="38" r="14" fill="#FFEFCB" stroke="#5C3F09" strokeWidth="0.8"/>
    <ellipse cx="39" cy="37" rx="2.5" ry="3" fill="#3A1671"/>
    <ellipse cx="47" cy="37" rx="2.5" ry="3" fill="#3A1671"/>
    <path d="M39 44 Q43 47 47 44" stroke="#5C3F09" strokeWidth="1" fill="none"/>
    <path d="M29 38 L43 14 L57 38 Z" fill="url(#purpleGrad)" stroke="#5C3F09" strokeWidth="0.8"/>
    <path d="M37 38 C37 52 49 56 43 62" stroke="#5C3F09" strokeWidth="0.6" fill="none"/>
    <circle cx="43" cy="14" r="3" fill="#E8C760"/>
  </svg>
);

export const HatGlyph = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 20" fill="none">
    <path d="M2 16 L12 2 L22 16 Z" fill="url(#purpleGrad)" stroke="#5C3F09" strokeWidth="1"/>
    <rect x="0" y="15" width="24" height="4" rx="2" fill="#5C3F09"/>
    <circle cx="12" cy="2" r="1.5" fill="#E8C760"/>
  </svg>
);

export const HandCursor = ({ size = 32 }) => (
  <svg width={size} height={size} viewBox="0 0 32 40" fill="none">
    <path d="M14 4 C14 2 16 2 16 4 V20 C16 20 18 18 20 18 C22 18 22 20 22 22 C22 22 23 20 25 20 C27 20 27 22 27 24 C27 24 28 22 30 22 C32 22 32 24 32 28 V32 C32 36 28 40 24 40 H14 C10 40 8 38 6 34 L4 28 C3 25 5 22 8 23 L10 24 V4 C10 2 12 2 12 4 V4 Z"
      fill="#FFEFCB" stroke="#5C3F09" strokeWidth="1.2" strokeLinejoin="round"/>
  </svg>
);

export const ScrollRod = ({ side, height = 148 }: { side: 'left' | 'right'; height?: number }) => (
  <svg width="18" height={height} viewBox={`0 0 18 ${height}`} fill="none">
    <rect x="6" y="8" width="6" height={height - 16} rx="3" fill="url(#goldRimGrad)"/>
    <ellipse cx="9" cy="8"          rx="9" ry="8" fill="url(#goldGrad)" stroke="#5C3F09" strokeWidth="0.6"/>
    <ellipse cx="9" cy={height - 8} rx="9" ry="8" fill="url(#goldGrad)" stroke="#5C3F09" strokeWidth="0.6"/>
  </svg>
);

export const CastleWatermark = ({ width = 120, height = 104, opacity = 0.22 }) => (
  <svg width={width} height={height} viewBox="0 0 120 104" opacity={opacity} fill="none">
    <rect x="10" y="40" width="100" height="64" rx="2" fill="#3A2414"/>
    <rect x="10" y="30" width="20" height="40" fill="#3A2414"/>
    <rect x="50" y="20" width="20" height="50" fill="#3A2414"/>
    <rect x="90" y="30" width="20" height="40" fill="#3A2414"/>
    {[10,18,26,50,58,66,90,98,106].map(x => (
      <rect key={x} x={x} y={x < 40 ? 22 : x < 80 ? 12 : 22} width="6" height="8" fill="#5C3F09"/>
    ))}
    <rect x="46" y="68" width="28" height="36" fill="#1F0E08"/>
    <path d="M60 68 A14 14 0 0 1 74 68" fill="#1F0E08"/>
  </svg>
);

export const CornerOrnament = ({ style }: { style?: React.CSSProperties }) => (
  <svg width="18" height="18" viewBox="0 0 18 18" style={{ position: 'absolute', ...style }}>
    <path d="M2 2 L8 2 L7 4 L4 4 L4 7 L2 8 Z" fill="url(#goldGrad)" opacity="0.6"/>
    <circle cx="3" cy="3" r="1.2" fill="#FFE9A8"/>
  </svg>
);
