import { describe, expect, it } from 'vitest';
import type { MapTile, Unit } from '../domain/types';
import { changeEnemies, createGame, enemiesOnBoard, foundObjectives, isObjectiveUnlocked, toggleObjective, enemyCardCount, drawActivation, exploreTile, type GameCatalog, type GameConfig } from './engine';

const meta = { ownerId: 'o', createdAt: 0, updatedAt: 0 };
const unit = (id: string, over: Partial<Unit> = {}): Unit => ({
  ...meta, id, name: id, description: '', photos: [], strength: 3, damage: 1, defense: 3, defenseType: 'None',
  speed: 2, toughness: 1, abilityIds: [], count: 10,
  spawn: { priority: 5, groupedWith: [], minSpawn: 1 }, ...over,
});
const tile = (id: string, markers: MapTile['markers'] = []): MapTile => ({ ...meta, id, name: id, code: id, description: '', photos: [], markers });

const tiles = [tile('t1'), tile('t2', [{ label: 'A', type: 'Altar' }]), tile('t3'), tile('t4'), tile('t5')];
const cat: GameCatalog = {
  mission: { ...meta, id: 'm', name: 'M', description: '', objectiveIds: ['o1'] },
  objectives: [{ ...meta, id: 'o1', name: 'Light the altar', description: '', markerType: 'altar', setup: '', completion: '' }],
  enemyList: { ...meta, id: 'e', name: 'E', description: '', unitIds: ['rat', 'boss'] },
  units: [unit('rat', { count: 6, spawn: { priority: 5, groupedWith: [], minSpawn: 2 } }), unit('boss', { count: 1, spawn: { priority: 1, groupedWith: [], minSpawn: 1 } })],
  abilities: [],
  mapSet: { ...meta, id: 's', name: 'S', description: '', tileIds: tiles.map((t) => t.id), startTileId: 't1' },
  tiles,
};
const config: GameConfig = { difficulty: 'Normal', heroCount: 2 };

