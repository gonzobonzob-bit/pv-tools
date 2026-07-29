# PW3 String Analyzer

A single-file field diagnostic for Tesla Powerwall 3 MPPT configuration.

A tech reads the six DC voltage/current pairs off **Tesla One → Solar DC Inputs**, types
them in, and the tool flags overcurrent, overvoltage, missing jumpers, dead strings, and
imbalance — and tells you what it *can't* determine from readings alone.

No build step, no dependencies, no network calls. Open `index.html` in any browser,
including on a phone at the job site.

---

## Why v4 exists

v3.1 had five defects that made it unsafe to trust in the field. All are fixed:

| # | v3.1 behavior | v4 behavior |
|---|---|---|
| 1 | Rejected any install with **both MPPT 3 and 4 powered** as "IMPOSSIBLE — factory-closed," blanking the entire analysis | 3 and 4 are independent MPPTs; both producing is normal. They simply can't be *jumpered*. |
| 2 | **Silent crash** (uncaught `TypeError`) on any single-input reading between 15–30 A — the exact fault the tool exists to catch. Button appeared dead. | Fixed, plus a `try/catch` backstop that surfaces any internal error |
| 3 | Asserted **"Jumper: IN"** for two matched independent strings — a guess presented as fact, rendered in green | Jumper state reported as `Required` / `OUT` / `Unknown` / `Not required`, and only asserted where physics allows |
| 4 | Compared live readings against **ISC** (15/30 A), passing 14.9 A as healthy despite Tesla requiring a jumper above 13 A Imp | Live readings compared against **Imp**; ISC retained as the hard ceiling |
| 5 | Overall status assigned by **sequential overwrite** — a red Set B finding silently downgraded to yellow by a later Set C finding | Severity accumulator; highest wins |

Also fixed: `150 V` MPPT minimum was fabricated (Tesla specifies **60 V**); overvoltage
checks were skipped at zero current, hiding the one condition where overvoltage actually
occurs; `MPPT 1 only` was hardcoded so MPPT 5 displayed as MPPT 1; blank fields were
indistinguishable from a genuine 0 A reading; a blank form reported "Healthy"; the 2 V
match tolerance was ~0.5% and flagged legal installs as faults; `Clear` left stale results
on screen.

---

## Hardware variants

Tesla ships **two PW3 variants** with different PV input current ratings. v3.1 hardcoded
the 13 A numbers. v4 has a selector at the top — **set it before analyzing.**

| | Single input | Jumpered pair |
|---|---|---|
| **13 A unit** (most units) | 13 A Imp / 15 A ISC | 26 A Imp / 30 A ISC |
| **15 A unit** (P/N `1707000-11-L` / `-21-L` and higher) | 15 A Imp / 19 A ISC | 30 A Imp / 38 A ISC |

Voltage is identical across variants: **60–480 V** MPPT tracking range, **550 V**
absolute input maximum, 600 V withstand.

---

## How a jumper actually reads (field-confirmed)

This is the single most important behavior the tool is built around, confirmed against
live units:

> **A working jumper shows matched voltage on both inputs with the current SPLIT
> across the pair.** The string arrives as series DC and the jumper parallels it onto
> two inputs, so both MPPT stages share the load.

Worked example — one string, 250 V, 16 A total:

| | MPPT 5 | MPPT 6 | Reading means |
|---|---|---|---|
| Jumper working | 250 V / 8 A | 250 V / 8 A | Load shared across both stages — normal |
| Jumper missing or faulty | 250 V / 16 A | 250 V / 0 A | **MPPT 5 carrying the whole string alone — overloaded** |

That second row is a hard fault, and the tool now reports it as one. Current on a single
input above the single-input Imp *cannot* be a working jumper — a working jumper would
have split it. v3.1 called this "Likely IN" and shrugged; v4 calls it
`Jumper: OUT or faulty` and escalates to red.

## What the tool can and cannot tell you

**Can determine from readings:**

- One input above single-input Imp with its partner at zero → jumper **missing or faulty**,
  input overloaded
