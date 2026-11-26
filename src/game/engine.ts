// Pure game logic: no UI, no database. Every action takes a snapshot and
// returns a new one, which makes save/load and undo trivial.
import { startTileIdOf } from '../domain/mapSets';
import { markerName } from '../domain/markers';
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
  /** Boss units the mission's objectives can summon (games saved before bosses have none). */
  bosses?: Unit[];
}

export interface GameConfig {
  difficulty: Difficulty;
  heroCount: number;
}

export type ActivationCard = { kind: 'hero' } | { kind: 'enemy' } | { kind: 'spawn' } | { kind: 'boss'; bossId: string };

export interface Placement {
  objectiveId: string;
  tileId: string;
  /** Name of the marker the objective is on (e.g. "Altar"). */
  markerLabel?: string;
}

export interface SpawnResult {
  tileId: string;
  unitId: string;
  count: number;
}

export type GameEvent =
  /** `locked`: objectives on the tile whose prerequisite isn't completed yet. */
  | { kind: 'start'; tileId: string; placements: Placement[]; locked?: Placement[] }
  | { kind: 'round'; round: number }
  | { kind: 'hero' }
  /** `replacedSpawn`: a spawn card drawn while no miniatures were left to spawn. */
  | { kind: 'activate'; tileIds: string[]; replacedSpawn?: boolean }
  /** `replacedActivation`: an enemy activation card drawn while no enemies were on the board. */
  | { kind: 'spawn'; tileIds: string[]; spawns: SpawnResult[]; replacedActivation?: boolean }
  /** `replaced`: the tile drawn before this one, which couldn't be placed and went back into the deck. */
  | { kind: 'tile'; tileId: string; placements: Placement[]; locked?: Placement[]; replaced?: string }
  | { kind: 'tileDeckEmpty' }
  | { kind: 'enemiesChanged'; unitId: string; delta: number }
  /** `revealed`: objectives unlocked by completing this one whose tile is already explored. */
  | { kind: 'objective'; objectiveId: string; completed: boolean; revealed?: Placement[] }
  | { kind: 'bossAppears'; bossId: string; objectiveId: string; tileId: string; markerLabel?: string }
  /** `cardId`: the boss deck card drawn ('' if the boss has no cards); `reshuffled`: the boss deck was reshuffled first. */
  | { kind: 'bossActivation'; bossId: string; cardId: string; reshuffled?: boolean }
  | { kind: 'bossDefeated'; bossId: string; completed: string[]; revealed?: Placement[] };

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
  /** Bosses on the board, with their boss deck (draw pile and discard pile of ability ids). */
  bosses?: Record<string, { drawPile: string[]; discard: string[] }>;
  /** Bosses that have been summoned in this game (each appears only once). */
  bossesSummoned?: string[];
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

/** Enemy and boss activation cards: these are never drawn back to back. */
export const isActivationCard = (kind?: ActivationCard['kind']) => kind === 'enemy' || kind === 'boss';

/**
 * One round's deck. Hero cards are generic: any hero who still has their
 * activation token ready may act, so there is one hero card per hero.
 *
 * Enemy and boss activation cards are never placed next to each other: the
 * other cards are shuffled and each activation card goes into a different gap
 * between them. If the previous round ended on one, the deck won't start with
 * one either. Boss cards always get a place; enemy cards fill the rest.
 */
export function buildActivationDeck(
  config: GameConfig,
  rng: Rng,
  previousCard?: ActivationCard['kind'],
  bossCards: ActivationCard[] = [],
): ActivationCard[] {
  const d = DIFFICULTY[config.difficulty];
  const others: ActivationCard[] = [];
  for (let i = 0; i < config.heroCount; i++) others.push({ kind: 'hero' });
  for (let i = 0; i < d.spawnCards; i++) others.push({ kind: 'spawn' });
  const shuffled = rng.shuffle(others);

  // Gap i = position before shuffled[i]; gap n = after the last card.
  const allowedGaps = Array.from({ length: shuffled.length + 1 }, (_, i) => i).filter(
    (g) => !(g === 0 && isActivationCard(previousCard) && shuffled.length > 0),
  );
  const enemies: ActivationCard[] = Array.from({ length: enemyCardCount(config.heroCount, config.difficulty) }, () => ({ kind: 'enemy' }));
  const acts = rng.shuffle([...bossCards, ...enemies].slice(0, allowedGaps.length));
  const gaps = rng.sample(allowedGaps, acts.length);
  const inGap = new Map(gaps.map((g, i) => [g, acts[i]]));

  const deck: ActivationCard[] = [];
  for (let g = 0; g <= shuffled.length; g++) {
    const act = inGap.get(g);
    if (act) deck.push(act);
    if (g < shuffled.length) deck.push(shuffled[g]);
  }
  return deck;
}

