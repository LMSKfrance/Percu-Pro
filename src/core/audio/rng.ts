/**
 * Seeded RNG for deterministic probability in the scheduler.
 */

export function hashStringToSeed(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    h = (h << 5) - h + c;
    h = h | 0;
  }
  return (h >>> 0) >>> 0;
}

/**
 * Mulberry32 PRNG. Returns a function that yields numbers in [0, 1).
 */
export function mulberry32(seed: number): () => number {
  return function next() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
