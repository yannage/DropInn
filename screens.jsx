/* Lobby + overlays + modals for Stick Figure Quest.
 * Wraps SceneApp (defined in app.jsx) with a screen router and fullscreen overlays.
 */

const { useState: useState_, useEffect: useEffect_, useRef: useRef_, useCallback: useCallback_ } = React;
const SceneApp = window.SceneApp;

/* ========== PERSISTENCE ========== */

const STORAGE_KEY = 'sfq-v1-state';

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

/* ============================================================
 * LOBBY
 * ============================================================ */

const FILTERS = [
  { id: 'progress',   label: 'Progress' },
  { id: 'players',    label: 'Players'  },
  { id: 'duration',   label: '30s'      },
  { id: 'theme',      label: 'Theme'    },
  { id: 'visibility', label: 'Public'   },
];

const RoomCard = ({ room, onTap, featured }) => (
  <div className={`room-card ${featured?'featured':''}`} onClick={onTap}>
    <div className="room-row">
      <div className="room-title">{room.title}</div>
      <span className={`status-dot ${room.statusDot}`}></span>
      <span className={`status-badge ${room.statusBadge}`}>{room.statusLabel}</span>
    </div>
    <div className="room-row">
      <div className="theme-tag">{room.theme}</div>
    </div>
    <div className="room-row" style={{justifyContent:'space-between'}}>
      <div className="avatars">
        {room.party.map((p,i)=>(
          <div key={i} className={`a ${p.color}`} title={p.name}>{p.initial}</div>
        ))}
        {Array.from({length: room.maxPlayers - room.party.length}).map((_,i)=>(
          <div key={`e${i}`} className="a empty">+</div>
        ))}
      </div>
      <div style={{
        fontFamily:'Inter', fontSize:10, color:'#A99668', letterSpacing:'0.04em',
        display:'flex', gap:8, alignItems:'center'
      }}>
        <span>⏱ {room.turnDuration}</span>
        <span>{room.visibilityIcon}</span>
      </div>
    </div>
    <div className="room-row" style={{gap:8}}>
      <div className="pbar"><div style={{width: `${room.progress}%`}}/></div>
      <div style={{
        fontFamily:'Cinzel', fontSize:10, color:'#FFE9A8', letterSpacing:'0.06em',
        whiteSpace:'nowrap'
      }}>{room.progressLabel}</div>
    </div>
    <div style={{
      fontFamily:'EB Garamond', fontStyle:'italic', fontSize:12, color:'#A99668',
      borderTop:'1px dashed rgba(232,199,96,0.18)', paddingTop:8, lineHeight:1.4
    }}>
      <span style={{
        fontFamily:'Cinzel', fontStyle:'normal', fontSize:9, color:'#7a6a44',
        letterSpacing:'0.16em', textTransform:'uppercase', marginRight:6
      }}>Last:</span>
      {room.lastBeat}
    </div>
    {featured && (
      <div className="resume-btn">
        <span>{room.cta || 'Resume Adventure'}</span>
        <span style={{fontSize:10, opacity:0.75}}>→</span>
      </div>
    )}
  </div>
);

