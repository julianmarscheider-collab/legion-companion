import type { Ability, MapTile, Unit } from '../domain/types';
import { newEntity, repos } from './repositories';

/** Example content created for every new account so the app is playable at once. */
export async function seedSampleData(ownerId: string) {
  const e = () => newEntity(ownerId);

  const ability = (name: string, description: string, points: number): Ability => ({ ...e(), name, description, points });
  const ranged = ability('Ranged', 'Can attack a hero up to 6" away instead of moving.', 4);
  const poison = ability('Poisonous', 'A hero damaged by this unit takes 1 extra damage at the start of their next turn.', 3);
  const regen = ability('Regeneration', 'Heals 1 damage at the start of each of its activations.', 6);
  const leader = ability('Leader', 'Other enemies on the same tile get +1 Strength.', 5);
  const abilities = [ranged, poison, regen, leader];

  const unit = (name: string, over: Partial<Unit>): Unit => ({
    ...e(), name, faction: 'Goblins', description: '', photos: [], strength: 3, damage: 1, defense: 3, defenseType: 'None', speed: 2,
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
  const units = [goblin, archer, troll, king];

  const tile = (code: string, name: string, markers: MapTile['markers'], rules = ''): MapTile => ({ ...e(), code, name, collection: 'Goblin Caves', description: '', photos: [], markers, rules });
  const tiles = [
    { ...tile('1', 'Entrance Hall', [{ label: 'A', type: 'Door' }]), isStart: true },
    tile('2', 'Guard Room', [{ label: 'A', type: 'Chest' }]),
    tile('3', 'Corridor', []),
    tile('4', 'Shrine', [{ label: 'A', type: 'Altar' }, { label: 'B', type: 'Chest' }]),
    tile('5', 'Prison Cells', [{ label: 'A', type: 'Cell' }, { label: 'B', type: 'Cell' }]),
    tile('6', 'Collapsed Tunnel', [], 'Rubble: models moving through this tile roll one fewer movement die (minimum 1).'),
    tile('7', 'Fungus Cavern', [{ label: 'A', type: 'Chest' }], 'Spore clouds: a hero who ends their turn here rolls a d6; on a 1 they take 1 damage.'),
    tile('8', 'Throne Room', [{ label: 'A', type: 'Altar' }]),
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
  const objectives = [shrine, prisoner, key];

  await Promise.all([
    ...abilities.map((a) => repos.abilities.put(a)),
    ...units.map((u) => repos.units.put(u)),
    ...tiles.map((t) => repos.mapTiles.put(t)),
    ...objectives.map((o) => repos.objectives.put(o)),
    repos.missions.put({ ...e(), name: 'The Goblin Warren', description: 'Search the rubble for the key, free the prisoner and desecrate the goblin shrine.', objectiveIds: [key.id, prisoner.id, shrine.id] }),
    repos.enemyLists.put({ ...e(), name: 'Goblin Horde', description: '', unitIds: units.map((u) => u.id) }),
    repos.mapSets.put({ ...e(), name: 'Goblin Caves', description: '', tileIds: tiles.map((t) => t.id), startTileId: tiles[0].id }),
  ]);
}
