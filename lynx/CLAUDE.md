# lynx (in pv-tools)

Name: a lynx catches the faint movement a slower eye misses — same instinct, aimed at CT traces.

Single-file browser diagnostic tool for solar PV CT data. Deployed to GitHub Pages:
https://gonzobonzob-bit.github.io/pv-tools/lynx/

**This directory is the live source for Lynx.** It moved here from the standalone
`gonzobonzob-bit/pv-ct-review` repo, which is now archived and serves only a redirect.
Do not develop Lynx there — the tool source lives here.

Git history before the move stayed behind in `pv-ct-review`; this repo's history starts
at the hub's initial commit.

## Workflow

The user works across multiple Claude surfaces (Code, Desktop, web) interchangeably —
there's no separate claude.ai Project copy of `index.html` to keep in sync.

**Read `lynx/LYNX_HANDOFF_PROTOCOL.md` before acting on any handed-over build.** It
defines the two-way exchange and, more importantly, what you can and cannot verify here.

**The asymmetry this protocol was written for has largely closed, and the number to keep
in mind changed with it. As of v1.40 the repo carries 82 CSV fixtures spanning all five
schema modes — 63 `load_with_solar`, 7 `tesla_derived`, 6 `legs_only`, 4 `whole_system`,
1 `whole_system_battery` — reaching 81 distinct card types. Both sides now test the same
corpus. What remains held back: 2 Tesla battery exports whose filenames carry raw gateway
serials, and the 7 files in `tests/_private_do_not_commit/`. A source-side count will
therefore always exceed the committed one, which is why corpus handovers state the DELTA
by filename and never a bare total.** So:

- Re-running the fixtures now DOES re-verify most behavioural changes — the corpora
  match. What a clean fixture run still does not prove is anything visual: CSS,
  layout, contrast, typography, real-browser console cleanliness. Those remain
  yours alone, and a harness "render" is a stub DOM, not a browser.
- Do not "fix" detection logic, thresholds, or card text from here — you cannot test it.
  Report it instead; it comes back as a real fix with corpus evidence.
- A one-line provably-correct fix (e.g. a variable-scope error) may be applied, but must
  appear in the push summary so it gets folded back into the source of truth.

**When brought an updated `index.html` (e.g. from Downloads):**
1. Verify the sha256 in the prompt. If it does not match, STOP.
2. Confirm the base assumption by diffing the repo's current `lynx/index.html` against
   the backup file the prompt names — do not trust the claim.
3. Structural diff: functions, element ids, CSS variables and classes. Flag anything
   present before and absent after. Removal releases are where this earns its keep — a
   recent one nearly deleted an adjacent function along with its target.
4. If clear, replace and push with the exact commit message given
5. Confirm Pages deploy, re-fetch the live page and hash it, give the URL
6. **Do the render checks the prompt asks for** — this is the half nobody else can do
7. **Write `~/Downloads/LYNX_PUSH_SUMMARY_V<n>.md`** using
   `lynx/LYNX_PUSH_SUMMARY_TEMPLATE.md`, and tell the user it is there

## CSS design system — preserve exactly

Dark theme with orange accent. Font: system sans-serif stack (`--sans`). No Google Fonts dependency.

CSS variables (defined in `:root`):
- `--bg` #14161a, `--card` #1b1e24, `--card-alt` #20232a, `--line` #2a2e36
- `--ink` #eef0f3, `--muted` #9aa0ab
- `--orange` #f5821f, `--orange-light` #ff9a3d, `--orange-bg` #2e2010
- `--green` #3fbd72, `--green-bg` #15261c, `--green-line` #234a32
- `--red` #ef5b52, `--red-bg` #2c1816, `--red-line` #4a2723
- `--amber` #e3a23a, `--amber-bg` #2c2210, `--amber-line` #4a3a1a
- `--mono` Courier New stack, `--sans` system stack

Status banners: solid color fill (`background: var(--red/green/amber)`), dark ink text
(`color: var(--bg)`) — not white. Matches the pattern in the companion tool
`pw3-string-analyzer`: white text on amber/green fails WCAG AA contrast (2.2:1 / 2.4:1),
dark ink on the same fills clears AA comfortably (5.4:1 / 8.2:1 / 7.5:1 across red/amber/green).
Buttons: orange fill for primary actions (`--orange`), card-colored for reset/secondary.
Do NOT revert to the old light theme (white cards, `--blue`, Inter font, border-left banners).

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
