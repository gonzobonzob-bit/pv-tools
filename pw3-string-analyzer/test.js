// Test harness for PW3 String Analyzer. Extracts the <script> block from
// index.html, evaluates it in Node (no DOM), and runs the scenario matrix.
// Usage: node test.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const m = html.match(/<script>([\s\S]*?)<\/script>/);
if (!m) { console.error('No <script> block found'); process.exit(1); }

const sandbox = { module: { exports: {} }, console, document: undefined, window: undefined };
sandbox.exports = sandbox.module.exports;
vm.createContext(sandbox);
vm.runInContext(m[1], sandbox, { filename: 'index.html<script>' });
const A = sandbox.module.exports;
if (!A.analyzeJumperable) { console.error('Export failed'); process.exit(1); }

const SETS = A.SETS, ON_A = A.ON_A, ON_V = A.ON_V;

// r = [[v1,a1],[v2,a2],...x6]; null entry = field left blank
function build(r) {
  const sets = [];
  for (let s = 0; s < SETS.length; s++) {
    const def = SETS[s], mppts = [];
    for (let i = 0; i < 2; i++) {
      const id = def.ids[i], raw = r[id - 1];
      const entered = raw !== null && raw !== undefined;
      const v = entered ? raw[0] : 0;
      let a = entered ? raw[1] : 0;
      // Mirrors readAll(): a negative current with no voltage at the input is an
      // idle string, not a reading. Keep this in step with index.html.
      if (a < 0 && v <= ON_V) a = 0;
      mppts.push({ id, v, a, entered, on: a > ON_A });
    }
    sets.push({ key: def.key, jumperable: def.jumperable, m: mppts,
                entered: mppts[0].entered || mppts[1].entered });
  }
  return { sets };
}

function run(readings, variant) {
  const spec = A.VARIANTS[variant || '13'];
  const data = build(readings);
  const results = data.sets.map(s =>
    s.jumperable ? A.analyzeJumperable(s, spec) : A.analyzeIndependent(s, spec));
  return { status: A.overallStatus(results, data), results, data };
}

const N = null;
const CASES = [
  { n: 'Normal 6-string independent, all under Imp',
    r: [[400,8],[400,8],[400,8],[400,8],[400,8],[400,8]], expect: 'yellow',
    note: 'A and C total 16A > 13A Imp -> jumper required/verify. B fine.' },
  { n: 'Six low-current strings, everything under limits',
    r: [[400,6],[400,6],[400,6],[400,6],[400,6],[400,6]], expect: 'green' },
  { n: 'MPPT 3 & 4 both live (old S1 false positive)',
    r: [N,N,[400,8],[400,8],N,N], expect: 'green' },
  { n: 'Single-input overcurrent 16A on MPPT 1, partner at zero',
    r: [[400,16],N,N,N,N,N], expect: 'red',
    note: 'jumper splits current when working -> one leg alone over Imp = jumper missing/faulty' },
  { n: 'Single-input 28A on MPPT 1 (above jumpered Imp)',
    r: [[400,28],N,N,N,N,N], expect: 'red' },
  { n: 'FIELD: no jumper, one string on MPPT 5 at 250V / 8A',
    r: [N,N,N,N,[250,8],N], expect: 'green',
    jumper: 'C=Not required',
    note: "non-jumpered example - 8A under 13A Imp, no jumper needed" },
  { n: 'FIELD: working jumper 5-6, matched V, current split evenly',
    r: [N,N,N,N,[250,8],[250,8]], expect: 'yellow',
    jumper: 'C=Required',
    note: '16A total > 13A Imp; matched V + split A is the jumper signature -> verify visually' },
  { n: 'FIELD: jumper 5-6 faulty, all current on MPPT 5, MPPT 6 at zero',
    r: [N,N,N,N,[250,16],[250,0]], expect: 'red',
    jumper: 'C=OUT or faulty',
    note: 'must be a hard fault, not a soft warning' },
  { n: '15A unit: working jumper 1-2 splitting 24A evenly',
    r: [[380,12],[380,12],N,N,N,N], variant: '15', expect: 'yellow',
    note: '24A < 30A dual Imp, > 15A single -> jumper required, verify' },
  { n: 'MPPT 3 alone at 16A - no jumper option (old S4)',
    r: [N,N,[400,16],N,N,N], expect: 'red' },
  { n: 'True night - no voltage, no current',
    r: [[0,0],[0,0],[0,0],[0,0],[0,0],[0,0]], expect: 'grey' },
  { n: 'Voc present, zero current on all 6 (system stopped / RSD tripped)',
    r: [[400,0],[400,0],[400,0],[400,0],[400,0],[400,0]], expect: 'yellow',
    note: 'strings live but nothing drawing - must not read as Healthy' },
  { n: 'Blank form -> all sets unentered',
    r: [N,N,N,N,N,N], expect: 'grey' },
  { n: 'Overvoltage 600V at zero current (old S8)',
    r: [[600,0],N,N,N,N,N], expect: 'red' },
  { n: 'Above MPPT range 500V, under 550V abs',
    r: [[500,5],N,N,N,N,N], expect: 'yellow' },
  { n: 'Two independent strings, different lengths (old S9 false positive)',
    r: [[400,6],[340,6],N,N,N,N], expect: 'green',
    note: '12.0A total, under 13A -> legal, voltage delta expected' },
  { n: 'Shading imbalance on Set A',
    r: [[400,9],[400,2],N,N,N,N], expect: 'yellow' },
  { n: 'Genuine paralleled overload 32A on Set A',
    r: [[400,16],[400,16],N,N,N,N], expect: 'red' },
  { n: 'Marginal 14.9A single input, over 13A Imp (old S6)',
    r: [[400,14.9],N,N,N,N,N], expect: 'red', jumper: 'A=OUT or faulty',
    note: 'v3.1 passed this green; one leg alone over Imp is a fault' },
  { n: 'Severity: red on B + yellow on C -> must stay red (old S5)',
    r: [N,N,[400,16],N,[400,10],[400,2]], expect: 'red' },
  { n: 'Knife-edge ratio 4/10 (old dead branch)',
    r: [[400,4],[400,10],N,N,N,N], expect: 'yellow' },
  { n: 'Dead string: MPPT 2 has voltage, no current',
    r: [[400,8],[400,0],N,N,N,N], expect: 'yellow' },
  { n: '15A variant: 14.9A single input is now legal',
    r: [[400,14.9],N,N,N,N,N], variant: '15', expect: 'green' },
  { n: '15A variant: 28A jumpered pair is legal (26A would fail on 13A unit)',
    r: [[400,14],[400,14],N,N,N,N], variant: '15', expect: 'yellow',
    note: '28A < 30A dual Imp, but > 15A single -> verify jumper' },
  { n: 'Night with negative sensor offset on every input',
    r: [[0,-0.4],[0,-0.4],[0,-0.3],[0,-0.2],[0,-0.4],[0,-0.4]], expect: 'grey',
    note: 'no voltage = string not active; the minus sign is offset, not a fault' },
  { n: 'Live array with one idle input reading 0V / -0.3A',
    r: [[400,8],[0,-0.3],N,N,N,N], expect: 'green', jumper: 'A=Not required',
    note: 'the -0.3A leg must read as plain unpowered, not as a dead-string warning' },
];

