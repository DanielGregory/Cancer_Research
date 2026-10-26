"use client";

import { averageConcentration, cycleLength, type DosingKind, type DosingSchedule } from "@/lib/dosing";
import { Slider } from "./Slider";

interface DosingControlsProps {
  title: string;
  /** CSS color for the run's swatch, so the controls visibly match the chart line. */
  color: string;
  dashed?: boolean;
  value: DosingSchedule;
  onChange: (schedule: DosingSchedule) => void;
}

const KINDS: { kind: DosingKind; label: string }[] = [
  { kind: "none", label: "None" },
  { kind: "constant", label: "Constant" },
  { kind: "pulsed", label: "Pulsed" },
];

/** Default settings when switching to each schedule type. */
function defaultSchedule(kind: DosingKind, start: number): DosingSchedule {
  switch (kind) {
    case "none":
      return { kind: "none" };
    case "constant":
      return { kind: "constant", level: 1, start };
    case "pulsed":
      return { kind: "pulsed", dose: 2, onDuration: 7, offDuration: 7, start };
  }
}

export function DosingControls({ title, color, dashed, value, onChange }: DosingControlsProps) {
  const start = value.kind === "none" ? 0 : value.start;

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

      <div className="grid grid-cols-3 gap-1 rounded-lg border border-border p-1">
        {KINDS.map(({ kind, label }) => (
          <button
            key={kind}
            type="button"
            aria-pressed={value.kind === kind}
            onClick={() => kind !== value.kind && onChange(defaultSchedule(kind, start))}
            className={`rounded-md px-2 py-1 text-sm transition-colors ${
              value.kind === kind
                ? "bg-surface-0 font-medium text-primary ring-1 ring-border"
                : "text-secondary hover:bg-surface-0"
            }`}
          >
            {label}
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
          onChange={(level) => onChange({ ...value, level })}
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
            onChange={(dose) => onChange({ ...value, dose })}
          />
          <Slider
            label="On duration"
            unit="days"
            value={value.onDuration}
            min={0.5}
            max={30}
            step={0.5}
            onChange={(onDuration) => onChange({ ...value, onDuration })}
          />
          <Slider
            label="Off duration"
            unit="days"
            value={value.offDuration}
            min={0}
            max={30}
            step={0.5}
            onChange={(offDuration) => onChange({ ...value, offDuration })}
          />
          <p className="text-xs text-muted">
            Dosing interval: {cycleLength(value)} days · time-averaged concentration{" "}
            {averageConcentration(value).toFixed(2)}
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
          onChange={(s) => onChange({ ...value, start: s })}
        />
      )}
    </fieldset>
  );
}
