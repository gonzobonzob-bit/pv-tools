# lynx/tests — shared working area

Both Claude surfaces can read this directory. It exists so the analysis side and the
push side stop describing files to each other and just run the same commands on the
same bytes.

**This directory is NOT automatically published.** `lynx/index.html` is what GitHub
Pages serves; everything here is repo content only. But the repo IS public, so read
the safety note below before committing anything from `corpus/`.

## Layout

    lynx/tests/
      site_review/     9 fixtures, committed, all load_with_solar   <- in git today
      corpus/          51 real exports, staged for shared use       <- see safety note
      render_harness.js
      corpus_harness.js
      cards_harness.js

## The harnesses — run these, don't re-describe results

**`render_harness.js` — the one that matters.** The corpus harness stubs
`getElementById` to return `null`, so every branch guarded by `if (el)` is skipped and
`renderReport()` never runs. Three releases shipped or nearly shipped defects that
were invisible for exactly that reason. This shim returns a real stub for every id in
the page and calls `renderReport()`.

    node tests/render_harness.js index.html tests/corpus/*.csv

Required: no `renderCrash` on any file; `cardsHtml > 0` wherever a report was produced.
Validated against the known-bad build — the old harness reported 0 crashes on 4 files,
this one reported the ReferenceError on all 4.

**`corpus_harness.js`** — verdict and card counts per file. Use for regressions.

    node tests/corpus_harness.js index.html tests/corpus/*.csv

**`cards_harness.js`** — every card headline per file. Use when card text changes.

## CSS selector count — the other gate

No harness applies CSS, so a stylesheet deletion is invisible to all of them. One
build deleted 68 selectors while intending to delete 4 and still reported 0 crashes
with unchanged verdicts.

    node -e '
    const h=require("fs").readFileSync("index.html","utf8");
    const css=[...h.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m=>m[1]).join("\n")
      .replace(/\/\*[\s\S]*?\*\//g,"");
    const s=new Set();
    for(const m of css.matchAll(/([^{}]+)\{/g))
      m[1].split(",").forEach(x=>{x=x.trim().replace(/\s+/g," ");if(x&&!x.startsWith("@"))s.add(x);});
    console.log(s.size);'

Current expected: **134** (v1.36). Was 130 at v1.34 and v1.35; 134 earlier, while the
sparkline existed; 130 before it. v1.36 added four (`.first`, `.ms`, `.v1`, `.v2`) with
the new cards — verified additive, nothing lost.

Count functions with `function\s+(\w+)\s*\(` — a bare `function` grep also matches
prose inside comments and produced a count that needed an asterisk.

## corpus/ — what it covers, and the safety note

57 real exports across all five schema modes (51 at v1.35; +5 clean `GraphList_202608121*`
fixtures at v1.36 — see the safety note, the source-side folder holds more than this and
the difference is deliberate). The committed `site_review/` fixtures are
9 files, all `load_with_solar` — **66% of the tool's card types cannot be reached with
those 9.** That gap is why a clean fixture run does not re-verify a behavioural change.

Notable files:

| file | why it matters |
|---|---|
| `enphase_confirmed.csv` | **the only confirmed ticket outcome.** Reversed consumption CT on L1, truck roll, corrected 2026-08-06 — owner-confirmed. The reversal thresholds are calibrated on it. |
| `enlighten_chart__2_.csv` | the `[RECURRING]` battery path |
| `GraphList_20260810151640.csv` | QCells week export: five flat stretches, four at 0 W |
| `GraphList_20260812082235.csv`, `…082319.csv` | the only two files that exercise `checkServiceVoltage` — 80.9% / 52.1% outside ANSI Range B, 19.1V and 16.8V leg splits |
| `Export_site05_*.csv` | three views of one system; the 61-day one is 46% empty |
| `fault_ct_*.csv` | injected faults for the named CT classes |
| `big200k.csv` | 200k points, performance ceiling |

**SAFETY — read before committing corpus/ to a public repo.**

Scanned all 51 files for names, street addresses, emails, phone numbers, coordinates
and account identifiers: **none found.** (The five `GraphList_202608120*` files added at
v1.35 are QCells-schema exports with no site-identifier column at all; re-scanned on the
push side before committing.) Two things to know anyway:

1. **Seven files carry a gateway serial** (`STE########-#####`) in both the filename
   and a `uid` column. That is not a name or address, but it IS a unique per-site
   identifier. Scrub or rename before committing those seven, or keep them out of git
   and share them through this directory only.
2. Everything else is timestamps and watt values with no site identity attached.

`enphase_confirmed.csv` was independently checked from the push side and carries no
serial, name, address, account or site id — it is safe for the public repo and is the
one file most worth committing permanently.

## Open findings — carried between surfaces

Things one side found that the other owns. Delete a line when it is closed, not before.

**1. Standing rule 3 is not fully closed at v1.36 (analysis side owns the fix).**
The v1.36 gates grep `needs a truck roll` and `fully remote fix`; both return 0, including
comment lines. A wider sweep of live code still finds one capability claim:

> "run the CT Health Check on the Consumption meter — **a fast, fully remote way** to rule
> out polarity or branch issues first."

That asserts both that the portal exposes a CT Health Check and that it is fully remote —
what standing rule 3 says no export can reveal. It survived because the gate matches the
exact phrase `fully remote fix`, not `fully remote`.

Suggested gate, replacing the two exact-phrase greps:

    grep -nEi 'fully remote|remotely (fix|resolv|correct)|truck roll|needs? a (site )?visit' lynx/index.html

Expected: every hit is either a comment, historical calibration provenance, or inside an
`If it escalates:` conditional — the 23 phrases kept deliberately at v1.36. Anything else
is a live capability claim.

The other seven hits at v1.36 were checked and are fine: five `truck roll` (one comment,
one calibration provenance, three conditionals) and two `dispatch is warranted`, both
inside `If it escalates:` blocks.

**2. Two v1.36 cards have never been rendered in a browser.** Text confirmed by
`cards_harness`, typography unseen: the info-tier minor-voltage-excursion card
(`GraphList_20260625161445.csv`) and the cross-talk card at its new INFO tier across the
7 affected files.

## Working agreement

- **Analysis side** builds, runs all three harnesses plus the selector count, writes
  `~/Downloads/CLAUDE_CODE_PROMPT_V<n>.md`
- **Push side** verifies, pushes, does the render checks nobody else can, writes
  `~/Downloads/LYNX_PUSH_SUMMARY_V<n>.md`
- Neither silently fixes the other's domain. A one-line provable fix may be applied,
  but must appear in the summary so it folds back into the source of truth.
- Full protocol: `lynx/LYNX_HANDOFF_PROTOCOL.md`

## Backups

`index_v1.*_pre_v*_backup.html` in `lynx/` are local safety copies written before each
overwrite, because this directory is not a git checkout. **Never commit them.** They
are how the push side confirms a base-version claim rather than trusting it.

## Anonymisation (applied before committing `corpus/`)

Seven files carried a gateway serial (`STE########-#####`) in the filename and in a `uid`
column. Both were replaced with stable per-system labels `site01`–`site05`, so the grouping
survives: `Export_site05_*.csv` is still three views of one system.

Verified after scrubbing: zero `STE` matches in any filename or file body, and
`corpus_harness.js` output is byte-identical to the pre-scrub run across all 46 files
(same verdicts, same summaries, same card counts) once the filename field is excluded.
The scrub changed identifiers only, never telemetry.
