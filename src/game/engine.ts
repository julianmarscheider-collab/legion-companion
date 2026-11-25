// Pure game logic: no UI, no database. Every action takes a snapshot and
// returns a new one, which makes save/load and undo trivial.
import { startTileIdOf } from '../domain/mapSets';
import { objectiveMarkerType } from '../domain/objectives';
import { unitPoints } from '../domain/points';
import type { Ability, Difficulty, EnemyList, MapSet, MapTile, Mission, Objective, Unit } from '../domain/types';
import { Rng } from './rng';

/** Everything the game needs, copied in at game start so later edits don't break saves. */
export interface GameCatalog {
  mission: Mission;
  objectives: Objective[];
  enemyList: EnemyList;
  units: Unit[];
  abilities: Ability[];
  mapSet: MapSet;
  tiles: MapTile[];
}

export interface GameConfig {
  difficulty: Difficulty;
  heroCount: number;
}

export type ActivationCard = { kind: 'hero' } | { kind: 'enemy' } | { kind: 'spawn' };

export interface Placement {
  objectiveId: string;
  tileId: string;
  markerLabel?: string;
}

export interface SpawnResult {
  tileId: string;
  unitId: string;
  count: number;
}

export type GameEvent =
  | { kind: 'start'; tileId: string; placements: Placement[] }
  | { kind: 'round'; round: number }
  | { kind: 'hero' }
  | { kind: 'activate'; tileIds: string[] }
  /** `replacedActivation`: an enemy activation card drawn while no enemies were on the board. */
  | { kind: 'spawn'; tileIds: string[]; spawns: SpawnResult[]; replacedActivation?: boolean }
  | { kind: 'tile'; tileId: string; placements: Placement[] }
  | { kind: 'tileDeckEmpty' }
  | { kind: 'enemiesChanged'; unitId: string; delta: number }
  /** `revealed`: objectives unlocked by completing this one whose tile is already explored. */
  | { kind: 'objective'; objectiveId: string; completed: boolean; revealed?: Placement[] };

export interface GameSnapshot {
  rng: number;
  round: number;
  activationDeck: ActivationCard[];
  /** Kind of the most recently drawn activation card (used across reshuffles). */
  lastCard?: ActivationCard['kind'];
  tileDeck: string[];
  tilesInPlay: string[];
  /** Miniatures currently on the table, per unit id. */
  inPlay: Record<string, number>;
  placements: Placement[];
  completedObjectives: string[];
  /** One entry per player action; the last entry is what the app shows now. */
  log: GameEvent[][];
}

// ---- Tuning ---------------------------------------------------------------

const SPAWN_BUDGET_PER_HERO = 10;
// enemyCardsPerHero: placeholder values, to be balanced through playtesting.
const DIFFICULTY = {
  Easy: { budget: 0.75, enemyCardsPerHero: 0.75, spawnCards: 1 },
  Normal: { budget: 1, enemyCardsPerHero: 1, spawnCards: 1 },
  Hard: { budget: 1.3, enemyCardsPerHero: 1.25, spawnCards: 2 },
  Nightmare: { budget: 1.6, enemyCardsPerHero: 1.5, spawnCards: 2 },
} as const;

/** The bigger the board, the more happens. */
export const activationTileCount = (tiles: number) => Math.min(tiles, Math.max(1, Math.ceil(tiles / 3)));
export const spawnTileCount = (tiles: number) => Math.min(tiles, Math.max(1, Math.ceil(tiles / 4)));

// ---- Setup ----------------------------------------------------------------

/**
 * Enemy activation cards per round: scales with number of heroes and difficulty.
 * Capped at the number of hero + spawn cards, because enemy cards may never be
 * drawn back to back and each one needs another card in between.
 */
export function enemyCardCount(heroCount: number, difficulty: Difficulty): number {
  const d = DIFFICULTY[difficulty];
  const wanted = Math.max(1, Math.round(heroCount * d.enemyCardsPerHero));
  return Math.min(wanted, heroCount + d.spawnCards);
}

/**
 * One round's deck. Hero cards are generic: any hero who still has their
 * activation token ready may act, so there is one hero card per hero.
 *
 * Enemy activation cards are never placed next to each other: the other
 * cards are shuffled and each enemy card goes into a different gap between
 * them. If the previous round ended on an enemy card, the deck won't start
 * with one either.
 */
export function buildActivationDeck(config: GameConfig, rng: Rng, previousCard?: ActivationCard['kind']): ActivationCard[] {
  const d = DIFFICULTY[config.difficulty];
  const others: ActivationCard[] = [];
  for (let i = 0; i < config.heroCount; i++) others.push({ kind: 'hero' });
  for (let i = 0; i < d.spawnCards; i++) others.push({ kind: 'spawn' });
  const shuffled = rng.shuffle(others);

  // Gap i = position before shuffled[i]; gap n = after the last card.
  const allowedGaps = Array.from({ length: shuffled.length + 1 }, (_, i) => i).filter(
    (g) => !(g === 0 && previousCard === 'enemy' && shuffled.length > 0),
  );
  const enemyGaps = new Set(rng.sample(allowedGaps, enemyCardCount(config.heroCount, config.difficulty)));

  const deck: ActivationCard[] = [];
  for (let g = 0; g <= shuffled.length; g++) {
    if (enemyGaps.has(g)) deck.push({ kind: 'enemy' });
    if (g < shuffled.length) deck.push(shuffled[g]);
  }
  return deck;
}

