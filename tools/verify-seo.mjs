#!/usr/bin/env node
// ============================================================================
// verify-seo.mjs — check what actually got generated. Read-only.
//
//   node tools/verify-seo.mjs
//
// Exists so a claim like "every post has a unique title and description" is
// something we can re-run rather than something someone remembers checking.
// Exits non-zero if anything fails.
// ============================================================================
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const fails = [], warns = [];
const fail = (m) => fails.push(m);
const warn = (m) => warns.push(m);

const grab = (html, re) => { const m = re.exec(html); return m ? m[1] : null; };
const pick = (html, prop) =>
  grab(html, new RegExp(`<meta\\s+(?:property|name)="${prop}"\\s+content="([^"]*)"`, 'i')) ??
  grab(html, new RegExp(`content="([^"]*)"\\s+(?:property|name)="${prop}"`, 'i'));

// ---- generated post pages --------------------------------------------------
const blogDir = path.join(ROOT, 'blog');
if (!existsSync(blogDir)) { console.error('no blog/ directory — run tools/prerender.mjs first'); process.exit(1); }

const slugs = readdirSync(blogDir).filter((d) =>
  d !== 'covers' && statSync(path.join(blogDir, d)).isDirectory());

const titles = new Map(), descs = new Map();
console.log(`checking ${slugs.length} generated post pages\n`);

for (const slug of slugs) {
  const f = path.join(blogDir, slug, 'index.html');
  if (!existsSync(f)) { fail(`${slug}: no index.html`); continue; }
  const html = readFileSync(f, 'utf8');
  const where = slug.slice(0, 44);

  const title = grab(html, /<title>([^<]*)<\/title>/);
  const desc = pick(html, 'description');
  const canon = grab(html, /rel="canonical"\s+href="([^"]*)"/);
  const ogImg = pick(html, 'og:image');
  const ogUrl = pick(html, 'og:url');

  if (!title || /^Teatalz Blog$/.test(title)) fail(`${where}: bad <title> (${title})`);
  if (!desc || desc.length < 50) fail(`${where}: description missing or too short (${desc?.length ?? 0} chars)`);
  if (desc && desc.length > 165) warn(`${where}: description ${desc.length} chars — Google truncates around 155-160`);
  if (title && desc && title.replace(' — Teatalz', '') === desc) fail(`${where}: description is just the title again`);
  if (canon !== `https://teatalz.com/blog/${slug}/`) fail(`${where}: canonical wrong (${canon})`);
  if (!ogImg) fail(`${where}: no og:image`);
  if (!ogUrl) fail(`${where}: no og:url`);
  if (!/twitter:card/.test(html)) fail(`${where}: no twitter:card`);

  if (titles.has(title)) fail(`duplicate <title> shared by ${slug} and ${titles.get(title)}`);
  titles.set(title, slug);
  if (descs.has(desc)) fail(`duplicate description shared by ${slug} and ${descs.get(desc)}`);
  descs.set(desc, slug);

  // heading hierarchy: exactly one h1, and no h3 appearing before any h2
  const h1s = (html.match(/<h1[\s>]/gi) || []).length;
  if (h1s !== 1) fail(`${where}: ${h1s} <h1> elements`);
  const body = html.slice(html.indexOf('post-body'));
  const seq = [...body.matchAll(/<h([234])[\s>]/gi)].map((m) => +m[1]);
  if (seq.length && seq[0] !== 2) fail(`${where}: first body heading is h${seq[0]}, should be h2`);

  // schema
  const ld = grab(html, /<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  if (!ld) fail(`${where}: no JSON-LD`);
  else {
    let parsed;
    try { parsed = JSON.parse(ld); } catch (e) { fail(`${where}: JSON-LD does not parse (${e.message})`); }
    if (parsed) {
      const types = (parsed['@graph'] || [parsed]).map((x) => x['@type']);
      if (!types.includes('Article')) fail(`${where}: no Article schema`);
      if (!types.includes('BreadcrumbList')) fail(`${where}: no BreadcrumbList schema`);
      const art = (parsed['@graph'] || []).find((x) => x['@type'] === 'Article');
      if (art && !art.datePublished) fail(`${where}: Article has no datePublished`);
    }
  }

  // every local asset the page references must exist on disk
  for (const m of html.matchAll(/(?:src|href)="(\/[^"]+\.(?:webp|png|css|js|json))"/g)) {
    if (!existsSync(path.join(ROOT, m[1]))) fail(`${where}: references missing file ${m[1]}`);
  }
  for (const m of html.matchAll(/srcset="([^"]+)"/g)) {
    for (const part of m[1].split(',')) {
      const url = part.trim().split(/\s+/)[0];
      if (url.startsWith('/') && !existsSync(path.join(ROOT, url))) fail(`${where}: srcset missing ${url}`);
    }
  }
  if (!/alt="[^"]+"/.test(html)) fail(`${where}: cover image has no alt text`);
}

// ---- static pages ----------------------------------------------------------
const STATIC = ['index.html', 'blog.html', 'about.html', 'contact.html', 'privacy.html', 'terms.html', 'refund.html'];
console.log('checking static pages\n');
for (const f of STATIC) {
  const html = readFileSync(path.join(ROOT, f), 'utf8');
  if (!/rel="canonical"/.test(html)) fail(`${f}: no canonical`);
  if (!pick(html, 'og:url')) fail(`${f}: no og:url`);
  if (!pick(html, 'description')) fail(`${f}: no meta description`);
  if (!pick(html, 'og:image')) warn(`${f}: no og:image — needs a share card asset (see SEO-P1-6)`);
  for (const m of html.matchAll(/(?:src|href)="((?:\/|assets\/)[^"]+\.(?:webp|png|css|js))"/g)) {
    const rel = m[1].startsWith('/') ? m[1].slice(1) : m[1];
    if (!existsSync(path.join(ROOT, rel))) fail(`${f}: references missing file ${m[1]}`);
  }
}

// ---- sitemap ---------------------------------------------------------------
const sm = readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
const locs = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
console.log('checking sitemap\n');
for (const slug of slugs) {
  if (!locs.includes(`https://teatalz.com/blog/${slug}/`)) fail(`sitemap missing ${slug}`);
}
if (locs.some((l) => l.includes('post.html'))) fail('sitemap still lists post.html URLs');
if (new Set(locs).size !== locs.length) fail('sitemap has duplicate <loc> entries');

// ---- robots ----------------------------------------------------------------
const robots = readFileSync(path.join(ROOT, 'robots.txt'), 'utf8');
if (/^\s*Disallow:\s*\/investor\.html/mi.test(robots))
  fail('robots.txt still disallows investor.html — that blocks its own noindex from being read');
if (!/Sitemap:/i.test(robots)) fail('robots.txt has no Sitemap line');

// ---- report ----------------------------------------------------------------
console.log('-'.repeat(60));
if (warns.length) { console.log(`\n${warns.length} warning(s):`); warns.forEach((w) => console.log(`  ~ ${w}`)); }
if (fails.length) { console.log(`\n${fails.length} FAILURE(S):`); fails.forEach((f) => console.log(`  x ${f}`)); }
else console.log(`\nPASS — ${slugs.length} posts, ${STATIC.length} static pages, ${locs.length} sitemap URLs, no failures.`);
process.exit(fails.length ? 1 : 0);
