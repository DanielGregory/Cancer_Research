import { Simulator } from "@/components/Simulator";

export default function Home() {
  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-8 sm:px-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Tumor Growth Simulator</h1>
        <p className="mt-1 text-sm text-secondary">
          Explore how growth laws and dosing schedules shape tumor size over time. Everything is
          computed in your browser with a fourth-order Runge–Kutta solver.
        </p>
      </header>

      <main className="flex-1">
        <Simulator />
      </main>

      <footer className="mt-10 border-t border-border pt-4 text-xs text-muted">
        Educational model, not medical advice.
      </footer>
    </div>
  );
}
