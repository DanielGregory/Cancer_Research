import type { GrowthModel } from "./types";

export interface LogisticParams {
  r: number;
  K: number;
}

/**
 * Logistic growth:  dN/dt = r·N·(1 − N/K)
 *
 * Biology: cells divide at rate r when the tumor is small, but competition
 * for limited resources (space, nutrients, oxygen) slows growth as the tumor
 * approaches a carrying capacity K. The factor (1 − N/K) is the fraction of
 * "room" left: ≈1 when N ≪ K, 0 when N = K.
 *
 * The result is the classic S-shaped curve: exponential at first, fastest at
 * N = K/2, then leveling off at K. If N starts above K it shrinks back to K.
 *
 * Exact solution: N(t) = K / (1 + ((K − N0)/N0) · e^(−r·t))
 */
export const logistic: GrowthModel<LogisticParams> = {
  id: "logistic",
  name: "Logistic",
  equation: "dN/dt = r·N·(1 − N/K)",
  summary: "Growth that slows symmetrically as the tumor nears a size limit K.",
  explanation: [
    "When the tumor is small, it grows almost exponentially at rate r. As it gets bigger, cells compete for limited space and nutrients, and the factor (1 − N/K) shrinks toward zero.",
    "The tumor grows fastest at half its maximum size (K/2), then levels off at the carrying capacity K, giving an S-shaped curve.",
    "With treatment, the drug's kill term k·C·N competes with growth. The tumor settles at a lower size, or is eliminated entirely if k·C exceeds r.",
  ],
  paramKeys: ["r", "K"],
  defaults: { r: 0.1, K: 2000 },
  rate: (N, { r, K }) => r * N * (1 - N / K),
  exactSolution: (t, N0, { r, K }) => K / (1 + ((K - N0) / N0) * Math.exp(-r * t)),
  // r·N·(1 − N/K) = kill·N  →  N* = K·(1 − kill/r). Negative means no
  // positive equilibrium: the drug outpaces growth and the tumor dies out.
  steadyState: ({ r, K }, kill) => Math.max(0, K * (1 - kill / r)),
};
