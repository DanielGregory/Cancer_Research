import type { DerivativeFn } from "@/lib/sim";

/**
 * Adding treatment to a growth law.
 *
 *     dN/dt = g(N)  −  k · C(t) · N
 *             ─────    ───────────
 *             growth   drug kill
 *
 * This is the simplest "log-kill" assumption: at any moment the drug kills
 * a fixed *fraction* of the cells present, and that fraction is proportional
 * to the drug concentration C(t). Doubling the drug doubles the kill rate;
 * a bigger tumor loses more cells per day, but the same percentage.
 *
 * k (the kill rate) says how potent the drug is per unit concentration.
 * Every cell is assumed equally sensitive — the two-population model planned
 * later relaxes that by adding a resistant subpopulation.
 *
 * @param growth  the untreated growth law g(N), with parameters already bound
 * @param k       kill rate per unit concentration per day
 * @param concentration  C(t), the drug concentration at time t
 */
export function withTreatment(
  growth: (N: number) => number,
  k: number,
  concentration: (t: number) => number,
): DerivativeFn {
  return (t, [N]) => [growth(N) - k * concentration(t) * N];
}
