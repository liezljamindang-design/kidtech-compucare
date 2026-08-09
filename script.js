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

  /* ---------- Service photo galleries (horizontal scroll) ---------- */
  var galleries = document.querySelectorAll(".service-gallery");
  galleries.forEach(function (gallery) {
    var track = gallery.querySelector(".service-gallery-track");
    var slides = track ? Array.prototype.slice.call(track.children) : [];
    if (!track || slides.length < 2) return; // single placeholder slide: nothing to wire up

    var prevBtn = gallery.querySelector(".gallery-arrow-prev");
    var nextBtn = gallery.querySelector(".gallery-arrow-next");
    var dotsWrap = gallery.querySelector(".gallery-dots");

    // Build one dot per slide
    var dots = slides.map(function (_, i) {
      var dot = document.createElement("button");
      dot.type = "button";
      dot.className = "gallery-dot" + (i === 0 ? " is-active" : "");
      dot.setAttribute("aria-label", "Go to photo " + (i + 1));
      dot.addEventListener("click", function () {
        slides[i].scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
      });
      dotsWrap.appendChild(dot);
      return dot;
    });

    function currentIndex() {
      var scrollLeft = track.scrollLeft;
      var width = track.clientWidth || 1;
      return Math.round(scrollLeft / width);
    }

    function setActiveDot() {
      var idx = Math.max(0, Math.min(dots.length - 1, currentIndex()));
      dots.forEach(function (d, i) { d.classList.toggle("is-active", i === idx); });
    }

    function goTo(index) {
      var clamped = Math.max(0, Math.min(slides.length - 1, index));
      slides[clamped].scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
    }

    if (prevBtn) {
      prevBtn.hidden = false;
      prevBtn.addEventListener("click", function () { goTo(currentIndex() - 1); });
    }
    if (nextBtn) {
      nextBtn.hidden = false;
      nextBtn.addEventListener("click", function () { goTo(currentIndex() + 1); });
    }
    dotsWrap.hidden = false;

    var scrollTicking = false;
    track.addEventListener("scroll", function () {
      if (!scrollTicking) {
        window.requestAnimationFrame(function () {
          setActiveDot();
          scrollTicking = false;
        });
        scrollTicking = true;
      }
    }, { passive: true });
  });

  /* ---------- Photo lightbox (with zoom + pan + multi-photo nav) ---------- */
  var lightbox = document.getElementById("lightbox");
  var lightboxImg = document.getElementById("lightboxImg");
  var lightboxClose = document.getElementById("lightboxClose");
  var lightboxPrev = document.getElementById("lightboxPrev");
  var lightboxNext = document.getElementById("lightboxNext");
  var lightboxCounter = document.getElementById("lightboxCounter");
  var lastFocusedEl = null;

  var currentGallery = []; // array of { src, alt } for the open gallery
  var currentIndex = 0;

  var MIN_SCALE = 1;
  var MAX_SCALE = 4;
  var zoom = { scale: 1, x: 0, y: 0 };
  var pointers = {}; // active pointer positions, keyed by pointerId
  var pinchStartDist = 0;
  var pinchStartScale = 1;
  var dragStart = null; // { x, y, zoomX, zoomY }
  var movedDuringPointer = false;

  function applyZoomTransform() {
    lightboxImg.style.transform =
      "translate(" + zoom.x + "px, " + zoom.y + "px) scale(" + zoom.scale + ")";
    lightboxImg.classList.toggle("is-zoomed", zoom.scale > 1);
  }

  function resetZoom() {
    zoom = { scale: 1, x: 0, y: 0 };
    applyZoomTransform();
  }

  function clampPan() {
    // Keep the image roughly within view; simple center-biased clamp.
    var rect = lightboxImg.getBoundingClientRect();
    var maxX = Math.max(0, (rect.width * zoom.scale - rect.width) / 2);
    var maxY = Math.max(0, (rect.height * zoom.scale - rect.height) / 2);
    zoom.x = Math.max(-maxX, Math.min(maxX, zoom.x));
    zoom.y = Math.max(-maxY, Math.min(maxY, zoom.y));
  }

  function setScaleAt(newScale, clientX, clientY) {
    var rect = lightboxImg.getBoundingClientRect();
    var offsetX = clientX - (rect.left + rect.width / 2);
    var offsetY = clientY - (rect.top + rect.height / 2);
    var scaleRatio = newScale / zoom.scale;
    zoom.x = offsetX - (offsetX - zoom.x) * scaleRatio;
    zoom.y = offsetY - (offsetY - zoom.y) * scaleRatio;
    zoom.scale = newScale;
    clampPan();
    applyZoomTransform();
  }

  function showIndex(index) {
    currentIndex = (index + currentGallery.length) % currentGallery.length;
    var item = currentGallery[currentIndex];
    lightboxImg.src = item.src;
    lightboxImg.alt = item.alt || "";
    resetZoom();

    var hasMultiple = currentGallery.length > 1;
    lightboxPrev.hidden = !hasMultiple;
    lightboxNext.hidden = !hasMultiple;
    if (hasMultiple) {
      lightboxCounter.hidden = false;
      lightboxCounter.textContent = (currentIndex + 1) + " / " + currentGallery.length;
    } else {
      lightboxCounter.hidden = true;
    }
  }

  function openLightbox(galleryImages, startIndex) {
    lastFocusedEl = document.activeElement;
    currentGallery = galleryImages;
    showIndex(startIndex);
    lightbox.hidden = false;
    document.body.style.overflow = "hidden";
    lightboxClose.focus();
  }

  function closeLightbox() {
    lightbox.hidden = true;
    lightboxImg.src = "";
    document.body.style.overflow = "";
    resetZoom();
    if (lastFocusedEl) lastFocusedEl.focus();
  }

  if (lightbox && lightboxImg && lightboxClose && lightboxPrev && lightboxNext) {
    document.querySelectorAll(".service-gallery").forEach(function (gallery) {
      var imgs = Array.prototype.slice.call(gallery.querySelectorAll(".service-gallery-slide img"));
      if (!imgs.length) return;
      var galleryImages = imgs.map(function (img) { return { src: img.src, alt: img.alt }; });

      imgs.forEach(function (img, i) {
        img.addEventListener("click", function () {
          openLightbox(galleryImages, i);
        });
      });
    });

    lightboxClose.addEventListener("click", closeLightbox);
    lightboxPrev.addEventListener("click", function () { showIndex(currentIndex - 1); });
    lightboxNext.addEventListener("click", function () { showIndex(currentIndex + 1); });

    lightbox.addEventListener("click", function (e) {
      if (e.target === lightbox) closeLightbox();
    });

    document.addEventListener("keydown", function (e) {
      if (lightbox.hidden) return;
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") showIndex(currentIndex - 1);
      if (e.key === "ArrowRight") showIndex(currentIndex + 1);
    });

    // Double-click / double-tap to toggle zoom
    lightboxImg.addEventListener("dblclick", function (e) {
      if (zoom.scale > 1) {
        resetZoom();
      } else {
        setScaleAt(2.4, e.clientX, e.clientY);
      }
    });

    // Mouse wheel / trackpad to zoom, centered on cursor
    lightboxImg.addEventListener("wheel", function (e) {
      e.preventDefault();
      var next = zoom.scale - e.deltaY * 0.0025;
      next = Math.max(MIN_SCALE, Math.min(MAX_SCALE, next));
      setScaleAt(next, e.clientX, e.clientY);
    }, { passive: false });

    // Pointer-based drag-to-pan and pinch-to-zoom (works for mouse + touch)
    lightboxImg.addEventListener("pointerdown", function (e) {
      pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
      var ids = Object.keys(pointers);

      if (ids.length === 2) {
        var p = Object.values(pointers);
        pinchStartDist = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
        pinchStartScale = zoom.scale;
      } else if (ids.length === 1) {
        movedDuringPointer = false;
        dragStart = { x: e.clientX, y: e.clientY, zoomX: zoom.x, zoomY: zoom.y };
        if (zoom.scale > 1) lightboxImg.classList.add("is-dragging");
      }
      lightboxImg.setPointerCapture(e.pointerId);
    });

    lightboxImg.addEventListener("pointermove", function (e) {
      if (!pointers[e.pointerId]) return;
      pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
      var ids = Object.keys(pointers);

      if (ids.length === 2) {
        var p = Object.values(pointers);
        var dist = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
        var midX = (p[0].x + p[1].x) / 2;
        var midY = (p[0].y + p[1].y) / 2;
        var next = pinchStartScale * (dist / (pinchStartDist || 1));
        next = Math.max(MIN_SCALE, Math.min(MAX_SCALE, next));
        setScaleAt(next, midX, midY);
      } else if (ids.length === 1 && dragStart) {
        var dx = e.clientX - dragStart.x;
        var dy = e.clientY - dragStart.y;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) movedDuringPointer = true;
        if (zoom.scale > 1) {
          zoom.x = dragStart.zoomX + dx;
          zoom.y = dragStart.zoomY + dy;
          clampPan();
          applyZoomTransform();
        }
      }
    });

    function endPointer(e) {
      delete pointers[e.pointerId];
      dragStart = null;
      lightboxImg.classList.remove("is-dragging");
    }
    lightboxImg.addEventListener("pointerup", endPointer);
    lightboxImg.addEventListener("pointercancel", endPointer);
    lightboxImg.addEventListener("pointerleave", function (e) {
      if (Object.keys(pointers).length <= 1) endPointer(e);
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
})();

/* ============================================
   SITE INTRO AUDIO
   ============================================ */

var siteAudio = document.getElementById("siteAudio");

if (siteAudio) {
  siteAudio.volume = 0.5;

  function playIntroAudio() {
    siteAudio.play().catch(function () {
      // Browser blocked playback
    });

    document.removeEventListener("click", playIntroAudio);
    document.removeEventListener("touchstart", playIntroAudio);
  }

  document.addEventListener("click", playIntroAudio);
  document.addEventListener("touchstart", playIntroAudio, { passive: true });
}
