import { STAT_LABELS, type StatDependency, type StatKey } from '../domain/types';
import { Dropdown } from './Dropdown';
import { NumberField } from './fields';
import { LabelText } from './HelpTip';
import { MinusIcon } from './Icons';

/** Stats a dependent ability cost is based on, each with a multiplier. */
export function StatDependencyEditor({ value, onChange }: { value: StatDependency[]; onChange(v: StatDependency[]): void }) {
  const free = (Object.keys(STAT_LABELS) as StatKey[]).filter((k) => !value.some((d) => d.stat === k));
  const set = (i: number, factor: number) => onChange(value.map((d, j) => (j === i ? { ...d, factor } : d)));
  return (
    <fieldset className="stat-deps">
      <legend>
        <LabelText label="Points depend on" help="abilityDependent" />
      </legend>
      {value.length === 0 && <p className="muted small">Add the stats this ability's cost scales with.</p>}
      {value.map((d, i) => (
        <div key={d.stat} className="row gap stat-dep">
          <span className="grow stat-name">{STAT_LABELS[d.stat]}</span>
          <span className="muted">×</span>
          <NumberField label={`Multiplier for ${STAT_LABELS[d.stat]}`} min={-50} max={50} step={0.5} value={d.factor} onChange={(f) => set(i, f)} />
          <button className="round-btn" title="Remove stat" aria-label={`Remove ${STAT_LABELS[d.stat]}`} onClick={() => onChange(value.filter((_, j) => j !== i))}>
            <MinusIcon />
          </button>
        </div>
      ))}
      {free.length > 0 && (
        <Dropdown
          action
          className="add-enemy"
          value=""
          placeholder="+ Add stat…"
          ariaLabel="Add stat"
          options={free.map((k) => ({ value: k, label: STAT_LABELS[k] }))}
          onChange={(k) => onChange([...value, { stat: k as StatKey, factor: 1 }])}
        />
      )}
      {value.length > 0 && (
        <p className="muted small">
          Points = {value.map((d) => `${d.factor} × ${STAT_LABELS[d.stat]}`).join(' + ')}
        </p>
      )}
    </fieldset>
  );
}
