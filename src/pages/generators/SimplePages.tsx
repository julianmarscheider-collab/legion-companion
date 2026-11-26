import { CrudPage, type EditorProps } from '../../components/CrudPage';
import { Checkbox, PickList, NumberField, SelectField, TextArea, TextField } from '../../components/fields';
import { Dropdown } from '../../components/Dropdown';
import { StatDependencyEditor } from '../../components/StatDependencyEditor';
import { CrownIcon } from '../../components/Icons';
import { LabelText } from '../../components/HelpTip';
import { PhotoField } from '../../components/PhotoField';
import { MiniCount } from '../../components/UnitCard';
import { TileThumb } from '../../components/Thumbs';
import { factionsOf } from './UnitsPage';
import { newEntity, repos } from '../../data/repositories';
import { useCollection } from '../../data/useCollection';
import { startTileIdOf, startTilesOf, startTileWarning } from '../../domain/mapSets';
import { markerName, markerNamesOf } from '../../domain/markers';
import { placementLabel, questlinesOf } from '../../domain/objectives';
import { abilityCostLabel, isMultiplier, unitPoints } from '../../domain/points';
import type { Ability, CostType, EnemyList, MapSet, MapTile, Mission, Objective } from '../../domain/types';

// ---- Abilities --------------------------------------------------------------