describe('engine', () => {
  it('sets up start tile, tile deck and objective on matching marker', () => {
    const g = createGame(config, cat, 42);
    expect(g.tilesInPlay).toEqual(['t1']);
    expect(g.tileDeck.sort()).toEqual(['t2', 't3', 't4', 't5']);
    expect(g.placements).toEqual([{ objectiveId: 'o1', tileId: 't2', markerLabel: 'A' }]);
    expect(g.activationDeck).toHaveLength(2 + 2 + 1);
    expect(g.activationDeck.filter((c) => c.kind === 'hero')).toHaveLength(2);
  });

  it('scales enemy cards with heroes and difficulty', () => {
    expect(enemyCardCount(4, 'Normal')).toBe(4);
    expect(enemyCardCount(4, 'Nightmare')).toBeGreaterThan(enemyCardCount(4, 'Normal'));
    expect(enemyCardCount(4, 'Easy')).toBeLessThan(enemyCardCount(4, 'Normal'));
    expect(enemyCardCount(1, 'Easy')).toBe(1);
  });

  it('is deterministic for the same seed', () => {
    const run = () => {
      let g = createGame(config, cat, 7);
      for (let i = 0; i < 20; i++) g = drawActivation(g, config, cat);
      return g;
    };
    expect(run()).toEqual(run());
  });

  it('never spawns more miniatures than owned and respects min spawn', () => {
    let g = createGame(config, cat, 1);
    for (let i = 0; i < 4; i++) g = exploreTile(g, cat);
    for (let i = 0; i < 200; i++) {
      g = drawActivation(g, config, cat);
      expect(g.inPlay.rat ?? 0).toBeLessThanOrEqual(6);
      expect(g.inPlay.boss ?? 0).toBeLessThanOrEqual(1);
      for (const e of g.log[g.log.length - 1]) {
        if (e.kind === 'spawn') for (const s of e.spawns) if (s.unitId === 'rat') expect(s.count).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it('never draws two enemy activation cards in a row, even across rounds', () => {
    for (const difficulty of ['Easy', 'Normal', 'Hard', 'Nightmare'] as const) {
      for (const heroCount of [1, 2, 3, 4, 6]) {
        const cfg: GameConfig = { difficulty, heroCount };
        for (let seed = 0; seed < 30; seed++) {
          let g = createGame(cfg, cat, seed);
          let previous = '';
          for (let i = 0; i < 60; i++) {
            g = drawActivation(g, cfg, cat);
            const card = g.log[g.log.length - 1].find((e) => e.kind !== 'round')!.kind;
            expect(previous === 'activate' && card === 'activate', `${difficulty} ${heroCount} ${seed}`).toBe(false);
            previous = card;
          }
        }
      }
    }
  });

  it('turns an enemy activation into a spawn when no enemies are on the board', () => {
    for (let seed = 0; seed < 50; seed++) {
      let g = createGame(config, cat, seed);
      for (let i = 0; i < 30; i++) {
        const empty = enemiesOnBoard(g) === 0;
        g = drawActivation(g, config, cat);
        const e = g.log[g.log.length - 1].find((x) => x.kind !== 'round')!;
        if (empty) expect(e.kind).not.toBe('activate');
        if (e.kind === 'spawn' && e.replacedActivation) expect(empty).toBe(true);
        if (i % 4 === 3) for (const u of cat.units) g = changeEnemies(g, cat, u.id, -99); // heroes clear the board
      }
    }
  });

  it('reveals chained objectives when the objective revealing them is completed', () => {
    const tiles2 = [tile('s'), tile('a', [{ label: 'A', type: 'Key' }]), tile('b', [{ label: 'B', type: 'Cell' }])];
    const c: GameCatalog = {
      ...cat,
      tiles: tiles2,
      mapSet: { ...cat.mapSet, tileIds: ['s', 'a', 'b'], startTileId: 's' },
      mission: { ...cat.mission, objectiveIds: ['key', 'cell'] },
      objectives: [
        { ...meta, id: 'key', name: 'Key', description: '', markerType: 'Key', setup: '', completion: '' },
        { ...meta, id: 'cell', name: 'Cell', description: '', markerType: 'Cell', setup: '', completion: '', isStart: false, revealedBy: 'key' },
      ],
    };
    let g = createGame(config, c, 1);
    g = { ...g, tileDeck: ['b', 'a'] }; // explore the cell tile first
    g = exploreTile(g, c);
    expect(g.log[g.log.length - 1]).toEqual([{ kind: 'tile', tileId: 'b', placements: [] }]);
    g = exploreTile(g, c); // key found, but cell still hidden until the key objective is completed
    const onTile = (g.log[g.log.length - 1][0] as { placements: { objectiveId: string }[] }).placements.map((p) => p.objectiveId);
    expect(onTile).toEqual(['key']);
    expect(isObjectiveUnlocked('cell', g.completedObjectives, c)).toBe(false);
    g = toggleObjective(g, c, 'key'); // completing the key reveals the cell, already on the table
    expect(g.log[g.log.length - 1][0]).toMatchObject({ kind: 'objective', completed: true, revealed: [{ objectiveId: 'cell', tileId: 'b' }] });
    expect(foundObjectives(g, c).has('cell')).toBe(true);
  });

  it('starts a new round when the activation deck runs out', () => {
    let g = createGame(config, cat, 3);
    for (let i = 0; i < 6; i++) g = drawActivation(g, config, cat);
    expect(g.round).toBe(2);
  });

  it('reveals objectives when exploring and tracks killed enemies', () => {
    let g = createGame(config, cat, 5);
    while (g.tileDeck.length) g = exploreTile(g, cat);
    const reveal = g.log.flat().find((e) => e.kind === 'tile' && e.tileId === 't2');
    expect(reveal).toMatchObject({ placements: [{ objectiveId: 'o1' }] });
    g = changeEnemies(g, cat, 'rat', 3);
    g = changeEnemies(g, cat, 'rat', -5);
    expect(g.inPlay.rat).toBe(0);
  });
});
