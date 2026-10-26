import type { GrowthModel } from "./types";

export interface GompertzParams {
  r: number;
  K: number;
}

/**
 * Gompertz growth:  dN/dt = r·N·ln(K/N)
 *
 * Biology: like logistic growth, the tumor approaches a maximum size K, but
 * the slowdown starts much earlier. The per-cell growth rate r·ln(K/N) falls
 * steadily as the tumor grows, which matches the observation that larger
 * tumors have a growing fraction of non-dividing (quiescent or necrotic)
 * cells in their poorly supplied core.
 *
 * Gompertz curves are asymmetric: growth is fastest at N = K/e ≈ 0.37·K
 * rather than K/2. They are one of the most widely used fits to real tumor
 * volume data.
 *
 * Treatment quirk: because the per-cell growth rate r·ln(K/N) grows without
 * bound as N → 0, a constant log-kill k·C can never fully eradicate a
 * Gompertz tumor. It settles at N* = K·exp(−k·C/r) instead.
 *
 * Note on r: here r is the rate at which the *growth rate itself* decays,
 * so the same r gives different-looking curves than the logistic model.
 *
 * Exact solution: N(t) = K · exp( ln(N0/K) · e^(−r·t) )
 */
export const gompertz: GrowthModel<GompertzParams> = {
  id: "gompertz",
  name: "Gompertz",
  equation: "dN/dt = r·N·ln(K/N)",
  summary: "Growth that slows early and steadily; a common fit to real tumor data.",
  explanation: [
    "Like the logistic model, the tumor approaches a maximum size K. The difference is how it slows down: the per-cell growth rate r·ln(K/N) starts high for tiny tumors and falls continuously as the tumor grows.",
    "Biologically this reflects a tumor whose core becomes starved of oxygen and nutrients, so a growing share of its cells stop dividing. Growth peaks at about 37% of K (K/e) instead of 50%.",
    "Gompertz curves fit many real tumor-volume measurements well, which is why they're a standard choice in oncology modeling.",
    "A surprising consequence: the smaller the tumor, the faster each remaining cell grows. So constant treatment shrinks the tumor to a small residual size, K·exp(−k·C/r), but never quite to zero — a toy version of minimal residual disease.",
  ],
  paramKeys: ["r", "K"],
  defaults: { r: 0.1, K: 2000 },
  // N·ln(K/N) → 0 as N → 0, but evaluating ln(K/0) would give -Infinity·0 = NaN,
  // so handle the extinct tumor explicitly.
  rate: (N, { r, K }) => (N <= 0 ? 0 : r * N * Math.log(K / N)),
  exactSolution: (t, N0, { r, K }) => K * Math.exp(Math.log(N0 / K) * Math.exp(-r * t)),
  // r·N·ln(K/N) = kill·N  →  ln(K/N*) = kill/r  →  N* = K·exp(−kill/r).
  // Always positive: see the "treatment quirk" note above.
  steadyState: ({ r, K }, kill) => K * Math.exp(-kill / r),
};
