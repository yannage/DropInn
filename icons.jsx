/* Icons + ornamental SVG building blocks for Stick Figure Quest.
 * All shapes are intentionally clean iconographic vectors — they read at small
 * sizes and stay consistent with the app's "ornate fantasy UI" feel.
 */

const Defs = () => (
  <svg width="0" height="0" style={{position:'absolute'}} aria-hidden="true">
    <defs>
      <linearGradient id="goldGrad" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stopColor="#FCE89B"/>
        <stop offset="45%" stopColor="#E8C760"/>
        <stop offset="100%" stopColor="#8E6A1A"/>
      </linearGradient>
      <linearGradient id="goldRimGrad" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stopColor="#FFE9A8"/>
        <stop offset="50%" stopColor="#C99B2A"/>
        <stop offset="100%" stopColor="#5C3F09"/>
      </linearGradient>
      <radialGradient id="goldShine" cx="0.3" cy="0.25" r="0.6">
        <stop offset="0%" stopColor="#FFF6CB" stopOpacity="0.95"/>
        <stop offset="100%" stopColor="#FFF6CB" stopOpacity="0"/>
      </radialGradient>

      <linearGradient id="purpleGrad" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stopColor="#B68CF0"/>
        <stop offset="50%" stopColor="#8E5BD9"/>
        <stop offset="100%" stopColor="#4A1F8A"/>
      </linearGradient>
      <linearGradient id="redGrad" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stopColor="#F36A6A"/>
        <stop offset="50%" stopColor="#C53030"/>
        <stop offset="100%" stopColor="#6A1313"/>
      </linearGradient>
      <linearGradient id="blueGrad" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stopColor="#7AB3FF"/>
        <stop offset="50%" stopColor="#3B82F6"/>
        <stop offset="100%" stopColor="#1A3F8A"/>
      </linearGradient>
      <linearGradient id="examineGrad" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stopColor="#FFE48A"/>
        <stop offset="50%" stopColor="#D4A017"/>
        <stop offset="100%" stopColor="#7A5A0A"/>
      </linearGradient>

      <linearGradient id="parchGrad" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stopColor="#F2E3BE"/>
        <stop offset="50%" stopColor="#E8D9B4"/>
        <stop offset="100%" stopColor="#C9B888"/>
      </linearGradient>

      {/* per-coin radial sheen */}
      <radialGradient id="coinSheen" cx="0.35" cy="0.3" r="0.65">
        <stop offset="0%" stopColor="rgba(255,255,255,0.55)"/>
        <stop offset="60%" stopColor="rgba(255,255,255,0)"/>
      </radialGradient>

      <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="2" result="b"/>
        <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>
  </svg>
);

/* ---------- App-bar icons ---------- */

const HamburgerIcon = ({size=22}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect x="3" y="5" width="18" height="2.6" rx="1.3" fill="url(#goldGrad)"/>
    <rect x="3" y="11" width="18" height="2.6" rx="1.3" fill="url(#goldGrad)"/>
    <rect x="3" y="17" width="18" height="2.6" rx="1.3" fill="url(#goldGrad)"/>
  </svg>
);

const SwordIcon = ({size=22}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    {/* sword */}
    <path d="M19 4 L20 5 L11 14 L9.5 14.5 L9 13 Z" fill="url(#goldGrad)" stroke="#7A5A12" strokeWidth="0.6"/>
    <rect x="7.5" y="13" width="3.5" height="1.6" transform="rotate(45 9.25 13.8)" fill="#5C3F09"/>
    <path d="M5.6 17.4 L7 18.8 L9 16.8 L7.6 15.4 Z" fill="#A8722A"/>
    <circle cx="6.4" cy="18.2" r="0.7" fill="#3a2208"/>
    {/* sparkle */}
    <path d="M19 6 l0.7 1.5 l1.5 0.7 l-1.5 0.7 l-0.7 1.5 l-0.7 -1.5 l-1.5 -0.7 l1.5 -0.7 z" fill="#FFE9A8" opacity="0.9"/>
  </svg>
);

const CrownIcon = ({size=18}) => (
  <svg width={size} height={size} viewBox="0 0 24 16" fill="none">
    <path d="M2 14 L4 4 L8 9 L12 2 L16 9 L20 4 L22 14 Z"
      fill="url(#goldGrad)" stroke="#7A5A12" strokeWidth="0.7" strokeLinejoin="round"/>
    <circle cx="4" cy="4" r="1.1" fill="#FFE9A8" stroke="#7A5A12" strokeWidth="0.4"/>
    <circle cx="12" cy="2" r="1.2" fill="#F36A6A" stroke="#7A5A12" strokeWidth="0.4"/>
    <circle cx="20" cy="4" r="1.1" fill="#FFE9A8" stroke="#7A5A12" strokeWidth="0.4"/>
  </svg>
);