function placeObjectives(cat: GameCatalog, rng: Rng): Placement[] {
  const used = new Set<string>();
  const placements: Placement[] = [];
  const tiles = cat.tiles;
  // Starting tiles have no objective location.
  const startId = startTileIdOf(cat.mapSet, cat.tiles);
  const nonStart = tiles.filter((t) => t.id !== startId && !t.isStart);
  const objectives = cat.mission.objectiveIds
    .map((id) => cat.objectives.find((o) => o.id === id))
    .filter((o): o is Objective => !!o);

  const tilesWithObjective = () => new Set(placements.map((p) => p.tileId));
  for (const obj of objectives) {
    const type = objectiveMarkerType(obj).toLowerCase();
    if (type) {
      const options = tiles.flatMap((t) =>
        t.markers
          .filter((m) => m.type.trim().toLowerCase() === type && !used.has(`${t.id}:${m.label}`))
          .map((m) => ({ tileId: t.id, markerLabel: m.label })),
      );
      if (options.length) {
        const pick = options[rng.int(options.length)];
        used.add(`${pick.tileId}:${pick.markerLabel}`);
        placements.push({ objectiveId: obj.id, ...pick });
        continue;
      }
    }
    // Random tile: not the starting tile, and preferably one without another objective.
    const base = nonStart.length ? nonStart : tiles;
    const taken = tilesWithObjective();
    const free = base.filter((t) => !taken.has(t.id));
    const pool = free.length ? free : base;
    if (pool.length) placements.push({ objectiveId: obj.id, tileId: pool[rng.int(pool.length)].id });
  }
  return placements;
}

export function createGame(config: GameConfig, cat: GameCatalog, seed: number): GameSnapshot {
  const rng = new Rng(seed);
  const startTileId = startTileIdOf(cat.mapSet, cat.tiles);
  const placements = placeObjectives(cat, rng);
  const tileDeck = rng.shuffle(cat.mapSet.tileIds.filter((id) => id !== startTileId));
  const activationDeck = buildActivationDeck(config, rng);
  const startFound = foundObjectives({ placements, tilesInPlay: startTileId ? [startTileId] : [], completedObjectives: [] }, cat);
  return {
    rng: rng.state,
    round: 1,
    activationDeck,
    tileDeck,
    tilesInPlay: startTileId ? [startTileId] : [],
    inPlay: {},
    placements,
    completedObjectives: [],
    log: [[{ kind: 'start', tileId: startTileId, placements: placements.filter((p) => startFound.has(p.objectiveId)) }]],
  };
}

// ---- Actions --------------------------------------------------------------

export function drawActivation(s: GameSnapshot, config: GameConfig, cat: GameCatalog): GameSnapshot {
  const rng = new Rng(s.rng);
  const events: GameEvent[] = [];
  let deck = s.activationDeck;
  let round = s.round;
  if (deck.length === 0) {
    round += 1;
    deck = buildActivationDeck(config, rng, s.lastCard);
    events.push({ kind: 'round', round });
  }
  const [drawn, ...rest] = deck;
  let inPlay = s.inPlay;

  // With no enemies on the board, an enemy activation card becomes a spawn card.
  const replacedActivation = drawn.kind === 'enemy' && enemiesOnBoard(s) === 0;
  const kind = replacedActivation ? 'spawn' : drawn.kind;

  if (kind === 'hero') {
    events.push({ kind: 'hero' });
  } else if (kind === 'enemy') {
    events.push({ kind: 'activate', tileIds: rng.sample(s.tilesInPlay, activationTileCount(s.tilesInPlay.length)) });
  } else {
    const tileIds = rng.sample(s.tilesInPlay, spawnTileCount(s.tilesInPlay.length));
    const spawns: SpawnResult[] = [];
    inPlay = { ...inPlay };
    for (const tileId of tileIds) spawns.push(...spawnOnTile(tileId, inPlay, config, cat, rng));
    events.push({ kind: 'spawn', tileIds, spawns, ...(replacedActivation ? { replacedActivation } : {}) });
  }

  return { ...s, rng: rng.state, round, activationDeck: rest, lastCard: kind, inPlay, log: [...s.log, events] };
}

export function enemiesOnBoard(s: GameSnapshot): number {
  return Object.values(s.inPlay).reduce((sum, n) => sum + n, 0);
}

