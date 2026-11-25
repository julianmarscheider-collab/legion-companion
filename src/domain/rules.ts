// Rules glossary: the text behind every "?" help icon and the Rules page.
// `text` = what is already decided. `todo` = a rules placeholder, shown until
// that part of the rules is written. Edit freely.

export interface RuleEntry {
  title: string;
  section: string;
  text?: string;
  todo?: string;
  /** In-app page with more about this, e.g. the Abilities generator. */
  link?: { to: string; label: string };
}

export const RULES = {
  // ---- Units: stats ----
  faction: {
    section: 'Unit stats',
    title: 'Faction',
    text: 'Groups units, e.g. Goblins or Undead. Filter the Units list by faction, and pick a whole faction instead of an enemy list when starting a game.',
  },
  points: {
    section: 'Unit stats',
    title: 'Points',
    text: 'Calculated automatically to balance difficulty. Stats = 4 × expected damage per attack × expected hero attacks needed to kill the unit + 2 × Speed. Unit points = (stats + additive abilities) × multiplicative abilities.',
  },
  strength: {
    section: 'Unit stats',
    title: 'Strength',
    text: 'The number a hero must roll or higher (d6) on their defense roll to avoid this unit’s damage. Higher Strength = more dangerous unit.',
  },
  damage: {
    section: 'Unit stats',
    title: 'Damage',
    text: 'Damage a hero takes when their defense roll against this unit fails.',
    todo: 'Hero health and what happens when a hero runs out of it.',
  },
  defense: {
    section: 'Unit stats',
    title: 'Defense',
    text: 'The number a hero must roll or higher (d6) on their attack roll to damage this unit.',
  },
  defenseType: {
    section: 'Unit stats',
    title: 'Defense type',
    text: 'None, Evasive or Armored. Heroes can get bonuses on their attack rolls against a defense type, e.g. +1 Strength vs Armored enemies.',
    todo: 'Which hero bonuses exist against Evasive and Armored enemies.',
  },
  speed: {
    section: 'Unit stats',
    title: 'Speed',
    text: 'Number of movement dice rolled when the unit activates.',
    todo: 'How enemies move: which hero they move towards, line of sight, moving between tiles.',
  },
  toughness: {
    section: 'Unit stats',
    title: 'Toughness',
    text: 'Damage needed to kill one miniature of this unit.',
  },
  abilities: {
    section: 'Unit stats',
    title: 'Special abilities',
    text: 'Extra rules for this unit. Each ability adds its point cost to the unit. Create and edit abilities in the Ability generator.',
    link: { to: '/abilities', label: 'Open abilities' },
  },

  // ---- Units: miniatures & spawning ----
  count: {
    section: 'Spawning',
    title: 'Miniatures owned',
    text: 'How many physical miniatures of this unit you own. The app never has more of them on the table at the same time.',
  },
  priority: {
    section: 'Spawning',
    title: 'Spawn priority',
    text: 'From 1 (rarely chosen) to 10 (often chosen). When a spawn happens, units with free miniatures are picked at random, weighted by this number.',
  },
  minSpawn: {
    section: 'Spawning',
    title: 'Min spawn number',
    text: 'This unit always spawns at least this many at once. It is only chosen if that many miniatures are free.',
  },
  groupedWith: {
    section: 'Spawning',
    title: 'Spawned together with',
    text: 'When this unit spawns, these units are added to the same tile if the spawn budget allows it and miniatures are free.',
  },
  spawnBudget: {
    section: 'Spawning',
    title: 'Spawn size',
    text: 'Each spawn has a points budget of 10 × number of heroes × difficulty (Easy 0.75, Normal 1, Hard 1.3, Nightmare 1.6). As many miniatures are spawned as fit in it, but at least the min spawn number.',
  },

  // ---- Abilities ----
  abilityCostType: {
    section: 'Abilities',
    title: 'Cost type',
    text: 'Additive abilities add a fixed number of points. Multiplicative abilities multiply the unit’s points, which suits abilities that get better the stronger the unit is. Unit points = (stats + additive abilities) × multiplicative abilities.',
  },
  abilityPoints: {
    section: 'Abilities',
    title: 'Ability points',
    text: 'Added to the points of every unit that has this ability. Negative values are allowed for drawbacks.',
  },
  abilityMultiplier: {
    section: 'Abilities',
    title: 'Multiplier',
    text: 'The unit’s points are multiplied by this, e.g. 1.25 = 25% more expensive, 0.8 = 20% cheaper. Several multipliers are multiplied together.',
  },
  abilityText: {
    section: 'Abilities',
    title: 'Rules text',
    text: 'What the ability does. Shown on the unit card during the game.',
  },

  // ---- Enemy lists ----
  enemyListUnits: {
    section: 'Enemy lists',
    title: 'Units that can spawn',
    text: 'Only these units can spawn in a game that uses this enemy list.',
    link: { to: '/units', label: 'Open units' },
  },

  // ---- Objectives & missions ----
  objectivePlacement: {
    section: 'Objectives & missions',
    title: 'Placed on',
    text: 'Where the app hides the objective at the start of the game. “A marker of a certain type”: on a random marker of that type (e.g. any Altar). “The objective location of a random tile”: on the objective location printed on every tile, on a random tile (never the starting tile, and preferably one without another objective). The objective is revealed when that tile is explored.',
  },
  markerType: {
    section: 'Objectives & missions',
    title: 'Marker type',
    text: 'The objective is hidden on a random tile marker of this type (e.g. Altar) and revealed when that tile is explored. If no tile in the map set has such a marker, it goes on the objective location of a random tile instead.',
    link: { to: '/tiles', label: 'Open map tiles' },
  },
  objectiveStart: {
    section: 'Objectives & missions',
    title: 'Start objective',
    text: 'Start objectives are listed in the game’s Objectives tab from the beginning. Untick it to make an objective that is only revealed once another objective has been completed.',
  },
  objectiveRevealedBy: {
    section: 'Objectives & missions',
    title: 'Revealed by',
    text: 'This objective stays hidden until the chosen objective has been completed. Then it appears in the Objectives tab, and is announced as soon as its tile is explored (right away if that tile is already on the table). If the chosen objective is not part of the mission, this one counts as a start objective.',
  },
  objectiveFlavour: {
    section: 'Objectives & missions',
    title: 'Flavour text',
    text: 'Story text shown in italics when the objective is discovered, before the setup instructions. Read it out to set the scene.',
  },
  objectiveSetup: {
    section: 'Objectives & missions',
    title: 'Setup when revealed',
    text: 'What the players place on the board when the tile with this objective is explored.',
  },
  objectiveCompletion: {
    section: 'Objectives & missions',
    title: 'How to complete it',
    text: 'What the heroes have to do. Mark the objective complete in the game’s Objectives tab.',
  },
  missionObjectives: {
    section: 'Objectives & missions',
    title: 'Mission objectives',
    text: 'The heroes win when all objectives of the mission are complete.',
    todo: 'Losing conditions (e.g. all heroes down, or a round limit).',
    link: { to: '/objectives', label: 'Open objectives' },
  },

  // ---- Map ----
  tileCode: {
    section: 'Map',
    title: 'Tile number / code',
    text: 'The number printed on the physical tile. Instructions refer to tiles by it, e.g. “activate all enemies on tile 7”.',
  },
  tileCollection: {
    section: 'Map',
    title: 'Collection',
    text: 'Groups tiles, e.g. a boxed set or a batch of homemade tiles. Filter the Map tiles list by collection, and add a whole collection to a map set in one go.',
  },
  tileMarkers: {
    section: 'Map',
    title: 'Location markers',
    text: 'Markers printed on the tile, each with a label (A, B…) and a type (Altar, Chest, Door…). Objectives are placed on markers by type.',
  },
  tileRules: {
    section: 'Map',
    title: 'Extra rules',
    text: 'Optional special rules for this tile (e.g. difficult terrain, traps). They are shown when the tile is drawn and can be looked up again in the game’s Tiles tab.',
  },
  mapSetTiles: {
    section: 'Map',
    title: 'Tiles in this set',
    text: 'The tile deck for a game. Every tile except the starting tile is shuffled; a new one is drawn whenever the heroes move off the explored board.',
    link: { to: '/tiles', label: 'Open map tiles' },
  },
  startTile: {
    section: 'Map',
    title: 'Starting tile',
    text: 'Placed at the start of the game. The heroes start here.',
  },

  // ---- Playing ----
  heroCount: {
    section: 'Playing',
    title: 'Number of heroes',
    text: 'Each round’s activation deck has one hero card per hero. Any hero with a ready activation token may act on a hero card. Also scales enemy cards and spawn sizes.',
  },
  difficulty: {
    section: 'Playing',
    title: 'Difficulty',
    text: 'Changes the number of enemy activation cards per round (heroes × 0.75 / 1 / 1.25 / 1.5), spawn cards (1 / 1 / 2 / 2) and spawn size.',
    todo: 'Final balance values, to be decided through playtesting.',
  },
  activationDeck: {
    section: 'Playing',
    title: 'Activation deck',
    text: 'Hero, enemy activation and spawn cards, reshuffled each round. Two enemy activation cards are never drawn back to back. If an enemy activation card is drawn while no enemies are on the board, it becomes a spawn card instead. Each enemy card activates all enemies on a third of the tiles in play (rounded up, e.g. 1 tile out of 1–3, 2 out of 4–6), chosen at random. Each spawn card spawns on a quarter of the tiles in play (rounded up, e.g. 1 tile out of 1–4, 2 out of 5–8).',
  },
} satisfies Record<string, RuleEntry>;

export type RuleKey = keyof typeof RULES;
