import { describe, expect, it } from 'vitest';
import { basePoints, diceChance, unitPoints } from './points';
import type { Unit } from './types';

const base: Unit = {
  id: 'u', ownerId: 'o', createdAt: 0, updatedAt: 0, name: 'Rat', faction: '', description: '', photos: [],
  strength: 3, damage: 1, defense: 3, defenseType: 'None', speed: 2, toughness: 1,
  abilityIds: [], count: 10,
  spawn: { priority: 5, groupedWith: [], minSpawn: 1 },
};

describe('points', () => {
  it('uses (value − 1) / 6 as the dice chance', () => {
    expect(diceChance(2)).toBeCloseTo(1 / 6);
    expect(diceChance(3)).toBeCloseTo(2 / 6);
    expect(diceChance(6)).toBeCloseTo(5 / 6);
  });

  it('computes 10 × (damage dealt + damage to take out) × speed factor', () => {
    // Goblin: (1×1×2/6 + 1×1×2/6) × 1 = 0.67 → 7
    expect(basePoints(base)).toBe(7);
    // Goblin King: (2.5×1×3/6 + 6×1×3/6×0.75) × 1 = 3.5 → 35 (2 attacks = 2.5; Armored: defence part × 0.75)
    expect(basePoints({ ...base, strength: 4, attacks: 2, defense: 4, toughness: 6, defenseType: 'Armored' })).toBe(35);
    // Cave Troll: (1×1.75×4/6 + 3×2×3/6×0.75) × 0.75 = 2.56 → 26 (2 damage = 1.75)
    expect(basePoints({ ...base, strength: 5, damage: 2, defense: 4, toughness: 3, wounds: 2, defenseType: 'Armored', speed: 1 })).toBe(26);
    // Speed 4: × 1.5
    expect(basePoints({ ...base, speed: 4 })).toBe(10);
  });

  it('weighs an extra attack more than an extra damage point', () => {
    const p = (over: Partial<Unit>) => basePoints({ ...base, ...over });
    expect(p({ attacks: 2 })).toBeGreaterThan(p({ damage: 2 }));
    expect(p({ damage: 0 })).toBe(Math.round(10 * (1 * 2 / 6))); // no damage: only the take-out part counts
  });

  it('makes higher values always more expensive', () => {
    const p = (over: Partial<Unit>) => basePoints({ ...base, ...over });
    expect(p({ strength: 4 })).toBeGreaterThan(p({}));
    expect(p({ defense: 4 })).toBeGreaterThan(p({}));
    expect(p({ speed: 3 })).toBeGreaterThan(p({}));
    expect(p({ defenseType: 'Evasive' })).toBeLessThan(p({}));
    expect(p({ speed: 0 })).toBe(p({ speed: 1 })); // no stationary units: speed counts as at least 1
  });

  it('multiplies by multiplicative abilities after adding additive ones', () => {
    const meta = { ownerId: 'o', createdAt: 0, updatedAt: 0, description: '' };
    const abilities = [
      { ...meta, id: 'add', name: 'Poison', points: 4 },
      { ...meta, id: 'mul', name: 'Elite', points: 0, costType: 'multiply' as const, multiplier: 1.5 },
      { ...meta, id: 'mul2', name: 'Swarm', points: 0, costType: 'multiply' as const, multiplier: 2 },
    ];
    const ogre = { ...base, strength: 5, damage: 3, defense: 4, toughness: 5 };
    expect(unitPoints(ogre, [])).toBeGreaterThan(20);
    const stats = unitPoints(ogre, []);
    expect(unitPoints({ ...ogre, abilityIds: ['add', 'mul'] }, abilities)).toBe(Math.round((stats + 4) * 1.5));
    expect(unitPoints({ ...ogre, abilityIds: ['mul', 'mul2'] }, abilities)).toBe(Math.round(stats * 3));
  });

  it('counts attacks and wounds', () => {
    const one = unitPoints(base, []);
    expect(unitPoints({ ...base, attacks: 3 }, [])).toBeGreaterThan(one);
    expect(unitPoints({ ...base, wounds: 2 }, [])).toBeGreaterThan(one);
    expect(unitPoints({ ...base, attacks: 1, wounds: 1 }, [])).toBe(one); // 1 = same as before
  });

  it('adds ability points', () => {
    const abilities = [{ id: 'a', ownerId: 'o', createdAt: 0, updatedAt: 0, name: 'Poison', description: '', points: 3 }];
    const p = unitPoints({ ...base, abilityIds: ['a'] }, abilities);
    expect(p).toBe(unitPoints(base, []) + 3);
  });
});