const Lobby = ({ onEnterRoom, onOpenProfile, onOpenNotifs, completed, xp }) => {
  const [activeFilters, setActiveFilters] = useState_({});
  const [filterSheetKind, setFilterSheetKind] = useState_(null);
  const [emptyView, setEmptyView] = useState_(false);

  const room = {
    title: 'The Dragon of Ash Hollow',
    statusDot: 'sleeping',
    statusBadge: completed ? 'complete' : 'sleeping',
    statusLabel: completed ? 'Scene Complete' : 'Sleeping · 2d',
    theme: 'Dragon Slaying',
    party: [
      { color:'purple', initial:'Y', name:'Yanni' },
      { color:'green',  initial:'B', name:'Bram'  },
    ],
    maxPlayers: 4,
    turnDuration: '30s',
    visibilityIcon: '🌐',
    progress: completed ? 50 : 30,
    progressLabel: completed ? 'Scene 2 of 3 · 50%' : 'Scene 1 of 3 · 30%',
    lastBeat: completed
      ? 'You convinced Pip to talk. Bram pocketed a healing salve.'
      : 'Yanni and Bram await in Thornwick Market.',
    cta: completed ? 'Continue Adventure' : 'Wake the Room',
  };

  return (
    <div className="lobby-bg">
      {/* HEADER */}
      <div className="navbar-bg" style={{
        height:54, display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'0 12px', borderBottom:'1px solid rgba(232,199,96,0.18)', flexShrink:0,
      }}>
        <div style={{display:'flex', alignItems:'center', gap:10}}>
          <div onClick={onOpenProfile} style={{
            width:36, height:36, borderRadius:'50%',
            background:'linear-gradient(180deg,#B68CF0,#4A1F8A)',
            border:'2px solid #E8C760', cursor:'pointer',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontFamily:'Cinzel', fontWeight:700, color:'#FFEFCB', fontSize:14,
            boxShadow:'inset 0 1px 0 rgba(255,255,255,0.3), 0 0 6px rgba(232,199,96,0.4)'
          }}>Y</div>
          <div>
            <div style={{
              fontFamily:'Cinzel', fontWeight:700, fontSize:16, letterSpacing:'0.06em',
              background:'linear-gradient(180deg, #FCE89B 0%, #E8C760 45%, #B8902E 100%)',
              WebkitBackgroundClip:'text', backgroundClip:'text', color:'transparent',
              lineHeight:1
            }}>Adventures</div>
            <div style={{
              fontFamily:'EB Garamond', fontStyle:'italic', fontSize:11, color:'#A99668',
              marginTop:1
            }}>Yanni · Wizard · Lvl 3 · {xp} XP</div>
          </div>
        </div>
        <div onClick={onOpenNotifs} style={{
          position:'relative', cursor:'pointer', width:36, height:36,
          display:'flex', alignItems:'center', justifyContent:'center',
          background:'linear-gradient(180deg,#1B2C4A,#0E1A30)',
          border:'1px solid rgba(232,199,96,0.3)', borderRadius:8,
        }}>
          <window.BellIcon size={18}/>
          <div style={{
            position:'absolute', top:-3, right:-3, width:14, height:14, borderRadius:'50%',
            background:'#A02828', border:'1.5px solid #0F1B2D', color:'#FFE9A8',
            fontFamily:'Inter', fontSize:9, fontWeight:700,
            display:'flex', alignItems:'center', justifyContent:'center'
          }}>2</div>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="filter-bar">
        {FILTERS.map(f=>(
          <button
            key={f.id}
            className={`chip ${activeFilters[f.id]?'on':''}`}
            onClick={()=> setFilterSheetKind(f.id)}
          >
            {f.label} <span style={{opacity:0.6}}>▾</span>
          </button>
        ))}
        {Object.keys(activeFilters).length > 0 && (
          <button className="chip clear" onClick={()=>{setActiveFilters({}); setEmptyView(false);}}>
            ✕ Clear
          </button>
        )}
      </div>

      {/* LIST */}
      {emptyView ? (
        <div className="empty-state">
          <div className="glyph">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <circle cx="17" cy="17" r="9" stroke="currentColor" strokeWidth="2"/>
              <path d="M24 24 L32 32" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <h3>NO CAMPAIGNS MATCH</h3>
          <p>The realm holds no quests of that nature. Try a different theme, or clear your filters.</p>
          <button className="btn-secondary" style={{flex:'none', padding:'8px 16px'}}
            onClick={()=>{setActiveFilters({}); setEmptyView(false);}}>
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="lobby-list">
          <div style={{
            fontFamily:'Cinzel', fontSize:10, letterSpacing:'0.16em', color:'#7a6a44',
            textTransform:'uppercase', display:'flex', alignItems:'center', gap:8
          }}>
            <span style={{flex:1, height:1, background:'rgba(232,199,96,0.18)'}}/>
            <span>Continue Where You Left Off</span>
            <span style={{flex:1, height:1, background:'rgba(232,199,96,0.18)'}}/>
          </div>
          <RoomCard room={room} featured onTap={onEnterRoom}/>

          <div style={{
            fontFamily:'Cinzel', fontSize:10, letterSpacing:'0.16em', color:'#7a6a44',
            textTransform:'uppercase', marginTop:6,
            display:'flex', alignItems:'center', gap:8
          }}>
            <span style={{flex:1, height:1, background:'rgba(232,199,96,0.18)'}}/>
            <span>Discover · Open to Drop-Ins</span>
            <span style={{flex:1, height:1, background:'rgba(232,199,96,0.18)'}}/>
          </div>

          {/* Atmosphere cards (coming in V2) */}
          <div className="room-card" style={{opacity:0.55}}>
            <div className="room-row">
              <div className="room-title">The Stolen Crown</div>
              <span className="status-dot active"></span>
              <span className="status-badge active">Active · 3</span>
            </div>
            <div className="theme-tag">Heist · Royal Court</div>
            <div className="room-row" style={{justifyContent:'space-between'}}>
              <div className="avatars">
                <div className="a red">M</div>
                <div className="a green">T</div>
                <div className="a purple">K</div>
                <div className="a empty">+</div>
              </div>
              <div style={{fontFamily:'Inter', fontSize:10, color:'#A99668'}}>⏱ 60s · 🌐</div>
            </div>
            <div className="room-row" style={{gap:8}}>
              <div className="pbar"><div style={{width: '70%'}}/></div>
              <div style={{fontFamily:'Cinzel', fontSize:10, color:'#A99668', letterSpacing:'0.06em'}}>Scene 4 of 5</div>
            </div>
            <div style={{
              fontFamily:'Inter', fontSize:9, letterSpacing:'0.18em', textTransform:'uppercase',
              color:'#7a6a44', textAlign:'center', paddingTop:4
            }}>· COMING IN V2 ·</div>
          </div>

          <div className="room-card" style={{opacity:0.45}}>
            <div className="room-row">
              <div className="room-title">Whispers in Hollowmere</div>
              <span className="status-dot sleeping"></span>
              <span className="status-badge sleeping">Sleeping · 5h</span>
            </div>
            <div className="theme-tag">Mystery · Village</div>
            <div className="room-row" style={{justifyContent:'space-between'}}>
              <div className="avatars">
                <div className="a purple">N</div>
                <div className="a red">S</div>
              </div>
              <div style={{fontFamily:'Inter', fontSize:10, color:'#A99668'}}>⏱ 2m · 🔒</div>
            </div>
            <div className="room-row" style={{gap:8}}>
              <div className="pbar"><div style={{width:'15%'}}/></div>
              <div style={{fontFamily:'Cinzel', fontSize:10, color:'#A99668', letterSpacing:'0.06em'}}>Scene 1 of 4</div>
            </div>
          </div>

          <div style={{height:8}}/>
        </div>
      )}

      {/* ACTION BAR */}
      <div className="lobby-actionbar">
        <button className="btn-primary disabled" disabled>
          ✦ Create Adventure
        </button>
        <button className="btn-secondary" onClick={()=> setEmptyView(false)}>
          My Campaigns
        </button>
      </div>

      {/* FILTER SHEET */}
      {filterSheetKind && (
        <FilterSheet
          kind={filterSheetKind}
          active={activeFilters[filterSheetKind]}
          onClose={()=> setFilterSheetKind(null)}
          onPick={(val)=>{
            const next = { ...activeFilters };
            if (val == null) delete next[filterSheetKind]; else next[filterSheetKind] = val;
            setActiveFilters(next);
            // Theme filter triggers empty state per spec
            if (filterSheetKind === 'theme' && val && val !== 'Dragon') setEmptyView(true);
            else setEmptyView(false);
            setFilterSheetKind(null);
          }}
        />
      )}
    </div>
  );
};

