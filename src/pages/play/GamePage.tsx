import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { HelpTip } from '../../components/HelpTip';
import { Dropdown } from '../../components/Dropdown';
import { MinusIcon, PlusIcon, RoundIcon, SkullIcon, TileIcon } from '../../components/Icons';
import { TileThumb, UnitThumb } from '../../components/Thumbs';
import { UnitCard } from '../../components/UnitCard';
import { repos } from '../../data/repositories';
import type { SavedGame } from '../../data/savedGame';
import { bossesOf, canRedrawTile, changeEnemies, drawActivation, findUnit, redrawTile, enemiesOnBoard, foundObjectives, isObjectiveUnlocked, lockedObjectives, exploreTile, toggleObjective, type GameSnapshot } from '../../game/engine';
import { CardPile, isDrawnCard, PlayCard, QuestCard, type QuestState } from './Cards';
import { describe, describedText } from './describe';
import { markerName } from '../../domain/markers';

const MAX_HISTORY = 200;
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
type Tab = 'tiles' | 'log';

export function GamePage() {
  const { id } = useParams();
  const [game, setGame] = useState<SavedGame | null | undefined>(undefined);
  const [tab, setTab] = useState<Tab>('tiles');
  const [openUnit, setOpenUnit] = useState<string | null>(null);
  // Tile extra rules are shown by default; this holds the tiles the players collapsed.
  const [collapsedTiles, setCollapsedTiles] = useState<string[]>([]);
  const [openQuest, setOpenQuest] = useState<string | null>(null);

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
  const tileName = (tid: string) => {
    const t = cat.tiles.find((x) => x.id === tid);
    return t ? `Tile ${t.code} – ${t.name}` : '?';
  };
  // Enemies panel: bosses first, then the enemy list's units.
  const boardUnits = [...bossesOf(cat), ...cat.units.filter((u) => !u.isBoss)];
  const objectiveName = (id?: string) => cat.objectives.find((x) => x.id === id)?.name ?? '';
  // Objectives the players know about, as quest cards: found, locked, or known but not found yet.
  const questCards = s.placements
    .filter((p) => found.has(p.objectiveId) || locked.has(p.objectiveId) || isObjectiveUnlocked(p.objectiveId, s.completedObjectives, cat))
    .map((p) => {
      const o = cat.objectives.find((x) => x.id === p.objectiveId);
      const state: QuestState = locked.has(p.objectiveId)
        ? 'locked'
        : !found.has(p.objectiveId)
          ? 'unfound'
          : s.completedObjectives.includes(p.objectiveId)
            ? 'done'
            : 'open';
      return {
        id: p.objectiveId,
        name: o?.name ?? '',
        state,
        where: p.tileId ? `${tileName(p.tileId)}${p.markerLabel ? `, ${p.markerLabel} marker` : ''}` : 'Not on the map',
        requires: objectiveName(o?.revealedBy),
        flavour: (state === 'locked' ? o?.lockedFlavour : state === 'unfound' ? '' : o?.flavour)?.trim(),
        text:
          state === 'locked'
            ? o?.lockedText?.trim() || 'It can’t be completed yet.'
            : state === 'unfound'
              ? 'Not discovered yet: it is on a tile that hasn’t been explored.'
              : o?.completion?.trim(),
      };
    });
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

      <div className="game-layout">
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
                  action={
                    e.kind === 'tile' && canRedrawTile(s) ? (
                      <span className="redraw">
                        <button className="small" onClick={() => draw(() => redrawTile(s, cat))}>
                          ↻ Redraw tile
                        </button>
                        <span className="muted small">if it can’t be placed</span>
                        <HelpTip rule="redrawTile" />
                      </span>
                    ) : undefined
                  }
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
            {/* One boss deck per boss on the board; drawn automatically when the boss activates. */}
            {Object.entries(s.bosses ?? {}).map(([bossId, b]) => (
              <CardPile
                key={bossId}
                kind="boss"
                label={findUnit(cat, bossId)?.name ?? 'Boss'}
                count={b.drawPile.length}
                note={b.drawPile.length ? `${plural(b.drawPile.length, 'boss card')} left` : 'Reshuffles on next activation'}
              />
            ))}
          </div>
          <div className="table-controls">
            <button className="ghost undo" onClick={undo} disabled={game.history.length === 0}>
              ↶ Undo
            </button>
          </div>
        </section>
        <aside className="game-side">
          <section className="side-panel">
            <h3>Enemies on the board</h3>
                <ul className="list">
                  {boardUnits
                    .filter((u) => (s.inPlay[u.id] ?? 0) > 0)
                    .map((u) => {
                      const n = s.inPlay[u.id];
                      if (u.isBoss)
                        return (
                          <li key={u.id} className="card enemy-row boss-row">
                            <div className="row between">
                              <UnitThumb unit={u} />
                              <button className="ghost grow left" onClick={() => setOpenUnit(openUnit === u.id ? null : u.id)}>
                                <span className="enemy-name">
                                  <span className="crown" aria-hidden="true">♛</span>
                                  <strong>{u.name}</strong>
                                  <span className="badge boss-badge">Boss</span>
                                </span>
                                <small className="muted">
                                  {plural(s.bosses?.[u.id]?.drawPile.length ?? 0, 'boss card')} left · tap for card
                                </small>
                              </button>
                              <button className="small" title="The boss is slain" onClick={() => apply(changeEnemies(s, cat, u.id, -1))}>
                                Defeated
                              </button>
                            </div>
                            {openUnit === u.id && <UnitCard unit={u} abilities={cat.abilities} />}
                          </li>
                        );
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
                    .filter((u) => !u.isBoss && (s.inPlay[u.id] ?? 0) < u.count)
                    .map((u) => ({ value: u.id, label: `${u.name} (${u.count - (s.inPlay[u.id] ?? 0)} free)` }))}
                  onChange={(unitId) => apply(changeEnemies(s, cat, unitId, 1))}
                />
        
          </section>
          <section className="side-panel">
            <h3>Objectives</h3>
            <div className="quest-grid">
              {questCards.map((q) => (
                <QuestCard
                  key={q.id}
                  {...q}
                  expanded={openQuest === q.id}
                  onToggle={() => setOpenQuest(openQuest === q.id ? null : q.id)}
                  onComplete={q.state === 'open' || q.state === 'done' ? () => apply(toggleObjective(s, cat, q.id)) : undefined}
                />
              ))}
            </div>
            {questCards.length === 0 && <p className="muted small">No objectives found yet. Keep exploring.</p>}
            {hiddenCount > 0 && (
              <small className="muted">{hiddenCount === 1 ? '1 more objective is' : `${hiddenCount} more objectives are`} still hidden.</small>
            )}
            {s.placements.length > 0 && s.completedObjectives.length === s.placements.length && (
              <p className="victory">All objectives complete: the heroes are victorious!</p>
            )}
          </section>
        </aside>
      </div>
      <p className="muted small center">
        The game is saved automatically after every draw. How the activation deck works <HelpTip rule="activationDeck" />
      </p>

      <nav className="tabs">
        {(['tiles', 'log'] as Tab[]).map((t) => (
          <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>
            {t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </nav>

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
                      <small className="muted"> · markers {t.markers.map(markerName).join(', ')}</small>
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