// ---- Bosses ---------------------------------------------------------------

export const bossesOf = (cat: GameCatalog): Unit[] => cat.bosses ?? [];

/** A unit of this game: from the enemy list or one of the bosses. */
export function findUnit(cat: GameCatalog, id: string): Unit | undefined {
  return cat.units.find((u) => u.id === id) ?? bossesOf(cat).find((u) => u.id === id);
}

/** Activation cards for the bosses on the board, for a new round. */
function bossCardsFor(s: GameSnapshot, cat: GameCatalog): ActivationCard[] {
  return Object.keys(s.bosses ?? {}).flatMap((bossId) => {
    const n = Math.max(1, findUnit(cat, bossId)?.bossActivations ?? 1);
    return Array.from({ length: n }, () => ({ kind: 'boss' as const, bossId }));
  });
}

/** Put a card into the remaining deck where it isn't next to another activation card (skipped if there is no such place). */
function insertSpaced(deck: ActivationCard[], card: ActivationCard, rng: Rng, lastCard?: ActivationCard['kind']): ActivationCard[] {
  const ok = Array.from({ length: deck.length + 1 }, (_, i) => i).filter((i) => {
    const before = i === 0 ? lastCard : deck[i - 1].kind;
    return !isActivationCard(before) && !isActivationCard(deck[i]?.kind);
  });
  if (!ok.length) return deck;
  const at = ok[rng.int(ok.length)];
  return [...deck.slice(0, at), card, ...deck.slice(at)];
}

/**
 * Bosses summoned by these objectives at this moment ('found' or 'completed').
 * The boss is placed, gets its shuffled boss deck, and its activation cards are
 * shuffled into the remaining activation deck. Each boss appears only once.
 */
