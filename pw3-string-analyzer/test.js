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

process.exit(fail || crashes || pCrash || pBadMsg ? 1 : 0);
