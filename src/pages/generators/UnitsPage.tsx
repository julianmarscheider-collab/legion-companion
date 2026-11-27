import { CrudPage, type EditorProps } from '../../components/CrudPage';
import { Checkbox, PickList, NumberField, SelectField, TextArea, TextField } from '../../components/fields';
import { BossDeckEditor } from '../../components/BossDeckEditor';
import { HelpTip } from '../../components/HelpTip';
import { PhotoField } from '../../components/PhotoField';
import { MiniCount, PointsBreakdown, StatLine } from '../../components/UnitCard';
import { newEntity, repos } from '../../data/repositories';
import { useCollection } from '../../data/useCollection';
import { abilityCostLabelFor, unitPoints } from '../../domain/points';
import { DEFENSE_TYPES, type Unit } from '../../domain/types';

/** All faction names used by these units, sorted. */
export function factionsOf(units: Unit[]): string[] {
  return [...new Set(units.map((u) => (u.faction ?? '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

export const newUnit = (ownerId: string): Unit => ({
  ...newEntity(ownerId), name: '', faction: '', description: '', photos: [], strength: 3, damage: 1, defense: 3, defenseType: 'None',
  speed: 2, toughness: 1, attacks: 1, wounds: 1, abilityIds: [], count: 1,
  spawn: { priority: 5, groupedWith: [], minSpawn: 1 },
});

function UnitEditor({ value: u, onChange }: EditorProps<Unit>) {
  const abilities = useCollection(repos.abilities);
  const units = useCollection(repos.units);
  const set = (patch: Partial<Unit>) => onChange({ ...u, ...patch });
  const setSpawn = (patch: Partial<Unit['spawn']>) => set({ spawn: { ...u.spawn, ...patch } });

  return (
    <div className="form">
      <div className="grid2">
        <TextField label="Name" value={u.name} onChange={(name) => set({ name })} placeholder="e.g. Skeleton Warrior" />
        <TextField label="Faction" help="faction" suggestions={factionsOf(units)} value={u.faction ?? ''} onChange={(faction) => set({ faction })} placeholder="e.g. Undead" />
      </div>
      <PhotoField photos={u.photos} onChange={(photos) => set({ photos })} />
      <PointsBreakdown unit={u} abilities={abilities} />

      <h3>Stats</h3>
      <div className="grid3">
        <NumberField label="Strength" help="strength" min={1} max={7} value={u.strength} onChange={(strength) => set({ strength })} />
        <NumberField label="Attacks" help="attacks" min={1} max={20} value={u.attacks ?? 1} onChange={(attacks) => set({ attacks })} />
        <NumberField label="Damage" help="damage" min={0} max={20} value={u.damage} onChange={(damage) => set({ damage })} />
        <NumberField label="Defense" help="defense" min={1} max={7} value={u.defense} onChange={(defense) => set({ defense })} />
        <SelectField label="Defense type" help="defenseType" value={u.defenseType} onChange={(defenseType) => set({ defenseType })} options={DEFENSE_TYPES.map((d) => ({ value: d, label: d }))} />
        <NumberField label="Speed" help="speed" min={1} max={10} value={u.speed} onChange={(speed) => set({ speed })} />
        <NumberField label="Toughness" help="toughness" min={1} max={50} value={u.toughness} onChange={(toughness) => set({ toughness })} />
        <NumberField label="Wounds" help="wounds" min={1} max={50} value={u.wounds ?? 1} onChange={(wounds) => set({ wounds })} />
      </div>

      <PickList
        label="Special abilities"
        help="abilities"
        items={abilities.filter((a) => !a.bossCard)}
        selected={u.abilityIds}
        onChange={(abilityIds) => set({ abilityIds })}
        extra={(a) => `(${abilityCostLabelFor(a, u)})`}
        noItemsText="Create abilities in the Ability generator first."
      />

      <h3 className="label-text">
        Boss <HelpTip rule="isBoss" />
      </h3>
      <Checkbox label="This unit is a boss" help="isBoss" checked={!!u.isBoss} onChange={(isBoss) => set({ isBoss })} />
      {u.isBoss && (
        <>
          <NumberField label="Boss activations per round" help="bossActivations" min={1} max={5} value={u.bossActivations ?? 1} onChange={(bossActivations) => set({ bossActivations })} />
          <BossDeckEditor deck={u.bossDeck ?? []} cards={abilities.filter((a) => a.bossCard)} onChange={(bossDeck) => set({ bossDeck })} />
        </>
      )}

      <h3 className="label-text">
        Miniatures & spawning <HelpTip rule="spawnBudget" />
      </h3>
      {u.isBoss && <p className="muted small">Bosses never spawn normally; they only appear when an objective summons them.</p>}
      <div className="grid3">
        <NumberField label="Miniatures owned" help="count" min={0} max={200} value={u.count} onChange={(count) => set({ count })} />
        <NumberField label="Spawn priority" help="priority" min={1} max={10} value={u.spawn.priority} onChange={(priority) => setSpawn({ priority })} />
        <NumberField label="Min spawn number" help="minSpawn" min={1} max={50} value={u.spawn.minSpawn} onChange={(minSpawn) => setSpawn({ minSpawn })} />
      </div>
      <PickList
        label="Spawned together with"
        help="groupedWith"
        items={units.filter((x) => x.id !== u.id)}
        selected={u.spawn.groupedWith}
        onChange={(groupedWith) => setSpawn({ groupedWith })}
        extra={(x) => <MiniCount count={x.count} />}
      />
      <TextArea label="Notes" value={u.description} onChange={(description) => set({ description })} />
    </div>
  );
}

export function UnitsPage() {
  const abilities = useCollection(repos.abilities);
  return (
    <CrudPage
      title="Enemies"
      intro="Your enemy units. Point values are calculated from stats and abilities."
      groups={{ label: 'faction', get: (u) => u.faction ?? '', emptyLabel: 'No faction' }}
      repo={repos.units}
      create={newUnit}
      Editor={UnitEditor}
      summary={(u) => (
        <div className="row gap">
          {u.photos[0] ? <img className="thumb" src={u.photos[0]} alt="" /> : <div className="thumb placeholder" />}
          <div className="grow">
            <div className="row between">
              <strong>
                {u.name} <MiniCount count={u.count} /> {u.isBoss && <span className="badge boss-badge">Boss</span>}
              </strong>
              <span className="points">{unitPoints(u, abilities)} pts</span>
            </div>
            <small className="muted unit-meta">
              {u.faction && <i className="faction">{u.faction}</i>}
              <StatLine unit={u} />
            </small>
          </div>
        </div>
      )}
    />
  );
}
