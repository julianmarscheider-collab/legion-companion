// Core data model. Every stored entity belongs to a user (ownerId) so the same
// shapes can later be synced to an online database without changes.

export interface Entity {
  id: string;
  ownerId: string;
  createdAt: number;
  updatedAt: number;
}

export type DefenseType = 'None' | 'Evasive' | 'Armored';
export const DEFENSE_TYPES: DefenseType[] = ['None', 'Evasive', 'Armored'];

export type CostType = 'add' | 'multiply' | 'dependent';

/** Unit stats an ability's cost can depend on. */
export type StatKey = 'strength' | 'attacks' | 'damage' | 'defense' | 'toughness' | 'wounds' | 'speed';
export const STAT_LABELS: Record<StatKey, string> = {
  strength: 'Strength',
  attacks: 'Attacks',
  damage: 'Damage',
  defense: 'Defense',
  toughness: 'Toughness',
  wounds: 'Wounds',
  speed: 'Speed',
};

/** One term of a dependent cost: the unit's stat value × factor. */
export interface StatDependency {
  stat: StatKey;
  factor: number;
}

export interface Ability extends Entity {
  name: string;
  description: string;
  /** A boss deck card (drawn when a boss activates) instead of a unit ability; has no point cost. */
  bossCard?: boolean;
  /** Groups abilities / boss cards, e.g. "Goblin Warlord". */
  collection?: string;
  /** 'add' (default): `points` are added. 'multiply': unit points are multiplied by `multiplier`. */
  costType?: CostType;
  points: number;
  multiplier?: number;
  /** 'dependent': points = sum of (unit stat × factor). */
  dependsOn?: StatDependency[];
}

export interface Unit extends Entity {
  name: string;
  description: string;
  photos: string[]; // compressed JPEG data URLs
  /** e.g. "Goblins" or "Undead". Empty = no faction. Units saved before factions existed have none. */
  faction?: string;
  /** Number the hero must roll (d6, X+) on their defense roll to avoid damage. */
  strength: number;
  /** Damage dealt to a hero on a failed defense roll. */
  damage: number;
  /** Number the hero must roll (d6, X+) on their attack roll to damage the unit. */
  defense: number;
  defenseType: DefenseType;
  /** Number of movement dice rolled on activation. */
  speed: number;
  /** Damage needed to kill the unit. */
  toughness: number;
  /** A boss: never spawns normally, only when an objective summons it; acts through its boss deck. */
  isBoss?: boolean;
  /** Boss activation cards put into the activation deck each round while the boss is alive. Missing = 1. */
  bossActivations?: number;
  /** The boss deck: boss card abilities and how many copies of each. */
  bossDeck?: BossDeckEntry[];
  /** Attacks per activation (each a separate defense roll). Missing = 1. */
  attacks?: number;
  /** Wounds: each takes Toughness damage to remove. Missing = 1. */
  wounds?: number;
  abilityIds: string[];
  /** Number of physical miniatures owned: the cap on how many can be in play. */
  count: number;
  spawn: {
    /** 1 (rarely chosen) to 10 (strongly preferred). */
    priority: number;
    groupedWith: string[];
    minSpawn: number;
  };
}

export interface BossDeckEntry {
  abilityId: string;
  copies: number;
}

export interface EnemyList extends Entity {
  name: string;
  description: string;
  unitIds: string[];
}

export interface MapTile extends Entity {
  name: string;
  /** Group of tiles, e.g. a boxed set or a homemade batch. Empty = no collection. */
  collection?: string;
  /** The number printed on the physical tile, used in instructions ("tile 7"). */
  code: string;
  description: string;
  photos: string[];
  markers: TileMarker[];
  /** Starting tile: the heroes start here; it has no objective location. */
  isStart?: boolean;
  /** Optional special rules for this tile, shown when it is drawn. */
  rules?: string;
}

export interface TileMarker {
  /** Name of the location printed on the tile, e.g. "Altar". Objectives are placed on markers by name. */
  label: string;
  /** Older data: markers had a separate type (e.g. label "A", type "Altar"); the type is used as the name. */
  type?: string;
}

export interface MapSet extends Entity {
  name: string;
  description: string;
  tileIds: string[];
  startTileId: string;
}

export interface Objective extends Entity {
  name: string;
  description: string;
  /**
   * 'marker' (default): on a random marker named `markerType`. 'tile': on the objective
   * location of a random tile. 'none': not on the map (e.g. "Slay the Warlord").
   */
  placement?: 'marker' | 'tile' | 'none';
  /** Name of the marker the objective is placed on (e.g. "Altar"). Empty = the objective location of a random tile. */
  markerType: string;
  /** Story text read out when the objective is discovered (shown in italics). */
  flavour?: string;
  /** What the players must set up when the tile is revealed. */
  setup: string;
  /** How the objective is completed. */
  completion: string;
  /** Groups linked objectives, e.g. "Prison Break". Empty = no questline. */
  questline?: string;
  /** Start objectives are known from the beginning. Missing = true (objectives created before this existed). */
  isStart?: boolean;
  /** For non-start objectives: the prerequisite objective that must be completed first. */
  revealedBy?: string;
  /** Flavour text shown if the objective is found before its prerequisite is completed. */
  lockedFlavour?: string;
  /** Instruction shown if the objective is found before its prerequisite is completed. */
  lockedText?: string;
  /** Boss unit this objective summons. */
  summonBossId?: string;
  /** When the boss appears: when the objective is found (default) or completed. */
  summonWhen?: 'found' | 'completed';
  /** Where the boss appears: at this objective (default) or on a random tile in play. */
  summonAt?: 'objective' | 'random';
  /** This objective is completed automatically when this boss is defeated. */
  defeatBossId?: string;
}

export interface Mission extends Entity {
  name: string;
  description: string;
  objectiveIds: string[];
}

export type Difficulty = 'Easy' | 'Normal' | 'Hard' | 'Nightmare';

/** Everything a difficulty level changes. */
export interface DifficultySettings {
  /** × spawn budget (how many enemies a spawn places). */
  budget: number;
  /** Enemy activation cards per round = heroes × this (rounded, at least 1). */
  enemyCardsPerHero: number;
  /** Spawn cards per round. */
  spawnCards: number;
  /** Size of the spawn on a newly explored tile, as a share of a normal spawn. */
  exploreSpawn: number;
}

/** A difficulty saved by the player for later games. */
export interface DifficultyPreset extends Entity, DifficultySettings {
  name: string;
}

export const BUILTIN_DIFFICULTIES: Record<Difficulty, DifficultySettings> = {
  Easy: { budget: 0.75, enemyCardsPerHero: 0.75, spawnCards: 1, exploreSpawn: 0.5 },
  Normal: { budget: 1, enemyCardsPerHero: 1, spawnCards: 1, exploreSpawn: 0.5 },
  Hard: { budget: 1.3, enemyCardsPerHero: 1.25, spawnCards: 2, exploreSpawn: 0.5 },
  Nightmare: { budget: 1.6, enemyCardsPerHero: 1.5, spawnCards: 2, exploreSpawn: 0.5 },
};
export const DIFFICULTIES: Difficulty[] = ['Easy', 'Normal', 'Hard', 'Nightmare'];
