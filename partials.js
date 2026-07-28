/* Shared chrome for the secondary pages (legal, about, contact, investor).
 * Injects the aurora background, the real-logo nav, and the footer — so every
 * page matches the homepage and there's a single place to edit them. */
(function () {
  var AURORA =
    '<div class="aurora" aria-hidden="true"><span class="blob b1"></span><span class="blob b2"></span><span class="blob b3"></span><span class="blob b4"></span></div>' +
    '<div class="grain" aria-hidden="true"></div>';

  var NAV =
    '<nav class="nav" id="nav"><div class="nav-inner">' +
    '<a class="brand" href="/"><img src="assets/teatalz-logo.png" alt="Teatalz logo" />Teatalz</a>' +
    '<button class="nav-toggle" id="nav-toggle" aria-label="Menu" aria-expanded="false" aria-controls="nav-links"><span></span></button>' +
    '<div class="links" id="nav-links">' +
    '<a href="/">Home</a>' +
    '<a href="/#safety">Safety</a>' +
    '<a href="blog.html">Blog</a>' +
    '<a href="about.html">About</a>' +
    '<a href="investor.html">🔒 Data room</a>' +
    '<a class="btn sm" href="/#waitlist">Join the waitlist</a>' +
    '</div></div></nav>';

  var FOOTER =
    '<footer class="footer"><div class="wrap" style="text-align:center">' +
    '<nav style="display:flex;flex-wrap:wrap;gap:8px 20px;justify-content:center;margin-bottom:14px">' +
    '<a href="/">Home</a><a href="about.html">About</a><a href="privacy.html">Privacy</a><a href="terms.html">Terms</a><a href="refund.html">Refunds</a><a href="contact.html">Contact</a>' +
    '</nav>' +
    '<div style="display:flex;gap:18px;justify-content:center;margin-bottom:14px">' +
    '<a aria-label="Instagram" href="https://www.instagram.com/teatalz_house_of_rume/" target="_blank" rel="noopener" style="color:var(--ink-2);display:inline-flex"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none"/></svg></a>' +
    '<a aria-label="LinkedIn" href="https://www.linkedin.com/in/teatalz-house-of-rume-82268b39b/" target="_blank" rel="noopener" style="color:var(--ink-2);display:inline-flex"><svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M4.98 3.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5zM3 9h4v12H3zM9 9h3.8v1.7h.05c.53-.9 1.8-1.85 3.7-1.85 3.95 0 4.45 2.6 4.45 6V21h-4v-4.9c0-1.17-.02-2.68-1.63-2.68-1.64 0-1.9 1.28-1.9 2.6V21H9z"/></svg></a>' +
    '<a aria-label="X" href="https://x.com/teatalz" target="_blank" rel="noopener" style="color:var(--ink-2);display:inline-flex"><svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor"><path d="M18.9 2H22l-7.3 8.34L23.3 22h-6.6l-5.18-6.77L5.6 22H2.5l7.8-8.92L1.9 2h6.77l4.68 6.19zm-1.16 18h1.83L7.34 3.9H5.4z"/></svg></a>' +
    '<a aria-label="Facebook" href="https://www.facebook.com/profile.php?id=61584650184132" target="_blank" rel="noopener" style="color:var(--ink-2);display:inline-flex"><svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M13.5 21v-8h2.7l.4-3.1h-3.1V7.9c0-.9.25-1.5 1.55-1.5H17V3.6c-.3-.04-1.3-.13-2.46-.13-2.44 0-4.11 1.49-4.11 4.22V9.9H7.7V13h2.73v8z"/></svg></a>' +
    '<a aria-label="YouTube" href="https://www.youtube.com/channel/UCvwJaJeFaK909XM6QLLtclA" target="_blank" rel="noopener" style="color:var(--ink-2);display:inline-flex"><svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M23 12s0-3.2-.4-4.7a2.5 2.5 0 00-1.75-1.77C19.35 5.1 12 5.1 12 5.1s-7.35 0-8.85.43A2.5 2.5 0 001.4 7.3C1 8.8 1 12 1 12s0 3.2.4 4.7a2.5 2.5 0 001.75 1.77c1.5.43 8.85.43 8.85.43s7.35 0 8.85-.43a2.5 2.5 0 001.75-1.77C23 15.2 23 12 23 12zM9.75 15.02V8.98L15.5 12z"/></svg></a>' +
    '</div>' +
    '<div style="font-size:.82rem;color:var(--ink-3)">© 2026 Teatalz House of Rume Private Limited</div>' +
    '</div></footer>';

  function inject() {
    document.body.insertAdjacentHTML("afterbegin", AURORA + NAV);
    document.body.insertAdjacentHTML("beforeend", FOOTER);
    var n = document.getElementById("nav");
    if (n) {
      var onScroll = function () { n.classList.toggle("scrolled", window.scrollY > 20); };
      window.addEventListener("scroll", onScroll, { passive: true });
      onScroll();

      var tgl = document.getElementById("nav-toggle");
      if (tgl) {
        var setOpen = function (open) {
          n.classList.toggle("open", open);
          tgl.setAttribute("aria-expanded", open ? "true" : "false");
        };
        tgl.addEventListener("click", function (e) { e.stopPropagation(); setOpen(!n.classList.contains("open")); });
        n.addEventListener("click", function (e) { if (e.target.closest(".links a")) setOpen(false); });
        document.addEventListener("click", function (e) { if (n.classList.contains("open") && !e.target.closest(".nav")) setOpen(false); });
        document.addEventListener("keydown", function (e) { if (e.key === "Escape") setOpen(false); });
      }
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", inject);
  else inject();
})();