- Different voltages across a pair → jumper **definitively not installed** (a jumper ties
  both terminals to one node and cannot sustain a voltage difference)
- Combined current above the single-input Imp → a jumper is *required*
- Combined current above the jumpered Imp → overloaded *even with* the jumper in
- Voltage above 550 V → equipment damage risk, regardless of current
- Voc present with zero current → string is live but nothing is drawing from it

**Cannot determine — and v4 says so instead of guessing:**

> A working jumpered pair and two well-matched independent strings produce **identical**
> V/A readings: matched voltage, split current. There is no way to distinguish them from
> the Solar DC Inputs screen.

Where the tool says `Jumper: Required` with matched voltages, it is telling you the
current *demands* a jumper and the readings are *consistent* with one — not that it
sees one. **Verify visually before changing wiring.** v3.1 asserted `IN` in green here,
which is how a missing jumper gets signed off as healthy.

---

## Jumper rules (Tesla)

- Valid jumper pairs: **1↔2 and 5↔6 only**
- **MPPT 3 and 4 cannot be jumpered** — they are closed from the factory. Do not remove
  the factory-installed components closing these inputs. Both inputs can still carry
  their own independent string.
- A jumper is required when the current landing on **one terminal pair** exceeds the
  single-input Imp. You parallel strings *upstream*; the jumper's only job is to raise
  the current rating of that one terminal pair by tying a second MPPT's power stage
  in parallel.
- Two jumper part numbers exist, keyed to the Powerwall P/N. Only install the ones
  shipped with that unit.

See [`SPECS.md`](SPECS.md) for every figure with its Tesla source URL.

---

## Testing

```bash
node test.js
```

Extracts the `<script>` block from `index.html`, evaluates it headlessly, and runs a
20-case scenario matrix plus an 8,100-combination fuzz sweep asserting no input can
throw. Current status: **24/24 passing, 0 crashes.**

The matrix covers every regression above, both hardware variants, the field-confirmed
jumper cases, and the boundary cases — night vs. dead array, blank form, knife-edge
current ratios, severity ordering.

---

## Files

```
index.html   the tool - open directly, no build
test.js      headless test harness (Node, no deps)
SPECS.md     Tesla specs with source URLs and confidence notes
robots.txt   crawler exclusion (see note below)
```

---

## Search indexing

Same posture as Lynx and Magpie: public repo, GitHub Pages on, page kept out of search
results by the crawler directives in `index.html`.

- `<meta name="robots" content="noindex, nofollow, noarchive, nosnippet, noimageindex">`
  plus explicit `googlebot` / `bingbot` directives
- `<meta name="referrer" content="no-referrer">` so the URL isn't leaked in referer
  headers if the page ever links out
- `robots.txt` with named AI/dataset crawler blocks

Two limits worth knowing:

1. **This is not access control.** The Pages URL is unlisted, not secret — anyone
   holding it can open the page. Don't put customer names, addresses, or site data
   into the tool.
2. **`robots.txt` is inert on a project Pages site.** Crawlers only read robots.txt from
   a domain root (`gonzobonzob-bit.github.io/robots.txt`), never from
   `gonzobonzob-bit.github.io/pw3-string-analyzer/`. The meta tags are what actually do
   the work here; the file is kept for the case where this ever moves to a user site or
   custom domain.

The repository page itself is indexable on github.com, as with the other tools —
GitHub controls those headers and there's no opt-out short of going private, which
would cost Pages on a free plan. Contents are Tesla published specs and arithmetic,
nothing sensitive.

## Getting it on your phone

Open the Pages URL and use **Add to Home Screen** — it launches like an app.

The file is also fully self-contained with no network calls, so a saved local copy
works offline. Worth doing for job sites with no signal.

---

## Limitations

- Advisory only. Does not replace visual inspection or the planset.
- No irradiance or time-of-day input — it cannot distinguish night from a dead array,
  so it reports "No production — cannot assess" rather than guessing.
- Single-reading snapshot; no trending or history.
- Assumes readings are transcribed correctly. Garbage in, confident garbage out.
