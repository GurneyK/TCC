/**
 * mulberry32: a tiny seeded PRNG. The only source of randomness in data,
 * agents and the simulator. Pass a saved state back in to resume a sequence.
 */
export function createRng(seed: number) {
  let state = seed >>> 0;

  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  return {
    next,
    int(min: number, max: number) {
      return Math.floor(next() * (max - min + 1)) + min;
    },
    between(min: number, max: number) {
      return min + next() * (max - min);
    },
    pick<T>(items: readonly T[]): T {
      return items[Math.floor(next() * items.length)];
    },
    chance(p: number) {
      return next() < p;
    },
    getState() {
      return state;
    },
  };
}

export type Rng = ReturnType<typeof createRng>;
