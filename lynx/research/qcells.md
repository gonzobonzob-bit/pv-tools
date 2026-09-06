# QCells / Hanwha Qcells — install, troubleshooting, and testing research

Researched 2026-09-06 for Lynx (CT/metering fault detection). All facts below were pulled from
manufacturer PDFs actually fetched and read, not search snippets.

**Availability:** Genuinely detailed, but fragmented across three separate PDFs (Q.HOME CORE
manual, Q.HOME COMBINER manual, an "AC Module Installer FAQs" support doc) rather than centralized,
and none of it is easy to find via the top-level us.qcells.com support search — had to go to the
media.qcells.com CDN directly. No independent (UL/IEEE1547/NREL/CEC) metering-accuracy test report
was found; all accuracy figures are manufacturer self-declared.

## Sources

- [Q.HOME CORE H4/A4/H5/A5 Installation Manual](https://media.qcells.com/v/FUtweOFQ/) (Q.VOLT H inverter, Q.SAVE battery, Q.HOME HUB 200SX)
- [Q.HOME CORE Technical Documents](https://us.qcells.com/qhome-core/technical-documents/)
- [Q.HOME COMBINER 80 G1 Installation Manual](https://media.qcells.com/v/J5bKzFB8/) (mirror: [ManualsLib](https://www.manualslib.com/manual/3651944/Qcells-Q-Home-Combiner.html))
- [Qcells AC Module Installer FAQs](https://media.qcells.com/v/ytVF01iv/) (Qcells_Technical Document_AC Installer FAQs_202605_Rev01)
- [Q.OMMAND product page](https://us.qcells.com/qommand/)
- [QHOME Monitoring Web User Guide for End-users](https://www.portal-q-cells.us/guide/QHOME_Web_User_Guide_V2.0.9_Enduser_EN_2023.02.03.pdf) (V2.0.9, 2023)
- [Qcells CT-JS-CLAMP-200A-5.2M product listing](https://www.platt.com/p/2214234/qcells/slim-clamp-type-consumption-ct/qclctjsclamp200a52) (Platt Electric — third-party accuracy corroboration)

## Architecture note — model-line-specific CT topology

- **Q.HOME CORE H4/H5 (hybrid, no AC coupling): no CT at all.**
- **Q.HOME CORE A4/A5 (AC-coupled): exactly one external production CT**, between the AC-coupled PV
  inverter and grid — not three independent Grid/PV/Load CTs.
- **Grid-side metering on Q.HOME CORE is not a clamp CT** — it's a dedicated RS-485/ModBus digital
  meter (Carlo Gavazzi EM24 or EM112). A "Grid" channel anomaly on this model line is far more likely
  a ModBus address/baud/comm config fault than a CT polarity fault.
- **Q.HOME COMBINER** (AC-module retrofit, same Q.OMMAND platform) is the one with the full
  Production + 2× Consumption CT topology Lynx's `load_with_solar` schema models.

**Lynx implication:** a "missing channel" on a Q.HOME CORE H4/H5 export is not a dropout — it's the
expected shape for that model. Any QCells-specific messaging Lynx adds should be aware which
product line it's talking about rather than assuming one universal topology.

## CT orientation — role-specific, not universal

Unlike Enphase's single "arrow toward load" rule, QCells' arrow convention **depends on CT role**:

- **Production CT** (Q.HOME CORE): arrow points **toward the grid**.
- **Consumption CTs** (Q.HOME COMBINER, C1/C2): arrow points **toward the load, away from the grid**.

A detection rule that assumes one universal orientation convention will get QCells backwards on one
of the two roles.

## Manufacturer fault codes — direct hits for Lynx's negative-PV and out-of-range checks

- **E21/E22/A002 — "Negative Production Power Value":** *"Production/External Production metering
  value is negative."* Recommended checks: L1/L2/N connection, CT cable direction matches the arrow,
  all L1 cables pass through the Production CT, **L2 cables do NOT** pass through it.
- **E06/A006 — "RGM Meter Error":** *"Production metering AC voltage or current value is either too
  low or too high."* Same recommended checks — QCells' own diagnostic order treats implausible
  voltage/current as a wiring issue *before* assuming hardware failure.

## Installer FAQ Q15 — "Why are the consumption numbers negative?" (near-verbatim usable copy)

> Check the direction of the Consumption CTs. The arrows on the CTs should point towards the load,
> and away from the grid. If reversing the direction of the CTs does not fix the issue, then check
> the CT phases. Ensure that CT monitoring L1 (matching the Gateway's L1 terminal) is plugged into
> the CT1 port, and the CT monitoring L2 (matching the Gateway's L2 terminal) is plugged into the
> CT2 port. **Consumption numbers can also be negative if there is another generation source** like
> another solar system, or a generator.

QCells' own escalation order: (1) polarity/arrow direction → (2) CT1/CT2↔L1/L2 port swap → (3) rule
out a legitimate second generation source before calling it a fault. Lynx's negative-Load messaging
doesn't currently mention the "second generation source" alternate explanation — worth adding.

## Documented intentional exceptions — don't false-positive on these

- **Q.HOME COMBINER PV2 input is deliberately reversed:** "the input phasing on the PV2 input is
  reversed from the other PV inputs... For the PV2 input only, L2 (red wire) is on top and L1 (black
  wire) is on bottom," called out with a warning sticker on the hardware itself.
- **Two valid CT placement topologies** (grid-side vs. load-side consumption metering) exist and
  both are "normal" — they produce different but both-correct Grid/Load relationships. "PCS features
  cannot be used with load-side consumption monitoring."
- **Parallel CT summing is legitimate:** if one CT pair can't clamp all load conductors, a second
  pair can be added in parallel and the gateway sums them — not a duplicate-reading fault.

## No automated CT health check exists in Q.OMMAND (as of the FAQ's 2026-05 revision)

Unlike Enphase (see `enphase.md`), QCells' installer FAQ describes **no in-app automated CT
diagnostic wizard** — every CT fault is resolved manually via the arrow-direction/port-assignment
checklist above, checked with a multimeter or visual inspection. This is a real gap in QCells'
tooling that Lynx already fills.

## Accuracy classes

- External/add-on Production CT (CT-HQ-SOLID-200A-2m): **±0.5%**, "revenue grade" — must never be
  trimmed/extended or "revenue grade certification" is voided.
- Standard split-core Production CT pair: **±2.0%**.
- Consumption CTs (CT-JS-CLAMP-200A): **±0.5%** (confirmed independently by a Platt Electric listing).
- Compliance marks: UL1741, **ANSI C12.20-2015 0.5 Accuracy Class** (not C84.1 — that's voltage
  range, a different standard QCells' own manual doesn't cite), IEEE 2030.5/CSIP, FCC Part 15.B.
- Consumption CT leads: extendable to 100m without losing function (beyond that, Zero Export
  accuracy "cannot be guaranteed"). Production CT leads: **must never be extended/trimmed at all.**

## Gaps

No independent UL certificate, IEEE 1547.1 test report, or NREL/CEC/university lab study
specifically validating Q.HOME/Q.OMMAND CT or metering accuracy was located.