function summonBosses(
  s: GameSnapshot,
  cat: GameCatalog,
  objectiveIds: string[],
  when: 'found' | 'completed',
  rng: Rng,
): { s: GameSnapshot; events: GameEvent[] } {
  const events: GameEvent[] = [];
  for (const objectiveId of objectiveIds) {
    const o = cat.objectives.find((x) => x.id === objectiveId);
    if (!o?.summonBossId || (o.summonWhen ?? 'found') !== when) continue;
    const boss = bossesOf(cat).find((u) => u.id === o.summonBossId);
    if (!boss || s.bossesSummoned?.includes(boss.id) || !s.tilesInPlay.length) continue;
    const placement = s.placements.find((p) => p.objectiveId === objectiveId);
    const atObjective = (o.summonAt ?? 'objective') === 'objective' && !!placement?.tileId;
    const tileId = atObjective ? placement!.tileId : rng.sample(s.tilesInPlay, 1)[0];
    const cards = (boss.bossDeck ?? [])
      .filter((c) => cat.abilities.some((a) => a.id === c.abilityId))
      .flatMap((c) => Array.from({ length: Math.max(1, c.copies) }, () => c.abilityId));
    let activationDeck = s.activationDeck;
    for (let i = 0; i < Math.max(1, boss.bossActivations ?? 1); i++) {
      activationDeck = insertSpaced(activationDeck, { kind: 'boss', bossId: boss.id }, rng, s.lastCard);
    }
    s = {
      ...s,
      activationDeck,
      inPlay: { ...s.inPlay, [boss.id]: 1 },
      bosses: { ...(s.bosses ?? {}), [boss.id]: { drawPile: rng.shuffle(cards), discard: [] } },
      bossesSummoned: [...(s.bossesSummoned ?? []), boss.id],
    };
    events.push({ kind: 'bossAppears', bossId: boss.id, objectiveId, tileId, ...(atObjective && placement?.markerLabel ? { markerLabel: placement.markerLabel } : {}) });
  }
  return { s, events };
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
    if (obj.placement === 'none') {
      placements.push({ objectiveId: obj.id, tileId: '' }); // not on the map
      continue;
    }
    const type = objectiveMarkerType(obj).toLowerCase();
    if (type) {
      const options = tiles.flatMap((t) =>
        t.markers
          .map((m, i) => ({ name: markerName(m), key: `${t.id}:${i}` }))
          .filter((m) => m.name.toLowerCase() === type && !used.has(m.key))
          .map((m) => ({ tileId: t.id, markerLabel: m.name, key: m.key })),
      );
      if (options.length) {
        const { key, ...pick } = options[rng.int(options.length)];
        used.add(key);
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
  const game: GameSnapshot = {
    rng: rng.state,
    round: 1,
    activationDeck,
    tileDeck,
    tilesInPlay: startTileId ? [startTileId] : [],
    inPlay: {},
    placements,
    completedObjectives: [],
    log: [],
  };
  const summoned = summonBosses(game, cat, [...startFound], 'found', rng);
  return {
    ...summoned.s,
    rng: rng.state,
    log: [
      [
        {
          kind: 'start',
          tileId: startTileId,
          placements: placements.filter((p) => startFound.has(p.objectiveId)),
          locked: placements.filter((p) => p.tileId === startTileId && !startFound.has(p.objectiveId)),
        },
        ...summoned.events,
      ],
    ],
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
    deck = buildActivationDeck(config, rng, s.lastCard, bossCardsFor(s, cat));
    events.push({ kind: 'round', round });
  }
  const [drawn, ...rest] = deck;
  let inPlay = s.inPlay;
  let bosses = s.bosses;

  // With no enemies on the board, an enemy activation card becomes a spawn card.
  const replacedActivation = drawn.kind === 'enemy' && enemiesOnBoard(s) === 0;
  const kind = replacedActivation ? 'spawn' : drawn.kind;

  if (kind === 'hero') {
    events.push({ kind: 'hero' });
  } else if (drawn.kind === 'boss' && s.bosses?.[drawn.bossId]) {
    // The boss acts: draw the top card of its boss deck (reshuffle the discards when empty).
    const b = s.bosses[drawn.bossId];
    let drawPile = b.drawPile;
    let discard = b.discard;
    const reshuffled = drawPile.length === 0 && discard.length > 0;
    if (reshuffled) {
      drawPile = rng.shuffle(discard);
      discard = [];
    }
    const [cardId = '', ...restPile] = drawPile;
    bosses = { ...s.bosses, [drawn.bossId]: { drawPile: restPile, discard: cardId ? [...discard, cardId] : discard } };
    events.push({ kind: 'bossActivation', bossId: drawn.bossId, cardId, ...(reshuffled ? { reshuffled } : {}) });
  } else if (kind === 'enemy' || kind === 'boss') {
    events.push({ kind: 'activate', tileIds: rng.sample(s.tilesInPlay, activationTileCount(s.tilesInPlay.length)) });
  } else if (!canAnythingSpawn(inPlay, cat)) {
    // No miniatures left to spawn: the spawn card activates the enemies on a single tile instead.
    events.push({ kind: 'activate', tileIds: rng.sample(s.tilesInPlay, 1), replacedSpawn: true });
  } else {
    const tileIds = rng.sample(s.tilesInPlay, spawnTileCount(s.tilesInPlay.length));
    const spawns: SpawnResult[] = [];
    inPlay = { ...inPlay };
    for (const tileId of tileIds) spawns.push(...spawnOnTile(tileId, inPlay, config, cat, rng));
    events.push({ kind: 'spawn', tileIds, spawns, ...(replacedActivation ? { replacedActivation } : {}) });
  }

  return { ...s, rng: rng.state, round, activationDeck: rest, lastCard: kind, inPlay, bosses, log: [...s.log, events] };
}

export function enemiesOnBoard(s: GameSnapshot): number {
  return Object.values(s.inPlay).reduce((sum, n) => sum + n, 0);
}

/** Is there any unit with enough free miniatures for at least its minimum spawn number? */
export function canAnythingSpawn(inPlay: Record<string, number>, cat: GameCatalog): boolean {
  return cat.units.some((u) => !u.isBoss && u.count - (inPlay[u.id] ?? 0) >= Math.max(1, u.spawn.minSpawn));
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

  const primary = rng.weighted(cat.units.filter((u) => !u.isBoss && canSpawn(u)), (u) => u.spawn.priority);
  if (!primary) return results;
  let left = spawn(primary, budget);

  for (const id of primary.spawn.groupedWith) {
    const g = cat.units.find((u) => u.id === id);
    if (!g || g.isBoss || g.id === primary.id || !canSpawn(g)) continue;
    if (left < points.get(g.id)! * Math.max(1, g.spawn.minSpawn)) continue;
    left = spawn(g, left);
  }
  return results;
}

export function exploreTile(s: GameSnapshot, cat: GameCatalog): GameSnapshot {
  if (s.tileDeck.length === 0) return { ...s, log: [...s.log, [{ kind: 'tileDeckEmpty' }]] };
  const [tileId, ...rest] = s.tileDeck;
  const next = { ...s, tileDeck: rest, tilesInPlay: [...s.tilesInPlay, tileId] };
  const locked = s.placements.filter((p) => p.tileId === tileId && !isObjectiveUnlocked(p.objectiveId, s.completedObjectives, cat));
  const placements = newlyFound(s, next, cat);
  const rng = new Rng(s.rng);
  const summoned = summonBosses(next, cat, placements.map((p) => p.objectiveId), 'found', rng);
  return { ...summoned.s, rng: rng.state, log: [...s.log, [{ kind: 'tile', tileId, placements, locked }, ...summoned.events]] };
}

/** The tile drawn by the latest action, if that action was exploring. */
function lastExploredTile(s: GameSnapshot): string | undefined {
  const e = s.log[s.log.length - 1]?.find((x) => x.kind === 'tile');
  return e?.kind === 'tile' ? e.tileId : undefined;
}

/** Can the tile just drawn be swapped for another one? */
export function canRedrawTile(s: GameSnapshot): boolean {
  return lastExploredTile(s) !== undefined && s.tileDeck.length > 0;
}

/**
 * The tile just drawn can't be placed legally (e.g. it would close off the
 * map): put it back into the tile deck at a random position (never on top)
 * and draw another one.
 */
export function redrawTile(s: GameSnapshot, cat: GameCatalog): GameSnapshot {
  const old = lastExploredTile(s);
  if (!old || s.tileDeck.length === 0) return s;
  const rng = new Rng(s.rng);
  const tileDeck = [...s.tileDeck];
  // Below the replacement that is drawn next, so it never ends up on top again
  // (unless it is the only other tile left).
  const minPos = Math.min(2, tileDeck.length);
  tileDeck.splice(minPos + rng.int(tileDeck.length - minPos + 1), 0, old);
  const back: GameSnapshot = { ...s, rng: rng.state, tileDeck, tilesInPlay: s.tilesInPlay.filter((id) => id !== old) };
  const next = exploreTile(back, cat);
  const entry = next.log[next.log.length - 1].map((e) => (e.kind === 'tile' ? { ...e, replaced: old } : e));
  return { ...next, log: [...next.log.slice(0, -1), entry] };
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

/** Objectives that are found: unlocked and their tile has been explored (objectives not on the map: as soon as unlocked). */
export function foundObjectives(s: Pick<GameSnapshot, 'placements' | 'tilesInPlay' | 'completedObjectives'>, cat: GameCatalog): Set<string> {
  const inPlay = new Set(s.tilesInPlay);
  return new Set(
    s.placements
      .filter((p) => (p.tileId === '' || inPlay.has(p.tileId)) && isObjectiveUnlocked(p.objectiveId, s.completedObjectives, cat))
      .map((p) => p.objectiveId),
  );
}

/** Objectives found before their prerequisite was completed: on the table, but locked. */
export function lockedObjectives(s: Pick<GameSnapshot, 'placements' | 'tilesInPlay' | 'completedObjectives'>, cat: GameCatalog): Set<string> {
  const inPlay = new Set(s.tilesInPlay);
  return new Set(
    s.placements
      .filter((p) => inPlay.has(p.tileId) && !isObjectiveUnlocked(p.objectiveId, s.completedObjectives, cat))
      .map((p) => p.objectiveId),
  );
}

/** Placements found in `after` but not in `before` (used to announce newly found objectives). */
function newlyFound(before: GameSnapshot, after: GameSnapshot, cat: GameCatalog): Placement[] {
  const was = foundObjectives(before, cat);
  const now = foundObjectives(after, cat);
  return after.placements.filter((p) => now.has(p.objectiveId) && !was.has(p.objectiveId));
}

/** Record miniatures killed (negative delta) or added by hand (positive delta). Removing a boss defeats it. */
export function changeEnemies(s: GameSnapshot, cat: GameCatalog, unitId: string, delta: number): GameSnapshot {
  const unit = findUnit(cat, unitId);
  if (!unit) return s;
  if (unit.isBoss) return delta < 0 ? defeatBoss(s, cat, unitId) : s; // bosses only arrive through objectives
  const current = s.inPlay[unitId] ?? 0;
  const next = Math.min(unit.count, Math.max(0, current + delta));
  if (next === current) return s;
  return {
    ...s,
    inPlay: { ...s.inPlay, [unitId]: next },
    log: [...s.log, [{ kind: 'enemiesChanged', unitId, delta: next - current }]],
  };
}

/**
 * Complete objectives and apply what follows: objectives they unlock (with a
 * tile already on the table) are revealed, and bosses summoned on completion
 * or on finding the revealed ones appear.
 */
function completeObjectives(
  s: GameSnapshot,
  cat: GameCatalog,
  ids: string[],
  rng: Rng,
): { s: GameSnapshot; revealed: Placement[]; events: GameEvent[] } {
  const next = { ...s, completedObjectives: [...s.completedObjectives, ...ids.filter((id) => !s.completedObjectives.includes(id))] };
  const revealed = newlyFound(s, next, cat);
  const a = summonBosses(next, cat, ids, 'completed', rng);
  const b = summonBosses(a.s, cat, revealed.map((p) => p.objectiveId), 'found', rng);
  return { s: b.s, revealed, events: [...a.events, ...b.events] };
}

/** The boss is killed: it leaves the board, its activation cards leave the deck, and linked objectives are completed. */
function defeatBoss(s: GameSnapshot, cat: GameCatalog, bossId: string): GameSnapshot {
  if (!(s.inPlay[bossId] ?? 0)) return s;
  const rng = new Rng(s.rng);
  const bosses = { ...(s.bosses ?? {}) };
  delete bosses[bossId];
  const base: GameSnapshot = {
    ...s,
    inPlay: { ...s.inPlay, [bossId]: 0 },
    bosses,
    activationDeck: s.activationDeck.filter((c) => !(c.kind === 'boss' && c.bossId === bossId)),
  };
  const ids = cat.objectives
    .filter((o) => o.defeatBossId === bossId && cat.mission.objectiveIds.includes(o.id) && !s.completedObjectives.includes(o.id))
    .map((o) => o.id);
  const done = completeObjectives(base, cat, ids, rng);
  return {
    ...done.s,
    rng: rng.state,
    log: [...s.log, [{ kind: 'bossDefeated', bossId, completed: ids, revealed: done.revealed }, ...done.events]],
  };
}

/** Mark an objective complete (or reopen it). Completing one can reveal the objectives it unlocks and summon bosses. */
export function toggleObjective(s: GameSnapshot, cat: GameCatalog, objectiveId: string): GameSnapshot {
  if (s.completedObjectives.includes(objectiveId)) {
    const next = { ...s, completedObjectives: s.completedObjectives.filter((id) => id !== objectiveId) };
    return { ...next, log: [...s.log, [{ kind: 'objective', objectiveId, completed: false, revealed: [] }]] };
  }
  const rng = new Rng(s.rng);
  const done = completeObjectives(s, cat, [objectiveId], rng);
  return {
    ...done.s,
    rng: rng.state,
    log: [...s.log, [{ kind: 'objective', objectiveId, completed: true, revealed: done.revealed }, ...done.events]],
  };
}

/** Pick a random entry, used for the "Random" options in the play setup. */
export function pickRandom<T>(items: T[]): T | undefined {
  return items[Math.floor(Math.random() * items.length)];
}
