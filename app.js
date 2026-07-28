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

      insert("waitlist", {
        email: email,
        name: name,
        city: city,
        native_language: lang,
        mobile: fullMobile,
        source: "website",
        user_agent: navigator.userAgent.slice(0, 300),
      })
        .then(function (res) {
          if (res.status === 201 || res.ok) {
            msg.className = "wl-msg ok";
            msg.textContent = "You're on the list 🌱 We'll be in touch. Thank you!";
            form.reset();
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
    fetch(SUPABASE_URL + "/rest/v1/blog_posts?published=eq.true&select=slug,title,excerpt,cover_url&order=created_at.desc&limit=3",
      { headers: { apikey: SUPABASE_ANON, Authorization: "Bearer " + SUPABASE_ANON } })
      .then(function (r) { return r.json(); })
      .then(function (posts) {
        if (!posts || !posts.length) { homePosts.innerHTML = '<p style="color:var(--ink-3)">Posts coming soon 🌱</p>'; return; }
        homePosts.innerHTML = posts.map(function (p) {
          var img = p.cover_url ? '<img loading="lazy" src="' + e(p.cover_url) + '" alt="" />' : "";
          return '<a href="post.html?slug=' + encodeURIComponent(p.slug) + '"><div class="mc">' + img + '</div>' +
                 '<div class="mb"><h4>' + e(p.title) + '</h4><p>' + e(p.excerpt || "") + '</p></div></a>';
        }).join("");
      })
      .catch(function () { homePosts.innerHTML = '<p style="color:var(--ink-3)">Couldn\'t load posts.</p>'; });
  }

  /* expose helpers for the investor room page */
  window.__teatalz = { insert: insert, isEmail: isEmail };
})();
