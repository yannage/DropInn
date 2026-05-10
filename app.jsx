/* Stick Figure Quest — main app.
 * One-scene hi-fi prototype built around the drag-to-commit hero gesture.
 */

const { useState, useEffect, useRef, useCallback, useMemo } = React;

/* ========== CONSTANTS ========== */

const PLAYERS = [
  { id:'yanni', name:'Yanni', sealColor:'purple', sealIcon: window.SealStar   },
  { id:'bram',  name:'Bram',  sealColor:'green',  sealIcon: window.SealSwords },
  { id:'aria',  name:'Aria',  sealColor:'red',    sealIcon: window.SealHeart  },
];

/* envelope on-table positions (% of table area) */
const SLOT_POS = {
  yanni: { left:'10%',  top:'8%',  rot:'-8deg' },
  bram : { left:'34%',  top:'-2%', rot:'2deg'  },
  aria : { left:'60%',  top:'8%',  rot:'8deg'  },
};

const ACTIONS = [
  { id:'persuade',   label:'Persuade',   coinColor:'persuade',   Coin: window.PersuadeCoin,   trait:'CHA', dc:12 },
  { id:'intimidate', label:'Intimidate', coinColor:'intimidate', Coin: window.IntimidateCoin, trait:'ATH', dc:14 },
  { id:'examine',    label:'Examine',    coinColor:'examine',    Coin: window.ExamineCoin,    trait:'INT', dc:10 },
  { id:'move',       label:'Move',       coinColor:'move',       Coin: window.MoveCoin,       trait:'ATH', dc:8  },
];

const BOT_PLAYS = {
  bram : { actionId:'intimidate', label:'Intimidate Gremlin' },
  aria : { actionId:'examine',    label:'Examine wares'      },
};

/* Yanni's base traits (used for resolution roll) */
const YANNI_TRAITS = { INT: 3, ATH: 1, ING: 2, CHA: 3 };

/* ========== RESOLUTION ENGINE ========== */

function rollD20() {
  return Math.floor(Math.random() * 20) + 1;
}

/* Returns { roll, mod, total, success, narrative } */
function resolveAction(actionId) {
  const action = ACTIONS.find(a => a.id === actionId);
  if (!action) return null;

  if (actionId === 'move') {
    return {
      roll: 20, mod: 0, total: 20, success: true,
      narrative: OUTCOMES.move.success,
    };
  }

  const roll = rollD20();
  const mod = YANNI_TRAITS[action.trait] || 0;
  const total = roll + mod;
  const success = total >= action.dc;
  const narrative = success ? OUTCOMES[actionId].success : OUTCOMES[actionId].failure;

  return { roll, mod, total, success, narrative };
}

/* ========== NARRATIVE OUTCOMES (all reference Pip's traits) ========== */

const INTRO_TEXT = "Thornwick Market buzzes nervously. Smoke curls from the northern road as villagers whisper and stare. A wiry gremlin merchant clutches a satchel of trinkets and watches your party closely.";

const OUTCOMES = {
  persuade: {
    success: "The suspicious gremlin pauses his coin-counting — your words cut through his greed like a blade. Pip pockets his coins and leans in. 'The dragon,' he mutters, 'was last seen near Ash Hollow. Don't tell anyone I said that.' He resumes counting immediately.",
    failure:  "Pip's eyes narrow as he tallies another copper. 'Don't know nothin',' he mutters, clearly lying. His shabby coat rustles as he shuffles backward. He keeps counting. You'll need a different approach.",
  },
  intimidate: {
    success: "Bram looms over the stall. The slim goblin's coin-counting stutters — three coppers scatter across the ground. 'Fine, fine! Ash Hollow! Just — don't break anything. The profit margins are already terrible.' He scrabbles after the coins.",
    failure:  "The gremlin barely looks up from his stack. 'Seen bigger,' he says, resuming his count with practiced calm. Bram's threat lands like a wet scroll. Pip clicks another coin into place.",
  },
  examine: {
    success: "Aria spots a crude map half-hidden beneath Pip's weighing scales. The suspicious merchant snatches it back — but not before she notes a red X near Ash Hollow. He pockets a coin, pointedly, and refuses to meet her eyes.",
    failure:  "The wares are a jumble of dubious junk. Whatever Pip knows, he's buried it well under layers of suspicious clutter, coin stacks, and deliberate misdirection.",
  },
  move: {
    success: "The party moves deeper into the market, noting the fearful eyes of the townsfolk. Smoke thickens on the northern road. One path leads toward the tavern; another toward the smell of ash.",
  },
};

/* ========== APP-BAR ========== */

