/** Helpers for importing a folder of images as map tiles. */

/** Automatic codes (numbers / letters), or the code is already part of the file name (prefix "A_street" / suffix "street_A"). */
export type CodeStyle = 'numbers' | 'letters' | 'prefix' | 'suffix';

/** "goblin_cave-02.jpg" → "goblin cave 02": file extension dropped, _ and - read as spaces. */
export function tileNameFromFile(fileName: string): string {
  const base = fileName.replace(/\.[^.]+$/, '');
  return base.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim() || base;
}

/** 1 → A, 26 → Z, 27 → AA, 28 → AB … */
export function letterCode(n: number): string {
  let s = '';
  for (let k = n; k > 0; k = Math.floor((k - 1) / 26)) s = String.fromCharCode(65 + ((k - 1) % 26)) + s;
  return s;
}

/** A → 1, Z → 26, AA → 27; 0 when it isn't a letter code. */
export function letterIndex(code: string): number {
  if (!/^[A-Za-z]+$/.test(code)) return 0;
  return [...code.toUpperCase()].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0);
}

/** The first number / letter after the highest code of that style already in use, so imported tiles never clash. */
export function nextFreeIndex(style: 'numbers' | 'letters', existingCodes: string[]): number {
  const used = existingCodes.map((c) => c.trim()).map((c) => (style === 'numbers' ? (/^\d+$/.test(c) ? Number(c) : 0) : letterIndex(c)));
  return Math.max(0, ...used) + 1;
}

/** `count` codes in a row, starting after the existing ones. */
export function autoCodes(style: 'numbers' | 'letters', count: number, existingCodes: string[]): string[] {
  const start = nextFreeIndex(style, existingCodes);
  return Array.from({ length: count }, (_, i) => (style === 'numbers' ? String(start + i) : letterCode(start + i)));
}

/** Sort file names the way people expect: "tile 2" before "tile 10". */
export function naturalCompare(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

/**
 * Read the tile code from the file name: "A_street" (prefix) or "street_A" (suffix).
 * The code is the first / last word, separated by _, - or a space. No separator → no code; the whole name is kept.
 */
export function splitCode(fileName: string, where: 'prefix' | 'suffix'): { code: string; name: string } {
  const base = fileName.replace(/\.[^.]+$/, '').trim();
  const m = where === 'prefix' ? base.match(/^([^\s_-]+)[\s_-]+(.+)$/) : base.match(/^(.+?)[\s_-]+([^\s_-]+)$/);
  if (!m) return { code: '', name: tileNameFromFile(base) };
  const [code, rest] = where === 'prefix' ? [m[1], m[2]] : [m[2], m[1]];
  return { code, name: tileNameFromFile(rest) };
}

/** Code and name for each file (already in import order). */
export function planImport(fileNames: string[], style: CodeStyle, existingCodes: string[]): { code: string; name: string }[] {
  if (style === 'prefix' || style === 'suffix') return fileNames.map((f) => splitCode(f, style));
  const codes = autoCodes(style, fileNames.length, existingCodes);
  return fileNames.map((f, i) => ({ code: codes[i], name: tileNameFromFile(f) }));
}