let pass = 0, fail = 0;
console.log('PW3 String Analyzer v4.1 - test matrix\n' + '='.repeat(78));
for (const c of CASES) {
  let got, err = null, jum = null;
  try { const o = run(c.r, c.variant); got = o.status.cls; jum = o.results.map(x => x.key + '=' + x.jumper).join(' '); }
  catch (e) { err = e; got = 'THREW: ' + e.message; }
  const ok = !err && got === c.expect && (!c.jumper || (jum && jum.indexOf(c.jumper) !== -1));
  ok ? pass++ : fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  [${(c.variant||'13')+'A'}] ${c.n}`);
  if (!ok) console.log(`      expected ${c.expect}${c.jumper ? ' + jumper ' + c.jumper : ''}, got ${got}${jum ? ' | ' + jum : ''}`);
  if (c.note) console.log(`      note: ${c.note}`);
}
console.log('='.repeat(78));
console.log(`analysis matrix: ${pass} passed, ${fail} failed, ${CASES.length} total`);

/* ---------- Negative-value rule ----------
   No voltage at the input means the string is not active, whatever sign the
   current carries. A negative current only matters when voltage IS present. */

const NEG_CASES = [
  { n: 'No voltage, negative current -> not a hard error',
    r: [[0, -0.4], N, N, N, N, N], errs: 0 },
  { n: 'Blank voltage field, negative current -> not a hard error',
    r: [[0, -2.5], N, N, N, N, N], errs: 0,
    note: 'a blank V field reads as 0 through readAll()' },
  { n: 'Trace voltage under the 5V present threshold, negative current -> not a hard error',
    r: [[3, -0.4], N, N, N, N, N], errs: 0 },
  { n: 'Voltage present with negative current -> hard error (the real concern)',
    r: [[400, -0.4], N, N, N, N, N], errs: 1, match: /negative/i },
  { n: 'Low but real voltage with negative current -> hard error',
    r: [[80, -1.2], N, N, N, N, N], errs: 1, match: /negative/i },
  { n: 'Negative voltage is still a hard error on its own',
    r: [[-400, 8], N, N, N, N, N], errs: 1, match: /negative voltage/i },
  { n: 'Negative current is folded, so it cannot mask a real overcurrent elsewhere',
    r: [[0, -0.4], N, N, N, [400, 40], N], errs: 1, match: /ISC ceiling/i },
];

console.log('\nPW3 negative-value rule\n' + '='.repeat(78));
for (const c of NEG_CASES) {
  let problems = [];
  try {
    const errs = A.hardErrors(build(c.r), A.VARIANTS['13']);
    if (errs.length !== c.errs) problems.push(`${errs.length} errors, want ${c.errs}: ${errs.join(' | ')}`);
    if (c.match && !errs.some(e => c.match.test(e))) problems.push(`no error matching ${c.match}`);
  } catch (e) { problems.push('THREW: ' + e.message); }

  const ok = problems.length === 0;
  ok ? pass++ : fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${c.n}`);
  problems.forEach(p => console.log(`      ${p}`));
  if (c.note) console.log(`      note: ${c.note}`);
}

/* ---------- Paste parser (v4.1) ---------- */

// The real capture from a live unit. Primary fixture.
const REAL = [
  'AC Vitals',
  'Max Current Output',
  'Inverter State\tActive',
  'Inverter Mode\tGrid Following',
  'Frequency\t59.98Hz',
  'AC Voltage (L-L)\t231.4V',
  'Line 1\t116.2V',
  'Line 2\t115.2V',
  'Solar DC Inputs',
  'MPPT 1',
  '100V / 0.25A',
  'MPPT 2',
  '270V / 0.3A',
  'MPPT 3',
  '0V / 0.05A',
  'MPPT 4',
  '0V / -0A',
  'MPPT 5',
  '0V / -0A',
  'MPPT 6',
  '0V / -0A',
  'Battery',
  'Battery State\tActive',
  'DCDC State (A/B)\t(Active / Active)',
  'Powerwall Switch\tOn',
  'Version\t26.18.3 184289b9',
].join('\n');

const DC_ONLY = [
  'Solar DC Inputs',
  'MPPT 1', '100V / 0.25A',
  'MPPT 2', '270V / 0.3A',
  'MPPT 3', '0V / 0.05A',
  'MPPT 4', '0V / -0A',
  'MPPT 5', '0V / -0A',
  'MPPT 6', '0V / -0A',
].join('\n');

const PASTE_CASES = [
  { n: 'Full real Tesla One capture -> 6 of 6',
    in: REAL, count: 6, missing: [],
    vals: { 1: [100, 0.25], 2: [270, 0.3], 3: [0, 0.05], 4: [0, 0], 5: [0, 0], 6: [0, 0] },
    note: 'primary fixture - AC Vitals and Battery sections must be ignored' },

  { n: 'Solar DC Inputs section only, no AC/Battery -> 6 of 6',
    in: DC_ONLY, count: 6, missing: [],
    vals: { 1: [100, 0.25], 6: [0, 0] } },

  { n: 'Only MPPT 1 and 2 present -> 2 matched, 3-6 reported missing',
    in: 'Solar DC Inputs\nMPPT 1\n380V / 9.5A\nMPPT 2\n379V / 9.4A',
    count: 2, missing: [3, 4, 5, 6], vals: { 1: [380, 9.5], 2: [379, 9.4] } },

  { n: 'MPPT 3 label present but its V/A line missing -> must NOT borrow MPPT 4',
    in: 'Solar DC Inputs\nMPPT 1\n380V / 9.5A\nMPPT 2\n380V / 9.5A\nMPPT 3\nMPPT 4\n120V / 1.5A\nMPPT 5\n0V / 0A\nMPPT 6\n0V / 0A',
    count: 5, missing: [3], vals: { 4: [120, 1.5] },
    note: 'the one failure a loose global regex would cause' },

  { n: 'Signed zero "-0A" parses to 0 and does not trip the negative validator',
    in: 'MPPT 1\n0V / -0A', count: 1, missing: [2, 3, 4, 5, 6],
    vals: { 1: [0, 0] }, noNegativeError: true },

  { n: 'Same-line format "MPPT 1  100V / 0.25A" -> matched',
    in: 'Solar DC Inputs\nMPPT 1  100V / 0.25A\nmppt 2\t270V / 0.3A\nMPPT3 0V / 0A',
    count: 3, missing: [4, 5, 6], vals: { 1: [100, 0.25], 2: [270, 0.3], 3: [0, 0] },
    note: 'also covers lowercase "mppt 2" and no-space "MPPT3"' },

  { n: 'Empty string -> 0 matched, clean message, no throw',
    in: '', count: 0, missing: [1, 2, 3, 4, 5, 6], msgCls: 'err' },

  { n: 'Pure garbage -> 0 matched, clean message, no throw',
    in: 'lorem ipsum 42 !!!   <script>x</script> ////',
    count: 0, missing: [1, 2, 3, 4, 5, 6], msgCls: 'err' },

  { n: 'AC Voltage (L-L) 231.4V is not mistaken for an MPPT reading',
    in: 'AC Vitals\nAC Voltage (L-L)\t231.4V\nLine 1\t116.2V\nFrequency\t59.98Hz',
    count: 0, missing: [1, 2, 3, 4, 5, 6], msgCls: 'err',
    note: 'has a V value but no "/ <n>A" after it' },

  { n: 'Unicode minus and non-breaking spaces normalize',
    in: 'MPPT 1 \n0V / −0A', count: 1, missing: [2, 3, 4, 5, 6],
    vals: { 1: [0, 0] } },

  { n: 'Inverter State / Mode surface as context',
    in: REAL, count: 6, missing: [],
    state: 'Active', mode: 'Grid Following' },
];

