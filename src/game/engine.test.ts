import { describe, expect, it } from 'vitest';
import { BUILTIN_DIFFICULTIES, type MapTile, type Unit } from '../domain/types';
import { canRedrawTile, changeEnemies, createGame, redrawTile, enemiesOnBoard, foundObjectives, isObjectiveUnlocked, lockedObjectives, toggleObjective, enemyCardCount, drawActivation, exploreTile, type GameCatalog, type GameConfig } from './engine';

const meta = { ownerId: 'o', createdAt: 0, updatedAt: 0 };
const unit = (id: string, over: Partial<Unit> = {}): Unit => ({
  ...meta, id, name: id, description: '', photos: [], strength: 3, damage: 1, defense: 3, defenseType: 'None',
  speed: 2, toughness: 1, abilityIds: [], count: 10,
  spawn: { priority: 5, groupedWith: [], minSpawn: 1 }, ...over,
});
const tile = (id: string, markers: MapTile['markers'] = []): MapTile => ({ ...meta, id, name: id, code: id, description: '', photos: [], markers });

const tiles = [tile('t1'), tile('t2', [{ label: 'Altar' }]), tile('t3'), tile('t4'), tile('t5')];
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
    expect(g.placements).toEqual([{ objectiveId: 'o1', tileId: 't2', markerLabel: 'Altar' }]);
    expect(g.activationDeck).toHaveLength(2 + 2 + 1);
    expect(g.activationDeck.filter((c) => c.kind === 'hero')).toHaveLength(2);
  });

  it('scales enemy cards with heroes and difficulty', () => {
    const D = BUILTIN_DIFFICULTIES;
    expect(enemyCardCount(4, D.Normal)).toBe(4);
    expect(enemyCardCount(4, D.Nightmare)).toBeGreaterThan(enemyCardCount(4, D.Normal));
    expect(enemyCardCount(4, D.Easy)).toBeLessThan(enemyCardCount(4, D.Normal));
    expect(enemyCardCount(1, D.Easy)).toBe(1);
  });

  it('puts random-tile objectives on a non-start tile without a marker, spreading them out', () => {
    const c: GameCatalog = {
      ...cat,
      mission: { ...cat.mission, objectiveIds: ['r1', 'r2', 'r3'] },
      objectives: ['r1', 'r2', 'r3'].map((id) => ({
        ...meta, id, name: id, description: '', placement: 'tile' as const, markerType: 'Altar', setup: '', completion: '',
      })),
    };
    for (let seed = 0; seed < 30; seed++) {
      const g = createGame(config, c, seed);
      expect(g.placements).toHaveLength(3);
      for (const p of g.placements) {
        expect(p.tileId).not.toBe('t1');
        expect(p.markerLabel).toBeUndefined(); // marker type is ignored for random-tile objectives
      }
      expect(new Set(g.placements.map((p) => p.tileId)).size).toBe(3);
    }
  });

  it('starts on the marked starting tile and never puts objective-location objectives on starting tiles', () => {
    const t = [tile('a'), { ...tile('b'), isStart: true }, { ...tile('c'), isStart: true }, tile('d'), tile('e')];
    const c: GameCatalog = {
      ...cat,
      tiles: t,
      mapSet: { ...cat.mapSet, tileIds: t.map((x) => x.id), startTileId: 'a' }, // old manual choice is overridden by the mark
      mission: { ...cat.mission, objectiveIds: ['r1', 'r2', 'r3'] },
      objectives: ['r1', 'r2', 'r3'].map((id) => ({ ...meta, id, name: id, description: '', placement: 'tile' as const, markerType: '', setup: '', completion: '' })),
    };
    for (let seed = 0; seed < 30; seed++) {
      const g = createGame(config, c, seed);
      expect(g.tilesInPlay).toEqual(['b']);
      for (const p of g.placements) expect(['a', 'd', 'e']).toContain(p.tileId);
    }
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
    for (let i = 0; i < 4; i++) g = exploreTile(g, cat, config);
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
            const e = g.log[g.log.length - 1].find((x) => x.kind !== 'round')!;
            // A spawn card that became a single-tile activation is still a spawn card in the deck.
            const card = e.kind === 'activate' && e.replacedSpawn ? 'spawn' : e.kind;
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
    const tiles2 = [tile('s'), tile('a', [{ label: 'Key' }]), tile('b', [{ label: 'Cell' }])];
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
    g = exploreTile(g, c, config);
    // The cell is found before the key: announced as locked, not yet usable.
    expect(g.log[g.log.length - 1]).toMatchObject([{ kind: 'tile', tileId: 'b', placements: [], locked: [{ objectiveId: 'cell', tileId: 'b', markerLabel: 'Cell' }] }]);
    expect(lockedObjectives(g, c).has('cell')).toBe(true);
    g = exploreTile(g, c, config); // key found, but cell still hidden until the key objective is completed
    const onTile = (g.log[g.log.length - 1][0] as { placements: { objectiveId: string }[] }).placements.map((p) => p.objectiveId);
    expect(onTile).toEqual(['key']);
    expect(isObjectiveUnlocked('cell', g.completedObjectives, c)).toBe(false);
    g = toggleObjective(g, c, 'key'); // completing the key reveals the cell, already on the table
    expect(g.log[g.log.length - 1][0]).toMatchObject({ kind: 'objective', completed: true, revealed: [{ objectiveId: 'cell', tileId: 'b' }] });
    expect(foundObjectives(g, c).has('cell')).toBe(true);
    expect(lockedObjectives(g, c).has('cell')).toBe(false);
  });

  it('turns a spawn into a single-tile activation when no miniatures are left', () => {
    const cfg: GameConfig = { difficulty: 'Normal', heroCount: 2 };
    for (let seed = 0; seed < 40; seed++) {
      let g = createGame(cfg, cat, seed);
      for (let i = 0; i < 4; i++) g = exploreTile(g, cat, config);
      g = { ...g, inPlay: { rat: 6, boss: 1 } }; // every miniature is on the table
      for (let i = 0; i < 12; i++) {
        g = drawActivation(g, cfg, cat);
        for (const e of g.log[g.log.length - 1]) {
          expect(e.kind).not.toBe('spawn');
          if (e.kind === 'activate' && e.replacedSpawn) expect(e.tileIds).toHaveLength(1);
        }
      }
      expect(g.inPlay).toEqual({ rat: 6, boss: 1 });
    }
  });

  it('redraws an illegal tile: back into the deck (not on top) and a new tile drawn', () => {
    for (let seed = 0; seed < 30; seed++) {
      let g = createGame(config, cat, seed);
      g = exploreTile(g, cat, config);
      const first = g.tilesInPlay[1];
      expect(canRedrawTile(g)).toBe(true);
      g = redrawTile(g, cat, config);
      const second = g.tilesInPlay[1];
      expect(second).not.toBe(first);
      expect(g.tilesInPlay).toHaveLength(2);
      expect(g.tileDeck).toContain(first);
      if (g.tileDeck.length > 1) expect(g.tileDeck[0]).not.toBe(first); // not straight back on top
      expect(g.log[g.log.length - 1][0]).toMatchObject({ kind: 'tile', tileId: second, replaced: first });
    }
    // nothing to swap with when the deck is empty, and only right after exploring
    let g = createGame(config, cat, 1);
    while (g.tileDeck.length) g = exploreTile(g, cat, config);
    expect(canRedrawTile(g)).toBe(false);
    g = drawActivation(createGame(config, cat, 2), config, cat);
    expect(canRedrawTile(g)).toBe(false);
  });

  it('places objectives on markers by name, also for old markers with a separate type', () => {
    const t = [tile('s'), tile('x', [{ label: 'A', type: 'Shrine' }]), tile('y', [{ label: 'Shrine' }, { label: 'Shrine' }])];
    const c: GameCatalog = {
      ...cat,
      tiles: t,
      mapSet: { ...cat.mapSet, tileIds: ['s', 'x', 'y'], startTileId: 's' },
      mission: { ...cat.mission, objectiveIds: ['a', 'b', 'c'] },
      objectives: ['a', 'b', 'c'].map((id) => ({ ...meta, id, name: id, description: '', markerType: 'shrine', setup: '', completion: '' })),
    };
    for (let seed = 0; seed < 20; seed++) {
      const g = createGame(config, c, seed);
      // three Shrine markers in total (one old-style, two on the same tile): each used once
      expect(g.placements.map((p) => p.markerLabel)).toEqual(['Shrine', 'Shrine', 'Shrine']);
      expect(g.placements.filter((p) => p.tileId === 'y')).toHaveLength(2);
    }
  });

  describe('bosses', () => {
    const boss = unit('warlord', {
      isBoss: true, count: 1, bossActivations: 1,
      bossDeck: [{ abilityId: 'slam', copies: 2 }, { abilityId: 'roar', copies: 1 }],
    });
    const ab = (id: string) => ({ ...meta, id, name: id, description: `${id} text`, points: 0, bossCard: true });
    const t = [tile('s'), tile('a', [{ label: 'Altar' }]), tile('b'), tile('c'), tile('d')];
    const c: GameCatalog = {
      ...cat,
      units: [...cat.units, boss], // a boss in the enemy list must still never spawn normally
      bosses: [boss],
      abilities: [ab('slam'), ab('roar')],
      tiles: t,
      mapSet: { ...cat.mapSet, tileIds: t.map((x) => x.id), startTileId: 's' },
      mission: { ...cat.mission, objectiveIds: ['altar', 'slay'] },
      objectives: [
        { ...meta, id: 'altar', name: 'Altar', description: '', markerType: 'Altar', setup: '', completion: '', summonBossId: 'warlord', summonWhen: 'completed', summonAt: 'objective' },
        { ...meta, id: 'slay', name: 'Slay', description: '', placement: 'none', markerType: '', setup: '', completion: '', isStart: false, revealedBy: 'altar', defeatBossId: 'warlord' },
      ],
    };
    const prep = (seed: number) => {
      let g = createGame(config, c, seed);
      g = { ...g, tileDeck: ['a', 'b', 'c', 'd'] };
      for (let i = 0; i < 4; i++) g = exploreTile(g, c, config);
      return g;
    };

    it('appears when the objective is completed, at the objective, with its cards in the deck', () => {
      let g = prep(1);
      expect(g.inPlay.warlord ?? 0).toBe(0);
      g = toggleObjective(g, c, 'altar');
      const e = g.log[g.log.length - 1];
      expect(e.find((x) => x.kind === 'bossAppears')).toMatchObject({ bossId: 'warlord', tileId: 'a', markerLabel: 'Altar' });
      // the "not on the map" objective it unlocks is revealed right away
      expect(e[0]).toMatchObject({ kind: 'objective', revealed: [{ objectiveId: 'slay', tileId: '' }] });
      expect(g.inPlay.warlord).toBe(1);
      expect(g.bosses?.warlord.drawPile.sort()).toEqual(['roar', 'slam', 'slam']);
      // completing again (after reopening) doesn't summon a second time
      g = toggleObjective(toggleObjective(g, c, 'altar'), c, 'altar');
      expect(g.log[g.log.length - 1].some((x) => x.kind === 'bossAppears')).toBe(false);
    });

    it('draws boss cards on boss activation, reshuffles, and never puts activations back to back', () => {
      for (let seed = 0; seed < 25; seed++) {
        let g = toggleObjective(prep(seed), c, 'altar');
        let prev = g.lastCard;
        const drawnCards: string[] = [];
        for (let i = 0; i < 40; i++) {
          g = drawActivation(g, config, c);
          const e = g.log[g.log.length - 1].find((x) => x.kind !== 'round')!;
          const isAct = e.kind === 'bossActivation' || (e.kind === 'activate' && !e.replacedSpawn);
          expect(isAct && (prev === 'enemy' || prev === 'boss')).toBe(false);
          prev = e.kind === 'bossActivation' ? 'boss' : g.lastCard;
          if (e.kind === 'bossActivation') drawnCards.push(e.cardId);
          for (const x of g.log[g.log.length - 1]) if (x.kind === 'spawn') expect(x.spawns.some((sp) => sp.unitId === 'warlord')).toBe(false);
        }
        expect(drawnCards.length).toBeGreaterThan(3); // at least one boss card per round
        expect(new Set(drawnCards)).toEqual(new Set(['slam', 'roar']));
      }
    });

    it('is defeated by removing it: cards leave the deck and the linked objective is completed', () => {
      let g = toggleObjective(prep(3), c, 'altar');
      g = changeEnemies(g, c, 'warlord', +1); // can't be added by hand
      expect(g.inPlay.warlord).toBe(1);
      g = changeEnemies(g, c, 'warlord', -1);
      expect(g.log[g.log.length - 1][0]).toMatchObject({ kind: 'bossDefeated', bossId: 'warlord', completed: ['slay'] });
      expect(g.completedObjectives).toContain('slay');
      expect(g.bosses?.warlord).toBeUndefined();
      expect(g.activationDeck.some((x) => x.kind === 'boss')).toBe(false);
      for (let i = 0; i < 12; i++) {
        g = drawActivation(g, config, c);
        expect(g.log[g.log.length - 1].some((x) => x.kind === 'bossActivation')).toBe(false);
      }
    });
  });

  it('spawns half the usual amount on a newly explored tile, and takes it back on redraw', () => {
    const cfg: GameConfig = { difficulty: 'Normal', heroCount: 4 }; // budget 40, initial spawn budget 20
    const big: GameCatalog = { ...cat, units: [unit('rat', { count: 30, spawn: { priority: 5, groupedWith: [], minSpawn: 1 } })] };
    for (let seed = 0; seed < 20; seed++) {
      let g = createGame(cfg, big, seed);
      g = exploreTile(g, big, cfg);
      const e = g.log[g.log.length - 1][0];
      expect(e.kind).toBe('tile');
      if (e.kind !== 'tile') continue;
      expect(e.spawns).toEqual([{ tileId: e.tileId, unitId: 'rat', count: 2 }]); // rat ≈ 7 pts: floor(20 / 7) = 2
      expect(g.inPlay.rat).toBe(2);
      // a normal spawn card on the same budget would place floor(40 / 7) = 5
      g = redrawTile(g, big, cfg);
      const e2 = g.log[g.log.length - 1][0];
      expect(g.inPlay.rat).toBe(e2.kind === 'tile' ? (e2.spawns ?? []).reduce((n, x) => n + x.count, 0) : -1);
    }
  });

  it('does not spawn on explore when no miniatures are free', () => {
    let g = createGame(config, cat, 4);
    g = { ...g, inPlay: { rat: 6, boss: 1 } };
    g = exploreTile(g, cat, config);
    const e = g.log[g.log.length - 1][0];
    expect(e.kind === 'tile' && e.spawns).toEqual([]);
    expect(g.inPlay).toEqual({ rat: 6, boss: 1 });
  });

  it('uses custom difficulty settings', () => {
    const custom: GameConfig = { difficulty: 'My preset', heroCount: 2, settings: { budget: 2, enemyCardsPerHero: 0.5, spawnCards: 3, exploreSpawn: 0 } };
    const g = createGame(custom, cat, 1);
    expect(g.activationDeck.filter((c) => c.kind === 'spawn')).toHaveLength(3);
    expect(g.activationDeck.filter((c) => c.kind === 'enemy')).toHaveLength(1);
    const e = exploreTile(g, cat, custom).log.at(-1)![0];
    expect(e.kind === 'tile' && e.spawns).toEqual([]); // explore spawn switched off (0)
    // old saves without settings: looked up by name
    expect(createGame({ difficulty: 'Hard', heroCount: 2 }, cat, 1).activationDeck.filter((c) => c.kind === 'spawn')).toHaveLength(2);
  });

  it('starts a new round when the activation deck runs out', () => {
    let g = createGame(config, cat, 3);
    for (let i = 0; i < 6; i++) g = drawActivation(g, config, cat);
    expect(g.round).toBe(2);
  });

  it('reveals objectives when exploring and tracks killed enemies', () => {
    let g = createGame(config, cat, 5);
    while (g.tileDeck.length) g = exploreTile(g, cat, config);
    const reveal = g.log.flat().find((e) => e.kind === 'tile' && e.tileId === 't2');
    expect(reveal).toMatchObject({ placements: [{ objectiveId: 'o1' }] });
    const before = g.inPlay.rat ?? 0; // exploring spawns enemies on the new tiles
    g = changeEnemies(g, cat, 'rat', 3);
    expect(g.inPlay.rat).toBe(Math.min(6, before + 3));
    g = changeEnemies(g, cat, 'rat', -99);
    expect(g.inPlay.rat).toBe(0);
  });
});
