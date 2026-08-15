/* SGA floating "back to top" button — draggable, position persisted, injected on every page. */
(function () {
  "use strict";

  var STORAGE_KEY = "sga-back-to-top-pos";
  var SHOW_AFTER = 400;   // px of scroll before the button appears
  var MARGIN = 16;        // px gap from viewport edges
  var DRAG_THRESHOLD = 6; // px of movement before a press counts as a drag

  var btn, styleEl;
  var posX = null, posY = null;   // current position (fixed, left/top)
  var visible = false, dragging = false, moved = false;
  var startPX, startPY, startX, startY;
  var rafPending = false;

  function clamp(x, y) {
    var w = window.innerWidth, h = window.innerHeight;
    var bw = btn.offsetWidth || 48, bh = btn.offsetHeight || 48;
    x = Math.max(MARGIN, Math.min(x, w - bw - MARGIN));
    y = Math.max(MARGIN, Math.min(y, h - bh - MARGIN));
    return [x, y];
  }

  function setPos(x, y, save) {
    var c = clamp(x, y);
    posX = c[0];
    posY = c[1];
    btn.style.left = posX + "px";
    btn.style.top = posY + "px";
    if (save) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(c)); } catch (e) { /* private mode */ }
    }
  }

  function defaultPos() {
    return [window.innerWidth - 48 - MARGIN, window.innerHeight - 48 - MARGIN];
  }

  function loadPos() {
    try {
      var p = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (p && typeof p[0] === "number" && typeof p[1] === "number") return p;
    } catch (e) { /* ignore */ }
    return defaultPos();
  }

  function setVisible(on) {
    visible = on;
    btn.classList.toggle("sga-btt-visible", on);
  }

  function onScroll() {
    if (dragging) return;
    setVisible(window.scrollY > SHOW_AFTER || document.documentElement.scrollTop > SHOW_AFTER);
  }

  function scrollToTop() {
    try {
      window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
    } catch (e) {
      window.scrollTo(0, 0);
    }
  }

  /* ---- drag handling (pointer events cover mouse + touch) ---- */
  function onDown(e) {
    if (e.button !== undefined && e.button !== 0) return; // left button only for mouse
    dragging = true;
    moved = false;
    startPX = e.clientX;
    startPY = e.clientY;
    startX = posX;
    startY = posY;
    btn.setPointerCapture(e.pointerId);
    btn.classList.add("sga-btt-dragging");
    try { e.preventDefault(); } catch (err) { /* noop */ }
  }

  function onMove(e) {
    if (!dragging) return;
    var dx = e.clientX - startPX;
    var dy = e.clientY - startPY;
    if (!moved && Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return;
    moved = true;
    if (!rafPending) {
      rafPending = true;
      requestAnimationFrame(function () {
        rafPending = false;
        setPos(startX + (e.clientX - startPX), startY + (e.clientY - startPY), false);
      });
    }
  }

  function onUp() {
    if (!dragging) return;
    dragging = false;
    btn.classList.remove("sga-btt-dragging");
    if (moved) {
      setPos(posX, posY, true); // persist final position
    }
  }

  function onClick(e) {
    if (moved) {
      e.preventDefault();
      e.stopPropagation();
      moved = false;
      return;
    }
    scrollToTop();
  }

  /* ---- build the button + styles ---- */
  function inject() {
    styleEl = document.createElement("style");
    styleEl.textContent =
      "#sga-back-to-top{" +
        "position:fixed;left:auto;right:auto;bottom:auto;top:auto;" +
        "z-index:9999;width:48px;height:48px;border-radius:50%;" +
        "display:flex;align-items:center;justify-content:center;" +
        "background:#1e3a5f;color:#fff;border:1px solid rgba(255,255,255,.25);" +
        "box-shadow:0 6px 18px rgba(15,23,42,.28),0 2px 6px rgba(15,23,42,.18);" +
        "cursor:grab;opacity:0;visibility:hidden;transform:translateY(10px) scale(.9);" +
        "transition:opacity .25s ease,transform .25s ease,visibility .25s,box-shadow .2s ease;" +
        "touch-action:none;-webkit-user-select:none;user-select:none;" +
        "font-family:inherit;line-height:0;padding:0;" +
      "}" +
      "#sga-back-to-top:hover{box-shadow:0 10px 26px rgba(15,23,42,.36),0 3px 8px rgba(15,23,42,.22);}" +
      "#sga-back-to-top.sga-btt-visible{opacity:1;visibility:visible;transform:translateY(0) scale(1);}" +
      "#sga-back-to-top.sga-btt-dragging{cursor:grabbing;box-shadow:0 14px 32px rgba(15,23,42,.42);}" +
      "#sga-back-to-top svg{pointer-events:none;display:block;}";

    document.head.appendChild(styleEl);

    btn = document.createElement("button");
    btn.id = "sga-back-to-top";
    btn.type = "button";
    btn.setAttribute("role", "button");
    btn.setAttribute("aria-label", "Back to top");
    btn.setAttribute("title", "Back to top");
    btn.innerHTML =
      '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M12 19V5"/><path d="M5 12l7-7 7 7"/>' +
      "</svg>";
    document.body.appendChild(btn);

    var p = loadPos();
    setPos(p[0], p[1], false);

    btn.addEventListener("pointerdown", onDown);
    btn.addEventListener("pointermove", onMove);
    btn.addEventListener("pointerup", onUp);
    btn.addEventListener("pointercancel", onUp);
    btn.addEventListener("click", onClick);
    btn.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        scrollToTop();
      }
    });

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", function () {
      if (!dragging) setPos(posX, posY, false);
    });
    window.addEventListener("load", onScroll);
    onScroll();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", inject);
  } else {
    inject();
  }
})();
