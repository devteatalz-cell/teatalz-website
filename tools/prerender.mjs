#!/usr/bin/env node
// ============================================================================
// prerender.mjs — turn the Supabase blog into real static files.
//
//   node tools/prerender.mjs            # write files
//   node tools/prerender.mjs --dry-run  # print what it would write, touch nothing
//
// WHY THIS EXISTS
//   Every post used to render client-side from one shell (post.html?slug=...),
//   so every post's source HTML was identical: <title>Teatalz Blog</title>, no
//   description, no image. Social previews were blank and identical for all 12
//   posts, and crawlers had to execute JS to see anything.
//
// WHAT IT WRITES  (and nothing else — see --dry-run)
//   blog/<slug>/index.html   a real page per post: title, meta description,
//                            OG + Twitter tags, Article + BreadcrumbList JSON-LD
//   blog/covers/<slug>-400.webp    card thumbnail (cards render at ~280px)
//   blog/covers/<slug>-520.webp    post hero, 1x  (.post-cover box is 520px)
//   blog/covers/<slug>-1040.webp   post hero, 2x — also the og:image
//   blog/posts.json          tiny index for blog.html + the homepage, so neither
//                            has to pull 3.3 MB of base64 out of the database
//   sitemap.xml              regenerated with every post + lastmod
//
//   blog_posts.cover_url keeps its base64 data URI. Nothing is written back to
//   the database and blog-admin.html is untouched — this only ever reads.
// ============================================================================
import sharp from 'sharp';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const DRY = process.argv.includes('--dry-run');
const SITE = 'https://teatalz.com';
const ORG = 'Teatalz House of Rume Private Limited';

/* ── The brand suffix, but only when it will actually be seen ─────────────
 *
 * Every post title used to end `" — Teatalz"` unconditionally. Measured on the
 * live pages, 8 of 12 titles then ran past the ~62 characters a search result
 * shows, the longest at 73.
 *
 * **Google truncates from the END — which is exactly where the suffix sits.**
 * So on every title that was too long, the ten characters being paid for the
 * brand were the ten characters not being shown, and they were being paid for
 * with the tail of the headline. "Why It's Sometimes Easier to Talk to an AI
 * Than to a…" loses the payoff and the brand dies anyway.
 *
 * So the suffix is appended only when the whole thing still fits. The rule is
 * encoded rather than the eight exceptions, so a long title written next month
 * gets the same treatment without anybody remembering this.
 *
 * ⚠ 62 is a working proxy, not a boundary Google publishes — truncation is by
 * pixel width, around 600px, so a title of wide characters can clip earlier.
 * And Google rewrites titles when it prefers its own; shortening reduces the
 * reason, it does not remove the possibility.
 */
const TITLE_BUDGET = 62;
const BRAND_SUFFIX = ' — Teatalz';

function titleTag(title) {
  const full = `${title}${BRAND_SUFFIX}`;
  return full.length <= TITLE_BUDGET ? full : title;
}

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://zoceydoogxrpmmlxwhvd.supabase.co';
const SUPABASE_ANON = process.env.SUPABASE_ANON_KEY || readAnonFromSite();

// The anon key is already public in app.js (RLS-protected, insert-only) and it
// has to stay there for the waitlist form — so read it from there rather than
// keeping a second copy in this file that can drift out of sync.
function readAnonFromSite() {
  const m = /SUPABASE_ANON\s*=\s*"([^"]+)"/.exec(readFileSync(path.join(ROOT, 'app.js'), 'utf8'));
  if (!m) throw new Error('could not find SUPABASE_ANON in app.js — pass SUPABASE_ANON_KEY instead');
  return m[1];
}

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const written = [];
function write(rel, data) {
  written.push([rel, data.length]);
  if (DRY) return;
  const abs = path.join(ROOT, rel);
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, data);
}

// ---------------------------------------------------------------------------
// content clean-ups applied at build time
// ---------------------------------------------------------------------------

// Every post uses <h3> for its top-level section headings and has no <h2> at
// all, so the document goes h1 -> h3. Promote, but only when the post really
// has no h2 — otherwise a future post with a proper h2/h3 structure would get
// flattened.
function fixHeadings(html) {
  if (/<h2[\s>]/i.test(html)) return html;
  return html.replace(/<(\/?)h3([\s>])/gi, '<$1h2$2');
}