const FilterSheet = ({ kind, active, onClose, onPick }) => {
  const optionsMap = {
    progress:   ['Any', 'Just started · 0–25%', 'In progress · 25–75%', 'Wrapping up · 75–100%'],
    players:    ['Any', '1 in room', '2 in room', '3 in room', '4 in room'],
    duration:   ['15s', '30s', '60s', '2 min'],
    theme:      ['Dragon', 'Princess', 'Heist', 'Mystery', 'Horror'],
    visibility: ['Public', 'Friends only', 'Private link'],
  };
  const titleMap = {
    progress:   'Filter by Progress',
    players:    'Filter by Players',
    duration:   'Filter by Turn Duration',
    theme:      'Filter by Theme',
    visibility: 'Filter by Visibility',
  };
  const opts = optionsMap[kind] || [];
  return (
    <>
      <div className="sheet-shade" onClick={onClose}/>
      <div className="sheet">
        <div className="grab"/>
        <h4>{titleMap[kind]} <small>filter the campaign list</small></h4>
        <div className="seg">
          {opts.map(o=>(
            <button
              key={o}
              className={`chip ${active===o?'on':''}`}
              style={{padding:'8px 12px', fontSize:12}}
              onClick={()=> onPick(active===o ? null : o)}
            >{o}</button>
          ))}
        </div>
        <div style={{display:'flex', gap:8, marginTop:6}}>
          <button className="btn-secondary" onClick={()=> onPick(null)}>Reset</button>
          <button className="btn-primary" onClick={onClose}>Done</button>
        </div>
      </div>
    </>
  );
};

/* ============================================================
 * PREVIOUSLY-ON OVERLAY
 * ============================================================ */

const PreviouslyOn = ({ onContinue, completed }) => {
  const [seconds, setSeconds] = useState_(8);
  useEffect_(()=>{
    if (seconds <= 0) { onContinue(); return; }
    const id = setTimeout(()=> setSeconds(s=>s-1), 1000);
    return ()=> clearTimeout(id);
  }, [seconds, onContinue]);

  return (
    <div style={{
      position:'absolute', inset:0, zIndex:60,
      background:'radial-gradient(ellipse at 50% 50%, rgba(15,27,45,0.8) 0%, rgba(8,12,20,0.95) 80%)',
      backdropFilter:'blur(4px)',
      display:'flex', flexDirection:'column', justifyContent:'center', padding:'14px',
      animation:'fade-in 0.4s ease',
    }}>
      <div className="prev-card" style={{position:'relative', top:'auto', left:'auto', right:'auto'}}>
        <div className="ribbon">Previously on</div>
        <h3 style={{marginTop:14}}>The Dragon of Ash Hollow</h3>
        <div className="summary">
          Yanni and Bram have arrived in <em>Thornwick</em>. The town is uneasy — smoke rises
          from the northern road where the dragon was last seen. The villagers speak of a
          gremlin merchant who may know more.
        </div>
        <div className="prev-strip">
          <strong>The Party</strong>
          Yanni the Wizard · Bram the Fighter · You (drop-in)
        </div>
        <div className="prev-strip">
          <strong>World State</strong>
          Villages razed: 1 of 5 · Turn 3 · Pip Bramblebottom (suspicious gremlin) eyes you from his stall.
        </div>
        <div className="countdown">
          <span>Beginning in {seconds}s…</span>
          <button className="skip" onClick={onContinue}>Skip ›</button>
        </div>
      </div>
    </div>
  );
};

/* ============================================================
 * DROP-IN ARRIVAL BANNER
 * ============================================================ */

const DropInBanner = ({ onClose }) => {
  useEffect_(()=>{
    const id = setTimeout(onClose, 4500);
    return ()=> clearTimeout(id);
  }, [onClose]);
  return (
    <div className="dropin-banner">
      <div className="nowyou">You arrive</div>
      <div style={{fontFamily:'EB Garamond', fontStyle:'italic', fontSize:14, lineHeight:1.4}}>
        You arrive at Thornwick Market, drawn by the rising smoke. Yanni and Bram turn
        at the sound of your boots, and Bram raises a hand in greeting.
      </div>
    </div>
  );
};

/* ============================================================
 * MODAL CHROME
 * ============================================================ */

