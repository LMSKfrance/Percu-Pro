/**
 * Groove templates: per-step timing offsets (fraction of step length). Deterministic.
 */

import type { GrooveTemplate } from "./types";

const S16 = 16;

function fill(size: number, value: number): number[] {
  return Array.from({ length: size }, () => value);
}

function straight16(): number[] {
  return fill(S16, 0);
}

function shuffle16(amount: number): number[] {
  const a: number[] = [];
  for (let i = 0; i < S16; i++) {
    a.push(i % 2 === 1 ? amount : 0);
  }
  return a;
}

function ableton16(shift54: number): number[] {
  const a: number[] = [];
  for (let i = 0; i < S16; i++) {
    if (i % 2 === 1) a.push(shift54);
    else a.push(0);
  }
  return a;
}

function mpc16(shift54: number): number[] {
  const a: number[] = [];
  for (let i = 0; i < S16; i++) {
    if (i % 4 === 2) a.push(shift54);
    else if (i % 4 === 3) a.push(-shift54 * 0.5);
    else a.push(0);
  }
  return a;
}

function brokenFunk16(): number[] {
  return [
    0, 0.03, 0, -0.02, 0, 0.04, 0, -0.01,
    0, 0.02, 0, 0.05, 0, -0.02, 0, 0.02,
  ];
}

function detroitNudge16(): number[] {
  return [
    0, 0.02, 0, 0, 0, 0.03, 0, 0,
    0, 0.01, 0, 0.02, 0, 0.03, 0, 0,
  ];
}

function warehouseDrag16(): number[] {
  return [
    0, 0.01, 0.02, 0.01, 0, 0.02, 0.03, 0.02,
    0, 0.01, 0, 0.02, 0, 0.02, 0.01, 0,
  ];
}

export const GROOVE_TEMPLATES: GrooveTemplate[] = [
  { id: "straight", name: "Straight", offsetsByStep: straight16(), stepsPerBar: S16 },
  { id: "ableton_16_54", name: "Ableton 16 54%", offsetsByStep: ableton16(0.04), stepsPerBar: S16 },
  { id: "ableton_16_57", name: "Ableton 16 57%", offsetsByStep: ableton16(0.07), stepsPerBar: S16 },
  { id: "ableton_16_60", name: "Ableton 16 60%", offsetsByStep: ableton16(0.10), stepsPerBar: S16 },
  { id: "mpc_16_54", name: "MPC 16 54%", offsetsByStep: mpc16(0.04), stepsPerBar: S16 },
  { id: "mpc_16_57", name: "MPC 16 57%", offsetsByStep: mpc16(0.07), stepsPerBar: S16 },
  { id: "mpc_16_60", name: "MPC 16 60%", offsetsByStep: mpc16(0.10), stepsPerBar: S16 },
  { id: "sp1200_shuffle", name: "SP-1200 Shuffle", offsetsByStep: shuffle16(0.06), stepsPerBar: S16 },
  { id: "broken_funk", name: "Broken Funk", offsetsByStep: brokenFunk16(), stepsPerBar: S16 },
  { id: "detroit_nudge", name: "Detroit Nudge", offsetsByStep: detroitNudge16(), stepsPerBar: S16 },
  { id: "warehouse_drag", name: "Warehouse Drag", offsetsByStep: warehouseDrag16(), stepsPerBar: S16 },
];

const TEMPLATE_MAP = new Map(GROOVE_TEMPLATES.map((t) => [t.id, t]));

export function getGrooveTemplate(id: string): GrooveTemplate | undefined {
  return TEMPLATE_MAP.get(id);
}

export function getDefaultGrooveTemplateId(): string {
  return "straight";
}
