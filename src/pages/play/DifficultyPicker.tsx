import { useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { Dropdown } from '../../components/Dropdown';
import { NumberField } from '../../components/fields';
import { LabelText } from '../../components/HelpTip';
import { newEntity, repos } from '../../data/repositories';
import { useCollection } from '../../data/useCollection';
import { BUILTIN_DIFFICULTIES, DIFFICULTIES, type Difficulty, type DifficultySettings } from '../../domain/types';

export const CUSTOM = '__custom__';
const PRESET = 'preset:';

/** What the play setup needs: the name shown in the game and the values. */
export interface ChosenDifficulty {
  name: string;
  settings: DifficultySettings;
}

const summary = (d: DifficultySettings) =>
  `Spawn size ×${d.budget} · ${d.enemyCardsPerHero} enemy card${d.enemyCardsPerHero === 1 ? '' : 's'} per hero · ${d.spawnCards} spawn card${d.spawnCards === 1 ? '' : 's'} per round · spawn on explore ×${d.exploreSpawn}`;

/**
 * Difficulty choice for a new game: the built-in levels, the player's saved
 * presets, or "Custom" with every value adjustable and savable as a preset.
 */
export function DifficultyPicker({ value, onChange }: { value: string; onChange(choice: string, chosen: ChosenDifficulty): void }) {
  const { user } = useAuth();
  const presets = useCollection(repos.difficultyPresets);
  const [custom, setCustom] = useState<DifficultySettings>(BUILTIN_DIFFICULTIES.Normal);
  const [presetName, setPresetName] = useState('');

  const preset = value.startsWith(PRESET) ? presets.find((p) => p.id === value.slice(PRESET.length)) : undefined;
  const editable = value === CUSTOM || !!preset;
  const current: DifficultySettings = preset ?? (value === CUSTOM ? custom : BUILTIN_DIFFICULTIES[value as Difficulty] ?? BUILTIN_DIFFICULTIES.Normal);

  const choose = (v: string) => {
    const p = v.startsWith(PRESET) ? presets.find((x) => x.id === v.slice(PRESET.length)) : undefined;
    if (v === CUSTOM) setCustom(current); // start from what was selected
    const settings = p ?? (v === CUSTOM ? current : BUILTIN_DIFFICULTIES[v as Difficulty]);
    onChange(v, { name: p?.name ?? (v === CUSTOM ? 'Custom' : v), settings: pick(settings) });
  };
  const update = (patch: Partial<DifficultySettings>) => {
    const next = { ...current, ...patch };
    if (preset) {
      repos.difficultyPresets.put({ ...preset, ...patch });
      onChange(value, { name: preset.name, settings: pick(next) });
    } else {
      setCustom(next);
      onChange(value, { name: 'Custom', settings: next });
    }
  };
  const saveAsPreset = async () => {
    const name = presetName.trim();
    if (!name) return;
    const p = { ...newEntity(user!.id), name, ...pick(current) };
    await repos.difficultyPresets.put(p);
    setPresetName('');
    onChange(PRESET + p.id, { name, settings: pick(current) });
  };
  const deletePreset = async () => {
    if (!preset || !confirm(`Delete the difficulty preset "${preset.name}"?`)) return;
    await repos.difficultyPresets.delete(preset.id);
    onChange('Normal', { name: 'Normal', settings: BUILTIN_DIFFICULTIES.Normal });
  };

  return (
    <div className="field difficulty-picker">
      <LabelText label="Difficulty" help="difficulty" htmlFor="difficulty-select" />
      <Dropdown
        id="difficulty-select"
        value={value}
        onChange={choose}
        options={[
          ...DIFFICULTIES.map((d) => ({ value: d, label: d, group: 'Levels' })),
          ...presets.map((p) => ({ value: PRESET + p.id, label: p.name, group: 'Your presets' })),
          { value: CUSTOM, label: 'Custom…', group: 'Make your own' },
        ]}
      />
      {!editable && <small className="muted">{summary(current)}</small>}
      {editable && (
        <div className="difficulty-custom">
          <div className="grid2">
            <NumberField label="Spawn size (× budget)" help="diffBudget" min={0.1} max={5} step={0.05} value={current.budget} onChange={(budget) => update({ budget })} />
            <NumberField label="Enemy cards per hero" help="diffEnemyCards" min={0.25} max={5} step={0.25} value={current.enemyCardsPerHero} onChange={(enemyCardsPerHero) => update({ enemyCardsPerHero })} />
            <NumberField label="Spawn cards per round" help="diffSpawnCards" min={0} max={6} value={current.spawnCards} onChange={(spawnCards) => update({ spawnCards })} />
            <NumberField label="Spawn on explore (× spawn)" help="diffExploreSpawn" min={0} max={2} step={0.25} value={current.exploreSpawn} onChange={(exploreSpawn) => update({ exploreSpawn })} />
          </div>
          {preset ? (
            <div className="row gap wrap">
              <small className="muted grow">Changes are saved to the preset “{preset.name}”.</small>
              <button className="danger small" onClick={deletePreset}>
                Delete preset
              </button>
            </div>
          ) : (
            <div className="row gap save-preset">
              <input className="grow" placeholder="Preset name, e.g. Brutal" value={presetName} onChange={(e) => setPresetName(e.target.value)} />
              <button className="small" onClick={saveAsPreset} disabled={!presetName.trim()}>
                Save as preset
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Only the difficulty values (drop id, name etc. of a preset). */
function pick(d: DifficultySettings): DifficultySettings {
  return { budget: d.budget, enemyCardsPerHero: d.enemyCardsPerHero, spawnCards: d.spawnCards, exploreSpawn: d.exploreSpawn };
}
