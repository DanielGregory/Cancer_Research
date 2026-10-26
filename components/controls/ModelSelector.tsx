"use client";

import { GROWTH_MODELS, type GrowthModelId } from "@/lib/models";

interface ModelSelectorProps {
  value: GrowthModelId;
  onChange: (id: GrowthModelId) => void;
}

/** Segmented control for choosing the growth law. */
export function ModelSelector({ value, onChange }: ModelSelectorProps) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium">Growth model</legend>
      <div className="grid grid-cols-3 gap-1 rounded-lg border border-border p-1">
        {GROWTH_MODELS.map((m) => (
          <button
            key={m.id}
            type="button"
            aria-pressed={value === m.id}
            onClick={() => onChange(m.id)}
            className={`rounded-md px-2 py-1.5 text-sm transition-colors ${
              value === m.id
                ? "bg-accent font-medium text-white"
                : "text-secondary hover:bg-surface-0"
            }`}
          >
            {m.name}
          </button>
        ))}
      </div>
      <p className="mt-2 font-mono text-xs text-secondary">
        {GROWTH_MODELS.find((m) => m.id === value)!.equation}
      </p>
    </fieldset>
  );
}
