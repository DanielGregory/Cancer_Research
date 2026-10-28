import { describe, expect, it } from "vitest";
import { twoPopulation } from "@/lib/models";
import { runResistanceScenario, type ResistanceScenario } from "./resistanceScenario";

const base: Omit<ResistanceScenario, "policy"> = {
  params: twoPopulation.defaults,
  S0: 745,
  R0: 5,
  tEnd: 600,
  dt: 0.1,
  progressionFactor: 1.2,
};

const mtd = runResistanceScenario({ ...base, policy: { kind: "constant", level: 1, start: 0 } });
const adaptive = runResistanceScenario({
  ...base,
  policy: { kind: "adaptive", dose: 1, start: 0, stopBelow: 0.5, resumeAbove: 1 },
});
const untreated = runResistanceScenario({ ...base, policy: { kind: "none" } });

describe("runResistanceScenario", () => {
  it("returns aligned arrays and total = S + R", () => {
    for (const r of [mtd, adaptive]) {
      expect(r.S).toHaveLength(r.t.length);
      expect(r.R).toHaveLength(r.t.length);
      expect(r.C).toHaveLength(r.t.length);
      r.total.forEach((v, i) => expect(v).toBeCloseTo(r.S[i] + r.R[i], 12));
    }
  });

  it("progression level is the factor times the day-0 burden", () => {
    expect(mtd.progressionLevel).toBeCloseTo(1.2 * 750, 9);
  });

  it("untreated, the tumor progresses quickly", () => {
    expect(untreated.timeToProgression).not.toBeNull();
    expect(untreated.timeToProgression!).toBeLessThan(mtd.timeToProgression!);
  });

  it("max-dose therapy shrinks the tumor a lot, then it relapses with resistant cells", () => {
    expect(Math.min(...mtd.total)).toBeLessThan(0.1 * 750);
    expect(mtd.timeToProgression).not.toBeNull();
    const i = mtd.t.findIndex((t) => t === mtd.timeToProgression);
    expect(mtd.R[i]).toBeGreaterThan(mtd.S[i]); // the relapse is resistant
  });

  it("adaptive therapy keeps the burden between the thresholds while it works", () => {
    const tStop = adaptive.timeToProgression!;
    adaptive.t.forEach((t, i) => {
      if (t > 0 && t < tStop) expect(adaptive.total[i]).toBeGreaterThan(0.5 * 750 * 0.99);
    });
  });

  it("adaptive therapy delays progression compared with max-dose (the headline result)", () => {
    expect(adaptive.timeToProgression!).toBeGreaterThan(mtd.timeToProgression! * 1.3);
  });

  it("adaptive therapy uses less drug per day of control", () => {
    const perDay = (r: typeof mtd) => r.exposureBeforeProgression / r.timeToProgression!;
    expect(perDay(adaptive)).toBeLessThan(perDay(mtd));
  });

  it("adaptive's recorded concentration is only ever 0 or the dose", () => {
    expect(new Set(adaptive.C)).toEqual(new Set([0, 1]));
  });

  it("adaptive exposure equals the sum of C over the steps it was on", () => {
    // Cross-check against a direct count of on-steps (dt = 0.1, last step ends at tEnd).
    const onSteps = adaptive.C.slice(0, -1).filter((c) => c > 0).length;
    expect(adaptive.exposure).toBeCloseTo(onSteps * 0.1, 6);
  });
});
