import type { Metadata } from "next";
import { ResistanceSimulator } from "@/components/resistance/ResistanceSimulator";

export const metadata: Metadata = {
  title: "Resistance & adaptive therapy · Tumor Growth Simulator",
};

export default function ResistancePage() {
  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Resistance &amp; adaptive therapy</h1>
        <p className="mt-1 text-sm text-secondary">
          A tumor of drug-sensitive and drug-resistant cells competing for space. Compare
          maximum-dose treatment with adaptive therapy, which pauses the drug to keep sensitive
          cells around as competitors.
        </p>
      </div>
      <ResistanceSimulator />
    </>
  );
}
