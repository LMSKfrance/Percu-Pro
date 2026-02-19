/**
 * Resolve city + influence + artist lenses + mode into numeric style biases.
 * Hardcoded table; brainTexts used only to confirm tags and debug strings.
 */

import { getText, listTexts } from "../brainTexts";

export interface StyleBiases {
  densityBias: number;
  swingBias: number;
  timelineBias: number;
  accentSharpness: number;
  ghostProbBias: number;
  noiseBias: number;
  harshnessPenalty: number;
}

export interface ResolveStyleVectorInput {
  cityProfile: string;
  influenceVector: string[];
  artistLenses: string[];
  mode: string;
}

export interface ResolveStyleVectorResult {
  biases: StyleBiases;
  unknownTags: string[];
  debugStrings: string[];
}

const KNOWN_INFLUENCES = new Set([
  "Hardwax", "Tresor", "Perlon", "Chicago", "Acid", "Kraut", "Birmingham",
  "DeepAfrica", "Disco", "AfroFunk", "AfroDisco", "Chicago_house", "acid_303",
  "kraut_motorik", "birmingham", "deep_africa", "disco", "afro_funk", "afro_disco",
  "perlon", "hardwax", "tresor",
]);
const KNOWN_LENSES = new Set([
  "Mills", "Atkins", "Huckaby", "Steffi", "Surgeon", "Regis", "DJDeep",
  "mills", "atkins", "huckaby", "steffi", "surgeon", "regis", "djdeep",
]);
const KNOWN_MODES = new Set([
  "CLEAN_FUNCTIONAL", "GRIT_PRESSURE", "CEREMONIAL_INTERLOCK", "INDUSTRIAL_TENSION",
  "PLAYFUL_SYNC", "DISCO_LIFT", "ACID_FOCUS", "MOTORIK_DRIVE", "FUTURIST_FUNK",
]);
const KNOWN_CITIES = new Set(["Detroit", "Berlin", "Tbilisi", "detroit", "berlin", "tbilisi"]);

const CITY_BIAS: Record<string, Partial<StyleBiases>> = {
  Detroit: { densityBias: -0.02, swingBias: 1, accentSharpness: 0.15 },
  Berlin: { densityBias: 0.02, swingBias: -1, harshnessPenalty: 0.05 },
  Tbilisi: { densityBias: 0, timelineBias: 0.1, ghostProbBias: 0.05 },
};

const INFLUENCE_BIAS: Record<string, Partial<StyleBiases>> = {
  AfroFunk: { densityBias: -0.05, swingBias: 2, timelineBias: 0.1, ghostProbBias: 0.05 },
  AfroDisco: { densityBias: 0, swingBias: 2, timelineBias: 0.15, accentSharpness: 0.1 },
  Perlon: { swingBias: 2, ghostProbBias: 0.08 },
  Disco: { swingBias: 2, accentSharpness: 0.1 },
};

const LENS_BIAS: Record<string, Partial<StyleBiases>> = {
  Huckaby: { densityBias: -0.08, harshnessPenalty: 0.1 },
  Surgeon: { accentSharpness: 0.1, densityBias: -0.03 },
  Mills: { densityBias: -0.05, accentSharpness: 0.15 },
  Steffi: { harshnessPenalty: 0.15 },
  Regis: { swingBias: -1, accentSharpness: 0.2 },
  Atkins: { timelineBias: 0.1, ghostProbBias: 0.05 },
  DJDeep: { swingBias: 1, ghostProbBias: 0.05 },
};

const MODE_BIAS: Record<string, Partial<StyleBiases>> = {
  FUTURIST_FUNK: { timelineBias: 0.15, ghostProbBias: 0.1, accentSharpness: 0.15 },
  CLEAN_FUNCTIONAL: { densityBias: -0.05, swingBias: -1, noiseBias: -0.1, accentSharpness: 0.1 },
  GRIT_PRESSURE: { densityBias: 0.05, noiseBias: 0.12, accentSharpness: 0.2 },
  MOTORIK_DRIVE: { swingBias: -2, ghostProbBias: 0.05 },
  DISCO_LIFT: { swingBias: 2, ghostProbBias: 0.08 },
};

function mergeBiases(base: StyleBiases, delta: Partial<StyleBiases>): StyleBiases {
  return {
    densityBias: base.densityBias + (delta.densityBias ?? 0),
    swingBias: base.swingBias + (delta.swingBias ?? 0),
    timelineBias: base.timelineBias + (delta.timelineBias ?? 0),
    accentSharpness: base.accentSharpness + (delta.accentSharpness ?? 0),
    ghostProbBias: base.ghostProbBias + (delta.ghostProbBias ?? 0),
    noiseBias: base.noiseBias + (delta.noiseBias ?? 0),
    harshnessPenalty: base.harshnessPenalty + (delta.harshnessPenalty ?? 0),
  };
}

export function resolveStyleVector(input: ResolveStyleVectorInput): ResolveStyleVectorResult {
  const unknownTags: string[] = [];
  const debugStrings: string[] = [];
  let biases: StyleBiases = {
    densityBias: 0,
    swingBias: 0,
    timelineBias: 0,
    accentSharpness: 0,
    ghostProbBias: 0,
    noiseBias: 0,
    harshnessPenalty: 0,
  };

  const city = input.cityProfile;
  if (KNOWN_CITIES.has(city) || city in CITY_BIAS) {
    const key = city.charAt(0).toUpperCase() + city.slice(1).toLowerCase();
    const delta = CITY_BIAS[key];
    if (delta) biases = mergeBiases(biases, delta);
  } else if (input.cityProfile) unknownTags.push(`city:${input.cityProfile}`);

  for (const tag of input.influenceVector) {
    const norm = tag.replace(/_/g, "").replace(/^./, (c) => c.toUpperCase());
    const key = tag.includes("Afro") ? tag : norm;
    if (KNOWN_INFLUENCES.has(tag) || KNOWN_INFLUENCES.has(norm) || key in INFLUENCE_BIAS) {
      const delta = INFLUENCE_BIAS[key] ?? INFLUENCE_BIAS[tag] ?? INFLUENCE_BIAS[norm];
      if (delta) biases = mergeBiases(biases, delta);
      const text = getText(tag.toLowerCase().replace(/\s/g, "_"));
      if (text) debugStrings.push(`influence:${tag}`);
    } else unknownTags.push(`influence:${tag}`);
  }

  for (const lens of input.artistLenses) {
    const key = lens.charAt(0).toUpperCase() + lens.slice(1);
    if (KNOWN_LENSES.has(lens) || KNOWN_LENSES.has(key) || key in LENS_BIAS) {
      const delta = LENS_BIAS[key] ?? LENS_BIAS[lens];
      if (delta) biases = mergeBiases(biases, delta);
      const text = getText(lens.toLowerCase());
      if (text) debugStrings.push(`lens:${lens}`);
    } else unknownTags.push(`lens:${lens}`);
  }

  const mode = input.mode;
  if (KNOWN_MODES.has(mode) || mode in MODE_BIAS) {
    const delta = MODE_BIAS[mode];
    if (delta) biases = mergeBiases(biases, delta);
    debugStrings.push(`mode:${mode}`);
  } else if (input.mode) unknownTags.push(`mode:${input.mode}`);

  return { biases, unknownTags, debugStrings };
}
