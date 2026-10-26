import { describe, expect, it } from "vitest";
import { runTumorScenario, type TumorScenario } from "./tumorScenario";

const base: TumorScenario = {
  modelId: "logistic",
  params: { r: 0.1, K: 2000 },
  N0: 50,
  k: 0.15,
  dosing: { kind: "none" },
  tEnd: 120,
  dt: 0.1,
};

describe("runTumorScenario", () => {
  it("returns aligned arrays starting at N0", () => {
    const res = runTumorScenario(base);
    expect(res.N).toHaveLength(res.t.length);
    expect(res.C).toHaveLength(res.t.length);
    expect(res.N[0]).toBe(50);
    expect(res.t.at(-1)).toBe(120);
  });

  it("any treatment leaves a smaller tumor than none", () => {
    const untreated = runTumorScenario(base).N.at(-1)!;
    const constant = runTumorScenario({ ...base, dosing: { kind: "constant", level: 1, start: 0 } });
    const pulsed = runTumorScenario({
      ...base,
      dosing: { kind: "pulsed", dose: 2, onDuration: 7, offDuration: 7, start: 0 },
    });
    expect(constant.N.at(-1)!).toBeLessThan(untreated);
    expect(pulsed.N.at(-1)!).toBeLessThan(untreated);
  });

  it("treatment that starts later can't do better than the same treatment from day 0", () => {
    const early = runTumorScenario({ ...base, dosing: { kind: "constant", level: 1, start: 0 } });
    const late = runTumorScenario({ ...base, dosing: { kind: "constant", level: 1, start: 30 } });
    expect(late.N.at(-1)!).toBeGreaterThanOrEqual(early.N.at(-1)!);
  });

  it("reports total drug exposure for the run", () => {
    const res = runTumorScenario({ ...base, dosing: { kind: "constant", level: 1, start: 20 } });
    expect(res.exposure).toBe(100);
  });
});
