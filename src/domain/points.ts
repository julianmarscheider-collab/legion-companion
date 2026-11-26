import { STAT_LABELS, type Ability, type StatKey, type Unit } from './types';

// Automatic point values. Tune the constants here to rebalance every unit at once.
//
//   points = SCALE × (expected damage dealt + expected damage to take out) × speed factor
//
// The hero rolls a d6 against Strength (to deflect) and Defense (to do damage):
// a value x stands for a (x − 1)/6 chance, so higher values are always better.
const SCALE = 10;
/** A defense type is a disadvantage: heroes get bonuses against it. */
const DEFENSE_TYPE_FACTOR = { None: 1, Evasive: 0.75, Armored: 0.75 } as const;

/** Dice chance of a stat value: 2 → 1/6, 3 → 2/6 … 7 → 6/6. */
export function diceChance(value: number): number {
  return Math.min(1, Math.max(0, (value - 1) / 6));
}

export const attacksOf = (u: Pick<Unit, 'attacks'>) => Math.max(1, u.attacks ?? 1);
export const woundsOf = (u: Pick<Unit, 'wounds'>) => Math.max(1, u.wounds ?? 1);

/**
 * Heroes spend a defence die on every attack, so more attacks weigh more than
 * more damage: each attack above the first adds ×1.5, each damage point above
 * the first adds ×0.75 (a unit with 1 attack and 1 damage counts as 1).
 */
const EXTRA_ATTACK_WEIGHT = 1.5;
const EXTRA_DAMAGE_WEIGHT = 0.75;
export const attackValue = (u: Pick<Unit, 'attacks'>) => 1 + EXTRA_ATTACK_WEIGHT * (attacksOf(u) - 1);
export const damageValue = (u: Pick<Unit, 'damage'>) => (u.damage <= 0 ? 0 : 1 + EXTRA_DAMAGE_WEIGHT * (u.damage - 1));

/** Expected damage dealt: attack value × damage value × dice chance of Strength. */
export function damageDealt(u: Pick<Unit, 'strength' | 'damage' | 'attacks'>): number {
  return attackValue(u) * damageValue(u) * diceChance(u.strength);
}

/** Expected damage to take out: Toughness × Wounds × dice chance of Defense (× 0.75 with a defense type). */
export function damageToTakeOut(u: Pick<Unit, 'defense' | 'toughness' | 'defenseType' | 'wounds'>): number {
  return u.toughness * woundsOf(u) * diceChance(u.defense) * DEFENSE_TYPE_FACTOR[u.defenseType];
}

/** 1 + (Speed − 2) / 4: Speed 1 → ×0.75, 2 → ×1, 3 → ×1.25, 4 → ×1.5. Units always move (Speed ≥ 1). */
export function speedFactor(u: Pick<Unit, 'speed'>): number {
  return 1 + (Math.max(1, u.speed) - 2) / 4;
}

export function basePoints(u: Unit): number {
  return Math.round(SCALE * (damageDealt(u) + damageToTakeOut(u)) * speedFactor(u));
}

function unitAbilities(u: Unit, abilities: Ability[]): Ability[] {
  const byId = new Map(abilities.map((a) => [a.id, a]));
  return u.abilityIds.map((id) => byId.get(id)).filter((a): a is Ability => !!a);
}

export const isMultiplier = (a: Ability) => a.costType === 'multiply';

/** The unit's value of a stat (Attacks and Wounds count as at least 1). */
export function statValue(u: Unit, stat: StatKey): number {
  if (stat === 'attacks') return attacksOf(u);
  if (stat === 'wounds') return woundsOf(u);
  return u[stat];
}

/** Points of an additive or dependent ability for this unit (multiplicative abilities: 0). */
export function abilityCostFor(a: Ability, u: Unit): number {
  if (a.costType === 'multiply') return 0;
  if (a.costType === 'dependent') return (a.dependsOn ?? []).reduce((sum, d) => sum + d.factor * statValue(u, d.stat), 0);
  return a.points;
}

/** Sum of the unit's additive and dependent ability costs. */
export function abilityPoints(u: Unit, abilities: Ability[]): number {
  return unitAbilities(u, abilities).reduce((sum, a) => sum + abilityCostFor(a, u), 0);
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
  if (isMultiplier(a)) return `×${a.multiplier ?? 1}`;
  if (a.costType === 'dependent') return dependentFormula(a);
  return `${a.points >= 0 ? '+' : ''}${a.points} pts`;
}

/** e.g. "2×Attacks + 1×Strength" */
export function dependentFormula(a: Ability): string {
  const terms = (a.dependsOn ?? []).map((d) => `${d.factor}×${STAT_LABELS[d.stat]}`);
  return terms.length ? terms.join(' + ') : '0 pts';
}

/** Cost label for a specific unit, e.g. "+5 pts (2×Attacks + 1×Strength)". */
export function abilityCostLabelFor(a: Ability, u: Unit): string {
  if (a.costType !== 'dependent') return abilityCostLabel(a);
  const p = Math.round(abilityCostFor(a, u) * 10) / 10;
  return `${p >= 0 ? '+' : ''}${p} pts: ${dependentFormula(a)}`;
}
