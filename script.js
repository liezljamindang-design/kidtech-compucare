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
      navToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });
    mainNav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        mainNav.classList.remove("is-open");
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
    }, 620);
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

  /* ---------- Inquiry form (front-end only) ---------- */
  var quoteForm = document.getElementById("quoteForm");
  var formStatus = document.getElementById("formStatus");

  if (quoteForm) {
    quoteForm.addEventListener("submit", function (e) {
      e.preventDefault();

      var name = quoteForm.name.value.trim();
      var contact = quoteForm.contact.value.trim();
      var location = quoteForm.location.value.trim();
      var machine = quoteForm.machine.value;

      if (!name || !contact || !location || !machine) {
        formStatus.textContent = "Please fill in all required fields.";
        formStatus.classList.add("is-error");
        return;
      }

      formStatus.classList.remove("is-error");
      formStatus.textContent = "Sending...";

      // NOTE: This is a front-end demo only. Wire this up to your backend,
      // form service (e.g. Formspree), or email API to actually receive inquiries.
      setTimeout(function () {
        formStatus.textContent =
          "Thanks, " + name.split(" ")[0] + "! We got your inquiry about the " +
          machine + " and will reach out at " + contact + " soon.";
        quoteForm.reset();
      }, 500);
    });
  }
})();
