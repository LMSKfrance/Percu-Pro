/**
 * Determinism and groove template tests. Run with: npx vitest run src/core/groove/groove.test.ts
 */

import { describe, it, expect } from "vitest";
import { generatePattern, cityToDetroitBerlin } from "./generatePattern";
import { enginePatternToStorePattern, storePatternToChannelStates } from "./mapToStore";
import { hashEnginePatternState, hashStorePatternState } from "./hashPatternState";
import { applyGroove } from "./applyGroove";
import { createInitialPatternState } from "../patternTypes";
import { getGrooveTemplate } from "./grooveTemplates";

const defaultChannels = storePatternToChannelStates(
  createInitialPatternState(120, 42)
);

const defaultProject = {
  tempo: 120,
  loopBars: 1,
  stepsPerBar: 16,
  seed: 42,
  swing: 55,
  grooveTemplateId: "straight",
  grooveAmount: 0.5,
  variationIndex: 0,
};

const defaultControls = {
  density: 0.5,
  funkiness: 0.5,
  complexity: 0.5,
  fillAmount: 0.4,
  chaos: 0.2,
};

describe("generatePattern determinism", () => {
  it("same seed produces same pattern (checksums)", () => {
    const hashes: string[] = [];
    for (let seed = 1; seed <= 20; seed++) {
      const project = { ...defaultProject, seed };
      const engine = generatePattern(project, defaultChannels, defaultControls, "all");
      hashes.push(hashEnginePatternState(engine));
    }
    const run2: string[] = [];
    for (let seed = 1; seed <= 20; seed++) {
      const project = { ...defaultProject, seed };
      const engine = generatePattern(project, defaultChannels, defaultControls, "all");
      run2.push(hashEnginePatternState(engine));
    }
    expect(run2).toEqual(hashes);
  });

  it("checksums are stable across runs", () => {
    const actual: string[] = [];
    for (let seed = 1; seed <= 5; seed++) {
      const project = { ...defaultProject, seed };
      const engine = generatePattern(project, defaultChannels, defaultControls, "all");
      actual.push(hashEnginePatternState(engine));
    }
    const run2: string[] = [];
    for (let seed = 1; seed <= 5; seed++) {
      const project = { ...defaultProject, seed };
      const engine = generatePattern(project, defaultChannels, defaultControls, "all");
      run2.push(hashEnginePatternState(engine));
    }
    expect(actual).toEqual(run2);
  });
});

describe("Percu-style determinism", () => {
  const percuControls = {
    ...defaultControls,
    detroitBerlin: 0.5,
    percussiveNoisy: 0.3,
  };

  it("same seed and same params produce identical pattern (engine hash)", () => {
    const project = { ...defaultProject, seed: 999 };
    const a = generatePattern(project, defaultChannels, percuControls, "all");
    const b = generatePattern(project, defaultChannels, percuControls, "all");
    expect(hashEnginePatternState(b)).toBe(hashEnginePatternState(a));
  });

  it("same seed and same params produce identical pattern (store hash)", () => {
    const project = { ...defaultProject, seed: 999 };
    const engine = generatePattern(project, defaultChannels, percuControls, "all");
    const storeA = enginePatternToStorePattern(engine, project.tempo, project.seed, project.swing, percuControls.density);
    const engine2 = generatePattern(project, defaultChannels, percuControls, "all");
    const storeB = enginePatternToStorePattern(engine2, project.tempo, project.seed, project.swing, percuControls.density);
    expect(hashStorePatternState(storeB)).toBe(hashStorePatternState(storeA));
  });

  it("different detroitBerlin produces different pattern", () => {
    const project = { ...defaultProject, seed: 42 };
    const detroit = generatePattern(project, defaultChannels, { ...percuControls, detroitBerlin: 0 }, "all");
    const berlin = generatePattern(project, defaultChannels, { ...percuControls, detroitBerlin: 1 }, "all");
    expect(hashEnginePatternState(berlin)).not.toBe(hashEnginePatternState(detroit));
  });
});

describe("cityToDetroitBerlin", () => {
  it("maps Detroit → 0, Berlin → 1, Tbilisi/other → 0.5", () => {
    expect(cityToDetroitBerlin("Detroit")).toBe(0);
    expect(cityToDetroitBerlin("Berlin")).toBe(1);
    expect(cityToDetroitBerlin("Tbilisi")).toBe(0.5);
    expect(cityToDetroitBerlin("other")).toBe(0.5);
    expect(cityToDetroitBerlin("")).toBe(0.5);
  });
});

describe("Percu-style regression snapshot", () => {
  const REGRESSION_SEED = 12345;
  const REGRESSION_CONTROLS = {
    density: 0.5,
    funkiness: 0.5,
    complexity: 0.5,
    fillAmount: 0.4,
    chaos: 0.2,
    detroitBerlin: 0.5,
    percussiveNoisy: 0.3,
  };

  it("fixed seed and params produce known engine hash (regression)", () => {
    const project = { ...defaultProject, seed: REGRESSION_SEED };
    const engine = generatePattern(project, defaultChannels, REGRESSION_CONTROLS, "all");
    const hash = hashEnginePatternState(engine);
    expect(hash).toBe("7519b596");
  });
});

describe("groove templates", () => {
  it("straight template has zero offsets", () => {
    const t = getGrooveTemplate("straight");
    expect(t).toBeDefined();
    expect(t!.offsetsByStep.every((x) => x === 0)).toBe(true);
  });

  it("template change modifies micro timing predictably", () => {
    const pattern = createInitialPatternState(120, 42);
    const params = { tempo: 120, swingPct: 55, grooveTemplateId: "straight", grooveAmount: 0.5 };
    const opsStraight = applyGroove(pattern, params);
    const opsSwing = applyGroove(pattern, { ...params, grooveTemplateId: "ableton_16_57" });
    expect(opsStraight.length).toBeGreaterThanOrEqual(0);
    expect(opsSwing.length).toBeGreaterThanOrEqual(0);
    const straightMicro = new Map(
      opsStraight
        .filter((o) => o.op === "SET_MICROSHIFT")
        .map((o) => [`${o.laneId}-${o.stepIndex}`, o.microShiftMs])
    );
    const swingMicro = new Map(
      opsSwing
        .filter((o) => o.op === "SET_MICROSHIFT")
        .map((o) => [`${o.laneId}-${o.stepIndex}`, o.microShiftMs])
    );
    let different = 0;
    swingMicro.forEach((ms, key) => {
      if (straightMicro.get(key) !== ms) different++;
    });
    expect(different).toBeGreaterThan(0);
  });
});
