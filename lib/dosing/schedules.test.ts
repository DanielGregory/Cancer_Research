import { describe, expect, it } from "vitest";
import { averageConcentration, concentrationAt, totalExposure } from "./schedules";
import type { DosingSchedule } from "./types";

describe("concentrationAt", () => {
  it("none: always zero", () => {
    expect([0, 10, 1e6].map((t) => concentrationAt({ kind: "none" }, t))).toEqual([0, 0, 0]);
  });

  it("constant: zero before start, level from start onward", () => {
    const s: DosingSchedule = { kind: "constant", level: 2, start: 5 };
    expect(concentrationAt(s, 4.99)).toBe(0);
    expect(concentrationAt(s, 5)).toBe(2);
    expect(concentrationAt(s, 100)).toBe(2);
  });

  it("pulsed: on for onDuration, off for offDuration, repeating", () => {
    const s: DosingSchedule = { kind: "pulsed", dose: 3, onDuration: 2, offDuration: 5, start: 10 };
    expect(concentrationAt(s, 9)).toBe(0); // before start
    expect(concentrationAt(s, 10)).toBe(3); // first pulse begins
    expect(concentrationAt(s, 11.9)).toBe(3);
    expect(concentrationAt(s, 12)).toBe(0); // first rest
    expect(concentrationAt(s, 16.9)).toBe(0);
    expect(concentrationAt(s, 17)).toBe(3); // second pulse: 10 + 7
    expect(concentrationAt(s, 17 + 7 * 10 + 1)).toBe(3); // many cycles later
  });

  it("pulsed with no off time behaves like constant dosing", () => {
    const pulsed: DosingSchedule = { kind: "pulsed", dose: 1, onDuration: 3, offDuration: 0, start: 0 };
    for (let t = 0; t < 30; t += 0.7) expect(concentrationAt(pulsed, t)).toBe(1);
  });

  it("never returns a negative concentration", () => {
    const s: DosingSchedule = { kind: "pulsed", dose: 1, onDuration: 1, offDuration: 1, start: 0 };
    for (let t = -5; t < 20; t += 0.25) expect(concentrationAt(s, t)).toBeGreaterThanOrEqual(0);
  });
});

describe("totalExposure (area under C(t))", () => {
  it("is zero with no drug", () => {
    expect(totalExposure({ kind: "none" }, 0, 100)).toBe(0);
  });

  it("constant: level × time on treatment", () => {
    expect(totalExposure({ kind: "constant", level: 2, start: 10 }, 0, 50)).toBe(80);
  });

  it("pulsed: dose × total on-time, including a partial final pulse", () => {
    const s: DosingSchedule = { kind: "pulsed", dose: 2, onDuration: 3, offDuration: 4, start: 0 };
    // Cycles of 7 days. In 0..16: two full cycles (6 on-days) + 2 days into the third pulse.
    expect(totalExposure(s, 0, 16)).toBe(2 * (6 + 2));
  });

  it("matches a brute-force Riemann sum of C(t)", () => {
    const s: DosingSchedule = { kind: "pulsed", dose: 1.5, onDuration: 2.5, offDuration: 4, start: 3 };
    const dt = 1e-3;
    let sum = 0;
    for (let t = 0; t < 60; t += dt) sum += concentrationAt(s, t + dt / 2) * dt;
    expect(totalExposure(s, 0, 60)).toBeCloseTo(sum, 1);
  });

  it("a pulsed schedule at 2× dose, 50% on, delivers the same drug as constant at 1×", () => {
    const constant: DosingSchedule = { kind: "constant", level: 1, start: 0 };
    const pulsed: DosingSchedule = { kind: "pulsed", dose: 2, onDuration: 7, offDuration: 7, start: 0 };
    expect(totalExposure(pulsed, 0, 140)).toBe(totalExposure(constant, 0, 140));
  });
});

describe("averageConcentration", () => {
  it("equals long-run exposure per day", () => {
    const s: DosingSchedule = { kind: "pulsed", dose: 3, onDuration: 2, offDuration: 4, start: 0 };
    expect(averageConcentration(s)).toBe(1);
    expect(totalExposure(s, 0, 600) / 600).toBeCloseTo(averageConcentration(s), 10);
  });
});
