import { describe, expect, it } from 'vitest';
import { chance, unitPoints } from './points';
import type { Unit } from './types';

const base: Unit = {
  id: 'u', ownerId: 'o', createdAt: 0, updatedAt: 0, name: 'Rat', faction: '', description: '', photos: [],
  strength: 3, damage: 1, defense: 3, defenseType: 'None', speed: 2, toughness: 1,
  abilityIds: [], count: 10,
  spawn: { priority: 5, groupedWith: [], minSpawn: 1 },
};

describe('points', () => {
  it('computes d6 chances', () => {
    expect(chance(4)).toBeCloseTo(0.5);
    expect(chance(1)).toBe(1);
    expect(chance(9)).toBeCloseTo(1 / 6);
  });

  it('makes stronger units cost more', () => {
    const rat = unitPoints(base, []);
    const ogre = unitPoints({ ...base, strength: 5, damage: 3, defense: 4, toughness: 5, defenseType: 'Armored' }, []);
    expect(ogre).toBeGreaterThan(rat * 5);
  });

  it('multiplies by multiplicative abilities after adding additive ones', () => {
    const meta = { ownerId: 'o', createdAt: 0, updatedAt: 0, description: '' };
    const abilities = [
      { ...meta, id: 'add', name: 'Poison', points: 4 },
      { ...meta, id: 'mul', name: 'Elite', points: 0, costType: 'multiply' as const, multiplier: 1.5 },
      { ...meta, id: 'mul2', name: 'Swarm', points: 0, costType: 'multiply' as const, multiplier: 2 },
    ];
    const ogre = { ...base, strength: 5, damage: 3, defense: 4, toughness: 5 };
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
