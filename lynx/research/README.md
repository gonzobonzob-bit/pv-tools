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
- [`enphase.md`](enphase.md) — **install only.** Troubleshooting and public-testing research did not
  finish (session token limit mid-run).
- [`pv-curves-and-monitoring.md`](pv-curves-and-monitoring.md) — 4 of 5 angles complete (clear-sky
  models, cloud-transient variability, production/consumption correlation, monitoring artifacts).
  **Public real-world PV datasets** did not finish (same limit).

## Gaps to fill (re-run these research angles)

1. Enphase troubleshooting docs (Enlighten/Installer Toolkit alert text, field-fault taxonomy beyond
   the two technical briefs already found).
2. Enphase public testing/certification docs (independent UL/IEEE1547/NREL validation, if any exists).
3. Public real-world PV production datasets (NREL PVDAQ, Sandia PV performance database, DKASC Alice
   Springs, Open PV, etc.) as a possible calibration/validation reference.

## Concrete opportunities this research surfaced for Lynx itself

Not yet implemented — for whoever picks up the next Lynx change:

- **New `CITATIONS` entries** worth adding once cited in actual card text: the Tesla Energy Library
  pages (CT orientation, Meter/CT Issues troubleshooting), Enphase TEB-00053/TEB-00079, the QCells
  Q.HOME COMBINER manual and AC Installer FAQ, Sandia SAND2012-2389 (clear-sky), Lave/Kleissl 2012
  and Kreuwel 2020 (cloud transients), Sandia SAND2004-3535 (shading/soiling physics).
- **Tesla "Flip" / Enphase "Reverse Polarity"** — both platforms let an installer correct CT polarity
  in *software*, independent of physical orientation. A polarity fault Lynx flags could be a
  currently-wrong physical CT, a Flip left in the wrong state after a correct re-clamp, or a Flip
  applied to a CT that was never backwards. Recommendation text for both platforms could mention
  checking this software setting, not just physical orientation.
- **Tesla power-factor check** — Tesla's own troubleshooting uses low PF (e.g. ~0.5) as a documented
  secondary signal for a CT on the wrong phase. Lynx doesn't have an equivalent check; QCells exports
  carry PV/Grid Voltage & Current columns that could support one for that platform too.
  data.
- **QCells negative-Load messaging gap:** QCells' own FAQ names "another generation source (another
  solar system, or a generator)" as a legitimate alternate explanation for negative consumption
  before concluding a wiring fault — Lynx's current negative-Load card doesn't mention this.
- **QCells model-line awareness:** Q.HOME CORE H4/H5 has no CT at all; A4/A5 has exactly one. A
  "missing channel" isn't a dropout on those product lines — it's the expected shape. Grid-side
  metering on Q.HOME CORE is an RS-485 digital meter, not a clamp CT, so a Grid anomaly there is more
  likely a comms/config fault than a polarity fault.
- **Inverter clipping vs. flatline, sharper discriminator:** Kreuwel et al. describe real clipping as
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
- **QCells fault codes E21/E22/A002 and E06/A006** give citable manufacturer language for negative-PV
  and out-of-range-voltage/current cards on that platform specifically.
