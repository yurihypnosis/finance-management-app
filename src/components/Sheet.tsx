import { useEffect, useRef, useState, type ReactNode } from 'react';
import './Sheet.css';

const ANIM_MS = 200;

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

/**
 * Shared bottom sheet for "tap a row → edit" (原則4: 閲覧と編集の分離).
 * Used across Phase 2+ screens instead of each screen rolling its own
 * inline-edit UI.
 */
export function Sheet({ open, onClose, title, children }: SheetProps) {
  // Kept mounted for ANIM_MS after `open` flips to false so the close
  // transition (slide-down + overlay fade) can play instead of the sheet
  // just vanishing.
  const [render, setRender] = useState(open);
  const [visible, setVisible] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setRender(true);
      // Mount off-screen first, then flip to the visible/translated state
      // on the next frame so the transition actually runs (changing the
      // class in the same frame as the mount would skip straight to the
      // end state).
      const raf = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(raf);
    }
    setVisible(false);
    const t = setTimeout(() => setRender(false), ANIM_MS);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (visible) panelRef.current?.focus();
  }, [visible]);

  useEffect(() => {
    if (!render) return;
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [render, open, onClose]);

  // Background scroll lock: plain `overflow: hidden` on body rather than
  // the position:fixed+scrollY-restore trick some iOS guides recommend.
  // The app has no scrollable body of its own — only #content scrolls
  // (it's the flex child with overflow-y:auto) — so there's no scroll
  // position to preserve, and overflow:hidden is enough to stop iOS
  // Safari's rubber-band scroll from moving the page behind the sheet.
  useEffect(() => {
    if (!render) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [render]);

  if (!render) return null;

  return (
    <div
      className={`sheet-overlay${visible ? ' sheet-visible' : ''}`}
      onClick={onClose}
    >
      <div
        className="sheet-panel"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        ref={panelRef}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-grabber"><div className="sheet-grabber-bar" /></div>
        {title && (
          <div className="sheet-header">
            <div className="sheet-title">{title}</div>
            <div className="sheet-close" onClick={onClose}>×</div>
          </div>
        )}
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  );
}
