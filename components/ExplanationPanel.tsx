"use client";

import { averageConcentration, type DosingSchedule } from "@/lib/dosing";
import type { AnyGrowthModel, GrowthParamValues } from "@/lib/models";
import { Collapsible } from "./Collapsible";

interface ExplanationPanelProps {
  model: AnyGrowthModel;
  params: GrowthParamValues;
  k: number;
  dosing: DosingSchedule;
}

/** Collapsible plain-language description of the current model and treatment. */
export function ExplanationPanel({ model, params, k, dosing }: ExplanationPanelProps) {
  return (
    <Collapsible title="What’s happening">
        <p>
          <span className="font-medium text-primary">{model.name} growth</span> ·{" "}
          <span className="font-mono">{model.equation}</span>
        </p>
        {model.explanation.map((para, i) => (
          <p key={i}>{para}</p>
        ))}

        <p>
          <span className="font-medium text-primary">Treatment</span> adds a kill term{" "}
          <span className="font-mono">−k·C(t)·N</span>: at each moment the drug removes a fixed
          fraction of the cells present, proportional to its concentration C(t). This is the
          &ldquo;log-kill&rdquo; assumption, and it treats every cell as equally sensitive.
        </p>

        <p className="rounded-lg bg-surface-0 p-3">{treatmentInsight(model, params, k, dosing)}</p>
    </Collapsible>
  );
}

/**
 * A sentence about what the math predicts for run A, using the time-averaged
 * concentration. For pulsed dosing this is an approximation: the tumor
 * actually oscillates around this value.
 */
function treatmentInsight(
  model: AnyGrowthModel,
  params: GrowthParamValues,
  k: number,
  dosing: DosingSchedule,
): string {
  const avgC = averageConcentration(dosing);
  if (avgC === 0 || k === 0) {
    return "Run A has no effective treatment, so the tumor follows its natural growth curve.";
  }

  const kill = k * avgC;
  const approx = dosing.kind === "pulsed" ? " (using the time-averaged concentration)" : "";
  const killText = `Once treatment starts, the drug removes about ${(kill * 100).toFixed(1)}% of cells per day${approx}, against a growth rate r = ${params.r}/day.`;

  if (!model.steadyState) {
    const net = params.r - kill;
    return net > 0
      ? `${killText} Growth still wins, so the tumor keeps growing exponentially, just more slowly (net rate ${net.toFixed(3)}/day).`
      : `${killText} The drug wins, so the tumor shrinks exponentially (net rate ${net.toFixed(3)}/day).`;
  }

  const nStar = model.steadyState(params, kill);
  return nStar > 0
    ? `${killText} The model predicts the tumor settles near N* ≈ ${nStar.toPrecision(3)} mm³, where growth and kill balance.`
    : `${killText} Kill outpaces even the fastest possible growth, so the model predicts the tumor is eventually eliminated.`;
}
