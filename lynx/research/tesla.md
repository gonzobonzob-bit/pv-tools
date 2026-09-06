# Tesla — install, troubleshooting, and testing research

Researched 2026-09-06 for Lynx (CT/metering fault detection). All facts below were pulled from
manufacturer documents actually fetched and read, not search snippets — see source URLs.

**Availability:** Excellent. Tesla's public Energy Library (energylibrary.tesla.com) has a
dedicated "Meter and CT Issues" troubleshooting section that names and diagnoses almost exactly
the fault classes Lynx targets. No independent (UL/IEEE1547/NREL) metering-*accuracy* test report
was found — NRTL certificates cover safety/interconnection (UL 1741, IEEE 1547.1), not CT accuracy.

## Sources

- [CT Orientation](https://energylibrary.tesla.com/docs/Public/EnergyStorage/Powerwall/2/InstallManual/BackupGateway/2/en-us/GUID-17BF65F9-4AB7-47BA-A778-1D1696CB2B0C.html) — Backup Gateway 2 install manual
- [Meter and CT Issues](https://energylibrary.tesla.com/docs/Public/EnergyStorage/Powerwall/3/DeviceSetupGuide/en-us/GUID-84207263-55D5-4989-968C-54E4EE1FC748.html) — Powerwall 3 Device Setup Guide index (10 named fault articles)
- [Negative Site Reading](https://energylibrary.tesla.com/docs/Public/EnergyStorage/Powerwall/3/DeviceSetupGuide/en-us/GUID-3CA14123-F98A-4DD2-8C11-7120EA9106D1.html)
- [Power Factor (PF) Not Close to 1](https://energylibrary.tesla.com/docs/Public/EnergyStorage/Powerwall/3/DeviceSetupGuide/en-us/GUID-3436468C-A253-49AE-94EE-A0287958EC8E.html)
- [Current Transformer on Incorrect Phase](https://energylibrary.tesla.com/docs/Public/EnergyStorage/Powerwall/3/DeviceSetupGuide/en-us/GUID-18D73662-75BC-49E5-B28E-A208629DDC63.html)
- [Incorrect Orientation of the Current Transformer](https://energylibrary.tesla.com/docs/Public/EnergyStorage/Powerwall/3/DeviceSetupGuide/en-us/GUID-AC287CAD-814E-4550-BDA3-3160329C699F.html)
- [Incorrect Current Transformer Location](https://energylibrary.tesla.com/docs/Public/EnergyStorage/Powerwall/3/DeviceSetupGuide/en-us/GUID-7CCF2334-18BF-434B-9EF3-776EB4794EC1.html)
- [Incorrect Current Transformer (CT) Assignment](https://energylibrary.tesla.com/docs/Public/EnergyStorage/Powerwall/3/DeviceSetupGuide/en-us/GUID-39D665A6-2A62-4CB2-B76B-AE735176395E.html)
- [Inconsistent Load and Solar Readings](https://energylibrary.tesla.com/docs/Public/EnergyStorage/Powerwall/3/DeviceSetupGuide/en-us/GUID-41B56E73-94A4-4648-86AD-6B5330F4F465.html)
- [Gateway CTs and Neurio CTs are Overlapping](https://energylibrary.tesla.com/docs/Public/EnergyStorage/Powerwall/2/TroubleshootingManual/SetupAndInstall/en-us/GUID-F8EB8D15-16B7-4480-975A-1DE87520B331.html)
- [General CT Installation Notes](https://energylibrary.tesla.com/docs/Public/EnergyStorage/Powerwall/General/MeteringGuide/en-us/GUID-74C3A0F2-F8A1-445B-A65D-C5535F1E05AE.html)
- [Metering Examples](https://energylibrary.tesla.com/docs/Public/EnergyStorage/Powerwall/General/MeteringGuide/en-us/GUID-A89F835E-8195-4F72-B496-BE3F2839D5D6.html)
- [Metering Overview](https://energylibrary.tesla.com/docs/Public/EnergyStorage/Powerwall/General/MeteringGuide/en-us/GUID-D75BCB8D-95AD-4870-B466-351137360E49.html)
- [Install the Tesla Remote Meter and CTs](https://energylibrary.tesla.com/docs/Public/EnergyStorage/Powerwall/General/MeteringGuide/en-us/GUID-B07CDE1F-E204-4378-A76C-B4424698D9B8.html)
- [Tesla Remote Meter Specifications (Datasheet PDF)](https://energylibrary.tesla.com/docs/Public/EnergyStorage/Powerwall/General/Datasheet/TeslaRemoteMeter/en-gb/TRM-Datasheet-EN.pdf)
- [TÜV Rheinland Conformity Letter — UL 1741 PCS](https://energylibrary.tesla.com/docs/Public/More/ProductCertificationInformation/ConformityLetter-UL1741PCS-ImportExportPanelLimits-PW3-MSA-GW2-GW3.pdf) (Report US23U76C.004, rev. 08/22/2024)
- [Intertek ATM — Report 104514208CRT-001](https://energylibrary.tesla.com/docs/Public/More/ProductCertificationInformation/104514208CRT-001.pdf) (UL 1741:2021 Ed.3 SA/SB, IEEE 1547:2018/1547.1:2020, UL 9540, UL 1973, UL 1699B)

## CT orientation & polarity — the ground truth

- CTs carry a **"SOURCE THIS SIDE"** label that must face the power source: toward the grid/service
  entrance for **Site** CTs, toward the inverter for **Solar** CTs, away from the loads for **Load** CTs.
- **"A CT will show negative current if installed backwards."** — stated verbatim in the Powerwall 3 /
  Backup Gateway 2 install manual.
- **Sign-convention rules Tesla states directly:**
  - Solar should **never** read negative under normal operation — negative Solar prevents Powerwall
    from charging ("the system requires positive solar and negative site readings").
  - If Solar and Site are **both positive simultaneously**, that signals a **wrong-phase CT**, not a
    reversed one.
  - Site reading negative is *normal* during genuine export (PV > Load) — don't flag that alone.
- **Canonical symptom Tesla itself names for cross-talk/reversed CT:** *"the site import increases
  as solar production increases, rather than decreasing."*
- Tesla's own 3-cause troubleshooting taxonomy for "Inconsistent Load and Solar Readings":
  1. **Metering Overlap** — same conductor monitored by two CTs (their name for cross-talk/double-counting)
  2. **Incorrect CT Orientation** — label not facing source
  3. **Wrong Phase Assignment** — CT clamped on the wrong line

## Software "Flip" — a load-bearing gotcha for Lynx

Tesla has an explicit **software polarity-inversion toggle** ("Flip"), separate from physical CT
orientation, on Backup Gateway 2 (Meter Y config) and the Neurio Remote Energy Meter: *"If any of
the CT readings are inverted and it has been confirmed that they are oriented correctly, select the
Flip check box to correct the reading."*

**Why this matters for Lynx:** a Tesla export's sign convention per channel is not fixed hardware —
it can be silently toggled by an installer. A polarity fault Lynx detects could be either (a) a
physically reversed CT, or (b) a Flip setting left in the wrong state after a correct physical
re-clamp, or (c) a Flip applied to a CT that was never actually backwards. Recommendation text
should mention checking the Flip setting in Device Setup → Meter, not just physical orientation.

## CT-to-phase wiring maps (for cross-phase-assignment detection)

| Hardware | CT1 | CT2 | CT3 | CT4 |
|---|---|---|---|---|
| Backup Gateway 2 + Tesla 100A CTs | L1 | L2 | L1 (configurable → L2) | — |
| Tesla Remote Meter / Neurio | L1 | L2 | L2 | L1 or N/A |

A **low power factor (e.g. ~0.5)** on a 3-phase system is Tesla's own documented secondary signal
for a CT on the wrong phase relative to its voltage reference — a manufacturer-sanctioned check
Lynx doesn't currently have an equivalent for.

## Other documented fault classes

- **Metering overlap / cross-talk, real example:** Tesla's own case — a CT found capturing "(2)
  solar inverter conductors and (1) hot tub conductor," leaving a third solar conductor uncaptured.
- **1CTx2 modifier:** a single CT's reading can be doubled in software to represent total
  split-phase solar output — a misconfigured 1CTx2 channel reads exactly half or double expected.
- **No double-monitoring invariant:** "No load should be double-monitored" — any conductor should
  appear on exactly one metering channel.
- **CT amperage/type mismatch:** wrong CT type set in software (vs. physically installed) is a
  separate, non-polarity fault class causing scaled-not-inverted misreads.
- **Max per-channel current ceilings** (plausibility check): 200A/1000A single CT, 400A/1100A
  paralleled 200A/800A CTs — a reading above these is implausible on its face.
- **Communications dropout vs. wiring fault** are Tesla's own separate categories: "Unable to Read
  Data" (comms/firmware, power-cycle the meter) vs. "Failed to Configure Meter" (pairing failure) —
  distinct from the orientation/phase/location/assignment wiring-fault family.

## Sign convention (Powerhub telemetry) — load-bearing for anything that synthesizes or validates Tesla data

Confirmed 2026-09-06 against Tesla's own ["Sign Convention"](https://energylibrary.tesla.com/docs/Public/More/Powerhub/Residential/UserManual/en-us/GUID-57552F94-94B7-43FC-BC73-0F585A127126.html)
page (Powerhub Residential User Manual), independently corroborated by third-party API
documentation (vloschiavo/powerwall2 local-gateway docs):

- **Solar:** positive = generation. Never negative under normal operation (see negative-PV above).
- **Battery:** positive = **discharge**, negative = **charge**.
- **Site/Grid:** positive = **net site consumption** (importing from the grid), negative = **net
  site export**.
- **Load:** positive = consumption.

**The energy-balance identity in this convention is `Load = Solar + Site + Battery`** — every term
contributes positively to Load when it is itself positive (solar feeds it, a grid import feeds it,
a battery discharge feeds it). Rearranged, **`Site = Load − Solar − Battery`**.

This bit a synthetic-data generator once already: an earlier version of Lynx's built-in Tesla
"healthy" example computed `Site = Load − Solar − (−Battery)`, i.e. `Load − Solar + Battery` — the
battery term flipped sign. Load then came out as `Solar + Site + Battery = Load ± 2×Battery`,
silently distorting the "healthy reference" file by up to several hundred watts during any
charge/discharge period. Caught by inspection, not by any automated check, because `checkBalance()`
(the Grid=Load−PV reconciliation check) is gated to `mode === 'load_with_solar'` only and never runs
on `tesla_derived` — so a sign error here has no other safety net. Fixed in `tools/make_examples.js`;
anyone hand-building or spot-checking Tesla-shaped data should derive `Site` from `Load`, `Solar`,
and `Battery` this way, not the other way around.

**A second, related bug found by charting the fixed data and comparing it to a real export**
(2026-09-06, read directly for this check, never committed or quoted — see the redaction rules
above): an arbitrary `discharge × 0.4` cap on the battery meant the synthetic "healthy" file showed
Site importing a small but constant, growing share of every evening's load *while the battery still
had charge to give* — a pattern that doesn't happen on a real system, which drains the battery fully
before touching the grid. Real-data measurement: battery power swings **-4766 to +5820 W** (full
continuous charge/discharge rate); of real intervals with the battery discharging >200 W, only 16%
coincide with >100 W of simultaneous grid import, and only when the load spike is large enough that
even a hard-working battery (260-1822 W) can't keep up (852-4414 W import) — not a fixed per-sample
ratio. Fixed by removing the arbitrary cap, using a real-data-matched 5000 W continuous rate, and
adding an actual state-of-charge model (13.5 kWh capacity, 5% reserve floor) so the battery has
memory across the file instead of resetting every sample.

## Accuracy classes (for tolerance-band reasoning)

- Tesla Remote Meter: **0.5%** accuracy, ANSI C12.1, IEC 62052-11 / 62053-21.
- Backup Gateway 2 internal AC meter: **±0.2%** (revenue-accurate).
- Backup Gateway 3 internal AC meter: **±0.5%**.
- NRTL conformity letters confirm CT detection/location is itself a **certified PCS function** —
  Tesla's own platform actively tries to detect a misplaced CT as part of import/export limiting.

## Gaps

No independent NREL/university/lab metering-*accuracy* validation study for Tesla's CTs was found —
only NRTL safety/interconnection certification (UL 1741, IEEE 1547.1) and the manufacturer's own
stated accuracy classes.
