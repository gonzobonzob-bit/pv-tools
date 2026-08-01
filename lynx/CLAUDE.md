# lynx (in pv-tools)

Single-file browser diagnostic tool for solar PV CT data. Deployed to GitHub Pages:
https://gonzobonzob-bit.github.io/pv-tools/lynx/

**This directory is the live source for Lynx.** It moved here from the standalone
`gonzobonzob-bit/pv-ct-review` repo, which is now archived and serves only a redirect.
Do not develop Lynx there — the tool source lives here.

Git history before the move stayed behind in `pv-ct-review`; this repo's history starts
at the hub's initial commit.

## Workflow

The user iterates on features in the Claude.ai web app, downloads the result, and brings it here.

**Standard flow:**
1. User brings updated `index.html` from Downloads
2. Diff against current project file — flag anything present in live but absent in the new file
3. If clear, replace and push with the user's exact commit message
4. Confirm Pages deploy and give URL
5. Remind user to re-upload the committed file to their Claude.ai Project

## CSS design system — preserve exactly

As of v1.14, Lynx is on the PV Tools shared design system **v2.1 "Solar Flare"**
(`../DESIGN.md` is the binding spec — tokens are copied into the `<style>` block).
Warm near-black grounds, molten amber→orange→coral gradient `--g`, luminous glowing
status tokens. Font: system sans stack (`--sans`), `ui-monospace` stack (`--mono`).
No Google Fonts dependency.

Lynx-specific notes on top of DESIGN.md:
- Legacy token names (`--card`, `--card-alt`, `--orange`, `--red`/`--green`/`--amber`
  and their `-bg`/`-line` pairs) are kept in `:root` as **aliases** onto the v2.1
  values because the JS references them (`var(--red)`, `var(--amber)`, `--amber-bg`).
  Never rename or delete them.
- Status banners: solid status-color fill (`--danger`/`--ok`/`--warn`) with dark
  `--on-sun` ink — a deliberate deviation from DESIGN.md's gradient verdict banner so
  GOOD / TROUBLESHOOT / CHECK YOUR EXPORT stay color-distinguishable.
- One gradient-filled hero per region: `.upload-label` (main upload) and
  `.primary-btn` (micro Compare). Inside `.micro-disclosure` the `.upload-label`s are
  deliberately overridden to quiet secondary style.
- Sticky `.appbar-wrap` (← PV Tools / Lynx / version pill) with the 3px `--g`
  glowline under it; the visible version string lives in `.appbar-ver`.
- Chart series color literals in JS (`renderChart`'s `colors` object) and SVG
  axis/grid literals are mapped to v2.1 tokens: pv #6fc9ff, grid #ffb43a,
  load #ff4d6d, batt #5df0b2; gridlines #4d3d24; axis text #7d735f.

Do NOT revert to the old light theme (white cards, `--blue`, Inter font) or the
pre-v1.14 cool-gray dark/orange palette (#14161a / #f5821f).

## Current features

**System CT Review (main section)**
- CSV upload (drag-and-drop supported)
- Detects schema: `load_with_solar`, `tesla_derived`, `legs_only`, `whole_system` (Enphase no-leg export)
- Leg detection uses Produced/Consumed section markers + header-text L1/L2 identification — position-only detection mislabels legs, so don't simplify this
- Checks: negative-PV (with Enphase vs Tesla-specific guidance + customer-facing note), Grid=Load−PV balance, cross-talk correlation (differenced Pearson), flatline/dropout (absolute + relative-span, with whole-system-offline detection to avoid duplicate alerts), per-leg consumption flatline (legs_only), per-day production anomaly (split: consecutive-run runs ≥3 days → ISSUE, isolated days → INFO)
- `INSUFFICIENT_DATA` status returned when < 4 usable points

**Microinverter Troubleshooting (`<details>` disclosure at bottom)**
- Side-by-side CSV upload for two inverters; collapses by default
- Groups output by time-of-day, finds morning/afternoon gap skew
- DC side: amperage + voltage analysis (shading signature = current low, voltage steady)
- AC side: voltage comparison between modules (branch wiring check)
- Residual: gap with no DC/AC explanation → power-line comms hypothesis
- Findings rendered as quick-lines + detail-cards (same pattern as System CT section)

## Key JS invariants — do not simplify away

- `parseTimeSafe()` has a special case for GraphList `"Jun 25, 2026 (15:15)"` format — native `Date()` silently returns midnight for these
- `checkFlatline()` uses both absolute (`minHours`) AND relative (`minFractionOfSpan=0.85`) thresholds — partial-day exports need the relative path
- `renderReport()` handles three statuses via a `BANNER` lookup object
- `parseCSV` and `parseTimeSafe` are defined once and shared globally — the duplicate copies that used to live in the micro section were removed so a fix in one place can't silently diverge from the other
- Consumption-leg over-correlation check (`worstDayLegBalance` in the leg-balance finding) uses a PROVISIONAL threshold: 0.90 whole-file / 0.92 worst single-day. Calibrated on one confirmed real example (rCons=0.963) against three other real `legs_only` files reading 0.26-0.56 — a wide gap at this sample size, but treat as a lead worth a human look, not a confirmed-fault threshold, until more files validate it. Reported at `info` tier for that reason; doesn't drive TROUBLESHOOT/GOOD on its own.
- Everything runs client-side; no fetch/API calls anywhere

## Deploy

GitHub Pages from the `pv-tools` repo, branch `main`, root `/`. Lynx is served from the
`lynx/` subpath. Push to main triggers automatic redeploy (~30s).
Check with: `gh run watch $(gh run list --limit 1 --json databaseId -q '.[0].databaseId') --exit-status`

Note the repo also runs a CI job on push (`.github/workflows/test.yml`), which currently
tests only `pw3-string-analyzer`. Lynx has CSV fixtures in `tests/site_review/` but no
runner, so a Lynx change is not covered by CI.
