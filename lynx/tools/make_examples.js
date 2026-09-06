// Generates Lynx's built-in worked examples (the EXAMPLES object embedded in
// index.html) and validates each one against the real diagnostic engine,
// loaded straight out of index.html itself — same pattern as
// tests/corpus_harness.js / tests/render_harness.js, so a scenario is only
// ever accepted because the actual pipeline produced the intended verdict,
// not because this script asserts it.
//
// EVERY DATASET HERE IS FABRICATED. No real field export, trimmed or
// otherwise, is used or referenced. That is a deliberate change from the
// examples this file replaced (v1.43 and earlier), which were real (trimmed)
// customer exports — safe per the redaction rules in LYNX_HANDOFF_PROTOCOL.md,
// but real. Built-in examples ship to everyone who opens the public page, so
// removing even a remote dependency on real customer telemetry from that path
// is worth the (real) cost of hand-tuning synthetic data to trip the right
// checks. See lynx/CLAUDE.md and lynx/LYNX_HANDOFF_PROTOCOL.md for the rules
// this generator has to satisfy.
//
// Usage:
//   node tools/make_examples.js            # validate only, print a report
//   node tools/make_examples.js --write    # also rewrite the EXAMPLES block
//                                           # in index.html in place
//
// Deliberately NOT 'use strict': eval() below must stay top-level, sloppy-mode
// scope so the function declarations it evaluates (rowsFromCSV, runDiagnostic)
// leak into this module's scope instead of vanishing with the eval call —
// same constraint tests/corpus_harness.js documents.
const fs = require('fs');
const path = require('path');
const HTML_PATH = path.join(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');
const blocks = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
global.window = { addEventListener(){}, location:{href:''} };
global.document = { getElementById:()=>null, querySelector:()=>null, querySelectorAll:()=>[],
  createElement:()=>({style:{},classList:{add(){},remove(){}},appendChild(){},setAttribute(){}}),
  addEventListener(){}, body:{appendChild(){}} };
try { global.navigator = { userAgent: 'node' }; } catch (e) {
  Object.defineProperty(global, 'navigator', { value: { userAgent: 'node' }, configurable: true });
}
for (let i = 0; i < 2; i++) { try { eval(blocks[i]); } catch (e) { console.error('LOAD ERROR block', i, e); process.exit(1); } }

// ---------- small deterministic helpers ----------
function mulberry32(seed) {
  return function() {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function fmtQcellsTime(d) {
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} (${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')})`;
}
function fmtEnphaseTime(d) {
  const p = n => String(n).padStart(2,'0');
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:00`;
}
// Local-wall-clock ISO string (no trailing Z). Date.toISOString() always
// renders UTC, which silently shifts every timestamp by this machine's UTC
// offset and can push a late-evening row into the next calendar date — caught
// because it changed which 9 days a multi-day production-outage scenario
// grouped as consecutive. Tesla's datetime column carries no timezone suffix,
// and native Date parsing treats an unqualified date-time string as LOCAL
// time, so the string must be built from local getters to round-trip to the
// exact wall-clock day it was generated from.
function fmtLocalISO(d) {
  const p = (n, w=2) => String(n).padStart(w, '0');
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}.${p(d.getMilliseconds(),3)}`;
}
function solarShape(hour, sunrise=5.5, sunset=20.5) {
  if (hour <= sunrise || hour >= sunset) return 0;
  const span = sunset - sunrise;
  const x = (hour - sunrise) / span;
  return Math.sin(Math.PI * x) ** 1.3;
}
function gauss(h, mu, sigma) { return Math.exp(-(((h-mu)/sigma) ** 2)); }
// Independent household-load random walk. Deliberately has NO deterministic
// function of hour-of-day, so it cannot mechanically correlate (positively or
// negatively) with a solar bell curve that IS a function of hour-of-day. An
// earlier version built "healthy" loads from gaussian morning/evening bumps —
// just as much a function of hour as production is — and the two smooth
// curves fit each other almost perfectly (r as strong as -1.00) purely from
// shared functional form: a generation artifact that read exactly like the
// reversed-CT finding this dataset is supposed to be a HEALTHY counterexample
// to.
function randomWalkLoad(n, { base, min, max, step, rand }) {
  const out = [];
  let v = base;
  for (let i = 0; i < n; i++) {
    v += (rand()-0.5) * step;
    if (v < min) v = min + (min - v) * 0.3;
    if (v > max) v = max - (v - max) * 0.3;
    out.push(v);
  }
  return out;
}

// ---------- QCells / Q.OMMAND — load_with_solar ----------
function buildQcells({ bad, seed }) {
  const rand = mulberry32(seed);
  const randLoad = mulberry32(seed + 999);
  const dips = [];
  const nDips = bad ? 5 : 0;
  for (let i = 0; i < nDips; i++) dips.push({ center: 7 + rand()*10, width: 0.4+rand()*0.5, depth: 0.4+rand()*0.4 });
  const start = new Date(2026, 6, 14, 0, 0, 0); // Jul 14 2026 — fictional date
  const walk = randomWalkLoad(96, { base: 550, min: 150, max: 2200, step: 220, rand: randLoad });
  const rows = [];
  for (let i = 0; i < 96; i++) {
    const d = new Date(start.getTime() + i * 15 * 60000);
    const hour = d.getHours() + d.getMinutes()/60;
    let mult = 1;
    for (const dip of dips) { const dist = Math.abs(hour-dip.center); if (dist < dip.width) mult *= (1 - dip.depth*(1-dist/dip.width)); }
    const pv = Math.max(0, 5200 * solarShape(hour) * mult * (0.97+0.06*rand()));
    const baseLoad = walk[i];
    const load = bad ? Math.max(50, baseLoad + 0.9*pv + (randLoad()-0.5)*30)
                      : Math.max(50, baseLoad);
    const grid = load - pv;
    const v1 = 124.0 + (rand()-0.5)*0.6, v2 = 123.4 + (rand()-0.5)*0.6;
    const freq = 60.0 + (rand()-0.5)*0.06;
    const c1 = 2.0 + 2.5*rand(), c2 = 1.8 + 2.3*rand();
    rows.push({ d, pv, grid, load, v1, v2, freq, c1, c2 });
  }
  const header = `"","PV","Grid","Load","PV Produced","Load Consumed","Grid Voltage L1","Grid Voltage L2","Grid Current L1","Grid Current L2","Grid Frequency","SOC"`;
  const lines = rows.map(r => `"${fmtQcellsTime(r.d)}","${r.pv}","${r.grid}","${r.load}","","","${r.v1}","${r.v2}","${r.c1}","${r.c2}","${r.freq}",""`);
  return [header, ...lines].join('\n');
}

// ---------- Enphase — legs_only ----------
function buildEnphase({ bad, seed, days=3 }) {
  const rand = mulberry32(seed);
  const randL = mulberry32(seed + 777);
  const start = new Date(2026, 8, 2, 0, 0, 0); // Sep 2 2026 — fictional date
  const stepMin = 15;
  const totalSteps = days * 24 * 60 / stepMin;
  const dipsByDay = new Map();
  const nDipsPerDay = bad ? 4 : 0;
  const walkC1 = randomWalkLoad(totalSteps, { base: 500, min: 100, max: 1600, step: 180, rand: randL });
  const walkC2 = randomWalkLoad(totalSteps, { base: 650, min: 100, max: 1800, step: 200, rand: randL });
  const rows = [];
  for (let i = 0; i < totalSteps; i++) {
    const d = new Date(start.getTime() + i * stepMin * 60000);
    const hour = d.getHours() + d.getMinutes()/60;
    const dayKey = d.toDateString();
    if (bad && !dipsByDay.has(dayKey)) {
      const arr = [];
      for (let k = 0; k < nDipsPerDay; k++) arr.push({ center: 7+rand()*10, width: 0.4+rand()*0.5, depth: 0.4+rand()*0.4 });
      dipsByDay.set(dayKey, arr);
    }
    let mult = 1;
    if (bad) for (const dip of dipsByDay.get(dayKey)) { const dist=Math.abs(hour-dip.center); if (dist<dip.width) mult *= (1-dip.depth*(1-dist/dip.width)); }
    const prodTotal = Math.max(0, 4600 * solarShape(hour) * mult * (0.97+0.06*rand()));
    const p1 = prodTotal * 0.52, p2 = prodTotal * 0.48;
    const c2 = Math.max(30, walkC2[i]);
    const c1 = bad ? Math.max(30, walkC1[i] + 0.9*prodTotal) : Math.max(30, walkC1[i]);
    rows.push({ d, p1, p2, c1, c2 });
  }
  const header = `"DateTime","Series 5","Series 6","Produced","L2(B)","L1(A)","Consumed","L1(A)","L2(B)"`;
  const lines = rows.map(r => `"${fmtEnphaseTime(r.d)}",,,,${r.p2},${r.p1},,${r.c1},${r.c2}`);
  return [header, ...lines].join('\n');
}

// ---------- QCells — negative PV (reversed/offset production CT) ----------
function buildQcellsNegPV({ seed }) {
  const rand = mulberry32(seed);
  const randLoad = mulberry32(seed + 999);
  const start = new Date(2026, 6, 14, 0, 0, 0);
  const walk = randomWalkLoad(96, { base: 550, min: 150, max: 2200, step: 220, rand: randLoad });
  const rows = [];
  // Negative stretch: low-light shoulder just after sunrise (real reversed/
  // offset production CTs read backwards most visibly at low output, per the
  // tool's own "polarity_offset vs offset_zero_cal" distinction).
  const negFrom = 5.5, negTo = 7.0;
  for (let i = 0; i < 96; i++) {
    const d = new Date(start.getTime() + i * 15 * 60000);
    const hour = d.getHours() + d.getMinutes()/60;
    let pv = Math.max(0, 5200 * solarShape(hour) * (0.97+0.06*rand()));
    if (hour >= negFrom && hour < negTo) pv = -(180 + 140*rand());
    const load = Math.max(50, walk[i]);
    const grid = load - pv;
    const v1 = 124.0 + (rand()-0.5)*0.6, v2 = 123.4 + (rand()-0.5)*0.6;
    const freq = 60.0 + (rand()-0.5)*0.06;
    const c1 = 2.0 + 2.5*rand(), c2 = 1.8 + 2.3*rand();
    rows.push({ d, pv, grid, load, v1, v2, freq, c1, c2 });
  }
  const header = `"","PV","Grid","Load","PV Produced","Load Consumed","Grid Voltage L1","Grid Voltage L2","Grid Current L1","Grid Current L2","Grid Frequency","SOC"`;
  const lines = rows.map(r => `"${fmtQcellsTime(r.d)}","${r.pv}","${r.grid}","${r.load}","","","${r.v1}","${r.v2}","${r.c1}","${r.c2}","${r.freq}",""`);
  return [header, ...lines].join('\n');
}

// ---------- QCells — negative Grid with nothing on site to explain it ----------
function buildQcellsNegGrid({ seed }) {
  const rand = mulberry32(seed);
  const randLoad = mulberry32(seed + 999);
  const start = new Date(2026, 6, 14, 0, 0, 0);
  const walk = randomWalkLoad(96, { base: 550, min: 150, max: 2200, step: 220, rand: randLoad });
  const rows = [];
  for (let i = 0; i < 96; i++) {
    const d = new Date(start.getTime() + i * 15 * 60000);
    const hour = d.getHours() + d.getMinutes()/60;
    const pv = Math.max(0, 5200 * solarShape(hour) * (0.97+0.06*rand()));
    let load = Math.max(50, walk[i]);
    let grid = load - pv;
    // Deep-night window (PV genuinely 0): force Load down to a near-silent
    // baseline AND make Grid read deeply negative anyway — nothing on site
    // could produce that flow, the signature of a reversed/miswired Grid CT
    // rather than ordinary nighttime draw or PV export.
    if (hour >= 2.0 && hour < 3.5) {
      load = 20 + 10*rand();
      grid = -(320 + 120*rand());
    }
    const v1 = 124.0 + (rand()-0.5)*0.6, v2 = 123.4 + (rand()-0.5)*0.6;
    const freq = 60.0 + (rand()-0.5)*0.06;
    const c1 = 2.0 + 2.5*rand(), c2 = 1.8 + 2.3*rand();
    rows.push({ d, pv, grid, load, v1, v2, freq, c1, c2 });
  }
  const header = `"","PV","Grid","Load","PV Produced","Load Consumed","Grid Voltage L1","Grid Voltage L2","Grid Current L1","Grid Current L2","Grid Frequency","SOC"`;
  const lines = rows.map(r => `"${fmtQcellsTime(r.d)}","${r.pv}","${r.grid}","${r.load}","","","${r.v1}","${r.v2}","${r.c1}","${r.c2}","${r.freq}",""`);
  return [header, ...lines].join('\n');
}

// ---------- Enphase — two consumption legs mirror each other (same conductor read twice) ----------
function buildEnphaseLegMirror({ seed, days=3 }) {
  const rand = mulberry32(seed);
  const randL = mulberry32(seed + 777);
  const start = new Date(2026, 8, 2, 0, 0, 0);
  const stepMin = 15;
  const totalSteps = days * 24 * 60 / stepMin;
  const walkC2 = randomWalkLoad(totalSteps, { base: 650, min: 100, max: 1800, step: 200, rand: randL });
  const rows = [];
  for (let i = 0; i < totalSteps; i++) {
    const d = new Date(start.getTime() + i * stepMin * 60000);
    const hour = d.getHours() + d.getMinutes()/60;
    const prodTotal = Math.max(0, 4600 * solarShape(hour) * (0.97+0.06*rand()));
    const p1 = prodTotal * 0.52, p2 = prodTotal * 0.48;
    const c2 = Math.max(30, walkC2[i]);
    // L1 is nearly a copy of L2 — the two CTs are physically clamped on the
    // same conductor and reporting it twice, not two independent circuits.
    const c1 = Math.max(30, c2 * (0.97 + 0.06*randL()) + (randL()-0.5)*10);
    rows.push({ d, p1, p2, c1, c2 });
  }
  const header = `"DateTime","Series 5","Series 6","Produced","L2(B)","L1(A)","Consumed","L1(A)","L2(B)"`;
  const lines = rows.map(r => `"${fmtEnphaseTime(r.d)}",,,,${r.p2},${r.p1},,${r.c1},${r.c2}`);
  return [header, ...lines].join('\n');
}

// ---------- Enphase — reversed consumption CT (per-leg), calibrated on the ----------
// tool's one confirmed field outcome (see checkLegReversal's own doc comment:
// fault days reach r=-0.95 with real negative readings; -0.60 is the gate).
function buildEnphaseLegReversal({ seed, days=3 }) {
  const rand = mulberry32(seed);
  const randL = mulberry32(seed + 777);
  const start = new Date(2026, 8, 2, 0, 0, 0);
  const stepMin = 15;
  const totalSteps = days * 24 * 60 / stepMin;
  // Small true load behind the reversed CT — real, but easily outrun by
  // production, which is what drives the reading negative.
  const walkTrueL1 = randomWalkLoad(totalSteps, { base: 150, min: 40, max: 350, step: 60, rand: randL });
  const walkC2 = randomWalkLoad(totalSteps, { base: 650, min: 100, max: 1800, step: 200, rand: randL });
  const rows = [];
  for (let i = 0; i < totalSteps; i++) {
    const d = new Date(start.getTime() + i * stepMin * 60000);
    const hour = d.getHours() + d.getMinutes()/60;
    const prodTotal = Math.max(0, 4600 * solarShape(hour) * (0.97+0.06*rand()));
    const p1 = prodTotal * 0.52, p2 = prodTotal * 0.48;
    const c2 = Math.max(30, walkC2[i]);
    // Reversed polarity: reads true household load MINUS production on this
    // leg's share, so it falls as production rises and goes negative once
    // production exceeds the (small) true load — the exact signature named
    // in checkLegReversal's calibration comment.
    const c1 = walkTrueL1[i] - p1;
    rows.push({ d, p1, p2, c1, c2 });
  }
  const header = `"DateTime","Series 5","Series 6","Produced","L2(B)","L1(A)","Consumed","L1(A)","L2(B)"`;
  const lines = rows.map(r => `"${fmtEnphaseTime(r.d)}",,,,${r.p2},${r.p1},,${r.c1},${r.c2}`);
  return [header, ...lines].join('\n');
}

// ---------- Tesla — tesla_derived ----------
function buildTeslaGood({ seed, days=3 }) {
  const rand = mulberry32(seed);
  const start = new Date(2026, 4, 10, 0, 0, 0); // May 10 2026 — fictional date
  const stepMin = 15;
  const totalSteps = days*24*60/stepMin;
  const rows = [];
  for (let i = 0; i < totalSteps; i++) {
    const d = new Date(start.getTime() + i*stepMin*60000);
    const hour = d.getHours()+d.getMinutes()/60;
    const solar = Math.max(0, 4400*solarShape(hour)*(0.97+0.06*rand()));
    const houseLoad = 350 + 500*gauss(hour,8,1.3) + 1300*gauss(hour,19,1.9) + (rand()-0.5)*60;
    // Jitter the charge/discharge CAP itself (not just the pre-cap value) so a
    // multi-hour stretch pinned at the cap still varies sample-to-sample —
    // otherwise it's an exact repeated constant and trips the flatline check
    // (whose tolerance is a few watts, well under a bare literal 2000).
    const chargeCap = 2000 + (rand()-0.5)*80, dischargeCap = 1500 + (rand()-0.5)*60;
    const batt = solar > houseLoad ? -Math.min(solar-houseLoad, chargeCap) : Math.min(houseLoad-solar, dischargeCap)*0.4;
    const site = houseLoad - solar - (-batt);
    const load = solar + site + batt; // "derived" — this platform computes load arithmetically
    rows.push({ d, solar, site, batt, load });
  }
  const header = `timestamp,datetime,uid,solar_instant_power,site_instant_power,battery_instant_power,load_instant_real_power`;
  const lines = rows.map(r => `${r.d.getTime()},${fmtLocalISO(r.d)},SYNTH-TESLA-GOOD,${r.solar},${r.site},${r.batt},${r.load}`);
  return [header, ...lines].join('\n');
}
function buildTeslaOutage({ seed, healthyDays=12, outageDays=9 }) {
  const rand = mulberry32(seed);
  const start = new Date(2026, 0, 6, 0, 0, 0); // Jan 6 2026 — fictional, mid-winter
  const stepMin = 60;
  const rows = [];
  let cursor = new Date(start);
  const pushDay = (peakW) => {
    for (let m = 0; m < 24*60; m += stepMin) {
      const d = new Date(cursor.getTime() + m*60000);
      const hour = d.getHours()+d.getMinutes()/60;
      const solar = Math.max(0, peakW*solarShape(hour,7.5,17)*(0.95+0.1*rand()));
      const houseLoad = 500 + 400*gauss(hour,8,1.5) + 900*gauss(hour,19,2.2) + (rand()-0.5)*80;
      const site = houseLoad - solar;
      const load = solar + site;
      rows.push({ d, solar, site, load });
    }
    cursor = new Date(cursor.getTime() + 24*3600000);
  };
  for (let i = 0; i < healthyDays; i++) pushDay(3400 + (rand()-0.5)*400);
  for (let i = 0; i < outageDays; i++) pushDay(80 + rand()*40); // near-total collapse
  const header = `timestamp,datetime,uid,solar_instant_power,site_instant_power,load_instant_real_power`;
  const lines = rows.map(r => `${r.d.getTime()},${fmtLocalISO(r.d)},SYNTH-TESLA-BAD,${r.solar},${r.site},${r.load}`);
  return [header, ...lines].join('\n');
}

// ---------- assemble + validate ----------
// A flat list, not one-good-one-bad-per-platform: the point of this set is to
// span the tool's actual real-world fault CATEGORIES (mirroring/correlation,
// negative PV, negative Grid, reversed CT, multi-day outage), not to give
// every platform a symmetric pair. `good` stays simple — one clean reference
// per schema is enough to show what healthy looks like. `expect` is a
// substring that must appear in some item's headline, checked against the
// real pipeline output below — the same evidence bar the rest of this
// project holds itself to (LYNX_HANDOFF_PROTOCOL.md: "never claim a
// verification you did not run").
const EXAMPLES = [
  {
    kind: 'good', name: 'synthetic_good_1.csv', mode: 'QCells / Q.OMMAND — load_with_solar',
    blurb: 'Healthy reference system (synthetic, 1 day). Production follows an independent bell curve; household usage is an unrelated random-walk profile. Grid reconciles to Load − PV throughout.',
    why: 'Shows what a clean file looks like on this schema: PV and Load are generated from unrelated processes, so no cross-talk correlation should appear anywhere in the report.',
    csv: buildQcells({ bad: false, seed: 1 }), expectStatus: 'GOOD',
  },
  {
    kind: 'good', name: 'synthetic_good_2.csv', mode: 'Enphase — legs_only (per-leg export)',
    blurb: 'Healthy reference system (synthetic, 3 days). Both consumption legs and both production legs are independent random-walk / bell-curve series with no shared driver.',
    why: 'Demonstrates a clean multi-day per-leg export. A real healthy file can still surface a mild, non-issue "worth checking" lead on leg correlation — that is realistic tool behavior, not a defect in this example.',
    csv: buildEnphase({ bad: false, seed: 3 }), expectStatus: 'GOOD',
  },
  {
    kind: 'good', name: 'synthetic_good_3.csv', mode: 'Tesla — tesla_derived (with battery)',
    blurb: "Healthy reference system (synthetic, 3 days) with battery. Note: this platform's own export computes Load as Solar + Site + Battery, so it is not an independent measurement — the cross-talk check is intentionally not applicable, and the report says so explicitly.",
    why: "Shows a clean multi-day battery-equipped file on the one schema where the cross-talk check cannot run at all — a different limitation than 'not tested', and the report is expected to disclose that limitation rather than staying silent about it.",
    csv: buildTeslaGood({ seed: 5 }), expectStatus: 'GOOD',
  },
  {
    kind: 'bad', name: 'synthetic_bad_bleed_qcells.csv', mode: 'QCells / Q.OMMAND — load_with_solar',
    blurb: "Cross-talk / bleed (synthetic, 1 day). The Load reading is built as household usage plus 90% of production, so it rises and falls with PV — including through the day's cloud-driven dips.",
    why: "The tool's core cross-talk signature: a consumption CT physically picking up the production conductor's field reads as usage SCALING with production, not merely sharing its rough daily shape. Expect a [TWO CHECKS AGREE] card naming a bleed slope near 0.9 W of reported usage per W produced.",
    csv: buildQcells({ bad: true, seed: 2 }), expectStatus: 'TROUBLESHOOT', expectHeadline: 'rises',
  },
  {
    kind: 'bad', name: 'synthetic_bad_negpv.csv', mode: 'QCells / Q.OMMAND — load_with_solar',
    blurb: 'Negative production (synthetic, 1 day). PV reads negative for a stretch right after sunrise instead of the small positive values a healthy low-light period would show.',
    why: "Real-world reason: a reversed or wrongly-oriented production CT reads backward continuously, not just at night when PV is zero anyway — this simulates that by injecting negative readings during actual low-light production hours. Expect an [issue] card naming the point count and lowest reading.",
    csv: buildQcellsNegPV({ seed: 7 }), expectStatus: 'TROUBLESHOOT', expectHeadline: 'PV reads negative',
  },
  {
    kind: 'bad', name: 'synthetic_bad_neggrid.csv', mode: 'QCells / Q.OMMAND — load_with_solar',
    blurb: 'Negative Grid with nothing on site to explain it (synthetic, 1 day). For a stretch of deep night, PV is silent, Load is forced to a near-zero baseline, and Grid still reads deeply negative.',
    why: 'Real-world reason: a reversed or miswired Grid/Site CT can report flow that neither production nor consumption could produce — physically impossible, and a stronger, more specific signal than an ordinary balance mismatch. Expect an [issue] card naming the point count.',
    csv: buildQcellsNegGrid({ seed: 8 }), expectStatus: 'TROUBLESHOOT', expectHeadline: 'reads negative',
  },
  {
    kind: 'bad', name: 'synthetic_bad_legmirror_enphase.csv', mode: 'Enphase — legs_only (per-leg export)',
    blurb: 'Same-conductor duplication (synthetic, 3 days). The two consumption legs, L1(A) and L2(B), are built as near-identical series — one is essentially a copy of the other with a little independent noise.',
    why: "Real-world reason: two circuits that are supposed to be independent moving almost identically is the signature of both CTs clamped on the same conductor (or one channel bleeding into the other) — a genuine lead worth a look, which is why the tool reports it at [WORTH CHECKING] rather than escalating it to a confirmed fault on this evidence alone.",
    csv: buildEnphaseLegMirror({ seed: 9 }), expectHeadline: 'correlate unusually strongly',
  },
  {
    kind: 'bad', name: 'synthetic_bad_legreversal_enphase.csv', mode: 'Enphase — legs_only (per-leg export)',
    blurb: 'Reversed consumption CT on one leg (synthetic, 3 days), calibrated on the pattern from the one confirmed field outcome in this codebase: L1(A) reads a small true household load minus production, so it falls as production rises and goes negative once production exceeds that small load.',
    why: 'Real-world reason: a reversed consumption CT reads the production current backward, so the leg falls as production climbs (strong negative correlation) and goes NEGATIVE whenever production on that leg exceeds its real load — the exact signature this codebase confirmed once in the field. Expect a [REVERSED]-style issue card naming the leg.',
    csv: buildEnphaseLegReversal({ seed: 10 }), expectStatus: 'TROUBLESHOOT', expectHeadline: 'revers',
  },
  {
    kind: 'bad', name: 'synthetic_bad_outage_tesla.csv', mode: 'Tesla — tesla_derived',
    blurb: 'Multi-day production outage (synthetic): 12 normal days followed by 9 consecutive days with production collapsed to roughly 2-3% of typical, at 1-hour resolution.',
    why: "A different fault family from every example above: an equipment/dropout fault (e.g. a tripped production breaker or a failed string), not a metering artifact — and this platform's derived Load means the cross-talk checks above can't even run here (see the healthy Tesla example). The per-day production-anomaly check only fires on a RUN of several consecutive bad days; a single low day reads as ordinary weather. Expect a card naming '9 consecutive days ... far below typical'.",
    csv: buildTeslaOutage({ seed: 6 }), expectStatus: 'TROUBLESHOOT', expectHeadline: 'consecutive days',
  },
];

function summarize(ex) {
  const parsed = rowsFromCSV(ex.csv);
  if (parsed.error) return { name: ex.name, error: parsed.error };
  const res = runDiagnostic(parsed);
  return {
    name: ex.name, mode: parsed.mode, points: parsed.points.length, status: res.status,
    headlines: res.items.map(i => i.headline),
    issues: res.items.filter(i=>i.type==='issue').map(i=>i.headline),
  };
}

let ok = true;
for (const ex of EXAMPLES) {
  const s = summarize(ex);
  console.log(JSON.stringify({ kind: ex.kind, name: s.name, mode: s.mode, points: s.points, status: s.status, issues: s.issues }));
  if (s.error) { console.error(`  ERROR: ${s.error}`); ok = false; continue; }
  if (ex.kind === 'good' && s.issues.length > 0) { console.error(`  UNEXPECTED: 'good' example has an issue-tier finding`); ok = false; }
  if (ex.expectStatus && s.status !== ex.expectStatus) { console.error(`  UNEXPECTED: status ${s.status}, expected ${ex.expectStatus}`); ok = false; }
  if (ex.expectHeadline && !s.headlines.some(h => h.toLowerCase().includes(ex.expectHeadline.toLowerCase()))) {
    console.error(`  UNEXPECTED: no headline contains "${ex.expectHeadline}". Headlines: ${JSON.stringify(s.headlines)}`); ok = false;
  }
}
if (!ok) { console.error('\nValidation FAILED — not writing.'); process.exit(1); }
console.log(`\nAll ${EXAMPLES.length} synthetic examples validated against the live diagnostic engine.`);

if (process.argv.includes('--write')) {
  function jsStr(s) { return JSON.stringify(s); }
  function csvTemplate(csv) { return '`' + csv.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${') + '`'; }
  let out = `// AUTO-GENERATED by tools/make_examples.js — do not edit by hand.\n`;
  out += `// Embedded example datasets. EVERY ONE IS FABRICATED — no real field\n`;
  out += `// export, trimmed or otherwise, appears anywhere below. A flat list, not\n`;
  out += `// one-good-one-bad-per-platform: it spans the tool's real-world fault\n`;
  out += `// CATEGORIES (bleed, negative PV, negative Grid, leg mirroring, reversed\n`;
  out += `// CT, multi-day outage), each verified through the actual diagnostic\n`;
  out += `// pipeline at generation time (see this file's validation pass). Re-run\n`;
  out += `// \`node tools/make_examples.js --write\` to regenerate.\n`;
  out += `const EXAMPLES = [\n`;
  for (const ex of EXAMPLES) {
    out += `  { kind: ${jsStr(ex.kind)}, name: ${jsStr(ex.name)}, mode: ${jsStr(ex.mode)}, blurb: ${jsStr(ex.blurb)}, why: ${jsStr(ex.why)}, csv: ${csvTemplate(ex.csv)} },\n`;
  }
  out += `];\n`;
  // index.html is CRLF throughout; keep the spliced-in block consistent with
  // the rest of the file rather than introducing a mixed-line-ending diff.
  out = out.replace(/\n/g, '\r\n');

  const startMarker = '<script>\r\n// AUTO-GENERATED by tools/make_examples.js';
  const startIdx = html.indexOf(startMarker);
  if (startIdx === -1) { console.error('Could not find EXAMPLES script start marker.'); process.exit(1); }
  const scriptOpenIdx = startIdx + '<script>\r\n'.length;
  const endMarker = '\r\n</script>\r\n<script>\r\nconst fileInput';
  const endIdx = html.indexOf(endMarker, scriptOpenIdx);
  if (endIdx === -1) { console.error('Could not find EXAMPLES script end marker.'); process.exit(1); }
  const newHtml = html.slice(0, scriptOpenIdx) + out + html.slice(endIdx + 2);
  fs.writeFileSync(HTML_PATH, newHtml);
  console.log(`\nWrote new EXAMPLES block to ${HTML_PATH} (${out.length} bytes, was ${endIdx - scriptOpenIdx} bytes).`);
}