const AppBar = () => (
  <div className="navbar-bg" style={{
    height:54, display:'flex', alignItems:'center', justifyContent:'space-between',
    padding:'0 12px', position:'relative', zIndex:5,
  }}>
    <button style={iconBtnStyle()} onClick={()=>window.dispatchEvent(new CustomEvent('sfq-event',{detail:{type:'open-help'}}))}><HamburgerIcon size={20}/></button>

    <div style={{display:'flex', alignItems:'center', gap:8, flex:1, justifyContent:'center', position:'relative'}}>
      <div style={{position:'absolute', top:-10, left:'50%', transform:'translateX(-50%)'}}>
        <CrownIcon size={16}/>
      </div>
      <SwordIcon size={18}/>
      <div className="heading gold-text" style={{fontSize:17, lineHeight:1, letterSpacing:'0.02em', whiteSpace:'nowrap'}}>
        Stick Figure Quest
      </div>
      <div style={{marginLeft:1}}><StarSparkleIcon size={10}/></div>
    </div>

    <div style={{display:'flex', gap:6}}>
      <button style={iconBtnStyle()} onClick={()=>window.dispatchEvent(new CustomEvent('sfq-event',{detail:{type:'open-notifs'}}))}>
        <BellIcon size={18}/>
        <span style={{
          position:'absolute', top:1, right:1,
          minWidth:14, height:14, borderRadius:7,
          background:'#C53030', color:'#fff', fontSize:9, fontWeight:700,
          display:'flex', alignItems:'center', justifyContent:'center',
          border:'1.5px solid #0F1B2D',
          fontFamily:'Inter',
        }}>2</span>
      </button>
      <button style={iconBtnStyle()} onClick={()=>window.dispatchEvent(new CustomEvent('sfq-event',{detail:{type:'open-profile'}}))}><FriendsIcon size={18}/></button>
    </div>
  </div>
);

const iconBtnStyle = () => ({
  position:'relative', width:36, height:36, borderRadius:8,
  background:'linear-gradient(180deg,#1B2C4A,#0E1A30)',
  border:'1px solid rgba(232,199,96,0.25)',
  display:'flex', alignItems:'center', justifyContent:'center',
  cursor:'pointer', padding:0,
  boxShadow:'inset 0 1px 0 rgba(255,255,255,0.06), 0 1px 2px rgba(0,0,0,0.6)',
});

/* ========== SCENE HEADER ========== */

const SceneHeader = ({turn, razed=1, total=5}) => (
  <div style={{
    position:'relative',
    background:'linear-gradient(180deg,#1F3160 0%, #182747 100%)',
    border:'1px solid rgba(232,199,96,0.35)',
    borderLeft:'none', borderRight:'none',
    height:78, display:'flex', alignItems:'center',
    paddingLeft:8, paddingRight:8, gap:8,
    boxShadow:'inset 0 1px 0 rgba(255,255,255,0.06), 0 2px 0 rgba(0,0,0,0.4)',
    zIndex:4,
  }}>
    <div style={{flexShrink:0, marginTop:-2}}><ShieldEmblem size={42}/></div>
    <div style={{display:'flex', flexDirection:'column', gap:2}}>
      <div className="heading gold-text" style={{fontSize:15, letterSpacing:'0.06em', lineHeight:1.1}}>
        Thornwick<br/>Market
      </div>
      {/* NPC button */}
      <button
        onClick={()=>window.dispatchEvent(new CustomEvent('sfq-event',{detail:{type:'open-npc'}}))}
        style={{
          background:'rgba(232,199,96,0.1)', border:'1px solid rgba(232,199,96,0.3)',
          borderRadius:4, padding:'2px 6px', cursor:'pointer',
          fontFamily:'EB Garamond', fontStyle:'italic', fontSize:11, color:'#C9B888',
          display:'flex', alignItems:'center', gap:4,
        }}
      >
        <span style={{fontSize:10}}>👤</span> Pip
      </button>
    </div>

    {/* center turn badge */}
    <div style={{position:'absolute', top:-6, left:'50%', transform:'translateX(-50%)', filter:'drop-shadow(0 4px 6px rgba(0,0,0,0.6))'}}>
      <TurnBadgeShield turn={turn} size={62}/>
    </div>

    <div style={{flex:1}}/>

    <div style={{display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4, paddingRight:4}}>
      <div style={{display:'flex', alignItems:'center', gap:6}}>
        <DragonHead size={28}/>
        <div className="ui-num" style={{fontSize:11, color:'#E8D9B4', letterSpacing:'0.04em'}}>
          Villages razed: <span style={{color:'#FFE9A8'}}>{razed} / {total}</span>
        </div>
      </div>
      {/* segmented bar */}
      <div style={{display:'flex', gap:3, height:8, width:120}}>
        {Array.from({length: total}).map((_, i)=>(
          <div key={i} style={{
            flex:1,
            background: i < razed
              ? 'linear-gradient(180deg,#F36A6A,#7E1A1A)'
              : 'linear-gradient(180deg,#1F0808,#0a0303)',
            borderRadius:2,
            border:'1px solid rgba(0,0,0,0.6)',
            boxShadow: i < razed ? 'inset 0 1px 0 rgba(255,200,200,0.4)' : 'none',
          }}/>
        ))}
      </div>
    </div>
  </div>
);

/* ========== STORY SCROLL ========== */

