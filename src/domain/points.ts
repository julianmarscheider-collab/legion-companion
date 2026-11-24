import type { Ability, Unit } from './types';

// Automatic point values. All rolls are assumed to be d6 "X+" rolls.
// Tune the constants here to rebalance every unit at once.
const THREAT_WEIGHT = 4;
const SPEED_WEIGHT = 2;
const DEFENSE_TYPE_MULTIPLIER = { None: 1, Evasive: 1.15, Armored: 1.15 } as const;

/** Chance that a d6 roll of `target`+ succeeds. */
export function chance(target: number): number {
  return Math.min(1, Math.max(1 / 6, (7 - target) / 6));
}

/** Expected damage per attack against a hero. */
export function threat(u: Pick<Unit, 'strength' | 'damage'>): number {
  return u.damage * (1 - chance(u.strength));
}

/** Expected number of hero attacks needed to kill the unit. */
export function durability(u: Pick<Unit, 'defense' | 'toughness' | 'defenseType'>): number {
  return (u.toughness / chance(u.defense)) * DEFENSE_TYPE_MULTIPLIER[u.defenseType];
}

export function basePoints(u: Unit): number {
  return Math.round(THREAT_WEIGHT * threat(u) * durability(u) + SPEED_WEIGHT * u.speed);
}

function unitAbilities(u: Unit, abilities: Ability[]): Ability[] {
  const byId = new Map(abilities.map((a) => [a.id, a]));
  return u.abilityIds.map((id) => byId.get(id)).filter((a): a is Ability => !!a);
}

export const isMultiplier = (a: Ability) => a.costType === 'multiply';

/** Sum of the unit's additive ability costs. */
export function abilityPoints(u: Unit, abilities: Ability[]): number {
  return unitAbilities(u, abilities)
    .filter((a) => !isMultiplier(a))
    .reduce((sum, a) => sum + a.points, 0);
}

/** Product of the unit's multiplicative ability costs (1 if none). */
export function abilityMultiplier(u: Unit, abilities: Ability[]): number {
  return unitAbilities(u, abilities)
    .filter(isMultiplier)
    .reduce((m, a) => m * (a.multiplier ?? 1), 1);
}

/** (stats + additive abilities) × multiplicative abilities */
export function unitPoints(u: Unit, abilities: Ability[]): number {
  return Math.max(1, Math.round((basePoints(u) + abilityPoints(u, abilities)) * abilityMultiplier(u, abilities)));
}

/** Short cost label, e.g. "+4 pts" or "×1.25". */
export function abilityCostLabel(a: Ability): string {
  return isMultiplier(a) ? `×${a.multiplier ?? 1}` : `${a.points >= 0 ? '+' : ''}${a.points} pts`;
}
