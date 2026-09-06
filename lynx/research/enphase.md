# Enphase — install research (troubleshooting/testing angles incomplete — see Gaps)

Researched 2026-09-06 for Lynx (CT/metering fault detection). Facts below were pulled from
manufacturer PDFs actually fetched and read, not search snippets.

**Availability:** Excellent — better than Tesla or QCells. Two dedicated technical briefs
(TEB-00053 CT Troubleshooting, TEB-00079 CT Health Check) describe almost exactly the automated
detection logic Lynx is trying to build, in plain language, with real numeric thresholds.

**Status: only the "install" angle completed.** The troubleshooting and public-testing research
tasks hit a session token limit before finishing. Re-run those two before treating Enphase coverage
as complete — see `README.md` for the exact gap.

## Sources

- [CT Troubleshooting — Technical Brief TEB-00053-1.0](https://enphase.com/en-gb/download/current-transformer-ct-troubleshooting-tech-brief) (Aug 2023)
- [CT Health Check — Technical Brief TEB-00079-3.0](https://enphase.com/download/current-transformer-health-check-tech-brief) (Aug 2024; rev history from 1.0 Oct 2023)
- [200A Production CTs Quick Install Guide](https://enphase.com/download/200-production-cts-quick-install-guide) (CT-200-SOLID, Rev 02 Jun 2023)
- [600A Consumption CTs Quick Install Guide](https://enphase.com/download/600-consumption-ct-quick-install-guide) (CT-600-SPLIT, Rev 04 Jun 2023)
- [IQ Gateway Metered Quick Install Guide](https://enphase.com/en-gb/download/iq-gateway-metered-quick-install-guide) (Rev 09 Jul 2024)
- [IQ Envoy Installation and Operation Manual](https://media-store.enphase.com/productattach/i/q/iq_envoy_-_installation_operation_manual.pdf) (141-00039 Rev 01, 2017 — still current per Enphase's own site)

## The universal polarity rule

Enphase uses **one printed arrow, system-wide** — no IEEE/ANSI K-L polarity-dot scheme like some
other vendors. The arrow always points **toward the electrical load**:
- Production CT: away from the solar array.
- Consumption CT: away from the utility grid/meter.

Manufacturer-named monitoring symptoms of a bad CT install (near-verbatim from TEB-00053): **"Missing
measurements, Negative consumption (during nighttime or when PV is switched off), Negative
production, Incorrect power factor."** Enphase's own words: *"Issues generally happen due to the
miswiring of CTs."*

## Enphase's own automated "Verify CT" logic — the strongest single find of this research pass

The Installer App/Portal's built-in CT Health Check (TEB-00079) runs essentially the exact algorithm
Lynx wants to replicate from exported data:

1. **Production CT reversed polarity** — all Production values negative.
2. **Production CT values become zero (< 10 W)** after PV is turned OFF.
3. **Consumption CT values are not zero** when PV is zero and a load is switched ON.
4. **Consumption CT values change when PV turns ON** for a "Load + Solar" (net) CT install, and **do
   not change** for a "Load Only" (gross) install.

**The 10 W threshold is Enphase's own noise floor** for "zero" vs. "genuinely reporting" — directly
reusable as a default constant.

It also names a **distinct, non-polarity fault class**: "CT configuration mismatch" — a Consumption
CT physically wired as one topology (Load Only vs. Load + Solar) but configured in software as the
other, or CTs "not installed but enabled on the Installer Portal." This is exactly the shape of
Lynx's per-leg cross-talk/mismatch detection target, and gives the correct manufacturer terminology
(**"Load Only"** = gross consumption, **"Load + Solar"** = net consumption) to use in card text.

## Terminal/phase architecture (for cross-wiring detection)

- Production CTs land on **P1/P2/P3** per phase; Consumption CTs on **C1/C2/C3**.
- White/blue wire polarity is fixed per terminal (documented per hardware model).
- **3-phase systems: each of the 3 Production and 3 Consumption channels can fault independently** —
  don't assume one sitewide polarity state.
- Enphase's own **live field diagnostic**: switch off all loads on a leg except one (or unclip one
  CT) — the corresponding monitored phase should drop to ~0. "If not, there is incorrect wiring."
  This is effectively a manual cross-talk test; an analogous signature in exported data would be a
  channel that never fully drops when its labeled leg's load/production should be absent.
- **Phase-identity mismatch is a documented, separate risk from wiring reversal:** *"L1 labelled
  phase may be different from L1 from the grid"* — confirmed via multimeter continuity check, not
  assumed from wire color.

## Software "Reverse Polarity" toggle — same gotcha as Tesla's "Flip"

Each CT's polarity can be flipped **in software**, per phase, via Installer Portal → Devices →
Consumption/Production Meter → Reverse Polarity. **Implication for Lynx:** a sign-flip visible in
exported data may reflect an already-applied correction, not a currently-wrong physical CT — look
for a clean step-change in sign convention on a specific date (a software correction event) as a
distinct signature from a gradual drift or an ongoing physical fault.

## Other documented fault-adjacent facts

- **Battery branch conductors must never route through the Production CT** — "This will distort
  production readings," stated identically in two separate manuals.
- **Bundling multiple conductors through one CT is allowed only if they're the same phase** — "It is
  easy to make a wiring error" bundling different phases, which would show phase-mixed current on
  one channel.
- **Accuracy classes:** Production CT (CT-200-SOLID) < 0.5% (revenue-grade, ANSI C12.20/UL 2808);
  Consumption CT (CT-600-SPLIT, IQ Gateway Commercial 2) < 2.5%.
- **Lead-resistance limit (IQ Envoy):** up to 3Ω round-trip / 1.5Ω per wire on Consumption CT
  extensions — a gradual under-reading root cause distinct from a binary wiring fault.

## Gaps

**Troubleshooting and public-testing research for Enphase did not complete** (session token limit
mid-run). Re-run those two research angles before treating Enphase as fully covered — in particular,
the troubleshooting angle should surface Enlighten/Installer-Toolkit-specific alert text and any
additional field-fault taxonomy beyond the two technical briefs above, and the testing angle should
look for independent UL/IEEE1547/NREL validation of Enphase's metering accuracy claims.