// Meta description: real excerpt if there is one, else the opening prose.
// Falling back to the title (what post.html did) just duplicated the <title>.
function describe(post) {
  if (post.excerpt && post.excerpt.trim()) return post.excerpt.trim().slice(0, 160);
  const text = String(post.content_html || '')
    .replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  const cut = text.slice(0, 157);
  const stop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('? '), cut.lastIndexOf('! '));
  return stop > 90 ? cut.slice(0, stop + 1) : cut.replace(/\s+\S*$/, '') + '…';
}

const fmtDate = (iso) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

// ---------------------------------------------------------------------------
// the page template — lifted from post.html so the design is unchanged
// ---------------------------------------------------------------------------
const POST_CSS = `
    .post-cover{ display:block; width:auto; max-width:min(520px,100%); height:auto; border-radius:18px; margin:8px auto 24px; box-shadow:0 20px 50px rgba(0,0,0,.35); }
    .share-bar{ display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin:30px 0 6px; padding-top:22px; border-top:1px solid var(--border); }
    .share-bar .lbl{ font-size:.9rem; color:var(--ink-2); font-weight:600; }
    .share-bar a, .share-bar button{ display:inline-flex; align-items:center; gap:6px; font:inherit; font-size:.88rem; cursor:pointer;
      padding:9px 14px; border-radius:999px; border:1px solid var(--border); background:var(--glass); color:var(--ink-2); text-decoration:none; transition:.2s; }
    .share-bar a:hover, .share-bar button:hover{ color:#fff; border-color:var(--border-glow); }
    .share-bar .wa:hover{ background:rgba(37,211,102,.2); color:#fff; }
    .share-bar .ig:hover{ background:linear-gradient(45deg,rgba(240,148,51,.28),rgba(220,39,67,.28),rgba(188,24,136,.28)); color:#fff; border-color:rgba(220,39,67,.5); }
    .ig-hint{ font-size:.85rem; color:var(--ink-2); margin-top:10px; line-height:1.6; }
    .post-body{ font-size:1.05rem; line-height:1.8; color:var(--ink); }
    .post-body h2{ font-family:'Space Grotesk',sans-serif; margin:32px 0 10px; font-size:1.45rem; }
    .post-body h3{ font-family:'Space Grotesk',sans-serif; margin:24px 0 8px; }
    .post-body p{ margin:0 0 16px; color:var(--ink-2); }
    .post-body img{ max-width:100%; border-radius:12px; margin:12px 0; }
    .post-body a{ color:var(--brand); }
    .post-body ul,.post-body ol{ color:var(--ink-2); margin:0 0 16px; padding-left:22px; line-height:1.8; }
    .post-meta{ font-size:.85rem; color:var(--ink-3); }
    .crumbs{ font-size:.82rem; color:var(--ink-3); margin-bottom:18px; }
    .crumbs a{ color:var(--ink-2); } .crumbs a:hover{ color:#fff; }`;