const StarSparkleIcon = ({size=14}) => (
  <svg width={size} height={size} viewBox="0 0 12 12">
    <path d="M6 0.5 L7 5 L11.5 6 L7 7 L6 11.5 L5 7 L0.5 6 L5 5 Z" fill="url(#goldGrad)"/>
  </svg>
);

const BellIcon = ({size=20}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M12 2.5 a1.6 1.6 0 0 1 1.6 1.6 v0.6 a6.4 6.4 0 0 1 4.8 6.2 v3 l1.4 2.4 a1 1 0 0 1 -0.86 1.5 H5.06 a1 1 0 0 1 -0.86 -1.5 L5.6 13.9 v-3 a6.4 6.4 0 0 1 4.8 -6.2 v-0.6 A1.6 1.6 0 0 1 12 2.5 z"
      fill="url(#goldGrad)" stroke="#5C3F09" strokeWidth="0.7"/>
    <path d="M9.6 19.5 a2.4 2.4 0 0 0 4.8 0 z" fill="url(#goldGrad)" stroke="#5C3F09" strokeWidth="0.7"/>
  </svg>
);

const FriendsIcon = ({size=20}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="9" cy="9" r="3.4" fill="url(#goldGrad)" stroke="#5C3F09" strokeWidth="0.7"/>
    <path d="M3.5 19.5 a5.5 5.5 0 0 1 11 0 z" fill="url(#goldGrad)" stroke="#5C3F09" strokeWidth="0.7"/>
    <circle cx="16.5" cy="8" r="2.6" fill="url(#goldGrad)" opacity="0.85" stroke="#5C3F09" strokeWidth="0.6"/>
    <path d="M13 14 a4 4 0 0 1 8 0 v3 h-3.5" fill="url(#goldGrad)" opacity="0.85" stroke="#5C3F09" strokeWidth="0.6"/>
  </svg>
);

/* ---------- Scene-header icons ---------- */

const ShieldEmblem = ({size=44}) => (
  <svg width={size} height={size} viewBox="0 0 48 56" fill="none">
    <path d="M24 2 L44 8 V26 C44 38 36 50 24 54 C12 50 4 38 4 26 V8 Z"
      fill="url(#blueGrad)" stroke="url(#goldRimGrad)" strokeWidth="2.5"/>
    <path d="M24 8 L40 12 V26 C40 36 33 46 24 50 C15 46 8 36 8 26 V12 Z"
      fill="#1A3F8A" opacity="0.6"/>
    <path d="M24 14 L34 18 V28 C34 34 30 40 24 42 C18 40 14 34 14 28 V18 Z"
      fill="url(#blueGrad)" stroke="#FCE89B" strokeWidth="0.8"/>
  </svg>
);

const TurnBadgeShield = ({turn=1, size=78}) => (
  <svg width={size} height={size*1.18} viewBox="0 0 80 94" fill="none">
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
    <path d="M40 15 L62 20 V46 C62 58 52 72 40 76 C28 72 18 58 18 46 V20 Z"
      fill="none" stroke="#FFEFB8" strokeWidth="0.8" opacity="0.55"/>
    <text x="40" y="38" textAnchor="middle"
      fontFamily="Cinzel, serif" fontSize="15" fontWeight="700"
      fill="#5C3F09" letterSpacing="2">TURN</text>
    <text x="40" y="68" textAnchor="middle"
      fontFamily="Cinzel, serif" fontSize="34" fontWeight="700"
      fill="#3A2410">{turn}</text>
  </svg>
);

const DragonHead = ({size=40}) => (
  <svg width={size} height={size} viewBox="0 0 50 50" fill="none">
    <defs>
      <radialGradient id="dragonGrad" cx="0.4" cy="0.4" r="0.7">
        <stop offset="0%" stopColor="#E04848"/>
        <stop offset="60%" stopColor="#9A1818"/>
        <stop offset="100%" stopColor="#3A0606"/>
      </radialGradient>
    </defs>
    {/* horns */}
    <path d="M14 8 L9 1 L11 10 Z" fill="#5A0606"/>
    <path d="M30 8 L36 1 L33 10 Z" fill="#5A0606"/>
    {/* head */}
    <path d="M8 20
             C8 12, 16 6, 25 6
             C34 6, 42 12, 42 20
             C42 24, 40 28, 36 30
             L40 36
             L32 34
             L30 38
             L26 33
             L20 38
             L18 33
             L12 32
             L13 28
             C10 26, 8 24, 8 20 Z"
      fill="url(#dragonGrad)" stroke="#3A0606" strokeWidth="1.2" strokeLinejoin="round"/>
    {/* eye */}
    <ellipse cx="20" cy="18" rx="2.4" ry="2.6" fill="#FCD34D"/>
    <ellipse cx="20.4" cy="18.2" rx="0.9" ry="1.6" fill="#1a0303"/>
    <ellipse cx="30" cy="18" rx="2.4" ry="2.6" fill="#FCD34D"/>
    <ellipse cx="30.4" cy="18.2" rx="0.9" ry="1.6" fill="#1a0303"/>
    {/* nostril */}
    <ellipse cx="22" cy="27" rx="0.8" ry="0.6" fill="#1a0303"/>
    <ellipse cx="28" cy="27" rx="0.8" ry="0.6" fill="#1a0303"/>
    {/* fangs */}
    <path d="M22 32 L23 36 L24 32 Z" fill="#FFEFCB"/>
    <path d="M27 32 L28 36 L29 32 Z" fill="#FFEFCB"/>
    {/* highlight */}
    <path d="M14 14 C14 10, 18 9, 22 10" stroke="#F47272" strokeWidth="1" fill="none" opacity="0.7"/>
  </svg>
);

