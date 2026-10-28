import type { TreatmentPolicy } from "@/lib/dosing";
import { twoPopulation } from "@/lib/models";
import type { ResistanceResult } from "@/lib/scenario/resistanceScenario";
import { Collapsible } from "../Collapsible";
import type { SeriesSpec } from "../TimeSeriesChart";

interface Run {
  spec: SeriesSpec;
  policy: TreatmentPolicy;
  result: ResistanceResult;
}

const POLICY_NAMES: Record<TreatmentPolicy["kind"], string> = {
  none: "no treatment",
  constant: "constant dosing",
  pulsed: "pulsed dosing",
  adaptive: "adaptive therapy",
};

export function ResistanceExplanation({ runs }: { runs: [Run, Run] }) {
  return (
    <Collapsible title="What’s happening">
      {twoPopulation.explanation.map((para, i) => (
        <p key={i}>{para}</p>
      ))}
      <p>
        <span className="font-medium text-primary">Simplifications:</span> resistant cells are
        completely unaffected by the drug, cells never switch type, and both types compete equally
        for space. Real tumors also have mutation, partial resistance, and drug side effects that
        limit dosing.
      </p>
      <p className="rounded-lg bg-surface-0 p-3">{compare(runs)}</p>
    </Collapsible>
  );
}

/** One or two sentences comparing the two runs' outcomes. */
function compare([a, b]: [Run, Run]): string {
  const describe = (r: Run) =>
    r.result.timeToProgression === null
      ? `${r.spec.name} (${POLICY_NAMES[r.policy.kind]}) never progresses within the simulated time`
      : `${r.spec.name} (${POLICY_NAMES[r.policy.kind]}) progresses on day ${r.result.timeToProgression.toFixed(0)}`;

  const ta = a.result.timeToProgression;
  const tb = b.result.timeToProgression;
  let verdict = "";
  if (ta !== null && tb !== null && ta !== tb) {
    const [winner, loser] = tb > ta ? [b, a] : [a, b];
    const days = Math.abs(tb - ta);
    const rate = (r: Run) => r.result.exposureBeforeProgression / r.result.timeToProgression!;
    const drugChange = 1 - rate(winner) / rate(loser);
    verdict = ` ${winner.spec.name} buys ${days.toFixed(0)} more days of control`;
    verdict +=
      drugChange > 0.01
        ? `, giving ${(drugChange * 100).toFixed(0)}% less drug per day.`
        : drugChange < -0.01
          ? `, but gives ${(-drugChange * 100).toFixed(0)}% more drug per day.`
          : ".";
  }
  return `${describe(a)}; ${describe(b)}.${verdict}`;
}