const Modal = ({ title, onClose, children, footer }) => (
  <>
    <div className="modal-shade" onClick={onClose}/>
    <div className="modal">
      <div className="modal-head">
        <span style={{color:'#E8C760', fontSize:14}}>✦</span>
        <span className="title">{title}</span>
        <button className="close" onClick={onClose}>✕</button>
      </div>
      <div className="modal-body">{children}</div>
      {footer && <div className="modal-foot">{footer}</div>}
    </div>
  </>
);

/* ============================================================
 * INVENTORY MODAL
 * ============================================================ */

const Inventory = ({ onClose, hasSalve }) => {
  const [sel, setSel] = useState_(null);
  const items = [
    { i:0, name:'Apprentice Staff',  glyph:'⚝', kind:'legendary', desc:'+2 INT spells. Hums faintly when an arcane creature is near.' },
    { i:1, name:'Spellbook',         glyph:'✦', kind:'has',       desc:'Three prepared spells: Fire Bolt, Mage Hand, Light.' },
    { i:2, name:'Healing Salve',     glyph:'❀', kind:'consumable', desc:'Restore 1d4+2 HP. Smells of mint and old herbs.', hidden: !hasSalve, qty:1 },
    { i:3, name:'Coin Pouch',        glyph:'◉', kind:'has',       desc:'24 gold pieces. Heavier than it should be.', qty:24 },
    { i:4, name:'Travel Rations',    glyph:'◈', kind:'has',       desc:'3 days of dried bread and salted meat.', qty:3 },
  ];
  const slots = Array.from({length:16}).map((_,i)=> items.find(it=> it.i===i && !it.hidden));
  const cur = sel != null ? items.find(it=> it.i===sel) : null;
  return (
    <Modal title="Backpack" onClose={onClose}
      footer={cur ? (
        <>
          <button className="btn-secondary" onClick={()=> setSel(null)}>Back</button>
          <button className="btn-primary">{cur.kind==='consumable' ? 'Use' : 'Equip'}</button>
        </>
      ) : (
        <>
          <span style={{
            flex:1, fontFamily:'EB Garamond', fontStyle:'italic',
            fontSize:11, color:'#7a6a44', alignSelf:'center'
          }}>Tap an item to inspect.</span>
          <button className="btn-secondary" onClick={onClose}>Close</button>
        </>
      )}
    >
      <div className="inv-grid">
        {slots.map((it, i)=>(
          <div key={i}
            className={`inv-cell ${it ? (it.kind==='legendary'?'legendary': it.kind==='consumable'?'consumable':'has') : ''} ${sel===it?.i?'selected':''}`}
            onClick={()=> it && setSel(it.i)}
          >
            {it ? <span style={{fontFamily:'Cinzel', color:'#FFE9A8'}}>{it.glyph}</span> : null}
            {it && it.qty > 1 && <span className="qty">{it.qty}</span>}
          </div>
        ))}
      </div>
      {cur && (
        <div style={{
          marginTop:14, padding:'12px', borderRadius:6,
          background:'rgba(232,199,96,0.06)', border:'1px solid rgba(232,199,96,0.25)'
        }}>
          <div style={{
            fontFamily:'Cinzel', fontSize:13, color:'#FFE9A8', letterSpacing:'0.04em',
            display:'flex', justifyContent:'space-between', alignItems:'center'
          }}>
            <span>{cur.name}</span>
            <span style={{
              fontFamily:'Inter', fontSize:9, letterSpacing:'0.16em',
              color: cur.kind==='legendary'?'#E8C760': cur.kind==='consumable'?'#6EE7B7':'#A99668',
              textTransform:'uppercase'
            }}>{cur.kind}</span>
          </div>
          <div style={{
            fontFamily:'EB Garamond', fontStyle:'italic', fontSize:13,
            color:'#C9B888', marginTop:6, lineHeight:1.4
          }}>{cur.desc}</div>
        </div>
      )}
    </Modal>
  );
};

/* ============================================================
 * HELP MODAL
 * ============================================================ */

const Help = ({ onClose }) => (
  <Modal title="How to Play" onClose={onClose}
    footer={<button className="btn-primary" onClick={onClose}>Got it</button>}
  >
    <HelpRow glyph="◉"
      title="Drag a coin to commit"
      sub="Drag any action coin onto the table to seal your move. Hold tight — gestures take a moment."/>
    <HelpRow glyph="✦"
      title="Tap to confirm"
      sub="Tap a coin and confirm in the popover — no dragging required."/>
    <HelpRow glyph="✉"
      title="Sealed envelopes hide actions"
      sub="No one sees what others picked until the timer expires or all players commit."/>
    <HelpRow glyph="★"
      title="Spotlight tokens bend the story"
      sub="Spend a token to write a short improvised action. Choose from suggestions or write your own."/>
    <HelpRow glyph="⌬"
      title="Drop in or out anytime"
      sub="Leaving is graceful — your character 'guards the rear' until you return. XP and items persist."/>
  </Modal>
);

const HelpRow = ({ glyph, title, sub }) => (
  <div style={{display:'flex', gap:12, padding:'10px 0', borderBottom:'1px dashed rgba(232,199,96,0.15)'}}>
    <div style={{
      width:34, height:34, flexShrink:0, borderRadius:6,
      background:'linear-gradient(180deg,#1B2C4A,#0E1A30)',
      border:'1px solid rgba(232,199,96,0.3)',
      display:'flex', alignItems:'center', justifyContent:'center',
      fontFamily:'Cinzel', fontSize:18, color:'#E8C760'
    }}>{glyph}</div>
    <div>
      <div style={{fontFamily:'Cinzel', fontSize:12, color:'#FFE9A8', letterSpacing:'0.04em'}}>{title}</div>
      <div style={{fontFamily:'EB Garamond', fontStyle:'italic', fontSize:13, color:'#A99668', marginTop:2, lineHeight:1.35}}>{sub}</div>
    </div>
  </div>
);

