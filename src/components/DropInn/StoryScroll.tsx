import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Maximize2, Minimize2, ChevronUp, Clock3 } from 'lucide-react';
import { chaptersFor } from '../../lib/dropinn/registry';
import { storyEntries } from '../../lib/dropinn/storyLog';
import type { AdventureRoom } from '../../lib/dropinn/types';
import './story-scroll.css';

export type StoryScrollMode = 'collapsed' | 'compact' | 'full';
// All modes reuse the same source pixels. Only the length of the spindle changes.
function ScrollRoller() {
  return <span className="di-scroll-roller" aria-hidden="true">
    {['0 0 336 240', '336 0 1350 240', '1686 0 358 240'].map(viewBox =>
      <svg key={viewBox} viewBox={viewBox} preserveAspectRatio="none" focusable="false">
        <image href="/art/ui-scroll-roller.webp" width="2044" height="240" />
      </svg>)}
  </span>;
}
export function StoryScroll({ room, userId, mode, onMode, suspended, locked, seconds, narration }: {
  room: AdventureRoom; userId: string; mode: StoryScrollMode; onMode: (mode: StoryScrollMode) => void;
  suspended: boolean; locked: boolean; seconds: number; narration?: string;
}) {
  const trigger = useRef<HTMLButtonElement>(null), panel = useRef<HTMLDivElement>(null), body = useRef<HTMLDivElement>(null);
  const entries = useMemo(() => storyEntries(room), [room.events,room.outcomes]);
  const chapters = chaptersFor(room);
  const reduced = useReducedMotion();
  const visible = mode !== 'collapsed' && !suspended;
  const [bounds,setBounds] = useState({left:8,top:44,width:320,height:180});
  const [seen,setSeen] = useState<string>();
  const latest = entries.at(-1)?.id;
  const follow = useRef(true), position = useRef(0), changing = useRef(false);
  const previousMode = useRef(mode);
  const anchor = useRef<{id:string;offset:number}>();
  const capture = () => {
    if (!body.current) return;
    position.current = body.current.scrollTop;
    const top = body.current.getBoundingClientRect().top;
    const entry = [...body.current.querySelectorAll<HTMLElement>('[data-story-entry]')].find(node => node.getBoundingClientRect().bottom > top);
    anchor.current = entry ? {id:entry.dataset.storyEntry!,offset:entry.getBoundingClientRect().top-top} : undefined;
  };
  const restore = () => {
    const node = body.current; if (!node || !visible) return;
    if (follow.current) { node.scrollTop = node.scrollHeight; setSeen(latest); }
    else {
      const entry = [...node.querySelectorAll<HTMLElement>('[data-story-entry]')].find(item => item.dataset.storyEntry === anchor.current?.id);
      if (entry && anchor.current) node.scrollTop += entry.getBoundingClientRect().top-node.getBoundingClientRect().top-anchor.current.offset;
      else node.scrollTop = position.current;
    }
  };
  const change = (next:StoryScrollMode) => { if (locked) return; capture(); changing.current=true; onMode(next); };
  useLayoutEffect(() => {
    const update = () => {
      const button = trigger.current; if (!button) return;
      const header = button.closest('header')!.getBoundingClientRect();
      const dock = document.querySelector('.di-scene-dock')?.getBoundingClientRect();
      const width = window.innerWidth, height = window.innerHeight;
      const full = mode === 'full';
      const w = full ? Math.min(720,width-16) : width < 760 ? width-16 : Math.min(440,Math.max(320,width*.35));
      const top = full ? 8 : header.bottom+4;
      setBounds({left:full ? (width-w)/2 : Math.max(8,header.left+8),top,width:w,height:full ? height-16 : Math.max(100,Math.min(width<760 ? height*.28 : height*.65,(dock?.top ?? height)-top-8))});
    };
    update(); window.addEventListener('resize',update);
    const observer = new ResizeObserver(update); const main = trigger.current?.closest('main'); if(main) observer.observe(main);
    return () => { window.removeEventListener('resize',update); observer.disconnect(); };
  },[mode]);
  useLayoutEffect(() => { restore(); if(reduced) changing.current=false; },[mode,suspended,latest,bounds.height,bounds.width]);
  useEffect(() => {
    if (!visible) return;
    const key = (event:KeyboardEvent) => {
      if(event.key==='Escape' && !locked) { event.preventDefault(); change(mode==='full'?'compact':'collapsed'); }
      if(event.key==='Tab' && mode==='full') {
        const controls = [...panel.current!.querySelectorAll<HTMLElement>('button:not(:disabled),summary,[tabindex="0"]')];
        const first=controls[0],last=controls.at(-1);
        if(event.shiftKey && (document.activeElement===first || document.activeElement===panel.current)) {event.preventDefault();last?.focus();}
        else if(!event.shiftKey && (document.activeElement===last || document.activeElement===panel.current)) {event.preventDefault();first?.focus();}
      }
    };
    document.addEventListener('keydown',key); return () => document.removeEventListener('keydown',key);
  },[visible,mode,locked]);
  useLayoutEffect(() => {
    if(mode!=='full' || !visible) return;
    const previous=document.activeElement as HTMLElement|null;
    const root=trigger.current?.closest('.di-app') as HTMLElement|null;
    const wasInert=root?.inert ?? false;
    if(root) root.inert=true;
    panel.current?.focus();
    return () => { if(root) root.inert=wasInert; if(previous?.isConnected) previous.focus(); };
  },[mode,visible]);
  useLayoutEffect(() => {if(panel.current) panel.current.inert=!visible;},[visible]);
  useEffect(() => { if(mode==='collapsed' && previousMode.current!=='collapsed') trigger.current?.focus({preventScroll:true}); previousMode.current=mode; },[mode]);
  const jump = () => {follow.current=true;restore();};
  return <>
    <button ref={trigger} className="di-story-cylinder" aria-label="Story" aria-expanded={visible} aria-controls="adventure-story-scroll" disabled={locked || suspended} onClick={() => change(mode==='collapsed'?'compact':'collapsed')}>
      <ScrollRoller/><span className="di-story-trigger-label">Story</span>{latest!==seen && <i aria-label="Unread story events" />}
    </button>
    {createPortal(<>
      {mode==='full' && visible && <div className="di-story-backdrop" />}
      <motion.div ref={panel} id="adventure-story-scroll" className={`di-story-scroll is-${mode}`} role={mode==='full'?'dialog':'region'} aria-modal={mode==='full' && visible ? true : undefined} aria-label="Story & journal" aria-hidden={!visible} tabIndex={-1}
        initial={false} animate={{left:bounds.left,top:bounds.top,width:visible?bounds.width:88,height:visible?bounds.height:0,opacity:visible?1:0}}
        transition={{duration:reduced?0:.35,ease:[.22,.8,.25,1]}} style={{pointerEvents:visible?'auto':'none'}} onAnimationComplete={() => {restore();changing.current=false;}}>
        <ScrollRoller/>
        <div className="di-scroll-paper">
        <header><h2>Story so far</h2>{mode==='full' && <span className="di-scroll-clock" role="timer"><Clock3 size={14}/>{room.status==='active'?`${seconds}s ${room.phase==='reveal'?'to next turn':'to choose'}`:'Table paused'}</span>}
          <button disabled={locked} aria-label={mode==='full'?'Compact view':'Expand story'} onClick={() => change(mode==='full'?'compact':'full')}>{mode==='full'?<Minimize2 size={18}/>:<Maximize2 size={18}/>}</button>
          <button disabled={locked} aria-label="Roll up" onClick={() => change('collapsed')}><ChevronUp size={20}/></button>
        </header>
        <div ref={body} className="di-scroll-reading" tabIndex={0} aria-label="Story entries" onScroll={() => {if(changing.current || !visible) return; const node=body.current!;follow.current=node.scrollHeight-node.clientHeight-node.scrollTop<24;capture();if(follow.current)setSeen(latest);}}>
          {chapters.map((chapter,index) => {const group=entries.filter(entry=>entry.chapter===index);return group.length>0 && <section key={chapter.id}><h3>Chapter {index+1} · {chapter.title}</h3>{group.map(entry=><article key={entry.id} data-story-entry={entry.id}><small>{entry.turn ? `Turn ${entry.turn}` : 'Chapter ending'}{entry.actorId===userId?' · Your move':''}</small><p>{entry.text}</p>{entry.details.length>0 && <details><summary>Details</summary>{entry.details.map((detail,i)=><p key={i}>{detail}</p>)}</details>}</article>)}</section>;})}
          {narration && <aside><h3>Live narration · temporary</h3><p>{narration}</p></aside>}
        </div>
        {visible && latest!==seen && !follow.current && <button className="di-scroll-new" onClick={jump}>New events ↓</button>}
        </div>
        <ScrollRoller/>
      </motion.div>
    </>,document.body)}
  </>;
}
