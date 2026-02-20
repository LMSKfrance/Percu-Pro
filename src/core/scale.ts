/**
 * Musical scale definitions (semitones from root per octave) and quantize helper.
 * Used to constrain pitch faders to scale degrees when Scale is on.
 */

export const SCALE_DEGREES: Record<string, number[]> = {
  Chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  Major: [0, 2, 4, 5, 7, 9, 11],
  Minor: [0, 2, 3, 5, 7, 8, 10],
  Dorian: [0, 2, 3, 5, 7, 9, 10],
  Phrygian: [0, 1, 3, 5, 7, 8, 10],
  Lydian: [0, 2, 4, 6, 7, 9, 11],
  Mixolydian: [0, 2, 4, 5, 7, 9, 10],
  Pentatonic: [0, 2, 4, 7, 9],
};

/** Quantize a semitone value (-24..+24) to the nearest degree in the scale (per octave). */
export function quantizeToScale(semitone: number, scaleKey: string): number {
  const degrees = SCALE_DEGREES[scaleKey] ?? SCALE_DEGREES.Chromatic;
  if (degrees.length === 12) return semitone; // Chromatic: no quantize

  const octave = Math.floor(semitone / 12);
  const inOctave = ((semitone % 12) + 12) % 12;

  let nearest = degrees[0];
  let bestDist = Math.abs(inOctave - nearest);
  for (const d of degrees) {
    const dist = Math.abs(inOctave - d);
    if (dist < bestDist) {
      bestDist = dist;
      nearest = d;
    }
  }

  return octave * 12 + nearest;
}
