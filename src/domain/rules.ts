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
    text: 'Calculated automatically to balance difficulty. Stats = 10 × (expected damage dealt + expected damage to take out) × (1 + (Speed − 2) / 4). Damage dealt = attack value × damage value × (Strength − 1)/6, where each attack above the first adds 1.5 and each damage point above the first adds 0.75 (heroes spend a defence die on every attack, so attacks weigh more). Damage to take out = Toughness × Wounds × (Defense − 1)/6, × 0.75 with a defense type. Unit points = (stats + additive abilities) × multiplicative abilities.',
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
  attacks: {
    section: 'Unit stats',
    title: 'Attacks',
    text: 'How many attacks the unit makes when it attacks. The hero makes a separate defense roll against each one. Shown as “(×3)” after Strength when above 1.',
  },
  defense: {
    section: 'Unit stats',
    title: 'Defense',
    text: 'The number a hero must roll or higher (d6) on their attack roll to damage this unit.',
  },
  defenseType: {
    section: 'Unit stats',
    title: 'Defense type',
    text: 'None, Evasive or Armored. A defense type is a disadvantage for the unit: heroes can get bonuses on their attack rolls against it, e.g. +1 Strength vs Armored enemies. It lowers the defence part of the unit’s points by 25 %.',
    todo: 'Which hero bonuses exist against Evasive and Armored enemies.',
  },
  speed: {
    section: 'Unit stats',
    title: 'Speed',
    text: 'Number of movement dice rolled when the unit activates (at least 1: there are no stationary units). Speed 2 is the norm; each point above or below changes the unit’s points by 25 %.',
    todo: 'How enemies move: which hero they move towards, line of sight, moving between tiles.',
  },
  toughness: {
    section: 'Unit stats',
    title: 'Toughness',
    text: 'Damage needed to kill one miniature of this unit.',
  },
  wounds: {
    section: 'Unit stats',
    title: 'Wounds',
    text: 'How many wounds the unit has. Each wound takes Toughness damage to remove; the unit dies when all are gone. Shown as “(×2)” after Toughness when above 1.',
  },
  abilities: {
    section: 'Unit stats',
    title: 'Special abilities',
    text: 'Extra rules for this unit. Each ability adds its point cost to the unit. Create and edit abilities in the Ability generator.',
    link: { to: '/abilities', label: 'Open abilities' },
  },

  // ---- Bosses ----
  isBoss: {
    section: 'Bosses',
    title: 'Boss',
    text: 'A boss never spawns like other enemies. It only appears when an objective summons it. While it is on the board, its activation cards are in the activation deck, and each time one is drawn the boss acts through a card from its boss deck. Removing it from the board defeats it.',
  },
  bossActivations: {
    section: 'Bosses',
    title: 'Boss activations per round',
    text: 'How many boss activation cards go into the activation deck each round while the boss is alive. Like enemy activations, they are never drawn back to back.',
  },
  bossDeck: {
    section: 'Bosses',
    title: 'Boss deck',
    text: 'The boss cards this boss draws from, with the number of copies of each. Create boss cards under Abilities (tick “Boss deck card”). When the deck is used up, it is reshuffled.',
    link: { to: '/abilities', label: 'Open abilities' },
  },
  summonBoss: {
    section: 'Bosses',
    title: 'Summons a boss',
    text: 'When this objective is found or completed, the chosen boss appears: either at this objective or on a random tile in play. Each boss appears only once per game.',
  },
  defeatBoss: {
    section: 'Bosses',
    title: 'Completed when a boss is defeated',
    text: 'This objective is completed automatically when the chosen boss is defeated (removed from the board). Typical for objectives like “Slay the Warlord”, placed “not on the map”.',
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
  exploreSpawn: {
    section: 'Spawning',
    title: 'Spawn on explore',
    text: 'Whenever a new tile is explored, enemies spawn on it right away: half the usual spawn size (but at least the min spawn number). Move the newly spawned enemies once immediately. No spawn on the starting tile, and none if no miniatures are free.',
  },
  spawnBudget: {
    section: 'Spawning',
    title: 'Spawn size',
    text: 'Each spawn has a points budget of 10 × number of heroes × difficulty (Easy 0.75, Normal 1, Hard 1.3, Nightmare 1.6). As many miniatures are spawned as fit in it, but at least the min spawn number.',
  },

  // ---- Abilities ----
  abilityCollection: {
    section: 'Abilities',
    title: 'Collection',
    text: 'Groups abilities, e.g. by faction (“Undead”) or theme (“Poisons”), or the boss cards of one boss (“Goblin Warlord”). Use it to filter the Abilities list. For boss cards, a whole collection can also be added to a boss deck in one go.',
  },
  bossCard: {
    section: 'Bosses',
    title: 'Boss deck card',
    text: 'A card for a boss deck instead of a unit ability. Whenever a boss activates, the top card of its boss deck is drawn and the boss does what it says. Boss cards have no point cost.',
  },
  abilityCostType: {
    section: 'Abilities',
    title: 'Cost type',
    text: 'Additive abilities add a fixed number of points. Multiplicative abilities multiply the unit’s points, which suits abilities that get better the stronger the unit is. Dependent abilities add points calculated from chosen stats of the unit (e.g. Attacks × 2). Unit points = (stats + additive abilities) × multiplicative abilities.',
  },
  abilityDependent: {
    section: 'Abilities',
    title: 'Dependent cost',
    text: 'The ability’s points depend on the unit it is given to: the sum of each chosen stat × its multiplier. Example: Poisonous with Attacks × 2 + Strength × 1 costs 5 points on a Goblin (1 attack, Strength 3) and 8 on the Goblin King (2 attacks, Strength 4). Added like an additive cost.',
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
    text: 'Where the app hides the objective at the start of the game. “A marker”: on a random marker with that name (e.g. any Altar). “The objective location of a random tile”: on the objective location printed on every tile, on a random tile (never the starting tile, and preferably one without another objective). “Not on the map”: no place on a tile, e.g. “Slay the Warlord”; it is known as soon as it is unlocked. The objective is revealed when that tile is explored.',
  },
  markerType: {
    section: 'Objectives & missions',
    title: 'Marker',
    text: 'The objective is hidden on a random marker with this name (e.g. Altar) and revealed when that tile is explored. If no tile in the map set has such a marker, it goes on the objective location of a random tile instead.',
    link: { to: '/tiles', label: 'Open map tiles' },
  },
  questline: {
    section: 'Objectives & missions',
    title: 'Questline',
    text: 'Groups objectives that belong together, e.g. a key and the prisoner it frees. Filter the Objectives list by questline, and add a whole questline to a mission in one go.',
  },
  objectiveStart: {
    section: 'Objectives & missions',
    title: 'Start objective',
    text: 'Start objectives are available from the beginning. Untick it to give the objective a prerequisite: another objective that has to be completed first.',
  },
  objectiveRevealedBy: {
    section: 'Objectives & missions',
    title: 'Prerequisite',
    text: 'The objective that must be completed first. Until then this objective is hidden. If its tile is explored before the prerequisite is completed, it is shown as locked, with the “prerequisite not fulfilled” texts, and can’t be completed yet. Completing the prerequisite unlocks it. If the prerequisite is not part of the mission, this objective counts as a start objective.',
  },
  objectiveLockedFlavour: {
    section: 'Objectives & missions',
    title: 'Flavour text (prerequisite not fulfilled)',
    text: 'Story text shown in italics when the objective is found before its prerequisite is completed, e.g. a locked door the heroes can’t open yet.',
  },
  objectiveLockedText: {
    section: 'Objectives & missions',
    title: 'Text (prerequisite not fulfilled)',
    text: 'What the players do when the objective is found before its prerequisite is completed, e.g. “Place the prisoner in the cell. The door is locked until the key is found.”',
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
    text: 'Locations printed on the tile, each with a name (Altar, Chest, Door…). Objectives are placed on markers by name. A tile can have several markers with the same name; the players then pick one.',
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
  redrawTile: {
    section: 'Map',
    title: 'Redraw tile',
    text: 'If a drawn tile can’t be placed legally (for example it would close off the map), redraw it: the tile goes back into the tile deck at a random position (never on top) and a new tile is drawn. Objectives on the returned tile count as not found until it is drawn again.',
  },
  startTile: {
    section: 'Map',
    title: 'Starting tile',
    text: 'Placed at the start of the game; the heroes start here. It is the tile in the set that is marked as starting tile (under Map tiles). A map set should contain exactly one.',
  },
  startTileFlag: {
    section: 'Map',
    title: 'Starting tile',
    text: 'Mark tiles the heroes can start on. A starting tile has no objective location, so objectives placed on “the objective location of a random tile” never go here. Put exactly one starting tile in each map set.',
  },

  // ---- Playing ----
  heroCount: {
    section: 'Playing',
    title: 'Number of heroes',
    text: 'Each round’s activation deck has one hero card per hero. Any hero with a ready activation token may act on a hero card. Also scales enemy cards and spawn sizes.',
  },
  diffBudget: {
    section: 'Playing',
    title: 'Spawn size',
    text: 'Multiplies the spawn budget (10 points per hero): 1 = normal, 1.5 = half again as many enemies per spawn.',
  },
  diffEnemyCards: {
    section: 'Playing',
    title: 'Enemy cards per hero',
    text: 'Enemy activation cards per round = heroes × this, rounded, at least 1, and at most the number of hero + spawn cards (they are never drawn back to back).',
  },
  diffSpawnCards: {
    section: 'Playing',
    title: 'Spawn cards per round',
    text: 'How many spawn cards are shuffled into the activation deck each round.',
  },
  diffExploreSpawn: {
    section: 'Playing',
    title: 'Spawn on explore',
    text: 'Size of the spawn on a newly explored tile, as a share of a normal spawn: 0.5 = half, 0 = no spawn on explore.',
  },
  difficulty: {
    section: 'Playing',
    title: 'Difficulty',
    text: 'Changes the number of enemy activation cards per round (heroes × 0.75 / 1 / 1.25 / 1.5), spawn cards (1 / 1 / 2 / 2) and spawn size (× 0.75 / 1 / 1.3 / 1.6). Choose “Custom…” to set every value yourself, and save your settings as a preset to use them again later.',
    todo: 'Final balance values, to be decided through playtesting.',
  },
  activationDeck: {
    section: 'Playing',
    title: 'Activation deck',
    text: 'Hero, enemy activation and spawn cards, reshuffled each round. Two enemy activation cards are never drawn back to back. If an enemy activation card is drawn while no enemies are on the board, it becomes a spawn card instead. If a spawn card is drawn while no miniatures are left to spawn, it activates all enemies on a single random tile instead. Each enemy card activates all enemies on a third of the tiles in play (rounded up, e.g. 1 tile out of 1–3, 2 out of 4–6), chosen at random. Each spawn card spawns on a quarter of the tiles in play (rounded up, e.g. 1 tile out of 1–4, 2 out of 5–8).',
  },
} satisfies Record<string, RuleEntry>;

export type RuleKey = keyof typeof RULES;
