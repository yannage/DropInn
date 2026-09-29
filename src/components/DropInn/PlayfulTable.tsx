import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { playTableSound } from './tableSound';
import { TokenArtwork, type IllustratedToken } from './TokenArtwork';
import { motion } from 'framer-motion';
import './playful-table.css';

export function useHeroPlay() {
  const count = useRef(0);
  const [play, setPlay] = useState<{ id: number; kind: string; caption: string }>();
  useEffect(() => {
    if (!play) return;
    const timer = window.setTimeout(() => setPlay(undefined), 1000);
    return () => clearTimeout(timer);
  }, [play?.id]);
  return { play, poke: () => {
    const id = ++count.current;
    const move = [{ kind: 'hop', caption: 'Hop!' }, { kind: 'twirl', caption: 'Wheee!' }, { kind: 'bow', caption: 'Ta-da!' }][(id - 1) % 3];
    setPlay({ id, ...move }); playTableSound('pick');
  } };
}

/** Aiming is a local preview: it neither sends a command nor predicts success. */
export function AimConnection({ stage, actorId, targetId, pointer, token }: {
  stage: RefObject<HTMLDivElement>; actorId: string; targetId?: string;
  pointer?: { x: number; y: number }; token: IllustratedToken | 'spotlight';
}) {
  const [line, setLine] = useState<{ path: string; x: number; y: number; radius: number }>();
  useLayoutEffect(() => {
    const root = stage.current;
    if (!root || (!targetId && !pointer)) { setLine(undefined); return; }
    const measure = () => {
      const rect = root.getBoundingClientRect();
      const nodes = [...root.querySelectorAll<HTMLElement>('[data-scene-target]')];
      const from = nodes.find(node => node.dataset.sceneTarget === actorId)?.getBoundingClientRect();
      const to = nodes.find(node => node.dataset.sceneTarget === targetId)?.getBoundingClientRect();
      if (!from || (!to && !pointer)) { setLine(undefined); return; }
      const x1 = from.x + from.width / 2 - rect.x, y1 = from.y - rect.y + 8;
      const x = (to ? to.x + to.width / 2 : pointer!.x) - rect.x;
      const y = (to ? to.y + to.height / 2 : pointer!.y) - rect.y;
      setLine({ path: `M ${x1} ${y1} Q ${x1} ${Math.min(y1, y) - 45} ${x} ${y}`, x, y, radius: to ? Math.max(18, Math.min(to.width, to.height) * .35) : 12 });
    };
    measure(); const observer = new ResizeObserver(measure); observer.observe(root);
    return () => observer.disconnect();
  }, [actorId, targetId, pointer?.x, pointer?.y, stage]);
  if (!line) return null;
  return <svg className={`di-aim-connection is-${token} ${targetId ? 'is-aimed' : 'is-searching'}`} aria-hidden="true">
    <path className="di-aim-shadow" d={line.path}/><path className="di-aim-thread" d={line.path}/>
    <circle className="di-aim-ring" cx={line.x} cy={line.y} r={line.radius}/>
    <circle className="di-aim-center" cx={line.x} cy={line.y} r={3}/>
  </svg>;
}


/** The hand keeps its hit area while its illustrated token travels with the pointer. */
export function HeldToken({ token, x, y, tilt, label, quiet }: {
  token: IllustratedToken; x: number; y: number; tilt: number; label?: string; quiet: boolean;
}) {
  const captionX = Math.max(100, Math.min(window.innerWidth - 100, x));
  const captionY = y < 110 ? y + 48 : y - 88;
  return <div className="di-held-token-layer" aria-hidden="true">
    <div className={`di-held-token ${label ? 'is-over' : ''}`} style={{ left: x, top: y }}>
      <span className="di-held-shadow"/>
      <motion.div className="di-held-piece" initial={false}
        animate={{ rotate: quiet ? 0 : tilt, scale: quiet ? 1 : label ? 1.12 : 1.04 }}
        transition={quiet ? { duration: 0 } : { type: 'spring', stiffness: 480, damping: 25 }}>
        <TokenArtwork token={token}/>
      </motion.div>
    </div>
    <div className={`di-aim-caption ${label ? 'is-over' : ''}`} style={{ left: captionX, top: captionY }}>
      <small>{label ? 'Drop to prepare' : 'Find a highlighted piece'}</small>{label && <strong>{label}</strong>}
    </div>
  </div>;
}
