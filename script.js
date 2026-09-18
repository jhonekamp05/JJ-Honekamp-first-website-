/* =========================================================================
   James Honekamp — site interactions
   Vanilla JS, no dependencies, no build step.
   Every effect checks prefers-reduced-motion and degrades cleanly.
   ========================================================================= */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(pointer: fine)').matches;
  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  if (!reduced) document.documentElement.classList.add('js-anim');

  /* ---------------------------------------------------------------------
     1. BOOT SEQUENCE
     --------------------------------------------------------------------- */
  (function boot() {
    var el = $('#boot');
    if (!el) return;

    var done = false;
    function finish() {
      if (done) return;
      done = true;
      el.classList.add('is-done');
      document.body.style.overflow = '';
      window.setTimeout(function () { el.remove(); }, 700);
    }

    var skip = $('#bootSkip');
    if (skip) skip.addEventListener('click', finish);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' || e.key === ' ') finish();
    });

    if (reduced) { finish(); return; }

    document.body.style.overflow = 'hidden';

    var log  = $('#bootLog');
    var fill = $('#bootFill');
    var pct  = $('#bootPct');

    var lines = [
      'INIT  core.interface ......... OK',
      'LOAD  profile/j.honekamp ..... OK',
      'SYNC  fairfield.dolan ........ OK',
      'MOUNT experience[5] .......... OK',
      'READY'
    ];

    var i = 0;
    (function nextLine() {
      if (i < lines.length) {
        log.textContent += (i ? '\n' : '') + lines[i];
        i++;
        window.setTimeout(nextLine, 260);
      }
    })();

    var p = 0;
    var tick = window.setInterval(function () {
      p += Math.random() * 11 + 6;
      if (p >= 100) { p = 100; window.clearInterval(tick); window.setTimeout(finish, 320); }
      fill.style.width = p + '%';
      pct.textContent = (p < 10 ? '0' : '') + Math.floor(p) + '%';
    }, 120);

    window.setTimeout(finish, 4200); // failsafe
  })();

  /* ---------------------------------------------------------------------
     2. PARTICLE FIELD
     --------------------------------------------------------------------- */
  (function field() {
    var cv = $('#field');
    if (!cv || reduced) return;

    var ctx = cv.getContext('2d');
    var w = 0, h = 0, dpr = 1;
    var pts = [];
    var mouse = { x: -9999, y: -9999 };
    var raf = null;

    function size() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      cv.width = Math.floor(w * dpr);
      cv.height = Math.floor(h * dpr);
      cv.style.width = w + 'px';
      cv.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    }

    function seed() {
      var density = w < 700 ? 16000 : 11000;
      var n = Math.min(110, Math.max(26, Math.round((w * h) / density)));
      pts = [];
      for (var i = 0; i < n; i++) {
        pts.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.28,
          vy: (Math.random() - 0.5) * 0.28,
          r: Math.random() * 1.5 + 0.5,
          gold: Math.random() < 0.16
        });
      }
    }

    function frame() {
      ctx.clearRect(0, 0, w, h);
      var link = w < 700 ? 96 : 132;

      for (var i = 0; i < pts.length; i++) {
        var p = pts[i];
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < -20) p.x = w + 20;
        if (p.x > w + 20) p.x = -20;
        if (p.y < -20) p.y = h + 20;
        if (p.y > h + 20) p.y = -20;

        // gentle push away from the pointer
        var mdx = p.x - mouse.x, mdy = p.y - mouse.y;
        var md = Math.sqrt(mdx * mdx + mdy * mdy);
        if (md < 130 && md > 0.1) {
          var push = (130 - md) / 130 * 0.9;
          p.x += (mdx / md) * push;
          p.y += (mdy / md) * push;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.gold ? 'rgba(255,178,58,.65)' : 'rgba(79,233,245,.6)';
        ctx.fill();

        for (var j = i + 1; j < pts.length; j++) {
          var q = pts[j];
          var dx = p.x - q.x, dy = p.y - q.y;
          var d = Math.sqrt(dx * dx + dy * dy);
          if (d < link) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = 'rgba(79,233,245,' + (0.17 * (1 - d / link)).toFixed(3) + ')';
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }

        // pointer tether
        if (md < 165) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.strokeStyle = 'rgba(255,178,58,' + (0.2 * (1 - md / 165)).toFixed(3) + ')';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
      raf = window.requestAnimationFrame(frame);
    }

    window.addEventListener('pointermove', function (e) { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });
    window.addEventListener('pointerleave', function () { mouse.x = -9999; mouse.y = -9999; });

    var rt;
    window.addEventListener('resize', function () {
      window.clearTimeout(rt);
      rt = window.setTimeout(size, 180);
    });

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { window.cancelAnimationFrame(raf); raf = null; }
      else if (!raf) frame();
    });

    size();
    frame();
  })();

  /* ---------------------------------------------------------------------
     3. CUSTOM CURSOR
     --------------------------------------------------------------------- */
  (function cursor() {
    if (reduced || !finePointer) return;
    var dot = $('#cursorDot'), ring = $('#cursorRing');
    if (!dot || !ring) return;

    document.body.classList.add('cursor-on');

    var mx = window.innerWidth / 2, my = window.innerHeight / 2;
    var rx = mx, ry = my;

    window.addEventListener('pointermove', function (e) {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = 'translate(' + mx + 'px,' + my + 'px)';
    }, { passive: true });

    (function loop() {
      rx += (mx - rx) * 0.16;
      ry += (my - ry) * 0.16;
      ring.style.transform = 'translate(' + rx + 'px,' + ry + 'px)';
      window.requestAnimationFrame(loop);
    })();

    document.addEventListener('pointerover', function (e) {
      if (e.target.closest('a, button, .stat, .tl__card, .proj, .chip, .skillgrid__item')) {
        ring.classList.add('is-hot');
      }
    });
    document.addEventListener('pointerout', function (e) {
      if (e.target.closest('a, button, .stat, .tl__card, .proj, .chip, .skillgrid__item')) {
        ring.classList.remove('is-hot');
      }
    });
  })();

  /* ---------------------------------------------------------------------
     4. TEXT SCRAMBLE
     --------------------------------------------------------------------- */
  var GLYPHS = '#%&@$/\\<>[]{}*+=_01';

  function scramble(el, dur) {
    if (reduced) return;
    var text = el.getAttribute('data-text') || el.textContent;
    var len = text.length;
    var start = performance.now();
    dur = dur || 620;

    function step(now) {
      var t = Math.min((now - start) / dur, 1);
      var settled = Math.floor(t * len);
      var out = '';
      for (var i = 0; i < len; i++) {
        if (i < settled || text[i] === ' ') out += text[i];
        else out += GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      }
      el.textContent = out;
      if (t < 1) window.requestAnimationFrame(step);
      else el.textContent = text;
    }
    window.requestAnimationFrame(step);
  }

  $$('.hero__name .scramble').forEach(function (el, idx) {
    el.addEventListener('pointerenter', function () { scramble(el, 500); });
    if (!reduced) window.setTimeout(function () { scramble(el, 700); }, 1500 + idx * 140);
  });

  /* ---------------------------------------------------------------------
     5. TYPED ROLE LINE
     --------------------------------------------------------------------- */
  (function typed() {
    var el = $('#typedRole');
    if (!el) return;

    var roles = [
      'Finance Major, Class of 2028',
      'Dolan School of Business',
      'Private Equity Club',
      'Real Estate Club',
      'Entrepreneurship Club',
      'Fairfield Men’s Basketball'
    ];

    if (reduced) { el.textContent = roles[0]; return; }

    var r = 0, c = 0, erasing = false;

    (function tick() {
      var word = roles[r];
      c += erasing ? -1 : 1;
      el.textContent = word.slice(0, c);

      var wait = erasing ? 32 : 58;
      if (!erasing && c === word.length) { erasing = true; wait = 1900; }
      else if (erasing && c === 0) { erasing = false; r = (r + 1) % roles.length; wait = 320; }

      window.setTimeout(tick, wait);
    })();
  })();

  /* ---------------------------------------------------------------------
     6. REVEAL ON SCROLL (+ scramble section titles)
     --------------------------------------------------------------------- */
  (function reveals() {
    var items = $$('.reveal');
    if (!items.length) return;

    function show(el) {
      el.classList.add('is-in');
      var title = el.querySelector('h2.scramble');
      if (title) scramble(title, 560);
    }

    if (reduced || !('IntersectionObserver' in window)) {
      items.forEach(show);
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        var sibs = Array.prototype.slice.call(el.parentNode.children).filter(function (n) {
          return n.classList && n.classList.contains('reveal');
        });
        var delay = Math.min(sibs.indexOf(el), 5) * 90;
        window.setTimeout(function () { show(el); }, delay);
        io.unobserve(el);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

    items.forEach(function (el) { io.observe(el); });

    // failsafe: nothing stays hidden
    window.setTimeout(function () { items.forEach(function (el) { el.classList.add('is-in'); }); }, 5000);
  })();

  /* ---------------------------------------------------------------------
     7. COUNT-UP STATS
     --------------------------------------------------------------------- */
  (function counters() {
    var nums = $$('[data-count]');
    if (!nums.length) return;

    function run(el) {
      var target = parseInt(el.getAttribute('data-count'), 10);
      if (reduced) { el.textContent = target; return; }
      var from = target > 100 ? target - 36 : 0;
      var dur = 1200;
      var start = performance.now();

      (function step(now) {
        var t = Math.min((now - start) / dur, 1);
        var eased = 1 - Math.pow(1 - t, 3);
        el.textContent = Math.round(from + (target - from) * eased);
        if (t < 1) window.requestAnimationFrame(step);
        else el.textContent = target;
      })(start);
    }

    if (!('IntersectionObserver' in window)) { nums.forEach(run); return; }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { run(e.target); io.unobserve(e.target); }
      });
    }, { threshold: 0.4 });

    nums.forEach(function (el) { io.observe(el); });
  })();

  /* ---------------------------------------------------------------------
     8. NAV: stuck state, progress beam, scrollspy, indicator, mobile menu
     --------------------------------------------------------------------- */
  (function nav() {
    var bar     = $('#nav');
    var prog    = $('#navProgress');
    var links   = $$('#navLinks a[data-nav]');
    var ind     = $('#navInd');
    var toggle  = $('#navToggle');
    var linkBox = $('#navLinks');

    var sections = links.map(function (a) { return $(a.getAttribute('href')); }).filter(Boolean);

    function moveInd(a) {
      if (!ind || !a || window.innerWidth <= 980) return;
      ind.style.width = a.offsetWidth + 'px';
      ind.style.transform = 'translateX(' + a.offsetLeft + 'px)';
    }

    function onScroll() {
      var y = window.scrollY || window.pageYOffset;
      var max = document.documentElement.scrollHeight - window.innerHeight;
      if (prog) prog.style.width = (max > 0 ? (y / max) * 100 : 0) + '%';
      if (bar) bar.classList.toggle('is-stuck', y > 40);

      var current = null;
      sections.forEach(function (s) {
        if (s.getBoundingClientRect().top <= window.innerHeight * 0.38) current = s;
      });

      links.forEach(function (a) {
        var on = current && a.getAttribute('href') === '#' + current.id;
        a.classList.toggle('is-active', !!on);
        if (on) moveInd(a);
      });

      if (!current && ind) ind.style.width = '0px';
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    onScroll();

    if (toggle && linkBox) {
      toggle.addEventListener('click', function () {
        var open = linkBox.classList.toggle('is-open');
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      });
      links.forEach(function (a) {
        a.addEventListener('click', function () {
          linkBox.classList.remove('is-open');
          toggle.setAttribute('aria-expanded', 'false');
        });
      });
    }
  })();

  /* ---------------------------------------------------------------------
     9. TIMELINE SPINE
     --------------------------------------------------------------------- */
  (function spine() {
    var tl   = $('#timeline');
    var fill = $('#timelineFill');
    if (!tl || !fill) return;

    var cards = $$('.tl', tl);

    function onScroll() {
      var r = tl.getBoundingClientRect();
      var mid = window.innerHeight * 0.55;
      var p = (mid - r.top) / r.height;
      p = Math.max(0, Math.min(1, p));
      fill.style.height = (p * 100) + '%';

      cards.forEach(function (c) {
        var cr = c.getBoundingClientRect();
        c.classList.toggle('is-lit', cr.top < mid);
      });
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    onScroll();
  })();

  /* ---------------------------------------------------------------------
     10. MAGNETIC BUTTONS
     --------------------------------------------------------------------- */
  (function magnetic() {
    if (reduced || !finePointer) return;

    $$('.magnetic').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var x = e.clientX - r.left - r.width / 2;
        var y = e.clientY - r.top - r.height / 2;
        el.style.transform = 'translate(' + (x * 0.22).toFixed(2) + 'px,' + (y * 0.28).toFixed(2) + 'px)';
      });
      el.addEventListener('pointerleave', function () {
        el.style.transition = 'transform .35s cubic-bezier(.22,1,.36,1)';
        el.style.transform = '';
        window.setTimeout(function () { el.style.transition = ''; }, 380);
      });
    });
  })();

  /* ---------------------------------------------------------------------
     11. RIPPLE
     --------------------------------------------------------------------- */
  $$('.ripple').forEach(function (el) {
    el.addEventListener('pointerdown', function (e) {
      if (reduced) return;
      var r = el.getBoundingClientRect();
      var size = Math.max(r.width, r.height);
      var s = document.createElement('span');
      s.className = 'rip';
      s.style.width = s.style.height = size + 'px';
      s.style.left = (e.clientX - r.left - size / 2) + 'px';
      s.style.top = (e.clientY - r.top - size / 2) + 'px';
      el.appendChild(s);
      window.setTimeout(function () { s.remove(); }, 620);
    });
  });

  /* ---------------------------------------------------------------------
     12. PORTRAIT TILT
     --------------------------------------------------------------------- */
  (function tilt() {
    var el = $('#portrait');
    if (!el || reduced || !finePointer) return;

    var wrapEl = el.parentNode;

    wrapEl.addEventListener('pointermove', function (e) {
      var r = wrapEl.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width - 0.5;
      var y = (e.clientY - r.top) / r.height - 0.5;
      el.style.transform =
        'perspective(900px) rotateY(' + (x * 13).toFixed(2) + 'deg) rotateX(' + (-y * 13).toFixed(2) + 'deg)';
    });

    wrapEl.addEventListener('pointerleave', function () {
      el.style.transition = 'transform .6s cubic-bezier(.22,1,.36,1)';
      el.style.transform = '';
      window.setTimeout(function () { el.style.transition = ''; }, 640);
    });
  })();

  /* ---------------------------------------------------------------------
     13. FOOTER: live clock + year
     --------------------------------------------------------------------- */
  (function clock() {
    var y = $('#year');
    if (y) y.textContent = new Date().getFullYear();

    var el = $('#clock');
    if (!el) return;

    function paint() {
      var t;
      try {
        t = new Date().toLocaleTimeString('en-US', {
          timeZone: 'America/New_York', hour12: false,
          hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
      } catch (err) {
        t = new Date().toTimeString().slice(0, 8);
      }
      el.textContent = t + ' ET';
    }
    paint();
    window.setInterval(paint, 1000);
  })();

})();

