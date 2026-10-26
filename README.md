# Tumor Growth Simulator

An interactive, in-browser simulator for learning how mathematical models of
tumor growth and drug treatment behave. You pick a growth law, set its
parameters and a dosing schedule, and watch the tumor's size over time. You can
also overlay two dosing schedules to compare them.

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

**Simplifications to keep in mind:** `C(t)` switches instantly. There is no
absorption or clearance (pharmacokinetics), no resistance, no immune system,
and no spatial structure. Also, RK4's 4th-order accuracy assumes a smooth
right-hand side. Steps that straddle an on/off switch are less accurate, which
is why the UI uses a small step (0.05 days).

---

## Project structure

```
app/
  layout.tsx, page.tsx, globals.css   Page shell, footer, color tokens (light/dark)
components/
  Simulator.tsx           State + wiring: runs scenarios, feeds charts
  TimeSeriesChart.tsx     Recharts line chart (one quantity, 1–2 runs)
  RunSummary.tsx          Table of final/peak size and total drug per run
  ExplanationPanel.tsx    Collapsible "What's happening" panel
  controls/               Slider, ModelSelector, DosingControls
lib/
  sim/        Disease-agnostic ODE engine (types, RK4). Knows nothing about tumors.
  models/     Growth laws (pure functions + docs + defaults), treatment term, param metadata
  dosing/     Dosing schedules → C(t), exposure
  scenario/   Glue: model + treatment + dosing → DerivativeFn → solver → result
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

---

## Roadmap

### Stage 1: Foundation ✅ (this scaffold)

RK4 engine, three growth laws, log-kill treatment, three dosing schedules, an
interactive page with A/B comparison, and tests.

### Stage 2: Two-population model and adaptive therapy

Drug-sensitive `S` and drug-resistant `R` cells competing for the same space:

```
dS/dt = r_S·S·(1 − (S + R)/K) − k·C(t)·S
dR/dt = r_R·R·(1 − (S + R)/K)
```

Usually `r_R < r_S` (resistance has a fitness cost). Max-dose therapy wipes out
`S` and releases `R` from competition; **adaptive therapy** doses only when the
total burden is above a threshold, keeping sensitive cells around to suppress
resistant ones.

How it slots in:
- The solver already integrates array states, so nothing changes in `lib/sim`.
- Add `lib/models/twoPopulation.ts` with a new `PopulationModel` interface
  (`stateLabels`, `derivative(t, y, params, C)`) next to the single-population
  `GrowthModel` (see the note in `lib/models/types.ts`).
- Adaptive dosing depends on the state, not just time, so `C` becomes
  `C(t, y)`. That's a new `DosingSchedule` kind plus a `concentrationAt(schedule, t, y)`
  overload. The fixed-schedule kinds ignore `y`.
- Add `lib/scenario/twoPopulationScenario.ts`. Charts already plot any number of series.

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
