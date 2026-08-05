# site_review fixtures

Real field exports from one site, spanning its full known failure lifecycle:
first onset (Jul 20) through 4 unresolved follow-up days (Jul 21-24). The
only real examples in the project of the masked-telemetry-dropout failure
class that `checkMaskedTelemetryDropout()` (v1.9, extended v1.10) detects —
kept as a permanent regression fixture rather than a one-off test.

Expected `runDiagnostic()` output as of v1.10:

| file | date | status | notes |
|---|---|---|---|
| `GraphList_20260723085415.csv` | Jul 20 | TROUBLESHOOT | 3 issues: negative-PV, Grid/Load-PV mismatch, **[MASKED DROPOUT]** — Grid Voltage L1/L2, Grid Current L1/L2, Grid Frequency go blank at 15:15 and never recover; Load Consumed cumulative register resets 17038→0 at the same timestamp |
| `GraphList_20260723085420.csv` | Jul 19 | GOOD | no issues |
| `GraphList_20260723085425.csv` | Jul 18 | GOOD | no issues |
| `GraphList_20260723085511.csv` | Jun 20 | GOOD | no issues (1 inconclusive check — quiet data window) |
| `GraphList_20260723085519.csv` | Jun 21 | TROUBLESHOOT | 1 issue: existing cross-talk correlation check (unrelated to masked dropout) |
| `GraphList_20260724235719.csv` | Jul 21 | TROUBLESHOOT | Grid/Load-PV mismatch (52/95 pts) + **[NO RAW TELEMETRY]** — all 5 telemetry columns blank for 100% of the file, same fault as Jul 20 continuing, still unresolved |
| `GraphList_20260724235715.csv` | Jul 22 | TROUBLESHOOT | Grid/Load-PV mismatch (52/96) + Load flatline 9.0h + **[NO RAW TELEMETRY]** |
| `GraphList_20260724235709.csv` | Jul 23 | TROUBLESHOOT | Grid/Load-PV mismatch (48/96) + Load flatline 9.0h + **[NO RAW TELEMETRY]** |
| `GraphList_20260724235700.csv` | Jul 24 | TROUBLESHOOT | Grid/Load-PV mismatch (43/96) + Load flatline 5.3h + **[NO RAW TELEMETRY]** |

A 10th file, `GraphList_20260724235724.csv`, is a byte-identical duplicate of
`...085415.csv` (confirmed via md5) — not included here, since a fixture set
doesn't need its own exact duplicate.

Any change to this table on a future engine version is a regression signal,
not an expected update — re-verify against the raw CSVs before accepting it.

### Table is stale as of v1.20 — three GOOD rows now read TROUBLESHOOT

Re-ran on 2026-08-05 against v1.20. Jul 19 (`...085420`), Jul 18 (`...085425`)
and Jun 20 (`...085511`) each now carry one issue: the PV-into-load bleed check
(`checkPvBleed()`, added v1.14, after this table was written for v1.10).
Measured daylight slopes are k = 0.357, 0.397 and 0.324 — above the 0.25 flag
threshold, below the 0.45 strong bar.

**This is not a regression.** v1.18 and v1.20 produce identical output on these
three files; the table simply predates the check. All other rows still match.

Whether those three flags are correct is genuinely open. k = 0.32–0.40 is the
check's known-fragile zone, where a mild CT bleed and a real solar-correlated
household load (pool pump, timed EV charging, AC ramping with the sun) are not
separable from telemetry alone. This is the same site as the masked-dropout
lifecycle above, so a marginal CT is plausible — but there is no confirmed
ticket outcome to settle it, and it should not be recorded as either a true or
false positive until there is.

Do not "fix" the table by relaxing the bleed threshold to make these read GOOD.
The threshold rests on a separate labelled set; changing it to satisfy three
unlabelled days would be fitting to unknown truth.

## Known limitations of the current check (documented in code, not fixed)

See the comment block directly above `checkMaskedTelemetryDropout()` in
index.html. As of v1.10: a dropout that recovers before end-of-file is
invisible; a sensor frozen at a constant non-null value is invisible to this
check and to `checkFlatline()`; and a single telemetry column that's 100%
blank while a sibling column has real data throughout is still invisible
(the sticky-dropout scan only iterates columns with at least one real value,
and the `[NO RAW TELEMETRY]` branch only fires when *every* telemetry column
is empty). None of the 10 files above exercise these cases — they're tracked
as fast-follows, not covered by this fixture set yet.
