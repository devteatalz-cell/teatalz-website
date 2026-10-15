/* ──────────────────────────────────────────────────────────────────────────
 * 🔴 ONE LINE FOR THE FOUNDER TO FILL, AND IT IS THE ONLY ONE.
 *
 * Paste Ask Ru's **anon** key between the quotes below. Supabase -> Project
 * Settings -> API -> Project API keys -> `anon` `public`.
 *
 * ⚠️ THE `anon` KEY, NEVER THE `service_role` ONE. The anon key is meant to sit
 * in public code — it is already inside the Android app — and on this project
 * it can do exactly one thing with the waitlist: INSERT. Verified against the
 * live database on 15 Oct 2026: RLS is on, and `waitlist_join` is the only
 * policy on the table — INSERT, for `anon` and `authenticated`, with no SELECT
 * policy at all. So a visitor can put their name down and nobody can read the
 * list back through this key.
 *
 * The `service_role` key bypasses RLS entirely. It would let anyone reading
 * this page download every email address. It must never be here.
 *
 * This file is kept separate from `index.html` for one reason: the key does not
 * pass through anybody else's hands on its way in.
 * ────────────────────────────────────────────────────────────────────────── */
window.ASKRU = {
  /* Public, and already in the app — not a secret. */
  url: 'https://hyxkhjxrpsmjztbdtcee.supabase.co',

  /* Filled 15 Oct 2026 from the app's own EXPO_PUBLIC_SUPABASE_ANON_KEY, after
     decoding it and checking two claims: role 'anon' (not 'service_role') and
     ref 'hyxkhjxrpsmjztbdtcee' (Ask Ru, not Teatalz).

     If this is ever emptied the form disables itself and says so on the page,
     rather than accepting addresses and posting them nowhere. */
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh5eGtoanhycHNtanp0YmR0Y2VlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkyNjc3MTgsImV4cCI6MjEwNDg0MzcxOH0.203raeaoCf_t6nawo1IkFm-Ayc5uMti-WkxksYn3ORs',
};