function postPage(p, prev, next) {
  const url = `${SITE}/blog/${p.slug}/`;
  const desc = describe(p);
  const hero = `${SITE}/blog/covers/${p.slug}-1040.webp`;   // also the og:image
  const shareTxt = `${p.title} — via Teatalz House of Rume`;
  const eu = encodeURIComponent(url), et = encodeURIComponent(shareTxt);

  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article',
        headline: p.title,
        description: desc,
        image: [hero],
        datePublished: p.created_at,
        dateModified: p.updated_at || p.created_at,
        author: { '@type': 'Organization', name: 'Teatalz', url: SITE },
        publisher: { '@type': 'Organization', name: ORG, logo: { '@type': 'ImageObject', url: `${SITE}/assets/teatalz-logo-512.png` } },
        mainEntityOfPage: { '@type': 'WebPage', '@id': url },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE}/` },
          { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE}/blog.html` },
          { '@type': 'ListItem', position: 3, name: p.title, item: url },
        ],
      },
    ],
  };

  const near = [
    prev ? `<a href="/blog/${prev.slug}/">← ${esc(prev.title)}</a>` : '',
    next ? `<a href="/blog/${next.slug}/">${esc(next.title)} →</a>` : '',
  ].filter(Boolean).join('');

  return `<!doctype html>
<html lang="en-IN">
<head>
  <meta charset="utf-8" />
  <link rel="icon" type="image/png" sizes="32x32" href="/assets/favicon-32.png" />
  <link rel="apple-touch-icon" sizes="180x180" href="/assets/favicon-180.png" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(titleTag(p.title))}</title>
  <meta name="description" content="${esc(desc)}" />
  <link rel="canonical" href="${url}" />
  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="Teatalz" />
  <meta property="og:title" content="${esc(p.title)}" />
  <meta property="og:description" content="${esc(desc)}" />
  <meta property="og:image" content="${hero}" />
  <meta property="og:url" content="${url}" />
  <meta property="article:published_time" content="${p.created_at}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(p.title)}" />
  <meta name="twitter:description" content="${esc(desc)}" />
  <meta name="twitter:image" content="${hero}" />
  <meta name="theme-color" content="#150a12" />
  <link rel="preconnect" href="https://fonts.googleapis.com" /><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/styles.css" />
  <style>${POST_CSS}
    .nearby{ display:flex; justify-content:space-between; gap:16px; flex-wrap:wrap; margin-top:28px; padding-top:20px; border-top:1px solid var(--border); font-size:.9rem; }
    .nearby a{ color:var(--ink-2); max-width:46%; } .nearby a:hover{ color:#fff; }
  </style>
  <script type="application/ld+json">${JSON.stringify(ld)}</script>
</head>
<body>
  <main class="doc">
    <p class="crumbs"><a href="/">Home</a> › <a href="/blog.html">Blog</a></p>
    <article>
      <h1>${esc(p.title)}</h1>
      <p class="post-meta">${esc(fmtDate(p.created_at))} · Teatalz House of Rume</p>
      <img class="post-cover" alt="${esc(p.title)}" decoding="async"
           src="/blog/covers/${p.slug}-520.webp"
           srcset="/blog/covers/${p.slug}-520.webp 520w, /blog/covers/${p.slug}-1040.webp 1040w"
           sizes="min(520px, 100vw)" />
      <div class="post-body">${fixHeadings(p.content_html || '')}</div>
    </article>
    <div class="share-bar"><span class="lbl">Share:</span>
      <a class="wa" href="https://wa.me/?text=${encodeURIComponent(shareTxt + '  ' + url)}" target="_blank" rel="noopener">WhatsApp</a>
      <button class="ig" onclick="shareInstagram(this)">Instagram</button>
      <a href="https://twitter.com/intent/tweet?text=${et}&url=${eu}" target="_blank" rel="noopener">X</a>
      <a href="https://www.facebook.com/sharer/sharer.php?u=${eu}" target="_blank" rel="noopener">Facebook</a>
      <a href="https://www.linkedin.com/sharing/share-offsite/?url=${eu}" target="_blank" rel="noopener">LinkedIn</a>
      <button onclick="copyLink(this)">Copy link</button></div>
    <div id="ig-hint" class="ig-hint"></div>
    ${near ? `<nav class="nearby">${near}</nav>` : ''}
    <p style="margin-top:34px"><a class="btn" href="/#waitlist">Join the Teatalz waitlist →</a></p>
  </main>
  <script src="/partials.js"></script>
  <script>
    window.__share = { url: ${JSON.stringify(url)}, text: ${JSON.stringify(shareTxt)}, title: ${JSON.stringify(p.title)} };
    function copyLink(btn){
      navigator.clipboard.writeText(window.__share.url);
      var o=btn.textContent; btn.textContent="Copied ✓";
      setTimeout(function(){ btn.textContent=o; },2000);
    }
    /* Instagram has no web "share this link" endpoint (unlike WhatsApp/X/FB).
       On mobile the OS share sheet DOES include Instagram, so use the Web Share
       API there. On desktop, copy the link and point them to Instagram. */
    function shareInstagram(btn){
      var s = window.__share, hint = document.getElementById("ig-hint");
      if (navigator.share) {
        navigator.share({ title: s.title, text: s.text, url: s.url })
          .then(function(){ hint.textContent=""; })
          .catch(function(){ /* user dismissed — say nothing */ });
      } else {
        navigator.clipboard.writeText(s.text + "  " + s.url);
        hint.innerHTML = "Link copied. Instagram doesn't allow posting from a browser — " +
          "paste it into your Instagram story or bio. " +
          "<a href=\\"https://www.instagram.com/teatalz_house_of_rume/\\" target=\\"_blank\\" rel=\\"noopener\\">Open Instagram ↗</a>";
        btn.textContent = "Copied ✓";
        setTimeout(function(){ btn.textContent="Instagram"; },2500);
      }
    }
  </script>
</body>
</html>
`;
}