/** All collection names used by these abilities / boss cards, sorted. */
export function abilityCollectionsOf(abilities: Ability[]): string[] {
  return [...new Set(abilities.map((a) => (a.collection ?? '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function AbilityEditor({ value: a, onChange }: EditorProps<Ability>) {
  const all = useCollection(repos.abilities);
  return (
    <div className="form">
      <div className="grid2">
        <TextField label="Name" value={a.name} onChange={(name) => onChange({ ...a, name })} />
        <TextField label="Collection" help="abilityCollection" suggestions={abilityCollectionsOf(all)} value={a.collection ?? ''} onChange={(collection) => onChange({ ...a, collection })} placeholder={a.bossCard ? 'e.g. Goblin Warlord' : 'e.g. Undead'} />
      </div>
      <Checkbox label="Boss deck card" help="bossCard" checked={!!a.bossCard} onChange={(bossCard) => onChange({ ...a, bossCard })} />
      {!a.bossCard && (
        <>
          <SelectField<CostType>
            label="Cost type"
            help="abilityCostType"
            value={a.costType ?? 'add'}
            onChange={(costType) => onChange({ ...a, costType, multiplier: a.multiplier ?? 1.25 })}
            options={[
              { value: 'add', label: 'Additive: + points' },
              { value: 'multiply', label: 'Multiplicative: × unit points' },
              { value: 'dependent', label: 'Dependent on stats' },
            ]}
          />
          {a.costType === 'dependent' ? (
            <StatDependencyEditor value={a.dependsOn ?? []} onChange={(dependsOn) => onChange({ ...a, dependsOn })} />
          ) : isMultiplier(a) ? (
            <NumberField label="Multiplier" help="abilityMultiplier" min={0} max={10} step={0.05} value={a.multiplier ?? 1} onChange={(multiplier) => onChange({ ...a, multiplier })} />
          ) : (
            <NumberField label="Points" help="abilityPoints" min={-100} max={500} value={a.points} onChange={(points) => onChange({ ...a, points })} />
          )}
        </>
      )}
      <TextArea label={a.bossCard ? 'What the boss does' : 'Rules text'} help="abilityText" rows={5} value={a.description} onChange={(description) => onChange({ ...a, description })} />
    </div>
  );
}

export function AbilitiesPage() {
  return (
    <CrudPage
      title="Abilities"
      intro="Special abilities you can give to units, and boss deck cards that are drawn when a boss activates."
      repo={repos.abilities}
      create={(o) => ({ ...newEntity(o), name: '', collection: '', description: '', points: 1 })}
      Editor={AbilityEditor}
      groups={[
        { label: 'type', get: (a) => (a.bossCard ? 'Boss deck cards' : 'Abilities'), emptyLabel: '' },
        { label: 'collection', get: (a) => a.collection ?? '', emptyLabel: 'No collection' },
      ]}
      summary={(a) => (
        <div>
          <div className="row between">
            <strong>
              {a.name} {a.bossCard && <span className="badge boss-badge">Boss card</span>}
            </strong>
            {!a.bossCard && <span className="points">{abilityCostLabel(a)}</span>}
          </div>
          <small className="muted unit-meta">
            {a.collection && <i className="faction">{a.collection}</i>}
            <span>{a.description}</span>
          </small>
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
        <Dropdown
          action
          className="add-enemy"
          value=""
          placeholder="+ Add all units of a faction…"
          ariaLabel="Add all units of a faction"
          options={factionsOf(units).map((f) => ({ value: f, label: f }))}
          onChange={(faction) => {
            const add = units.filter((u) => (u.faction ?? '').trim() === faction && !l.unitIds.includes(u.id));
            onChange({ ...l, unitIds: [...l.unitIds, ...add.map((u) => u.id)] });
          }}
        />
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

function useMarkerNames() {
  return markerNamesOf(useCollection(repos.mapTiles));
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
  const bosses = useCollection(repos.units).filter((u) => u.isBoss);
  const markerTypes = useMarkerNames();
  const objectives = useCollection(repos.objectives);
  const loop = revealedChain(o.id, objectives);
  const candidates = objectives.filter((x) => x.id !== o.id && !loop.has(x.id));
  const isStart = o.isStart !== false;
  return (
    <div className="form">
      <div className="grid2">
        <TextField label="Name" value={o.name} onChange={(name) => onChange({ ...o, name })} />
        <TextField label="Questline" help="questline" suggestions={questlinesOf(objectives)} value={o.questline ?? ''} onChange={(questline) => onChange({ ...o, questline })} placeholder="e.g. Prison Break" />
      </div>
      <Checkbox label="Start objective" help="objectiveStart" checked={isStart} onChange={(v) => onChange({ ...o, isStart: v })} />
      {!isStart && (
        <>
          <SelectField
            label="Prerequisite"
            help="objectiveRevealedBy"
            value={o.revealedBy ?? ''}
            onChange={(revealedBy) => onChange({ ...o, revealedBy })}
            options={[
              { value: '', label: '— choose an objective —' },
              ...candidates.map((x) => ({ value: x.id, label: x.name || '(unnamed)' })),
            ]}
          />
          <TextArea label="Flavour text (prerequisite not fulfilled)" help="objectiveLockedFlavour" rows={3} value={o.lockedFlavour ?? ''} onChange={(lockedFlavour) => onChange({ ...o, lockedFlavour })} placeholder="e.g. Behind a locked iron door, someone calls for help…" />
          <TextArea label="Text (prerequisite not fulfilled)" help="objectiveLockedText" rows={3} value={o.lockedText ?? ''} onChange={(lockedText) => onChange({ ...o, lockedText })} placeholder="e.g. The cell door is locked. It can't be opened until a key is found." />
        </>
      )}
      <SelectField<'marker' | 'tile' | 'none'>
        label="Placed on"
        help="objectivePlacement"
        value={o.placement ?? 'marker'}
        onChange={(placement) => onChange({ ...o, placement })}
        options={[
          { value: 'marker', label: 'A marker (by name)' },
          { value: 'tile', label: 'The objective location of a random tile' },
          { value: 'none', label: 'Not on the map (e.g. defeat a boss)' },
        ]}
      />
      {(o.placement ?? 'marker') === 'marker' && (
        <TextField label="Marker" help="markerType" suggestions={markerTypes} value={o.markerType} onChange={(markerType) => onChange({ ...o, markerType })} placeholder="e.g. Altar" />
      )}
      <TextArea label="Flavour text" help="objectiveFlavour" rows={4} value={o.flavour ?? ''} onChange={(flavour) => onChange({ ...o, flavour })} placeholder="e.g. A foul smell rises from the cracked altar…" />
      <TextArea label="Setup when revealed" help="objectiveSetup" value={o.setup} onChange={(setup) => onChange({ ...o, setup })} placeholder="What the players place on the board" />
      <TextArea label="How to complete it" help="objectiveCompletion" value={o.completion} onChange={(completion) => onChange({ ...o, completion })} />
      <fieldset>
        <legend>
          <LabelText label="Boss" help="summonBoss" />
        </legend>
        <SelectField
          label="Summons a boss"
          value={o.summonBossId ?? ''}
          onChange={(summonBossId) => onChange({ ...o, summonBossId })}
          options={[{ value: '', label: '— no boss —' }, ...bosses.map((u) => ({ value: u.id, label: u.name }))]}
        />
        {o.summonBossId && (
          <div className="grid2">
            <SelectField<'found' | 'completed'>
              label="When"
              value={o.summonWhen ?? 'found'}
              onChange={(summonWhen) => onChange({ ...o, summonWhen })}
              options={[
                { value: 'found', label: 'When this objective is found' },
                { value: 'completed', label: 'When it is completed' },
              ]}
            />
            <SelectField<'objective' | 'random'>
              label="Where"
              value={o.summonAt ?? 'objective'}
              onChange={(summonAt) => onChange({ ...o, summonAt })}
              options={[
                { value: 'objective', label: 'At this objective' },
                { value: 'random', label: 'On a random tile in play' },
              ]}
            />
          </div>
        )}
        <SelectField
          label="Completed when this boss is defeated"
          help="defeatBoss"
          value={o.defeatBossId ?? ''}
          onChange={(defeatBossId) => onChange({ ...o, defeatBossId })}
          options={[{ value: '', label: '— not linked to a boss —' }, ...bosses.map((u) => ({ value: u.id, label: u.name }))]}
        />
        {bosses.length === 0 && <small className="muted">Mark a unit as Boss under Units to use these.</small>}
      </fieldset>
      <TextArea label="Notes" value={o.description} onChange={(description) => onChange({ ...o, description })} />
    </div>
  );
}

export function ObjectivesPage() {
  const objectiveNames = new Map(useCollection(repos.objectives).map((o) => [o.id, o.name]));
  return (
    <CrudPage
      title="Objectives"
      intro="Objectives are hidden on a map tile marker and revealed when that tile is explored."
      groups={{ label: 'questline', get: (o) => o.questline ?? '', emptyLabel: 'No questline' }}
      repo={repos.objectives}
      create={(o) => ({ ...newEntity(o), name: '', questline: '', description: '', flavour: '', placement: 'marker' as const, markerType: '', setup: '', completion: '', isStart: true, revealedBy: '' })}
      Editor={ObjectiveEditor}
      summary={(o) => (
        <div>
          <strong>{o.name}</strong>
          <br />
          <small className="muted unit-meta">
            {o.questline && <i className="faction">{o.questline}</i>}
            <span>On: {placementLabel(o)}</span>
            {o.isStart === false && o.revealedBy && <span>🔒 after “{objectiveNames.get(o.revealedBy) ?? '?'}”</span>}
            {o.summonBossId && (
              <span className="with-icon">
                <CrownIcon /> summons a boss
              </span>
            )}
          </small>
        </div>
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
      {questlinesOf(objectives).length > 0 && (
        <Dropdown
          action
          className="add-enemy"
          value=""
          placeholder="+ Add all objectives of a questline…"
          ariaLabel="Add all objectives of a questline"
          options={questlinesOf(objectives).map((q) => ({
            value: q,
            label: `${q} (${objectives.filter((o) => (o.questline ?? '').trim() === q).length} objectives)`,
          }))}
          onChange={(questline) => {
            const add = objectives.filter((o) => (o.questline ?? '').trim() === questline && !m.objectiveIds.includes(o.id));
            onChange({ ...m, objectiveIds: [...m.objectiveIds, ...add.map((o) => o.id)] });
          }}
        />
      )}
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
  const markerTypes = useMarkerNames();
  const collections = collectionsOf(useCollection(repos.mapTiles));
  const setMarker = (i: number, patch: Partial<MapTile['markers'][number]>) =>
    onChange({ ...t, markers: t.markers.map((m, j) => (j === i ? { label: patch.label ?? markerName(m) } : m)) });
  return (
    <div className="form">
      <div className="grid2">
        <TextField label="Tile number / code" help="tileCode" value={t.code} onChange={(code) => onChange({ ...t, code })} placeholder="As printed on the tile" />
        <TextField label="Name" value={t.name} onChange={(name) => onChange({ ...t, name })} />
      </div>
      <Checkbox label="Starting tile" help="startTileFlag" checked={!!t.isStart} onChange={(isStart) => onChange({ ...t, isStart })} />
      <TextField label="Collection" help="tileCollection" suggestions={collections} value={t.collection ?? ''} onChange={(collection) => onChange({ ...t, collection })} placeholder="e.g. Dungeon Core Set" />
      <PhotoField photos={t.photos} onChange={(photos) => onChange({ ...t, photos })} />
      <fieldset>
        <legend>
          <LabelText label="Location markers" help="tileMarkers" />
        </legend>
        {t.markers.map((m, i) => (
          <div key={i} className="row gap marker-row">
            <TextField label="Marker" suggestions={markerTypes} value={markerName(m)} onChange={(label) => setMarker(i, { label })} placeholder="e.g. Altar" />
            <button className="ghost" title="Remove marker" onClick={() => onChange({ ...t, markers: t.markers.filter((_, j) => j !== i) })}>×</button>
          </div>
        ))}
        <button onClick={() => onChange({ ...t, markers: [...t.markers, { label: '' }] })}>+ Add marker</button>
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
      create={(o) => ({ ...newEntity(o), name: '', code: '', collection: '', isStart: false, description: '', photos: [], markers: [], rules: '' })}
      Editor={MapTileEditor}
      summary={(t) => (
        <div className="row gap">
          <TileThumb tile={t} zoom={false} />
          <div>
            <strong>Tile {t.code} – {t.name}</strong>
            {t.isStart && <span className="badge start-badge">Start</span>}
            <br />
            <small className="muted unit-meta">
              {t.collection && <i className="faction">{t.collection}</i>}
              <span>{t.markers.map(markerName).filter(Boolean).join(', ') || 'No markers'}</span>
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
  const named = tiles.map((t) => ({ ...t, name: `Tile ${t.code} – ${t.name}${t.isStart ? ' (starting tile)' : ''}` }));
  const startTile = tiles.find((t) => t.id === startTileIdOf(s, tiles));
  const warning = startTileWarning(s, tiles);
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
        <Dropdown
          action
          className="add-enemy"
          value=""
          placeholder="+ Add all tiles of a collection…"
          ariaLabel="Add all tiles of a collection"
          options={collectionsOf(tiles).map((c) => ({
            value: c,
            label: `${c} (${tiles.filter((t) => (t.collection ?? '').trim() === c).length} tiles)`,
          }))}
          onChange={(collection) => {
            const add = tiles.filter((t) => (t.collection ?? '').trim() === collection && !s.tileIds.includes(t.id));
            const tileIds = [...s.tileIds, ...add.map((t) => t.id)];
            onChange({ ...s, tileIds, startTileId: s.startTileId || (tileIds[0] ?? '') });
          }}
        />
      )}
      {chosen.length > 0 && (
        <div className="field">
          <LabelText label="Starting tile" help="startTile" />
          <p className="start-tile-info">{startTile ? `Tile ${startTile.code} – ${startTile.name}` : '—'}</p>
          {warning && <p className="warning">⚠ {warning}</p>}
        </div>
      )}
    </div>
  );
}

export function MapSetsPage() {
  const tiles = useCollection(repos.mapTiles);
  return (
    <CrudPage
      title="Map sets"
      intro="A map set is the tile deck for a game: a starting tile plus tiles to explore."
      repo={repos.mapSets}
      create={(o) => ({ ...newEntity(o), name: '', description: '', tileIds: [], startTileId: '' })}
      Editor={MapSetEditor}
      summary={(s) => (
        <div>
          <strong>{s.name}</strong>
          <br />
          <small className="muted">{s.tileIds.length} tiles</small>
          {startTilesOf(s, tiles).length > 1 && <small className="warning"> · ⚠ {startTilesOf(s, tiles).length} starting tiles</small>}
        </div>
      )}
    />
  );
}
