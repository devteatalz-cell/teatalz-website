> **RETIRED.** Transactional email now sends instantly from Postgres via pg_net -> Resend (migrations 0118/0119). This GitHub Action remains only for manual backfill.

# Teatalz mailer (waitlist + investor notifications)

A tiny GitHub Actions job that, every 10 minutes:

1. **Welcomes** each new waitlist joiner (branded email to their address).
2. **Alerts** `rumesupport@teatalz.com` with the joiner's full details.
3. **Alerts** `founder@teatalz.com` when an investor signs into the data room or requests a document.

It uses **Zoho SMTP** to send and **Supabase** to read new rows + mark them handled, so nobody is emailed twice.

> **Status: ready but NOT active.** It only runs once this repo is on GitHub *and* the secrets below are set. The script exits cleanly if secrets are missing, so an un-configured repo never errors.

---

## Why a GitHub Action (not a Supabase Edge Function)?
Supabase Edge Functions run on Deno Deploy, which **blocks raw outbound SMTP** — so they can't talk to Zoho's mail server. A scheduled GitHub Action is the simplest reliable sender, and it keeps the SMTP password and the Supabase **service-role** key server-side (as encrypted GitHub secrets), never in the website bundle.

## One-time setup (do this at deploy)
In the GitHub repo → **Settings → Secrets and variables → Actions → New repository secret**, add:

| Secret | Value |
|---|---|
| `SUPABASE_URL` | `https://zoceydoogxrpmmlxwhvd.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → **API → service_role** key (the secret JWT). **Never** put this in any client/website file. |
| `ZOHO_SMTP_HOST` | `smtp.zoho.in` |
| `ZOHO_SMTP_USER` | `rumesupport@teatalz.com` |
| `ZOHO_SMTP_PASS` | the Zoho app password / mailbox password for that account |
| `NOTIFY_SIGNUPS_TO` | `rumesupport@teatalz.com` |
| `NOTIFY_INVESTORS_TO` | `founder@teatalz.com` |
| `MAIL_FROM` | `Teatalz <rumesupport@teatalz.com>` |

Then open the **Actions** tab → *Teatalz mailer* → **Run workflow** once to test. Check the run log for `SMTP ok` and `Mailer run complete.`

## Zoho SMTP note
If sends fail with an auth error, generate a Zoho **app-specific password** (Zoho Mail → Settings → Security → App Passwords) and use that as `ZOHO_SMTP_PASS`. Zoho SMTP: host `smtp.zoho.in`, port `465`, SSL.

## Data it relies on (already in the DB)
- `waitlist.welcomed` (boolean) — set true after the welcome + alert are sent.
- `investor_leads.notified` (boolean, migration `0113`) — set true after founder@ is alerted.

## Security
- The service-role key bypasses RLS — it lives **only** as a GitHub secret, used only inside the Action runner. It is never referenced by any file the browser loads.
- The published site (GitHub Pages) may serve this folder's source publicly; that's fine — it contains **no** secrets (everything comes from env).
