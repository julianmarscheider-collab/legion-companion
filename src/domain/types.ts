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

export type CostType = 'add' | 'multiply';

export interface Ability extends Entity {
  name: string;
  description: string;
  /** 'add' (default): `points` are added. 'multiply': unit points are multiplied by `multiplier`. */
  costType?: CostType;
  points: number;
  multiplier?: number;
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
  /** Label on the physical tile, e.g. "A" or "1". */
  label: string;
  /** Kind of location, e.g. "Altar", "Chest", "Door". Objectives match on this. */
  type: string;
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
  /** 'marker' (default): on a random marker of `markerType`. 'tile': on the objective location of a random tile. */
  placement?: 'marker' | 'tile';
  /** Marker type the objective is placed on. Empty = the objective location of a random tile. */
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
}

export interface Mission extends Entity {
  name: string;
  description: string;
  objectiveIds: string[];
}

export type Difficulty = 'Easy' | 'Normal' | 'Hard' | 'Nightmare';
export const DIFFICULTIES: Difficulty[] = ['Easy', 'Normal', 'Hard', 'Nightmare'];