/* =========================================================================
   James Honekamp — personal site
   Single committed dark HUD theme. Every color is painted explicitly.
   ========================================================================= */

:root{
  /* ground */
  --void:      #05070b;
  --deep:      #080d14;
  --panel:     #0b121b;
  --panel-2:   #0e1722;
  --line:      #172534;
  --line-soft: #121d29;

  /* ink — neutrals biased slightly toward the cyan accent */
  --ink:       #e2edf5;
  --ink-2:     #a8bccd;
  --ink-3:     #6d8395;

  /* accents */
  --cyan:      #4fe9f5;
  --cyan-dim:  #2bb8c4;
  --cyan-glow: rgba(79,233,245,.35);
  --gold:      #ffb23a;
  --gold-dim:  #c9862a;
  --ember:     #ff5a3c;

  /* type */
  --display: "Chakra Petch", "Segoe UI Semibold", system-ui, sans-serif;
  --body:    "Barlow", "Helvetica Neue", Arial, sans-serif;
  --mono:    "JetBrains Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace;

  /* rhythm */
  --wrap: 1140px;
  --gut: clamp(18px, 4vw, 44px);
  --sec-pad: clamp(64px, 7.5vw, 104px);

  color-scheme: dark;
}

*,*::before,*::after{ box-sizing:border-box; }

html{ scroll-behavior:smooth; }

body{
  margin:0;
  background:var(--void);
  color:var(--ink);
  font-family:var(--body);
  font-size:clamp(15px,1.05vw,17px);
  font-weight:300;
  line-height:1.65;
  -webkit-font-smoothing:antialiased;
  overflow-x:hidden;
}

img{ max-width:100%; display:block; }

h1,h2,h3{
  font-family:var(--display);
  font-weight:600;
  line-height:1.05;
  margin:0;
  text-wrap:balance;
  letter-spacing:-.01em;
}

p{ margin:0 0 1.1em; }
ul{ margin:0; padding:0; list-style:none; }

a{ color:var(--cyan); text-decoration:none; }

.mono{
  font-family:var(--mono);
  font-weight:400;
  letter-spacing:.12em;
  text-transform:uppercase;
  font-size:.7rem;
}