const StoryScroll = ({text, refreshKey, rollResult}) => {
  const lines = useMemo(()=> text.split(/(?<=\.)\s+/).filter(Boolean), [text]);
  return (
    <div style={{
      position:'relative', padding:'8px 4px 12px',
      display:'flex', alignItems:'stretch',
      filter:'drop-shadow(0 6px 12px rgba(0,0,0,0.5))',
    }}>
      <div style={{flexShrink:0, alignSelf:'center'}}>
        <ScrollRod side="left" height={148}/>
      </div>

      <div style={{
        flex:1, position:'relative',
        background:'linear-gradient(180deg, #F2E3BE 0%, #E8D9B4 50%, #C9B888 100%)',
        backgroundImage:'radial-gradient(ellipse at 20% 30%, rgba(160,130,80,0.22) 0 30%, transparent 60%), radial-gradient(ellipse at 80% 70%, rgba(160,130,80,0.18) 0 30%, transparent 60%), linear-gradient(180deg, #F2E3BE 0%, #E8D9B4 50%, #C9B888 100%)',
        boxShadow:'inset 0 0 30px rgba(120,90,40,0.35), inset 0 2px 4px rgba(160,130,80,0.25)',
        borderTop:'1px solid #B8A66A',
        borderBottom:'1px solid #B8A66A',
        padding:'14px 18px 14px 12px',
        marginLeft:-4, marginRight:-4,
        overflow:'hidden',
      }}>
        {/* castle watermark */}
        <div style={{position:'absolute', right:4, bottom:0, pointerEvents:'none'}}>
          <CastleWatermark width={120} height={104} opacity={0.22}/>
        </div>

        <div key={refreshKey} className="body-serif" style={{
          fontSize:14.5, lineHeight:1.45, color:'#1F1408', position:'relative', maxWidth:'80%',
        }}>
          {lines.map((line, i)=>(
            <div key={i} style={{
              animation:`textRise 0.5s ease-out ${i*0.08}s both`,
              marginBottom: 2,
            }}>{line}</div>
          ))}
        </div>

        {/* roll result badge */}
        {rollResult && (
          <div style={{
            position:'absolute', bottom:8, left:10,
            background: rollResult.success
              ? 'linear-gradient(180deg,#22863a,#0c4a1a)'
              : 'linear-gradient(180deg,#7E1A1A,#3A0606)',
            border:`1px solid ${rollResult.success ? '#6EE7B7' : '#F87171'}`,
            borderRadius:4, padding:'3px 8px',
            fontFamily:'Cinzel', fontSize:9, letterSpacing:'0.12em',
            color: rollResult.success ? '#6EE7B7' : '#F87171',
            animation:'textRise 0.4s ease both',
          }}>
            d20+{rollResult.mod} = {rollResult.total} {rollResult.success ? '✓' : '✗'} ({rollResult.trait} {rollResult.dc})
          </div>
        )}

        {/* book button */}
        <button
          onClick={()=>window.dispatchEvent(new CustomEvent('sfq-event',{detail:{type:'open-npc'}}))}
          style={{
            position:'absolute', bottom:8, right:8,
            width:34, height:34, borderRadius:'50%',
            background:'linear-gradient(180deg,#1F3160,#0E1A30)',
            border:'2px solid #E8C760',
            display:'flex', alignItems:'center', justifyContent:'center',
            cursor:'pointer', padding:0,
            boxShadow:'0 2px 4px rgba(0,0,0,0.5)',
          }}>
          <BookIcon size={18}/>
        </button>
      </div>

      <div style={{flexShrink:0, alignSelf:'center'}}>
        <ScrollRod side="right" height={148}/>
      </div>
    </div>
  );
};

/* ========== SHARED TABLE ========== */

