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

const SETS = A.SETS, ON_A = A.ON_A;

// r = [[v1,a1],[v2,a2],...x6]; null entry = field left blank
function build(r) {
  const sets = [];
  for (let s = 0; s < SETS.length; s++) {
    const def = SETS[s], mppts = [];
    for (let i = 0; i < 2; i++) {
      const id = def.ids[i], raw = r[id - 1];
      const entered = raw !== null && raw !== undefined;
      const v = entered ? raw[0] : 0, a = entered ? raw[1] : 0;
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
];

let pass = 0, fail = 0;
console.log('PW3 String Analyzer v4.0 - test matrix\n' + '='.repeat(78));
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
console.log(`${pass} passed, ${fail} failed, ${CASES.length} total`);

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
process.exit(fail || crashes ? 1 : 0);
