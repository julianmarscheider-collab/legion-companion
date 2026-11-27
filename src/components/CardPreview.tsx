import { useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * A name that shows a card preview on mouse-over (tap on touch screens),
 * e.g. a boss card in a boss deck.
 */
export function CardPreview({ children, title, text }: { children: ReactNode; title: string; text: string }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLSpanElement>(null);
  const touch = useRef(false);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open]);

  return (
    <span
      ref={box}
      className="card-preview-anchor"
      tabIndex={0}
      onPointerDown={(e) => (touch.current = e.pointerType === 'touch')}
      onMouseEnter={() => !touch.current && setOpen(true)}
      onMouseLeave={() => !touch.current && setOpen(false)}
      onFocus={() => !touch.current && setOpen(true)}
      onBlur={() => !touch.current && setOpen(false)}
      onClick={() => touch.current && setOpen((o) => !o)}
    >
      {children}
      {open && (
        <span className="card-preview" role="tooltip">
          <span className="card-preview-band">Boss card</span>
          <span className="boss-action">
            <strong>{title}</strong>
            <span>{text || 'No rules text yet.'}</span>
          </span>
        </span>
      )}
    </span>
  );
}
