import { CrudPage, type EditorProps } from '../../components/CrudPage';
import { Checkbox, PickList, NumberField, SelectField, TextArea, TextField } from '../../components/fields';
import { LabelText } from '../../components/HelpTip';
import { PhotoField } from '../../components/PhotoField';
import { MiniCount } from '../../components/UnitCard';
import { TileThumb } from '../../components/Thumbs';
import { factionsOf } from './UnitsPage';
import { newEntity, repos } from '../../data/repositories';
import { useCollection } from '../../data/useCollection';
import { placementLabel } from '../../domain/objectives';
import { abilityCostLabel, isMultiplier, unitPoints } from '../../domain/points';
import type { Ability, CostType, EnemyList, MapSet, MapTile, Mission, Objective } from '../../domain/types';

// ---- Abilities --------------------------------------------------------------

function AbilityEditor({ value: a, onChange }: EditorProps<Ability>) {
  return (
    <div className="form">
      <TextField label="Name" value={a.name} onChange={(name) => onChange({ ...a, name })} />
      <SelectField<CostType>
        label="Cost type"
        help="abilityCostType"
        value={a.costType ?? 'add'}
        onChange={(costType) => onChange({ ...a, costType, multiplier: a.multiplier ?? 1.25 })}
        options={[
          { value: 'add', label: 'Additive: + points' },
          { value: 'multiply', label: 'Multiplicative: × unit points' },
        ]}
      />
      {isMultiplier(a) ? (
        <NumberField label="Multiplier" help="abilityMultiplier" min={0} max={10} step={0.05} value={a.multiplier ?? 1} onChange={(multiplier) => onChange({ ...a, multiplier })} />
      ) : (
        <NumberField label="Points" help="abilityPoints" min={-100} max={500} value={a.points} onChange={(points) => onChange({ ...a, points })} />
      )}
      <TextArea label="Rules text" help="abilityText" rows={5} value={a.description} onChange={(description) => onChange({ ...a, description })} />
    </div>
  );
}

export function AbilitiesPage() {
  return (
    <CrudPage
      title="Abilities"
      intro="Special abilities you can give to units, with their point cost."
      repo={repos.abilities}
      create={(o) => ({ ...newEntity(o), name: '', description: '', points: 1 })}
      Editor={AbilityEditor}
      summary={(a) => (
        <div>
          <div className="row between"><strong>{a.name}</strong><span className="points">{abilityCostLabel(a)}</span></div>
          <small className="muted">{a.description}</small>
        </div>
      )}
    />
  );
}

// ---- Enemy lists ------------------------------------------------------------