/* ---------- Drop zone (crossed swords) ---------- */

const CrossedSwords = ({size=72}) => (
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

/* ---------- Action coins ---------- */

const CoinBase = ({color, rim, sheen=true, children, size=78}) => (
  <svg width={size} height={size} viewBox="0 0 80 80">
    <circle cx="40" cy="40" r="38" fill={rim} />
    <circle cx="40" cy="40" r="34" fill={color}/>
    <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(0,0,0,0.45)" strokeWidth="1"/>
    <circle cx="40" cy="40" r="29" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1"/>
    {/* rivets */}
    {[0,60,120,180,240,300].map(a=>{
      const r=33; const rad=a*Math.PI/180;
      const cx=40+r*Math.cos(rad); const cy=40+r*Math.sin(rad);
      return <circle key={a} cx={cx} cy={cy} r="1.4" fill="rgba(0,0,0,0.5)"/>
    })}
    {children}
    {sheen && <ellipse cx="30" cy="22" rx="18" ry="9" fill="url(#coinSheen)" opacity="0.8"/>}
  </svg>
);

const PersuadeCoin = ({size=78}) => (
  <CoinBase color="url(#purpleGrad)" rim="#3A1671" size={size}>
    {/* speech bubble */}
    <g transform="translate(40 40)">
      <path d="M-16 -10 a14 11 0 1 1 0 22 h-6 l-3 4 v-6 a11 11 0 0 1 -2 -2 a14 11 0 0 1 11 -18 z"
        transform="translate(8,0)"
        fill="#E8DAFA" stroke="#3A1671" strokeWidth="1.2" strokeLinejoin="round"/>
      <circle cx="-2" cy="0" r="1.6" fill="#3A1671"/>
      <circle cx="3" cy="0" r="1.6" fill="#3A1671"/>
      <circle cx="8" cy="0" r="1.6" fill="#3A1671"/>
    </g>
  </CoinBase>
);

const IntimidateCoin = ({size=78}) => (
  <CoinBase color="url(#redGrad)" rim="#5A0606" size={size}>
    <g transform="translate(40 40)">
      {/* demon face */}
      <path d="M-15 -8
               L-12 -14 L-8 -10
               L-4 -15 L0 -10
               L4 -15 L8 -10
               L12 -14 L15 -8
               C18 0, 12 14, 0 16
               C-12 14, -18 0, -15 -8 Z"
        fill="#3A0606" stroke="#1F0202" strokeWidth="1.2" strokeLinejoin="round"/>
      {/* eyes */}
      <path d="M-9 -3 L-3 -3 L-5 1 Z" fill="#FCD34D"/>
      <path d="M3 -3 L9 -3 L7 1 Z" fill="#FCD34D"/>
      {/* mouth */}
      <path d="M-7 6 L-5 9 L-3 6 L-1 9 L1 6 L3 9 L5 6 L7 9"
        stroke="#FCD34D" strokeWidth="1.6" fill="none" strokeLinejoin="round"/>
    </g>
  </CoinBase>
);

const ExamineCoin = ({size=78}) => (
  <CoinBase color="url(#examineGrad)" rim="#5C3F09" size={size}>
    <g transform="translate(40 40)">
      <circle cx="-3" cy="-3" r="11" fill="#FFE9A8" stroke="#3A2410" strokeWidth="2"/>
      <circle cx="-3" cy="-3" r="11" fill="none" stroke="#7A5A0A" strokeWidth="0.8"/>
      <ellipse cx="-7" cy="-7" rx="3" ry="2" fill="#fff" opacity="0.5"/>
      <rect x="6" y="6" width="14" height="4" rx="2" transform="rotate(45 6 6)"
        fill="#5C3F09" stroke="#3A2410" strokeWidth="0.8"/>
    </g>
  </CoinBase>
);

const MoveCoin = ({size=78}) => (
  <CoinBase color="url(#blueGrad)" rim="#0E2960" size={size}>
    <g transform="translate(40 40)">
      {/* boot */}
      <path d="M-12 -10 L-2 -10 L-2 4 L14 4 L14 12 L-12 12 Z"
        fill="#E5EAF2" stroke="#0E2960" strokeWidth="1.4" strokeLinejoin="round"/>
      <rect x="-12" y="9" width="26" height="3" fill="#0E2960"/>
      <path d="M-2 -10 L-2 4 L4 4 L4 -6 Z" fill="#B6C2D6" opacity="0.6"/>
      <circle cx="-7" cy="0" r="0.8" fill="#0E2960"/>
      <circle cx="-7" cy="-5" r="0.8" fill="#0E2960"/>
    </g>
  </CoinBase>
);

const SpotlightCoin = ({size=44}) => (
  <CoinBase color="url(#examineGrad)" rim="#5C3F09" size={size}>
    <g transform="translate(40 40)">
      <path d="M0 -16 L4.5 -5 L16 -4 L7 3 L10 14 L0 8 L-10 14 L-7 3 L-16 -4 L-4.5 -5 Z"
        fill="#FFEFCB" stroke="#5C3F09" strokeWidth="1.4" strokeLinejoin="round"/>
    </g>
  </CoinBase>
);

/* ---------- Wax seals ---------- */
const WaxSeal = ({color, ring, icon, size=46, broken=false}) => {
  const colorMap = {
    purple: { fill:'#7d2dd6', deep:'#3A1671', hi:'#B68CF0'},
    green : { fill:'#1f8f3a', deep:'#0c4a1a', hi:'#6EE7B7'},
    red   : { fill:'#C73030', deep:'#6A1313', hi:'#F36A6A'},
    blue  : { fill:'#3B82F6', deep:'#0e2960', hi:'#7AB3FF'},
  };
  const c = colorMap[color] || colorMap.purple;
  return (
    <svg width={size} height={size} viewBox="0 0 50 50">
      <defs>
        <radialGradient id={`sealGrad-${color}`} cx="0.35" cy="0.3" r="0.8">
          <stop offset="0%" stopColor={c.hi}/>
          <stop offset="55%" stopColor={c.fill}/>
          <stop offset="100%" stopColor={c.deep}/>
        </radialGradient>
      </defs>
      {/* drip blob */}
      <path d="M25 4
               C36 4, 46 14, 46 25
               C46 33, 41 41, 33 44
               L36 48 L29 46
               L25 48 L22 46 L13 47
               L16 42
               C9 38, 4 31, 4 25
               C4 14, 14 4, 25 4 Z"
        fill={`url(#sealGrad-${color})`}
        stroke={c.deep} strokeWidth="1.2" strokeLinejoin="round"/>
      <ellipse cx="18" cy="15" rx="6" ry="3" fill="#fff" opacity="0.18"/>
      {/* embossed icon */}
      <g transform="translate(25 25)">
        {icon}
      </g>
      {broken && (
        <path d="M25 4 L20 24 L30 28 L23 46" stroke="#1f0a0a" strokeWidth="2" fill="none" strokeLinejoin="round" opacity="0.55"/>
      )}
    </svg>
  );
};

const SealStar = (
  <path d="M0 -10 L3 -3 L10 -2 L4.5 2.5 L6 10 L0 6 L-6 10 L-4.5 2.5 L-10 -2 L-3 -3 Z"
    fill="#3A1671" opacity="0.85"/>
);
const SealSwords = (
  <g>
    <g transform="rotate(45)"><rect x="-1" y="-9" width="2" height="18" fill="#0c4a1a"/><rect x="-3" y="6" width="6" height="2" fill="#0c4a1a"/></g>
    <g transform="rotate(-45)"><rect x="-1" y="-9" width="2" height="18" fill="#0c4a1a"/><rect x="-3" y="6" width="6" height="2" fill="#0c4a1a"/></g>
  </g>
);
const SealHeart = (
  <path d="M0 8
           C-9 2, -9 -8, -4 -8
           C-1 -8, 0 -5, 0 -3
           C0 -5, 1 -8, 4 -8
           C9 -8, 9 2, 0 8 Z"
    fill="#6A1313"/>
);

/* ---------- Envelope ---------- */
/* Closed: standard sealed envelope with name written on the flap.
 * Revealed: envelope is open and a parchment letter slides up out of it.
 *           The letter is taller than the envelope, with the action written on it.
 */
const Envelope = ({width=110, height=80, name, sealColor, sealIcon, broken=false, action, revealed=false}) => {
  if (revealed){
    // Larger viewBox so the letter can extend above the envelope
    return (
      <svg width={width*1.05} height={height*1.7} viewBox="0 0 110 130" style={{overflow:'visible'}}>
        <defs>
          <linearGradient id="parchGrad2" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#F8EBC8"/>
            <stop offset="100%" stopColor="#D4C18A"/>
          </linearGradient>
          <linearGradient id="envGrad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#E8D9B4"/>
            <stop offset="100%" stopColor="#A99668"/>
          </linearGradient>
        </defs>
        {/* table shadow */}
        <ellipse cx="55" cy="126" rx="42" ry="3" fill="rgba(0,0,0,0.55)"/>

        {/* === LETTER (parchment, on top) === */}
        <g>
          {/* shadow under letter */}
          <path d="M9 6 L101 6 L98 92 L12 92 Z" fill="rgba(0,0,0,0.35)" transform="translate(2 3)"/>
          {/* letter base — slightly tilted, taller than envelope */}
          <path d="M10 4 L100 6 L98 90 L12 88 Z"
            fill="url(#parchGrad2)" stroke="#8A7440" strokeWidth="1.2" strokeLinejoin="round"/>
          {/* speckles + horizontal rule lines */}
          <line x1="18" y1="22" x2="92" y2="23" stroke="#B8A66A" strokeWidth="0.4" opacity="0.6"/>
          <line x1="18" y1="62" x2="92" y2="63" stroke="#B8A66A" strokeWidth="0.4" opacity="0.45"/>
          <line x1="18" y1="74" x2="92" y2="75" stroke="#B8A66A" strokeWidth="0.4" opacity="0.4"/>
          <circle cx="22" cy="50" r="0.5" fill="#A99668"/>
          <circle cx="78" cy="40" r="0.5" fill="#A99668"/>
          <circle cx="65" cy="78" r="0.4" fill="#A99668"/>

          {/* "NAME's plan" header in handwritten ink */}
          <text x="55" y="18" textAnchor="middle"
            fontFamily="Caveat, cursive" fontSize="13" fill="#5b4a2e" fontStyle="italic">
            {name}
          </text>
          {/* the action — wrapped via foreignObject so long labels don't overflow */}
          <foreignObject x="10" y="28" width="90" height="52">
            <div xmlns="http://www.w3.org/1999/xhtml" style={{
              width:'100%', height:'100%',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontFamily:'Cinzel, serif', fontSize:11, fontWeight:700,
              color:'#1F1408', letterSpacing:'0.04em', textAlign:'center',
              lineHeight:1.15,
              textTransform:'uppercase',
              wordBreak:'break-word', overflowWrap:'anywhere',
              padding:'0 4px',
            }}>
              {action}
            </div>
          </foreignObject>
        </g>

        {/* === OPEN ENVELOPE (sits at bottom, in front of letter) === */}
        <g>
          {/* envelope back */}
          <path d="M2 78 L108 80 L105 122 L5 122 Z"
            fill="url(#envGrad)" stroke="#7A6634" strokeWidth="1.2" strokeLinejoin="round"/>
          {/* flap (open, folded down outward) */}
          <path d="M2 78 L55 100 L108 80 L106 88 L55 108 L4 88 Z"
            fill="#C9B888" stroke="#7A6634" strokeWidth="1" strokeLinejoin="round" opacity="0.85"/>
          {/* inner shadow at the mouth */}
          <path d="M5 80 L55 104 L105 82" stroke="#8A7440" strokeWidth="1.2" fill="none" opacity="0.7"/>
          {/* broken seal in corner of flap */}
          {sealColor && (
            <g transform="translate(82 96) scale(0.55)">
              <g transform="translate(-23,-23)">
                <WaxSeal color={sealColor} icon={sealIcon} broken={true} size={46}/>
              </g>
            </g>
          )}
        </g>
      </svg>
    );
  }

  // Closed (sealed) state
  return (
    <svg width={width} height={height} viewBox="0 0 110 80" style={{overflow:'visible'}}>
      <defs>
        <linearGradient id="parchGrad2" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#F2E3BE"/>
          <stop offset="100%" stopColor="#C9B888"/>
        </linearGradient>
      </defs>
      <ellipse cx="55" cy="76" rx="40" ry="4" fill="rgba(0,0,0,0.5)"/>
      <path d="M4 16 L106 16 L106 70 L4 70 Z"
        fill="url(#parchGrad2)" stroke="#7A6634" strokeWidth="1.2"/>
      <circle cx="22" cy="40" r="0.5" fill="#A99668"/>
      <circle cx="80" cy="55" r="0.6" fill="#A99668"/>
      <circle cx="60" cy="30" r="0.4" fill="#A99668"/>
      <circle cx="92" cy="42" r="0.4" fill="#A99668"/>
      <path d="M4 16 L55 50 L106 16 Z"
        fill="url(#parchGrad2)" stroke="#7A6634" strokeWidth="1.2"/>
      <path d="M4 70 L55 36 L106 70" stroke="#A99668" strokeWidth="0.6" fill="none" opacity="0.5"/>
      {name && (
        <text x="55" y="32" textAnchor="middle"
          fontFamily="Caveat, cursive" fontSize="22" fontWeight="700" fill="#3A2C18">{name}</text>
      )}
      {sealColor && (
        <g transform="translate(55 50)">
          <g transform="translate(-23,-23)">
            <WaxSeal color={sealColor} icon={sealIcon} broken={broken} size={46}/>
          </g>
        </g>
      )}
    </svg>
  );
};

/* ---------- Story scroll rod-end ---------- */

const ScrollRod = ({side='left', height=120}) => {
  const flip = side === 'right';
  return (
    <svg width="22" height={height} viewBox={`0 0 22 ${height}`} style={{transform: flip ? 'scaleX(-1)' : 'none', display:'block'}}>
      <defs>
        <linearGradient id={`rodGrad-${side}`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="#5C3F09"/>
          <stop offset="50%" stopColor="#E8C760"/>
          <stop offset="100%" stopColor="#5C3F09"/>
        </linearGradient>
      </defs>
      {/* top cap */}
      <ellipse cx="11" cy="8" rx="11" ry="6" fill="url(#rodGrad-left)"/>
      <ellipse cx="11" cy="8" rx="6" ry="3" fill="#FFEFB8"/>
      {/* rolled parchment */}
      <rect x="2" y="8" width="18" height={height-16} fill="url(#parchGrad)" stroke="#7A6634" strokeWidth="0.8"/>
      <rect x="3" y="10" width="2" height={height-20} fill="#A99668" opacity="0.6"/>
      <rect x="17" y="10" width="2" height={height-20} fill="#A99668" opacity="0.4"/>
      {/* bottom cap */}
      <ellipse cx="11" cy={height-8} rx="11" ry="6" fill="url(#rodGrad-left)"/>
      <ellipse cx="11" cy={height-8} rx="6" ry="3" fill="#FFEFB8"/>
    </svg>
  );
};

/* ---------- HP, hourglass, book, item-buttons ---------- */

const HeartIcon = ({size=18}) => (
  <svg width={size} height={size} viewBox="0 0 22 22" fill="none">
    <path d="M11 19 C2 13, 2 4, 7.5 4 C9.5 4, 10.5 5.5, 11 7 C11.5 5.5, 12.5 4, 14.5 4 C20 4, 20 13, 11 19 Z"
      fill="url(#redGrad)" stroke="#5A0606" strokeWidth="1"/>
    <path d="M8 7 C9.5 6, 10.4 6.5, 10.8 7.5" stroke="#FFB8B8" strokeWidth="1" fill="none" strokeLinecap="round"/>
  </svg>
);

const HourglassIcon = ({size=42, sand=true}) => (
  <svg width={size} height={size*1.2} viewBox="0 0 36 44">
    {/* frame */}
    <rect x="2" y="2" width="32" height="3" rx="1" fill="url(#goldGrad)" stroke="#5C3F09" strokeWidth="0.6"/>
    <rect x="2" y="39" width="32" height="3" rx="1" fill="url(#goldGrad)" stroke="#5C3F09" strokeWidth="0.6"/>
    {/* glass */}
    <path d="M6 5 L30 5 L20 22 L30 39 L6 39 L16 22 Z"
      fill="rgba(232,217,180,0.18)" stroke="#5C3F09" strokeWidth="1.4" strokeLinejoin="round"/>
    {/* sand top */}
    <path d="M9 8 L27 8 L19 21 L17 21 Z" fill="#E8C760"/>
    {/* sand bottom */}
    <path d="M11 36 L25 36 L20 25 L16 25 Z" fill="#E8C760"/>
    {sand && (<>
      <circle cx="18" cy="22" r="0.7" fill="#E8C760">
        <animate attributeName="cy" from="20" to="32" dur="0.9s" repeatCount="indefinite"/>
        <animate attributeName="opacity" from="1" to="0" dur="0.9s" repeatCount="indefinite"/>
      </circle>
      <circle cx="18" cy="20" r="0.5" fill="#E8C760">
        <animate attributeName="cy" from="20" to="32" dur="0.9s" begin="0.3s" repeatCount="indefinite"/>
        <animate attributeName="opacity" from="1" to="0" dur="0.9s" begin="0.3s" repeatCount="indefinite"/>
      </circle>
    </>)}
  </svg>
);

const BookIcon = ({size=22}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M3 5 C8 3, 11 5, 12 6 V20 C11 19, 8 17, 3 19 Z"
      fill="url(#parchGrad)" stroke="#5C3F09" strokeWidth="1"/>
    <path d="M21 5 C16 3, 13 5, 12 6 V20 C13 19, 16 17, 21 19 Z"
      fill="url(#parchGrad)" stroke="#5C3F09" strokeWidth="1"/>
    <line x1="6" y1="9" x2="10" y2="9" stroke="#7A5A12" strokeWidth="0.6"/>
    <line x1="6" y1="12" x2="10" y2="12" stroke="#7A5A12" strokeWidth="0.6"/>
    <line x1="14" y1="9" x2="18" y2="9" stroke="#7A5A12" strokeWidth="0.6"/>
    <line x1="14" y1="12" x2="18" y2="12" stroke="#7A5A12" strokeWidth="0.6"/>
  </svg>
);

const BackpackIcon = ({size=26}) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <path d="M9 8 C9 4, 13 3, 16 3 C19 3, 23 4, 23 8 V10 H9 Z"
      fill="#7A4A2A" stroke="#3A2414" strokeWidth="1"/>
    <rect x="5" y="9" width="22" height="20" rx="3" fill="#A06736" stroke="#3A2414" strokeWidth="1.2"/>
    <rect x="9" y="14" width="14" height="8" rx="2" fill="#7A4A2A" stroke="#3A2414" strokeWidth="1"/>
    <circle cx="16" cy="18" r="1.2" fill="#3A2414"/>
    <rect x="14" y="9" width="4" height="3" fill="#5D3A22" stroke="#3A2414" strokeWidth="0.6"/>
  </svg>
);

const HelpIcon = ({size=26}) => (
  <svg width={size} height={size} viewBox="0 0 32 32">
    <circle cx="16" cy="16" r="13" fill="url(#blueGrad)" stroke="#FFEFB8" strokeWidth="1"/>
    <text x="16" y="22" textAnchor="middle" fontFamily="Cinzel, serif" fontSize="18" fontWeight="700" fill="#fff">?</text>
  </svg>
);

const DoorIcon = ({size=26}) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <rect x="6" y="4" width="20" height="26" rx="1" fill="#7A4A2A" stroke="#3A2414" strokeWidth="1.2"/>
    <rect x="9" y="7" width="14" height="20" fill="#5D3A22" stroke="#3A2414" strokeWidth="0.6"/>
    <line x1="11" y1="9" x2="11" y2="25" stroke="#3A2414" strokeWidth="0.5"/>
    <line x1="14" y1="9" x2="14" y2="25" stroke="#3A2414" strokeWidth="0.5"/>
    <line x1="17" y1="9" x2="17" y2="25" stroke="#3A2414" strokeWidth="0.5"/>
    <circle cx="20" cy="17" r="1.4" fill="#FCD34D" stroke="#5C3F09" strokeWidth="0.4"/>
  </svg>
);

