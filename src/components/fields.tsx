import { useId, type ReactNode } from 'react';

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
  return (
    <div className="field">
      <LabelText label={p.label} help={p.help} htmlFor={id} />
      <input
        id={id}
        type="number"
        inputMode="numeric"
        value={Number.isFinite(p.value) ? p.value : ''}
        min={p.min}
        max={p.max}
        step={p.step}
        onChange={(e) => {
          let v = e.target.valueAsNumber;
          if (Number.isNaN(v)) v = p.min ?? 0;
          if (p.min !== undefined) v = Math.max(p.min, v);
          if (p.max !== undefined) v = Math.min(p.max, v);
          p.onChange(v);
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
