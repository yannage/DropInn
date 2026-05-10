import React from 'react';

const CoinBase = ({
  color, rim, children, size = 78,
}: {
  color: string; rim: string; children?: React.ReactNode; size?: number;
}) => (
  <svg width={size} height={size} viewBox="0 0 80 80">
    <circle cx="40" cy="40" r="38" fill={rim}/>
    <circle cx="40" cy="40" r="34" fill={color}/>
    <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(0,0,0,0.45)" strokeWidth="1"/>
    <circle cx="40" cy="40" r="29" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1"/>
    {[0, 60, 120, 180, 240, 300].map(a => {
      const rad = (a * Math.PI) / 180;
      return (
        <circle key={a} cx={40 + 33 * Math.cos(rad)} cy={40 + 33 * Math.sin(rad)}
          r="1.4" fill="rgba(0,0,0,0.5)"/>
      );
    })}
    {children}
    <ellipse cx="30" cy="22" rx="18" ry="9" fill="url(#coinSheen)" opacity="0.8"/>
  </svg>
);

export const PersuadeCoin = ({ size = 78 }) => (
  <CoinBase color="url(#purpleGrad)" rim="#3A1671" size={size}>
    <g transform="translate(40 40)">
      <path d="M-16 -10 a14 11 0 1 1 0 22 h-6 l-3 4 v-6 a11 11 0 0 1 -2 -2 a14 11 0 0 1 11 -18 z"
        transform="translate(8,0)"
        fill="#E8DAFA" stroke="#3A1671" strokeWidth="1.2" strokeLinejoin="round"/>
      <circle cx="-2" cy="0" r="1.6" fill="#3A1671"/>
      <circle cx="3"  cy="0" r="1.6" fill="#3A1671"/>
      <circle cx="8"  cy="0" r="1.6" fill="#3A1671"/>
    </g>
  </CoinBase>
);

export const IntimidateCoin = ({ size = 78 }) => (
  <CoinBase color="url(#redGrad)" rim="#5A0606" size={size}>
    <g transform="translate(40 40)">
      <path d="M-15 -8 L-12 -14 L-8 -10 L-4 -15 L0 -10 L4 -15 L8 -10 L12 -14 L15 -8 C18 0, 12 14, 0 16 C-12 14, -18 0, -15 -8 Z"
        fill="#3A0606" stroke="#1F0202" strokeWidth="1.2" strokeLinejoin="round"/>
      <path d="M-9 -3 L-3 -3 L-5 1 Z" fill="#FCD34D"/>
      <path d="M3 -3 L9 -3 L7 1 Z" fill="#FCD34D"/>
      <path d="M-7 6 L-5 9 L-3 6 L-1 9 L1 6 L3 9 L5 6 L7 9"
        stroke="#FCD34D" strokeWidth="1.6" fill="none" strokeLinejoin="round"/>
    </g>
  </CoinBase>
);

export const ExamineCoin = ({ size = 78 }) => (
  <CoinBase color="url(#examineGrad)" rim="#5C3F09" size={size}>
    <g transform="translate(40 40)">
      <circle cx="-3" cy="-3" r="11" fill="#FFE9A8" stroke="#3A2410" strokeWidth="2"/>
      <circle cx="-3" cy="-3" r="11" fill="none" stroke="#7A5A0A" strokeWidth="0.8"/>
      <ellipse cx="-7" cy="-7" rx="3" ry="2" fill="#fff" opacity="0.5"/>
      <rect x="6" y="6" width="14" height="4" rx="2"
        transform="rotate(45 6 6)" fill="#5C3F09" stroke="#3A2410" strokeWidth="0.8"/>
    </g>
  </CoinBase>
);

