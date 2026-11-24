import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import type { RuleKey } from '../domain/rules';
import { LabelText } from './HelpTip';
import { MinusIcon, PlusIcon } from './Icons';

interface Item {
  id: string;
  name: string;
}

/**
 * A list of chosen items with "−" to remove each one, and a "+" that opens a
 * search box to add more from `items` (e.g. objectives for a mission).
 */
export function PickList<T extends Item>(p: {
  label: string;
  help?: RuleKey;
  items: T[];
  selected: string[];
  onChange(ids: string[]): void;
  /** Extra info shown after the name, e.g. "(+4 pts)". */
  extra?(item: T): ReactNode;
  /** Shown when nothing is selected. */
  emptyText?: string;
  /** Shown in the search box when there is nothing left to add. */
  noItemsText?: string;
  addLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);

  const byId = new Map(p.items.map((i) => [i.id, i]));
  const chosen = p.selected.map((id) => byId.get(id)).filter((i): i is T => !!i);
  const q = query.trim().toLowerCase();
  const matches = p.items.filter((i) => !p.selected.includes(i.id) && i.name.toLowerCase().includes(q));

  // Close the search box when clicking anywhere else.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open]);

  useEffect(() => setActive(0), [query]);

  const add = (item: T) => {
    p.onChange([...p.selected, item.id]);
    setQuery('');
    input.current?.focus(); // stay open to add several in a row
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') setActive((a) => Math.min(a + 1, matches.length - 1));
    else if (e.key === 'ArrowUp') setActive((a) => Math.max(a - 1, 0));
    else if (e.key === 'Enter' && matches[active]) add(matches[active]);
    else if (e.key === 'Escape') setOpen(false);
    else return;
    e.preventDefault();
  };

  return (
    <fieldset className="picklist">
      <legend>
        <LabelText label={p.label} help={p.help} />
      </legend>
      {p.selected.length === 0 && <p className="muted small">{p.emptyText ?? 'None added yet.'}</p>}
      <ul className="picked">
        {chosen.map((item) => (
          <li key={item.id}>
            <span className="grow">
              {item.name}
              {p.extra && <span className="muted"> {p.extra(item)}</span>}
            </span>
            <button
              className="round-btn"
              title={`Remove ${item.name}`}
              aria-label={`Remove ${item.name}`}
              onClick={() => p.onChange(p.selected.filter((id) => id !== item.id))}
            >
              <MinusIcon />
            </button>
          </li>
        ))}
      </ul>

      <div className="picker" ref={box}>
        <button
          className="round-btn add"
          title={p.addLabel ?? 'Add'}
          aria-label={p.addLabel ?? 'Add'}
          aria-expanded={open}
          onClick={() => {
            setOpen(!open);
            setQuery('');
          }}
        >
          <PlusIcon />
        </button>
        {open && (
          <div className="picker-popup card">
            <input
              ref={input}
              autoFocus
              placeholder="Search…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKey}
              role="combobox"
              aria-expanded
            />
            <ul role="listbox">
              {matches.map((item, i) => (
                <li key={item.id} role="option" aria-selected={i === active}>
                  <button className={i === active ? 'active' : ''} onMouseEnter={() => setActive(i)} onClick={() => add(item)}>
                    {item.name}
                    {p.extra && <span className="muted"> {p.extra(item)}</span>}
                  </button>
                </li>
              ))}
              {matches.length === 0 && (
                <li className="muted small none">
                  {q ? 'No matches.' : p.items.length === 0 ? (p.noItemsText ?? 'Nothing to add yet.') : 'Everything has been added.'}
                </li>
              )}
            </ul>
          </div>
        )}
      </div>
    </fieldset>
  );
}
