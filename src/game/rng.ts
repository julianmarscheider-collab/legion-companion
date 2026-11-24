// Small seeded RNG (mulberry32). Its state lives in the game snapshot, so
// saving, loading and undoing a draw is fully deterministic.
export class Rng {
  constructor(public state: number) {}

  next(): number {
    let t = (this.state = (this.state + 0x6d2b79f5) | 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  int(maxExclusive: number): number {
    return Math.floor(this.next() * maxExclusive);
  }

  shuffle<T>(items: T[]): T[] {
    const a = [...items];
    for (let i = a.length - 1; i > 0; i--) {
      const j = this.int(i + 1);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /** Pick `n` distinct items at random. */
  sample<T>(items: T[], n: number): T[] {
    return this.shuffle(items).slice(0, n);
  }

  weighted<T>(items: T[], weight: (t: T) => number): T | undefined {
    const total = items.reduce((s, t) => s + Math.max(0, weight(t)), 0);
    if (total <= 0) return undefined;
    let r = this.next() * total;
    for (const t of items) {
      r -= Math.max(0, weight(t));
      if (r < 0) return t;
    }
    return items[items.length - 1];
  }
}

export function randomSeed(): number {
  return (Math.random() * 2 ** 32) | 0;
}
