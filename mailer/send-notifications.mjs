/**
 * Teatalz — waitlist & investor notification mailer
 * Runs on GitHub Actions (cron). Sends:
 *   1. Welcome email to each new waitlist joiner   (marks waitlist.welcomed = true)
 *   2. Signup alert to rumesupport@teatalz.com      (same pass)
 *   3. Investor sign-in / doc-request alert to founder@teatalz.com (marks investor_leads.notified = true)
 *
 * SECURITY: uses the Supabase SERVICE ROLE key — server-side only, injected as a
 * GitHub Actions secret. NEVER commit it and NEVER ship it to the browser bundle.
 *
 * Requires (env / GitHub secrets):
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   ZOHO_SMTP_HOST (smtp.zoho.in), ZOHO_SMTP_USER, ZOHO_SMTP_PASS
 *   NOTIFY_SIGNUPS_TO   (rumesupport@teatalz.com)
 *   NOTIFY_INVESTORS_TO (founder@teatalz.com)
 *   MAIL_FROM           (e.g. "Teatalz <rumesupport@teatalz.com>")
 */
import nodemailer from 'nodemailer';

const {
  SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
  ZOHO_SMTP_HOST = 'smtp.zoho.in', ZOHO_SMTP_USER, ZOHO_SMTP_PASS,
  NOTIFY_SIGNUPS_TO = 'rumesupport@teatalz.com',
  NOTIFY_INVESTORS_TO = 'founder@teatalz.com',
  MAIL_FROM = 'Teatalz <rumesupport@teatalz.com>',
} = process.env;

// fail safe: if not configured, exit cleanly (so a not-yet-configured repo doesn't error)
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !ZOHO_SMTP_USER || !ZOHO_SMTP_PASS) {
  console.log('Mailer not configured (missing secrets) — skipping. Add GitHub secrets to activate.');
  process.exit(0);
}

const H = {
  apikey: SUPABASE_SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
  'Content-Type': 'application/json',
};
const sb = (path, opts = {}) =>
  fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...opts, headers: { ...H, ...(opts.headers || {}) } });

const transport = nodemailer.createTransport({
  host: ZOHO_SMTP_HOST, port: 465, secure: true,
  auth: { user: ZOHO_SMTP_USER, pass: ZOHO_SMTP_PASS },
});

const esc = (s) => String(s ?? '').replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));

async function send(to, subject, html, text) {
  await transport.sendMail({ from: MAIL_FROM, to, subject, html, text });
  console.log(`  ✉  ${subject}  ->  ${to}`);
}

function welcomeHtml(name) {
  const first = (name || 'there').split(' ')[0];
  return `<div style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:auto;background:#150a12;color:#fff;border-radius:18px;overflow:hidden">
    <div style="padding:30px 28px;background:linear-gradient(135deg,#7c5cff,#ff6fb5)">
      <div style="font-size:22px;font-weight:700">You're on the list 💜</div>
    </div>
    <div style="padding:26px 28px;line-height:1.6;color:#eadfe6">
      <p>Hey ${esc(first)},</p>
      <p>Thank you for joining the <strong>Teatalz</strong> waitlist. You're now among the first who'll meet <strong>Rume</strong> — a Hinglish-first AI companion who listens — and <strong>Adda</strong>, a kinder social space.</p>
      <p>We'll tell you the moment we open the doors. No spam, ever — just one warm hello and the occasional update you can opt out of anytime.</p>
      <p style="color:#b9a8b4;font-size:13px;margin-top:22px">Your details are safe with us — encrypted and never sold.</p>
      <p style="margin-top:20px">— Team Teatalz</p>
    </div>
    <div style="padding:14px 28px;font-size:11px;color:#8a7b85;border-top:1px solid rgba(255,255,255,.08)">
      Teatalz House of Rume Private Limited
    </div>
  </div>`;
}

async function processWaitlist() {
  const res = await sb('waitlist?welcomed=eq.false&select=id,name,email,city,native_language,mobile,created_at&order=created_at.asc&limit=100');
  if (!res.ok) { console.error('waitlist fetch failed', res.status, await res.text()); return; }
  const rows = await res.json();
  console.log(`Waitlist: ${rows.length} new joiner(s)`);
  for (const r of rows) {
    try {
      // 1. welcome the joiner
      await send(r.email, 'Welcome to Teatalz 💜 — you\'re on the list',
        welcomeHtml(r.name), `Hey ${(r.name||'there').split(' ')[0]}, you're on the Teatalz waitlist. We'll tell you the moment we open. — Team Teatalz`);
      // 2. alert the team
      await send(NOTIFY_SIGNUPS_TO, `New Teatalz waitlist signup — ${r.name || 'Unknown'}`,
        `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.7">
          <b>New waitlist signup</b><br><br>
          <b>Name:</b> ${esc(r.name)}<br>
          <b>City:</b> ${esc(r.city)}<br>
          <b>Native language:</b> ${esc(r.native_language)}<br>
          <b>Email:</b> ${esc(r.email)}<br>
          <b>Mobile:</b> ${esc(r.mobile)}<br>
          <b>Joined:</b> ${esc(r.created_at)}
        </div>`,
        `New waitlist signup — ${r.name} · ${r.city} · ${r.native_language} · ${r.email} · ${r.mobile}`);
      // 3. mark welcomed (only after both sends succeed)
      const upd = await sb(`waitlist?id=eq.${r.id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ welcomed: true }) });
      if (!upd.ok) console.error('  mark welcomed failed', r.id, await upd.text());
    } catch (e) { console.error(`  waitlist ${r.id} failed:`, e.message); }
  }
}

async function processInvestors() {
  const res = await sb('investor_leads?notified=eq.false&select=id,name,email,firm,role,message,created_at&order=created_at.asc&limit=100');
  if (!res.ok) { console.error('investor fetch failed', res.status, await res.text()); return; }
  const rows = await res.json();
  console.log(`Investors: ${rows.length} new event(s)`);
  for (const r of rows) {
    try {
      await send(NOTIFY_INVESTORS_TO, `Investor room — ${r.message || 'activity'} — ${r.name || 'Unknown'}`,
        `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.7">
          <b>Investor room activity</b><br><br>
          <b>Event:</b> ${esc(r.message)}<br>
          <b>Name:</b> ${esc(r.name)}<br>
          <b>Email:</b> ${esc(r.email)}<br>
          <b>Firm:</b> ${esc(r.firm) || '—'}<br>
          <b>When:</b> ${esc(r.created_at)}
        </div>`,
        `Investor room — ${r.message} — ${r.name} · ${r.email} · ${r.firm || '—'}`);
      const upd = await sb(`investor_leads?id=eq.${r.id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ notified: true }) });
      if (!upd.ok) console.error('  mark notified failed', r.id, await upd.text());
    } catch (e) { console.error(`  investor ${r.id} failed:`, e.message); }
  }
}

(async () => {
  try { await transport.verify(); console.log('SMTP ok'); }
  catch (e) { console.error('SMTP verify failed:', e.message); process.exit(1); }
  await processWaitlist();
  await processInvestors();
  console.log('Mailer run complete.');
})();