// ---------------------------------------------------------------------------
// run
// ---------------------------------------------------------------------------
const res = await fetch(
  `${SUPABASE_URL}/rest/v1/blog_posts?published=eq.true&select=*&order=created_at.desc`,
  { headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` } });
if (!res.ok) throw new Error(`Supabase returned ${res.status} ${res.statusText}`);
const posts = await res.json();
if (!Array.isArray(posts) || !posts.length) throw new Error('no published posts came back — refusing to write an empty blog');

console.log(`${posts.length} published posts\n`);

const index = [];
for (let i = 0; i < posts.length; i++) {
  const p = posts[i];
  if (!p.slug) { console.warn(`  ! skipping a post with no slug: ${p.title}`); continue; }

  // covers: two derivatives. Cards render at ~280px so 400px covers 1.4x DPR
  // there; the post hero gets 1200px. Serving the 1000x1500 original into a
  // 280px box was most of the 3.3 MB.
  let thumbRel = null;
  if (p.cover_url && p.cover_url.startsWith('data:')) {
    const buf = Buffer.from(p.cover_url.split(',')[1], 'base64');
    for (const [w, q] of [[400, 75], [520, 76], [1040, 78]]) {
      write(`blog/covers/${p.slug}-${w}.webp`,
        await sharp(buf).resize({ width: w, withoutEnlargement: true }).webp({ quality: q }).toBuffer());
    }
    thumbRel = `/blog/covers/${p.slug}-400.webp`;
  } else if (p.cover_url) {
    console.warn(`  ! ${p.slug}: cover_url is not a data URI, leaving it alone`);
  }

  write(`blog/${p.slug}/index.html`, postPage(p, posts[i + 1], posts[i - 1]));

  index.push({
    slug: p.slug,
    title: p.title,
    excerpt: describe(p),
    thumb: thumbRel,
    created_at: p.created_at,
    url: `/blog/${p.slug}/`,
  });
  console.log(`  ${p.slug}`);
}

write('blog/posts.json', JSON.stringify(index));

// sitemap — the static pages plus every post
const STATIC = [
  ['/', 'weekly', '1.0'], ['/blog.html', 'weekly', '0.8'], ['/about.html', 'monthly', '0.7'],
  ['/contact.html', 'monthly', '0.5'], ['/privacy.html', 'yearly', '0.3'],
  ['/terms.html', 'yearly', '0.3'], ['/refund.html', 'yearly', '0.3'],
];
const day = (iso) => new Date(iso).toISOString().slice(0, 10);
const newest = index.length ? day(index[0].created_at) : null;
write('sitemap.xml',
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  STATIC.map(([loc, cf, pr]) =>
    `  <url><loc>${SITE}${loc}</loc>${loc === '/blog.html' && newest ? `<lastmod>${newest}</lastmod>` : ''}<changefreq>${cf}</changefreq><priority>${pr}</priority></url>`).join('\n') + '\n' +
  index.map((p) =>
    `  <url><loc>${SITE}${p.url}</loc><lastmod>${day(p.created_at)}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>`).join('\n') +
  `\n</urlset>\n`);

console.log(`\n${DRY ? 'WOULD WRITE' : 'WROTE'} ${written.length} files:`);
const total = written.reduce((s, [, n]) => s + n, 0);
for (const [rel, n] of written.slice(0, 6)) console.log(`  ${rel.padEnd(52)} ${(n / 1024).toFixed(1)} KB`);
if (written.length > 6) console.log(`  … and ${written.length - 6} more`);
console.log(`  total ${(total / 1024 / 1024).toFixed(2)} MB on disk`);
console.log(`\ncard payload (12 thumbs + posts.json): ${(written.filter(([r]) => /-400\.webp$|posts\.json$/.test(r)).reduce((s, [, n]) => s + n, 0) / 1024).toFixed(0)} KB`);
