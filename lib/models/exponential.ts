import type { GrowthModel } from "./types";

export interface ExponentialParams {
  r: number;
}

/**
 * Exponential growth:  dN/dt = r·N
 *
 * Biology: every cell divides at the same constant rate, and nothing ever
 * runs out — no limit on space, oxygen, or nutrients. The growth rate is
 * proportional to how many cells there already are, so the tumor doubles
 * every ln(2)/r days, forever.
 *
 * This is a decent description of very small, early tumors (and of cells in
 * a dish), but it badly overestimates large tumors, which slow down as they
 * outgrow their blood supply.
 *
 * Exact solution: N(t) = N0 · e^(r·t)
 */
export const exponential: GrowthModel<ExponentialParams> = {
  id: "exponential",
  name: "Exponential",
  equation: "dN/dt = r·N",
  summary: "Unlimited growth at a constant per-cell rate.",
  explanation: [
    "Every cell divides at the same rate r, no matter how big the tumor gets. Because more cells means more divisions, growth speeds up as the tumor grows: it doubles every ln(2)/r days.",
    "Nothing in this model ever runs out — there is no limit from space, oxygen, or blood supply. That makes it a reasonable picture of very small, early tumors, but unrealistic for large ones.",
    "With treatment, the drug removes cells at rate k·C. If k·C is larger than r, the tumor shrinks; if it is smaller, the tumor just grows more slowly.",
  ],
  paramKeys: ["r"],
  defaults: { r: 0.1 },
  rate: (N, { r }) => r * N,
  exactSolution: (t, N0, { r }) => N0 * Math.exp(r * t),
};