function EnemyListEditor({ value: l, onChange }: EditorProps<EnemyList>) {
  const units = useCollection(repos.units);
  const abilities = useCollection(repos.abilities);
  return (
    <div className="form">
      <TextField label="Name" value={l.name} onChange={(name) => onChange({ ...l, name })} />
      <TextArea label="Description" value={l.description} onChange={(description) => onChange({ ...l, description })} />
      <PickList
        label="Units that can spawn"
        help="enemyListUnits"
        items={units}
        selected={l.unitIds}
        onChange={(unitIds) => onChange({ ...l, unitIds })}
        extra={(u) => (
          <>
            <MiniCount count={u.count} /> ({unitPoints(u, abilities)} pts)
          </>
        )}
        noItemsText="Create units first."
      />
      {factionsOf(units).length > 0 && (
        <select
          className="add-enemy"
          value=""
          aria-label="Add all units of a faction"
          onChange={(e) => {
            const add = units.filter((u) => (u.faction ?? '').trim() === e.target.value && !l.unitIds.includes(u.id));
            onChange({ ...l, unitIds: [...l.unitIds, ...add.map((u) => u.id)] });
          }}
        >
          <option value="">+ Add all units of a faction…</option>
          {factionsOf(units).map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

export function EnemyListsPage() {
  return (
    <CrudPage
      title="Enemy lists"
      intro="Choose which units can spawn during a game."
      repo={repos.enemyLists}
      create={(o) => ({ ...newEntity(o), name: '', description: '', unitIds: [] })}
      Editor={EnemyListEditor}
      summary={(l) => (
        <div><strong>{l.name}</strong><br /><small className="muted">{l.unitIds.length} unit types</small></div>
      )}
    />
  );
}

// ---- Objectives -------------------------------------------------------------

function useMarkerTypes() {
  const tiles = useCollection(repos.mapTiles);
  return [...new Set(tiles.flatMap((t) => t.markers.map((m) => m.type)).filter(Boolean))].sort();
}

/** Objectives that (directly or through a chain) are revealed by `id`; picking one of them would make a loop. */
function revealedChain(id: string, all: Objective[]): Set<string> {
  const out = new Set<string>();
  let added = true;
  while (added) {
    added = false;
    for (const x of all) {
      if (x.isStart === false && x.revealedBy && (x.revealedBy === id || out.has(x.revealedBy)) && !out.has(x.id)) {
        out.add(x.id);
        added = true;
      }
    }
  }
  return out;
}

function ObjectiveEditor({ value: o, onChange }: EditorProps<Objective>) {
  const markerTypes = useMarkerTypes();
  const objectives = useCollection(repos.objectives);
  const loop = revealedChain(o.id, objectives);
  const candidates = objectives.filter((x) => x.id !== o.id && !loop.has(x.id));
  const isStart = o.isStart !== false;
  return (
    <div className="form">
      <TextField label="Name" value={o.name} onChange={(name) => onChange({ ...o, name })} />
      <Checkbox label="Start objective" help="objectiveStart" checked={isStart} onChange={(v) => onChange({ ...o, isStart: v })} />
      {!isStart && (
        <SelectField
          label="Revealed by"
          help="objectiveRevealedBy"
          value={o.revealedBy ?? ''}
          onChange={(revealedBy) => onChange({ ...o, revealedBy })}
          options={[
            { value: '', label: '— choose an objective —' },
            ...candidates.map((x) => ({ value: x.id, label: x.name || '(unnamed)' })),
          ]}
        />
      )}
      <SelectField<'marker' | 'tile'>
        label="Placed on"
        help="objectivePlacement"
        value={o.placement ?? 'marker'}
        onChange={(placement) => onChange({ ...o, placement })}
        options={[
          { value: 'marker', label: 'A marker of a certain type' },
          { value: 'tile', label: 'A random tile (anywhere on it)' },
        ]}
      />
      {o.placement !== 'tile' && (
        <TextField label="Marker type" help="markerType" suggestions={markerTypes} value={o.markerType} onChange={(markerType) => onChange({ ...o, markerType })} placeholder="e.g. Altar" />
      )}
      <TextArea label="Flavour text" help="objectiveFlavour" rows={4} value={o.flavour ?? ''} onChange={(flavour) => onChange({ ...o, flavour })} placeholder="e.g. A foul smell rises from the cracked altar…" />
      <TextArea label="Setup when revealed" help="objectiveSetup" value={o.setup} onChange={(setup) => onChange({ ...o, setup })} placeholder="What the players place on the board" />
      <TextArea label="How to complete it" help="objectiveCompletion" value={o.completion} onChange={(completion) => onChange({ ...o, completion })} />
      <TextArea label="Notes" value={o.description} onChange={(description) => onChange({ ...o, description })} />
    </div>
  );
}

export function ObjectivesPage() {
  return (
    <CrudPage
      title="Objectives"
      intro="Objectives are hidden on a map tile marker and revealed when that tile is explored."
      repo={repos.objectives}
      create={(o) => ({ ...newEntity(o), name: '', description: '', flavour: '', placement: 'marker' as const, markerType: '', setup: '', completion: '', isStart: true, revealedBy: '' })}
      Editor={ObjectiveEditor}
      summary={(o) => (
        <div><strong>{o.name}</strong><br /><small className="muted">On: {placementLabel(o)}</small></div>
      )}
    />
  );
}

// ---- Missions ---------------------------------------------------------------

function MissionEditor({ value: m, onChange }: EditorProps<Mission>) {
  const objectives = useCollection(repos.objectives);
  return (
    <div className="form">
      <TextField label="Name" value={m.name} onChange={(name) => onChange({ ...m, name })} />
      <TextArea label="Briefing" rows={4} value={m.description} onChange={(description) => onChange({ ...m, description })} />
      <PickList
        label="Objectives"
        help="missionObjectives"
        items={objectives}
        selected={m.objectiveIds}
        onChange={(objectiveIds) => onChange({ ...m, objectiveIds })}
        extra={(o) => `(${placementLabel(o)})`}
        noItemsText="Create objectives first."
      />
    </div>
  );
}

export function MissionsPage() {
  return (
    <CrudPage
      title="Missions"
      intro="Missions combine objectives. The objectives are placed randomly on the map each game."
      repo={repos.missions}
      create={(o) => ({ ...newEntity(o), name: '', description: '', objectiveIds: [] })}
      Editor={MissionEditor}
      summary={(m) => (
        <div><strong>{m.name}</strong><br /><small className="muted">{m.objectiveIds.length} objectives</small></div>
      )}
    />
  );
}

// ---- Map tiles --------------------------------------------------------------

function MapTileEditor({ value: t, onChange }: EditorProps<MapTile>) {
  const markerTypes = useMarkerTypes();
  const collections = collectionsOf(useCollection(repos.mapTiles));
  const setMarker = (i: number, patch: Partial<MapTile['markers'][number]>) =>
    onChange({ ...t, markers: t.markers.map((m, j) => (j === i ? { ...m, ...patch } : m)) });
  return (
    <div className="form">
      <div className="grid2">
        <TextField label="Tile number / code" help="tileCode" value={t.code} onChange={(code) => onChange({ ...t, code })} placeholder="As printed on the tile" />
        <TextField label="Name" value={t.name} onChange={(name) => onChange({ ...t, name })} />
      </div>
      <TextField label="Collection" help="tileCollection" suggestions={collections} value={t.collection ?? ''} onChange={(collection) => onChange({ ...t, collection })} placeholder="e.g. Dungeon Core Set" />
      <PhotoField photos={t.photos} onChange={(photos) => onChange({ ...t, photos })} />
      <fieldset>
        <legend>
          <LabelText label="Location markers" help="tileMarkers" />
        </legend>
        {t.markers.map((m, i) => (
          <div key={i} className="row gap marker-row">
            <TextField label="Label" value={m.label} onChange={(label) => setMarker(i, { label })} />
            <TextField label="Type" suggestions={markerTypes} value={m.type} onChange={(type) => setMarker(i, { type })} />
            <button className="ghost" title="Remove marker" onClick={() => onChange({ ...t, markers: t.markers.filter((_, j) => j !== i) })}>×</button>
          </div>
        ))}
        <button onClick={() => onChange({ ...t, markers: [...t.markers, { label: String.fromCharCode(65 + t.markers.length), type: '' }] })}>+ Add marker</button>
      </fieldset>
      <TextArea label="Extra rules (optional)" help="tileRules" rows={4} value={t.rules ?? ''} onChange={(rules) => onChange({ ...t, rules })} placeholder="e.g. Difficult terrain: models moving through the water halve their movement." />
      <TextArea label="Notes" value={t.description} onChange={(description) => onChange({ ...t, description })} />
    </div>
  );
}

export function MapTilesPage() {
  return (
    <CrudPage
      title="Map tiles"
      intro="Your physical map tiles and the location markers printed on them."
      groups={{ label: 'collection', get: (t) => t.collection ?? '', emptyLabel: 'No collection' }}
      repo={repos.mapTiles}
      create={(o) => ({ ...newEntity(o), name: '', code: '', collection: '', description: '', photos: [], markers: [], rules: '' })}
      Editor={MapTileEditor}
      summary={(t) => (
        <div className="row gap">
          <TileThumb tile={t} zoom={false} />
          <div>
            <strong>Tile {t.code} – {t.name}</strong><br />
            <small className="muted unit-meta">
              {t.collection && <i className="faction">{t.collection}</i>}
              <span>{t.markers.map((m) => `${m.label}: ${m.type}`).join(', ') || 'No markers'}</span>
            </small>
          </div>
        </div>
      )}
    />
  );
}

// ---- Map sets ---------------------------------------------------------------

/** All collection names used by these tiles, sorted. */
function collectionsOf(tiles: MapTile[]): string[] {
  return [...new Set(tiles.map((t) => (t.collection ?? '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function MapSetEditor({ value: s, onChange }: EditorProps<MapSet>) {
  const tiles = useCollection(repos.mapTiles);
  const chosen = tiles.filter((t) => s.tileIds.includes(t.id));
  const named = tiles.map((t) => ({ ...t, name: `Tile ${t.code} – ${t.name}` }));
  return (
    <div className="form">
      <TextField label="Name" value={s.name} onChange={(name) => onChange({ ...s, name })} />
      <TextArea label="Description" value={s.description} onChange={(description) => onChange({ ...s, description })} />
      <PickList
        label="Tiles in this set"
        help="mapSetTiles"
        items={named}
        selected={s.tileIds}
        onChange={(tileIds) => onChange({ ...s, tileIds, startTileId: tileIds.includes(s.startTileId) ? s.startTileId : (tileIds[0] ?? '') })}
        noItemsText="Create map tiles first."
      />
      {collectionsOf(tiles).length > 0 && (
        <select
          className="add-enemy"
          value=""
          aria-label="Add all tiles of a collection"
          onChange={(e) => {
            const add = tiles.filter((t) => (t.collection ?? '').trim() === e.target.value && !s.tileIds.includes(t.id));
            const tileIds = [...s.tileIds, ...add.map((t) => t.id)];
            onChange({ ...s, tileIds, startTileId: s.startTileId || (tileIds[0] ?? '') });
          }}
        >
          <option value="">+ Add all tiles of a collection…</option>
          {collectionsOf(tiles).map((c) => (
            <option key={c} value={c}>
              {c} ({tiles.filter((t) => (t.collection ?? '').trim() === c).length} tiles)
            </option>
          ))}
        </select>
      )}
      {chosen.length > 0 && (
        <SelectField
          label="Starting tile"
          help="startTile"
          value={s.startTileId}
          onChange={(startTileId) => onChange({ ...s, startTileId })}
          options={chosen.map((t) => ({ value: t.id, label: `Tile ${t.code} – ${t.name}` }))}
        />
      )}
    </div>
  );
}

export function MapSetsPage() {
  return (
    <CrudPage
      title="Map sets"
      intro="A map set is the tile deck for a game: a starting tile plus tiles to explore."
      repo={repos.mapSets}
      create={(o) => ({ ...newEntity(o), name: '', description: '', tileIds: [], startTileId: '' })}
      Editor={MapSetEditor}
      summary={(s) => (
        <div><strong>{s.name}</strong><br /><small className="muted">{s.tileIds.length} tiles</small></div>
      )}
    />
  );
}
