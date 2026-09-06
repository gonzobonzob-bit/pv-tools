# Enphase — install, troubleshooting, and testing research

Researched 2026-09-06 for Lynx (CT/metering fault detection). Facts below were pulled from
manufacturer PDFs, official pages, and (where noted) Wayback Machine archives of pages since
pulled from the live site — not search snippets.

**Availability:** Excellent — better than Tesla or QCells. Two dedicated technical briefs
(TEB-00053 CT Troubleshooting, TEB-00079 CT Health Check) describe almost exactly the automated
detection logic Lynx is trying to build, in plain language, with real numeric thresholds.

**One real access limitation, disclosed rather than papered over:** support.enphase.com runs on a
Salesforce Lightning SPA that serves an empty JS shell to every non-browser fetch tried (WebFetch,
raw curl, even the Wayback Machine's own crawler). Several genuinely-existing articles and
community threads are confirmed by title/URL but their content could only be recovered as
search-engine snippets, not full text — flagged inline below. Getting the actual Enlighten
alert/error-code vocabulary and Installer Toolkit app UI text would need a real authenticated
browser session or a technician's copy-paste, not another automated pass.

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

## Troubleshooting — beyond TEB-00053/00079

New sources (fetched and read in full, not snippets): [Best Practices for Using Enphase CTs in
Australia and New Zealand](https://enphase.com/en-au/download/consumption-current-transformer-best-practices)
(Sept 2021), [Installing Consumption CTs](https://enphase.com/sites/default/files/2021-05/Installing_Consumptions_CTs_Tech_Brief_EN_NA_1.pdf)
(Jan 2016, NA/LatAm), and three static (non-SPA) pages recovered via Wayback Machine from
Enphase's older www4.enphase.com support micro-site, plus one live blog post by an Enphase EMEA
Technical Support Manager.

**A power-factor-based heuristic not in the two known briefs.** The ANZ best-practices brief gives
concrete "healthy" PF ranges: production CT **0.7–1.0** normal; consumption/load CT **0.5–0.99**
normal when load ≥230W. PF can legitimately go very low or even **negative** (example given: -0.43)
during net-export — the consumption CT is "seeing a reverse current flow," which is *expected*, not
a fault. States the diagnostic rule verbatim: *"When solar is producing, if the PF is very low on
all phases, or on 2/3 phases, this is an indicator of mis-wired CTs across the phases... or crossed
phase connections."* **Lynx implication:** a PF-based check could distinguish "negative consumption
because the site is exporting" (expected) from "negative consumption because of a miswire" (fault) —
something the current negative-Load logic doesn't have access to (Enphase legs_only exports don't
carry voltage/current columns to compute PF from, so this would need a different export format to
use).

**The clearest physical explanation of cross-talk found anywhere in this research.** An Enphase
[blog post](https://enphase.com/en-gb/blog/professionals/helpful-tips-and-tricks-installing-cts)
gives a field test: on a 3-phase install, measure voltage between the Envoy's voltage-reference
terminal and the breaker for that same phase — ~0V confirms correct match, ~400V (line-to-line)
means the CT is clamped on a different phase than the Envoy's voltage reference for that channel,
producing cross-talk-like data. This is a voltage-reference/current-conductor phase mismatch at the
terminal block, not a "wrong CT" per se.

**A CT-configuration-vs-gateway mismatch that suppresses production, not just misreports it.** Per
Enphase's archived "Identify a production issue" page: a CT-configured phase count that doesn't
match the gateway's actual power feed can put the gateway into an error status and suppress
reported production for **every Nth microinverter** on a 3-phase system — a distinct, previously
undocumented (for this project) pattern signature. Separately, CT miswiring can trigger **grid-profile
export-limiting curtailment** that looks like a production anomaly unrelated to the inverter itself.

**A configuration-only fault that looks exactly like a CT fault.** A community-sourced symptom:
Enlighten shows consumption kWh identical to production kWh with exported energy always ~0. Root
cause: Consumption CT mode set to **"Load Only"** when it should be **"Load with Solar" (Net)** —
this is a **CT-mode misconfiguration**, not a wiring/orientation fault, and produces a specific,
directly-detectable signature: consumption trace ≈ production trace, export always ≈0.

**Panel-design quirks that produce false "miswired" signatures.** The 2016 install brief documents
that on many Eaton service panels/Solar Power Centers, line conductors are internally rotated across
the main breaker — a CT installation that looks wrong (spanning "both entrance conductors") may
actually require one CT above and one below the breaker specifically because of this rotation,
verified by measuring voltage across the main breaker. **Not a technician error** — a panel-brand
quirk Lynx's phrasing should leave room for before concluding "miswired."

**Remote polarity fix is firmware-gated.** The "Reverse Polarity" remote-flip feature (Installer
Portal → Devices → CT Summary → Reverse Polarity) requires **Gateway firmware 7.x or above**; on
older Envoy-S Metered (ANZ) hardware, CT polarity "cannot be remotely changed via software if
installed in reverse on site" — physical re-clamping is the only fix. Lynx's negative-PV/Load
recommendation text currently says "if a Reverse Polarity control is exposed at your access level" —
accurate, but doesn't mention firmware version as the reason it might not be.

**Meter dropout ≠ CT fault, on RGM-equipped sites.** "Meter Failed/Not Reporting" in Enlighten is a
**separate physical device** (the revenue-grade meter, RGM) losing its ZigBee/USB radio link to the
Envoy — a communications fault, fixed by reseating the ZigBee stick or power-cycling, not a CT
wiring issue. Enlighten maintains at least three distinct status categories technicians must not
conflate: Envoy-offline, RGM/meter-not-reporting, and CT-based metering faults (negative/zero
readings).

**Confirmed to exist, content not recoverable (SPA-blocked):** a literal "CT Meter alert" in
Enlighten/Installer Portal; a support article "How do I troubleshoot a Meter Issue system status?";
community threads distinguishing "production below system expectations" from "negative production
values" as two separately-triggered Enlighten error categories (exact numeric triggers unconfirmed).

## Testing / certification

No independent, publicly available accuracy-validation testing or certification of Enphase's
metering/CT hardware was found — **the same conclusion already reached for Tesla and QCells.**

- Self-declared accuracy (every figure traces back to Enphase's own datasheets, no independent lab
  cited): production/battery metering **±0.5%** (ANSI C12.20 class 0.5), consumption/backfeed/EV
  clamp CTs **±2.5%**, AC voltage measurement **±1%**.
- The actual UL Certificates of Compliance (read in full) — [IQ Combiner](https://enphase.com/download/iq-combiner-certificate-compliance-ul-1741-3rd-edition-and-csa-c222-no-107-1-01-3rd)
  (UL 1741 Ed.3 / CSA C22.2 No.107.1) and [IQ8-series microinverter](https://enphase.com/download/iq8-series-microinverter-ieee-15472018-certificate-compliance)
  (UL 1741 Ed.3 incl. SA/SB, IEEE 1547-2018/1547.1-2020) — certify electrical safety and
  grid-interconnection behavior (anti-islanding, ride-through, ramp rates, volt/var, power factor,
  frequency-watt). **Neither document mentions ANSI C12.20, metering accuracy, or CT calibration
  anywhere in its text.** A UL-Listed sticker is not evidence the CTs meet their claimed tolerance.
- One NREL report ([Hawaiian Electric Advanced Inverter Grid Support Function Testing](https://docs.nrel.gov/docs/fy17osti/67485.pdf))
  tested two Enphase inverter models, but for grid-support functions, not metering accuracy (full
  text unreachable this session — docs.nrel.gov didn't resolve; lower-confidence, worth re-checking).
- One genuine independent academic study exists ([Case Western Reserve SDLE, PLOS ONE 2015](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4493157/))
  but it's thermal-performance research on M215 microinverters, not metering accuracy.

## Gaps

None outstanding from the original research plan. Two soft leads noted above but not confirmed:
the NREL Hawaiian Electric report's full text (network-blocked this session) and whether Enphase
hardware appears on the CEC Go Solar California performance-meter equipment list (page unreachable
this session) — either could theoretically be the closest thing to independent validation if it
exists, but neither is confirmed.
