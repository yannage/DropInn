import { useLayoutEffect, useMemo, useState, type CSSProperties, type RefObject } from 'react';
import { Check, Sparkles } from 'lucide-react';
import { gemwardFactStamp, gemwardPlacedMoves, type GemwardFactBeat, type GemwardPlacedMove } from '../../lib/dropinn/gemwardTableMarks';
import type { AdventureRoom } from '../../lib/dropinn/types';
import { TokenArtwork } from './TokenArtwork';
import './gemward-table-marks.css';

interface PlacedGeometry { id: string; path: string; x: number; y: number }

/** Static accepted counters: commits have no authoritative timestamp to animate or replay. */
export function GemwardPlacedMoves({ room, userId, locationId, stage, visible }: {
  room: AdventureRoom; userId: string; locationId: string; stage: RefObject<HTMLDivElement>; visible: boolean;
}) {
  const moves = useMemo(() => gemwardPlacedMoves(room, userId, locationId), [room, userId, locationId]);
  const signature = moves.map(move => `${move.id}:${move.targetKind}:${move.targetId}`).join('|');
  const [geometry, setGeometry] = useState<PlacedGeometry[]>([]);
  useLayoutEffect(() => {
    const root = stage.current;
    if (!root || !visible || !moves.length) { setGeometry([]); return; }
    const measure = () => {
      const bounds = root.getBoundingClientRect();
      const nodes = [...root.querySelectorAll<HTMLElement>('[data-scene-target]')];
      const rectFor = (id: string, kind: GemwardPlacedMove['targetKind']) => nodes.find(node => node.dataset.sceneTarget === id && node.dataset.targetKind === kind)?.getBoundingClientRect();
      const headingBottom = root.querySelector('.gm-scene-heading')?.getBoundingClientRect().bottom ?? bounds.top;
      const partyTop = root.querySelector('.gm-party')?.getBoundingClientRect().top ?? bounds.bottom;
      const placed: PlacedGeometry[] = [];
      for (const move of moves) {
        const source = rectFor(move.actorId, 'hero'), target = rectFor(move.targetId, move.targetKind);
        if (!source || !target || !target.width || !target.height) continue;
        const group = moves.filter(candidate => candidate.targetId === move.targetId && candidate.targetKind === move.targetKind);
        const index = group.findIndex(candidate => candidate.id === move.id);
        const targetNode = nodes.find(node => node.dataset.sceneTarget === move.targetId && node.dataset.targetKind === move.targetKind);
        const label = targetNode?.querySelector('.gm-piece-name,.gm-hero-name')?.getBoundingClientRect();
        const left = Math.min(target.left, label?.left ?? target.left), right = Math.max(target.right, label?.right ?? target.right);
        const leftRoom = left - bounds.left, rightRoom = bounds.right - right;
        let onRight = target.left + target.width / 2 >= bounds.left + bounds.width / 2;
        if ((onRight ? rightRoom : leftRoom) < 44 && (onRight ? leftRoom > rightRoom : rightRoom > leftRoom)) onRight = !onRight;
        const x = Math.max(22, Math.min(bounds.width - 22, (onRight ? right + 22 : left - 22) - bounds.left));
        // Keep the complete stack beside the painting and its label, between the
        // navigation and heroes. Clamp the group once, not each counter onto its neighbour.
        const ceiling = Math.max(22, headingBottom - bounds.top + 20);
        const floor = Math.max(ceiling, Math.min(bounds.height - 22, partyTop - bounds.top - 20));
        const spacing = Math.min(34, (floor - ceiling) / Math.max(1, group.length - 1));
        const span = spacing * (group.length - 1);
        const firstY = Math.max(ceiling, Math.min(floor - span, target.top - bounds.top + target.height * .35 - span / 2));
        const y = firstY + index * spacing;
        const fromX = source.left + source.width / 2 - bounds.left;
        const fromY = source.top - bounds.top + source.height * .55;
        placed.push({ id: move.id, x, y, path: `M ${fromX} ${fromY} Q ${fromX} ${Math.min(y, fromY) - 16} ${x} ${y}` });
      }
      setGeometry(placed);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    for (const node of root.querySelectorAll<HTMLElement>('[data-scene-target]')) observer.observe(node);
    return () => observer.disconnect();
    // IDs/targets describe the geometry; polling copies must not restart layout work.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, signature, locationId, visible]);
  if (!visible || !moves.length || !geometry.length) return null;
  return <div className="gm-placed-moves" data-gemward-placed-moves>
    <svg className="gm-placed-threads" aria-hidden="true">{geometry.map(mark => <path key={mark.id} d={mark.path} />)}</svg>
    {moves.map(move => {
      const mark = geometry.find(item => item.id === move.id);
      return mark && <span key={move.id} className={`gm-placed-counter is-${move.token}`} style={{ left: mark.x, top: mark.y }} role="img"
        aria-label={`${move.actorName} placed ${move.label} at ${move.targetName}. Resolves with the round.`}
        data-gemward-placed-move={move.actorId} data-gemward-placed-target={move.targetId}>
        {move.token === 'spotlight' ? <Sparkles size={19} aria-hidden="true" /> : <TokenArtwork token={move.token} />}
        <small aria-hidden="true">{Array.from(move.actorName)[0]}</small>
      </span>;
    })}
  </div>;
}

/** Inline factual title for the existing stage caption, never a second result panel. */
export function GemwardFactStamp({ beat, now, quiet, visible }: { beat?: GemwardFactBeat; now: number; quiet: boolean; visible: boolean }) {
  const stamp = gemwardFactStamp(beat, now, quiet, visible);
  if (!stamp) return null;
  return <span className={`gm-fact-stamp ${stamp.animate ? 'is-stamping' : ''}`} key={stamp.eventId}
    data-gemward-fact-stamp={stamp.eventId} style={{ '--stamp-duration': `${stamp.durationMs}ms`, '--stamp-delay': `${-stamp.elapsedMs}ms` } as CSSProperties}>
    <i aria-hidden="true"><Check size={17} strokeWidth={3} /></i><span>{stamp.label}</span>
  </span>;
}