/* ============================================================
 * LEAVE CONFIRM MODAL
 * ============================================================ */

const LeaveConfirm = ({ onCancel, onConfirm }) => (
  <Modal title="Step Away" onClose={onCancel}
    footer={
      <>
        <button className="btn-secondary" onClick={onCancel}>Stay with the party</button>
        <button className="btn-primary danger" onClick={onConfirm}>Leave gracefully</button>
      </>
    }
  >
    <div style={{textAlign:'center', padding:'8px 4px 4px'}}>
      <div style={{fontFamily:'Cinzel', fontSize:11, letterSpacing:'0.16em', color:'#A99668', textTransform:'uppercase'}}>
        The road calls
      </div>
      <div className="prev-card" style={{
        position:'static', marginTop:14, animation:'none', textAlign:'left'
      }}>
        <div style={{
          fontFamily:'EB Garamond', fontStyle:'italic', fontSize:14, lineHeight:1.45, color:'#3A2C18'
        }}>
          You step away from the party. Yanni nods, knowing the road calls you elsewhere.
          Bram raises his sword in farewell. <em style={{background:'rgba(232,199,96,0.4)', fontStyle:'normal', padding:'0 2px'}}>Your companions continue without you.</em>
        </div>
      </div>
      <div style={{
        marginTop:12,
        fontFamily:'Inter', fontSize:11, color:'#7a6a44', lineHeight:1.5
      }}>
        ✓ Your XP and items are saved.<br/>
        ✓ The room sleeps until you return.<br/>
        ✓ Bots play on without you in the fiction.
      </div>
    </div>
  </Modal>
);

/* ============================================================
 * NPC DETAIL (Pip Bramblebottom)
 * ============================================================ */

const NPCDetail = ({ onClose }) => (
  <Modal title="Pip Bramblebottom" onClose={onClose}
    footer={
      <>
        <button className="btn-secondary" onClick={onClose}>Back</button>
        <button className="btn-primary">Approach</button>
      </>
    }
  >
    <div style={{display:'flex', gap:12, alignItems:'flex-start'}}>
      <div style={{
        width:64, height:64, flexShrink:0, borderRadius:6,
        background:'linear-gradient(180deg,#3a4f30,#1a2818)',
        border:'1px solid #5C3F09',
        display:'flex', alignItems:'center', justifyContent:'center',
        boxShadow:'inset 0 1px 0 rgba(255,255,255,0.06)'
      }}>
        <svg width="38" height="46" viewBox="0 0 38 46">
          <ellipse cx="19" cy="40" rx="9" ry="2" fill="rgba(0,0,0,0.4)"/>
          <circle cx="19" cy="14" r="6" fill="#86F2A0" stroke="#1F1F1F" strokeWidth="1.2"/>
          <path d="M14 12 L11 9 M24 12 L27 9" stroke="#1F1F1F" strokeWidth="1.2" strokeLinecap="round"/>
          <circle cx="17" cy="14" r="0.8" fill="#1F1F1F"/>
          <circle cx="21" cy="14" r="0.8" fill="#1F1F1F"/>
          <path d="M17 16 Q19 17 21 16" stroke="#1F1F1F" strokeWidth="0.9" fill="none" strokeLinecap="round"/>
          <line x1="19" y1="20" x2="19" y2="34" stroke="#1F1F1F" strokeWidth="1.4"/>
          <line x1="19" y1="24" x2="13" y2="30" stroke="#1F1F1F" strokeWidth="1.4"/>
          <line x1="19" y1="24" x2="26" y2="29" stroke="#1F1F1F" strokeWidth="1.4"/>
          <line x1="19" y1="34" x2="14" y2="40" stroke="#1F1F1F" strokeWidth="1.4"/>
          <line x1="19" y1="34" x2="24" y2="40" stroke="#1F1F1F" strokeWidth="1.4"/>
          <circle cx="26" cy="29" r="2" fill="#E8C760" stroke="#5C3F09" strokeWidth="0.6"/>
        </svg>
      </div>
      <div style={{flex:1}}>
        <div style={{
          fontFamily:'Cinzel', fontSize:15, color:'#FFE9A8', letterSpacing:'0.04em'
        }}>Pip Bramblebottom</div>
        <div style={{
          fontFamily:'EB Garamond', fontStyle:'italic', fontSize:12,
          color:'#A99668', marginTop:2
        }}>Goblin merchant · Thornwick Market</div>
        <div className="trait-pills">
          <span className="tp">Goblin</span>
          <span className="tp">Slim</span>
          <span className="tp">Shabby</span>
          <span className="tp demeanor">Suspicious</span>
          <span className="tp motiv">Greed</span>
        </div>
      </div>
    </div>

    <div className="quirk" style={{marginTop:14}}>
      Constantly counts coins, even mid-conversation.
    </div>

    <div style={{
      fontFamily:'Cinzel', fontSize:10, letterSpacing:'0.16em',
      color:'#7a6a44', textTransform:'uppercase', margin:'18px 0 8px'
    }}>Topics</div>

    <div className="topic-row">
      <div className="topic"><span>The Dragon</span><span className="req">CHA / INT</span></div>
      <div className="said">
        "Aye, the beast was last seen near Ash Hollow. Shame about Greenholt — gone in a single night."
        <em style={{display:'block', fontSize:11, color:'#7a6a44', marginTop:3}}>*counts three coins without looking up*</em>
      </div>
    </div>
    <div className="topic-row">
      <div className="topic"><span>His Wares</span><span className="req">INT</span></div>
      <div className="said">
        "Best prices in Thornwick! Quality… varies. Caveat emptor and all that."
        <em style={{display:'block', fontSize:11, color:'#7a6a44', marginTop:3}}>*taps coin on counter suspiciously*</em>
      </div>
    </div>
    <div className="topic-row">
      <div className="topic"><span>The Town</span><span className="req">CHA</span></div>
      <div className="said">
        "Folk are scared. Not buying like they used to. Coins go further when no one's spending them."
        <em style={{display:'block', fontSize:11, color:'#7a6a44', marginTop:3}}>*pockets a coin with practiced quickness*</em>
      </div>
    </div>
    <div className="topic-row locked">
      <div className="topic"><span>Smuggler Routes</span><span className="req">🔒 Persuade first</span></div>
      <div className="said" style={{color:'#5C3F09'}}>
        Locked — Pip won't speak of this until he trusts you.
      </div>
    </div>
  </Modal>
);

