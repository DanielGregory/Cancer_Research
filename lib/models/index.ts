import { exponential } from "./exponential";
import { gompertz } from "./gompertz";
import { logistic } from "./logistic";
import type { GrowthModelId } from "./types";

export * from "./types";
export * from "./params";
export { exponential, logistic, gompertz };
export { withTreatment } from "./treatment";
export { twoPopulation, type TwoPopulationParams } from "./twoPopulation";

/** All growth models, in the order shown in the UI. */
export const GROWTH_MODELS = [exponential, logistic, gompertz] as const;

export type AnyGrowthModel = (typeof GROWTH_MODELS)[number];

export function getGrowthModel(id: GrowthModelId): AnyGrowthModel {
  const model = GROWTH_MODELS.find((m) => m.id === id);
  if (!model) throw new Error(`Unknown growth model: ${id}`);
  return model;
}
