import { CAMPAIGN_TITLE, PLAYERS } from '../../data/campaign';

export const CampaignBanner = () => (
  <div style={{
    height: 52,
    background: 'linear-gradient(180deg,#0B1525,#0F1B2D)',
    borderBottom: '1px solid rgba(232,199,96,0.2)',
    display: 'flex',
    alignItems: 'center',
    padding: '0 12px',
    gap: 10,
    flexShrink: 0,
    zIndex: 3,
  }}>
    <span style={{
      fontFamily: 'Cinzel, serif',
      fontSize: 11,
      letterSpacing: '0.1em',
      background: 'linear-gradient(180deg,#FCE89B,#E8C760)',
      WebkitBackgroundClip: 'text',
      backgroundClip: 'text',
      color: 'transparent',
      flex: 1,
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    }}>
      {CAMPAIGN_TITLE}
    </span>

    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      {PLAYERS.map(p => (
        <div key={p.id} style={{ position: 'relative' }}>
          <div style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: p.id === 'yanni'
              ? 'linear-gradient(180deg,#B68CF0,#4A1F8A)'
              : p.id === 'bram'
                ? 'linear-gradient(180deg,#6EE7B7,#1f8f3a)'
                : 'linear-gradient(180deg,#F87171,#7E1A1A)',
            border: '1.5px solid #E8C760',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'Cinzel, serif',
            fontWeight: 700,
            fontSize: 11,
            color: '#FFEFCB',
          }}>
            {p.initial}
          </div>
          <div style={{
            position: 'absolute',
            bottom: -1,
            right: -1,
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: p.online ? '#22c55e' : '#6b7280',
            border: '1.5px solid #0F1B2D',
          }}/>
        </div>
      ))}
    </div>
  </div>
);
