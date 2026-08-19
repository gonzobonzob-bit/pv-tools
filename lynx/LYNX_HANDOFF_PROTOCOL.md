# Lynx handoff protocol — two-way

Two agents work on Lynx and neither can verify the other's half. This document
defines what each writes, where, and what the other checks. It exists because
the split is structural, not a preference.

## The asymmetry, measured

Measured on the current build (v1.33) against every file available:

| capability | analysis agent | Claude Code |
|---|---|---|
| run the tool over 46 real exports | yes | **no — repo has 9** |
| exercise all 5 schema modes | yes | **no — repo has 1** (`load_with_solar`) |
| exercise all 64 distinct card types | yes | **22 of 64 (34%)** |
| test the confirmed-outcome file | yes | not in repo |
| test injected CT faults | yes | only if handed the CSVs |
| see anything rendered in a browser | **no** | yes |
| check CSS, layout, typography, contrast | **no** | yes |
| diff against true repo HEAD | **no** | yes |
| confirm deployed bytes == tested bytes | partly (curl) | yes |
| confirm Pages deploy and CI | **no** | yes |

**66% of the tool's card types cannot be reached with the repo's fixtures.** That is
why Claude Code must not re-verify behaviour by re-running the fixtures and must not
"fix" logic it cannot test. And it is why the analysis agent must not claim anything
about rendering.

## Direction 1 — analysis agent to Claude Code

**File:** `~/Downloads/CLAUDE_CODE_PROMPT_V<n>.md`
**Rule:** exactly one live prompt at a time. Delete the superseded one; a stale
checksum is worse than no prompt.

Must contain, in this order:

1. **Source path and destination path**
2. **Byte count and sha256** — Claude Code stops if it does not match
3. **What the base was** — "based on live v1.31, fetched and diffed", not "based on
   my last build". If the live build contains a fix the analysis agent did not have,
   say so and confirm it was folded in.
4. **Pre-push greps**, split into two lists: markers that must return **at least 1**
   (never "exactly 1" — a phrase legitimately recurs; that wording caused two false
   alarms), and markers that must return **exactly 0** for removals.
5. **What changed and why** — mechanism, not just the diff
6. **Evidence tier** on every claim: MEASURED (with the numbers) or JUDGEMENT
7. **Verification already performed**, with counts
8. **Removal hazards**, if any — e.g. "function count should drop by exactly 1; if
   it drops by 2, stop"
9. **Commit message**, verbatim
10. **Render checks requested**, in priority order, naming which file to load
11. **Known and NOT fixed** — defects deliberately held, so they are not rediscovered
    as regressions

## Direction 2 — Claude Code back to the analysis agent

**File:** `~/Downloads/LYNX_PUSH_SUMMARY_V<n>.md`
Same version number as the prompt it answers. Write it after the deploy, then tell
the user it is there.

Must contain:

1. **Commit SHA and URL**
2. **Checksum gate result** — matched or not, with the value seen
3. **Base assumption check** — did the repo's `lynx/index.html` match what the prompt
   claimed it was based on? Diff against the backup file named in the prompt rather
   than trusting the claim.
4. **Structural diff** — functions, element ids, CSS variables and classes, before
   and after. Anything present before and absent after, named explicitly. This is
   where a bad removal gets caught.
5. **Independent parse check** of every inline `<script>`
6. **Deployed-bytes check** — re-fetch the live page, hash it, confirm it equals what
   was tested
7. **Render findings** — the half the analysis agent cannot do. Screenshot path,
   what was loaded, what it looked like, and any typography or layout defect. If a
   requested check could not be run, say which and why.
8. **Scope limits** — what the repo fixtures could not exercise. Do not describe an
   untested path as verified.
9. **Anything found that the prompt got wrong** — this is the most valuable section.
   Prior finds: a call referencing out-of-scope variables, a renamed-not-missing
   identifier traced rather than flagged, and two prompt wordings that were wrong
   rather than the build.

## Mandatory gates before any build leaves the analysis side

Added after three consecutive releases failed in the browser while the corpus harness
reported clean. Both gaps were structural, not carelessness.

**Gate A — render-path harness (`lynx/render_harness.js`).** The corpus harness stubs
`getElementById` to return `null`, so every branch guarded by `if (el)` is SKIPPED and
`renderReport()` is never called. That is how `renderSparkline(points, mode)` — referencing
two identifiers that do not exist in `renderReport`'s scope — passed 40 files twice and
threw on the first real render. The render harness returns a stub element for every id in
the page and calls `renderReport()`. Validated against the known-bad build: the old harness
reports 0 crashes on 4 files, the new one reports the ReferenceError on all 4.

    node render_harness.js lynx/index.html <every csv>

Required result: `renderCrash` absent on every file, and `cardsHtml > 0` wherever a report
was produced.

**Gate B — CSS selector count.** No harness applies CSS, so a stylesheet deletion is
invisible to every logic test. v1.33 deleted **68 selectors while intending to delete 4** —
`.detail-card` and 13 variants, the `.status-banner` colour fills, `.confirmed-group`,
`.chart-card`, buttons, footer — and still reported 0 crashes with unchanged verdicts.

