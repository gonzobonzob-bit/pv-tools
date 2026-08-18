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
      corpus/          68 real exports, staged for shared use       <- see safety note
      render_harness.js
      corpus_harness.js
      cards_harness.js
      rule3_gate.js

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

**`rule3_gate.js`** — enforces standing rule 3 by meaning rather than by exact phrase.
Run it on every release; see finding 1 below for why the greps it replaced were not enough.

    node tests/rule3_gate.js index.html

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

Current expected: **130** (v1.37, and v1.36 too — measured). Was 130 at v1.34 and v1.35;
134 earlier, while the sparkline existed; 130 before it.

This line previously read 134 and said v1.36 "added four (`.first`, `.ms`, `.v1`, `.v2`)
— verified additive, nothing lost." That was wrong, and re-measuring both builds on the
push side at v1.37 is what caught it: v1.36 counts 130, not 134. The four names were never
selectors at all — they are JavaScript property accesses that a whole-file regex misread as
classes. See finding 3, now closed.

Count functions with `function\s+(\w+)\s*\(` — a bare `function` grep also matches
prose inside comments and produced a count that needed an asterisk.

## Element id count — state the DEFINITION, not just the number

The two sides reported 46 and 48 for the same bytes. Neither was arithmetic error: they
counted different things, and the README never said which to count. Measured on v1.38
(identical on v1.37):

| what is counted | v1.38 | command |
|---|---|---|
| ids in **static HTML markup** (script/style stripped) | **46** | the gate below |
| every distinct `id=` string, incl. ids built in JS | 49 | adds `dup-notice` + 2 template patterns |
| ids reached via `getElementById` | 44 | 5 defined ids are never looked up |

The 49 includes `item-${it.uid ?? i}` and `micro-item-${i}` — template patterns, not
literal ids — so it is the least useful figure.

**Use the static-markup count, 46, and check the DELTA rather than the absolute.** A release
must add or remove none unless it says so:

    node -e '
    const h=require("fs").readFileSync("index.html","utf8")
      .replace(/<script[^>]*>[\s\S]*?<\/script>/g,"").replace(/<style[^>]*>[\s\S]*?<\/style>/g,"");
    console.log(new Set([...h.matchAll(/\bid\s*=\s*"([^"]+)"/g)].map(m=>m[1])).size);'

Five ids are defined but never looked up (`dispatcherLink`, `micro-dropzone-a`,
`micro-dropzone-b`, and two template patterns). That is not a defect — they are CSS or
markup anchors — but it is why the `getElementById` count is lower and should not be used
as the gate.

## corpus/ — what it covers, and the safety note

72 real exports across all five schema modes (51 at v1.35; +5 clean `GraphList_202608121*`
fixtures at v1.36; +11 clean `GraphList_20260817*` QCells fixtures at v1.37; +4 more
`GraphList_20260817*` at v1.38 — `103622`, `110044`, `110112`, `110201`, the batch that
exposed the v1.37 bleed gate as the wrong instrument. `110044` is the demonstrated false
positive that gate let through, so keep it. See the safety note; the source-side folder
holds more than this and the difference is deliberate). The committed `site_review/` fixtures are
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
| `GraphList_20260817094844.csv` | **demonstrated false positive #1** — k=0.388 with r2=0.028; the file that showed a slope alone is not evidence |
| `GraphList_20260817110044.csv` | **demonstrated false positive #2** — passed v1.37's r2 gate (r2=0.166) but hour-of-day explains usage better (r2=0.296); the file that forced the v1.38 control |
| `GraphList_20260723085425.csv` | the counter-example: a real bleed STRENGTHENS under the time-of-day control (r2 0.807 -> 0.844) |
| `GraphList_20260812150345.csv` | **unresolved** — still reports at issue tier, skips the control at collinearity 0.449; would flip on a small change to `TOD_COLLIN_MAX`. No evidence either way. |

**SAFETY — read before committing corpus/ to a public repo.**

Scanned all 68 files for names, street addresses, emails, phone numbers, coordinates
and account identifiers: **none found.** (The `GraphList_*` files added at v1.35, v1.36
and v1.37 are QCells-schema exports with no site-identifier column at all — their header
is `PV, Grid, Load, PV Produced, Load Consumed, Grid Voltage L1/L2, Grid Current L1/L2,
Grid Frequency, SOC` and nothing else; re-scanned on the push side before committing.)
Two things to know anyway:

1. **Seven files carry a gateway serial** (`STE########-#####`) in both the filename
   and a `uid` column. That is not a name or address, but it IS a unique per-site
   identifier. They now live in `tests/_private_do_not_commit/` on the source side and
   are committed here only as the scrubbed `Export_site01`–`site05` twins. Never copy
   that folder across.
2. Everything else is timestamps and watt values with no site identity attached.

`enphase_confirmed.csv` was independently checked from the push side and carries no
serial, name, address, account or site id — it is safe for the public repo and is the
one file most worth committing permanently.

## Open findings — carried between surfaces

Things one side found that the other owns. Delete a line when it is closed, not before.

**1. CLOSED at v1.37 — kept as the reason the gate exists.** v1.36 was believed clean
because two greps for the exact phrases `needs a truck roll` and `fully remote fix` both
returned 0. Eight violations were sitting behind different wording ("a fast, fully remote
way", "fully remotely"), and one asserted the INVERSE — "none of these are fixable
remotely" — which is the same unsupported claim pointed the other way. An exact-phrase
grep cannot enforce a rule about MEANING.

`tests/rule3_gate.js` replaces those greps and is the gate now:

    node tests/rule3_gate.js index.html        # exit 0 = pass

It carries two verified exemptions — `"If it is not adjustable remotely:"` (a conditional
branch on a card that explicitly says the tool cannot tell) and `"the same evidence,
obtained remotely"` (how evidence was obtained, not that a fix exists). Check they have
not blinded it by running the gate against a known-bad build: v1.36 still reports its 9
violations. Do that after any change to the exemption list.

**2. Two v1.36 cards have never been rendered in a browser.** Text confirmed by
`cards_harness`, typography unseen: the info-tier minor-voltage-excursion card
(`GraphList_20260625161445.csv`) and the cross-talk card at its new INFO tier across the
7 affected files.

**3. CLOSED at v1.38 — NOT A DEFECT.** `.first`, `.ms`, `.v1`, `.v2` are not classes and
are not applied in markup. Every occurrence is a JavaScript **property access**:
`droppedTimeRange.first`, `x.ms`, `p.v1`, `p.v2`. Nothing renders unstyled.

Measured on all three builds — v1.36 backup, v1.37 backup, and v1.38:

| token | in CSS | inside a `class=` attribute | `classList`/`className` | `.token` occurrences | property accesses |
|---|---|---|---|---|---|
| `.first` | no | **0** | 0 | 4 | 4 |
| `.ms` | no | **0** | 0 | 16 | 16 |
| `.v1` | no | **0** | 0 | 3 | 3 |
| `.v2` | no | **0** | 0 | 3 | 3 |

Identical on every build. The `class=` scan covered all three quote styles including
template literals, and `classList.add/remove/toggle` and `className` assignment as well.

**The lesson, because this is the second time.** A whole-file regex cannot distinguish a
CSS class from a property name — both look like `.token`. The same scan produced the
`130 → 134` selector count at v1.36 that finding 3's own paragraph above walks back. When
a scan reports selectors that "exist nowhere in the CSS," the first hypothesis should be
that they were never selectors. Restrict the CSS scan to `<style>` blocks (the gate command
above already does) and confirm any class claim by finding it in a `class=` attribute.

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