export const MoveCoin = ({ size = 78 }) => (
  <CoinBase color="url(#blueGrad)" rim="#0E2960" size={size}>
    <g transform="translate(40 40)">
      <path d="M-12 -10 L-2 -10 L-2 4 L14 4 L14 12 L-12 12 Z"
        fill="#E5EAF2" stroke="#0E2960" strokeWidth="1.4" strokeLinejoin="round"/>
      <rect x="-12" y="9" width="26" height="3" fill="#0E2960"/>
      <path d="M-2 -10 L-2 4 L4 4 L4 -6 Z" fill="#B6C2D6" opacity="0.6"/>
      <circle cx="-7" cy="0"  r="0.8" fill="#0E2960"/>
      <circle cx="-7" cy="-5" r="0.8" fill="#0E2960"/>
    </g>
  </CoinBase>
);

// ── Social action coins (Scene 1 — Thornwick Market) ──────────────

export const CharmCoin = ({ size = 78 }) => (
  <CoinBase color="url(#charmGrad)" rim="#6B1337" size={size}>
    <g transform="translate(40 40)">
      <path d="M0 9 C0 9 -13 1 -13 -6 A7 7 0 0 1 0 -3 A7 7 0 0 1 13 -6 C13 1 0 9 0 9 Z"
        fill="#FFEFCB" stroke="#6B1337" strokeWidth="1.2"/>
      <path d="M-18 -16 l1.4 -4 l1.4 4 l4 1.4 l-4 1.4 l-1.4 4 l-1.4 -4 l-4 -1.4 z"
        fill="#FFE9A8" opacity="0.9" transform="scale(0.65)"/>
      <path d="M14 -18 l1 -3 l1 3 l3 1 l-3 1 l-1 3 l-1 -3 l-3 -1 z"
        fill="#FFE9A8" opacity="0.75" transform="scale(0.55) translate(8 -4)"/>
    </g>
  </CoinBase>
);

export const BluffCoin = ({ size = 78 }) => (
  <CoinBase color="url(#bluffGrad)" rim="#0A4A3A" size={size}>
    <g transform="translate(40 40)">
      <ellipse cx="0" cy="0" rx="16" ry="13" fill="#D1FAF0" stroke="#0A4A3A" strokeWidth="1.4"/>
      <ellipse cx="-5.5" cy="-2" rx="3.5" ry="4.5" fill="#0A4A3A"/>
      <ellipse cx="5.5" cy="-2" rx="3.5" ry="4.5" fill="#0A4A3A"/>
      <path d="M-7 5 Q0 12 7 5" stroke="#0A4A3A" strokeWidth="2.2" fill="none" strokeLinecap="round"/>
      <circle cx="-15" cy="0" r="2" fill="#0A4A3A"/>
      <circle cx="15" cy="0" r="2" fill="#0A4A3A"/>
    </g>
  </CoinBase>
);

export const ScrutinizeCoin = ({ size = 78 }) => (
  <CoinBase color="url(#examineGrad)" rim="#5C3F09" size={size}>
    <g transform="translate(40 40)">
      <path d="M-15 0 Q-8 -13 0 -13 Q8 -13 15 0 Q8 13 0 13 Q-8 13 -15 0 Z"
        fill="#FFE9A8" stroke="#5C3F09" strokeWidth="1.4"/>
      <circle cx="0" cy="0" r="7" fill="#6B4423" stroke="#3A2410" strokeWidth="1"/>
      <circle cx="0" cy="0" r="4" fill="#1F1408"/>
      <circle cx="-2" cy="-2" r="1.8" fill="rgba(255,255,255,0.6)"/>
      <line x1="-15" y1="0" x2="-19" y2="-2" stroke="#5C3F09" strokeWidth="1.2"/>
      <line x1="15" y1="0" x2="19" y2="-2" stroke="#5C3F09" strokeWidth="1.2"/>
    </g>
  </CoinBase>
);

