import { useId, useState, type ReactNode } from 'react';

import type { RuleKey } from '../domain/rules';
import { HelpTip, LabelText } from './HelpTip';
import { SuggestInput } from './SuggestInput';
import { Dropdown } from './Dropdown';

export { PickList } from './PickList';

export function TextField(p: { label: string; help?: RuleKey; value: string; onChange(v: string): void; placeholder?: string; suggestions?: string[] }) {
  const id = useId();
  return (
    <div className="field">
      <LabelText label={p.label} help={p.help} htmlFor={id} />
      {p.suggestions ? (
        <SuggestInput id={id} value={p.value} onChange={p.onChange} suggestions={p.suggestions} placeholder={p.placeholder} />
      ) : (
        <input id={id} value={p.value} placeholder={p.placeholder} onChange={(e) => p.onChange(e.target.value)} />
      )}
    </div>
  );
}

export function TextArea(p: { label: string; help?: RuleKey; value: string; onChange(v: string): void; rows?: number; placeholder?: string }) {
  const id = useId();
  return (
    <div className="field">
      <LabelText label={p.label} help={p.help} htmlFor={id} />
      <textarea id={id} rows={p.rows ?? 3} value={p.value} placeholder={p.placeholder} onChange={(e) => p.onChange(e.target.value)} />
    </div>
  );
}

export function NumberField(p: { label: string; help?: RuleKey; value: number; onChange(v: number): void; min?: number; max?: number; step?: number; hint?: string }) {
  const id = useId();
  // What the player is typing. Unfinished input ("", "-", "1.") is kept as it is
  // and only complete numbers are passed on; leaving the field shows the saved value again.
  const [draft, setDraft] = useState<string | null>(null);
  const decimals = p.step !== undefined && !Number.isInteger(p.step);
  const clamp = (v: number) => Math.min(p.max ?? Infinity, Math.max(p.min ?? -Infinity, v));
  return (
    <div className="field">
      <LabelText label={p.label} help={p.help} htmlFor={id} />
      <input
        id={id}
        type="text"
        inputMode={decimals || (p.min ?? 0) < 0 ? 'decimal' : 'numeric'}
        value={draft ?? (Number.isFinite(p.value) ? String(p.value) : '')}
        onChange={(e) => {
          const text = e.target.value;
          setDraft(text);
          const normalized = text.trim().replace(',', '.');
          if (/^-?\d+(\.\d+)?$/.test(normalized)) p.onChange(clamp(Number(normalized)));
        }}
        onBlur={() => setDraft(null)}
        onKeyDown={(e) => {
          // Arrow keys step the value like a number field.
          if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
          e.preventDefault();
          const step = p.step ?? 1;
          const next = clamp(Math.round(((Number.isFinite(p.value) ? p.value : 0) + (e.key === 'ArrowUp' ? step : -step)) * 1000) / 1000);
          setDraft(null);
          p.onChange(next);
        }}
      />
      {p.hint && <small>{p.hint}</small>}
    </div>
  );
}

export function SelectField<T extends string>(p: {
  label: string;
  help?: RuleKey;
  value: T;
  onChange(v: T): void;
  options: { value: T; label: string }[];
}) {
  const id = useId();
  return (
    <div className="field">
      <LabelText label={p.label} help={p.help} htmlFor={id} />
      <Dropdown id={id} value={p.value} onChange={(v) => p.onChange(v as T)} options={p.options} />
    </div>
  );
}

export function Checkbox(p: { label: ReactNode; help?: RuleKey; checked: boolean; onChange(v: boolean): void }) {
  return (
    <div className="checkbox">
      <label>
        <input type="checkbox" checked={p.checked} onChange={(e) => p.onChange(e.target.checked)} />
        <span>{p.label}</span>
      </label>
      {p.help && <HelpTip rule={p.help} />}
    </div>
  );
}
