import { useEffect, useRef, useState, type KeyboardEvent } from 'react';

/**
 * Text input with a styled suggestion list (replaces the browser's <datalist>,
 * which can't be styled). Typing filters the suggestions; free text is allowed.
 */
export function SuggestInput(p: {
  id: string;
  value: string;
  onChange(v: string): void;
  suggestions: string[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const box = useRef<HTMLDivElement>(null);

  const q = p.value.trim().toLowerCase();
  // Show everything when the field is empty or exactly matches a suggestion, otherwise filter.
  const exact = p.suggestions.some((s) => s.toLowerCase() === q);
  const matches = p.suggestions.filter((s) => !q || exact || s.toLowerCase().includes(q));

  useEffect(() => setActive(-1), [p.value]);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open]);

  const choose = (s: string) => {
    p.onChange(s);
    setOpen(false);
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      setOpen(true);
      setActive((a) => Math.min(a + 1, matches.length - 1));
    } else if (e.key === 'ArrowUp') setActive((a) => Math.max(a - 1, 0));
    else if (e.key === 'Enter' && open && matches[active]) choose(matches[active]);
    else if (e.key === 'Escape' || e.key === 'Tab') {
      setOpen(false);
      return;
    } else return;
    e.preventDefault();
  };

  const showList = open && matches.length > 0;
  return (
    <div className="suggest" ref={box}>
      <input
        id={p.id}
        value={p.value}
        placeholder={p.placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={showList}
        aria-autocomplete="list"
        onChange={(e) => {
          p.onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKey}
      />
      {p.suggestions.length > 0 && (
        <button
          type="button"
          className="suggest-toggle"
          tabIndex={-1}
          aria-label="Show suggestions"
          onClick={() => setOpen(!open)}
        />
      )}
      {showList && (
        <ul className="suggest-list card" role="listbox">
          {matches.map((s, i) => (
            <li key={s} role="option" aria-selected={i === active}>
              <button
                type="button"
                className={i === active ? 'active' : ''}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(s)}
              >
                {s}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
