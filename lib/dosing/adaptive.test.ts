import { describe, expect, it } from "vitest";
import { createController, type AdaptiveDosing } from "./adaptive";

const policy: AdaptiveDosing = { kind: "adaptive", dose: 2, start: 10, stopBelow: 0.5, resumeAbove: 1 };

/** Feed a sequence of (t, burden) observations and record C after each. */
function drive(observations: [number, number][], p: AdaptiveDosing = policy): number[] {
  const c = createController(p);
  return observations.map(([t, burden]) => {
    c.observe(t, burden);
    return c.concentration(t);
  });
}

describe("adaptive dosing controller", () => {
  it("does nothing before treatment starts", () => {
    expect(drive([[0, 100], [5, 200], [9.9, 300]])).toEqual([0, 0, 0]);
  });

  it("starts dosing at `start` and uses that burden as the baseline", () => {
    // Baseline is 300 (first observation at t ≥ 10), so it stops below 150.
    expect(drive([[5, 100], [10, 300], [11, 160], [12, 149]])).toEqual([0, 2, 2, 0]);
  });

  it("has hysteresis: stays off until the burden regrows to the resume level", () => {
    const C = drive([
      [10, 100], // baseline 100, dosing
      [11, 70], //  shrinking, still above 50: keep dosing
      [12, 45], //  below 50: stop
      [13, 70], //  regrowing through 70: stay off (same size as t=11, opposite decision)
      [14, 99], //  still below 100: stay off
      [15, 100], // back to baseline: resume
      [16, 80], //  dosing again on the way down
    ]);
    expect(C).toEqual([2, 2, 0, 0, 0, 2, 2]);
  });

  it("each controller starts fresh", () => {
    const a = createController(policy);
    a.observe(10, 100);
    a.observe(11, 40); // a is now off
    const b = createController(policy);
    b.observe(10, 100);
    expect(a.concentration(11)).toBe(0);
    expect(b.concentration(10)).toBe(2);
  });

  it("fixed schedules ignore observations", () => {
    const c = createController({ kind: "constant", level: 1.5, start: 0 });
    c.observe(1, 1e9);
    expect(c.concentration(1)).toBe(1.5);
  });
});