export const BribeCoin = ({ size = 78 }) => (
  <CoinBase color="url(#bribeGrad)" rim="#713F12" size={size}>
    <g transform="translate(40 40)">
      <ellipse cx="2" cy="-9" rx="10" ry="5" fill="#FEF9C3" stroke="#713F12" strokeWidth="1"/>
      <ellipse cx="2" cy="-4" rx="10" ry="5" fill="#FDE68A" stroke="#713F12" strokeWidth="1"/>
      <ellipse cx="2" cy="1" rx="10" ry="5" fill="#E8C760" stroke="#713F12" strokeWidth="1"/>
      <path d="M-10 7 Q-6 5 -2 6 L11 6 Q14 6 14 8.5 Q14 11 11 11 L5 11 Q7 11 7 13 Q7 15 5 15 L-1 15 Q1 15 1 17 Q1 19 -1 19 L-8 19 Q-12 16 -10 7 Z"
        fill="#E8D9B4" stroke="#713F12" strokeWidth="1.2" strokeLinejoin="round"/>
    </g>
  </CoinBase>
);

// ── Combat action coins (Scene 2 — Bandit Ambush) ─────────────────

export const FireBoltCoin = ({ size = 78 }) => (
  <CoinBase color="url(#fireGrad)" rim="#7A1A08" size={size}>
    <g transform="translate(40 40)">
      <path d="M0 16 Q-11 6 -8 -5 Q-5 -14 0 -18 Q5 -14 6 -6 Q9 -11 7 -17 Q13 -8 10 2 Q14 -3 13 -11 Q19 1 12 11 Q8 16 0 16 Z"
        fill="#FDE68A" stroke="#7A1A08" strokeWidth="1"/>
      <path d="M0 10 Q-5 3 -3 -4 Q0 -10 2 -7 Q5 -3 5 3 Q3 8 0 10 Z"
        fill="#FFF7CC" opacity="0.85"/>
      <circle cx="0" cy="-19" r="2.8" fill="#FFFFFF" opacity="0.9"/>
    </g>
  </CoinBase>
);

export const ThunderwaveCoin = ({ size = 78 }) => (
  <CoinBase color="url(#thunderGrad)" rim="#0D1260" size={size}>
    <g transform="translate(40 40)">
      <path d="M5 -18 L-5 -2 L3 -2 L-7 18 L7 0 L-1 0 Z"
        fill="#E0E7FF" stroke="#0D1260" strokeWidth="1.2" strokeLinejoin="round"/>
      <path d="M-20 6 Q-14 1 -8 6" stroke="#818CF8" strokeWidth="1.8" fill="none" strokeLinecap="round" opacity="0.9"/>
      <path d="M-22 -1 Q-16 -6 -10 -1" stroke="#818CF8" strokeWidth="1.4" fill="none" strokeLinecap="round" opacity="0.7"/>
      <path d="M12 -8 Q18 -3 12 3" stroke="#818CF8" strokeWidth="1.8" fill="none" strokeLinecap="round" opacity="0.9"/>
    </g>
  </CoinBase>
);

export const ShieldCoin = ({ size = 78 }) => (
  <CoinBase color="url(#shieldGrad)" rim="#0C2A4A" size={size}>
    <g transform="translate(40 40)">
      <path d="M0 19 L-14 7 L-14 -12 L0 -17 L14 -12 L14 7 Z"
        fill="#DBEAFE" stroke="#0C2A4A" strokeWidth="1.4" strokeLinejoin="round"/>
      <line x1="0" y1="-15" x2="0" y2="17" stroke="#0C2A4A" strokeWidth="1.5"/>
      <line x1="-13" y1="-2" x2="13" y2="-2" stroke="#0C2A4A" strokeWidth="1.5"/>
      <path d="M0 19 L-14 7 L-14 -12 L0 -17 L14 -12 L14 7 Z"
        fill="none" stroke="#7AB3FF" strokeWidth="1.2" opacity="0.65"/>
    </g>
  </CoinBase>
);