console.log('\nPW3 paste parser - test matrix\n' + '='.repeat(78));
for (const c of PASTE_CASES) {
  let got, err = null, problems = [];
  try {
    got = A.parseVitals(c.in);

    if (got.count !== c.count) problems.push(`count ${got.count} != ${c.count}`);
    if (c.missing && got.missing.join(',') !== c.missing.join(','))
      problems.push(`missing [${got.missing}] != [${c.missing}]`);

    for (const id in (c.vals || {})) {
      const want = c.vals[id], have = got.values[id];
      if (!have) { problems.push(`MPPT ${id} not parsed`); continue; }
      if (have.v !== want[0] || have.a !== want[1])
        problems.push(`MPPT ${id} = ${have.v}V/${have.a}A, want ${want[0]}V/${want[1]}A`);
      // Signed zero must fold: Object.is catches -0 slipping through as -0.
      if (want[1] === 0 && Object.is(have.a, -0)) problems.push(`MPPT ${id} A is -0, not 0`);
    }

    if (c.msgCls) {
      const msg = A.pasteMessage(got);
      if (msg.cls !== c.msgCls) problems.push(`msg cls ${msg.cls} != ${c.msgCls}`);
      if (!msg.text || !msg.text.length) problems.push('empty message');
    }
    // Partial matches must name the missing MPPTs explicitly.
    if (got.count > 0 && got.count < 6) {
      const msg = A.pasteMessage(got);
      for (const id of got.missing)
        if (msg.text.indexOf(String(id)) === -1) problems.push(`message omits missing MPPT ${id}`);
    }

    if (c.noNegativeError) {
      // Feed the parsed values through the real validator.
      const r = [];
      for (let i = 1; i <= 6; i++) r.push(got.values[i] ? [got.values[i].v, got.values[i].a] : null);
      const errs = A.hardErrors(build(r), A.VARIANTS['13']);
      const neg = errs.filter(e => /negative/i.test(e));
      if (neg.length) problems.push(`negative-value error raised: ${neg[0]}`);
    }

    if (c.state && got.inverterState !== c.state)
      problems.push(`inverterState "${got.inverterState}" != "${c.state}"`);
    if (c.mode && got.inverterMode !== c.mode)
      problems.push(`inverterMode "${got.inverterMode}" != "${c.mode}"`);

  } catch (e) { err = e; problems.push('THREW: ' + e.message); }

  const ok = !err && problems.length === 0;
  ok ? pass++ : fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${c.n}`);
  if (!ok) problems.forEach(p => console.log(`      ${p}`));
  if (c.note) console.log(`      note: ${c.note}`);
}

const TOTAL = CASES.length + NEG_CASES.length + PASTE_CASES.length;
console.log('='.repeat(78));
console.log(`${pass} passed, ${fail} failed, ${TOTAL} total`);

// Fuzz: no input combination may throw.
let crashes = 0, checked = 0;
const vs = [0, 50, 60, 300, 400, 480, 500, 550, 600];
const as = [0, 0.2, 0.5, 6, 13, 14.9, 15, 20, 26, 30];
for (const v1 of vs) for (const a1 of as) for (const v2 of vs) for (const a2 of as) {
  checked++;
  try { run([[v1,a1],[v2,a2],[v1,a1],[v2,a2],[v1,a1],[v2,a2]]); }
  catch (e) { crashes++; if (crashes < 4) console.log(`CRASH ${v1}/${a1} ${v2}/${a2}: ${e.message}`); }
}
console.log(`\nFuzz: ${checked} combinations, ${crashes} crashes`);

/* ---------- String counter (module data card) ----------
   Feature is OFF unless a module Voc is entered. Every assertion below either
   proves it stays off, or proves the count/limit maths against hand-worked
   numbers -- NOT against the implementation. */

const M45 = { voc: 45, vmp: 45 * 0.83, betaVoc: -0.27, betaVmp: -0.37,
              tLo: 25, tHi: 55, tRecord: -10, plan: 0 };
function withMod(o) { return Object.assign({}, M45, o); }

const STR_CASES = [
  { n: 'Module card empty -> feature entirely inert, no rows, no findings',
    mod: null, r: [[380, 9.5], [380, 9.5], null, null, null, null],
    rows: 0, findings: 0, sev: 0 },

  { n: 'Loaded reading uses Vmp, not Voc (the undercount bug this exists to avoid)',
    mod: M45, r: [[448, 9.5], null, null, null, null, null],
    rows: 1, estLo: 12, estHi: 13,
    note: '448 V / 45 would naively say 10; true string is 12' },

  { n: 'Open-circuit reading uses Voc, and does not over-assert the count',
    mod: M45, r: [[540, 0], null, null, null, null, null],
    rows: 1, estLo: 12, estHi: 13,
    note: '12 mods at 25C and 13 mods at 55C both read ~540 V open-circuit - '
        + 'reporting a bare "12" would be false precision' },

  { n: 'Hot-roof reading of the same 12-module string still estimates 12',
    mod: withMod({ tLo: 25, tHi: 65 }), r: [[382, 9.5], null, null, null, null, null],
    rows: 1, estLoMax: 12, estHiMin: 12,
    note: 'naive 382/45 = 8; range must still contain 12' },

  { n: '12 x 45 Voc planset -> RED, opens at 591 V on a -10 degC morning',
    mod: withMod({ plan: 12 }), r: [[448, 9.5], null, null, null, null, null],
    sev: A.SEV.ERROR, findingHas: 'absolute input maximum' },

  { n: '11 x 45 Voc planset -> not an overvoltage error',
    mod: withMod({ plan: 11 }), r: [[448, 9.5], null, null, null, null, null],
    sevBelow: A.SEV.ERROR },

  { n: 'Planset conflicting with the measured string is flagged',
    mod: withMod({ plan: 8 }), r: [[448, 9.5], null, null, null, null, null],
    findingHas: 'planset says 8' },

  { n: 'Unpowered input with no voltage produces no estimate',
    mod: M45, r: [[0, 0], [0, -0], null, null, null, null], rows: 0 },

  { n: 'Tempco sign is normalized - vendors publish +0.27 and -0.27 alike',
    mod: withMod({ betaVoc: 0.27, betaVmp: 0.37 }), r: [[540, 0], null, null, null, null, null],
    rows: 1, estLo: 12, estHi: 13,
    note: 'must match the -0.27 case exactly' },

  { n: 'String limits for a 45 Voc module: max 11, min 2',
    mod: M45, limits: { maxAbs: 11, maxTrack: 9, minTrack: 2 } },
];

console.log('\nPW3 string counter - test matrix\n' + '='.repeat(78));
for (const c of STR_CASES) {
  const problems = [];
  try {
    const data = build(c.r || [null, null, null, null, null, null]);
    const res = A.analyzeStrings(data, c.mod);

    if (c.rows !== undefined && res.rows.length !== c.rows)
      problems.push(`rows ${res.rows.length} != ${c.rows}`);
    if (c.findings !== undefined && res.findings.length !== c.findings)
      problems.push(`findings ${res.findings.length} != ${c.findings}`);
    if (c.sev !== undefined && res.sev !== c.sev)
      problems.push(`sev ${res.sev} != ${c.sev}`);
    if (c.sevBelow !== undefined && res.sev >= c.sevBelow)
      problems.push(`sev ${res.sev} should be < ${c.sevBelow}`);

    if (c.estLo !== undefined || c.estHi !== undefined ||
        c.estLoMax !== undefined || c.estHiMin !== undefined) {
      const e = res.rows[0] && res.rows[0].est;
      if (!e) problems.push('no estimate produced');
      else {
        if (c.estLo !== undefined && e.lo !== c.estLo) problems.push(`lo ${e.lo} != ${c.estLo}`);
        if (c.estHi !== undefined && e.hi !== c.estHi) problems.push(`hi ${e.hi} != ${c.estHi}`);
        if (c.estLoMax !== undefined && e.lo > c.estLoMax) problems.push(`lo ${e.lo} > ${c.estLoMax}`);
        if (c.estHiMin !== undefined && e.hi < c.estHiMin) problems.push(`hi ${e.hi} < ${c.estHiMin}`);
      }
    }

    if (c.findingHas) {
      const hit = res.findings.some(f => f.txt.indexOf(c.findingHas) !== -1);
      if (!hit) problems.push(`no finding containing "${c.findingHas}"`);
    }

    if (c.limits) {
      const L = A.stringLimits(c.mod);
      for (const k in c.limits)
        if (L[k] !== c.limits[k]) problems.push(`${k} ${L[k]} != ${c.limits[k]}`);
    }
  } catch (e) { problems.push('THREW ' + e.message); }

  if (problems.length) { fail++; console.log(`FAIL  ${c.n}\n      ${problems.join('; ')}`); }
  else { pass++; console.log(`PASS  ${c.n}`); }
  if (c.note) console.log(`      note: ${c.note}`);
}

// A count must never be asserted more precisely than the physics allows: for any
// plausible module and any voltage, the estimate must bracket the true count.
let strChecked = 0, strBad = 0, strCrash = 0;
for (const voc of [37, 40.5, 45, 49.6, 54.2]) {
  for (const ratio of [0.80, 0.83, 0.86]) {
    for (const bv of [-0.24, -0.27, -0.35]) {
      for (const tHi of [40, 55, 65]) {
        const mod = { voc, vmp: voc * ratio, betaVoc: bv, betaVmp: bv - 0.10,
                      tLo: 25, tHi, tRecord: -10, plan: 0 };
        for (let n = 4; n <= 14; n++) {
          for (const loaded of [true, false]) {
            // Build the voltage a real n-module string would show at some cell
            // temperature inside the assumed bracket, then require the estimate
            // to contain n.
            for (const t of [25, (25 + tHi) / 2, tHi]) {
              const per = A.vAtTemp(loaded ? mod.vmp : mod.voc,
                                    loaded ? mod.betaVmp : mod.betaVoc, t);
              const v = n * per;
              strChecked++;
              try {
                const e = A.estimateModules(v, loaded, mod);
                if (!e) { strBad++; continue; }
                if (n < e.lo || n > e.hi) {
                  strBad++;
                  if (strBad < 4) console.log(`RANGE MISS n=${n} v=${v.toFixed(1)} loaded=${loaded} -> [${e.lo},${e.hi}]`);
                }
              } catch (err) { strCrash++; }
            }
          }
        }
      }
    }
  }
}
console.log(`String fuzz: ${strChecked} true-count checks, ${strBad} outside range, ${strCrash} crashes`);

/* ---------- Module presets, cell-temp solver, label escaping ----------
   Fixture is the STRUCTURE of a real Tesla One capture with synthetic values;
   no customer or device identifiers appear here. */

const REAL_PW = [
  'AC Vitals', 'Max Current Output\t', 'Inverter State\tActive',
  'Inverter Mode\tGrid Following', 'Frequency\t59.968Hz',
  'AC Voltage (L-L)\t239.6V', 'Line 1\t119.8V', 'Line 2\t119.8V',
  'Solar DC Inputs',
  'MPPT 1', '', '350V / 6.6A', 'MPPT 2', '', '0V / 0.05A',
  'MPPT 3', '', '245V / 6.25A', 'MPPT 4', '', '0V / 0.15A',
  'MPPT 5', '', '0V / -0A', 'MPPT 6', '', '0V / -0A',
  'Battery', 'Battery State\tActive', 'DCDC State (A/B)\t(Active / Active)',
  'Powerwall Switch\tOn', 'Version\t26.18.3 184289b9',
].join('\n');

const GRID_BLOCK = [
  'Grid', 'Contactor State\tClosed', 'Grid State\tCompliant',
  'Line 1\t119.5V / 59.98Hz', 'Line 2\t119.5V / 59.98Hz', 'Line 3\t0V / 0Hz',
].join('\n');

const QC = A.MODULES[0];
const QCMOD = { voc: QC.voc, vmp: QC.vmp, betaVoc: QC.bvoc, betaVmp: QC.bvmp,
                tLo: 25, tHi: 55, tRecord: -10, plan: 0 };

console.log('\nPW3 presets + cell-temp solver\n' + '='.repeat(78));
let pfail = 0;
function check(name, cond, detail) {
  if (cond) { pass++; console.log(`PASS  ${name}`); }
  else { fail++; pfail++; console.log(`FAIL  ${name}\n      ${detail}`); }
}

// -- Real capture parses with the blank line between label and value --
const rp = A.parseVitals(REAL_PW);
check('Real capture layout (blank line between label and V/A) -> 6 of 6',
  rp.count === 6 && rp.values[1].v === 350 && rp.values[1].a === 6.6 &&
  rp.values[3].v === 245 && rp.values[3].a === 6.25,
  `count=${rp.count} ${JSON.stringify(rp.values)}`);

// -- Grid block alone must yield nothing, and must not poison a combined paste --
const rg = A.parseVitals(GRID_BLOCK);
check('Grid block alone -> 0 MPPTs, no false readings from "Line 1 119.5V / 59.98Hz"',
  rg.count === 0, `count=${rg.count} ${JSON.stringify(rg.values)}`);

const rc = A.parseVitals(GRID_BLOCK + '\n' + REAL_PW);
check('Grid + Powerwall pasted together -> still exactly the 6 MPPT values',
  rc.count === 6 && rc.values[1].v === 350 && rc.values[3].v === 245,
  `count=${rc.count} ${JSON.stringify(rc.values)}`);

// -- Parenthesised labels must not be read as regex groups --
check('Label "AC Voltage (L-L)" is regex-escaped and matches',
  A.grabLabelled(REAL_PW, 'AC Voltage (L-L)') === '239.6V',
  `got ${JSON.stringify(A.grabLabelled(REAL_PW, 'AC Voltage (L-L)'))}`);
check('Label "DCDC State (A/B)" is regex-escaped and matches',
  A.grabLabelled(REAL_PW, 'DCDC State (A/B)') === '(Active / Active)',
  `got ${JSON.stringify(A.grabLabelled(REAL_PW, 'DCDC State (A/B)'))}`);

// -- Solver: two strings, one roof, one temperature --
const solved = A.solveCellTemp([350, 245], QCMOD, 25, 55);
check('Two strings solve to a single shared cell temperature',
  solved && solved.solved && Math.abs(solved.t - 43.5) < 0.2,
  `${JSON.stringify(solved)}`);
check('Solved counts are 10 and 7 modules',
  solved && solved.counts[0] === 10 && solved.counts[1] === 7,
  `${JSON.stringify(solved && solved.counts)}`);

// -- End to end through analyzeStrings --
const rows6 = [1,2,3,4,5,6].map(i => rp.values[i] ? [rp.values[i].v, rp.values[i].a] : null);
const sres = A.analyzeStrings(build(rows6), QCMOD);
const pins = sres.rows.filter(r => r.est.pinned).map(r => r.est.pinned);
check('End to end: pinned counts 10 + 7 = 17 modules (6.97 kW)',
  pins.length === 2 && pins[0] === 10 && pins[1] === 7,
  `pins=${JSON.stringify(pins)}`);

// -- The QCELLS 410 ceiling --
const qlim = A.stringLimits(QCMOD);
check('Q.PEAK 410 ceiling: 11 modules absolute, 9 for MPPT tracking, min 2',
  qlim.maxAbs === 11 && qlim.maxTrack === 9 && qlim.minTrack === 2,
  JSON.stringify(qlim));

// -- Every preset must be self-consistent and yield a sane ceiling --
for (const m of A.MODULES) {
  const mm = { voc: m.voc, vmp: m.vmp, betaVoc: m.bvoc, betaVmp: m.bvmp,
               tLo: 25, tHi: 55, tRecord: -10, plan: 0 };
  const L = A.stringLimits(mm);
  check(`Preset "${m.label}" -> max ${L.maxAbs}/string, Vmp<Voc, sane limits`,
    m.vmp < m.voc && m.bvoc < 0 && m.bvmp < 0 &&
    L.maxAbs >= 8 && L.maxAbs <= 14 && L.minTrack >= 1 &&
    L.maxAbs * A.vAtTemp(m.voc, m.bvoc, -10) <= 550,
    JSON.stringify(L));
}

// -- Solver must refuse a fit that is not there --
const noFit = A.solveCellTemp([350, 247.3], QCMOD, 25, 55);
check('Strings that cannot share one temperature are reported unsolved',
  noFit && !noFit.solved, `${JSON.stringify(noFit)}`);

// -- Feature stays off with no module selected --
const offRes = A.analyzeStrings(build(rows6), null);
check('No module selected -> solver never runs, no rows, no findings',
  offRes.rows.length === 0 && offRes.findings.length === 0 && offRes.solvedT === undefined,
  JSON.stringify(offRes));

// -- Non-finite temperature bounds must return null, not hang the tab --
check('Infinite cell-temp bounds terminate instead of looping forever',
  A.solveCellTemp([350, 245], QCMOD, -Infinity, Infinity) === null &&
  A.solveCellTemp([350, 245], QCMOD, 25, Infinity) === null &&
  A.solveCellTemp([350, 245], QCMOD, NaN, NaN) === null,
  'non-finite bounds must return null');

// -- Solver fuzz: must never throw or invent an impossible count --
let sChk = 0, sBad = 0;
for (const a of [0, 60, 245, 350, 480, 550, 1e6, -5]) {
  for (const b of [0, 100, 245, 350, 1e6]) {
    for (const tl of [-40, 0, 25, 60]) {
      for (const th of [-40, 25, 55, 90]) {
        sChk++;
        try {
          const r = A.solveCellTemp([a, b], QCMOD, Math.min(tl,th), Math.max(tl,th));
          if (r && r.counts.some(c => !isFinite(c) || c < 1)) sBad++;
        } catch (e) { sBad++; }
      }
    }
  }
}
console.log(`Solver fuzz: ${sChk} combinations, ${sBad} bad results`);

/* ---------- Site review: gateway + multiple Powerwalls ----------
   All fixtures synthetic; no device serials or customer identifiers. */

const GW_OK = [
  'Grid', 'Contactor State\tClosed', 'Grid State\tCompliant',
  'Line 1\t119.5V / 59.98Hz', 'Line 2\t119.5V / 59.98Hz', 'Line 3\t0V / 0Hz',
].join('\n');

function mkUnit(o) {
  o = o || {};
  return [
    'AC Vitals', 'Max Current Output\t',
    'Inverter State\t' + (o.state || 'Active'),
    'Inverter Mode\t' + (o.mode || 'Grid Following'),
    'Frequency\t' + (o.freq || '59.968') + 'Hz',
    'AC Voltage (L-L)\t' + (o.vll || '239.6') + 'V',
    'Line 1\t' + (o.l1 || '119.8') + 'V',
    'Line 2\t' + (o.l2 || '119.8') + 'V',
    'Solar DC Inputs',
    'MPPT 1', '', (o.m1 || '350V / 6.6A'),
    'MPPT 2', '', '0V / 0.05A',
    'MPPT 3', '', (o.m3 || '245V / 6.25A'),
    'MPPT 4', '', '0V / 0.15A',
    'MPPT 5', '', '0V / -0A',
    'MPPT 6', '', '0V / -0A',
    'Battery',
    'Battery State\t' + (o.bat || 'Active'),
    'DCDC State (A/B)\t' + (o.dcdc || '(Active / Active)'),
    'Powerwall Switch\t' + (o.sw || 'On'),
    'Version\t' + (o.ver || '26.18.3 184289b9'),
  ].join('\n');
}

const S13 = A.VARIANTS['13'];
function U(label, opts) { return { label, spec: S13, parsed: A.parseUnit(mkUnit(opts)) }; }
function siteHas(site, frag) { return site.findings.some(f => f.txt.indexOf(frag) !== -1); }

console.log('\nPW3 site review\n' + '='.repeat(78));

// -- Section scoping: "Line 1" exists in BOTH gateway Grid and unit AC Vitals --
const gwp = A.parseGateway(GW_OK);
check('Gateway parses: contactor, grid state, and per-line V/Hz',
  gwp.scoped && gwp.contactor === 'Closed' && gwp.gridState === 'Compliant' &&
  gwp.lines[0].v === 119.5 && gwp.lines[0].hz === 59.98 && gwp.lines[2].v === 0,
  JSON.stringify(gwp));

const up = A.parseUnit(mkUnit());
check('Unit parses AC/Battery fields and 6 MPPTs, Line 1 scoped to AC Vitals',
  up.line1 === 119.8 && up.freq === 59.968 && up.vll === 239.6 &&
  up.dcdc === '(Active / Active)' && up.pwSwitch === 'On' && up.mppt.count === 6,
  JSON.stringify({l1:up.line1,f:up.freq,dc:up.dcdc,n:up.mppt.count}));

check('A gateway paste alone yields no MPPT readings',
  A.parseUnit(GW_OK).mppt.count === 0, 'gateway must not produce MPPT values');

// -- Single healthy unit must stay clean --
const one = A.analyzeSite(gwp, [U('PW-1')], QCMOD);
check('One healthy unit + healthy gateway -> nothing flagged',
  one.sev === 0 && one.findings.length === 0 && one.units[0].status.cls === 'green',
  `sev=${one.sev} ${JSON.stringify(one.findings.map(f=>f.t))}`);

// -- THE headline case: faults invisible unit-by-unit --
const dcdcSite = A.analyzeSite(gwp, [U('PW-1'), U('PW-2', { dcdc: '(Active / Inactive)' })], QCMOD);
check('One DC-DC channel down is an ERROR even though that unit reads Healthy alone',
  dcdcSite.sev === A.SEV.ERROR && siteHas(dcdcSite, 'DC-DC channel B') &&
  dcdcSite.units[1].status.cls === 'green',
  `sev=${dcdcSite.sev} unitCls=${dcdcSite.units[1].status.cls}`);

check('Both DC-DC channels down is reported distinctly',
  siteHas(A.analyzeSite(gwp, [U('PW-1', { dcdc: '(Inactive / Inactive)' })], QCMOD),
    'both DC-DC channels'), 'expected both-channel wording');

const swSite = A.analyzeSite(gwp, [U('PW-1'), U('PW-2', { sw: 'Off' })], QCMOD);
check('Powerwall Switch Off on one unit of two -> ERROR',
  swSite.sev === A.SEV.ERROR && siteHas(swSite, 'not contributing'),
  `sev=${swSite.sev}`);

// -- Firmware skew --
const fwSite = A.analyzeSite(gwp, [U('PW-1'), U('PW-2', { ver: '26.14.1 77c2a10e' })], QCMOD);
check('Firmware skew across units is flagged',
  siteHas(fwSite, 'Firmware differs across units'), 'expected firmware finding');
check('Matching firmware on all units is reported as ok',
  siteHas(A.analyzeSite(gwp, [U('PW-1'), U('PW-2')], QCMOD), 'same firmware'),
  'expected same-firmware ok');

// -- Mode disagreement: one forming while another follows --
check('Units in different inverter modes -> ERROR',
  A.analyzeSite(gwp, [U('PW-1'), U('PW-2', { mode: 'Grid Forming' })], QCMOD).sev === A.SEV.ERROR,
  'mode mismatch must be an error');

// -- AC bus coherence, with loose thresholds for non-simultaneous pastes --
check('Small frequency drift between pastes is NOT flagged (0.03 Hz)',
  !siteHas(A.analyzeSite(gwp, [U('PW-1', { freq: '59.968' }), U('PW-2', { freq: '59.998' })], QCMOD),
    'Frequency differs'), 'normal drift must not warn');
check('Structural frequency gap IS flagged (1.2 Hz)',
  siteHas(A.analyzeSite(gwp, [U('PW-1', { freq: '59.9' }), U('PW-2', { freq: '61.1' })], QCMOD),
    'Frequency differs'), 'large gap must warn');
check('Wide L-L spread between units is flagged',
  siteHas(A.analyzeSite(gwp, [U('PW-1', { vll: '239.6' }), U('PW-2', { vll: '208.0' })], QCMOD),
    'AC Voltage (L-L) differs'), 'expected vll spread finding');
check('Unit Line 1 far from the gateway reading is flagged',
  siteHas(A.analyzeSite(gwp, [U('PW-1', { l1: '104.0' })], QCMOD), 'the gateway reads'),
  'expected gateway/unit line delta finding');

// -- Gateway state --
check('Open contactor with units grid following -> ERROR (not islanding)',
  A.analyzeSite(A.parseGateway(GW_OK.replace('Closed', 'Open')), [U('PW-1')], QCMOD).sev === A.SEV.ERROR,
  'open contactor while following must be an error');
check('Open contactor with units grid forming -> informational island, not a fault',
  A.analyzeSite(A.parseGateway(GW_OK.replace('Closed', 'Open')),
    [U('PW-1', { mode: 'Grid Forming' })], QCMOD).sev < A.SEV.ERROR,
  'a consistent island must not be an error');
check('Three-phase gateway (Line 3 live) is noted',
  siteHas(A.analyzeSite(A.parseGateway(GW_OK.replace('Line 3\t0V / 0Hz', 'Line 3\t119.5V / 59.98Hz')),
    [U('PW-1')], QCMOD), 'three-phase service'), 'expected three-phase note');

// -- Production balance, normalised per module --
const prodSite = A.analyzeSite(gwp,
  [U('PW-1'), U('PW-2', { m1: '350V / 1.2A', m3: '245V / 1.0A' })], QCMOD);
check('A unit at a third the per-module output is flagged',
  siteHas(prodSite, 'W per module'), 'expected per-module production finding');
check('Equal per-module output is not flagged',
  !siteHas(A.analyzeSite(gwp, [U('PW-1'), U('PW-2')], QCMOD), 'W per module'),
  'matched units must not warn');
check('Without a module selected, production comparison is skipped with a note',
  siteHas(A.analyzeSite(gwp, [U('PW-1'), U('PW-2')], null), 'watts per module are'),
  'expected the select-a-module note');

// -- Unit cap --
check('More than 4 base units on one gateway is flagged',
  siteHas(A.analyzeSite(gwp, [U('a'), U('b'), U('c'), U('d'), U('e')], QCMOD),
    'maximum of 4 base units'), 'expected unit-cap finding');

// -- Per-unit string counting still runs inside site mode --
check('String counts resolve per unit inside a site review (10 + 7 = 17)',
  one.units[0].modules === 17, `got ${one.units[0].modules} modules`);

// -- Site fuzz: no combination of malformed pastes may throw --
let siteChk = 0, siteCrash = 0;
const FRAGS2 = ['', 'Grid', 'AC Vitals', 'Battery', 'Solar DC Inputs',
  'MPPT 1\n350V / 6.6A', 'DCDC State (A/B)\t()', 'Powerwall Switch\t',
  'Frequency\tNaNHz', 'Line 1\t-0V / -0Hz', 'Inverter Mode\t',
  'AC Voltage (L-L)\tabcV', 'Version\t', '\n\n\n', '((((', 'MPPT 7\n1V / 1A'];
for (const a of FRAGS2) {
  for (const b of FRAGS2) {
    siteChk++;
    try {
      const g = A.parseGateway(a);
      const u = A.parseUnit(b);
      A.analyzeSite(g, [{ label: 'X', spec: S13, parsed: u },
                        { label: 'Y', spec: S13, parsed: A.parseUnit(a) }], QCMOD);
      A.analyzeSite(null, [{ label: 'X', spec: S13, parsed: u }], null);
    } catch (e) {
      siteCrash++;
      if (siteCrash < 4) console.log(`SITE CRASH ${JSON.stringify(a)}/${JSON.stringify(b)}: ${e.message}`);
    }
  }
}
console.log(`Site fuzz: ${siteChk} combinations, ${siteCrash} crashes`);

/* ---------- AC side ---------- */

function AC(o) {
  o = o || {};
  return { line1: o.l1 === undefined ? 119.8 : o.l1,
           line2: o.l2 === undefined ? 119.8 : o.l2,
           line3: o.l3 === undefined ? null : o.l3,
           vll: o.vll === undefined ? 239.6 : o.vll,
           freq: o.freq === undefined ? 59.968 : o.freq,
           maxCurrent: o.maxA === undefined ? null : o.maxA,
           inverterState: o.state === undefined ? 'Active' : o.state };
}
function acHas(res, frag) { return res.findings.some(f => f.txt.indexOf(frag) !== -1); }

console.log('\nPW3 AC side\n' + '='.repeat(78));

// -- The real field capture must come back clean --
const acReal = A.analyzeAC(AC(), { dcW: 3841 });
check('Real capture AC values (119.8/119.8, 239.6 V, 59.968 Hz) -> nothing flagged',
  acReal.sev === 0 && acReal.findings.length === 0,
  JSON.stringify(acReal.findings.map(f => f.txt.slice(0, 60))));

// -- ANSI C84.1 Range A vs IEEE 1547 cease-to-export --
check('126 V per leg is inside Range A (not flagged)',
  !acHas(A.analyzeAC(AC({ l1: 126, l2: 126, vll: 252 })), 'Range A'), 'boundary must pass');
check('128 V per leg is outside Range A -> warning, not error',
  acHas(A.analyzeAC(AC({ l1: 128, l2: 128, vll: 256 })), 'Range A') &&
  A.analyzeAC(AC({ l1: 128, l2: 128, vll: 256 })).sev === A.SEV.WARN, 'expected a warning');
check('134 V per leg is outside IEEE 1547 -> ERROR, explains loss of export',
  A.analyzeAC(AC({ l1: 134, l2: 134, vll: 268 })).sev === A.SEV.ERROR &&
  acHas(A.analyzeAC(AC({ l1: 134, l2: 134, vll: 268 })), 'cease'), 'expected 1547 error');
check('100 V per leg (brownout) -> ERROR',
  A.analyzeAC(AC({ l1: 100, l2: 100, vll: 200 })).sev === A.SEV.ERROR, 'low voltage must error');

// -- Frequency --
check('59.968 Hz is normal', !acHas(A.analyzeAC(AC()), 'frequency is'), 'must not flag');
check('58.9 Hz is outside IEEE 1547 -> ERROR',
  A.analyzeAC(AC({ freq: 58.9 })).sev === A.SEV.ERROR, 'low frequency must error');
check('60.8 Hz is outside IEEE 1547 -> ERROR',
  A.analyzeAC(AC({ freq: 60.8 })).sev === A.SEV.ERROR, 'high frequency must error');

// -- Leg balance and the split-phase L-L identity --
check('Legs 8 V apart are flagged as imbalance',
  acHas(A.analyzeAC(AC({ l1: 124, l2: 116, vll: 240 })), 'legs differ by'), 'expected imbalance');
check('L-L that does not equal L1+L2 is flagged',
  acHas(A.analyzeAC(AC({ l1: 119.8, l2: 119.8, vll: 208 })), 'legs sum to') ||
  acHas(A.analyzeAC(AC({ l1: 119.8, l2: 119.8, vll: 208 })), 'square-root-of-3'),
  'expected an L-L consistency finding');
check('A sqrt(3) L-L relationship is identified as three-phase, not a sense fault',
  acHas(A.analyzeAC(AC({ l1: 120, l2: 120, vll: 207.8 })), 'square-root-of-3'),
  'expected the three-phase wording');

// -- Configured output rating from Max Current Output --
check('Max Current Output 48 A maps to 11.5 kW / 60 A OCPD',
  A.ratingFromCurrent(48).kw === 11.5 && A.ratingFromCurrent(48).ocpd === 60, 'rating map');
check('Max Current Output 31.7 A maps to 7.6 kW / 40 A OCPD',
  A.ratingFromCurrent(31.7).kw === 7.6 && A.ratingFromCurrent(31.7).ocpd === 40, 'rating map');
check('An unrecognised Max Current Output is queried, not silently accepted',
  acHas(A.analyzeAC(AC({ maxA: 37 })), 'does not match any published'), 'expected the query');
check('A blank Max Current Output (as in the real capture) is simply absent',
  A.analyzeAC(AC({ maxA: null })).rating === null &&
  !acHas(A.analyzeAC(AC({ maxA: null })), 'does not match'), 'blank must not warn');

// -- DC present but not inverting --
check('DC flowing with Inverter State Standby -> ERROR (not nightfall)',
  A.analyzeAC(AC({ state: 'Standby' }), { dcW: 3841 }).sev === A.SEV.ERROR &&
  acHas(A.analyzeAC(AC({ state: 'Standby' }), { dcW: 3841 }), 'not being converted'),
  'expected the DC-present error');
check('Standby with no DC is not an AC fault (that is just night)',
  A.analyzeAC(AC({ state: 'Standby' }), { dcW: 0 }).sev === 0, 'night must be silent');

// -- Clipping and DC/AC ratio --
check('DC above the configured AC limit is reported as expected clipping, not a fault',
  acHas(A.analyzeAC(AC({ maxA: 24 }), { dcW: 7000 }), 'clipping right now') &&
  A.analyzeAC(AC({ maxA: 24 }), { dcW: 7000 }).sev <= A.SEV.INFO, 'clipping is informational');
check('A 1.9:1 DC/AC design ratio is flagged for confirmation',
  acHas(A.analyzeAC(AC({ maxA: 24 }), { arrayKw: 11 }), 'DC/AC ratio'), 'expected ratio warning');
check('A 1.2:1 DC/AC ratio is not flagged',
  !acHas(A.analyzeAC(AC({ maxA: 48 }), { arrayKw: 13.8 }), 'DC/AC ratio'), 'normal ratio');
check('An array above the 20 kW DC per-unit maximum is an ERROR',
  A.analyzeAC(AC({ maxA: 48 }), { arrayKw: 22 }).sev === A.SEV.ERROR, 'over 20 kW must error');

// -- AC data reaches the single-unit path from a paste --
const pvAc = A.parseVitals(mkUnit({ vll: '239.6' }));
check('parseVitals exposes AC context scoped to the AC Vitals section',
  pvAc.ac && pvAc.ac.line1 === 119.8 && pvAc.ac.vll === 239.6 && pvAc.ac.freq === 59.968,
  JSON.stringify(pvAc.ac));
check('A gateway+unit combined paste does not read gateway Line 1 as the unit AC',
  A.parseVitals(GW_OK + '\n' + mkUnit()).ac.line1 === 119.8,
  'must take 119.8 from AC Vitals, not 119.5 from Grid');

// -- AC severity reaches the site verdict --
const acSite = A.analyzeSite(gwp, [U('PW-1', { vll: '268', l1: '134', l2: '134' })], QCMOD);
check('An AC fault on one unit makes the site verdict Fault',
  acSite.sev === A.SEV.ERROR && acSite.units[0].status.cls === 'red',
  `sev=${acSite.sev} cls=${acSite.units[0].status.cls}`);

// -- Gateway AC is checked too --
check('Gateway line voltage out of 1547 range is flagged against the Gateway',
  A.analyzeSite(A.parseGateway(GW_OK.replace(/119\.5V/g, '136.0V')), [U('PW-1')], QCMOD)
    .findings.some(f => f.txt.indexOf('Gateway') !== -1 && f.txt.indexOf('Line') !== -1),
  'expected a gateway AC finding');

// -- Boundary inclusivity: floating point must not flag a reading on the limit --
check('Range A limits are inclusive at both ends (114 and 126 V)',
  A.vClass(126, 120) === 'ok' && A.vClass(114, 120) === 'ok' &&
  A.vClass(252, 240) === 'ok' && A.vClass(228, 240) === 'ok',
  `126->${A.vClass(126,120)} 114->${A.vClass(114,120)}`);
check('Just outside Range A is classified "range", not "ok"',
  A.vClass(126.5, 120) === 'range' && A.vClass(113.5, 120) === 'range',
  `126.5->${A.vClass(126.5,120)}`);
check('IEEE 1547 limits are inclusive (105.6 and 132 V)',
  A.vClass(132, 120) === 'range' && A.vClass(105.6, 120) === 'range' &&
  A.vClass(132.5, 120) === 'trip' && A.vClass(105, 120) === 'trip',
  `132->${A.vClass(132,120)} 105.6->${A.vClass(105.6,120)}`);

// -- Non-finite readings must never reach the finding text --
check('acNum rejects NaN, Infinity, non-numbers and non-positive values',
  A.acNum(NaN) === null && A.acNum(Infinity) === null && A.acNum(-Infinity) === null &&
  A.acNum('119.8') === null && A.acNum(0) === null && A.acNum(-1) === null &&
  A.acNum(119.8) === 119.8, 'guard must reject all of these');
check('Infinity frequency produces no finding rather than "Infinity Hz"',
  A.analyzeAC(AC({ freq: Infinity })).findings.length === 0,
  JSON.stringify(A.analyzeAC(AC({ freq: Infinity })).findings.map(f => f.txt.slice(0, 50))));
check('NaN voltages produce no findings',
  A.analyzeAC(AC({ l1: NaN, l2: NaN, vll: NaN })).findings.length === 0,
  'NaN must be silent');

// -- AC fuzz --
let acChk = 0, acBad = 0;
const NUMS = [null, 0, -1, 0.001, 60, 119.8, 126, 134, 240, 1e6, NaN, Infinity];
for (const l1 of NUMS) for (const vll of NUMS) for (const f of NUMS) {
  acChk++;
  try {
    const r = A.analyzeAC({ line1: l1, line2: l1, line3: null, vll: vll, freq: f,
                            maxCurrent: l1, inverterState: 'Active' },
                          { dcW: 3841, arrayKw: 7 });
    if (!r || !isFinite(r.sev)) acBad++;
    for (const fd of r.findings) if (/NaN|Infinity|undefined/.test(fd.txt)) acBad++;
  } catch (e) { acBad++; if (acBad < 4) console.log(`AC CRASH ${l1}/${vll}/${f}: ${e.message}`); }
}
console.log(`AC fuzz: ${acChk} combinations, ${acBad} bad results`);

/* ---------- CSS token integrity ----------
   Every var(--x) must resolve to a token declared in :root. An undefined custom
   property fails SILENTLY in the browser - the declaration is simply dropped, so
   a card loses its background or radius with no error anywhere. Caught exactly
   that: --err, --field and --r-input were referenced but never defined. */
(function () {
  const css = (html.match(/<style>([\s\S]*?)<\/style>/) || [, ''])[1];
  const rootBlock = (css.match(/:root\{([\s\S]*?)\n\}/) || [, ''])[1];
  const defined = new Set((rootBlock.match(/--[\w-]+\s*:/g) || [])
    .map(s => s.replace(/\s*:$/, '')));
  const referenced = new Set((css.match(/var\((--[\w-]+)\)/g) || [])
    .map(s => s.replace(/^var\(|\)$/g, '')));
  const missing = [...referenced].filter(v => !defined.has(v)).sort();
  check('Every CSS custom property referenced is defined in :root',
    missing.length === 0, `undefined: ${missing.join(', ')}`);
  check('Single <style> and single <script> block (harness + offline contract)',
    (html.match(/<style>/g) || []).length === 1 &&
    (html.match(/<script>/g) || []).length === 1,
    'exactly one of each is required');
  check('No external network references in the document',
    !/(src|href)\s*=\s*["']https?:/i.test(html.replace(/<!--[\s\S]*?-->/g, '')),
    'the file must work offline from file://');
  check('Crawler-exclusion and referrer directives intact',
    (html.match(/noindex/g) || []).length >= 3 && /no-referrer/.test(html),
    'DESIGN.md requires these on every page');
})();





// No input may throw, including hostile module data.
let mCrash = 0, mChecked = 0;
const WEIRD = [0, -1, NaN, Infinity, 1e9, 0.0001];
for (const voc of WEIRD) for (const vmp of WEIRD) for (const b of WEIRD) for (const t of WEIRD) {
  mChecked++;
  try {
    const mod = { voc, vmp, betaVoc: b, betaVmp: b, tLo: t, tHi: t, tRecord: t, plan: 3 };
    A.estimateModules(400, true, mod);
    A.stringLimits(mod);
    A.analyzeStrings(build([[400, 9], [400, 9], null, null, null, null]), mod);
  } catch (e) { mCrash++; if (mCrash < 4) console.log(`MOD CRASH ${voc}/${vmp}/${b}/${t}: ${e.message}`); }
}
console.log(`Module fuzz: ${mChecked} combinations, ${mCrash} crashes`);



// Paste fuzz: no input may throw, and a parse that finds nothing must say so.
const FRAGS = ['MPPT', 'MPPT 1', 'mppt7', 'MPPT 12', '0V', '/ -0A', '380V / 9.5A',
  'V / A', 'AC Voltage (L-L)\t231.4V', '', '\n', '\t\t', '   ', '−0', 'NaN',
  'Inverter State', '</script>', '%%%', '1.2.3', '-', 'V/A', '999V / 999A'];
let pCrash = 0, pChecked = 0, pBadMsg = 0;
for (const a of FRAGS) for (const b of FRAGS) for (const c of FRAGS) {
  const input = a + '\n' + b + ' ' + c;
  pChecked++;
  try {
    const r = A.parseVitals(input);
    const msg = A.pasteMessage(r);
    if (!msg || !msg.text || !msg.cls) pBadMsg++;
    if (r.count === 0 && msg.cls !== 'err') pBadMsg++;
    // No parsed current may be -0, and no value may be NaN.
    for (const id in r.values) {
      if (Object.is(r.values[id].a, -0) || Object.is(r.values[id].v, -0)) pBadMsg++;
      if (isNaN(r.values[id].a) || isNaN(r.values[id].v)) pBadMsg++;
    }
  } catch (e) {
    pCrash++;
    if (pCrash < 4) console.log(`PASTE CRASH on ${JSON.stringify(input)}: ${e.message}`);
  }
}
console.log(`Paste fuzz: ${pChecked} combinations, ${pCrash} crashes, ${pBadMsg} bad messages`);

process.exit(fail || crashes || pCrash || pBadMsg || strBad || strCrash || mCrash || sBad || siteCrash || acBad ? 1 : 0);
