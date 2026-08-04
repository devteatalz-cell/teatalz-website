/* Teatalz marketing site — client script.
 * The Supabase anon key is PUBLIC by design and protected by Row-Level Security
 * (the `waitlist` table is insert-only; nobody can read it through this key).
 */
(function () {
  "use strict";

  var SUPABASE_URL = "https://zoceydoogxrpmmlxwhvd.supabase.co";
  var SUPABASE_ANON =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpvY2V5ZG9vZ3hycG1tbHh3aHZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUxODQ1NDMsImV4cCI6MjEwMDc2MDU0M30.kWNjl0Pqvno7pyiFFmHVScBZGmJ6mqoxoVQMrHbK5eQ";

  function insert(table, row) {
    return fetch(SUPABASE_URL + "/rest/v1/" + table, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON,
        Authorization: "Bearer " + SUPABASE_ANON,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(row),
    });
  }

  /* Call a SECURITY DEFINER function. Used for coupon validation so the browser
   * never needs read access to `waitlist_coupons` — codes stay non-enumerable. */
  function rpc(fn, args) {
    return fetch(SUPABASE_URL + "/rest/v1/rpc/" + fn, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON,
        Authorization: "Bearer " + SUPABASE_ANON,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(args || {}),
    });
  }

  function isEmail(v) {
    return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v);
  }

  // block obvious throwaway / disposable email domains — a light genuineness gate
  var DISPOSABLE = [
    "mailinator.com","tempmail.com","temp-mail.org","10minutemail.com","guerrillamail.com",
    "yopmail.com","trashmail.com","sharklasers.com","getnada.com","dispostable.com","fakeinbox.com",
    "throwawaymail.com","maildrop.cc","mailnesia.com","mohmal.com","emailondeck.com","tempmailo.com",
  ];
  function emailLooksReal(email) {
    var domain = email.split("@")[1] || "";
    if (DISPOSABLE.indexOf(domain) !== -1) return false;
    if (!domain.includes(".")) return false;
    return true;
  }
  function cleanMobile(v) {
    return (v || "").replace(/[\s\-()]/g, "").replace(/^\+?91/, "");
  }
  function isIndianMobile(v) {
    return /^[6-9][0-9]{9}$/.test(v) && !/^(\d)\1{9}$/.test(v); // 10 digits 6-9, not all-same
  }

  /* ---- waitlist ---- */
  var form = document.getElementById("wl-form");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = (document.getElementById("wl-name").value || "").trim();
      var city = (document.getElementById("wl-city").value || "").trim();
      var lang = (document.getElementById("wl-lang").value || "").trim();
      var email = (document.getElementById("wl-email").value || "").trim().toLowerCase();
      var isd = (document.getElementById("wl-isd") && document.getElementById("wl-isd").value) || "+91";
      var mobileDigits = (document.getElementById("wl-mobile").value || "").replace(/\D/g, "").replace(/^0+/, "");
      var fullMobile = isd + mobileDigits;
      var couponEl = document.getElementById("wl-coupon");
      var coupon = ((couponEl && couponEl.value) || "").trim().toUpperCase();
      var msg = document.getElementById("wl-msg");
      var btn = document.getElementById("wl-submit");

      function fail(text) { msg.className = "wl-msg err"; msg.textContent = text; }
      msg.className = "wl-msg";

      if (name.length < 2) return fail("Please tell us your name.");
      if (city.length < 2) return fail("Please add your city.");
      if (lang.length < 2) return fail("Please add your native language.");
      if (!isEmail(email)) return fail("Please enter a valid email address.");
      if (!emailLooksReal(email)) return fail("Please use a real, permanent email — temporary inboxes aren't allowed.");
      if (isd === "+91") {
        if (!isIndianMobile(mobileDigits)) return fail("Please enter a valid 10-digit Indian mobile number.");
      } else if (mobileDigits.length < 7 || mobileDigits.length > 14) {
        return fail("Please enter a valid mobile number for the selected country code.");
      }

      btn.disabled = true;
      var original = btn.textContent;
      btn.textContent = "Joining…";

      // A coupon is optional and must never block a signup. If the code is wrong
      // we tell them and still add them to the list — losing a joiner over a
      // mistyped promo code would be a self-inflicted wound.
      var couponCheck = coupon ? rpc("validate_waitlist_coupon", { p_code: coupon })
        .then(function (r) { return r.ok ? r.json() : { valid: false, reason: "unreachable" }; })
        .catch(function () { return { valid: false, reason: "unreachable" }; })
        : Promise.resolve(null);

      couponCheck.then(function (cv) {
      var couponAccepted = !!(cv && cv.valid);

      insert("waitlist", {
        email: email,
        name: name,
        city: city,
        native_language: lang,
        mobile: fullMobile,
        coupon_code: couponAccepted ? coupon : null,
        source: "website",
        user_agent: navigator.userAgent.slice(0, 300),
      })
        .then(function (res) {
          if (res.status === 201 || res.ok) {
            msg.className = "wl-msg ok";
            if (couponAccepted) {
              msg.textContent = "You're on the list 🌱 Your 1 month of Lite is saved against your email — we'll apply it at launch.";
              // Only counted after the row actually landed, so an abandoned form
              // never burns a redemption.
              rpc("claim_waitlist_coupon", { p_code: coupon }).catch(function () {});
            } else if (coupon) {
              msg.textContent = "You're on the list 🌱 That coupon code didn't work, but you're in — we'll be in touch.";
            } else {
              msg.textContent = "You're on the list 🌱 We'll be in touch. Thank you!";
            }
            form.reset();
            var n = document.getElementById("wl-coupon-note");
            if (n) { n.textContent = ""; n.className = "wl-coupon-note"; }
          } else if (res.status === 409) {
            msg.className = "wl-msg ok";
            msg.textContent = "You're already on the list — thank you!";
            form.reset();
          } else {
            throw new Error("status " + res.status);
          }
        })
        .catch(function () {
          msg.className = "wl-msg err";
          msg.textContent = "Something went wrong. Please try again in a moment.";
        })
        .finally(function () {
          btn.disabled = false;
          btn.textContent = original;
        });
      });
    });
  }

  /* ---- live coupon feedback (optional field; never blocks a signup) ---- */
  var couponInput = document.getElementById("wl-coupon");
  if (couponInput) {
    var couponTimer = null;
    couponInput.addEventListener("input", function () {
      var note = document.getElementById("wl-coupon-note");
      var code = (couponInput.value || "").trim().toUpperCase();
      if (couponTimer) clearTimeout(couponTimer);
      if (!note) return;
      if (code.length < 3) { note.textContent = ""; note.className = "wl-coupon-note"; return; }
      couponTimer = setTimeout(function () {
        rpc("validate_waitlist_coupon", { p_code: code })
          .then(function (r) { return r.json(); })
          .then(function (v) {
            if (v && v.valid) {
              note.className = "wl-coupon-note ok";
              note.textContent = "🎁 " + (v.message || "Coupon applied.");
            } else {
              note.className = "wl-coupon-note err";
              note.textContent = (v && v.message) || "That code doesn't look right.";
            }
          })
          .catch(function () { note.textContent = ""; note.className = "wl-coupon-note"; });
      }, 450);
    });
  }

  /* ---- scroll reveal ---- */
  var reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && reveals.length) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
        });
      },
      { threshold: 0.12 }
    );
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("in"); });
  }

  /* ---- nav glass on scroll ---- */
  var nav = document.getElementById("nav");
  if (nav) {
    var onScroll = function () { nav.classList.toggle("scrolled", window.scrollY > 20); };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ---- mobile hamburger ---- */
  var navToggle = document.getElementById("nav-toggle");
  if (nav && navToggle) {
    var setOpen = function (open) {
      nav.classList.toggle("open", open);
      navToggle.setAttribute("aria-expanded", open ? "true" : "false");
    };
    navToggle.addEventListener("click", function (e) {
      e.stopPropagation();
      setOpen(!nav.classList.contains("open"));
    });
    // close after tapping a link, or tapping outside
    nav.addEventListener("click", function (e) {
      if (e.target.closest(".links a")) setOpen(false);
    });
    document.addEventListener("click", function (e) {
      if (nav.classList.contains("open") && !e.target.closest(".nav")) setOpen(false);
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") setOpen(false); });
  }

  /* ---- latest 3 blog posts on the home page ---- */
  var homePosts = document.getElementById("home-posts");
  if (homePosts) {
    var e = function (s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
    /* Reads /blog/posts.json (written by tools/prerender.mjs) instead of
       querying Supabase for cover_url — that pulled 738 KB of base64 onto the
       homepage for three thumbnails. */
    fetch("/blog/posts.json")
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (all) {
        var posts = (all || []).slice(0, 3);
        if (!posts.length) { homePosts.innerHTML = '<p style="color:var(--ink-3)">Posts coming soon 🌱</p>'; return; }
        homePosts.innerHTML = posts.map(function (p) {
          var img = p.thumb ? '<img loading="lazy" decoding="async" width="400" height="500" src="' + e(p.thumb) + '" alt="' + e(p.title) + '" />' : "";
          return '<a href="' + e(p.url) + '"><div class="mc">' + img + '</div>' +
                 '<div class="mb"><h4>' + e(p.title) + '</h4><p>' + e(p.excerpt || "") + '</p></div></a>';
        }).join("");
      })
      .catch(function () { homePosts.innerHTML = '<p style="color:var(--ink-3)">Couldn\'t load posts.</p>'; });
  }

  /* expose helpers for the investor room page */
  window.__teatalz = { insert: insert, isEmail: isEmail };
})();