export const DisengageCoin = ({ size = 78 }) => (
  <CoinBase color="url(#disengageGrad)" rim="#14532D" size={size}>
    <g transform="translate(40 40)">
      <path d="M-3 -15 L-3 5 Q-3 11 1 13 L11 13 Q15 13 15 9 Q15 7 11 7 L3 7 L3 -15 Z"
        fill="#D1FAE5" stroke="#14532D" strokeWidth="1.4" strokeLinejoin="round"/>
      <line x1="-15" y1="-9" x2="-5" y2="-9" stroke="#6EE7B7" strokeWidth="2" strokeLinecap="round"/>
      <line x1="-17" y1="-2" x2="-5" y2="-2" stroke="#6EE7B7" strokeWidth="1.7" strokeLinecap="round"/>
      <line x1="-13" y1="5" x2="-5" y2="5" stroke="#6EE7B7" strokeWidth="1.3" strokeLinecap="round"/>
    </g>
  </CoinBase>
);

// ── Dragon confrontation coins (Scene 3) ──────────────────────────

export const ArcaneBlastCoin = ({ size = 78 }) => (
  <CoinBase color="url(#arcaneGrad)" rim="#1E0A3A" size={size}>
    <g transform="translate(40 40)">
      {[0, 45, 90, 135, 180, 225, 270, 315].map(a => {
        const rad = (a * Math.PI) / 180;
        return (
          <line key={a}
            x1={Math.cos(rad) * 5} y1={Math.sin(rad) * 5}
            x2={Math.cos(rad) * 17} y2={Math.sin(rad) * 17}
            stroke="#E0E7FF" strokeWidth={a % 90 === 0 ? 2.5 : 1.5} strokeLinecap="round"/>
        );
      })}
      <circle cx="0" cy="0" r="7" fill="url(#purpleGrad)" stroke="#E0E7FF" strokeWidth="1.4"/>
      <circle cx="-2" cy="-2" r="2.2" fill="rgba(255,255,255,0.55)"/>
    </g>
  </CoinBase>
);

export const CommuneCoin = ({ size = 78 }) => (
  <CoinBase color="url(#communeGrad)" rim="#0A3A4A" size={size}>
    <g transform="translate(40 40)">
      <path d="M-14 9 Q-14 1 -10 -3 L-8 -14 Q-8 -17 -6 -17 Q-4 -17 -4 -14 L-4 -4 Q-2 -9 0 -9 Q2 -9 2 -4 L2 9 Q-2 15 -8 15 Z"
        fill="#CFFAFE" stroke="#0A3A4A" strokeWidth="1.2" strokeLinejoin="round"/>
      <path d="M14 9 Q14 1 10 -3 L8 -14 Q8 -17 6 -17 Q4 -17 4 -14 L4 -4 Q2 -9 0 -9 Q-2 -9 -2 -4 L-2 9 Q2 15 8 15 Z"
        fill="#CFFAFE" stroke="#0A3A4A" strokeWidth="1.2" strokeLinejoin="round"/>
      <path d="M0 -22 l1.8 -5 l1.8 5 l5 1.8 l-5 1.8 l-1.8 5 l-1.8 -5 l-5 -1.8 z"
        fill="#FFE9A8" opacity="0.9" transform="scale(0.6) translate(0 -2)"/>
    </g>
  </CoinBase>
);

export const SpotlightCoin = ({ size = 48 }) => (
  <svg width={size} height={size} viewBox="0 0 80 80">
    <circle cx="40" cy="40" r="38" fill="#5C3F09"/>
    <circle cx="40" cy="40" r="34" fill="url(#goldGrad)"/>
    <circle cx="40" cy="40" r="29" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1"/>
    <text x="40" y="48" textAnchor="middle"
      fontFamily="Cinzel, serif" fontSize="28" fontWeight="700" fill="#3A2410">✦</text>
    <ellipse cx="30" cy="22" rx="18" ry="9" fill="url(#coinSheen)" opacity="0.7"/>
  </svg>
);
