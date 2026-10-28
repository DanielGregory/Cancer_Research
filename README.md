# Tumor Growth Simulator

An interactive, in-browser simulator for learning how mathematical models of
tumor growth and drug treatment behave. It has two pages:

- **Growth & dosing** (`/`): pick a growth law, set its parameters and a dosing
  schedule, and watch the tumor's size over time. Overlay two schedules to compare them.
- **Resistance & adaptive therapy** (`/resistance`): a tumor made of
  drug-sensitive and drug-resistant cells. Compare maximum-dose treatment with
  adaptive therapy and see which delays relapse.

It's a learning and research sandbox. The code is written to be read: the
math lives in small, commented, pure TypeScript functions, and the tests double
as worked examples.

> **Educational model, not medical advice.** These are textbook models with
> made-up parameters. They are not calibrated to any patient, drug, or cancer type.

---

## Quick start

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # run the unit tests once
npm run test:watch # re-run tests on save
npm run typecheck
npm run build      # production build (what Vercel runs)
```

Deploying: import the repo into Vercel. It's a stock Next.js app, so no
configuration is needed.

## Stack

- **Next.js** (App Router) + **TypeScript** + **Tailwind CSS v4**
- **Recharts** for plots
- **Vitest** for tests
- All simulation runs client-side; there is no backend.

---

## How the models work

### The big picture

Every model here is an **ordinary differential equation (ODE)**: a rule for
how fast the tumor size `N` changes, given its current size:

```
dN/dt = (growth) − (drug kill)
```

We can't solve most of these by hand once treatment switches on and off, so we
solve them **numerically**. We start from `N(0)` and take many small time steps,
each time using the rule to estimate where `N` goes next.

### The solver: 4th-order Runge–Kutta (`lib/sim/rk4.ts`)

The simplest stepper, Euler's method, says `N(t+h) ≈ N(t) + h·f(t, N)`. It
assumes the slope stays constant across the whole step, which it doesn't. RK4
samples the slope four times per step (start, midpoint twice, end) and averages
them with weights 1-2-2-1:

```
k1 = f(t,       y)
k2 = f(t + h/2, y + h/2·k1)
k3 = f(t + h/2, y + h/2·k2)
k4 = f(t + h,   y + h·k3)
y(t+h) ≈ y + h/6·(k1 + 2k2 + 2k3 + k4)
```

Its error shrinks like `h⁴`: halving the step makes it about 16× more accurate.
A test checks this directly. The solver takes the state as an **array**, so the
same code integrates one population, two competing populations, or a hundred
brain regions.

### Growth laws (`lib/models/`)

| Model | Equation | Behavior | Exact solution |
|---|---|---|---|
| Exponential | `dN/dt = r·N` | Unlimited; doubles every `ln2/r` days | `N₀·e^(rt)` |
| Logistic | `dN/dt = r·N·(1 − N/K)` | S-curve; fastest at `K/2`, levels off at `K` | `K / (1 + ((K−N₀)/N₀)·e^(−rt))` |
| Gompertz | `dN/dt = r·N·ln(K/N)` | Slows early; fastest at `K/e ≈ 0.37K`; a common fit to real data | `K·exp(ln(N₀/K)·e^(−rt))` |

- **r**: intrinsic growth rate (per day).
- **K**: carrying capacity, the largest size the local environment can sustain.

### Treatment (`lib/models/treatment.ts`)

Any growth law can be wrapped with a drug-kill term:

```
dN/dt = g(N) − k·C(t)·N
```

This is the **log-kill** assumption: at any moment the drug kills a fixed
*fraction* of cells, proportional to the drug concentration `C(t)`. `k` is the
drug's potency.

Under a constant per-cell kill rate `k·C`, setting growth equal to kill gives
the long-run size:

- **Exponential**: net rate `r − kC`. The tumor grows or shrinks forever; there's no steady state.
- **Logistic**: `N* = K·(1 − kC/r)`. Eradicated if `kC > r`.
- **Gompertz**: `N* = K·exp(−kC/r)`. It's **never** exactly zero, because the per-cell growth
  rate `r·ln(K/N)` grows without bound as `N → 0`. This is a toy version of
  minimal residual disease. (Found the honest way: a test expecting eradication failed.)

The "What's happening" panel uses these formulas to predict where run A ends up.

### Dosing schedules (`lib/dosing/`)

A schedule is plain data describing `C(t)`:

- **none**: `C = 0`
- **constant**: `C = level` from `start` onward
- **pulsed**: `C = dose` for `onDuration` days, then `0` for `offDuration` days, repeating

`totalExposure()` computes the area under `C(t)` exactly, so you can make fair
comparisons. The default pulsed schedule (2× dose, half the time) delivers the
same total drug as the constant one. A pulsed run can still end with a
partial pulse, so its total can come out slightly higher.

### Sensitive vs resistant cells (`lib/models/twoPopulation.ts`)

```
dS/dt = rS·S·(1 − (S + R)/K) − k·C(t)·S
dR/dt = rR·R·(1 − (S + R)/K)
```

Two populations share **one** carrying capacity K, so every cell of either type
takes room the other could use. The drug hits only S. Resistance has a fitness
cost, so `rR < rS`.

- **Competitive release.** Max-dose therapy wipes out S, which frees space, and
  R grows into it unopposed. The tumor relapses and is now fully resistant.
- **Adaptive therapy** pauses the drug to keep S alive as a competitor. The
  tumor stays large, so R's growth term `(1 − (S+R)/K)` stays small.
- **A conserved quantity.** Untreated, both populations feel the same "room"
  factor, so `ln(S/S₀)/rS = ln(R/R₀)/rR` holds exactly. The tests check this. It also means that
  once the tumor fills K, the S:R mix freezes. Sensitive cells gain share only while there's
  free space. A Lotka–Volterra model with separate competition coefficients
  would let one type actively displace the other.

With the defaults (750 mm³ tumor, 0.7% resistant), max dose progresses on
about day 224. Adaptive therapy progresses on about day 360 and uses ~56% less drug per day.

### Adaptive dosing (`lib/dosing/adaptive.ts`)

This follows the first adaptive-therapy trial (Zhang et al., *Nat. Commun.* 2017):
record the burden when treatment starts as the baseline, dose until the burden
falls below 50% of baseline, then pause until it regrows to 100%, and repeat.

The gap between the two thresholds gives **hysteresis**: at 70% of baseline the
drug is on if the tumor is shrinking and off if it's regrowing. So the dose
depends on *history*, not only on `(t, N)`, and can't be a plain function C(t).
It's a small controller with memory:

```ts
interface DosingController {
  concentration(t: number): number;        // read by the ODE
  observe(t: number, burden: number): void; // called between solver steps
}
```

The solver calls an optional `onPoint(t, y)` hook after every step. The
controller watches the tumor there and decides the dose for the next step,
like a clinic measuring at each visit. The dose is held constant within a
step, so RK4 still integrates a smooth equation. `lib/sim` stays
disease-agnostic: the hook is just "tell me each point as you compute it."

**Progression** is when the total burden exceeds a multiple (default 1.2×) of
its day-0 size, loosely following the clinical RECIST "20% growth" rule. The
summary compares time to progression and the drug given *up to* progression,
since a failing regimen would be stopped.

### Simplifications to keep in mind

- `C(t)` switches instantly: there's no absorption or clearance (pharmacokinetics).
- No immune system, no spatial structure, and no drug toxicity limiting the dose.
- On the growth page every cell is equally sensitive. On the resistance page,
  resistant cells are fully immune and cells never switch type.
- RK4's 4th-order accuracy assumes a smooth right-hand side. Steps that straddle
  a fixed schedule's on/off switch are less accurate, which is why the pages use
  small steps (0.05 and 0.1 days). The adaptive controller only switches between
  steps, so it doesn't have this issue.

---

## Project structure

```
app/
  layout.tsx, globals.css    Shell (nav, footer), color tokens (light/dark)
  page.tsx                   Growth & dosing page
  resistance/page.tsx        Resistance & adaptive therapy page
