import { useEffect, useRef, useState, type MouseEvent, type PointerEvent, type KeyboardEvent, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import './table-contact.css';

/** Framer Motion 11 snapshots this preference at mount; the table follows live changes. */
export function useLiveReducedMotion() {
  const [reduced, setReduced] = useState(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(query.matches);
    update(); query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return reduced;
}

/** Local input acknowledgement, never a claim that a command succeeded. */
export function useTableContact(quiet: boolean) {
  const pressed = useRef<HTMLElement>();
  const serial = useRef(0);
  const pointer = useRef({ x: 0, y: 0, moved: false });
  const [contact, setContact] = useState<{ id: number; x: number; y: number; accent: string }>();
  const clearPress = () => {
    pressed.current?.removeAttribute('data-tactile-press');
    pressed.current = undefined;
  };
  useEffect(() => {
    window.addEventListener('pointerup', clearPress);
    window.addEventListener('pointercancel', clearPress);
    window.addEventListener('keyup', clearPress);
    window.addEventListener('blur', clearPress);
    return () => {
      clearPress();
      window.removeEventListener('pointerup', clearPress);
      window.removeEventListener('pointercancel', clearPress);
      window.removeEventListener('keyup', clearPress);
      window.removeEventListener('blur', clearPress);
    };
  }, []);
  useEffect(() => {
    if (!contact) return;
    const timer = window.setTimeout(() => setContact(undefined), 420);
    return () => clearTimeout(timer);
  }, [contact?.id]);
  useEffect(() => { if (quiet) { clearPress(); setContact(undefined); } }, [quiet]);
  const control = (target: EventTarget | null) => {
    const button = target instanceof Element ? target.closest<HTMLButtonElement | HTMLInputElement>('button,input[type=checkbox],input[type=radio]') : null;
    return button && !button.disabled && button.getAttribute('aria-disabled') !== 'true' ? button : null;
  };
  const press = (target: EventTarget | null) => {
    clearPress();
    const button = control(target);
    if (!quiet && button) { pressed.current = button; button.dataset.tactilePress = 'true'; }
  };
  return {
    handlers: {
      onPointerDownCapture: (event: PointerEvent) => { if (event.button === 0) { pointer.current = { x: event.clientX, y: event.clientY, moved: false }; press(event.target); } },
      onPointerMoveCapture: (event: PointerEvent) => { if (Math.hypot(event.clientX - pointer.current.x, event.clientY - pointer.current.y) > 8) { pointer.current.moved = true; clearPress(); } },
      onKeyDownCapture: (event: KeyboardEvent) => { if (!event.repeat && ['Enter', ' '].includes(event.key)) press(event.target); },
      // Bubble after native checkbox/radio change handling; a capture update can restore the old checked value.
      onClick: (event: MouseEvent) => {
        clearPress();
        const button = control(event.target);
        if (quiet || !button || (event.detail > 0 && pointer.current.moved)) return;
        const rect = button.getBoundingClientRect();
        const token = button.dataset.token;
        setContact({ id: ++serial.current,
          x: event.detail ? Math.max(rect.left, Math.min(rect.right, event.clientX)) : rect.left + rect.width / 2,
          y: event.detail ? Math.max(rect.top, Math.min(rect.bottom, event.clientY)) : rect.top + rect.height / 2,
          accent: token === 'fight' ? '#cc674a' : token === 'influence' ? '#4bafab' : token === 'assist' ? '#63974b' : '#c49432' });
      },
    },
    feedback: !quiet && contact ? createPortal(<div className="di-table-contact" key={contact.id} aria-hidden="true"
      style={{ left: contact.x, top: contact.y, '--contact-color': contact.accent } as CSSProperties}>
      <span className="di-contact-ring" />
      {Array.from({ length: 6 }, (_, i) => <i key={i} style={{ '--contact-angle': `${i * 60 - 15}deg` } as CSSProperties} />)}
    </div>, document.body) : null,
  };
}
