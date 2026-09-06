# PV output curves and monitoring-data research

Researched 2026-09-06 for Lynx (cloud-transient, shading-signature, and per-day-anomaly logic).
Extends the citations already in `index.html`'s `CITATIONS` object (Sandia SAND2011-8848, EPRI
1023090, Luthander et al. 2015) rather than duplicating them.

**One research angle (public real-world PV production datasets) did not complete** — hit a session
token limit before returning results. Re-run before treating this doc as complete; see `README.md`.

## 1. Clear-sky / daily curve models — unusually strong, directly usable

**Centerpiece source:** Sandia SAND2012-2389 (Reno, Hansen, Stein, 2012) —
[full text](https://www.osti.gov/servlets/purl/1039404). Rigorously compares clear-sky GHI models
against ~300 site-years / ~12,000 detected clear days.

- Model error results: **Ineichen-Perez ~5.0% RMSE, Haurwitz ~6.6% RMSE**, best available (REST2)
  ~4.7% — gives Lynx a defensible "normal model imprecision" error budget (~5-7%) if it ever
  computes an expected clear-sky curve.
- **Direct, citable validation of Lynx's core premise:** the report's own conclusion states clear-sky
  models "could be used to help detect and possibly correct problems with irradiance data collected
  from instruments that may not have been well-calibrated or maintained, by comparing measured data
  to predictions for clear days." This is a national-lab endorsement of exactly what Lynx does.
- **Haurwitz (1945)** is the simplest usable model — zenith-angle only, no weather-station input
  needed: `GHI = 1098·cos(z)·exp(−0.057/cos(z))`. Confirmed by [pvlib-python's own
  docs](https://pvlib-python.readthedocs.io/en/stable/reference/generated/pvlib.clearsky.haurwitz.html)
  as "best performance... among models which require only zenith angle."
- **Ineichen-Perez** (more accurate, needs Linke turbidity + altitude) is what NREL's own PVWatts
  ([NREL/TP-6A20-62641](https://docs.nrel.gov/docs/fy14osti/62641.pdf)) and SAM
  ([NREL/TP-6A20-64102](https://docs.nrel.gov/docs/fy15osti/64102.pdf)) both implement (via the
  Perez 1990 sky-diffuse algorithm).
- **A fixed-tilt array's clear-sky curve is mathematically symmetric about solar noon** (zenith angle
  is symmetric in hour angle). An asymmetric or time-shifted "bell" on an otherwise-clean day points
  to a **timestamp/clock fault or mounting/shading issue**, not normal solar variability.
- **Sunrise/sunset edge case, deliberate:** both PVWatts and SAM treat diffuse irradiance as
  isotropic-only for zenith angles 87.5°-90° — a documented simplification, not a quirk. Lynx should
  treat behavior in that very-high-zenith window as expected model blending, not anomalous.

## 2. Cloud-transient variability at residential scale — real numeric ceilings

Goes beyond the already-cited Sandia SAND2011-8848 / EPRI 1023090.

**Most load-bearing source:** Lave, Kleissl & Arias-Castro,
[Solar Energy 86(8), 2012](https://escholarship.org/content/qt1pv8k8bq/qt1pv8k8bq_noSplash_62c9416b31d942d5fdb63ba8e788b073.pdf)
— explicitly scales 1-second point-sensor data to a "typical household PV installation of 2.5kW":

- At household scale: ramps **>0.1%/s occur ~43% of daylight seconds** (~15,472/day), **>1%/s ~6.6%**
  (~2,359/day), **>5%/s ~1.35%** (~486/day). A residential system legitimately racks up **thousands**
  of small fluctuations and **hundreds** of large ones per sunny day — an anomaly threshold tuned
  against utility-scale smoothing assumptions would be badly miscalibrated for Lynx's actual targets.
- **Absolute observed ceiling:** over a full year, only 5 up-ramps and 17 down-ramps exceeded 50%
  clear-sky-index change in 1 second; the single largest were 58%/59%. A ramp exceeding this, or
  recurring far more than a few times a year, is a strong signal of a fault rather than weather.
- **Asymmetric pre-ramp signature ("cloud edge enhancement"):** before a large negative ramp,
  clear-sky index rises ~10% in the preceding minute (light off the near edge of an approaching
  cloud); positive ramps show only ~3% pre-rise. A metering-fault artifact wouldn't reproduce this
  specific asymmetric shape — a candidate discriminator beyond a simple threshold-crossing rule.

**Companion source:** Sandia SAND2013-4757 (Lave, Ellis, Stein, 2013) formalizes **"Variability
Reduction"** — the ratio of single-point-sensor variability to whole-plant-average variability.
Explains why per-CT/per-inverter data should show more extreme fluctuation than whole-site totals,
and why a CT-level-vs-site-level noise mismatch is expected physics, not automatically a fault.

**Kreuwel et al., [Solar Energy 206, 2020](https://edepot.wur.nl/525202)** directly instruments two
household 2.6-3kW systems at sub-2-second resolution:

- Momentary power peaks up to **22% above the same day's 15-min-averaged peak**, concentrated
  exclusively on *mixed-cloud* days, never clear-sky days — legitimate overshoot, not a fault.
- **Explicitly documents and labels inverter DC-clipping as a non-meteorological look-alike
  artifact**: flat power "plateaus" at fixed kW values whenever DC array output exceeds inverter AC
  capacity, "not caused by meteorological effects." Directly useful for Lynx's flatline detector —
  the signature differs from both a real flatline (near-zero, any time) and a cloud dip: a fixed,
  non-zero power ceiling reached only near solar noon on high-irradiance days.

**Newer independent numeric cross-checks:**
- Wang, Kurtz, Bosch, de la Parra, Kleissl ([JRSE 12, 2020](https://pubs.aip.org/aip/jrse/article-abstract/12/5/056302/1060573/Maximum-expected-ramp-rates-using-cloud-speed)) — geometry-aware maximum-ramp method, bracketed 98.9% of real ramps; largest observed 29.7%/s.
- Agüera-Pérez et al. ([Renewable and Sustainable Energy Reviews 202, 2024](https://rodin.uca.es/bitstream/handle/10498/38263/1-s2.0-S1364032124004155-main.pdf)) — literature review across ~35 studies (2kW-164MW); documents real "cloud enhancement" overshoots of **1200-1500 W/m² (20-50% above 1000 W/m² STC)** — legitimate, not an impossible reading.
- Ellis, Pearre, Swan ([Solar Energy 220, 2021](https://www.sciencedirect.com/science/article/abs/pii/S0038092X21002309)) — 60 real residential systems: aggregated residential ramps **never exceeded 13%/5min**, vs. up to 61-68%/5min for commercial-scale sites.

## 3. Production-vs-consumption correlation baselines — supports the direction, no drop-in number

No paper reports a direct same-property production-vs-consumption Pearson r as a headline result, so
there's no ready replacement for Lynx's k=0.25/0.45 thresholds. What *does* exist supports the
qualitative direction strongly:

- Widén (Uppsala thesis, 2009): at high/mid latitudes, "**domestic electricity demand and insolation
  are negatively correlated** on both an annual and diurnal basis." Real self-consumption ("solar
  fraction") ceilings from actual Swedish demand data: only **~21-35%** in the base case, rising to
  at best **~54-64%** even with optimized orientation, load-shifting, and storage.
- Two IEEE/Iowa State smart-meter papers (real Austin TX and Midwest US utility data) confirm
  **genuine PV systematically distorts** a household's own day/night load correlation rather than
  reinforcing it — and separately warn that **correlation coefficients rise mechanically with
  time-aggregation** (0.56 hourly → 0.91 monthly, on unrelated series), a caution that Lynx's k
  threshold may not be equally diagnostic at every export resolution.
- **Important boundary case documented:** PV generation curves from *different* arrays in the same
  area **are** legitimately highly correlated — a shared-weather/shared-schedule effect across
  many households, not same-property cross-talk. This is exactly what Lynx's time-of-day linear
  control exists to rule out.

**Bottom line:** the literature supports treating high positive production/consumption correlation
as anomalous, but the k=0.25/0.45 constants remain internally calibrated (as the code already says),
not externally validated — closing that gap would need Lynx's own analysis across more known-good
files, not a citation.

## 4. Monitoring artifacts: clipping, soiling, and the shading current/voltage heuristic

**Sandia SAND2004-3535** (King, Boyson, Kratochvil) — the underlying physics for Lynx's existing
"shading = current drops, voltage holds steady" heuristic:

- **Isc/Imp scale ~linearly with irradiance; Voc/Vmp depend only on the log of irradiance** (plus
  temperature) — confirms the asymmetry the heuristic relies on.
- **Quantitative string-health thresholds:** a string Voc **>5% below nameplate** (at standard
  conditions) means a module is likely below spec; healthy strings should agree with each other to
  within **±3%**.
- Real 3.4kWp system example: a hard inverter DC-input limit produces a **flat ceiling on Pmp across
  a wide range of Vmp** — a citable illustration of benign clipping vs. a real fault.

**Soiling signature (NREL, multiple sources) — a specific time-shape, distinguishable from Lynx's
existing checks:**
- True soiling is a **slow, roughly monotonic multi-day-to-multi-week decline**, ended by an abrupt
  step-up at a rain/cleaning event — a repeating **saw-tooth** pattern over a multi-year record
  (Deceglie/Micheli/Muller 2018; Kalimeris et al. 2023, using real 5-7 year NREL/Sandia validation
  datasets from Eugene OR, Cocoa FL, Golden CO).
- **Clipping must be filtered out before any such trend analysis** — stated explicitly as standard
  practice in multiple NREL papers, since clipping can mask (or later reveal, as a system ages and
  clips less) a real soiling trend.
- This gives Lynx a clean discriminator: a gradual multi-day decline → soiling-shaped; an abrupt
  discrete run of bad days → Lynx's existing per-day production-anomaly check; a hard flat ceiling
  near solar noon on high-output days only → clipping, not a fault.

**Shading mechanism, confirmed at the device-physics level:**
- [PVEducation.org](https://www.pveducation.org/pvcdrom/modules-and-arrays/bypass-diodes) (ASU):
  bypass diodes clamp a shaded cell group's reverse voltage to ~1 diode drop, so the module string's
  operating **current** is set by the worst (shaded) sub-string while **voltage is comparatively
  preserved** — the direct mechanistic explanation for Lynx's existing heuristic.
- Nunes et al. ([Frontiers in Energy Research, 2022](https://www.frontiersin.org/journals/energy-research/articles/10.3389/fenrg.2022.837540/full)):
  real partial shading produces a **multi-peak I-V/P-V curve** (a global MPP and one or more local
  MPPs), not just a scaled-down clean curve — a stronger, more specific signature than the simple
  current/voltage rule, but only usable if Lynx ever gets sub-string or per-MPPT telemetry.

## Gaps

- **Public real-world PV production datasets** (NREL PVDAQ, Sandia PV performance database, DKASC
  Alice Springs, Open PV, etc.) — this research task did not complete before hitting the session
  limit. Worth re-running if Lynx ever wants a real dataset to validate synthetic examples or
  calibrate thresholds against, beyond the existing internal corpus.