/* ============================================================
 * SPOTLIGHT MODAL
 * ============================================================ */

const SPOTLIGHT_OUTCOMES = [
  "Your gambit catches Pip mid-count. He drops two coppers. 'Fine. Ash Hollow. Now go away.'",
  "The goblin's eyes dart to his strongbox. He shifts it behind him. You've rattled him.",
  "Pip laughs — a sharp, suspicious bark — then covers his mouth and glances away. You've found a thread.",
];

const Spotlight = ({ onClose, onCommit, tokensLeft }) => {
  const [text, setText] = useState_('');
  const remaining = 120 - text.length;
  const valid = text.trim().length >= 6;
  return (
    <Modal title={`Spotlight Token · ${tokensLeft} of 2`} onClose={onClose}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className={`btn-primary ${valid?'':'disabled'}`}
            disabled={!valid}
            onClick={()=>{ if (valid) { onCommit(text); }}}
          >Commit ✦</button>
        </>
      }
    >
      <div style={{
        fontFamily:'EB Garamond', fontStyle:'italic', fontSize:13,
        color:'#C9B888', lineHeight:1.45, marginBottom:10
      }}>
        Bend the story. Describe one improvised action — the outcome will weave it in.
        Keep it brief and specific.
      </div>
      <textarea
        className="spot-input"
        value={text}
        onChange={e=> setText(e.target.value.slice(0,120))}
        placeholder="I notice the merchant glance at his strongbox and offer to buy his quietest mug…"
        autoFocus
      />
      <div style={{
        display:'flex', justifyContent:'space-between', marginTop:6,
        fontFamily:'Inter', fontSize:10, color:'#7a6a44'
      }}>
        <span>Tokens left after use: {Math.max(0, tokensLeft - 1)}</span>
        <span>{remaining} chars</span>
      </div>

      <div style={{
        marginTop:14, padding:10, borderRadius:5,
        border:'1px dashed rgba(232,199,96,0.25)', background:'rgba(232,199,96,0.04)'
      }}>
        <div style={{
          fontFamily:'Cinzel', fontSize:9, letterSpacing:'0.16em', color:'#7a6a44',
          textTransform:'uppercase', marginBottom:6
        }}>Suggestions</div>
        {[
          'I drop a single gold coin — louder than necessary.',
          'I ask Pip about his oldest piece of jewelry.',
          'I quietly hum a tavern song his kind would know.',
        ].map(s=>(
          <div key={s}
            onClick={()=> setText(s)}
            style={{
              fontFamily:'EB Garamond', fontStyle:'italic', fontSize:12,
              color:'#A99668', padding:'4px 0', cursor:'pointer',
              borderBottom:'1px dotted rgba(232,199,96,0.12)'
            }}
          >› {s}</div>
        ))}
      </div>
    </Modal>
  );
};

/* ============================================================
 * NOTIFICATIONS DRAWER
 * ============================================================ */

const Notifications = ({ onClose }) => (
  <Modal title="Tidings" onClose={onClose}
    footer={<button className="btn-secondary" onClick={onClose}>Close</button>}
  >
    <div className="notif-list" style={{margin:'-14px'}}>
      <div className="notif new">
        <div className="glyph">✦</div>
        <div className="body">
          <div className="ti">Bram dropped an item for you</div>
          <div className="sub">A Healing Salve waits in your pack — "Stay sharp, friend."</div>
        </div>
        <div className="when">2m</div>
      </div>
      <div className="notif new">
        <div className="glyph">⌬</div>
        <div className="body">
          <div className="ti">Yanni resumed The Dragon of Ash Hollow</div>
          <div className="sub">Scene 1 awaits a third hand. Drop in any time.</div>
        </div>
        <div className="when">12m</div>
      </div>
      <div className="notif">
        <div className="glyph">⚔</div>
        <div className="body">
          <div className="ti">A village fell to the dragon</div>
          <div className="sub">Greenholt was lost overnight. The world advances even when you sleep.</div>
        </div>
        <div className="when">2d</div>
      </div>
      <div className="notif">
        <div className="glyph">★</div>
        <div className="body">
          <div className="ti">You earned 50 XP</div>
          <div className="sub">Persuaded Pip Bramblebottom in Thornwick.</div>
        </div>
        <div className="when">2d</div>
      </div>
    </div>
  </Modal>
);

