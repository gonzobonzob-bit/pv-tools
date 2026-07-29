# Tesla Powerwall 3 — PV Input Specs

Every figure the analyzer relies on, with its source. Verified 2026-07-29 against
Tesla's installer documentation portal (`energylibrary.tesla.com`).

**Powerwall 3 base unit only.** Powerwall 3 Expansion has no PV inputs — it is
battery-only and carries no solar specifications.

---

## Verified

| Spec | Value | Source |
|---|---|---|
| MPPTs / PV inputs | 6 | Datasheet; Install manual |
| PV DC MPPT voltage range | 60 – 480 V | Datasheet; Install manual |
| PV DC input voltage range (absolute) | 60 – 550 V | Datasheet; Install manual |
| Withstand voltage | 600 V DC | Datasheet |
| Max input current, single MPPT | **15 A Imp / 19 A ISC** (15 A units)<br>**13 A Imp / 15 A ISC** (all others) | Datasheet fn. 7–8; Install manual fn. 5–6 |
| Max input current, jumpered pair | **30 A Imp / 38 A ISC** (15 A units)<br>**26 A Imp / 30 A ISC** (all others) | Datasheet fn. 8; Install MPPT Jumpers |
| Valid jumper pairs | **1↔2 and 5↔6 only** | Install MPPT Jumpers; DC System Sizing; Device Setup Guide |
| MPPT 3 & 4 | Cannot be jumpered; closed from the factory. Independent, fully usable inputs. | Install MPPT Jumpers; DC System Sizing |
| Jumper threshold | Required when Imp on one terminal pair exceeds the single-input rating | Powerwall 3 is Under Producing; Install manual |
| Max solar STC input | 20 kW | Datasheet; DC System Sizing |

### Sources

- [Powerwall 3 Datasheet](https://energylibrary.tesla.com/docs/Public/EnergyStorage/Powerwall/3/Datasheet/en-us/Powerwall-3-Datasheet.pdf)
- [Install MPPT Jumpers](https://energylibrary.tesla.com/docs/Public/EnergyStorage/Powerwall/3/InstallManual/BackupSwitch/en-us/GUID-5FC784FE-D39D-4772-A003-C6E7F094F3A5.html)
- [DC System Sizing](https://energylibrary.tesla.com/docs/Public/EnergyStorage/Powerwall/3/SystemDesign/en-us/GUID-E43D0BF8-6B91-469A-813A-C3EFC27D87DB.html)
- [Install manual — specifications](https://energylibrary.tesla.com/docs/Public/EnergyStorage/Powerwall/3/InstallManual/BackupSwitch/en-us/GUID-EC527BC7-4750-4425-BBC4-DB8C000339B3.html)
- [Powerwall 3 is Under Producing](https://energylibrary.tesla.com/docs/Public/EnergyStorage/Powerwall/3/DeviceSetupGuide/en-us/GUID-07092079-CB35-4906-9055-187A86DFCF6B.html)
- [Arc Fault Lockout](https://energylibrary.tesla.com/docs/Public/EnergyStorage/Powerwall/3/DeviceSetupGuide/en-us/GUID-73A45665-0B05-4235-A6A5-9020A46E4B61.html)

---

## Verbatim quotes

On MPPT 3 and 4:

> "MPPT PV inputs 3 and 4 **cannot be combined and are closed from the factory**.
> Do not remove the factory-installed components closing these inputs."
> — Install MPPT Jumpers

> "MPPT inputs 3 and 4 cannot be jumped and are closed from the factory."
> — DC System Sizing

On jumper requirement:

> "Jumpers are required when Imp > 13A. As displayed in the examples below, paralleled
> strings with a combined Imp < 13 A do not require an MPPT jumper."
> — Powerwall 3 is Under Producing

> "Where the PV input current exceeds the maximum current rating per MPPT (Imp) of 13 A,
> jumpers can be used to parallel MPPTs to double the total PV input current capacity to 26 A."
> — Install manual

On valid configurations:

> "Valid configuration for Powerwall 3: jumper from 1 to 2 or 5 to 6"
> — Device Setup and Installation Troubleshooting Guide

On low-current modules:

> "For Solar Roof and older PV modules with Imp < 6.5 A, the jumper is not required."
> — DC System Sizing

---

---

## Field-observed behavior (not from Tesla docs)

Confirmed on live units, July 2026. Tesla does not document how a jumpered pair
presents on the Solar DC Inputs screen — this comes from direct observation.

> **A working jumper reports matched voltage on both inputs with the current split
> across the pair.** The string is series DC; the jumper parallels it onto two inputs,
> so both MPPT power stages share the load.

Example — one string at 250 V drawing 16 A:

| | MPPT 5 | MPPT 6 |
|---|---|---|
| Jumper working | 250 V / 8 A | 250 V / 8 A |
| Jumper missing or faulty | 250 V / 16 A | 250 V / 0 A |

**Consequence the analyzer relies on:** current on one input above the single-input
Imp, with its partner reading zero, cannot be a working jumper. A working jumper
would have split it. That reading means the jumper is absent or faulty and the input
is carrying the full string alone — a hard fault.

**Consequence it cannot escape:** a working jumpered pair and two matched independent
strings both present as matched voltage with split current. They are indistinguishable
from the readings alone.

---

## Not verified — do not assume

1. **A distinct minimum start-up / turn-on voltage.** Tesla publishes 60 V as the bottom
   of both the input range and the MPPT range, and enforces `X ≥ 60 V` in string sizing.
   No separate cold-start threshold appears in any Tesla source. If you need one, treat
   it as unavailable rather than assuming it equals 60 V.

2. **The electrical nature of the factory closure on MPPT 3–4.** Tesla says the inputs are
   "closed from the factory" with components that must not be removed, but never describes
   what they are. The explanatory figures are image-only. What is unambiguous: don't remove
   them, and 3–4 cannot be paralleled.

3. **Whether the 13 A jumper threshold has a documented 15 A counterpart.** The dual-variant
   footnote appears in the datasheet, install manual, and system design guide, but the
   troubleshooting page still states only 13 A. The analyzer scales the threshold with the
   selected variant, which follows from the per-MPPT rating, but Tesla has not stated the
   15 A threshold explicitly.

---

## Jumper part numbers

Keyed to the Powerwall part number — not interchangeable. Only install what shipped
with that unit.

| Powerwall 3 P/N | Jumper P/N |
|---|---|
| `1707000-11-L` and higher, or `1707000-21-L` and higher | `2009322-xx-y` |
| All others | `1784893-xx-y` |
