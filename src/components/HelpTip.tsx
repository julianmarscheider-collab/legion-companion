import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { QuestionIcon } from './Icons';
import { RULES, type RuleEntry, type RuleKey } from '../domain/rules';

/** Small "?" next to a field. Hover (or tap on a phone) shows its rules text. */
export function HelpTip({ rule }: { rule: RuleKey }) {
  const entry: RuleEntry = RULES[rule];
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btn = useRef<HTMLButtonElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<number | undefined>(undefined);
  const pointerType = useRef('');

  const show = () => {
    window.clearTimeout(closeTimer.current);
    setOpen(true);
  };
  // Small delay so the mouse can move from the "?" into the popup to click its link.
  const hide = () => {
    closeTimer.current = window.setTimeout(() => setOpen(false), 150);
  };

  // Position the popup under the "?", kept inside the screen.
  useLayoutEffect(() => {
    if (!open || !btn.current || !pop.current) return;
    const b = btn.current.getBoundingClientRect();
    const w = pop.current.offsetWidth;
    const h = pop.current.offsetHeight;
    const left = Math.min(Math.max(8, b.left + b.width / 2 - w / 2), window.innerWidth - w - 8);
    const below = b.bottom + 6;
    const top = below + h > window.innerHeight - 8 ? Math.max(8, b.top - h - 6) : below;
    setPos({ top, left });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!btn.current?.contains(t) && !pop.current?.contains(t)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', hide, true);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', hide, true);
    };
  }, [open]);

  return (
    <>
      <button
        ref={btn}
        type="button"
        className="help-tip"
        aria-label={`Help: ${entry.title}`}
        aria-expanded={open}
        onMouseEnter={() => pointerType.current !== 'touch' && show()}
        onMouseLeave={() => pointerType.current !== 'touch' && hide()}
        onFocus={() => pointerType.current !== 'touch' && show()}
        onBlur={() => pointerType.current !== 'touch' && hide()}
        onPointerDown={(e) => (pointerType.current = e.pointerType)}
        onClick={(e) => {
          e.preventDefault(); // don't activate the field this sits in
          e.stopPropagation();
          // With a mouse, hover already opened it, so a click keeps it open.
          // On touch screens a tap toggles it.
          if (pointerType.current === 'mouse') show();
          else setOpen((o) => !o);
        }}
      >
        <QuestionIcon />
      </button>
      {open && (
        <div
          ref={pop}
          role="tooltip"
          className="help-pop card"
          style={{ top: pos.top, left: pos.left }}
          onMouseEnter={show}
          onMouseLeave={hide}
        >
          <strong>{entry.title}</strong>
          {entry.text && <p>{entry.text}</p>}
          {entry.todo && (
            <p className="rules-todo">
              <span>Rules placeholder:</span> {entry.todo}
            </p>
          )}
          <div className="row gap wrap help-links">
            {entry.link && <Link to={entry.link.to}>{entry.link.label} →</Link>}
            <Link to={`/rules?topic=${rule}`}>Rules →</Link>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * A field label followed by its help icon. The "?" must not be inside the
 * <label>: a label belongs to the first control inside it, so hovering or
 * clicking the field would otherwise hover/click the "?" instead.
 */
export function LabelText({ label, help, htmlFor }: { label: ReactNode; help?: RuleKey; htmlFor?: string }) {
  return (
    <span className="label-text">
      {htmlFor ? <label htmlFor={htmlFor}>{label}</label> : label}
      {help && <HelpTip rule={help} />}
    </span>
  );
}
