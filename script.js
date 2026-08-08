(function () {
  "use strict";

  /* Footer year */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- Mobile nav toggle ---------- */
  var navToggle = document.getElementById("navToggle");
  var mainNav = document.getElementById("mainNav");
  if (navToggle && mainNav) {
    navToggle.addEventListener("click", function () {
      var isOpen = mainNav.classList.toggle("is-open");
      navToggle.classList.toggle("is-active", isOpen);
      navToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });
    mainNav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        mainNav.classList.remove("is-open");
        navToggle.classList.remove("is-active");
        navToggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* ---------- Coin-insert signature interaction ---------- */
  var coinMachine = document.getElementById("coinMachine");
  var coin = document.getElementById("coin");
  var coinStatus = document.getElementById("coinStatus");
  var coinTimer = document.getElementById("coinTimer");

  var sessionSeconds = 0;
  var tickHandle = null;
  var busy = false;

  function formatTime(totalSeconds) {
    var h = Math.floor(totalSeconds / 3600);
    var m = Math.floor((totalSeconds % 3600) / 60);
    var s = totalSeconds % 60;
    function pad(n) { return String(n).padStart(2, "0"); }
    return pad(h) + ":" + pad(m) + ":" + pad(s);
  }

  function startSession() {
    sessionSeconds = 30 * 60; // one coin = 30 simulated minutes
    coinStatus.textContent = "SESSION ACTIVE";
    coinStatus.classList.add("is-active");
    if (tickHandle) clearInterval(tickHandle);
    tickHandle = setInterval(function () {
      sessionSeconds -= 90; // speed up so the demo is visible
      if (sessionSeconds <= 0) {
        clearInterval(tickHandle);
        tickHandle = null;
        sessionSeconds = 0;
        coinTimer.textContent = formatTime(0);
        coinStatus.textContent = "INSERT COIN TO START";
        coinStatus.classList.remove("is-active");
        return;
      }
      coinTimer.textContent = formatTime(sessionSeconds);
    }, 400);
  }

  function insertCoin() {
    if (busy) return;
    busy = true;
    coin.classList.add("is-dropping");

    setTimeout(function () {
      coin.classList.remove("is-dropping");
      startSession();
      busy = false;
    }, 660);
  }

  if (coinMachine) {
    coinMachine.addEventListener("click", insertCoin);
    coinMachine.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        insertCoin();
      }
    });
  }

  /* ---------- FAQ accordion ---------- */
  var faqItems = document.querySelectorAll(".faq-item");
  faqItems.forEach(function (item) {
    var question = item.querySelector(".faq-question");
    if (!question) return;
    question.addEventListener("click", function () {
      var isOpen = item.classList.contains("is-open");

      // Close all other items (single-open accordion)
      faqItems.forEach(function (other) {
        other.classList.remove("is-open");
        var otherQuestion = other.querySelector(".faq-question");
        if (otherQuestion) otherQuestion.setAttribute("aria-expanded", "false");
      });

      if (!isOpen) {
        item.classList.add("is-open");
        question.setAttribute("aria-expanded", "true");
      }
    });
  });

  /* ---------- Motion: reduced-motion check ---------- */
  var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Motion: hero entrance ---------- */
  if (!prefersReducedMotion) {
    document.body.classList.add("js-hero-animate");
  }

  /* ---------- Motion: scroll parallax pan on hero background ---------- */
  var heroSection = document.querySelector(".hero");
  var heroStripesEl = document.querySelector(".hero-stripes");
  var heroDotsEl = document.querySelector(".hero-dots");

  if (!prefersReducedMotion && heroSection && heroStripesEl && heroDotsEl) {
    var parallaxTicking = false;

    function updateParallax() {
      var rect = heroSection.getBoundingClientRect();
      // Only compute while the hero is at least partly on screen.
      if (rect.bottom > 0 && rect.top < window.innerHeight) {
        var scrolled = -rect.top; // 0 when hero top is at viewport top, grows as you scroll past it
        heroStripesEl.style.transform = "translateY(" + (scrolled * 0.18) + "px)";
        heroDotsEl.style.transform = "translateY(" + (scrolled * -0.12) + "px)";
      }
      parallaxTicking = false;
    }

    window.addEventListener("scroll", function () {
      if (!parallaxTicking) {
        window.requestAnimationFrame(updateParallax);
        parallaxTicking = true;
      }
    }, { passive: true });

    updateParallax();
  }

  /* ---------- Motion: scroll-reveal ---------- */
  var revealTargets = document.querySelectorAll(
    ".service-card, .why-item, .faq-item, .negosyo, .how-step, .visit-copy, .visit-map, .delivery-inner, .final-cta-inner, .section-heading"
  );

  if (prefersReducedMotion || !("IntersectionObserver" in window)) {
    // No motion preferred, or unsupported browser: show everything immediately.
    revealTargets.forEach(function (el) { el.classList.add("is-revealed"); });
  } else {
    revealTargets.forEach(function (el, index) {
      el.classList.add("reveal");
      // Stagger cards/items that share a row so they don't all pop at once.
      var group = el.closest(".service-grid, .why-grid, .faq-list, .how-steps");
      if (group) {
        var siblings = Array.prototype.slice.call(group.children);
        var posInGroup = siblings.indexOf(el);
        el.style.transitionDelay = (Math.min(posInGroup, 5) * 90) + "ms";
      }
    });

    var revealObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-revealed");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );

    revealTargets.forEach(function (el) { revealObserver.observe(el); });
  }

  /* ---------- Motion: 3D pointer tilt ---------- */
  var supportsFinePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  if (!prefersReducedMotion && supportsFinePointer) {
    var tiltTargets = document.querySelectorAll(".service-card, .why-item, .coin-machine");

    tiltTargets.forEach(function (el) {
      var maxTilt = el.classList.contains("coin-machine") ? 10 : 7;

      el.addEventListener("mousemove", function (e) {
        var rect = el.getBoundingClientRect();
        var px = (e.clientX - rect.left) / rect.width;  // 0 to 1 across the card
        var py = (e.clientY - rect.top) / rect.height;  // 0 to 1 down the card
        var rotateY = (px - 0.5) * (maxTilt * 2);
        var rotateX = (0.5 - py) * (maxTilt * 2);
        el.style.transform =
          "perspective(1000px) rotateX(" + rotateX.toFixed(2) + "deg) rotateY(" + rotateY.toFixed(2) + "deg) translateY(-4px)";
      });

      el.addEventListener("mouseleave", function () {
        el.style.transform = "";
      });
    });
  }
})();