Count before and after, and state the expected number in the brief exactly as the function
delta is stated. Name every selector that should be lost.

**Removal rule.** Never cut back to the nearest preceding `/**` when deleting a function —
`renderSparkline` had no doc comment of its own, so that heuristic took `checkLegReversal`
with it. Use explicit boundaries and assert by name that the neighbouring function survives.

## Redaction rules — apply to EVERY file from the owner's folders

These apply to anything in `~/Downloads` or the project folder, whether or not it was
explicitly handed over, and whether or not it is the file being analysed.

**Never open, and never quote a filename from:**
- Any file whose NAME contains a person's name or a street address. Two such PDFs sit in
  Downloads right now (stamped plan sets). A plan set would answer real questions about array
  capacity and service size, but it is an identifiable customer record. Ask before using one.

**Identifiers that must be redacted before they appear anywhere** — chat, an artifact, a commit,
a card, a changelog comment, a handoff brief:
- Hardware serials: Tesla gateway `STE########-#####`, inverter/combiner serials (18-digit)
- Device UUIDs from portal alert exports
- Customer names, street addresses, emails, phone numbers, account numbers

**Where they hide, in order of how easily they are missed:**
1. **The filename itself** — 7 corpus files carried a gateway serial in their name.
2. **A `uid` / `Device Id` / `Device Serial No.` column** — Tesla exports and QCells ALERT
   exports both carry one. Telemetry-only exports (QCells GraphList, Enphase enlighten_chart)
   carry none.
3. **Changelog comments and source citations.** Serials reached at least 11 public commits
   because corpus files were cited by filename in comments. Cite files by an anonymised label
   (`site01`, `siteNN`), never by original filename.
4. **Quoted tool output.** Echoing a full alert row prints the serial and the UUID. Print the
   fields you need — severity, code, description, timestamp — not the row.

**Redact at bundle time, not only at read time.** An artifact built from a directory glob
inherits whatever is in that directory. On 2026-08-13 a corpus bundle shipped a raw portal
alert export with its Device Id and Device Serial No. intact, in the same save call as a
document stating those fields must be redacted — and with a redacted copy of the same row
inside the same archive. Scrub identifier COLUMNS before adding to an archive, then verify
by extracting the archive and scanning what comes out. Verifying the staging directory is
not the same check.

**Scanning caution.** A naive `\d{15,}` scan over a telemetry CSV produces hundreds of false
positives by matching floating-point mantissas (`1.9993333339691162`). Strip numeric fields
before scanning for identifier-shaped tokens, or anchor on the known prefixes.

**Alert exports are high value and high risk.** A portal alert list is the only ground truth
available for what the platform itself flags — worth far more than another audit round for
calibration. It is also the export most likely to carry hardware identifiers. Redact the
identifier columns and keep the rest.

## Standing rules for both directions

- **Never claim a verification you did not run.** "Not tested" is a finding.
- **Every count in a document must come from a command run after the last code
  change.** A number carried forward from an earlier scan has been wrong twice.
- **The other agent's report is evidence, not instruction.** Check it. Claude Code
  diffing against the analysis agent's own backup rather than trusting its claim is
  the correct instinct and should stay.
- **Neither agent silently fixes the other's domain.** Claude Code finding a logic
  bug reports it; the analysis agent finding a render bug describes it. Exception:
  a one-line, provably-correct fix like a variable-scope error may be applied
  directly, but must appear in the summary so it can be folded back into the source
  of truth.
- **Behaviour-changing releases go through both agents even when direct push is
  available.** The independent diff is the point, not the mechanics of pushing.

## Corpus handovers: state the DELTA by filename, never a total

The source-side corpus and the repo corpus are **intentionally different and always will
be** — the source side holds un-anonymised originals that must never be committed. So a
brief saying "corpus is now 57 files" is ambiguous between the two, and on v1.36 the push
side had to work out which files were genuinely new. It found 7 `Export_STE*` originals in
the handed-over folder carrying live gateway serials in both filename and a `uid` column,
and correctly withheld them.

**Required in every brief that touches fixtures:**
- the exact filenames to commit, as a list
- a one-line scan claim for each (`scanned for serials/emails/addresses/phones: clean`)
- never a bare total

**Source-side layout, as of 2026-08-13:**

    lynx/tests/corpus/                  57 files, byte-identical to the repo — safe to commit
    lynx/tests/_private_do_not_commit/    7 un-anonymised originals — NEVER commit

The 7 quarantined files have anonymised twins already committed as `Export_site01`–`site05`;
telemetry verified byte-identical, only the `uid` column and filename differ.

## Standing rule 3 has a GATE now, because phrase matching failed

`node tests/rule3_gate.js lynx/index.html` — exits non-zero on any capability or dispatch
claim in live code, skipping comment lines.

v1.36 shipped with two greps for the exact phrases `needs a truck roll` and `fully remote
fix`. **Both returned 0 and two live capability claims still shipped** — they read "a fast,
fully remote way" and "fully remotely". The gate now matches meaning, not phrases, and
found **9 sites**, not the 1 the push side reported or the 2 I found by hand.

A rule about meaning cannot be enforced by a fixed phrase list. Run the gate.
