"use client";

import { useId } from "react";

interface SliderProps {
  label: string;
  symbol?: string;
  unit?: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  description?: string;
  disabled?: boolean;
}

/** A labelled range input that shows its current value. */
export function Slider({
  label,
  symbol,
  unit,
  value,
  min,
  max,
  step,
  onChange,
  description,
  disabled,
}: SliderProps) {
  const id = useId();
  return (
    <div className={disabled ? "opacity-40" : undefined}>
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <label htmlFor={id} className="font-medium" title={description}>
          {label}
          {symbol && <span className="ml-1 font-normal text-muted">({symbol})</span>}
        </label>
        <span className="tabular-nums text-secondary">
          {formatValue(value, step)}
          {unit && <span className="ml-1 text-xs text-muted">{unit}</span>}
        </span>
      </div>
      <input
        id={id}
        type="range"
        className="mt-1 w-full"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

/** Show as many decimals as the slider step implies. */
function formatValue(value: number, step: number): string {
  const decimals = step >= 1 ? 0 : Math.ceil(-Math.log10(step));
  return value.toFixed(decimals);
}
