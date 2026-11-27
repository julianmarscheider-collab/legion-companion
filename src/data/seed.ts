import { isPlaceholderArt, PLACEHOLDER_ART } from './placeholderArt';
import type { Ability, EnemyList, Entity, MapSet, MapTile, Mission, Objective, Unit } from '../domain/types';
import { newEntity, repos, type Repository } from './repositories';

export interface SampleData {
  abilities: Ability[];
  units: Unit[];
  tiles: MapTile[];
  objectives: Objective[];
  missions: Mission[];
  enemyLists: EnemyList[];
  mapSets: MapSet[];
}

/** The example content (fresh ids), used for new accounts and for "Restore example content". */
export function buildSampleData(ownerId: string): SampleData {
  const e = () => newEntity(ownerId);

  const ability = (name: string, description: string, points: number): Ability => ({ ...e(), name, description, points });
  const ranged = ability('Ranged', 'Can attack a hero up to 2 spaces away instead of moving.', 4);
  const poison = ability('Poisonous', 'A hero damaged by this unit takes 1 extra damage at the start of their next turn.', 3);
  const regen = ability('Regeneration', 'Heals one wound at the start of each of its activations.', 6);
  const leader = ability('Leader', 'Other enemies on the same tile get +1 Strength.', 5);
  // Boss deck cards for the Goblin Warlord (abilities ticked as boss cards).
  const bossCard = (name: string, description: string): Ability => ({ ...e(), name, description, points: 0, bossCard: true, collection: 'Goblin Warlord' });
  const crush = bossCard('Crushing Blow', 'The Warlord moves towards the nearest hero and attacks them twice.');
  const warCry = bossCard('War Cry', 'Activate all other enemies on the Warlord’s tile. They get +1 Strength this activation.');
  const horde = bossCard('Call the Horde', 'Spawn 3 Goblins on the Warlord’s tile. If there are no more Goblins available to spawn, move the closest three into the same space as the Warlord.');
  const charge = bossCard('Brutal Charge', 'The Warlord moves towards the farthest hero with an extra 2 movement dice.');
  const abilities = [ranged, poison, regen, leader, crush, warCry, horde, charge];

  const unit = (name: string, over: Partial<Unit>): Unit => ({
    ...e(), name, faction: 'Goblins', description: '', photos: PLACEHOLDER_ART[name] ? [PLACEHOLDER_ART[name]] : [], strength: 3, damage: 1, defense: 3, defenseType: 'None', speed: 2,
    toughness: 1, abilityIds: [], count: 6,
    spawn: { priority: 5, groupedWith: [], minSpawn: 1 }, ...over,
  });
  const archer = unit('Goblin Archer', { defenseType: 'Evasive', count: 4, abilityIds: [ranged.id], spawn: { priority: 4, groupedWith: [], minSpawn: 2 } });
  const goblin = unit('Goblin', { count: 12, spawn: { priority: 8, groupedWith: [archer.id], minSpawn: 3 } });
  const troll = unit('Cave Troll', {
    strength: 5, damage: 2, defense: 4, defenseType: 'Armored', speed: 1, toughness: 3, wounds: 2, count: 1,
    abilityIds: [regen.id], spawn: { priority: 2, groupedWith: [], minSpawn: 1 },
  });
  const king = unit('Goblin King', {
    strength: 4, damage: 1, attacks: 2, defense: 4, defenseType: 'Armored', speed: 2, toughness: 6, count: 1,
    abilityIds: [leader.id, poison.id],
    spawn: { priority: 2, groupedWith: [goblin.id], minSpawn: 1 },
  });
  const warlord = unit('Goblin Warlord', {
    strength: 5, damage: 2, attacks: 2, defense: 5, defenseType: 'Armored', speed: 2, toughness: 4, wounds: 3, count: 1,
    abilityIds: [leader.id],
    isBoss: true, bossActivations: 1,
    bossDeck: [{ abilityId: crush.id, copies: 2 }, { abilityId: warCry.id, copies: 1 }, { abilityId: horde.id, copies: 1 }, { abilityId: charge.id, copies: 1 }],
    spawn: { priority: 1, groupedWith: [], minSpawn: 1 },
  });
  const units = [goblin, archer, troll, king, warlord];

  const tile = (code: string, name: string, markers: MapTile['markers'], rules = ''): MapTile => ({ ...e(), code, name, collection: 'Goblin Caves', description: '', photos: [], markers, rules });
  const tiles = [
    { ...tile('1', 'Entrance Hall', [{ label: 'Door' }]), isStart: true },
    tile('2', 'Guard Room', [{ label: 'Chest' }]),
    tile('3', 'Corridor', []),
    tile('4', 'Shrine', [{ label: 'Altar' }, { label: 'Chest' }]),
    tile('5', 'Prison Cells', [{ label: 'Cell' }, { label: 'Cell' }]),
    tile('6', 'Collapsed Tunnel', [], 'Rubble: models moving through this tile roll one fewer movement die (minimum 1).'),
    tile('7', 'Fungus Cavern', [{ label: 'Chest' }], 'Spore clouds: a hero who ends their turn here rolls a d6; on a 1 they take 1 damage.'),
    tile('8', 'Throne Room', [{ label: 'Altar' }]),
  ];

  const objective = (name: string, markerType: string, flavour: string, setup: string, completion: string) => ({ ...e(), name, description: '', flavour, markerType, setup, completion });
  const shrine = objective('Desecrate the Shrine', 'Altar', 'Crude idols ring a blood-stained altar. The air hums with something old and hungry.', 'Place an objective token on the altar.', 'A hero ends their turn on the token and passes a 4+ roll.');
  const prisoner = objective('Rescue the Prisoner', 'Cell', 'From behind rusted bars, a weak voice calls out: “Please… get me out of here.”', 'Place a prisoner miniature in the cell.', 'A hero escorts the prisoner back to the entrance tile.');
  const key = {
    ...objective(
      'Search the Rubble',
      '',
      'Part of the ceiling has come down. Between the broken stones and splintered crates something metallic glints.',
      'Place a rubble token on the objective location.',
      'A hero next to the rubble spends an action searching it and rolls a 3+. On a success they find a rusty key: give that hero a key token.',
    ),
    placement: 'tile' as const,
    questline: 'Prison Break',
  };
  // The prisoner needs the key from the rubble: until it is found the cell stays locked.
  Object.assign(prisoner, {
    questline: 'Prison Break',
    isStart: false,
    revealedBy: key.id,
    setup: 'Place a prisoner miniature in the cell (if it isn’t there yet). The key fits the lock.',
    completion: 'The hero carrying the key unlocks the cell (action), then escorts the prisoner back to the entrance tile.',
    lockedFlavour: 'Behind a rusted iron door someone is calling for help. The lock is old, but it holds firm.',
    lockedText: 'Place a prisoner miniature in the cell. The cell door is locked: it can’t be opened until a key is found.',
  });
  // Desecrating the shrine angers the Warlord, who appears at the altar.
  Object.assign(shrine, { summonBossId: warlord.id, summonWhen: 'completed', summonAt: 'objective' });
  const slay = {
    ...objective(
      'Slay the Warlord',
      '',
      'A roar shakes the cavern. The Goblin Warlord has come to avenge his shrine.',
      'The Warlord is on the board: defeat him.',
      'Remove the Goblin Warlord from the board (mark him as defeated).',
    ),
    placement: 'none' as const,
    isStart: false,
    revealedBy: shrine.id,
    defeatBossId: warlord.id,
  };
  const objectives = [shrine, prisoner, key, slay];

  return {
    abilities,
    units,
    tiles,
    objectives: objectives as Objective[],
    missions: [{ ...e(), name: 'The Goblin Warren', description: 'Search the rubble for the key, free the prisoner, desecrate the goblin shrine and slay the Warlord who comes to defend it.', objectiveIds: [key.id, prisoner.id, shrine.id, slay.id] }],
    enemyLists: [{ ...e(), name: 'Goblin Horde', description: '', unitIds: units.filter((u) => !u.isBoss).map((u) => u.id) }],
    mapSets: [{ ...e(), name: 'Goblin Caves', description: '', tileIds: tiles.map((t) => t.id), startTileId: tiles[0].id }],
  };
}