/* ============================================================
 * PROFILE / CHARACTER SHEET
 * ============================================================ */

const Profile = ({ onClose, xp, spotlightTokens }) => (
  <Modal title="Character Sheet" onClose={onClose}
    footer={
      <>
        <button className="btn-secondary" onClick={onClose}>Close</button>
        <button className="btn-primary">Edit</button>
      </>
    }
  >
    <div style={{display:'flex', gap:12, alignItems:'center'}}>
      <div style={{
        width:56, height:56, borderRadius:'50%',
        background:'linear-gradient(180deg,#B68CF0,#4A1F8A)',
        border:'2px solid #E8C760',
        display:'flex', alignItems:'center', justifyContent:'center',
        fontFamily:'Cinzel', fontSize:22, fontWeight:700, color:'#FFEFCB'
      }}>Y</div>
      <div style={{flex:1}}>
        <div style={{fontFamily:'Cinzel', fontSize:16, color:'#FFE9A8', letterSpacing:'0.04em'}}>Yanni</div>
        <div style={{fontFamily:'EB Garamond', fontStyle:'italic', fontSize:12, color:'#A99668'}}>
          Wizard · Level 3 · {xp} / 300 XP
        </div>
        <div className="pbar" style={{marginTop:6, height:5}}>
          <div style={{width:`${Math.min(100,(xp/300)*100)}%`}}/>
        </div>
      </div>
    </div>

    <div style={{
      fontFamily:'Cinzel', fontSize:10, letterSpacing:'0.16em',
      color:'#7a6a44', textTransform:'uppercase', margin:'16px 0 4px'
    }}>Traits</div>
    <div className="stat-row" style={{padding:0}}>
      <div className="sc int"><div className="l">INT</div><div className="v">+3</div></div>
      <div className="sc ath"><div className="l">ATH</div><div className="v">+1</div></div>
      <div className="sc ing"><div className="l">ING</div><div className="v">+2</div></div>
      <div className="sc cha"><div className="l">CHA</div><div className="v">+3</div></div>
    </div>

    <div style={{
      fontFamily:'Cinzel', fontSize:10, letterSpacing:'0.16em',
      color:'#7a6a44', textTransform:'uppercase', margin:'16px 0 8px'
    }}>Vitals</div>
    <div style={{
      display:'flex', gap:10, padding:'10px',
      background:'rgba(232,199,96,0.05)', borderRadius:5,
      border:'1px solid rgba(232,199,96,0.18)'
    }}>
      <Stat label="HP" value="8 / 10" color="#F87171"/>
      <Stat label="AC" value="13" color="#A99668"/>
      <Stat label="✦ Tokens" value={`${spotlightTokens} / 2`} color="#E8C760"/>
    </div>

    <div style={{
      fontFamily:'Cinzel', fontSize:10, letterSpacing:'0.16em',
      color:'#7a6a44', textTransform:'uppercase', margin:'16px 0 6px'
    }}>Active Campaigns</div>
    <div style={{
      padding:'10px 12px', borderLeft:'3px solid #E8C760',
      background:'rgba(232,199,96,0.04)', borderRadius:'0 5px 5px 0'
    }}>
      <div style={{fontFamily:'Cinzel', fontSize:13, color:'#FFE9A8'}}>The Dragon of Ash Hollow</div>
      <div style={{fontFamily:'EB Garamond', fontStyle:'italic', fontSize:12, color:'#A99668', marginTop:2}}>
        Scene 1 of 3 · with Bram & 2 open seats
      </div>
    </div>
  </Modal>
);

const Stat = ({label, value, color}) => (
  <div style={{flex:1, textAlign:'center'}}>
    <div style={{fontFamily:'Cinzel', fontSize:9, letterSpacing:'0.14em', color:'#7a6a44', textTransform:'uppercase'}}>{label}</div>
    <div style={{fontFamily:'Inter', fontSize:14, fontWeight:700, color, marginTop:2}}>{value}</div>
  </div>
);

/* ============================================================
 * V2 STUB
 * ============================================================ */

const V2Stub = ({ onClose }) => (
  <Modal title="Scene 2 · Bandit Ambush" onClose={onClose}
    footer={
      <>
        <button className="btn-secondary" onClick={onClose}>Back to Lobby</button>
        <button className="btn-primary disabled" disabled>Begin Scene</button>
      </>
    }
  >
    <div className="v2-stub">
      <div className="badge">Coming in V2</div>
      <h3>Bandits on the Northern Road</h3>
      <p>
        After Pip's tip, the party rides toward Ash Hollow and finds the road crawling
        with deserters from a fallen village. This scene is queued — combat,
        AI-generated NPCs, and real multiplayer turns arrive in V2.
      </p>
    </div>
    <div style={{
      marginTop:14, padding:'10px 12px', borderRadius:5,
      background:'rgba(110,231,183,0.06)', border:'1px solid rgba(110,231,183,0.3)',
    }}>
      <div style={{fontFamily:'Cinzel', fontSize:9, letterSpacing:'0.16em', color:'#6EE7B7', textTransform:'uppercase'}}>
        Prototype Loop Complete
      </div>
      <div style={{fontFamily:'EB Garamond', fontStyle:'italic', fontSize:12, color:'#A99668', marginTop:4, lineHeight:1.4}}>
        You've validated drop-in → scene → reward → leave → rejoin. The core loop works.
      </div>
    </div>
  </Modal>
);

