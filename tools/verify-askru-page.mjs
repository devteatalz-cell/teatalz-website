#!/usr/bin/env node
// ============================================================================
// verify-askru-page.mjs — structural checks on askru/index.html. Read-only.
//
//   node tools/verify-askru-page.mjs
//
// 🔴 WHY THIS FILE EXISTS, 2 Nov 2026.
//
// The founder: *"agar maine english select kari website pe to bhi ru hinglish
// mai answer karte hai."*
//
// The language dropdown had been wired to the JOIN request only. The three
// requests that actually produce a reading — the first reading, the follow-up
// and the spread — sent no language at all, so the server was never told and
// the model guessed from the question. The server half of the fix was written,
// typechecked and DEPLOYED, and did nothing, because the page it depended on
// was not sending the field.
//
// That was found by taking a reading on the live site. Nothing in this repo
// could have caught it: there is no test suite here, and the page is one file.
// So the invariants that matter are written here, in the shape this repo
// already uses for `verify-seo.mjs` — a claim you can re-run instead of a
// claim somebody remembers checking.
//
// Exits non-zero if anything fails.
// ============================================================================
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILE = path.join(ROOT, 'askru', 'index.html');
const html = readFileSync(FILE, 'utf8');

const fails = [], warns = [];
const fail = (m) => fails.push(m);
const warn = (m) => warns.push(m);
const count = (re) => (html.match(re) || []).length;

/* ── 🔴 THE INSTRUMENT, BEFORE ANY CONCLUSION ───────────────────────────────
   Every check below is "this string is present / absent". A file that failed
   to load, or a rename that moved everything, would make them all pass or all
   fail for a reason that has nothing to do with the page being right. So:
   prove the file is the one we think it is, first. */
for (const [needle, what] of [
  ['id="try-lang"', 'the language dropdown'],
  ["api('try-ru'", 'the try-ru calls'],
  ['id="try-join"', 'the join panel'],
]) {
  if (!html.includes(needle)) {
    console.error(`REFUSED: ${what} (${needle}) is not in askru/index.html — this script is checking the wrong file or the page was restructured, and every result below would be meaningless.`);
    process.exit(2);
  }
}

// ---- 🔴 every try-ru call that produces a reply carries the language -------
/* The defect of 2 Nov. `withLang()` is the single place that attaches it;
   counting the CALLS and comparing against the call sites is what catches a
   fourth one being added without it. */
const tryRuCalls = count(/api\('try-ru'/g);
const withLangUses = count(/withLang\(/g);

if (!/function withLang\(/.test(html)) {
  fail('withLang() is gone — the language is being attached by hand again, or not at all');
}

/* 🔴 NOT "every call", BECAUSE NOT EVERY CALL PRODUCES A REPLY — and the
   first version of this check got that wrong and failed on the real file.
   One try-ru call is a GET for prices and state; another is the token probe,
   `{ token, places: 'aa' }`, which asks the server to validate a session and
   returns a list. Neither reaches a model, so neither needs a language.

   ⚠️ THE EXEMPTION IS A PRINCIPLE, NOT A HARD-CODED NAME. "Skip the one with
   `places`" would be a list hiding its own exception, and the next probe
   added would pass silently. What makes a request a READING is that it
   carries something to read: a question, a mode, or a spread flag. Those are
   the ones that must carry the language. */
const REPLY_FIELDS = /\b(question|mode|deeper|clarify)\s*:/;
const bodyCalls = [...html.matchAll(/api\('try-ru'[^)]*\{\s*body:\s*([^\n]*)/g)].map((m) => m[1].trim());
const inlineBodies = bodyCalls.filter((b) => b.startsWith('{'));
for (const b of inlineBodies) {
  if (!REPLY_FIELDS.test(b)) continue;            // a probe, not a reading
  if (!b.includes('withLang(')) {
    fail(`a try-ru call builds a READING body inline WITHOUT withLang: ${b.slice(0, 70)} — this is exactly the 2 Nov defect`);
  }
}
/* Bodies passed by variable (`body: body`, `body: payload`) are built above
   the call; check those variables were assigned through withLang. */
for (const name of ['body', 'payload']) {
  if (bodyCalls.some((b) => b.startsWith(name))) {
    const assigned = new RegExp(`var ${name} = withLang\\(`).test(html);
    if (!assigned) fail(`try-ru is called with \`${name}\`, and \`var ${name} =\` does not go through withLang`);
  }
}
if (withLangUses < 4) {
  warn(`withLang appears ${withLangUses} times (1 definition + ${withLangUses - 1} uses) — there were 3 uses on 2 Nov; fewer means a reading path lost it`);
}

// ---- 🔴 the page opens at the top ------------------------------------------
if (!/history\.scrollRestoration = 'manual'/.test(html)) {
  fail("scrollRestoration is not set to 'manual' — a reload will land wherever the visitor last was");
}
if (!/function showPick\(scroll\)/.test(html)) {
  fail('showPick() lost its `scroll` argument — a page LOAD will scroll past the hero again');
}
if (!/showPick\(false\)/.test(html)) fail('the stored-token restore no longer passes false');
if (!/showPick\(true\)/.test(html)) fail('the join path no longer passes true — somebody who just joined is left where they were');

// ---- 🔴 a payer is brought back --------------------------------------------
if (!/razorpay_payment_link_id/.test(html)) {
  fail('the page no longer notices a return from Razorpay');
}
if (!/history\.replaceState/.test(html)) {
  warn('the Razorpay ids may no longer be stripped from the URL after a return');
}

// ---- the Meta pixel: exactly once ------------------------------------------
/* 🔴 NOT a count of the pixel id. The comment in the page used to say that
   count should be 2 and it is 4, because the comment contains the id twice —
   a check written inside the file it checks is part of its own answer. What
   has to be true is that the pixel initialises once and fires PageView once. */
const inits = count(/fbq\(\s*'init'/g);
const views = count(/fbq\(\s*'track'\s*,\s*'PageView'/g);
if (inits !== 1) fail(`fbq('init') appears ${inits} times, expected exactly 1 — more than one double-counts every ad metric`);
if (views !== 1) fail(`fbq('track','PageView') appears ${views} times, expected exactly 1`);

// ---- the visit beacon: arrival and departure, one key ----------------------
if (count(/askru-visit/g) !== 1) {
  warn('askru-visit is referenced more than once — check it is still one endpoint behind one send()');
}

// ---- report ----------------------------------------------------------------
console.log('-'.repeat(60));
console.log(`askru/index.html — ${html.length.toLocaleString()} bytes, ${tryRuCalls} try-ru calls, ${withLangUses} withLang references`);
if (warns.length) { console.log(`\n${warns.length} warning(s):`); warns.forEach((w) => console.log(`  ~ ${w}`)); }
if (fails.length) { console.log(`\n${fails.length} FAILURE(S):`); fails.forEach((f) => console.log(`  x ${f}`)); }
else console.log('\nPASS — no failures.');
process.exit(fails.length ? 1 : 0);
