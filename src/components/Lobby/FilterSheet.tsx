interface Props {
  kind: string;
  active: string | undefined;
  onClose: () => void;
  onPick: (val: string | null) => void;
}

const OPTIONS_MAP: Record<string, string[]> = {
  progress:   ['Any', 'Just started · 0–25%', 'In progress · 25–75%', 'Wrapping up · 75–100%'],
  players:    ['Any', '1 in room', '2 in room', '3 in room', '4 in room'],
  duration:   ['15s', '30s', '60s', '2 min'],
  theme:      ['Dragon', 'Princess', 'Heist', 'Mystery', 'Horror'],
  visibility: ['Public', 'Friends only', 'Private link'],
};

const TITLE_MAP: Record<string, string> = {
  progress:   'Filter by Progress',
  players:    'Filter by Players',
  duration:   'Filter by Turn Duration',
  theme:      'Filter by Theme',
  visibility: 'Filter by Visibility',
};

export const FilterSheet = ({ kind, active, onClose, onPick }: Props) => {
  const opts = OPTIONS_MAP[kind] ?? [];
  return (
    <>
      <div className="sheet-shade" onClick={onClose}/>
      <div className="sheet">
        <div className="grab"/>
        <h4>{TITLE_MAP[kind]} <small>filter the campaign list</small></h4>
        <div className="seg">
          {opts.map(o => (
            <button
              key={o}
              className={`chip ${active === o ? 'on' : ''}`}
              style={{ padding: '8px 12px', fontSize: 12 }}
              onClick={() => onPick(active === o ? null : o)}
            >{o}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
          <button className="btn-secondary" onClick={() => onPick(null)}>Reset</button>
          <button className="btn-primary" onClick={onClose}>Done</button>
        </div>
      </div>
    </>
  );
};