.wrap{
  width:100%;
  max-width:var(--wrap);
  margin-inline:auto;
  padding-inline:var(--gut);
}

:focus-visible{
  outline:2px solid var(--cyan);
  outline-offset:3px;
  border-radius:2px;
}

.skip-link{
  position:fixed; top:-60px; left:16px; z-index:200;
  background:var(--cyan); color:var(--void);
  padding:10px 16px; font-family:var(--mono); font-size:.75rem;
  transition:top .2s ease;
}
.skip-link:focus{ top:16px; }

/* =========================================================================
   AMBIENT LAYERS
   ========================================================================= */

.field{
  position:fixed; inset:0; z-index:0;
  width:100%; height:100%;
  pointer-events:none;
}

.grid-veil{
  position:fixed; inset:0; z-index:0; pointer-events:none;
  background-image:
    linear-gradient(rgba(79,233,245,.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(79,233,245,.05) 1px, transparent 1px);
  background-size:72px 72px;
  mask-image:radial-gradient(ellipse 80% 60% at 50% 25%, #000 25%, transparent 78%);
  -webkit-mask-image:radial-gradient(ellipse 80% 60% at 50% 25%, #000 25%, transparent 78%);
  opacity:.75;
}

.scanlines{
  position:fixed; inset:0; z-index:1; pointer-events:none;
  background:repeating-linear-gradient(
    to bottom,
    rgba(255,255,255,.022) 0px,
    rgba(255,255,255,.022) 1px,
    transparent 1px,
    transparent 3px
  );
  opacity:.6;
  animation:drift 9s linear infinite;
}
@keyframes drift{ from{ background-position-y:0; } to{ background-position-y:3px; } }

.vignette{
  position:fixed; inset:0; z-index:1; pointer-events:none;
  background:radial-gradient(ellipse 120% 80% at 50% 40%, transparent 45%, rgba(3,5,8,.85) 100%);
}

.hud-frame{ position:fixed; inset:0; z-index:40; pointer-events:none; }
.hud-corner{
  position:absolute; width:30px; height:30px;
  border:1px solid rgba(79,233,245,.4);
}
.hud-corner--tl{ top:14px; left:14px;  border-right:0; border-bottom:0; }
.hud-corner--tr{ top:14px; right:14px; border-left:0;  border-bottom:0; }
.hud-corner--bl{ bottom:14px; left:14px;  border-right:0; border-top:0; }
.hud-corner--br{ bottom:14px; right:14px; border-left:0;  border-top:0; }

/* =========================================================================
   CUSTOM CURSOR
   ========================================================================= */

.cursor,.cursor-ring{
  position:fixed; top:0; left:0; z-index:180;
  pointer-events:none; opacity:0;
  will-change:transform;
}
.cursor{
  width:6px; height:6px; margin:-3px 0 0 -3px;
  background:var(--gold); border-radius:50%;
  box-shadow:0 0 10px rgba(255,178,58,.8);
}
.cursor-ring{
  width:34px; height:34px; margin:-17px 0 0 -17px;
  transition:width .22s ease, height .22s ease, margin .22s ease, border-color .22s ease;
}
.cursor-ring span{
  display:block; width:100%; height:100%;
  border:1px solid rgba(79,233,245,.75);
  border-radius:50%;
  border-top-color:transparent;
  border-bottom-color:transparent;
  animation:spin 3.2s linear infinite;
}
.cursor-ring.is-hot{ width:56px; height:56px; margin:-28px 0 0 -28px; }
.cursor-ring.is-hot span{ border-color:rgba(255,178,58,.9); border-top-color:transparent; border-bottom-color:transparent; }
@keyframes spin{ to{ transform:rotate(360deg); } }

body.cursor-on{ cursor:none; }
body.cursor-on a,
body.cursor-on button{ cursor:none; }
body.cursor-on .cursor,
body.cursor-on .cursor-ring{ opacity:1; }

/* =========================================================================
   BOOT SEQUENCE
   ========================================================================= */

.boot{
  position:fixed; inset:0; z-index:300;
  display:grid; place-items:center;
  background:
    radial-gradient(circle at 50% 45%, rgba(79,233,245,.09), transparent 55%),
    var(--void);
  transition:opacity .55s ease, visibility .55s ease;
}
.boot.is-done{ opacity:0; visibility:hidden; }

.boot__inner{
  display:flex; flex-direction:column; align-items:center;
  gap:22px; padding:24px; width:min(440px,90vw);
}

.boot__reactor{ position:relative; width:110px; height:110px; }
.boot__ring{
  position:absolute; inset:0; border-radius:50%;
  border:1px solid rgba(79,233,245,.5);
}
.boot__ring--a{ border-top-color:transparent; border-left-color:transparent; animation:spin 2.4s linear infinite; }
.boot__ring--b{ inset:14px; border-bottom-color:transparent; border-right-color:transparent; border-color:rgba(255,178,58,.65); animation:spin 1.7s linear infinite reverse; }
.boot__ring--c{ inset:28px; border-style:dashed; border-color:rgba(79,233,245,.35); animation:spin 5s linear infinite; }
.boot__core{
  position:absolute; inset:41px; border-radius:50%;
  background:radial-gradient(circle, #ffffff 0%, var(--cyan) 45%, rgba(79,233,245,0) 78%);
  animation:pulse 1.6s ease-in-out infinite;
}
@keyframes pulse{ 0%,100%{ transform:scale(.85); opacity:.75; } 50%{ transform:scale(1.12); opacity:1; } }

.boot__log{
  font-family:var(--mono); font-size:.68rem; line-height:1.85;
  color:var(--cyan-dim); margin:0; min-height:6.5em; width:100%;
  text-align:left; white-space:pre-wrap; word-break:break-word;
}
.boot__bar{
  width:100%; height:2px; background:rgba(79,233,245,.16); overflow:hidden;
}
.boot__bar i{
  display:block; height:100%; width:0%;
  background:linear-gradient(90deg,var(--cyan-dim),var(--cyan),var(--gold));
  box-shadow:0 0 12px var(--cyan-glow);
}
.boot__pct{ color:var(--ink-3); font-size:.65rem; }
.boot__skip{
  background:none; border:1px solid var(--line);
  color:var(--ink-3); padding:7px 14px; cursor:pointer;
  font-family:var(--mono); font-size:.62rem; letter-spacing:.14em; text-transform:uppercase;
  transition:color .2s ease, border-color .2s ease;
}
.boot__skip:hover{ color:var(--cyan); border-color:var(--cyan-dim); }

/* =========================================================================
   NAV
   ========================================================================= */

.nav{
  position:fixed; top:0; left:0; right:0; z-index:100;
  background:rgba(5,7,11,0);
  border-bottom:1px solid transparent;
  transition:background .3s ease, border-color .3s ease, backdrop-filter .3s ease;
}
.nav.is-stuck{
  background:rgba(5,7,11,.82);
  backdrop-filter:blur(14px);
  -webkit-backdrop-filter:blur(14px);
  border-bottom-color:var(--line-soft);
}
.nav__progress{
  position:absolute; top:0; left:0; height:2px; width:0%;
  background:linear-gradient(90deg,var(--cyan),var(--gold));
  box-shadow:0 0 10px var(--cyan-glow);
}
.nav__inner{
  max-width:var(--wrap); margin-inline:auto;
  padding:14px var(--gut);
  display:flex; align-items:center; gap:18px;
}

.brand{ display:flex; align-items:center; gap:10px; color:var(--cyan); }
.brand__mark{ display:flex; animation:spin 22s linear infinite; }
.brand__text{
  font-family:var(--display); font-weight:600; font-size:.95rem;
  letter-spacing:.06em; color:var(--ink);
}

.nav__links{
  margin-left:auto; position:relative;
  display:flex; align-items:center; gap:4px;
}
.nav__links a{
  position:relative; padding:8px 13px;
  font-family:var(--mono); font-size:.66rem; letter-spacing:.14em; text-transform:uppercase;
  color:var(--ink-3);
  transition:color .22s ease;
}
.nav__links a:hover{ color:var(--ink); }
.nav__links a.is-active{ color:var(--cyan); }
.nav__ind{
  position:absolute; bottom:0; left:0; height:1px; width:0;
  background:var(--cyan); box-shadow:0 0 8px var(--cyan-glow);
  transition:transform .35s cubic-bezier(.22,1,.36,1), width .35s cubic-bezier(.22,1,.36,1);
}

.nav__toggle{
  display:none; margin-left:auto;
  width:40px; height:36px; padding:9px 8px;
  background:none; border:1px solid var(--line); cursor:pointer;
  flex-direction:column; justify-content:space-between;
}
.nav__toggle span{ display:block; height:1px; background:var(--cyan); transition:transform .25s ease, opacity .25s ease; }
.nav__toggle[aria-expanded="true"] span:nth-child(1){ transform:translateY(8px) rotate(45deg); }
.nav__toggle[aria-expanded="true"] span:nth-child(2){ opacity:0; }
.nav__toggle[aria-expanded="true"] span:nth-child(3){ transform:translateY(-8px) rotate(-45deg); }

/* =========================================================================
   BUTTONS
   ========================================================================= */

.btn{
  position:relative; overflow:hidden;
  display:inline-flex; align-items:center; justify-content:center;
  padding:13px 26px;
  font-family:var(--mono); font-size:.7rem; letter-spacing:.16em; text-transform:uppercase;
  border:1px solid var(--cyan-dim);
  color:var(--cyan); background:rgba(79,233,245,.05);
  clip-path:polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px);
  transition:background .25s ease, color .25s ease, border-color .25s ease, box-shadow .25s ease;
  will-change:transform;
}
.btn span{ position:relative; z-index:2; }
.btn:hover{
  background:rgba(79,233,245,.14);
  box-shadow:0 0 22px rgba(79,233,245,.22), inset 0 0 18px rgba(79,233,245,.08);
  color:#ffffff;
}
.btn--gold{ border-color:var(--gold-dim); color:var(--gold); background:rgba(255,178,58,.05); }
.btn--gold:hover{ background:rgba(255,178,58,.15); box-shadow:0 0 22px rgba(255,178,58,.24); color:#fff3dd; }
.btn--ghost{ border-color:var(--line); color:var(--ink-2); background:transparent; }
.btn--ghost:hover{ border-color:var(--cyan-dim); color:var(--cyan); background:rgba(79,233,245,.07); box-shadow:none; }
.btn--sm{ padding:10px 18px; font-size:.64rem; }
.btn--lg{ padding:17px 34px; font-size:.78rem; }

.btn .rip{
  position:absolute; border-radius:50%; transform:scale(0);
  background:rgba(79,233,245,.35); pointer-events:none; z-index:1;
  animation:rip .6s ease-out forwards;
}
@keyframes rip{ to{ transform:scale(2.6); opacity:0; } }

.chiplink{
  display:inline-flex; align-items:center; gap:8px;
  padding:8px 14px;
  border:1px solid var(--line);
  color:var(--ink-2);
  font-family:var(--mono); font-size:.64rem; letter-spacing:.1em; text-transform:uppercase;
  transition:border-color .22s ease, color .22s ease, background .22s ease;
  will-change:transform;
}
.chiplink:hover{ border-color:var(--cyan-dim); color:var(--cyan); background:rgba(79,233,245,.06); }

/* =========================================================================
   HERO
   ========================================================================= */

.hero{
  position:relative; z-index:2;
  padding-top:clamp(120px,16vh,180px);
  padding-bottom:clamp(60px,9vh,110px);
}

.hero__grid{
  display:grid;
  grid-template-columns:minmax(0,1.25fr) minmax(0,.9fr);
  gap:clamp(32px,6vw,72px);
  align-items:center;
}

.eyebrow{
  display:inline-flex; align-items:center; gap:9px;
  color:var(--ink-3); margin:0 0 20px;
}
.pulse-dot{
  width:6px; height:6px; border-radius:50%;
  background:var(--cyan); box-shadow:0 0 0 0 var(--cyan-glow);
  animation:ping 2s ease-out infinite;
}
@keyframes ping{
  0%{ box-shadow:0 0 0 0 rgba(79,233,245,.55); }
  70%{ box-shadow:0 0 0 9px rgba(79,233,245,0); }
  100%{ box-shadow:0 0 0 0 rgba(79,233,245,0); }
}

.hero__name{
  font-size:clamp(2.7rem,7.6vw,5.4rem);
  font-weight:700;
  letter-spacing:-.025em;
  line-height:.96;
  margin:0 0 18px;
  text-transform:uppercase;
}
.hero__name span{ display:block; }
.hero__name span:last-child{
  color:transparent;
  background:linear-gradient(100deg,var(--cyan) 0%, #cfeff3 40%, var(--gold) 100%);
  -webkit-background-clip:text;
  background-clip:text;
}

.hero__role{
  font-family:var(--mono); font-size:clamp(.78rem,1.6vw,.95rem);
  letter-spacing:.1em; color:var(--ink-2);
  margin:0 0 22px; min-height:1.6em;
  display:flex; align-items:center; gap:10px;
}
.hero__role-pre{ color:var(--gold); font-size:inherit; letter-spacing:0; }
.caret{
  display:inline-block; width:9px; height:1.05em;
  background:var(--cyan); animation:blink 1.05s steps(2) infinite;
}
@keyframes blink{ 50%{ opacity:0; } }

.hero__lede{
  max-width:46ch; color:var(--ink-2);
  font-size:1.03rem; margin:0 0 30px;
}

.hero__cta{ display:flex; flex-wrap:wrap; gap:12px; margin-bottom:26px; }
.hero__links{ display:flex; flex-wrap:wrap; gap:9px; }

/* portrait */
.hero__portrait{ display:flex; justify-content:center; }
.portrait{
  position:relative; width:min(380px,78vw); aspect-ratio:1;
  color:var(--cyan);
  transform-style:preserve-3d;
  will-change:transform;
}
.portrait__rings{ position:absolute; inset:0; width:100%; height:100%; overflow:visible; }
.ring{ transform-origin:200px 200px; }
.ring--slow{ animation:spin 44s linear infinite; }
.ring--fast{ animation:spin 9s linear infinite; color:var(--gold); stroke:var(--gold); }
.ring--rev{ animation:spin 26s linear infinite reverse; }
.ring--ticks{ animation:spin 60s linear infinite reverse; }

.portrait__hex{
  position:absolute; inset:16%;
  clip-path:polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%);
  background:var(--panel);
  overflow:hidden;
}
.portrait__hex img{
  width:100%; height:100%; object-fit:cover; object-position:50% 28%;
  transform:scale(1.06);
  filter:saturate(.84) contrast(1.06) brightness(.97);
}
.portrait__sweep{
  position:absolute; left:0; right:0; height:38%;
  background:linear-gradient(to bottom, transparent, rgba(79,233,245,.22), transparent);
  animation:sweep 4.8s ease-in-out infinite;
}
@keyframes sweep{
  0%{ transform:translateY(-110%); opacity:0; }
  15%{ opacity:1; }
  85%{ opacity:1; }
  100%{ transform:translateY(310%); opacity:0; }
}
.portrait__mesh{
  position:absolute; inset:0;
  background-image:
    linear-gradient(rgba(79,233,245,.13) 1px, transparent 1px),
    linear-gradient(90deg, rgba(79,233,245,.13) 1px, transparent 1px);
  background-size:24px 24px;
  mix-blend-mode:screen;
  opacity:.5;
}
.portrait__tag{
  position:absolute; bottom:4%; left:50%; transform:translateX(-50%);
  color:var(--gold); font-size:.6rem; white-space:nowrap;
  background:rgba(5,7,11,.8); padding:4px 10px; border:1px solid rgba(255,178,58,.3);
}

/* stats */
.stats{
  display:grid; grid-template-columns:repeat(4,1fr);
  gap:1px; margin-top:clamp(46px,7vw,80px);
  background:var(--line-soft);
  border:1px solid var(--line-soft);
}
.stat{
  background:rgba(8,13,20,.72);
  padding:22px 18px;
  display:flex; flex-direction:column; gap:6px;
  transition:background .25s ease;
}
.stat:hover{ background:rgba(79,233,245,.055); }
.stat__num{
  font-size:clamp(1.5rem,3.4vw,2.1rem); color:var(--cyan);
  letter-spacing:.02em; text-transform:none;
  font-variant-numeric:tabular-nums; font-weight:500;
}
.stat__label{
  font-family:var(--mono); font-size:.6rem; letter-spacing:.14em;
  text-transform:uppercase; color:var(--ink-3);
}

.scroll-hint{
  display:flex; flex-direction:column; align-items:center; gap:8px;
  width:max-content; margin:clamp(40px,6vw,64px) auto 0;
  color:var(--ink-3); font-size:.58rem;
}
.scroll-hint:hover{ color:var(--cyan); }
.scroll-hint i{
  display:block; width:1px; height:42px;
  background:linear-gradient(to bottom,var(--cyan),transparent);
  animation:fall 2s ease-in-out infinite;
}
@keyframes fall{ 0%,100%{ transform:scaleY(.4); opacity:.4; } 50%{ transform:scaleY(1); opacity:1; } }

/* =========================================================================
   SECTIONS
   ========================================================================= */

.section{
  position:relative; z-index:2;
  padding-block:var(--sec-pad);
}

.sec-head{
  display:flex; align-items:center; gap:16px;
  margin-bottom:clamp(30px,4.5vw,52px);
}
.sec-index{ color:var(--gold); font-size:.68rem; }
.sec-head h2{
  font-size:clamp(1.7rem,4.2vw,2.7rem);
  text-transform:uppercase; letter-spacing:.01em;
  white-space:nowrap;
}
.sec-rule{
  flex:1; height:1px;
  background:linear-gradient(90deg,var(--line),transparent);
}

.panel__label{
  display:block; color:var(--gold); margin-bottom:14px; font-size:.62rem;
}

/* about */
.about{
  display:grid; grid-template-columns:minmax(0,1.5fr) minmax(0,1fr);
  gap:clamp(28px,5vw,56px);
  align-items:start;
}
.about__text p{ color:var(--ink-2); max-width:62ch; }
.about__text .lead{
  color:var(--ink); font-size:1.18rem; font-weight:400;
  font-family:var(--display); line-height:1.45;
}

.panel{
  background:linear-gradient(160deg, rgba(14,23,34,.9), rgba(8,13,20,.9));
  border:1px solid var(--line-soft);
  border-left:2px solid var(--cyan-dim);
  padding:24px;
}
.kv div{
  display:flex; justify-content:space-between; gap:14px;
  padding:9px 0; border-bottom:1px dashed var(--line-soft);
}
.kv div:last-child{ border-bottom:0; }
.kv dt{
  font-family:var(--mono); font-size:.6rem; letter-spacing:.12em;
  text-transform:uppercase; color:var(--ink-3);
}
.kv dd{ margin:0; font-size:.88rem; color:var(--ink); text-align:right; }
.dot-live{
  display:inline-block; width:6px; height:6px; border-radius:50%;
  background:#3ddc97; margin-right:6px;
  box-shadow:0 0 8px rgba(61,220,151,.8);
  animation:ping2 2.2s ease-out infinite;
}
@keyframes ping2{ 0%,100%{ opacity:.55; } 50%{ opacity:1; } }

/* education */
.edu{
  display:grid; grid-template-columns:minmax(0,1.5fr) minmax(0,1fr);
  gap:clamp(24px,4vw,48px);
  padding:clamp(24px,3.5vw,38px);
  background:linear-gradient(140deg, rgba(14,23,34,.85), rgba(5,7,11,.85));
  border:1px solid var(--line-soft);
  position:relative;
}
.edu::before{
  content:""; position:absolute; top:0; left:0; width:60px; height:2px;
  background:var(--gold);
}
.edu__main h3{ font-size:clamp(1.2rem,2.6vw,1.6rem); margin-bottom:10px; }
.edu__meta{
  color:var(--ink-3); font-size:.66rem; margin:0 0 16px; letter-spacing:.1em;
}
.edu__honor{ margin:0; }
.badge{
  display:inline-block; padding:6px 13px;
  border:1px solid rgba(255,178,58,.45);
  background:rgba(255,178,58,.08);
  color:var(--gold);
  font-family:var(--mono); font-size:.62rem; letter-spacing:.12em; text-transform:uppercase;
}
.orglist li{
  display:flex; align-items:center; gap:11px;
  padding:9px 0; color:var(--ink-2); font-size:.92rem;
  border-bottom:1px solid var(--line-soft);
}
.orglist li:last-child{ border-bottom:0; }
.orglist__bar{
  width:14px; height:1px; background:var(--cyan); flex:0 0 auto;
  transition:width .25s ease;
}
.orglist li:hover .orglist__bar{ width:24px; }

/* timeline */
.timeline{ position:relative; padding-left:clamp(26px,4vw,44px); max-width:940px; }
.timeline__track{
  position:absolute; left:6px; top:6px; bottom:6px; width:1px;
  background:var(--line);
}
.timeline__track i{
  position:absolute; top:0; left:0; width:100%; height:0%;
  background:linear-gradient(to bottom,var(--cyan),var(--gold));
  box-shadow:0 0 10px var(--cyan-glow);
}

.tl{ position:relative; padding-bottom:clamp(22px,3vw,34px); }
.tl:last-child{ padding-bottom:0; }
.tl__node{
  position:absolute; left:calc(-1 * clamp(26px,4vw,44px) + 1px); top:24px;
  width:11px; height:11px;
  border:1px solid var(--cyan);
  background:var(--void);
  transform:rotate(45deg);
  transition:background .3s ease, box-shadow .3s ease;
}
.tl.is-lit .tl__node{ background:var(--cyan); box-shadow:0 0 14px var(--cyan-glow); }

.tl__card{
  background:rgba(8,13,20,.72);
  border:1px solid var(--line-soft);
  padding:clamp(20px,2.6vw,28px);
  transition:border-color .28s ease, transform .28s ease, background .28s ease;
}
.tl__card:hover{
  border-color:var(--cyan-dim);
  background:rgba(11,18,27,.9);
  transform:translateX(4px);
}
.tl__head{
  display:flex; flex-wrap:wrap; align-items:baseline;
  justify-content:space-between; gap:10px; margin-bottom:4px;
}
.tl__role{ font-size:clamp(1.05rem,2.2vw,1.3rem); color:var(--ink); }
.tl__date{ color:var(--gold); font-size:.62rem; white-space:nowrap; }
.tl__org{
  font-family:var(--mono); font-size:.68rem; letter-spacing:.12em;
  text-transform:uppercase; color:var(--cyan); margin:0 0 14px;
}
.tl__points li{
  position:relative; padding-left:19px; margin-bottom:8px;
  color:var(--ink-2); font-size:.93rem; line-height:1.6;
}
.tl__points li::before{
  content:""; position:absolute; left:0; top:.62em;
  width:7px; height:1px; background:var(--cyan-dim);
}
.tl__tags{ display:flex; flex-wrap:wrap; gap:7px; margin-top:15px; }
.tag{
  font-family:var(--mono); font-size:.56rem; letter-spacing:.11em; text-transform:uppercase;
  color:var(--ink-3); border:1px solid var(--line);
  padding:4px 9px;
  transition:color .22s ease, border-color .22s ease;
}
.tl__card:hover .tag{ color:var(--ink-2); border-color:var(--line); }

/* projects */
.proj-grid{
  display:grid; grid-template-columns:repeat(auto-fit,minmax(290px,1fr));
  gap:clamp(16px,2.4vw,26px);
}
.proj{
  position:relative;
  background:linear-gradient(155deg, rgba(14,23,34,.88), rgba(5,7,11,.88));
  border:1px solid var(--line-soft);
  padding:clamp(22px,2.8vw,30px);
  transition:border-color .3s ease, transform .3s ease;
}
.proj:hover{ border-color:var(--cyan-dim); transform:translateY(-4px); }
.proj__corner{
  position:absolute; top:-1px; right:-1px;
  width:26px; height:26px;
  border-top:1px solid var(--gold); border-right:1px solid var(--gold);
  transition:width .3s ease, height .3s ease;
}
.proj:hover .proj__corner{ width:44px; height:44px; }
.proj__top{ display:flex; justify-content:space-between; gap:12px; margin-bottom:14px; }
.proj__kind{ color:var(--cyan); font-size:.6rem; }
.proj__year{ color:var(--ink-3); font-size:.6rem; }
.proj h3{ font-size:clamp(1.12rem,2.4vw,1.4rem); margin-bottom:12px; }
.proj p{ color:var(--ink-2); font-size:.93rem; margin-bottom:0; }
.proj__tags{ display:flex; flex-wrap:wrap; gap:7px; margin-top:18px; }

/* skills */
.skills{
  display:grid; grid-template-columns:minmax(0,1.6fr) minmax(0,1fr);
  gap:clamp(26px,4vw,52px);
  align-items:start;
}
.skillgrid{
  display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr));
  gap:1px; background:var(--line-soft);
  border:1px solid var(--line-soft);
}
.skillgrid__item{
  display:flex; align-items:center; gap:12px;
  background:rgba(8,13,20,.8);
  padding:16px 18px;
  font-size:.93rem; color:var(--ink-2);
  transition:background .25s ease, color .25s ease;
}
.skillgrid__item:hover{ background:rgba(79,233,245,.07); color:var(--ink); }
.skillgrid__i{ color:var(--gold); font-size:.58rem; }

.chipwrap{ display:flex; flex-wrap:wrap; gap:8px; }
.chip{
  padding:9px 15px;
  border:1px solid var(--line);
  background:rgba(8,13,20,.6);
  color:var(--ink-2);
  font-family:var(--mono); font-size:.62rem; letter-spacing:.12em; text-transform:uppercase;
  transition:border-color .25s ease, color .25s ease, background .25s ease;
}
.chip:hover{ border-color:var(--gold-dim); color:var(--gold); background:rgba(255,178,58,.07); }

/* contact */
.section--contact{ padding-bottom:clamp(60px,8vw,110px); }
.contact{
  display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr);
  gap:clamp(26px,4vw,52px);
  align-items:center;
  padding:clamp(28px,4vw,48px);
  background:
    radial-gradient(circle at 15% 0%, rgba(79,233,245,.1), transparent 55%),
    linear-gradient(145deg, rgba(14,23,34,.9), rgba(5,7,11,.9));
  border:1px solid var(--line-soft);
}
.contact__lead h3{ font-size:clamp(1.6rem,3.6vw,2.3rem); margin-bottom:12px; }
.contact__lead p{ color:var(--ink-2); max-width:38ch; margin:0; }
.contact__actions{ display:flex; flex-direction:column; gap:14px; align-items:flex-start; }
.contact__actions .btn--lg{ width:100%; }
.contact__row{ display:flex; flex-wrap:wrap; gap:10px; width:100%; }
.contact__row .btn{ flex:1 1 120px; }

/* footer */
.foot{
  position:relative; z-index:2;
  border-top:1px solid var(--line-soft);
  padding-block:24px;
  background:rgba(5,7,11,.7);
}
.foot__inner{
  display:flex; flex-wrap:wrap; gap:12px 24px;
  justify-content:space-between; align-items:center;
  color:var(--ink-3); font-size:.6rem;
}
.foot__clock{ color:var(--cyan); font-variant-numeric:tabular-nums; }

/* =========================================================================
   REVEAL (only active when JS is running)
   ========================================================================= */

.js-anim .reveal{
  opacity:0; transform:translateY(22px);
  transition:opacity .7s cubic-bezier(.22,1,.36,1), transform .7s cubic-bezier(.22,1,.36,1);
}
.js-anim .reveal.is-in{ opacity:1; transform:none; }

/* =========================================================================
   RESPONSIVE
   ========================================================================= */

@media (max-width:980px){
  .hero__grid{ grid-template-columns:1fr; text-align:left; }
  .hero__portrait{ order:-1; }
  .portrait{ width:min(300px,68vw); }
  .about,.edu,.skills,.contact{ grid-template-columns:1fr; }
  .stats{ grid-template-columns:repeat(2,1fr); }

  .nav__toggle{ display:flex; }
  .nav__links{
    position:absolute; top:100%; left:0; right:0;
    flex-direction:column; align-items:stretch; gap:0;
    background:rgba(5,7,11,.97);
    backdrop-filter:blur(14px);
    -webkit-backdrop-filter:blur(14px);
    border-bottom:1px solid var(--line-soft);
    padding:8px var(--gut) 16px;
    margin-left:0;
    max-height:0; overflow:hidden; visibility:hidden;
    transition:max-height .35s ease, visibility .35s ease;
  }
  .nav__links.is-open{ max-height:420px; visibility:visible; }
  .nav__links a{ padding:13px 0; border-bottom:1px solid var(--line-soft); font-size:.72rem; }
  .nav__ind{ display:none; }
  .nav .btn--gold{ display:none; }
  .nav.is-open-menu{ background:rgba(5,7,11,.95); }
}

@media (max-width:560px){
  .stats{ grid-template-columns:1fr 1fr; }
  .hud-corner{ width:20px; height:20px; }
  .contact__row .btn{ flex:1 1 100%; }
  .hero__name{ letter-spacing:-.02em; }
  .kv div{ flex-direction:column; gap:2px; }
  .kv dd{ text-align:left; }
}

/* =========================================================================
   REDUCED MOTION
   ========================================================================= */

@media (prefers-reduced-motion: reduce){
  html{ scroll-behavior:auto; }
  *,*::before,*::after{
    animation-duration:.001ms !important;
    animation-iteration-count:1 !important;
    transition-duration:.001ms !important;
  }
  .js-anim .reveal{ opacity:1 !important; transform:none !important; }
  .scanlines,.portrait__sweep,.boot{ display:none !important; }
  .cursor,.cursor-ring{ display:none !important; }
  body.cursor-on{ cursor:auto; }
}

<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>James Honekamp</title>
<meta name="description" content="James Honekamp — Finance student at Fairfield University's Dolan School of Business, Class of 2028. Private equity, real estate, and entrepreneurship.">
<meta name="author" content="James Joao Honekamp">
<meta name="theme-color" content="#05070b">

<meta property="og:type" content="website">
<meta property="og:title" content="James Honekamp">
<meta property="og:description" content="Finance student at Fairfield University's Dolan School of Business, Class of 2028.">
<meta property="og:image" content="profile.jpg">

<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' fill='%2305070b'/%3E%3Cpath d='M16 4 28 16 16 28 4 16Z' fill='none' stroke='%234FE9F5' stroke-width='2'/%3E%3Ccircle cx='16' cy='16' r='3.5' fill='%23FFB23A'/%3E%3C/svg%3E">

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@400;500;600;700&family=Barlow:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap">

<link rel="stylesheet" href="style.css">
</head>
<body>

<a class="skip-link" href="#about">Skip to content</a>

<!-- ============ BOOT SEQUENCE ============ -->
<div class="boot" id="boot" role="status" aria-live="polite" aria-label="Loading">
  <div class="boot__inner">
    <div class="boot__reactor" aria-hidden="true">
      <span class="boot__ring boot__ring--a"></span>
      <span class="boot__ring boot__ring--b"></span>
      <span class="boot__ring boot__ring--c"></span>
      <span class="boot__core"></span>
    </div>
    <pre class="boot__log" id="bootLog" aria-hidden="true"></pre>
    <div class="boot__bar" aria-hidden="true"><i id="bootFill"></i></div>
    <div class="boot__pct mono" id="bootPct" aria-hidden="true">00%</div>
    <button class="boot__skip mono" id="bootSkip" type="button">Skip intro</button>
  </div>
</div>

<!-- ============ AMBIENT LAYERS ============ -->
<canvas class="field" id="field" aria-hidden="true"></canvas>
<div class="grid-veil" aria-hidden="true"></div>
<div class="scanlines" aria-hidden="true"></div>
<div class="vignette" aria-hidden="true"></div>

<div class="hud-frame" aria-hidden="true">
  <span class="hud-corner hud-corner--tl"></span>
  <span class="hud-corner hud-corner--tr"></span>
  <span class="hud-corner hud-corner--bl"></span>
  <span class="hud-corner hud-corner--br"></span>
</div>

<div class="cursor" id="cursorDot" aria-hidden="true"></div>
<div class="cursor-ring" id="cursorRing" aria-hidden="true"><span></span></div>

<!-- ============ NAV ============ -->
<header class="nav" id="nav">
  <div class="nav__progress" id="navProgress" aria-hidden="true"></div>
  <div class="nav__inner">
    <a class="brand" href="#top" aria-label="James Honekamp, back to top">
      <span class="brand__mark" aria-hidden="true">
        <svg viewBox="0 0 40 40" width="28" height="28" focusable="false">
          <path d="M20 2 38 20 20 38 2 20Z" fill="none" stroke="currentColor" stroke-width="1.6"></path>
          <path d="M20 9 31 20 20 31 9 20Z" fill="none" stroke="currentColor" stroke-width="0.9" opacity="0.5"></path>
          <circle cx="20" cy="20" r="3.4" fill="currentColor"></circle>
        </svg>
      </span>
      <span class="brand__text">J. Honekamp</span>
    </a>

    <nav class="nav__links" id="navLinks" aria-label="Section navigation">
      <a href="#about" data-nav>About</a>
      <a href="#education" data-nav>Education</a>
      <a href="#experience" data-nav>Experience</a>
      <a href="#projects" data-nav>Projects</a>
      <a href="#skills" data-nav>Skills</a>
      <a href="#contact" data-nav>Contact</a>
      <span class="nav__ind" id="navInd" aria-hidden="true"></span>
    </nav>

    <a class="btn btn--sm btn--gold magnetic" href="mailto:jhonekamp05@gmail.com">
      <span>Email Me</span>
    </a>

    <button class="nav__toggle" id="navToggle" type="button" aria-expanded="false" aria-controls="navLinks" aria-label="Open menu">
      <span></span><span></span><span></span>
    </button>
  </div>
</header>

<main id="top">

  <!-- ============ HERO ============ -->
  <section class="hero" id="hero">
    <div class="wrap hero__grid">

      <div class="hero__copy">
        <p class="eyebrow mono">
          <span class="pulse-dot" aria-hidden="true"></span>
          Fairfield, CT &middot; Franklin, MA
        </p>

        <h1 class="hero__name" id="heroName">
          <span class="scramble" data-text="James">James</span>
          <span class="scramble" data-text="Honekamp">Honekamp</span>
        </h1>

        <p class="hero__role">
          <span class="mono hero__role-pre">&gt;</span>
          <span id="typedRole" class="hero__typed"></span><span class="caret" aria-hidden="true"></span>
        </p>

        <p class="hero__lede">
          Finance major at Fairfield University&rsquo;s Dolan School of Business, Class of 2028.
          Private equity, real estate, and the parts of business you only learn by doing the work.
        </p>

        <div class="hero__cta">
          <a class="btn btn--cyan magnetic ripple" href="#experience">
            <span>View Experience</span>
          </a>
          <a class="btn btn--ghost magnetic ripple" href="mailto:jhonekamp05@gmail.com">
            <span>Get In Touch</span>
          </a>
        </div>

        <ul class="hero__links" aria-label="Profiles">
          <li>
            <a class="chiplink magnetic" href="https://www.linkedin.com/in/james-honekamp-0a1362353/" target="_blank" rel="noopener noreferrer">
              <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false"><path fill="currentColor" d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9h4v12H3V9Zm7 0h3.8v1.7h.05c.53-.95 1.83-1.95 3.77-1.95 4.03 0 4.78 2.5 4.78 5.76V21h-4v-5.6c0-1.34-.03-3.06-1.9-3.06-1.9 0-2.2 1.45-2.2 2.96V21h-3.9V9Z"/></svg>
              LinkedIn
            </a>
          </li>
          <li>
            <a class="chiplink magnetic" href="https://github.com/jhonekamp05" target="_blank" rel="noopener noreferrer">
              <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false"><path fill="currentColor" d="M12 .5A11.5 11.5 0 0 0 .5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.38-3.88-1.38-.53-1.34-1.3-1.7-1.3-1.7-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.2 1.77 1.2 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.56-.3-5.25-1.28-5.25-5.7 0-1.26.45-2.29 1.19-3.1-.12-.3-.52-1.47.11-3.06 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.82 1.19 1.85 1.19 3.11 0 4.43-2.7 5.4-5.27 5.69.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12 11.5 11.5 0 0 0 12 .5Z"/></svg>
              GitHub
            </a>
          </li>
          <li>
            <a class="chiplink magnetic" href="tel:+15083103121">
              <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false"><path fill="currentColor" d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.2.4 2.4.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.4 0 .8-.2 1l-2.3 2.2Z"/></svg>
              508.310.3121
            </a>
          </li>
        </ul>
      </div>

      <div class="hero__portrait">
        <div class="portrait" id="portrait">
          <svg class="portrait__rings" viewBox="0 0 400 400" aria-hidden="true" focusable="false">
            <circle class="ring ring--slow" cx="200" cy="200" r="192" fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="3 9" opacity="0.55"></circle>
            <circle class="ring ring--fast" cx="200" cy="200" r="176" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="70 240" stroke-linecap="round" opacity="0.9"></circle>
            <circle class="ring ring--rev" cx="200" cy="200" r="164" fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="1 16" opacity="0.5"></circle>
            <g class="ring ring--ticks" opacity="0.65">
              <line x1="200" y1="8" x2="200" y2="26" stroke="currentColor" stroke-width="2"></line>
              <line x1="392" y1="200" x2="374" y2="200" stroke="currentColor" stroke-width="2"></line>
              <line x1="200" y1="392" x2="200" y2="374" stroke="currentColor" stroke-width="2"></line>
              <line x1="8" y1="200" x2="26" y2="200" stroke="currentColor" stroke-width="2"></line>
            </g>
          </svg>

          <div class="portrait__hex">
            <img src="profile.jpg" alt="Portrait of James Honekamp in a suit" width="1000" height="1000" decoding="async">
            <span class="portrait__sweep" aria-hidden="true"></span>
            <span class="portrait__mesh" aria-hidden="true"></span>
          </div>

          <span class="portrait__tag mono" aria-hidden="true">ID&nbsp;//&nbsp;JJH&middot;2028</span>
        </div>
      </div>
    </div>

    <div class="wrap">
      <ul class="stats reveal" aria-label="At a glance">
        <li class="stat">
          <span class="stat__num mono" data-count="2028" data-plain="1">2028</span>
          <span class="stat__label">Class Year</span>
        </li>
        <li class="stat">
          <span class="stat__num mono" data-count="4">0</span>
          <span class="stat__label">Campus Organizations</span>
        </li>
        <li class="stat">
          <span class="stat__num mono" data-count="5">0</span>
          <span class="stat__label">Roles Held</span>
        </li>
        <li class="stat">
          <span class="stat__num mono" data-count="2">0</span>
          <span class="stat__label">Client Projects</span>
        </li>
      </ul>
    </div>

    <a class="scroll-hint mono" href="#about" aria-label="Scroll to About">
      <span>Scroll</span>
      <i aria-hidden="true"></i>
    </a>
  </section>

  <!-- ============ ABOUT ============ -->
  <section class="section" id="about">
    <div class="wrap">
      <header class="sec-head reveal">
        <span class="sec-index mono">01</span>
        <h2 class="scramble" data-text="About">About</h2>
        <span class="sec-rule" aria-hidden="true"></span>
      </header>

      <div class="about">
        <div class="about__text reveal">
          <p class="lead">
            I am a finance student at Fairfield University&rsquo;s Dolan School of Business, originally from
            Franklin, Massachusetts.
          </p>
          <p>
            Most of what I know about business I picked up by selling something, organizing something, or
            being the person a client calls when a job actually has to get done. I found clients for a moving
            company on commission, ran a register through peak retail hours, and worked with a nonprofit board
            to figure out why their outreach was not landing.
          </p>
          <p>
            On campus I am part of the Private Equity Club, the Real Estate Club, and the Entrepreneurship
            Club, and I play for the Fairfield Men&rsquo;s Basketball Team. I am an academic scholarship
            recipient. Long term I am working toward private markets and wealth management.
          </p>
        </div>

        <aside class="panel reveal" aria-label="Quick facts">
          <span class="panel__label mono">Profile</span>
          <dl class="kv">
            <div><dt>Location</dt><dd>Franklin, MA</dd></div>
            <div><dt>Studying</dt><dd>Fairfield University, CT</dd></div>
            <div><dt>Degree</dt><dd>B.S. Finance</dd></div>
            <div><dt>Graduating</dt><dd>2028</dd></div>
            <div><dt>Focus</dt><dd>Private Equity &middot; Real Estate</dd></div>
            <div><dt>Status</dt><dd><span class="dot-live" aria-hidden="true"></span> Open to opportunities</dd></div>
          </dl>
        </aside>
      </div>
    </div>
  </section>

  <!-- ============ EDUCATION ============ -->
  <section class="section" id="education">
    <div class="wrap">
      <header class="sec-head reveal">
        <span class="sec-index mono">02</span>
        <h2 class="scramble" data-text="Education">Education</h2>
        <span class="sec-rule" aria-hidden="true"></span>
      </header>

      <article class="edu reveal">
        <div class="edu__main">
          <h3>Fairfield University &mdash; Dolan School of Business</h3>
          <p class="edu__meta mono">Bachelor of Science in Finance &middot; Class of 2028 &middot; Fairfield, CT</p>
          <p class="edu__honor">
            <span class="badge">Academic Scholarship Recipient</span>
          </p>
        </div>
        <div class="edu__orgs">
          <span class="panel__label mono">Activities</span>
          <ul class="orglist">
            <li><span class="orglist__bar" aria-hidden="true"></span>Private Equity Club</li>
            <li><span class="orglist__bar" aria-hidden="true"></span>Real Estate Club</li>
            <li><span class="orglist__bar" aria-hidden="true"></span>Entrepreneurship Club</li>
            <li><span class="orglist__bar" aria-hidden="true"></span>Fairfield Men&rsquo;s Basketball Team</li>
          </ul>
        </div>
      </article>
    </div>
  </section>

  <!-- ============ EXPERIENCE ============ -->
  <section class="section" id="experience">
    <div class="wrap">
      <header class="sec-head reveal">
        <span class="sec-index mono">03</span>
        <h2 class="scramble" data-text="Experience">Experience</h2>
        <span class="sec-rule" aria-hidden="true"></span>
      </header>

      <div class="timeline" id="timeline">
        <span class="timeline__track" aria-hidden="true"><i id="timelineFill"></i></span>

        <!-- ============================================================
             VERIFY BEFORE PUBLISHING: this Kidde-Fenwal entry is NOT on
             the résumé you sent. It was built from what you told me about
             the internship. Confirm the dates and bullets, or delete this
             whole <article> block and change the "Roles Held" stat in the
             hero from 5 to 4.
             ============================================================ -->
        <article class="tl reveal">
          <span class="tl__node" aria-hidden="true"></span>
          <div class="tl__card">
            <div class="tl__head">
              <h3 class="tl__role">Finance Operations Intern</h3>
              <span class="tl__date mono">2026</span>
            </div>
            <p class="tl__org">Kidde&#8209;Fenwal, Inc.</p>
            <ul class="tl__points">
              <li>Processed accounts payable vouchers and posted general ledger journal entries in JD Edwards.</li>
              <li>Administered and reviewed expense reports in SAP Concur.</li>
              <li>Built Excel reconciliation workbooks using SUMIFS and COUNTIFS to tie expense data back to the ledger.</li>
            </ul>
            <div class="tl__tags">
              <span class="tag">JD Edwards</span><span class="tag">SAP Concur</span><span class="tag">Excel</span><span class="tag">Reconciliation</span>
            </div>
          </div>
        </article>

        <!-- FILL IN: replace "Regional Moving Company" with the real business name -->
        <article class="tl reveal">
          <span class="tl__node" aria-hidden="true"></span>
          <div class="tl__card">
            <div class="tl__head">
              <h3 class="tl__role">Business Development Assistant</h3>
              <span class="tl__date mono">Summer 2025</span>
            </div>
            <p class="tl__org">Regional Moving Company</p>
            <ul class="tl__points">
              <li>Identified and secured new clients for moving services through networking and outreach.</li>
              <li>Coordinated with clients to assess moving needs and keep project execution on track.</li>
              <li>Earned commission on completed projects, contributing to consistent summer revenue growth.</li>
            </ul>
            <div class="tl__tags">
              <span class="tag">Client Acquisition</span><span class="tag">Outreach</span><span class="tag">Commission Sales</span>
            </div>
          </div>
        </article>

        <article class="tl reveal">
          <span class="tl__node" aria-hidden="true"></span>
          <div class="tl__card">
            <div class="tl__head">
              <h3 class="tl__role">Sales Associate</h3>
              <span class="tl__date mono">Jul 2024 &ndash; Sep 2024</span>
            </div>
            <p class="tl__org">Goose It</p>
            <ul class="tl__points">
              <li>Designed and organized clothing displays to improve the customer experience.</li>
              <li>Managed register transactions accurately through busy event periods.</li>
              <li>Provided personalized sizing and product recommendations.</li>
              <li>Maintained cleanliness and organization of the retail space.</li>
            </ul>
            <div class="tl__tags">
              <span class="tag">POS Systems</span><span class="tag">Merchandising</span><span class="tag">Customer Service</span>
            </div>
          </div>
        </article>

        <article class="tl reveal">
          <span class="tl__node" aria-hidden="true"></span>
          <div class="tl__card">
            <div class="tl__head">
              <h3 class="tl__role">Teaching Assistant</h3>
              <span class="tl__date mono">Jun 2023 &ndash; Aug 2024</span>
            </div>
            <p class="tl__org">Marymount Country Day School</p>
            <ul class="tl__points">
              <li>Assisted with classroom preparation and organization for summer programs.</li>
              <li>Supported teachers with daily operational tasks.</li>
              <li>Fostered a positive and collaborative atmosphere among students and staff.</li>
            </ul>
            <div class="tl__tags">
              <span class="tag">Operations</span><span class="tag">Collaboration</span>
            </div>
          </div>
        </article>

        <article class="tl reveal">
          <span class="tl__node" aria-hidden="true"></span>
          <div class="tl__card">
            <div class="tl__head">
              <h3 class="tl__role">Camp Counselor</h3>
              <span class="tl__date mono">Jun 2020 &ndash; Apr 2022</span>
            </div>
            <p class="tl__org">Franklin Recreation Department</p>
            <ul class="tl__points">
              <li>Guided campers through daily recreational activities promoting teamwork.</li>
              <li>Enforced safety protocols diligently.</li>
              <li>Communicated effectively with colleagues and parents.</li>
            </ul>
            <div class="tl__tags">
              <span class="tag">Leadership</span><span class="tag">Safety</span><span class="tag">Communication</span>
            </div>
          </div>
        </article>

      </div>
    </div>
  </section>

  <!-- ============ PROJECTS ============ -->
  <section class="section" id="projects">
    <div class="wrap">
      <header class="sec-head reveal">
        <span class="sec-index mono">04</span>
        <h2 class="scramble" data-text="Projects">Projects</h2>
        <span class="sec-rule" aria-hidden="true"></span>
      </header>

      <div class="proj-grid">
        <article class="proj reveal">
          <span class="proj__corner" aria-hidden="true"></span>
          <div class="proj__top">
            <span class="proj__kind mono">Consulting</span>
            <span class="proj__year mono">2024</span>
          </div>
          <h3>Leaders Readers Network</h3>
          <p>
            Selected for a specialized class project consulting for a nonprofit. I analyzed the
            organization&rsquo;s social media metrics and website, then delivered strategic recommendations to
            improve outreach and engagement. Findings and action plans were presented directly to the client
            over Zoom.
          </p>
          <div class="proj__tags">
            <span class="tag">Analytics</span><span class="tag">Strategy</span><span class="tag">Client Presentation</span>
          </div>
        </article>

        <article class="proj reveal">
          <span class="proj__corner" aria-hidden="true"></span>
          <div class="proj__top">
            <span class="proj__kind mono">Build</span>
            <span class="proj__year mono">2024</span>
          </div>
          <h3>Facebook Ads Automation</h3>
          <p>
            An end&#8209;to&#8209;end Facebook Ads automation build for targeted marketing. I configured the
            campaign structure, audience targeting, and automation rules, then tested the system until it ran
            reliably on its own.
          </p>
          <div class="proj__tags">
            <span class="tag">Facebook Ads Manager</span><span class="tag">Automation</span><span class="tag">Targeting</span>
          </div>
        </article>
      </div>
    </div>
  </section>

  <!-- ============ SKILLS ============ -->
  <section class="section" id="skills">
    <div class="wrap">
      <header class="sec-head reveal">
        <span class="sec-index mono">05</span>
        <h2 class="scramble" data-text="Skills">Skills</h2>
        <span class="sec-rule" aria-hidden="true"></span>
      </header>

      <div class="skills">
        <div class="skills__col reveal">
          <span class="panel__label mono">Toolset</span>
          <ul class="skillgrid">
            <li class="skillgrid__item"><span class="skillgrid__i mono">01</span>Microsoft Excel</li>
            <li class="skillgrid__item"><span class="skillgrid__i mono">02</span>Microsoft PowerPoint</li>
            <li class="skillgrid__item"><span class="skillgrid__i mono">03</span>Facebook Ads Manager</li>
            <li class="skillgrid__item"><span class="skillgrid__i mono">04</span>POS Systems</li>
            <li class="skillgrid__item"><span class="skillgrid__i mono">05</span>Social Media Marketing</li>
            <li class="skillgrid__item"><span class="skillgrid__i mono">06</span>Customer Service</li>
          </ul>
        </div>

        <div class="skills__col reveal">
          <span class="panel__label mono">Interests</span>
          <ul class="chipwrap">
            <li class="chip">Finance</li>
            <li class="chip">Private Equity</li>
            <li class="chip">Real Estate</li>
            <li class="chip">Entrepreneurship</li>
            <li class="chip">Basketball</li>
          </ul>
        </div>
      </div>
    </div>
  </section>

  <!-- ============ CONTACT ============ -->
  <section class="section section--contact" id="contact">
    <div class="wrap">
      <header class="sec-head reveal">
        <span class="sec-index mono">06</span>
        <h2 class="scramble" data-text="Contact">Contact</h2>
        <span class="sec-rule" aria-hidden="true"></span>
      </header>

      <div class="contact reveal">
        <div class="contact__lead">
          <h3>Let&rsquo;s talk.</h3>
          <p>
            Open to internships, analyst roles, and conversations about private markets. The fastest way to
            reach me is email.
          </p>
        </div>

        <div class="contact__actions">
          <a class="btn btn--cyan btn--lg magnetic ripple" href="mailto:jhonekamp05@gmail.com">
            <span>jhonekamp05@gmail.com</span>
          </a>
          <div class="contact__row">
            <a class="btn btn--ghost magnetic ripple" href="tel:+15083103121"><span>508.310.3121</span></a>
            <a class="btn btn--ghost magnetic ripple" href="https://www.linkedin.com/in/james-honekamp-0a1362353/" target="_blank" rel="noopener noreferrer"><span>LinkedIn</span></a>
            <a class="btn btn--ghost magnetic ripple" href="https://github.com/jhonekamp05" target="_blank" rel="noopener noreferrer"><span>GitHub</span></a>
          </div>
        </div>
      </div>
    </div>
  </section>

</main>

<footer class="foot">
  <div class="wrap foot__inner">
    <span class="mono">&copy; <span id="year">2026</span> James Joao Honekamp</span>
    <span class="mono foot__clock" id="clock" aria-label="Current time, Eastern">--:--:-- ET</span>
    <span class="mono foot__loc">Franklin, MA &rarr; Fairfield, CT</span>
  </div>
</footer>

<script src="script.js"></script>
</body>
</html>