const SharedTable = ({
  envelopes, dropZoneActive, dropZoneHot, revealed, onTableMount, dropZoneRef,
}) => {
  return (
    <div className="cobblestones" style={{
      position:'relative', height:240, padding:'8px 8px 0',
      borderTop:'1px solid rgba(0,0,0,0.5)',
      borderBottom:'1px solid rgba(0,0,0,0.5)',
    }}>
      {/* Round wood table */}
      <div ref={onTableMount} className="wood" style={{
        position:'absolute', left:'50%', top:'50%',
        transform:'translate(-50%, -50%)',
        width:'92%', height:200,
        borderRadius:'50%',
        boxShadow:'0 12px 24px rgba(0,0,0,0.6), inset 0 -8px 14px rgba(0,0,0,0.4), inset 0 4px 8px rgba(255,210,150,0.1)',
        border:'4px solid #3A2414',
      }}>
        {/* table edge highlight */}
        <div style={{
          position:'absolute', inset:6, borderRadius:'50%',
          border:'1.5px solid rgba(255,210,150,0.18)',
          pointerEvents:'none',
        }}/>

        {/* envelopes */}
        {PLAYERS.map((p)=>{
          const env = envelopes[p.id];
          if (!env) return null;
          const slot = SLOT_POS[p.id];
          return (
            <div key={p.id} style={{
              position:'absolute',
              left: slot.left, top: slot.top,
              transform:`rotate(${slot.rot})`,
              ['--rot']: slot.rot,
              animation: env.appearing ? 'envelopeIn 0.6s cubic-bezier(.34,1.56,.64,1) both' : 'none',
              filter:'drop-shadow(0 4px 6px rgba(0,0,0,0.55))',
              transformStyle:'preserve-3d',
              transition:'transform 0.4s',
            }}>
              {/* flip wrapper */}
              <div style={{
                transformStyle:'preserve-3d',
                transition:'transform 0.5s ease-out',
                transform: env.revealed ? 'rotateY(180deg)' : 'rotateY(0deg)',
                position:'relative', width:104, height:74,
              }}>
                {/* face down */}
                <div style={{ position:'absolute', inset:0, backfaceVisibility:'hidden' }}>
                  <Envelope width={104} height={74} name={p.name}
                    sealColor={p.sealColor} sealIcon={p.sealIcon}
                    broken={false}/>
                </div>
                {/* face up */}
                <div style={{
                  position:'absolute', inset:0, backfaceVisibility:'hidden',
                  transform:'rotateY(180deg)'}}>
                  <Envelope width={104} height={74}
                    name={p.name}
                    action={env.actionLabel}
                    revealed={true}
                    sealColor={p.sealColor} sealIcon={p.sealIcon} broken={true}/>
                </div>
              </div>
              {/* seal stamp flash */}
              {env.sealFlash && (
                <div style={{
                  position:'absolute', left:'50%', top:'50%',
                  transform:'translate(-50%,-50%)',
                  width:46, height:46, borderRadius:'50%',
                  animation:'goldFlash 0.6s ease-out',
                  pointerEvents:'none',
                }}/>
              )}
            </div>
          );
        })}

        {/* Drop zone */}
        <div ref={dropZoneRef} style={{
          position:'absolute', left:'50%', bottom:'18%',
          transform:'translate(-50%, 0)',
          width:88, height:88,
          opacity: revealed ? 0 : 1,
          transition:'opacity 0.4s',
          pointerEvents:'none',
        }}>
          <div className={dropZoneHot ? 'dz-fast' : 'dz-breathe'} style={{
            position:'absolute', inset:0,
            borderRadius:'50%',
            border:'2.5px dashed rgba(255,221,120,0.9)',
            background:'radial-gradient(circle, rgba(255,221,120,0.18), transparent 70%)',
          }}>
            <div style={{
              position:'absolute', left:'50%', top:'50%', transform:'translate(-50%,-50%)'
            }}>
              <CrossedSwords size={56}/>
            </div>
          </div>
          {/* sparkles */}
          {dropZoneHot && (
            <>
              {[0,1,2,3,4,5].map(i=>(
                <div key={i} style={{
                  position:'absolute', left:'50%', top:'50%',
                  width:4, height:4, borderRadius:'50%',
                  background:'#FFE9A8',
                  boxShadow:'0 0 6px #FFE9A8',
                  ['--sx']: `${Math.cos(i*Math.PI/3)*30}px`,
                  ['--sy']: `${Math.sin(i*Math.PI/3)*30}px`,
                  ['--dx']: `${Math.cos(i*Math.PI/3)*20}px`,
                  ['--dy']: `${Math.sin(i*Math.PI/3)*20}px`,
                  animation:`sparkleFade 0.7s ease-out ${i*0.05}s infinite`,
                }}/>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

/* ========== ACTION TRAY (with ref on persuade coin) ========== */

const ActionTrayWithRef = ({coinRef, onPointerDown, onTapAction, draggingActionId, hiddenActionId, timer, phase}) => {
  const Phase = { Player:'player' };
  const isPlayerPhase = phase === 'player';
  return (
    <div className="panel-bg" style={{
      position:'relative', display:'flex', alignItems:'center',
      gap:6, padding:'14px 8px 18px',
      borderTop:'1px solid rgba(232,199,96,0.25)',
    }}>
      <CornerOrnament style={{top:4, left:4}}/>
      <CornerOrnament style={{top:4, right:4, transform:'scaleX(-1)'}}/>

      {ACTIONS.map((a, i)=>{
        const hidden = hiddenActionId === a.id;
        const isDragging = draggingActionId === a.id;
        return (
          <div key={a.id} style={{
            flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4,
            visibility: hidden ? 'hidden' : 'visible',
          }}>
            <div
              ref={a.id === 'persuade' ? coinRef : null}
              onPointerDown={(e)=> onPointerDown(e, a)}
              onClick={()=> isPlayerPhase && !isDragging && onTapAction(a)}
              className={(a.id === 'persuade') ? 'coin-glow idle-bob' : 'idle-bob'}
              style={{
                width:62, height:62, borderRadius:'50%',
                cursor: isPlayerPhase ? 'grab' : 'default',
                position:'relative', touchAction:'none',
                animationDelay: `${i*0.2}s`,
                opacity: isDragging ? 0.25 : (!isPlayerPhase ? 0.5 : 1),
                transition:'opacity 0.15s',
              }}>
              <a.Coin size={62}/>
            </div>
            <div className="heading gold-text" style={{fontSize:11, marginTop:2}}>
              {a.label}
            </div>
          </div>
        );
      })}

      <div style={{
        width:72, padding:'6px 4px',
        marginLeft:4, marginRight:2,
        display:'flex', alignItems:'center', gap:2,
        flexDirection:'column',
        background:'linear-gradient(180deg,rgba(0,0,0,0.35),rgba(0,0,0,0.15))',
        borderRadius:6,
        border:'1px solid rgba(232,199,96,0.25)',
      }}>
        <div style={{display:'flex', alignItems:'center', gap:4}}>
          <HourglassIcon size={26}/>
          <div className="ui-num gold-text" style={{
            fontSize:18, lineHeight:1,
            color: timer <= 5 ? '#F87171' : undefined,
          }}>{timer}s</div>
        </div>
        <div className="heading" style={{fontSize:9, color:'#C9B888', marginTop:-2, letterSpacing:'0.06em'}}>left</div>
      </div>
    </div>
  );
};

const CornerOrnament = ({style}) => (
  <svg width="18" height="18" viewBox="0 0 18 18" style={{position:'absolute', ...style}}>
    <path d="M2 2 L8 2 L7 4 L4 4 L4 7 L2 8 Z" fill="url(#goldGrad)" opacity="0.6"/>
    <circle cx="3" cy="3" r="1.2" fill="#FFE9A8"/>
  </svg>
);

/* ========== SPOTLIGHT ROW ========== */

const SpotlightRow = ({tokensLeft}) => (
  <div className="panel-bg" style={{
    display:'flex', alignItems:'center', justifyContent:'center', gap:36,
    padding:'8px 12px', borderTop:'1px solid rgba(232,199,96,0.18)',
  }}>
    {[0,1].map(i=>{
      const used = i >= tokensLeft;
      return (
        <div key={i}
          onClick={()=> {
            if (!used) window.dispatchEvent(new CustomEvent('sfq-event',{detail:{type:'open-spotlight'}}));
          }}
          style={{
            display:'flex', alignItems:'center', gap:8, position:'relative',
            cursor: used ? 'default' : 'pointer',
            opacity: used ? 0.35 : 1,
            transition:'opacity 0.3s',
          }}>
          <div style={{filter: used ? 'none' : 'drop-shadow(0 0 10px rgba(255,221,120,0.5))'}}>
            <SpotlightCoin size={32}/>
          </div>
          <div className="heading gold-text" style={{fontSize:12, letterSpacing:'0.1em'}}>SPOTLIGHT</div>
          {i===0 && !used && <div style={{position:'absolute', right:-14, top:-2}}><StarSparkleIcon size={10}/></div>}
        </div>
      );
    })}
  </div>
);

/* ========== PLAYER CARD ========== */

const PlayerCard = ({hp=8, maxHp=10, xp=240}) => (
  <div style={{
    display:'flex', alignItems:'center', gap:10,
    padding:'10px 8px',
    background:'linear-gradient(180deg,#1A2B47,#0F1B2D)',
    borderTop:'2px solid rgba(232,199,96,0.4)',
    minHeight:120,
  }}>
    <div style={{flexShrink:0, filter:'drop-shadow(0 4px 6px rgba(0,0,0,0.5))'}}>
      <WizardAvatar size={86}/>
    </div>
    <div style={{flex:1, minWidth:0, display:'flex', flexDirection:'column', gap:6}}>
      <div style={{display:'flex', alignItems:'baseline', gap:8, flexWrap:'wrap'}}>
        <div className="body-serif" style={{fontSize:24, color:'#FFEFCB', fontWeight:500, letterSpacing:'0.02em'}}>Yanni</div>
        <div className="ui-num" style={{fontSize:10, color:'#A99668'}}>{xp} XP</div>
      </div>
      <div style={{display:'flex', alignItems:'center', gap:5}}>
        <HatGlyph size={14}/>
        <div className="body-serif" style={{fontSize:14, color:'#A78BFA', fontStyle:'italic'}}>Wizard · Lvl 3</div>
      </div>
      {/* HP bar */}
      <div style={{display:'flex', alignItems:'center', gap:6}}>
        <HeartIcon size={16}/>
        <div className="ui-num" style={{fontSize:12, color:'#FFEFCB', minWidth:38}}>{hp} / {maxHp}</div>
        <div style={{
          flex:1, height:10, borderRadius:6,
          background:'linear-gradient(180deg,#0a0a0a,#1a1a1a)',
          border:'1px solid rgba(0,0,0,0.7)',
          boxShadow:'inset 0 1px 2px rgba(0,0,0,0.6)',
          overflow:'hidden', position:'relative',
        }}>
          <div style={{
            width:`${(hp/maxHp)*100}%`, height:'100%',
            background:'linear-gradient(180deg,#86F2A0,#22863a)',
            boxShadow:'inset 0 1px 0 rgba(255,255,255,0.4)',
            position:'relative',
            transition:'width 0.5s ease',
          }}>
            <div style={{
              position:'absolute', top:0, left:0, right:0, height:'40%',
              background:'linear-gradient(180deg,rgba(255,255,255,0.3),transparent)',
            }}/>
          </div>
        </div>
      </div>
      {/* trait chips */}
      <div style={{display:'flex', gap:4, flexWrap:'wrap'}}>
        <Chip label={`INT +${YANNI_TRAITS.INT}`} color="purple"/>
        <Chip label={`ATH +${YANNI_TRAITS.ATH}`} color="green"/>
        <Chip label={`ING +${YANNI_TRAITS.ING}`} color="yellow"/>
        <Chip label={`CHA +${YANNI_TRAITS.CHA}`} color="red"/>
      </div>
    </div>
    {/* right: 3 buttons */}
    <div style={{display:'flex', flexDirection:'column', gap:4, paddingRight:2}}>
      {[
        { icon: <BackpackIcon size={22}/>, label:'INVENTORY', evt:'open-inventory' },
        { icon: <HelpIcon size={22}/>, label:'HELP', evt:'open-help' },
        { icon: <DoorIcon size={22}/>, label:'LEAVE', evt:'open-leave' },
      ].map((b,i)=>(
        <button key={i}
          onClick={()=> window.dispatchEvent(new CustomEvent('sfq-event',{detail:{type:b.evt}}))}
          style={{
          width:54, padding:'2px 0',
          background:'linear-gradient(180deg,#E8D9B4,#A99668)',
          border:'1.5px solid #5C3F09',
          borderRadius:4,
          display:'flex', flexDirection:'column', alignItems:'center', gap:0,
          cursor:'pointer',
          boxShadow:'0 1px 2px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.4)',
        }}>
          {b.icon}
          <div className="heading" style={{fontSize:7, color:'#3A2410', letterSpacing:'0.06em'}}>{b.label}</div>
        </button>
      ))}
    </div>
  </div>
);

const Chip = ({label, color}) => {
  const map = {
    purple: { bg:'#A78BFA', border:'#5b3ec9', text:'#1F0E4A'},
    green:  { bg:'#6EE7B7', border:'#1f8f3a', text:'#0c4a1a'},
    yellow: { bg:'#FCD34D', border:'#B8902E', text:'#5C3F09'},
    red:    { bg:'#F87171', border:'#7E1A1A', text:'#3A0606'},
  };
  const c = map[color];
  return (
    <div className="ui-num" style={{
      padding:'2px 8px', borderRadius:4,
      background: c.bg, color: c.text,
      border:`1px solid ${c.border}`,
      fontSize:11, letterSpacing:'0.04em',
      boxShadow:'inset 0 1px 0 rgba(255,255,255,0.4), 0 1px 1px rgba(0,0,0,0.4)',
    }}>{label}</div>
  );
};

/* ========== DRAG-LAYER (floating coin + trail) ========== */

const DragLayer = ({drag}) => {
  if (!drag) return null;
  const { Coin, x, y, trail } = drag;
  return (
    <>
      {/* particle trail behind */}
      {trail.map((t)=>(
        <div key={t.id} style={{
          position:'absolute',
          left: t.x - 4, top: t.y - 4,
          width:8, height:8, borderRadius:'50%',
          background:'radial-gradient(circle, #E8DAFA, #8E5BD9 60%, transparent 75%)',
          opacity: t.life,
          transform:`scale(${0.4 + t.life*0.7})`,
          pointerEvents:'none',
          mixBlendMode:'screen',
          zIndex:50,
        }}/>
      ))}
      <div style={{
        position:'absolute',
        left: x - 31, top: y - 31,
        pointerEvents:'none',
        zIndex:60,
        filter:`drop-shadow(0 0 14px rgba(167,139,250,0.9)) drop-shadow(0 8px 16px rgba(0,0,0,0.6))`,
        transform: `scale(${drag.hover ? 1.12 : 1.05})`,
        transition:'transform 0.12s',
      }}>
        <Coin size={62}/>
      </div>
    </>
  );
};

/* ========== INTRO HAND CURSOR HINT ========== */

const IntroHint = ({visible, originX, originY}) => {
  if (!visible || originX == null) return null;
  return (
    <div style={{
      position:'absolute', left:originX-2, top:originY-4,
      pointerEvents:'none',
      animation:'idleBob 1.2s ease-in-out infinite',
      zIndex:55,
    }}>
      <HandCursor size={32}/>
    </div>
  );
};

/* ========== REWARD CARD ========== */

const RewardCard = ({onContinue, dismissing, rollResult}) => (
  <div style={{
    position:'absolute', left:0, right:0, bottom:0, zIndex:80,
    padding:'12px 14px 18px',
    background:'linear-gradient(180deg, #1F3160 0%, #0E1A30 100%)',
    borderTop:'2px solid #E8C760',
    boxShadow:'0 -10px 24px rgba(0,0,0,0.7)',
    animation: dismissing
      ? 'cardOut 0.45s ease-in forwards'
      : 'rewardSlideUp 0.6s cubic-bezier(.34,1.56,.64,1) both',
  }}>
    <div style={{display:'flex', alignItems:'center', gap:10}}>
      <div style={{filter:'drop-shadow(0 0 12px rgba(255,221,120,0.7))'}}>
        <SpotlightCoin size={48}/>
      </div>
      <div style={{flex:1}}>
        <div className="heading gold-text" style={{fontSize:14, letterSpacing:'0.1em'}}>SCENE COMPLETE</div>
        <div className="body-serif" style={{fontSize:14, color:'#FFEFCB', marginTop:3}}>
          <span className="ui-num" style={{color:'#FFE9A8'}}>+50 XP</span>. Bram found a <span style={{color:'#6EE7B7'}}>Healing Salve</span>.
        </div>
        {rollResult && (
          <div className="ui-num" style={{
            fontSize:10, marginTop:4,
            color: rollResult.success ? '#6EE7B7' : '#F87171',
          }}>
            Roll: d20+{rollResult.mod} = {rollResult.total} — {rollResult.success ? 'Success' : 'Partial success'}
          </div>
        )}
      </div>
      <button
        onClick={onContinue}
        className="heading"
        style={{
          padding:'10px 14px',
          background:'linear-gradient(180deg,#E8C760,#8E6A1A)',
          border:'1.5px solid #5C3F09',
          borderRadius:8, color:'#3A2410', fontSize:12, letterSpacing:'0.1em',
          cursor:'pointer',
          boxShadow:'inset 0 1px 0 rgba(255,255,255,0.4), 0 2px 4px rgba(0,0,0,0.6)',
        }}>CONTINUE</button>
    </div>
  </div>
);

/* ========== TAP-CONFIRM POPOVER ========== */

const TapConfirmPopover = ({action, onCancel, onConfirm}) => {
  if (!action) return null;
  return (
    <>
      <div
        onClick={onCancel}
        style={{position:'absolute', inset:0, zIndex:70, background:'rgba(0,0,0,0.5)'}}
      />
      <div style={{
        position:'absolute', left:14, right:14, bottom:'28%',
        zIndex:71,
        background:'linear-gradient(180deg,#1A2B47,#0F1B2D)',
        border:'1.5px solid #E8C760',
        borderRadius:10, padding:'14px',
        boxShadow:'0 14px 30px rgba(0,0,0,0.6)',
        animation:'rewardSlideUp 0.25s ease both',
      }}>
        <div className="heading" style={{fontSize:10, letterSpacing:'0.16em', color:'#7a6a44', marginBottom:8}}>
          CONFIRM ACTION
        </div>
        <div className="body-serif" style={{fontSize:15, color:'#FFE9A8', lineHeight:1.35, marginBottom:12}}>
          Commit <strong style={{fontStyle:'normal', color:'#E8C760'}}>{action.label}</strong> on Pip Bramblebottom?
        </div>
        <div style={{display:'flex', gap:8}}>
          <button className="btn-secondary" onClick={onCancel}
            style={{flex:1, padding:'10px', borderRadius:6, fontFamily:'Cinzel', fontSize:11,
              background:'linear-gradient(180deg,#1B2C4A,#0E1A30)', color:'#E8C760',
              border:'1px solid rgba(232,199,96,0.35)', cursor:'pointer'}}>
            Cancel
          </button>
          <button className="btn-primary" onClick={()=> onConfirm(action)}
            style={{flex:1, padding:'10px', borderRadius:6, fontFamily:'Cinzel', fontSize:11,
              background:'linear-gradient(180deg,#E8C760,#8E6A1A)', color:'#3A2410',
              border:'1.5px solid #5C3F09', cursor:'pointer',
              boxShadow:'inset 0 1px 0 rgba(255,255,255,0.4)'}}>
            Commit ✦
          </button>
        </div>
        <div style={{
          marginTop:8, fontFamily:'Inter', fontSize:9, color:'#5C3F09', textAlign:'center'
        }}>Tip: drag the coin onto the table for the same effect.</div>
      </div>
    </>
  );
};

/* ========== MAIN APP ========== */

const Phase = {
  Idle:    'idle',
  Bots:    'bots',
  Player:  'player',
  Reveal:  'reveal',
  Resolve: 'resolve',
  Reward:  'reward',
};

function App({spotlightTokens, xp, hp}) {
  const [phase, setPhase] = useState(Phase.Idle);
  const [turn, setTurn] = useState(1);
  const [storyText, setStoryText] = useState(INTRO_TEXT);
  const [storyKey, setStoryKey] = useState(0);
  const [timer, setTimer] = useState(30);

  const [envelopes, setEnvelopes] = useState({});
  const [hiddenAction, setHiddenAction] = useState(null);
  const [drag, setDrag] = useState(null);
  const [dropZoneHot, setDropZoneHot] = useState(false);
  const [hint, setHint] = useState({visible:false, x:0, y:0});
  const [dismissing, setDismissing] = useState(false);
  const [rollResult, setRollResult] = useState(null);

  // Tap-to-confirm popover state
  const [tapAction, setTapAction] = useState(null);

  const dropZoneRef = useRef(null);
  const tableRef = useRef(null);
  const stageRef = useRef(null);
  const trailIdRef = useRef(0);
  const persuadeCoinRef = useRef(null);

  /* ===== Demo loop driver ===== */
  const startSequence = useCallback(()=>{
    setPhase(Phase.Idle);
    setTurn(t => t);
    setEnvelopes({});
    setHiddenAction(null);
    setStoryText(INTRO_TEXT);
    setStoryKey(k=>k+1);
    setTimer(30);
    setHint({visible:false, x:0, y:0});
    setRollResult(null);
    setTapAction(null);

    // Bot: Bram commits
    setTimeout(()=>{
      setPhase(Phase.Bots);
      setEnvelopes(prev=>({
        ...prev,
        bram:{ appearing:true, sealFlash:true, revealed:false, actionLabel: BOT_PLAYS.bram.label }
      }));
      setTimeout(()=>{
        setEnvelopes(prev=>{
          const e = {...prev};
          if (e.bram) e.bram = {...e.bram, appearing:false, sealFlash:false};
          return e;
        });
      }, 700);
    }, 800);

    // Bot: Aria commits
    setTimeout(()=>{
      setEnvelopes(prev=>({
        ...prev,
        aria:{ appearing:true, sealFlash:true, revealed:false, actionLabel: BOT_PLAYS.aria.label }
      }));
      setTimeout(()=>{
        setEnvelopes(prev=>{
          const e={...prev};
          if (e.aria) e.aria = {...e.aria, appearing:false, sealFlash:false};
          return e;
        });
      }, 700);
    }, 2000);

    // Player's turn — show hand hint over persuade coin
    setTimeout(()=>{
      setPhase(Phase.Player);
      const stage = stageRef.current;
      const coin = persuadeCoinRef.current;
      if (stage && coin){
        const sr = stage.getBoundingClientRect();
        const cr = coin.getBoundingClientRect();
        setHint({visible:true, x: cr.left - sr.left + 22, y: cr.top - sr.top + 18});
      }
    }, 3200);
  }, []);

  useEffect(()=>{
    startSequence();
  }, [startSequence]);

  // Timer countdown during Player phase
  useEffect(()=>{
    if (phase !== Phase.Player) return;
    if (timer <= 0) {
      // Timer expired — auto-commit move (graceful fallback)
      commitAction(ACTIONS.find(a=>a.id==='move'));
      return;
    }
    const id = setInterval(()=> setTimer(t => Math.max(0, t-1)), 1000);
    return ()=> clearInterval(id);
  }, [phase, timer]);

  /* ===== Commit an action (from drag or tap) ===== */
  const commitAction = useCallback((action)=>{
    if (phase !== Phase.Player) return;
    setHint({visible:false, x:0, y:0});
    setTapAction(null);

    const result = resolveAction(action.id);
    setRollResult(result);

    setHiddenAction(action.id);
    setEnvelopes(prev=>({
      ...prev,
      yanni:{ appearing:true, sealFlash:true, revealed:false, actionLabel: `${action.label} Gremlin` }
    }));

    setTimeout(()=>{
      setEnvelopes(prev=>{
        const e={...prev};
        if (e.yanni) e.yanni = {...e.yanni, appearing:false, sealFlash:false};
        return e;
      });
      triggerReveal(result);
    }, 700);
  }, [phase]);

  /* ===== After player commits, run reveal sequence ===== */
  const triggerReveal = useCallback((result)=>{
    setPhase(Phase.Reveal);

    // flip envelopes one by one
    const order = ['yanni','bram','aria'];
    order.forEach((id, i)=>{
      setTimeout(()=>{
        setEnvelopes(prev=>{
          const e = {...prev};
          if (e[id]) e[id] = {...e[id], revealed:true};
          return e;
        });
      }, 350 + i*180);
    });

    // story update with outcome narrative
    setTimeout(()=>{
      setPhase(Phase.Resolve);
      setStoryText(result ? result.narrative : OUTCOMES.move.success);
      setStoryKey(k=>k+1);
    }, 1500);

    // reward card slides up + notify outer shell
    setTimeout(()=>{
      setPhase(Phase.Reward);
      window.dispatchEvent(new CustomEvent('sfq-event',{
        detail:{ type:'scene-complete', roll: result }
      }));
    }, 2900);
  }, []);

  const onContinueReward = useCallback(()=>{
    setDismissing(true);
    setTimeout(()=>{
      setDismissing(false);
      setTurn(t=>t+1);
      startSequence();
    }, 460);
  }, [startSequence]);

  /* ===== Tap-to-commit handler ===== */
  const handleTapAction = useCallback((action)=>{
    if (phase !== Phase.Player) return;
    setHint({visible:false, x:0, y:0});
    setTapAction(action);
  }, [phase]);

  /* ===== Drag handling ===== */
  const onCoinPointerDown = useCallback((e, action)=>{
    if (phase !== Phase.Player) return;
    e.preventDefault();
    e.target.setPointerCapture && e.target.setPointerCapture(e.pointerId);

    const stage = stageRef.current;
    if (!stage) return;
    const sr = stage.getBoundingClientRect();
    setHint({visible:false, x:0, y:0});

    setDrag({
      Coin: action.Coin,
      action,
      actionId: action.id,
      x: e.clientX - sr.left,
      y: e.clientY - sr.top,
      hover: false,
      trail: [],
      pointerId: e.pointerId,
    });
  }, [phase]);

  useEffect(()=>{
    if (!drag) return;
    const stage = stageRef.current;
    if (!stage) return;

    const onMove = (e)=>{
      const sr = stage.getBoundingClientRect();
      const x = e.clientX - sr.left;
      const y = e.clientY - sr.top;
      const dz = dropZoneRef.current;
      let hover = false;
      if (dz){
        const d = dz.getBoundingClientRect();
        const cx = d.left + d.width/2, cy = d.top + d.height/2;
        const dx = e.clientX - cx, dy = e.clientY - cy;
        hover = Math.sqrt(dx*dx + dy*dy) < 60;
      }
      setDropZoneHot(hover);
      const id = ++trailIdRef.current;
      setDrag(prev=> prev ? ({
        ...prev,
        x, y, hover,
        trail: [
          ...prev.trail.map(t=>({...t, life: t.life - 0.08})).filter(t=>t.life>0),
          { id, x, y, life: 1 },
        ].slice(-22),
      }) : prev);
    };

    const onUp = (e)=>{
      const dz = dropZoneRef.current;
      let dropped = false;
      if (dz){
        const d = dz.getBoundingClientRect();
        const cx = d.left + d.width/2, cy = d.top + d.height/2;
        const dx = e.clientX - cx, dy = e.clientY - cy;
        dropped = Math.sqrt(dx*dx + dy*dy) < 60;
      }
      const action = drag.action;
      setDrag(null);
      setDropZoneHot(false);

      if (dropped) {
        commitAction(action);
      }
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return ()=>{
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [drag, commitAction]);

  return (
    <div ref={stageRef} style={{position:'relative', width:'100%', height:'100%', overflow:'hidden', display:'flex', flexDirection:'column'}}>
      <Defs/>

      <AppBar/>
      <SceneHeader turn={turn} razed={1} total={5}/>
      <StoryScroll text={storyText} refreshKey={storyKey} rollResult={rollResult}/>

      <SharedTable
        envelopes={envelopes}
        dropZoneActive={phase===Phase.Player}
        dropZoneHot={dropZoneHot}
        revealed={phase===Phase.Reveal || phase===Phase.Resolve || phase===Phase.Reward}
        onTableMount={(el)=> tableRef.current=el}
        dropZoneRef={dropZoneRef}
      />

      <ActionTrayWithRef
        coinRef={persuadeCoinRef}
        onPointerDown={onCoinPointerDown}
        onTapAction={handleTapAction}
        draggingActionId={drag?.actionId}
        hiddenActionId={hiddenAction}
        timer={timer}
        phase={phase}
      />

      <SpotlightRow tokensLeft={spotlightTokens ?? 2}/>
      <PlayerCard hp={hp ?? 8} maxHp={10} xp={xp ?? 240}/>

      <IntroHint visible={hint.visible} originX={hint.x} originY={hint.y}/>
      <DragLayer drag={drag}/>

      {/* Tap-to-confirm popover */}
      {tapAction && (
        <TapConfirmPopover
          action={tapAction}
          onCancel={()=> setTapAction(null)}
          onConfirm={commitAction}
        />
      )}

      {(phase === Phase.Reward || dismissing) && (
        <RewardCard
          onContinue={onContinueReward}
          dismissing={dismissing}
          rollResult={rollResult}
        />
      )}
    </div>
  );
}

window.SceneApp = App;
