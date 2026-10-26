import type { GrowthParamKey } from "./types";

/**
 * Display metadata for parameters: labels, units, and slider ranges.
 * Kept separate from the models so the math files stay about math.
 */
export interface ParamSpec {
  label: string;
  symbol: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  description: string;
}

export const GROWTH_PARAM_SPECS: Record<GrowthParamKey, ParamSpec> = {
  r: {
    label: "Growth rate",
    symbol: "r",
    unit: "1/day",
    min: 0.01,
    max: 0.5,
    step: 0.01,
    description:
      "How fast cells divide when there is plenty of room. Doubling time ≈ ln(2)/r.",
  },
  K: {
    label: "Carrying capacity",
    symbol: "K",
    unit: "mm³",
    min: 100,
    max: 5000,
    step: 50,
    description:
      "The largest size the local environment (blood supply, space, nutrients) can sustain.",
  },
};

/** Specs for parameters that aren't specific to a growth law. */
export const N0_SPEC: ParamSpec = {
  label: "Initial size",
  symbol: "N₀",
  unit: "mm³",
  min: 1,
  max: 1000,
  step: 1,
  description: "Tumor volume at the start of the simulation (day 0).",
};

export const KILL_RATE_SPEC: ParamSpec = {
  label: "Drug kill rate",
  symbol: "k",
  unit: "1/(conc·day)",
  min: 0,
  max: 0.5,
  step: 0.01,
  description:
    "Fraction of cells killed per day per unit of drug concentration. Kill = k·C(t)·N.",
};
