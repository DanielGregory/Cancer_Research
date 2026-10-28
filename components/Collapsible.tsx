import type { ReactNode } from "react";

/** A card that expands/collapses using the native <details> element. */
export function Collapsible({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="group rounded-xl border border-border bg-surface-1 p-4" open>
      <summary className="cursor-pointer list-none text-sm font-semibold select-none">
        <span className="mr-2 inline-block transition-transform group-open:rotate-90">›</span>
        {title}
      </summary>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-secondary">{children}</div>
    </details>
  );
}
