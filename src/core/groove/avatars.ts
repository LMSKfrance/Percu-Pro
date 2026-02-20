/**
 * Avatar profiles for groove generation. Hukaby = Groove Wizard.
 * Do not remove existing avatar names or replace their visuals; only improve logic influence.
 */

import type { AvatarProfile } from "./types";

export const AVATAR_PROFILES: AvatarProfile[] = [
  {
    id: "hukaby",
    name: "Hukaby",
    densityBias: -0.05,
    syncopationBias: 0.25,
    accentBias: 0.15,
    ratchetBias: 0.2,
    microShiftBias: 0.3,
    swingTaste: 1.2,
  },
  {
    id: "kick",
    name: "Kick",
    densityBias: -0.2,
    syncopationBias: 0.1,
    accentBias: 0.05,
    ratchetBias: -0.3,
    microShiftBias: -0.2,
    swingTaste: 0.6,
  },
  {
    id: "hat",
    name: "Hat",
    densityBias: 0.05,
    syncopationBias: 0.35,
    accentBias: 0.25,
    ratchetBias: 0.25,
    microShiftBias: 0.4,
    swingTaste: 1.4,
  },
  {
    id: "clap",
    name: "Clap",
    densityBias: -0.1,
    syncopationBias: 0.05,
    accentBias: 0.2,
    ratchetBias: -0.1,
    microShiftBias: 0.15,
    swingTaste: 0.9,
  },
  {
    id: "perc",
    name: "Perc",
    densityBias: 0.1,
    syncopationBias: 0.4,
    accentBias: 0.2,
    ratchetBias: 0.35,
    microShiftBias: 0.35,
    swingTaste: 1.1,
  },
  {
    id: "fx",
    name: "FX",
    densityBias: -0.4,
    syncopationBias: 0.2,
    accentBias: 0.1,
    ratchetBias: -0.2,
    microShiftBias: 0.5,
    swingTaste: 0.8,
  },
];

const AVATAR_MAP = new Map(AVATAR_PROFILES.map((a) => [a.id, a]));

export function getAvatarProfile(id: string): AvatarProfile | undefined {
  return AVATAR_MAP.get(id.toLowerCase()) ?? AVATAR_MAP.get("hukaby");
}

/** Alias for style resolver compatibility. */
export function getHuckabyProfile(): AvatarProfile {
  return getAvatarProfile("hukaby") ?? AVATAR_PROFILES[0];
}

export function getAvatarForRole(role: string): AvatarProfile {
  const id = role.toLowerCase();
  return getAvatarProfile(id) ?? getAvatarProfile("hukaby") ?? AVATAR_PROFILES[0];
}
