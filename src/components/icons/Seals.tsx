export const SealStar = ({ size = 28 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
    <circle cx="14" cy="14" r="13" fill="url(#purpleGrad)" stroke="#3A1671" strokeWidth="1"/>
    <path d="M14 5 L15.4 10.8 L21 9 L17.2 13.4 L22 17 L16.2 16.4 L14 22 L11.8 16.4 L6 17 L10.8 13.4 L7 9 L12.6 10.8 Z"
      fill="#FFE9A8" opacity="0.9"/>
  </svg>
);

export const SealSwords = ({ size = 28 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
    <circle cx="14" cy="14" r="13" fill="url(#redGrad)" stroke="#5A0606" strokeWidth="1"/>
    <g transform="translate(14 14) rotate(45)">
      <rect x="-1.5" y="-10" width="3" height="20" rx="1" fill="#FFE9A8"/>
      <rect x="-5" y="7" width="10" height="2" rx="1" fill="#5C3F09"/>
    </g>
    <g transform="translate(14 14) rotate(-45)">
      <rect x="-1.5" y="-10" width="3" height="20" rx="1" fill="#FFE9A8"/>
      <rect x="-5" y="7" width="10" height="2" rx="1" fill="#5C3F09"/>
    </g>
  </svg>
);

export const SealHeart = ({ size = 28 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
    <circle cx="14" cy="14" r="13" fill="url(#redGrad)" stroke="#5A0606" strokeWidth="1"/>
    <path d="M14 21 C14 21 6 16 6 11 A4 4 0 0 1 14 9 A4 4 0 0 1 22 11 C22 16 14 21 14 21 Z"
      fill="#FFEFCB" stroke="#5A0606" strokeWidth="0.5"/>
  </svg>
);

export const Envelope = ({
  width = 104, height = 74, name, action, revealed = false, broken = false,
  sealColor, sealIcon: SealIcon,
}: {
  width?: number; height?: number; name: string; action?: string;
  revealed?: boolean; broken?: boolean; sealColor: string;
  sealIcon?: React.FC<{ size?: number }>;
}) => {
  const sealFill: Record<string, string> = {
    purple: '#B68CF0',
    green:  '#6EE7B7',
    red:    '#F87171',
    gold:   '#E8C760',
  };
  const fill = sealFill[sealColor] ?? '#E8C760';

  if (revealed) {
    return (
      <svg width={width} height={height} viewBox="0 0 104 74" fill="none">
        <rect x="1" y="1" width="102" height="72" rx="4" fill="url(#parchGrad)" stroke="#A08040" strokeWidth="1.5"/>
        <text x="52" y="22" textAnchor="middle"
          fontFamily="Cinzel, serif" fontSize="9" fill="#5C3F09" letterSpacing="1">{name}</text>
        <text x="52" y="38" textAnchor="middle"
          fontFamily="EB Garamond, serif" fontStyle="italic" fontSize="11" fill="#3A2414">{action ?? ''}</text>
        {broken && (
          <>
            <circle cx="52" cy="52" r="8" fill={fill} opacity="0.3"/>
            <text x="52" y="56" textAnchor="middle" fontSize="10" fill={fill}>✦</text>
          </>
        )}
      </svg>
    );
  }

  return (
    <svg width={width} height={height} viewBox="0 0 104 74" fill="none">
      <rect x="1" y="1" width="102" height="72" rx="4" fill="url(#parchGrad)" stroke="#A08040" strokeWidth="1.5"/>
      <path d="M1 1 L52 42 L103 1" stroke="#A08040" strokeWidth="1" fill="none"/>
      <path d="M1 1 L30 38" stroke="#A08040" strokeWidth="0.6" fill="none" opacity="0.5"/>
      <path d="M103 1 L74 38" stroke="#A08040" strokeWidth="0.6" fill="none" opacity="0.5"/>
      <circle cx="52" cy="42" r="11" fill={fill} stroke="#3A2414" strokeWidth="1.2"/>
      {SealIcon && (
        <foreignObject x="38" y="28" width="28" height="28">
          <SealIcon size={28}/>
        </foreignObject>
      )}
    </svg>
  );
};
