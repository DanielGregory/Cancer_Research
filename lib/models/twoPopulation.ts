import type { PopulationModel } from "./types";

export interface TwoPopulationParams {
  /** Growth rate of drug-sensitive cells, per day. */
  rS: number;
  /** Growth rate of drug-resistant cells, per day. Usually < rS: resistance has a fitness cost. */
  rR: number;
  /** Shared carrying capacity for both populations together (mm³). */
  K: number;
  /** Kill rate of the drug on sensitive cells, per unit concentration per day. */
  k: number;
}

/**
 * Sensitive vs resistant cells competing for the same space:
 *
 *   dS/dt = rS·S·(1 − (S + R)/K) − k·C(t)·S
 *   dR/dt = rR·R·(1 − (S + R)/K)
 *
 * Biology: a tumor is not one population. Most cells (S) respond to the
 * drug, but a few (R) are resistant from the start. Both grow logistically,
 * and they share one carrying capacity, so every sensitive cell takes up
 * room a resistant cell could have used. That competition term (S + R)/K is
 * the whole story of this model.
 *
 * Resistance usually costs something (e.g. energy spent pumping drug out),
 * so resistant cells grow more slowly: rR < rS. While there is free space,
 * sensitive cells therefore gain share:
 *
 *   d/dt ln(S/R) = (rS − rR)·(1 − (S + R)/K)
 *
 * Once the tumor fills K, both stop growing and the mix freezes. (A
 * Lotka–Volterra model with separate competition coefficients would let one
 * type actively displace the other; that's a possible extension.)
 *
 * The consequence: maximum-dose therapy kills the sensitive cells, which
 * frees up room, and the resistant cells, now unopposed, take over. The tumor
 * relapses and no longer responds. Adaptive therapy deliberately leaves
 * sensitive cells alive to keep the resistant ones boxed in.
 *
 * Simplifications: resistant cells are completely unaffected by the drug,
 * cells never switch type (no mutation), and competition is symmetric
 * (each cell of either type counts equally against K), with no cell death
 * other than the drug's.
 */
export const twoPopulation: PopulationModel<TwoPopulationParams> = {
  id: "sensitive-resistant",
  name: "Sensitive vs resistant",
  stateLabels: ["S", "R"],
  equations: ["dS/dt = rS·S·(1 − (S + R)/K) − k·C·S", "dR/dt = rR·R·(1 − (S + R)/K)"],
  summary: "Drug-sensitive and drug-resistant cells competing for the same space.",
  explanation: [
    "The tumor holds two kinds of cells. Sensitive cells (S) are killed by the drug; resistant cells (R) are not. Both grow logistically, but they share one carrying capacity K. The term (S + R)/K means every cell of either type uses up room the other could have had.",
    "Resistance has a cost, so resistant cells grow more slowly (rR < rS). While there is free space, sensitive cells divide faster and take most of it; once the tumor is full, both stop growing and the resistant cells stay a small minority.",
    "Maximum-dose therapy kills sensitive cells fast. The tumor shrinks, but that frees up space, and the resistant cells, no longer held back, grow into it. The tumor comes back and no longer responds to the drug. This is called competitive release.",
    "Adaptive therapy doses only until the tumor has shrunk by a set amount, then pauses until it regrows to its starting size. The surviving sensitive cells keep competing with the resistant ones, which can delay relapse — often while using less drug.",
  ],
  defaults: { rS: 0.05, rR: 0.035, K: 1000, k: 0.1 },
  derivative: (_t, [S, R], { rS, rR, K, k }, C) => {
    // Fraction of the shared space still free. Negative if over capacity.
    const room = 1 - (S + R) / K;
    return [rS * S * room - k * C * S, rR * R * room];
  },
};