/* ============================================================
 * OUTER SHELL — screen router + overlay manager + persistence
 * ============================================================ */

function OuterShell() {
  // Load persisted state
  const persisted = loadState();

  const [screen, setScreen] = useState_(persisted?.screen === 'lobby' ? 'lobby' : 'lobby');
  const [overlay, setOverlay] = useState_(null);
  const [showDropIn, setShowDropIn] = useState_(false);
  const [completed, setCompleted] = useState_(persisted?.completed ?? false);
  const [xp, setXp] = useState_(persisted?.xp ?? 240);
  const [hasSalve, setHasSalve] = useState_(persisted?.hasSalve ?? false);
  const [spotlightTokens, setSpotlightTokens] = useState_(persisted?.spotlightTokens ?? 2);
  const [toast, setToast] = useState_(null);

  // Persist on every relevant state change
  useEffect_(()=>{
    saveState({ completed, xp, hasSalve, spotlightTokens });
  }, [completed, xp, hasSalve, spotlightTokens]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(()=> setToast(null), 2400);
  };

  // Listen for events bubbled from SceneApp
  useEffect_(()=>{
    const handler = (e)=>{
      const t = e.detail?.type;
      if (t === 'open-inventory')      setOverlay('inventory');
      else if (t === 'open-help')      setOverlay('help');
      else if (t === 'open-leave')     setOverlay('leave');
      else if (t === 'open-npc')       setOverlay('npc');
      else if (t === 'open-spotlight') setOverlay('spotlight');
      else if (t === 'open-profile')   setOverlay('profile');
      else if (t === 'open-notifs')    setOverlay('notifs');
      else if (t === 'scene-complete') {
        const newXp = xp + 50;
        setXp(newXp);
        setHasSalve(true);
        setCompleted(true);
        // Restore spotlight tokens on scene complete
        setSpotlightTokens(2);
        showToast('+50 XP · Healing Salve gained');
      }
    };
    window.addEventListener('sfq-event', handler);
    return ()=> window.removeEventListener('sfq-event', handler);
  }, [xp]);

  const enterRoom = useCallback_(()=>{
    if (completed) { setOverlay('v2'); return; }
    setScreen('previously');
  }, [completed]);

  const finishPreviously = useCallback_(()=>{
    setScreen('room');
    setShowDropIn(true);
    setTimeout(()=> setShowDropIn(false), 4500);
  }, []);

  const onLeaveConfirmed = useCallback_(()=>{
    setOverlay(null);
    setScreen('lobby');
    showToast('You step away. The road calls.');
  }, []);

  const onSpotlightCommit = useCallback_((text)=>{
    setOverlay(null);
    setSpotlightTokens(t => Math.max(0, t - 1));
    // Pick a random hardcoded outcome
    const outcomes = [
      "Your gambit catches Pip mid-count. He drops two coppers. 'Fine. Ash Hollow. Now go away.'",
      "The goblin's eyes dart to his strongbox. He shifts it behind him. You've rattled him.",
      "Pip laughs — a sharp, suspicious bark — then covers his mouth and glances away. You've found a thread.",
    ];
    const result = outcomes[Math.floor(Math.random() * outcomes.length)];
    showToast('Spotlight: ' + result.slice(0, 40) + '…');
  }, []);

  return (
    <>
      {screen === 'lobby' && (
        <Lobby
          onEnterRoom={enterRoom}
          onOpenProfile={()=> setOverlay('profile')}
          onOpenNotifs={()=> setOverlay('notifs')}
          completed={completed}
          xp={xp}
        />
      )}

      {screen === 'previously' && (
        <>
          <div style={{position:'absolute', inset:0, opacity:0.3, filter:'blur(2px)'}}>
            <SceneApp spotlightTokens={spotlightTokens} xp={xp} hp={8}/>
          </div>
          <PreviouslyOn onContinue={finishPreviously} completed={completed}/>
        </>
      )}

      {screen === 'room' && (
        <>
          <SceneApp spotlightTokens={spotlightTokens} xp={xp} hp={8}/>
          {showDropIn && <DropInBanner onClose={()=> setShowDropIn(false)}/>}
        </>
      )}

      {/* Overlays */}
      {overlay === 'inventory'  && <Inventory onClose={()=> setOverlay(null)} hasSalve={hasSalve}/>}
      {overlay === 'help'       && <Help onClose={()=> setOverlay(null)}/>}
      {overlay === 'leave'      && <LeaveConfirm onCancel={()=> setOverlay(null)} onConfirm={onLeaveConfirmed}/>}
      {overlay === 'npc'        && <NPCDetail onClose={()=> setOverlay(null)}/>}
      {overlay === 'spotlight'  && (
        <Spotlight
          onClose={()=> setOverlay(null)}
          onCommit={onSpotlightCommit}
          tokensLeft={spotlightTokens}
        />
      )}
      {overlay === 'profile'    && <Profile onClose={()=> setOverlay(null)} xp={xp} spotlightTokens={spotlightTokens}/>}
      {overlay === 'notifs'     && <Notifications onClose={()=> setOverlay(null)}/>}
      {overlay === 'v2'         && <V2Stub onClose={()=>{ setOverlay(null); setScreen('lobby'); }}/>}

      {toast && <div className="toast">{toast}</div>}
    </>
  );
}

ReactDOM.createRoot(document.getElementById('stage')).render(<OuterShell/>);
