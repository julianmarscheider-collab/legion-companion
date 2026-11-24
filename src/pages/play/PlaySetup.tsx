import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { NumberField, SelectField } from '../../components/fields';
import { newEntity, repos } from '../../data/repositories';
import type { SavedGame } from '../../data/savedGame';
import { useCollection } from '../../data/useCollection';
import { DIFFICULTIES, type Difficulty, type EnemyList } from '../../domain/types';
import { LabelText } from '../../components/HelpTip';
import { factionsOf } from '../generators/UnitsPage';
import { createGame, pickRandom, type GameCatalog } from '../../game/engine';
import { randomSeed } from '../../game/rng';

const RANDOM = '__random__';
const FACTION = 'faction:';
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

export function PlaySetup() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const missions = useCollection(repos.missions);
  const enemyLists = useCollection(repos.enemyLists);
  const mapSets = useCollection(repos.mapSets);
  const units = useCollection(repos.units);
  const abilities = useCollection(repos.abilities);
  const objectives = useCollection(repos.objectives);
  const tiles = useCollection(repos.mapTiles);
  const games = useCollection(repos.games);

  const [missionId, setMissionId] = useState(RANDOM);
  const [enemyListId, setEnemyListId] = useState('');
  const [mapSetId, setMapSetId] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('Normal');
  const [heroCount, setHeroCount] = useState(2);
  const [error, setError] = useState('');

  const factions = factionsOf(units);
  const listId = enemyListId || enemyLists[0]?.id || (factions[0] ? FACTION + factions[0] : '');

  /** A whole faction used as an enemy list. */
  const factionList = (faction: string): EnemyList => ({
    ...newEntity(user!.id),
    id: FACTION + faction,
    name: faction,
    description: `All ${faction} units`,
    unitIds: units.filter((u) => (u.faction ?? '').trim() === faction).map((u) => u.id),
  });
  const setId = mapSetId || mapSets[0]?.id || '';

  const start = async () => {
    setError('');
    const mission = missionId === RANDOM ? pickRandom(missions) : missions.find((m) => m.id === missionId);
    const enemyList: EnemyList | undefined = listId.startsWith(FACTION)
      ? factionList(listId.slice(FACTION.length))
      : enemyLists.find((l) => l.id === listId);
    const mapSet = setId === RANDOM ? pickRandom(mapSets) : mapSets.find((s) => s.id === setId);
    if (!mission) return setError('Create a mission first.');
    if (!enemyList?.unitIds.length) return setError('Pick an enemy list or faction that contains at least one unit.');
    if (!mapSet?.tileIds.length) return setError('Pick a map set that contains at least one tile.');

    const catalog: GameCatalog = {
      mission,
      objectives: objectives.filter((o) => mission.objectiveIds.includes(o.id)),
      enemyList,
      units: enemyList.unitIds.map((id) => units.find((u) => u.id === id)!).filter(Boolean),
      abilities,
      mapSet,
      tiles: tiles.filter((t) => mapSet.tileIds.includes(t.id)),
    };
    const config = { difficulty, heroCount };
    const game: SavedGame = {
      ...newEntity(user!.id),
      name: `${mission.name} (${difficulty})`,
      config,
      catalog,
      snapshot: createGame(config, catalog, randomSeed()),
      history: [],
    };
    await repos.games.put(game);
    navigate(`/game/${game.id}`);
  };

  return (
    <div className="page narrow">
      <h1>Play</h1>
      <section className="card form">
        <h2>New game</h2>
        <SelectField
          label="Mission"
          value={missionId}
          onChange={setMissionId}
          options={[{ value: RANDOM, label: '🎲 Random mission' }, ...missions.map((m) => ({ value: m.id, label: m.name }))]}
        />
        <div className="field">
          <LabelText label="Enemies" help="faction" htmlFor="enemies-select" />
          <select id="enemies-select" value={listId} onChange={(e) => setEnemyListId(e.target.value)}>
            {enemyLists.length > 0 && (
              <optgroup label="Enemy lists">
                {enemyLists.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </optgroup>
            )}
            {factions.length > 0 && (
              <optgroup label="Whole factions">
                {factions.map((f) => (
                  <option key={f} value={FACTION + f}>
                    All {f} ({plural(units.filter((u) => (u.faction ?? '').trim() === f).length, 'unit')})
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </div>
        <SelectField<Difficulty> label="Difficulty" help="difficulty" value={difficulty} onChange={setDifficulty} options={DIFFICULTIES.map((d) => ({ value: d, label: d }))} />
        <SelectField
          label="Map tile set"
          value={setId}
          onChange={setMapSetId}
          options={[...mapSets.map((s) => ({ value: s.id, label: s.name })), { value: RANDOM, label: '🎲 Random map set' }]}
        />
        <NumberField label="Number of heroes" help="heroCount" min={1} max={8} value={heroCount} onChange={setHeroCount} />
        {error && <p className="error">{error}</p>}
        <button className="primary big" onClick={start}>Start game</button>
      </section>

      <section className="card">
        <h2>Load game</h2>
        {games.length === 0 && <p className="muted">No saved games yet.</p>}
        <ul className="list">
          {[...games].sort((a, b) => b.updatedAt - a.updatedAt).map((g) => (
            <li key={g.id} className="row between saved-game">
              <div>
                <strong>{g.name}</strong>
                <br />
                <small className="muted">
                  Round {g.snapshot.round} · {g.snapshot.tilesInPlay.length} tiles · {new Date(g.updatedAt).toLocaleString()}
                </small>
              </div>
              <div className="row gap">
                <button className="primary" onClick={() => navigate(`/game/${g.id}`)}>Load</button>
                <button className="danger" onClick={() => confirm(`Delete "${g.name}"?`) && repos.games.delete(g.id)}>Delete</button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
