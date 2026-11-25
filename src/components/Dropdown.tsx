import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';

export interface DropdownOption {
  value: string;
  label: string;
  /** Optional heading the option is listed under (e.g. "Enemy lists"). */
  group?: string;
}

/**
 * App-drawn replacement for <select>. Browsers draw the open list of a native
 * select themselves (Firefox very differently), so this keeps every dropdown
 * looking the same everywhere. With `action`, it always shows the placeholder
 * and just reports the chosen value (for "+ Add …" menus).
 */
export function Dropdown(p: {
  id?: string;
  value: string;
  onChange(value: string): void;
  options: DropdownOption[];
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
  action?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const box = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const autoId = useId();
  const id = p.id ?? autoId;
  const listId = `${id}-list`;

  const current = p.action ? undefined : p.options.find((o) => o.value === p.value);
  const label = current?.label ?? p.placeholder ?? '';

  const show = () => {
    setActive(Math.max(0, p.options.findIndex((o) => o.value === p.value)));
    setOpen(true);
  };
  const choose = (i: number) => {
    const o = p.options[i];
    if (o) p.onChange(o.value);
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open]);

  // Keep the highlighted option visible while moving with the keyboard.
  useEffect(() => {
    if (open && active >= 0) list.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [open, active]);

  const onKey = (e: KeyboardEvent) => {
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault();
        show();
      }
      return;
    }
    if (e.key === 'ArrowDown') setActive((a) => Math.min(a + 1, p.options.length - 1));
    else if (e.key === 'ArrowUp') setActive((a) => Math.max(a - 1, 0));
    else if (e.key === 'Home') setActive(0);
    else if (e.key === 'End') setActive(p.options.length - 1);
    else if (e.key === 'Enter' || e.key === ' ') choose(active);
    else if (e.key === 'Escape') setOpen(false);
    else if (e.key === 'Tab') {
      setOpen(false);
      return;
    } else if (e.key.length === 1) {
      // Type a letter to jump to the next option starting with it.
      const k = e.key.toLowerCase();
      const n = p.options.length;
      for (let step = 1; step <= n; step++) {
        const i = (active + step) % n;
        if (p.options[i].label.replace(/^[^\p{L}\p{N}]+/u, '').toLowerCase().startsWith(k)) {
          setActive(i);
          break;
        }
      }
    } else return;
    e.preventDefault();
  };

  return (
    <div className={`dropdown ${p.className ?? ''}`} ref={box}>
      <button
        id={id}
        type="button"
        className={`dropdown-button ${current ? '' : 'placeholder'}`}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={p.ariaLabel}
        aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={onKey}
      >
        <span className="dropdown-label">{label}</span>
      </button>
      {open && (
        <ul className="dropdown-list card" role="listbox" id={listId} ref={list}>
          {p.options.map((o, i) => (
            <li key={`${o.group ?? ''}:${o.value}`} role="presentation">
              {o.group && o.group !== p.options[i - 1]?.group && <div className="dropdown-group">{o.group}</div>}
              <div
                id={`${listId}-${i}`}
                data-index={i}
                role="option"
                aria-selected={!p.action && o.value === p.value}
                className={`dropdown-option ${i === active ? 'active' : ''} ${!p.action && o.value === p.value ? 'selected' : ''} ${o.group ? 'grouped' : ''}`}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(i)}
              >
                {o.label}
              </div>
            </li>
          ))}
          {p.options.length === 0 && <li className="dropdown-empty muted">Nothing to choose.</li>}
        </ul>
      )}
    </div>
  );
}
