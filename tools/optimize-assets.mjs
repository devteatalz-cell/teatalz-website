#!/usr/bin/env node
// ============================================================================
// optimize-assets.mjs — shrink the static images in assets/.
//
// Run once by hand (not in CI — the sources rarely change):
//   node tools/optimize-assets.mjs
//
// Why each size: the logo has two display boxes — 34x34 in the nav
// (styles.css .brand img) and 190x190 in the hero orb (.orb) — so one 512px
// WebP covers both at well past 2x DPR. rume.png renders at 150px wide (112px
// on mobile), so 400px covers 2.5x. Serving the 1016px and 1706px originals
// into those boxes was the whole problem.
//
// teatalz-logo-512.png exists only for the Organization JSON-LD "logo" field —
// schema consumers are not all WebP-friendly, so that one stays PNG.
//
// Originals are left on disk untouched — nothing here is destructive.
// ============================================================================
import sharp from 'sharp';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ASSETS = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'assets');
const kb = (n) => (n / 1024).toFixed(1).padStart(6) + ' KB';

const src = path.join(ASSETS, 'teatalz-logo.png');
if (!existsSync(src)) { console.error(`missing ${src}`); process.exit(1); }
const logo = readFileSync(src);

const jobs = [
  // nav (34px) + hero orb (190px) — same aspect ratio, so object-fit:cover renders identically
  { from: logo, out: 'teatalz-logo.webp', op: (s) => s.resize({ width: 512 }).webp({ quality: 88 }) },
  // for the Organization JSON-LD logo field only — not fetched on pageview
  { from: logo, out: 'teatalz-logo-512.png', op: (s) => s.resize({ width: 512 }).png({ compressionLevel: 9, palette: true, quality: 92 }) },
  // favicons — square, transparent padding, no crop
  { from: logo, out: 'favicon-32.png',  op: (s) => s.resize(32, 32,   { fit: 'contain', background: { r:0,g:0,b:0,alpha:0 } }).png({ compressionLevel: 9 }) },
  // apple-touch-icon: Safari fetches this on ordinary pageviews too, so palette it down
  { from: logo, out: 'favicon-180.png', op: (s) => s.resize(180, 180, { fit: 'contain', background: { r:0,g:0,b:0,alpha:0 } }).png({ compressionLevel: 9, palette: true, quality: 90 }) },
];

const rumeSrc = path.join(ASSETS, 'rume.png');
if (existsSync(rumeSrc)) {
  jobs.push({ from: readFileSync(rumeSrc), out: 'rume.webp', op: (s) => s.resize({ width: 400 }).webp({ quality: 86 }) });
}

let before = 0, after = 0;
for (const j of jobs) {
  const buf = await j.op(sharp(j.from)).toBuffer();
  await sharp(buf).toFile(path.join(ASSETS, j.out));
  const m = await sharp(buf).metadata();
  console.log(`${j.out.padEnd(20)} ${String(m.width).padStart(4)}x${String(m.height).padEnd(4)} ${kb(buf.length)}`);
  after += buf.length;
}
before = logo.length + (existsSync(rumeSrc) ? readFileSync(rumeSrc).length : 0);
console.log('\n' + '-'.repeat(50));
console.log(`originals (still on disk): ${kb(before)}`);
console.log(`generated total:           ${kb(after)}`);
console.log(`per pageview saving:       ${kb(before - after)}  (${(before / after).toFixed(1)}x)`);
