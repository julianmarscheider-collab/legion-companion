import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { HelpTip } from '../../components/HelpTip';
import { Dropdown } from '../../components/Dropdown';
import { MinusIcon, PlusIcon, RoundIcon, SkullIcon, TileIcon } from '../../components/Icons';
import { TileThumb, UnitThumb } from '../../components/Thumbs';
import { UnitCard } from '../../components/UnitCard';
import { repos } from '../../data/repositories';
import type { SavedGame } from '../../data/savedGame';
import { changeEnemies, drawActivation, enemiesOnBoard, foundObjectives, isObjectiveUnlocked, lockedObjectives, exploreTile, toggleObjective, type GameSnapshot } from '../../game/engine';
import { CardPile, isDrawnCard, PlayCard } from './Cards';
import { describe, describedText } from './describe';

const MAX_HISTORY = 200;
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
type Tab = 'enemies' | 'tiles' | 'objectives' | 'log';

export function GamePage() {
  const { id } = useParams();
  const [game, setGame] = useState<SavedGame | null | undefined>(undefined);
  const [tab, setTab] = useState<Tab>('enemies');
  const [openUnit, setOpenUnit] = useState<string | null>(null);
  // Tile extra rules are shown by default; this holds the tiles the players collapsed.
  const [collapsedTiles, setCollapsedTiles] = useState<string[]>([]);

  // The last drawn card glows softly for a moment (set when a pile is clicked, not on undo).
  const activationPile = useRef<HTMLDivElement>(null);
  const tilePile = useRef<HTMLDivElement>(null);
  const [glowAt, setGlowAt] = useState<number | null>(null);

  useEffect(() => {
    repos.games.get(id!).then((g) => setGame(g ?? null));
  }, [id]);

  if (game === undefined) return <p className="page">Loading…</p>;
  if (game === null) return <p className="page">Game not found. <Link to="/play">Back to Play</Link></p>;

  const { snapshot: s, catalog: cat, config } = game;

  // Every action is saved immediately, and the previous state kept for undo.
  const apply = (next: GameSnapshot) => {
    if (next === s) return;
    const updated = { ...game, snapshot: next, history: [...game.history, s].slice(-MAX_HISTORY) };
    setGame(updated);
    repos.games.put(updated);
  };
  const draw = (action: () => GameSnapshot) => {
    setGlowAt(s.log.length + 1);
    apply(action());
  };
  const undo = () => {
    const prev = game.history[game.history.length - 1];
    if (!prev) return;
    const updated = { ...game, snapshot: prev, history: game.history.slice(0, -1) };
    setGame(updated);
    repos.games.put(updated);
  };

  const current = s.log[s.log.length - 1] ?? [];
  const found = foundObjectives(s, cat);
  const locked = lockedObjectives(s, cat); // on the table, prerequisite not completed yet
  const hiddenCount = s.placements.filter((p) => !isObjectiveUnlocked(p.objectiveId, s.completedObjectives, cat) && !locked.has(p.objectiveId)).length;
  const unfoundCount = s.placements.length - found.size - locked.size - hiddenCount;
  const objectiveName = (id?: string) => cat.objectives.find((x) => x.id === id)?.name ?? '';
  const tileName = (tid: string) => {
    const t = cat.tiles.find((x) => x.id === tid);
    return t ? `Tile ${t.code} – ${t.name}` : '?';
  };
  // Tiles tab: tiles with extra rules first, then alphabetically by name.
  const sortTiles = (ids: string[]) => {
    const info = (id: string) => {
      const t = cat.tiles.find((x) => x.id === id);
      return { rules: !!t?.rules?.trim(), name: t?.name ?? '' };
    };
    return [...ids].sort((a, b) => {
      const x = info(a);
      const y = info(b);
      if (x.rules !== y.rules) return x.rules ? -1 : 1;
      return x.name.localeCompare(y.name, undefined, { numeric: true, sensitivity: 'base' });
    });
  };

  return (
    <div className="page game">
      <header className="game-header">
        <div>
          <h1>{cat.mission.name}</h1>
          <div className="game-status">
            <span title="Difficulty">
              <SkullIcon /> {config.difficulty}
            </span>
            <span>
              <RoundIcon /> Round {s.round}
            </span>
            <span>
              <TileIcon /> {plural(s.tilesInPlay.length, 'tile')} in play
            </span>
          </div>
        </div>
        <Link to="/play" className="button ghost">Exit</Link>
      </header>

      <section className="table">
        <div className="card-stage" key={s.log.length}>
          {current.map((e, i) => {
            const drawn = isDrawnCard(e);
            return (
              <PlayCard
                key={i}
                event={e}
                cat={cat}
                small={!drawn && current.some(isDrawnCard)}
                glow={drawn && glowAt === s.log.length}
              />
            );
          })}
        </div>

        <div className="piles">
          <CardPile
            ref={activationPile}
            kind="activation"
            label="Activation deck"
            count={s.activationDeck.length}
            note={s.activationDeck.length ? `${plural(s.activationDeck.length, 'card')} left` : 'Round over: draw to reshuffle'}
            onDraw={() => draw(() => drawActivation(s, config, cat))}
          />
          <CardPile
            ref={tilePile}
            kind="tiles"
            label="Map tiles"
            count={s.tileDeck.length}
            note={s.tileDeck.length ? `${plural(s.tileDeck.length, 'tile')} left` : 'No tiles left'}
            disabled={s.tileDeck.length === 0}
            onDraw={() => draw(() => exploreTile(s, cat))}
          />
        </div>
        <div className="table-controls">
          <button className="ghost undo" onClick={undo} disabled={game.history.length === 0}>
            ↶ Undo
          </button>
        </div>
      </section>
      <p className="muted small center">
        The game is saved automatically after every draw. How the activation deck works <HelpTip rule="activationDeck" />
      </p>

      {/* Found objectives, with a "Completed" checkbox right in the play area */}
      {s.placements.some((p) => found.has(p.objectiveId) || locked.has(p.objectiveId)) && (
        <section className="objective-checklist card">
          <h3>Objectives</h3>
          {s.placements
            .filter((p) => found.has(p.objectiveId) || locked.has(p.objectiveId))
            .map((p) => {
              const o = cat.objectives.find((x) => x.id === p.objectiveId);
              const done = s.completedObjectives.includes(p.objectiveId);
              if (locked.has(p.objectiveId))
                return (
                  <div key={p.objectiveId} className="objective-check locked">
                    <span className="lock" aria-hidden="true">🔒</span>
                    <span>
                      {o?.name}
                      <small className="muted"> · requires “{objectiveName(o?.revealedBy)}”</small>
                    </span>
                  </div>
                );
              return (
                <label key={p.objectiveId} className={`objective-check ${done ? 'done' : ''}`}>
                  <input type="checkbox" checked={done} onChange={() => apply(toggleObjective(s, cat, p.objectiveId))} />
                  <span>
                    {o?.name}
                    <small className="muted"> · {tileName(p.tileId)}{p.markerLabel ? `, marker ${p.markerLabel}` : ''}</small>
                  </span>
                </label>
              );
            })}
          {hiddenCount + unfoundCount > 0 && (
            <small className="muted">
              {[unfoundCount > 0 && `${unfoundCount} not discovered yet`, hiddenCount > 0 && `${hiddenCount} still hidden`].filter(Boolean).join(' · ')}
            </small>
          )}
        </section>
      )}

      <nav className="tabs">
        {(['enemies', 'tiles', 'objectives', 'log'] as Tab[]).map((t) => (
          <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>
            {t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </nav>

      {tab === 'enemies' && (
        <>
          <ul className="list">
            {cat.units
              .filter((u) => (s.inPlay[u.id] ?? 0) > 0)
              .map((u) => {
                const n = s.inPlay[u.id];
                return (
                  <li key={u.id} className="card enemy-row">
                    <div className="row between">
                      <UnitThumb unit={u} />
                      <button className="ghost grow left" onClick={() => setOpenUnit(openUnit === u.id ? null : u.id)}>
                        <span className="enemy-name">
                          <strong>{u.name}</strong>
                          <span className="board-count" aria-label={`${n} on the board`}>×{n}</span>
                        </span>
                        <small className="muted">{u.count} owned · tap for card</small>
                      </button>
                      <div className="row gap">
                        <button title="Killed: remove one" aria-label={`Remove one ${u.name}`} onClick={() => apply(changeEnemies(s, cat, u.id, -1))}><MinusIcon /></button>
                        <button title="Add one" aria-label={`Add one ${u.name}`} onClick={() => apply(changeEnemies(s, cat, u.id, 1))} disabled={n >= u.count}><PlusIcon /></button>
                      </div>
                    </div>
                    {openUnit === u.id && <UnitCard unit={u} abilities={cat.abilities} />}
                  </li>
                );
              })}
            {enemiesOnBoard(s) === 0 && <li className="muted center">No enemies on the board.</li>}
          </ul>
          <Dropdown
            action
            className="add-enemy"
            value=""
            placeholder="+ Add enemy by hand…"
            ariaLabel="Add enemy by hand"
            options={cat.units
              .filter((u) => (s.inPlay[u.id] ?? 0) < u.count)
              .map((u) => ({ value: u.id, label: `${u.name} (${u.count - (s.inPlay[u.id] ?? 0)} free)` }))}
            onChange={(unitId) => apply(changeEnemies(s, cat, unitId, 1))}
          />
        </>
      )}

      {tab === 'tiles' && (
        <ul className="list">
          {sortTiles(s.tilesInPlay).map((tid) => {
            const t = cat.tiles.find((x) => x.id === tid);
            const rules = t?.rules?.trim();
            const open = !collapsedTiles.includes(tid);
            return (
              <li key={tid} className="card tile-row">
                <div className="row between">
                  {t && <TileThumb tile={t} />}
                  <div className="grow">
                    <strong>{tileName(tid)}</strong>
                    {t?.markers.length ? (
                      <small className="muted"> · markers {t.markers.map((m) => `${m.label} (${m.type})`).join(', ')}</small>
                    ) : null}
                  </div>
                  {rules && (
                    <button className="small" aria-expanded={open} onClick={() => setCollapsedTiles(open ? [...collapsedTiles, tid] : collapsedTiles.filter((x) => x !== tid))}>
                      Extra rules {open ? '▴' : '▾'}
                    </button>
                  )}
                </div>
                {rules && open && <p className="tile-rules">{rules}</p>}
              </li>
            );
          })}
        </ul>
      )}

      {tab === 'objectives' && (
        <ul className="list">
          {s.placements.filter((p) => isObjectiveUnlocked(p.objectiveId, s.completedObjectives, cat) || locked.has(p.objectiveId)).map((p) => {
            const o = cat.objectives.find((x) => x.id === p.objectiveId);
            const isFound = found.has(p.objectiveId);
            if (locked.has(p.objectiveId))
              return (
                <li key={p.objectiveId} className="card locked">
                  <div className="row between">
                    <strong>🔒 {o?.name}</strong>
                    <small className="muted">requires “{objectiveName(o?.revealedBy)}”</small>
                  </div>
                  {o?.lockedFlavour?.trim() && <p className="flavour">{o.lockedFlavour.trim()}</p>}
                  <small className="muted">On {tileName(p.tileId)}{p.markerLabel ? `, marker ${p.markerLabel}` : ''}</small>
                  <p>{o?.lockedText?.trim() || 'It can’t be completed yet.'}</p>
                </li>
              );
            const done = s.completedObjectives.includes(p.objectiveId);
            return (
              <li key={p.objectiveId} className={`card ${done ? 'done' : ''}`}>
                <div className="row between">
                  <strong>{o?.name}</strong>
                  {isFound && (
                    <label className="objective-check inline">
                      <input type="checkbox" checked={done} onChange={() => apply(toggleObjective(s, cat, p.objectiveId))} />
                      <span>Completed</span>
                    </label>
                  )}
                </div>
                {isFound ? (
                  <>
                    {o?.flavour?.trim() && <p className="flavour">{o.flavour.trim()}</p>}
                    <small className="muted">On {tileName(p.tileId)}{p.markerLabel ? `, marker ${p.markerLabel}` : ''}</small>
                    {o?.completion && <p>{o.completion}</p>}
                  </>
                ) : (
                  <small className="muted">Not discovered yet — keep exploring.</small>
                )}
              </li>
            );
          })}
          {hiddenCount > 0 && (
            <li className="muted center small">
              {hiddenCount === 1 ? '1 more objective is' : `${hiddenCount} more objectives are`} still hidden.
            </li>
          )}
          {s.placements.length > 0 && s.completedObjectives.length === s.placements.length && (
            <li className="card victory">All objectives complete — the heroes are victorious!</li>
          )}
        </ul>
      )}

      {tab === 'log' && (
        <ol className="log" reversed>
          {[...s.log].reverse().map((entry, i) => (
            <li key={s.log.length - i}>
              {entry.map((e, j) => {
                const d = describe(e, cat);
                return <div key={j}><strong>{d.title}</strong>: {describedText(d).map((l, k) => <span key={k}>{l} </span>)}</div>;
              })}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

