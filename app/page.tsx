import { Simulator } from "@/components/Simulator";

export default function Home() {
  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Growth &amp; dosing</h1>
        <p className="mt-1 text-sm text-secondary">
          Explore how growth laws and dosing schedules shape tumor size over time. Everything is
          computed in your browser with a fourth-order Runge–Kutta solver.
        </p>
      </div>
      <Simulator />
    </>
  );
}