const HandCursor = ({size=36}) => (
  <svg width={size} height={size} viewBox="0 0 36 36" fill="none" style={{filter:'drop-shadow(0 2px 3px rgba(0,0,0,0.6))'}}>
    <path d="M14 4 C14 3, 15 2, 16 2 C17 2, 18 3, 18 4 V14
             L20 12 C20 11, 21 10, 22 10 C23 10, 24 11, 24 12 V16
             L26 14 C26 13, 27 12, 28 12 C29 12, 30 13, 30 14 V20
             C30 27, 26 32, 20 32 H17
             C13 32, 10 30, 9 26 L7 20 C7 18, 8 17, 9 17
             C10 17, 11 17.5, 12 19 L14 22 V4 Z"
      fill="#FFF" stroke="#1F1408" strokeWidth="1.4" strokeLinejoin="round"/>
  </svg>
);

/* ---------- Wizard avatar (Yanni) ---------- */

const WizardAvatar = ({size=88}) => (
  <svg width={size} height={size} viewBox="0 0 100 100">
    <defs>
      <radialGradient id="starsBg" cx="0.5" cy="0.45" r="0.6">
        <stop offset="0%" stopColor="#3a5b9a"/>
        <stop offset="100%" stopColor="#0E1A30"/>
      </radialGradient>
    </defs>
    <circle cx="50" cy="50" r="48" fill="url(#starsBg)" stroke="url(#goldRimGrad)" strokeWidth="3"/>
    {/* tiny stars */}
    {[[20,30],[78,28],[26,68],[80,70],[60,18],[40,80]].map(([x,y],i)=>(
      <path key={i} d={`M${x} ${y-2} L${x+1} ${y-0.5} L${x+2} ${y} L${x+1} ${y+0.5} L${x} ${y+2} L${x-1} ${y+0.5} L${x-2} ${y} L${x-1} ${y-0.5} Z`} fill="#FCE89B" opacity="0.85"/>
    ))}
    {/* robe */}
    <path d="M30 95 L34 60 L66 60 L70 95 Z" fill="#4F2A9F" stroke="#1f0e4a" strokeWidth="1.2"/>
    <path d="M40 60 L50 78 L60 60" stroke="#7d4be3" strokeWidth="2" fill="none"/>
    <circle cx="50" cy="74" r="1.5" fill="#FCD34D"/>
    {/* head (stick figure) */}
    <circle cx="50" cy="48" r="9" fill="#F4E1C4" stroke="#1F1408" strokeWidth="1.2"/>
    {/* hat */}
    <path d="M30 38 L50 12 L70 38 Z" fill="#3A1671" stroke="#1f0e4a" strokeWidth="1.2"/>
    <path d="M28 38 L72 38 L70 42 L30 42 Z" fill="#3A1671" stroke="#1f0e4a" strokeWidth="1.2"/>
    <path d="M50 12 L52 16 L48 16 Z" fill="#FCD34D"/>
    {/* hat band stars */}
    <path d="M40 34 l1 2 l2 0.5 l-2 0.5 l-1 2 l-1 -2 l-2 -0.5 l2 -0.5 z" fill="#FCD34D"/>
    <path d="M58 34 l1 2 l2 0.5 l-2 0.5 l-1 2 l-1 -2 l-2 -0.5 l2 -0.5 z" fill="#FCD34D"/>
    {/* face */}
    <circle cx="46.5" cy="48" r="0.9" fill="#1F1408"/>
    <circle cx="53.5" cy="48" r="0.9" fill="#1F1408"/>
    <path d="M46 51.5 Q50 54 54 51.5" stroke="#1F1408" strokeWidth="1" fill="none" strokeLinecap="round"/>
    {/* staff */}
    <line x1="74" y1="22" x2="64" y2="78" stroke="#7A4A2A" strokeWidth="2.4" strokeLinecap="round"/>
    <circle cx="74" cy="22" r="4" fill="#E879F9"/>
    <circle cx="74" cy="22" r="6" fill="#E879F9" opacity="0.35"/>
    <path d="M74 16 L75 21 L74 22 L73 21 Z" fill="#FCE89B"/>
  </svg>
);

