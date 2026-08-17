#!/usr/bin/env node
/**
 * Standing rule 3 gate.
 *
 * WHY THIS EXISTS AS A SCRIPT
 * v1.36 was briefed with two greps for the exact phrases "needs a truck roll" and
 * "fully remote fix". Both returned 0 and the release shipped — but two live
 * capability claims survived, because they read "a fast, fully remote way" and
 * "fully remotely". Matching exact phrases cannot hold a rule about MEANING.
 *
 * THE RULE: a card may state what the corrective action IS and where it lives.
 * It may not state whether the portal exposes it, or whether a truck is needed.
 * Portal capability varies across the three monitoring platforms and nothing in
 * an export reveals it.
 *
 * WHAT IS DELIBERATELY ALLOWED: conditional escalation ("If it escalates:
 * dispatch to verify X") makes no capability claim and is kept — 23 instances.
 * Comment lines are skipped: the changelog DESCRIBES removing these phrases, and
 * a naive grep counting comments has produced a false gate failure twice.
 */
const fs = require('fs');
const src = fs.readFileSync(process.argv[2], 'utf8');

const BANNED = [
  [/fully remote/i,                          'asserts the portal exposes a remote fix'],
  // v1.37 EXEMPTIONS, both verified against the build and NOT violations:
  //  - "If it is not adjustable remotely:" — a CONDITIONAL branch. The same card
  //    states capability "depends on the platform and on your access level — this
  //    tool cannot tell which". It asserts nothing; it is the model wording.
  //  - "the same evidence, obtained remotely" — describes how the EVIDENCE was
  //    obtained (an export the reader already has), not that a FIX is available.
  // A rule about meaning needs exemptions for meaning. Verify any new exemption
  // by reading the full card text, not the matching line alone.
  [/remotely\b(?![ ]whether)/i,              'asserts remote actionability',
   /not adjustable remotely|obtained remotely|adjustable from the (portal|monitoring)/i],
  [/remote(?:ly)? (?:fix|resolv|correct)/i,  'asserts a remote fix exists'],
  [/needs? a truck/i,                        'asserts dispatch necessity'],
  [/requires? a truck/i,                     'asserts dispatch necessity'],
  [/truck[- ]roll item/i,                    'asserts dispatch necessity'],
  [/no truck (?:needed|required|roll)/i,      'asserts dispatch is unnecessary'],
  [/can be fixed remotely/i,                 'asserts remote capability'],
  [/free and remote/i,                       'asserts remote capability'],
];

const lines = src.split('\n');
let fails = 0;
lines.forEach((line, i) => {
  const t = line.trim();
  if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) return;
  for (const [rx, why, exempt] of BANNED) {
        const m = line.match(rx);
    if (m && !(exempt && exempt.test(line))) {
      fails++;
      const at = line.indexOf(m[0]);
      console.log(`FAIL line ${i + 1}: [${m[0]}] ${why}`);
      console.log(`   ...${line.slice(Math.max(0, at - 90), at + 90).trim()}...`);
    }
  }
});
console.log(fails === 0
  ? 'PASS - no standing-rule-3 capability or dispatch claims in live code'
  : `FAIL - ${fails} violation(s)`);
process.exit(fails === 0 ? 0 : 1);
