# Bleed check — dispatcher reference

One page. What the flag means, what to do before dispatching, and when it is
not enough to act on.

---

## What the check measures

**k = how much reported usage rises per watt of production.**

A consumption CT clamped on the wrong conductor reads part of the solar output
as household usage. The customer's app then shows usage climbing with the sun.
The system itself is usually fine — production and real consumption are both
normal. What is wrong is where one sensor sits.

`k = 0.48` means: for every 100 W the array produces, reported usage rises 48 W.

---

## Reading the card

| severity | what it means | first move |
|---|---|---|
| **strong** | High slope, present on most days | Bill comparison, then dispatch |
| **moderate** | Clear slope, night baseline still intact | Bill comparison first |
| **intermittent** | Some days flagged, others not | Call the customer — likely a scheduled load |
| **clean** | No day crossed the line | No action |
| **insufficient data** | Could not evaluate | Pull a longer export |

**Intermittent is usually not a wiring fault.** Wiring does not come and go. A
pool pump, EV charger, or timed HVAC block produces the same daytime pattern on
some days and not others. Ask before dispatching.

---

## The remote check — do this before booking a truck

1. **Confirm CT configuration in the portal.** The consumption CT should be
   whole-home, load side of the main — not on a branch carrying PV backfeed.
   Free, remote, and it resolves a share of these outright.

2. **Compare against the utility bill.** This is the one that settles it.

   The card computes the kWh figure from that system's own production — read it
   off the card rather than assuming a typical value. Worked example: at
   k = 0.48 on a system producing 90 kWh/day, reported usage runs about
   43 kWh/day above true consumption, roughly 1,300 kWh over a billing month.
   A smaller array at the same slope gives a proportionally smaller gap.

   - **Bill confirms the gap** → CT placement. Dispatch is justified.
   - **Bill matches reported usage** → there is a real daytime load. No truck.

   Send the billed-vs-reported numbers with the tech so they arrive knowing the
   size of the error.

3. **Only then dispatch.** Re-clamping a CT needs hands on the panel.

---

## Getting a trustworthy reading

**Pull multiple days.** This is the single biggest improvement available, and
it costs nothing.

One day gives a weather-dependent answer. On a confirmed-faulty system, the
older correlation check flagged 4 days out of 7 and missed the other 3 — which
day the tech happened to export decided the verdict.

The slope is far steadier: two exports from one system ten days apart differed
by 2.2% in k while cloudiness differed 60%.

**If your platform will not export 7 days at 15-minute resolution, take the
7-day hourly pull instead.** Tested against known outcomes, the slope still
separates healthy from faulty at hourly and even 2-hourly sampling. Span beats
resolution for this check.

What you give up with a two-column export: no grid, voltage, or frequency
channels, so those checks will be absent from the report. That is a real trade,
just not one that affects this flag.

---

## When the flag is a lead, not a verdict

Say this plainly to anyone who asks.

- The threshold rests on **4 systems, 16 days** — 2 healthy, 2 confirmed
  faulty. Days within one system are not independent, so the effective sample
  is closer to 4 than 16.
- Healthy systems topped out at k = 0.21; confirmed faults started at 0.30. The
  flag sits at 0.25, in a gap **0.09 wide**.
- **A genuinely solar-timed load can produce a real slope in that range.** A
  pool pump on a midday timer is not a wiring fault, and the telemetry alone
  cannot tell them apart.

This is why the bill comparison is in the workflow rather than optional. The
flag tells you where to look. The bill tells you whether to drive.

---

## Feeding the loop

Every confirmed outcome makes the threshold better. When a job closes, note:

- the export used, and its date range
- the k the tool reported
- **what was actually found** — bleeding CT, legitimate load, something else

A handful of confirmed cases on real fleet sites would do more for this check
than any further work on the code. Two labelled outcomes are worth more than
another month of tuning against the bundled examples.
