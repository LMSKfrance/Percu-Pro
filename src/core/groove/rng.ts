/**
 * Seeded PRNG (mulberry32) for deterministic groove generation.
 * Every random decision must use this RNG. No Math.random.
 */

export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  return function next() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Hash a string to a 32-bit seed (deterministic).
 */
export function hashStringToSeed(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function nextFloat(rng: Rng): number {
  return rng();
}

export function nextInt(rng: Rng, max: number): number {
  if (max <= 0) return 0;
  return Math.floor(rng() * max);
}

export interface WeightedOption<T> {
  value: T;
  weight: number;
}

export function pickWeighted<T>(rng: Rng, options: WeightedOption<T>[]): T {
  const total = options.reduce((s, o) => s + o.weight, 0);
  if (total <= 0) return options[0]?.value as T;
  let u = rng() * total;
  for (const o of options) {
    u -= o.weight;
    if (u <= 0) return o.value;
  }
  return options[options.length - 1]?.value as T;
}