components/
  Simulator.tsx              Growth page: state + wiring
  RunSummary.tsx, ExplanationPanel.tsx
  resistance/                Resistance page: simulator, summary table, explanation
  TimeSeriesChart.tsx        Shared Recharts line chart (one quantity, several series)
  chartRows.ts               Arrays → chart rows, with downsampling
  Collapsible.tsx, SiteNav.tsx
  controls/                  Slider, ModelSelector, DosingControls (fixed + adaptive)
lib/
  sim/        Disease-agnostic ODE engine (types, RK4, onPoint hook). Knows nothing about tumors.
  models/     Growth laws, treatment term, two-population model, param metadata
  dosing/     Fixed schedules → C(t) and exposure; adaptive controller
  scenario/   Glue: model + dosing → DerivativeFn → solver → result
              (tumorScenario.ts, resistanceScenario.ts)
```

**Dependency direction:** `scenario → models, dosing → sim`. The engine never
imports from anything above it, and `models` and `dosing` don't know about each
other. That's what keeps new stages additive.

Tests live next to the code they test (`*.test.ts`):

- `lib/sim/rk4.test.ts`: accuracy vs exact exponential, logistic, and Gompertz
  solutions, the 4th-order convergence rate, a 2D harmonic oscillator (array state,
  energy conservation), and time-grid edge cases
- `lib/models/models.test.ts`: fixed points, monotone approach to K, peak-growth
  location, treatment reducing to the untreated law, the exact treated
  exponential, non-negativity, and analytic steady states matching simulation
- `lib/dosing/schedules.test.ts`: on/off timing and exact exposure vs a Riemann sum
- `lib/scenario/tumorScenario.test.ts`: end-to-end sanity checks (treatment helps; delaying it doesn't)
- `lib/sim/rk4.test.ts` (onPoint): the observer sees every point, and a controller can switch the equation between steps
- `lib/models/twoPopulation.test.ts`: reduces to logistic when one population is
  absent, the drug never touches R, a shared K, the `ln(S/S₀)/rS = ln(R/R₀)/rR`
  invariant, competitive release
- `lib/dosing/adaptive.test.ts`: baseline capture, hysteresis, fresh state per controller
- `lib/scenario/resistanceScenario.test.ts`: max dose relapses with resistant cells,
  adaptive delays progression and uses less drug per day, exposure bookkeeping

---

## Roadmap

### Stage 1: Foundation ✅ (this scaffold)

RK4 engine, three growth laws, log-kill treatment, three dosing schedules, an
interactive page with A/B comparison, and tests.

### Stage 2: Two-population model and adaptive therapy ✅

Sensitive vs resistant cells with a shared carrying capacity, an adaptive
dosing controller with hysteresis, and a `/resistance` page comparing max dose
with adaptive therapy (time to progression, drug used, composition over time).
See "How the models work" above.

Possible extensions: partial resistance (a smaller `k` for R), mutation S → R,
Lotka–Volterra competition coefficients, and visit-based monitoring (measure
every N days instead of every step).

### Stage 3: Fitting parameters to published data

Fit `r`, `K` (and maybe `k`) to tumor-volume time series from the literature.

- Add a `lib/fitting/` module: a loss (sum of squared log-errors at the
  observation times), an optimizer (Nelder–Mead is simple and derivative-free),
  and data loaders with a citation per dataset.
- It needs `N` at arbitrary observation times. Either interpolate the dense
  `Solution`, or integrate between observation times. Both are thin helpers
  on top of `solveRK4`.
- Use the closed-form `exactSolution`s as a fast path and a check.
- UI: scatter the data over the fitted curve and show the residuals.

### Stage 4: Other diseases (e.g. Alzheimer's protein spread)

Misfolded tau or amyloid spreading along brain connectivity is often modeled
with a network Fisher–KPP equation, one state per brain region:

```
dcᵢ/dt = −ρ·Σⱼ Lᵢⱼ·cⱼ + α·cᵢ·(1 − cᵢ)
```

where `L` is the graph Laplacian of a connectome. That's just a bigger state
vector for the same engine. It would live in its own `lib/models/<disease>/` and
`lib/scenario/` files and its own page/route, with `lib/sim` unchanged.

### Smaller ideas

- Pharmacokinetics: make `C` a state variable (`dC/dt = dose(t) − λ·C`) instead of a step function
- Adaptive step sizes (RK45) for stiff or long runs
- Shareable URLs that encode the scenario (schedules are already plain serializable data)
- Export a run as CSV