/** Mutates `inPlay`. Returns what to put on the tile. */
export function spawnOnTile(
  tileId: string,
  inPlay: Record<string, number>,
  config: GameConfig,
  cat: GameCatalog,
  rng: Rng,
): SpawnResult[] {
  const points = new Map(cat.units.map((u) => [u.id, unitPoints(u, cat.abilities)]));
  const available = (u: Unit) => u.count - (inPlay[u.id] ?? 0);
  const canSpawn = (u: Unit) => available(u) >= Math.max(1, u.spawn.minSpawn);
  const budget = SPAWN_BUDGET_PER_HERO * Math.max(1, config.heroCount) * DIFFICULTY[config.difficulty].budget;

  const results: SpawnResult[] = [];
  const spawn = (u: Unit, budgetLeft: number) => {
    const pts = points.get(u.id)!;
    const n = Math.min(available(u), Math.max(1, u.spawn.minSpawn, Math.floor(budgetLeft / pts)));
    inPlay[u.id] = (inPlay[u.id] ?? 0) + n;
    results.push({ tileId, unitId: u.id, count: n });
    return budgetLeft - n * pts;
  };

  const primary = rng.weighted(cat.units.filter(canSpawn), (u) => u.spawn.priority);
  if (!primary) return results;
  let left = spawn(primary, budget);

  for (const id of primary.spawn.groupedWith) {
    const g = cat.units.find((u) => u.id === id);
    if (!g || g.id === primary.id || !canSpawn(g)) continue;
    if (left < points.get(g.id)! * Math.max(1, g.spawn.minSpawn)) continue;
    left = spawn(g, left);
  }
  return results;
}

export function exploreTile(s: GameSnapshot, cat: GameCatalog): GameSnapshot {
  if (s.tileDeck.length === 0) return { ...s, log: [...s.log, [{ kind: 'tileDeckEmpty' }]] };
  const [tileId, ...rest] = s.tileDeck;
  const next = { ...s, tileDeck: rest, tilesInPlay: [...s.tilesInPlay, tileId] };
  return { ...next, log: [...s.log, [{ kind: 'tile', tileId, placements: newlyFound(s, next, cat) }]] };
}

// ---- Objective chains ------------------------------------------------------

/**
 * Is this objective known to the players? Start objectives always are. Others
 * only once the objective they are revealed by has been completed. If that
 * objective isn't part of the mission, it counts as a start objective.
 */
export function isObjectiveUnlocked(objectiveId: string, completed: string[], cat: GameCatalog): boolean {
  const o = cat.objectives.find((x) => x.id === objectiveId);
  if (!o || o.isStart !== false || !o.revealedBy) return true;
  if (!cat.mission.objectiveIds.includes(o.revealedBy)) return true;
  return completed.includes(o.revealedBy);
}

/** Objectives that are found: unlocked and their tile has been explored. */
export function foundObjectives(s: Pick<GameSnapshot, 'placements' | 'tilesInPlay' | 'completedObjectives'>, cat: GameCatalog): Set<string> {
  const inPlay = new Set(s.tilesInPlay);
  return new Set(
    s.placements
      .filter((p) => inPlay.has(p.tileId) && isObjectiveUnlocked(p.objectiveId, s.completedObjectives, cat))
      .map((p) => p.objectiveId),
  );
}

/** Placements found in `after` but not in `before` (used to announce newly found objectives). */
function newlyFound(before: GameSnapshot, after: GameSnapshot, cat: GameCatalog): Placement[] {
  const was = foundObjectives(before, cat);
  const now = foundObjectives(after, cat);
  return after.placements.filter((p) => now.has(p.objectiveId) && !was.has(p.objectiveId));
}

/** Record miniatures killed (negative delta) or added by hand (positive delta). */
export function changeEnemies(s: GameSnapshot, cat: GameCatalog, unitId: string, delta: number): GameSnapshot {
  const unit = cat.units.find((u) => u.id === unitId);
  if (!unit) return s;
  const current = s.inPlay[unitId] ?? 0;
  const next = Math.min(unit.count, Math.max(0, current + delta));
  if (next === current) return s;
  return {
    ...s,
    inPlay: { ...s.inPlay, [unitId]: next },
    log: [...s.log, [{ kind: 'enemiesChanged', unitId, delta: next - current }]],
  };
}

/** Mark an objective complete (or reopen it). Completing one can reveal the objectives it unlocks. */
export function toggleObjective(s: GameSnapshot, cat: GameCatalog, objectiveId: string): GameSnapshot {
  const completed = !s.completedObjectives.includes(objectiveId);
  const next = {
    ...s,
    completedObjectives: completed
      ? [...s.completedObjectives, objectiveId]
      : s.completedObjectives.filter((id) => id !== objectiveId),
  };
  // Objectives unlocked now whose tile is already on the table are announced right away.
  const revealed = completed ? newlyFound(s, next, cat) : [];
  return { ...next, log: [...s.log, [{ kind: 'objective', objectiveId, completed, revealed }]] };
}

/** Pick a random entry, used for the "Random" options in the play setup. */
export function pickRandom<T>(items: T[]): T | undefined {
  return items[Math.floor(Math.random() * items.length)];
}
