# Lynx research — manufacturer docs and PV physics

Reference material gathered 2026-09-06 to inform Lynx's diagnostic checks: manufacturer install/
troubleshooting/testing documentation for Tesla, QCells, and Enphase, plus physics/monitoring
research behind the cloud-transient, correlation-threshold, and shading-signature logic. Every fact
in these files was pulled from a source that was actually fetched and read (not a search snippet),
with the source URL given — treat anything without a URL next to it as not yet verified.

This is reference material for future Lynx development, not a description of what's currently
implemented — check `index.html` and `CLAUDE.md` for the actual current behavior.

## Files

- [`tesla.md`](tesla.md) — complete (install, troubleshooting, testing)
- [`qcells.md`](qcells.md) — complete (install, troubleshooting, testing)
- [`enphase.md`](enphase.md) — complete (install, troubleshooting, testing)
- [`pv-curves-and-monitoring.md`](pv-curves-and-monitoring.md) — complete (clear-sky models,
  cloud-transient variability, production/consumption correlation, monitoring artifacts, public
  datasets)

No open research gaps from the original plan. Two soft, unconfirmed leads remain in `enphase.md`
(an NREL report whose full text was network-blocked this session; whether Enphase appears on a CEC
equipment list that was also unreachable) — noted there, not worth a dedicated re-run on their own.

## Already acted on (index.html)

- **v1.45:** negative-PV issue card now cites the platform-appropriate manufacturer source (Tesla,
  Enphase, or QCells); negative-Load card gained the "second generation source" caveat QCells' FAQ
  documents. New `CITATIONS` entries: `enphaseCtTrouble`, `enphaseCtHealth`, `qcellsFaq`,
  `qcellsCombiner`, `teslaCtIssues`.
- **v1.46:** replaced a built-in example whose underlying check can never escalate past info tier
  (same-conductor leg mirroring) with one grounded in QCells' own fault code E06/A006 (service
  voltage out of ANSI C84.1 range); added a genuine-correlation (not mirroring) bleed example on the
  Enphase schema; every issue-tier finding now shades its window on the chart (was 104/106 before
  the fix — see the v1.46 commit for the full list of what was missing and why).

## Remaining concrete opportunities — not yet implemented

- **Enphase PF-based cross-talk check.** Enphase's ANZ best-practices brief gives numeric healthy PF
  ranges (production 0.7–1.0, consumption 0.5–0.99 when load ≥230W) and a verbatim rule: low PF on
  multiple phases during production = cross-phase CT miswiring. Not implementable today — Enphase's
  `legs_only` export (the only schema Lynx reads for this platform) carries no voltage/current
  columns to compute PF from. Would need a different Enphase export format.
- **Tesla power-factor check.** Tesla's own troubleshooting uses low PF (~0.5) as a secondary signal
  for a CT on the wrong phase. QCells exports *do* carry Grid Voltage + Current columns that could
  support a PF-based check on that platform; Tesla's own export has no voltage/current columns
  either, same limitation as Enphase.
- **Enphase Net-vs-Total consumption-mode misconfiguration.** A specific, directly-detectable
  signature from the new research: consumption trace ≈ production trace with export always ≈0 means
  the Consumption CT mode is set to "Load Only" when it should be "Load with Solar" (Net) — a
  configuration error, not a wiring fault, and a different root-cause bucket than anything Lynx's
  cross-talk/bleed check currently names.
- **Enphase CT-configured-phase-count vs. gateway-feed mismatch.** Can itself put the gateway into
  an error status and suppress production for every Nth microinverter on a 3-phase system — a
  pattern signature distinct from a single dead/reversed CT.
- **Eaton panel false-positive pattern (Enphase, but likely generalizes).** On many Eaton service
  panels, line conductors are internally rotated across the main breaker, so a CT layout that looks
  wrong (spanning "both entrance conductors") may be the manufacturer-documented correct
  installation for that panel brand — worth a caveat in reversed/miswired-CT recommendation text
  before it's called an installer error.
- **RGM/meter-comms dropout vs. CT fault (Enphase).** "Meter Failed/Not Reporting" in Enlighten is a
  ZigBee/USB radio link failure on a physically separate revenue-grade meter, not a CT wiring issue
  — a distinct root cause from the flatline/dropout and negative-reading fault families Lynx already
  models, worth keeping distinct if Lynx ever ingests Enlighten status text directly.
- **Firmware-gated remote fix (Enphase).** The "Reverse Polarity" remote flip needs Gateway firmware
  ≥7.x; older Envoy-S Metered hardware can't be fixed remotely at all. Lynx's recommendation text
  already hedges ("if exposed at your access level") but doesn't name firmware version as the reason.
- **QCells model-line awareness.** Q.HOME CORE H4/H5 has no CT at all; A4/A5 has exactly one. A
  "missing channel" isn't a dropout on those product lines — it's the expected shape. Grid-side
  metering on Q.HOME CORE is an RS-485 digital meter, not a clamp CT, so a Grid anomaly there is more
  likely a comms/config fault than a polarity fault. (Likely low-priority: Lynx reads the Q.OMMAND
  portal's own CSV export, which may already normalize this regardless of backing hardware —
  unconfirmed either way.)
- **Inverter clipping vs. flatline, sharper discriminator.** Kreuwel et al. describe real clipping as
  a flat ceiling *at a fixed non-zero kW value, reached only near solar noon on high-output days* —
  distinguishable from Lynx's flatline/dropout signature (near-zero, any time of day). Worth checking
  whether `checkFlatline`'s current logic already handles this or could be sharpened.
- **Cloud-enhancement overshoot (>100% of clear-sky/nameplate)** is real and well-documented
  (1200-1500 W/m² vs. 1000 W/m² STC) — if any future check ever treats "production above expected
  maximum" as suspicious, this literature says don't, at least for short durations on partly-cloudy days.
- **Soiling has a distinct saw-tooth signature** (slow multi-day decline, abrupt reset at
  rain/cleaning) that's different from both Lynx's per-day production-anomaly check (discrete run of
  bad days) and a cloud transient (single-day dip) — a possible new check, if there's ever a
  multi-week+ export to test it against.
- **Real-data calibration sets exist now** (PVDAQ, DKASC, `uk_pv`, the DuraMAT tracker-fault set —
  see `pv-curves-and-monitoring.md` §5) if Lynx ever wants to validate a threshold against real data
  beyond its own internal corpus, or pull genuinely labeled fault windows (DKASC's dated inverter
  failures; DuraMAT's true labeled tracker faults) to sanity-check detection logic against.
