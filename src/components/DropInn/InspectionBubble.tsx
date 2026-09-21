import { useLayoutEffect, useRef, useState } from 'react';

/** Anchor to the target only when there is room clear of other interactive pieces. */
export function InspectionBubble({ text, onVisible }: { text: string; onVisible: (visible: boolean) => void }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [position, setPosition] = useState<{left:number;top:number} | null>(null);
  useLayoutEffect(() => {
    const bubble = ref.current, target = bubble?.parentElement, stage = target?.closest('.di-scene-stage');
    if (!bubble || !target || !stage) return;
    const update = () => {
      let next: typeof position = null;
      if (innerWidth >= 900 && innerHeight >= 700) {
        const a = target.getBoundingClientRect(), s = stage.getBoundingClientRect(), b = bubble.getBoundingClientRect();
        const left = Math.max(s.left + 8, Math.min(a.left + (a.width-b.width)/2, s.right-b.width-8));
        const obstacles = [...stage.querySelectorAll<HTMLElement>('[data-scene-target],.di-stage-threat')].filter(node=>node!==target).map(node=>node.getBoundingClientRect());
        for (const top of [a.top-b.height-10, a.bottom+10]) {
          if (top < s.top+8 || top+b.height > s.bottom-8) continue;
          if (obstacles.some(r=>left<r.right+5 && left+b.width>r.left-5 && top<r.bottom+5 && top+b.height>r.top-5)) continue;
          next={left:left-a.left-2,top:top-a.top-2}; break;
        }
      }
      setPosition(old => old?.left===next?.left && old?.top===next?.top ? old : next);
      onVisible(!!next);
    };
    update(); const observer=new ResizeObserver(update); observer.observe(stage); observer.observe(bubble);
    window.addEventListener('resize',update);
    return () => { observer.disconnect(); window.removeEventListener('resize',update); onVisible(false); };
  }, [text,onVisible]);
  return <span ref={ref} className="di-inspect-bubble" aria-hidden="true" style={{left:position?.left ?? 0,top:position?.top ?? 0,visibility:position?'visible':'hidden'}}>{text}</span>;
}