async function saveAll(d: SampleData) {
  await Promise.all([
    ...d.abilities.map((x) => repos.abilities.put(x)),
    ...d.units.map((x) => repos.units.put(x)),
    ...d.tiles.map((x) => repos.mapTiles.put(x)),
    ...d.objectives.map((x) => repos.objectives.put(x)),
    ...d.missions.map((x) => repos.missions.put(x)),
    ...d.enemyLists.map((x) => repos.enemyLists.put(x)),
    ...d.mapSets.map((x) => repos.mapSets.put(x)),
  ]);
}

/** Example content created for every new account so the app is playable at once. */
export async function seedSampleData(ownerId: string) {
  await saveAll(buildSampleData(ownerId));
}

/** Earlier names of example items, so restoring updates them instead of adding a copy. */
const LEGACY_NAMES: Record<string, string[]> = { 'Search the Rubble': ['Find the Rusty Key'] };

/**
 * Reset the example content to its current version. Example items that still
 * exist (matched by name) are overwritten but keep their id, so the player's
 * own lists, missions and map sets that use them keep working, and keep any
 * images the player added. Missing examples are added again. Nothing else is touched.
 */
export async function restoreSampleData(ownerId: string): Promise<{ updated: number; added: number }> {
  const ex = buildSampleData(ownerId);
  const idMap = new Map<string, string>(); // example id -> existing id
  const keep = new Map<string, Entity & { photos?: string[] }>(); // existing item per example id
  let updated = 0;

  async function match<T extends Entity & { name: string }>(repo: Repository<T>, items: T[]) {
    const existing = await repo.list(ownerId);
    const taken = new Set<string>();
    for (const item of items) {
      const names = [item.name, ...(LEGACY_NAMES[item.name] ?? [])];
      const found = existing.find((x) => !taken.has(x.id) && names.includes(x.name));
      if (found) {
        taken.add(found.id);
        idMap.set(item.id, found.id);
        keep.set(item.id, found);
        updated++;
      }
    }
  }
  await match(repos.abilities, ex.abilities);
  await match(repos.units, ex.units);
  await match(repos.mapTiles, ex.tiles);
  await match(repos.objectives, ex.objectives);
  await match(repos.missions, ex.missions);
  await match(repos.enemyLists, ex.enemyLists);
  await match(repos.mapSets, ex.mapSets);

  const id = (x: string) => idMap.get(x) ?? x;
  const ids = (xs: string[]) => xs.map(id);
  // Keep the existing id and creation time, and the player's own images (placeholders are replaced by the current ones).
  const base = <T extends Entity & { photos?: string[] }>(x: T): T => {
    const old = keep.get(x.id);
    if (!old) return x;
    const ownImage = old.photos?.length && !isPlaceholderArt(old.photos[0]);
    const photos = ownImage ? old.photos : x.photos;
    return { ...x, id: old.id, createdAt: old.createdAt, ...(x.photos ? { photos } : {}) };
  };

  await saveAll({
    abilities: ex.abilities.map(base),
    units: ex.units.map((u) => ({ ...base(u), abilityIds: ids(u.abilityIds), spawn: { ...u.spawn, groupedWith: ids(u.spawn.groupedWith) } })),
    tiles: ex.tiles.map(base),
    objectives: ex.objectives.map((o) => ({ ...base(o), ...(o.revealedBy ? { revealedBy: id(o.revealedBy) } : {}) })),
    missions: ex.missions.map((m) => ({ ...base(m), objectiveIds: ids(m.objectiveIds) })),
    enemyLists: ex.enemyLists.map((l) => ({ ...base(l), unitIds: ids(l.unitIds) })),
    mapSets: ex.mapSets.map((m) => ({ ...base(m), tileIds: ids(m.tileIds), startTileId: id(m.startTileId) })),
  });
  const total = ex.abilities.length + ex.units.length + ex.tiles.length + ex.objectives.length + ex.missions.length + ex.enemyLists.length + ex.mapSets.length;
  return { updated, added: total - updated };
}
