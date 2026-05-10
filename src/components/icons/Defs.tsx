export const Defs = () => (
  <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
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
      <radialGradient id="coinSheen" cx="0.35" cy="0.3" r="0.65">
        <stop offset="0%" stopColor="rgba(255,255,255,0.55)"/>
        <stop offset="60%" stopColor="rgba(255,255,255,0)"/>
      </radialGradient>
      <linearGradient id="charmGrad" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stopColor="#F472B6"/>
        <stop offset="50%" stopColor="#BE185D"/>
        <stop offset="100%" stopColor="#6B1337"/>
      </linearGradient>
      <linearGradient id="bluffGrad" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stopColor="#5EEAD4"/>
        <stop offset="50%" stopColor="#0D9488"/>
        <stop offset="100%" stopColor="#0A4A3A"/>
      </linearGradient>
      <linearGradient id="bribeGrad" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stopColor="#FEF08A"/>
        <stop offset="50%" stopColor="#CA8A04"/>
        <stop offset="100%" stopColor="#713F12"/>
      </linearGradient>
      <linearGradient id="fireGrad" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stopColor="#FB923C"/>
        <stop offset="50%" stopColor="#DC2626"/>
        <stop offset="100%" stopColor="#7A1A08"/>
      </linearGradient>
      <linearGradient id="thunderGrad" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stopColor="#818CF8"/>
        <stop offset="50%" stopColor="#3730A3"/>
        <stop offset="100%" stopColor="#0D1260"/>
      </linearGradient>
      <linearGradient id="shieldGrad" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stopColor="#BAE6FD"/>
        <stop offset="50%" stopColor="#0369A1"/>
        <stop offset="100%" stopColor="#0C2A4A"/>
      </linearGradient>
      <linearGradient id="disengageGrad" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stopColor="#86EFAC"/>
        <stop offset="50%" stopColor="#16A34A"/>
        <stop offset="100%" stopColor="#14532D"/>
      </linearGradient>
      <linearGradient id="arcaneGrad" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stopColor="#C084FC"/>
        <stop offset="50%" stopColor="#7C3AED"/>
        <stop offset="100%" stopColor="#1E0A3A"/>
      </linearGradient>
      <linearGradient id="communeGrad" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stopColor="#67E8F9"/>
        <stop offset="50%" stopColor="#0891B2"/>
        <stop offset="100%" stopColor="#0A3A4A"/>
      </linearGradient>
      <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="2" result="b"/>
        <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>
  </svg>
);