const HatGlyph = ({size=14}) => (
  <svg width={size} height={size} viewBox="0 0 16 16">
    <path d="M2 12 L8 2 L14 12 Z" fill="#8E5BD9" stroke="#3A1671" strokeWidth="1"/>
    <path d="M1.5 12 L14.5 12 L13.5 14 L2.5 14 Z" fill="#8E5BD9" stroke="#3A1671" strokeWidth="1"/>
  </svg>
);

/* ---------- Castle silhouette watermark ---------- */
const CastleWatermark = ({width=140, height=120, opacity=0.18}) => (
  <svg width={width} height={height} viewBox="0 0 140 120" fill="none" style={{opacity}}>
    <path d="M10 110 L10 70 L20 70 L20 60 L30 60 L30 80 L40 80 L40 50 L48 50 L48 40 L56 50 L56 80 L70 80 L70 30 L78 30 L78 22 L86 30 L86 80 L100 80 L100 60 L110 60 L110 70 L120 70 L120 110 Z"
      fill="#3A2C18"/>
    <rect x="62" y="55" width="6" height="10" fill="#E8D9B4"/>
    <rect x="78" y="50" width="5" height="9" fill="#E8D9B4"/>
    <rect x="42" y="65" width="4" height="7" fill="#E8D9B4"/>
    {/* Dragon flying over */}
    <path d="M120 18 q-5 -8 -12 -2 q-5 -6 -10 -2 q3 4 9 5 q4 4 10 4 q4 -1 3 -5 z" fill="#3A2C18"/>
  </svg>
);

/* expose globally */
Object.assign(window, {
  Defs,
  HamburgerIcon, SwordIcon, CrownIcon, StarSparkleIcon, BellIcon, FriendsIcon,
  ShieldEmblem, TurnBadgeShield, DragonHead,
  CrossedSwords,
  PersuadeCoin, IntimidateCoin, ExamineCoin, MoveCoin, SpotlightCoin,
  WaxSeal, SealStar, SealSwords, SealHeart,
  Envelope,
  ScrollRod, CastleWatermark,
  HeartIcon, HourglassIcon, BookIcon, BackpackIcon, HelpIcon, DoorIcon,
  HandCursor, WizardAvatar, HatGlyph,
});
