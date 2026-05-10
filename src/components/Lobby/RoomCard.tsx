interface RoomData {
  title: string;
  statusDot: string;
  statusBadge: string;
  statusLabel: string;
  theme: string;
  party: { color: string; initial: string; name: string }[];
  maxPlayers: number;
  turnDuration: string;
  visibilityIcon: string;
  progress: number;
  progressLabel: string;
  lastBeat: string;
  cta?: string;
}

interface Props {
  room: RoomData;
  featured?: boolean;
  onTap: () => void;
}

export const RoomCard = ({ room, featured, onTap }: Props) => (
  <div className={`room-card ${featured ? 'featured' : ''}`} onClick={onTap}>
    <div className="room-row">
      <div className="room-title">{room.title}</div>
      <span className={`status-dot ${room.statusDot}`}/>
      <span className={`status-badge ${room.statusBadge}`}>{room.statusLabel}</span>
    </div>
    <div className="room-row">
      <div className="theme-tag">{room.theme}</div>
    </div>
    <div className="room-row" style={{ justifyContent: 'space-between' }}>
      <div className="avatars">
        {room.party.map((p, i) => (
          <div key={i} className={`a ${p.color}`} title={p.name}>{p.initial}</div>
        ))}
        {Array.from({ length: room.maxPlayers - room.party.length }).map((_, i) => (
          <div key={`e${i}`} className="a empty">+</div>
        ))}
      </div>
      <div style={{
        fontFamily: 'Inter, sans-serif', fontSize: 10, color: '#A99668',
        letterSpacing: '0.04em', display: 'flex', gap: 8, alignItems: 'center',
      }}>
        <span>⏱ {room.turnDuration}</span>
        <span>{room.visibilityIcon}</span>
      </div>
    </div>
    <div className="room-row" style={{ gap: 8 }}>
      <div className="pbar"><div style={{ width: `${room.progress}%` }}/></div>
      <div style={{
        fontFamily: 'Cinzel, serif', fontSize: 10, color: '#FFE9A8',
        letterSpacing: '0.06em', whiteSpace: 'nowrap',
      }}>{room.progressLabel}</div>
    </div>
    <div style={{
      fontFamily: 'EB Garamond, serif', fontStyle: 'italic', fontSize: 12, color: '#A99668',
      borderTop: '1px dashed rgba(232,199,96,0.18)', paddingTop: 8, lineHeight: 1.4,
    }}>
      <span style={{
        fontFamily: 'Cinzel, serif', fontStyle: 'normal', fontSize: 9, color: '#7a6a44',
        letterSpacing: '0.16em', textTransform: 'uppercase', marginRight: 6,
      }}>Last:</span>
      {room.lastBeat}
    </div>
    {featured && (
      <div className="resume-btn">
        <span>{room.cta ?? 'Resume Adventure'}</span>
        <span style={{ fontSize: 10, opacity: 0.75 }}>→</span>
      </div>
    )}
  </div>
);
