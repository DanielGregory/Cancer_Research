"use client";

import {
  averageConcentration,
  cycleLength,
  type TreatmentKind,
  type TreatmentPolicy,
} from "@/lib/dosing";
import { Slider } from "./Slider";

interface DosingControlsProps<T extends TreatmentPolicy> {
  title: string;
  /** CSS color for the run's swatch, so the controls visibly match the chart line. */
  color: string;
  dashed?: boolean;
  /** Which policy types to offer, in order. */
  kinds: readonly T["kind"][];
  value: T;
  onChange: (policy: T) => void;
}

const KIND_LABELS: Record<TreatmentKind, string> = {
  none: "None",
  constant: "Constant",
  pulsed: "Pulsed",
  adaptive: "Adaptive",
};

/** Default settings when switching to each policy type. */
function defaultPolicy(kind: TreatmentKind, start: number): TreatmentPolicy {
  switch (kind) {
    case "none":
      return { kind: "none" };
    case "constant":
      return { kind: "constant", level: 1, start };
    case "pulsed":
      return { kind: "pulsed", dose: 2, onDuration: 7, offDuration: 7, start };
    case "adaptive":
      return { kind: "adaptive", dose: 1, stopBelow: 0.5, resumeAbove: 1, start };
  }
}

export function DosingControls<T extends TreatmentPolicy>({
  title,
  color,
  dashed,
  kinds,
  value,
  onChange,
}: DosingControlsProps<T>) {
  const start = value.kind === "none" ? 0 : value.start;
  // Safe: `kind` always comes from `kinds`, which only lists members of T.
  const switchTo = (kind: T["kind"]) => onChange(defaultPolicy(kind, start) as T);
  const update = (patch: Partial<TreatmentPolicy>) => onChange({ ...value, ...patch });

  return (
    <fieldset className="space-y-3">
      <legend className="mb-2 flex items-center gap-2 text-sm font-medium">
        <svg width="20" height="8" aria-hidden>
          <line
            x1="0"
            y1="4"
            x2="20"
            y2="4"
            stroke={color}
            strokeWidth="2"
            strokeDasharray={dashed ? "5 3" : undefined}
          />
        </svg>
        {title}
      </legend>

      <div
        className="grid gap-1 rounded-lg border border-border p-1"
        style={{ gridTemplateColumns: `repeat(${kinds.length}, minmax(0, 1fr))` }}
      >
        {kinds.map((kind) => (
          <button
            key={kind}
            type="button"
            aria-pressed={value.kind === kind}
            onClick={() => kind !== value.kind && switchTo(kind)}
            className={`rounded-md px-1 py-1 text-sm transition-colors ${
              value.kind === kind
                ? "bg-surface-0 font-medium text-primary ring-1 ring-border"
                : "text-secondary hover:bg-surface-0"
            }`}
          >
            {KIND_LABELS[kind]}
          </button>
        ))}
      </div>

      {value.kind === "constant" && (
        <Slider
          label="Concentration"
          symbol="C"
          value={value.level}
          min={0}
          max={5}
          step={0.1}
          onChange={(level) => update({ level })}
        />
      )}

      {value.kind === "pulsed" && (
        <>
          <Slider
            label="Dose (on-pulse concentration)"
            symbol="C"
            value={value.dose}
            min={0}
            max={5}
            step={0.1}
            onChange={(dose) => update({ dose })}
          />
          <Slider
            label="On duration"
            unit="days"
            value={value.onDuration}
            min={0.5}
            max={30}
            step={0.5}
            onChange={(onDuration) => update({ onDuration })}
          />
          <Slider
            label="Off duration"
            unit="days"
            value={value.offDuration}
            min={0}
            max={30}
            step={0.5}
            onChange={(offDuration) => update({ offDuration })}
          />
          <p className="text-xs text-muted">
            Dosing interval: {cycleLength(value)} days · time-averaged concentration{" "}
            {averageConcentration(value).toFixed(2)}
          </p>
        </>
      )}

      {value.kind === "adaptive" && (
        <>
          <Slider
            label="Dose while on"
            symbol="C"
            value={value.dose}
            min={0}
            max={5}
            step={0.1}
            onChange={(dose) => update({ dose })}
          />
          <Slider
            label="Pause below"
            unit="% of baseline"
            value={Math.round(value.stopBelow * 100)}
            min={10}
            max={95}
            step={5}
            // Keep resume ≥ pause, or the controller would flip on and off every step.
            onChange={(pct) => update({ stopBelow: pct / 100, resumeAbove: Math.max(value.resumeAbove, pct / 100) })}
          />
          <Slider
            label="Resume at"
            unit="% of baseline"
            value={Math.round(value.resumeAbove * 100)}
            min={20}
            max={150}
            step={5}
            onChange={(pct) => update({ resumeAbove: pct / 100, stopBelow: Math.min(value.stopBelow, pct / 100) })}
          />
          <p className="text-xs text-muted">
            Baseline = tumor burden on the day treatment starts. The drug switches off when the
            tumor shrinks below the pause level and back on when it regrows to the resume level.
          </p>
        </>
      )}

      {value.kind !== "none" && (
        <Slider
          label="Treatment starts"
          unit="day"
          value={value.start}
          min={0}
          max={100}
          step={1}
          onChange={(s) => update({ start: s })}
        />
      )}
    </fieldset>
  );
}
