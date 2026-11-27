import { describe, expect, it } from 'vitest';
import { autoCodes, letterCode, letterIndex, naturalCompare, planImport, splitCode, tileNameFromFile } from './tileImport';

describe('tile import', () => {
  it('turns file names into tile names', () => {
    expect(tileNameFromFile('goblin_cave-02.jpg')).toBe('goblin cave 02');
    expect(tileNameFromFile('Throne Room.PNG')).toBe('Throne Room');
    expect(tileNameFromFile('a.b.webp')).toBe('a.b');
  });

  it('counts in letters like spreadsheet columns', () => {
    expect([1, 2, 26, 27, 28, 52, 53].map(letterCode)).toEqual(['A', 'B', 'Z', 'AA', 'AB', 'AZ', 'BA']);
    expect(letterIndex('AB')).toBe(28);
    expect(letterIndex('7')).toBe(0);
  });

  it('continues after the codes already in use', () => {
    expect(autoCodes('numbers', 3, [])).toEqual(['1', '2', '3']);
    expect(autoCodes('numbers', 2, ['1', '12', 'B', 'start'])).toEqual(['13', '14']);
    expect(autoCodes('letters', 3, ['1', 'Y'])).toEqual(['Z', 'AA', 'AB']);
  });

  it('sorts numbers inside names naturally', () => {
    expect(['tile 10', 'tile 2', 'Tile 1'].sort(naturalCompare)).toEqual(['Tile 1', 'tile 2', 'tile 10']);
  });

  it('reads codes from the start or end of the file name', () => {
    expect(splitCode('A_street.png', 'prefix')).toEqual({ code: 'A', name: 'street' });
    expect(splitCode('12-dark_corner.jpg', 'prefix')).toEqual({ code: '12', name: 'dark corner' });
    expect(splitCode('street_A.png', 'suffix')).toEqual({ code: 'A', name: 'street' });
    expect(splitCode('dark corner 7.png', 'suffix')).toEqual({ code: '7', name: 'dark corner' });
    expect(splitCode('street.png', 'prefix')).toEqual({ code: '', name: 'street' });
  });

  it('plans an import with either automatic or file-name codes', () => {
    expect(planImport(['a.png', 'b.png'], 'letters', ['A'])).toEqual([{ code: 'B', name: 'a' }, { code: 'C', name: 'b' }]);
    expect(planImport(['corner_B.png'], 'suffix', [])).toEqual([{ code: 'B', name: 'corner' }]);
  });
});
