/* =========================================================================
   Siddhant Gaikwad — Portfolio interactivity engine
   Dependency-OPTIONAL: works fully with zero libs (custom cursor + ember
   particle system on <canvas>, IntersectionObserver reveals, rAF parallax
   & counters, cinematic page transitions). Lenis is used for smooth scroll
   when present. Everything degrades gracefully & respects reduced-motion.

   Wiring is re-scannable + MutationObserver-driven, so it binds elements as
   they stream in and as async child DCs (Nav / Footer) mount.
   ========================================================================= */
(function () {
  if (window.PF) return;

  var docEl = document.documentElement;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine   = matchMedia('(pointer: fine)').matches;
  var touch  = matchMedia('(hover: none)').matches || ('ontouchstart' in window);
  var useCursor = fine && !touch;

  var PF = window.PF = { _inited: false, _revealed: false, lenis: null, reduce: reduce };

  /* pre-hide reveal elements only while JS is live (no-JS keeps them shown) */
  try {
    var pre = document.createElement('style');
    pre.textContent = '[data-reveal],[data-split]{opacity:0}';
    (document.head || docEl).appendChild(pre);
  } catch (e) {}

  function cssVar(n, fb) { var v = getComputedStyle(docEl).getPropertyValue(n); return (v && v.trim()) || fb; }
  function lerp(a, b, n) { return a + (b - a) * n; }
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
  function bind(el) { if (el.hasAttribute('data-pf')) return false; el.setAttribute('data-pf', '1'); return true; }

  /* ===================== central rAF loop ===================== */
  var systems = [], raf = null;
  function tick(t) {
    for (var i = systems.length - 1; i >= 0; i--) { if (systems[i](t) === false) systems.splice(i, 1); }
    raf = systems.length ? requestAnimationFrame(tick) : null;
  }
  function addSystem(fn) { systems.push(fn); if (!raf) raf = requestAnimationFrame(tick); }

  /* ===================== ember particle canvas ===================== */
  var emberCanvas, ectx, ew = 0, eh = 0, dpr = Math.min(devicePixelRatio || 1, 2);
  var particles = [], accentRGB = [255, 90, 30];

  function parseAccent() {
    var c = cssVar('--accent', '#ff5a1e').trim();
    if (c[0] === '#') {
      var h = c.slice(1);
      if (h.length === 3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
      accentRGB = [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
    }
  }
  function initEmberCanvas() {
    emberCanvas = document.createElement('canvas');
    emberCanvas.setAttribute('aria-hidden', 'true');
    emberCanvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9998;';
    document.body.appendChild(emberCanvas);
    ectx = emberCanvas.getContext('2d');
    resizeEmbers(); parseAccent();
    addEventListener('resize', resizeEmbers, { passive: true });
    addSystem(emberFrame);
  }
  function resizeEmbers() {
    if (!emberCanvas) return;
    ew = innerWidth; eh = innerHeight;
    emberCanvas.width = ew * dpr; emberCanvas.height = eh * dpr;
    ectx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function spawnEmber(x, y, o) {
    if (particles.length > 190) return; o = o || {};
    particles.push({ x: x, y: y,
      vx: (Math.random() - 0.5) * (o.spread || 0.7),
      vy: (o.vy != null ? o.vy : -(0.35 + Math.random() * 0.9)),
      life: 1, decay: o.decay || (0.012 + Math.random() * 0.02),
      r: o.r || (0.8 + Math.random() * 2.1), flick: Math.random() * 6.28 });
  }
  function emberFrame(t) {
    if (!ectx) return;
    ectx.clearRect(0, 0, ew, eh);
    ectx.globalCompositeOperation = 'lighter';
    for (var i = particles.length - 1; i >= 0; i--) {
      var p = particles[i];
      p.x += p.vx; p.y += p.vy; p.vy -= 0.004; p.vx *= 0.99; p.life -= p.decay;
      if (p.life <= 0) { particles.splice(i, 1); continue; }
      var a = p.life * (0.6 + 0.4 * Math.sin(t / 90 + p.flick));
      var rad = p.r * (0.6 + p.life * 0.9);
      var g = ectx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rad * 4);
      g.addColorStop(0, 'rgba(' + accentRGB[0] + ',' + accentRGB[1] + ',' + accentRGB[2] + ',' + a + ')');
      g.addColorStop(0.4, 'rgba(' + accentRGB[0] + ',' + Math.min(255, accentRGB[1] + 60) + ',' + accentRGB[2] + ',' + (a * 0.5) + ')');
      g.addColorStop(1, 'rgba(' + accentRGB[0] + ',' + accentRGB[1] + ',' + accentRGB[2] + ',0)');
      ectx.fillStyle = g;
      ectx.beginPath(); ectx.arc(p.x, p.y, rad * 4, 0, 6.2832); ectx.fill();
    }
    ectx.globalCompositeOperation = 'source-over';
    return true;
  }

  /* ===================== custom cursor ===================== */
  var dot, ring, label, mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my, lastSpawn = 0;
  function initCursor() {
    dot = document.createElement('div'); ring = document.createElement('div'); label = document.createElement('div');
    dot.className = 'pf-dot'; ring.className = 'pf-ring'; label.className = 'pf-label';
    ring.appendChild(label); document.body.appendChild(ring); document.body.appendChild(dot);
    docEl.classList.add('pf-cursor-on');
    addEventListener('mousemove', function (e) {
      mx = e.clientX; my = e.clientY;
      var now = performance.now();
      if (!reduce && now - lastSpawn > 16) { lastSpawn = now; spawnEmber(mx, my, { spread: 0.9, decay: 0.03, r: 0.7 + Math.random() * 1.4 }); }
    }, { passive: true });
    addEventListener('mousedown', function () { docEl.classList.add('pf-down'); burst(mx, my); });
    addEventListener('mouseup', function () { docEl.classList.remove('pf-down'); });
    document.addEventListener('mouseleave', function () { if (dot) { dot.style.opacity = ring.style.opacity = '0'; } });
    document.addEventListener('mouseenter', function () { if (dot) { dot.style.opacity = ring.style.opacity = '1'; } });
    document.body.addEventListener('mouseover', function (e) {
      var el = e.target.closest && e.target.closest('a,button,[data-cursor],input,textarea,[data-magnetic]');
      if (!el) return;
      var txt = el.getAttribute('data-cursor');
      docEl.classList.add('pf-hover');
      if (txt) { label.textContent = txt; docEl.classList.add('pf-labelled'); }
      if (el.matches('input,textarea')) docEl.classList.add('pf-text');
    });
    document.body.addEventListener('mouseout', function (e) {
      var el = e.target.closest && e.target.closest('a,button,[data-cursor],input,textarea,[data-magnetic]');
      if (!el) return;
      docEl.classList.remove('pf-hover', 'pf-labelled', 'pf-text'); label.textContent = '';
    });
    addSystem(function () {
      rx = lerp(rx, mx, 0.18); ry = lerp(ry, my, 0.18);
      dot.style.transform = 'translate3d(' + mx + 'px,' + my + 'px,0) translate(-50%,-50%)';
      ring.style.transform = 'translate3d(' + rx + 'px,' + ry + 'px,0) translate(-50%,-50%)';
      return true;
    });
  }
  function burst(x, y) { if (reduce) return; for (var i = 0; i < 14; i++) spawnEmber(x, y, { spread: 3.2, vy: (Math.random() - 0.5) * 3, decay: 0.03, r: 1 + Math.random() * 1.6 }); }

  /* ===================== re-scannable wiring ===================== */
  function scanMagnetic() {
    document.querySelectorAll('[data-magnetic]').forEach(function (el) {
      if (!bind(el)) return;
      var str = parseFloat(el.getAttribute('data-magnetic')) || 0.35;
      el.style.transition = 'transform .35s cubic-bezier(.2,.8,.2,1)';
      el.addEventListener('mousemove', function (e) {
        if (touch) return;
        var r = el.getBoundingClientRect();
        el.style.transform = 'translate(' + (e.clientX - (r.left + r.width / 2)) * str + 'px,' + (e.clientY - (r.top + r.height / 2)) * str + 'px)';
      });
      el.addEventListener('mouseleave', function () { el.style.transform = 'translate(0,0)'; });
    });
  }
  function revealEl(el) { el.style.opacity = '1'; el.style.transform = 'none'; setTimeout(function () { el.style.willChange = 'auto'; }, 1100); }
  var revealIO = null;
  function scanReveals() {
    var els = [].slice.call(document.querySelectorAll('[data-reveal]:not([data-pf])'));
    if (!els.length) return;
    if (!('IntersectionObserver' in window) || reduce) { els.forEach(function (el) { bind(el); revealEl(el); }); PF._revealed = true; return; }
    if (!revealIO) revealIO = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) { if (en.isIntersecting) { revealEl(en.target); revealIO.unobserve(en.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -7% 0px' });
    els.forEach(function (el) {
      bind(el);
      var v = el.getAttribute('data-reveal') || 'up', d = el.getAttribute('data-reveal-delay') || 0, tr = 'translateY(34px)';
      if (v === 'left') tr = 'translateX(-42px)'; else if (v === 'right') tr = 'translateX(42px)';
      else if (v === 'scale') tr = 'scale(.93)'; else if (v === 'none') tr = 'none';
      el.style.transform = tr;
      el.style.transition = 'opacity 1s cubic-bezier(.16,.7,.2,1) ' + d + 'ms, transform 1.05s cubic-bezier(.16,.7,.2,1) ' + d + 'ms';
      el.style.willChange = 'opacity,transform';
      revealIO.observe(el);
    });
    PF._revealed = true;
  }
  var countIO = null;
  function scanCounters() {
    var els = [].slice.call(document.querySelectorAll('[data-count]:not([data-pf])'));
    if (!els.length) return;
    if (!countIO) countIO = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target, end = parseFloat(el.getAttribute('data-count')), suf = el.getAttribute('data-suffix') || '', st = null;
        (function step(t) { if (!st) st = t; var p = clamp((t - st) / 1400, 0, 1), e = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.round(end * e) + (p === 1 ? suf : ''); if (p < 1) requestAnimationFrame(step); })(performance.now());
        countIO.unobserve(el);
      });
    }, { threshold: 0.6 });
    els.forEach(function (el) { bind(el); countIO.observe(el); });
  }
  var parallaxEls = [], parallaxOn = false;
  function scanParallax() {
    if (reduce) return;
    var found = false;
    document.querySelectorAll('[data-parallax]').forEach(function (el) { if (bind(el)) { parallaxEls.push(el); found = true; } });
    if (found && !parallaxOn) {
      parallaxOn = true;
      addSystem(function () {
        var vh = innerHeight;
        for (var i = 0; i < parallaxEls.length; i++) {
          var el = parallaxEls[i], sp = parseFloat(el.getAttribute('data-parallax')) || 0.15, r = el.getBoundingClientRect();
          el.style.transform = 'translate3d(0,' + ((r.top + r.height / 2 - vh / 2) * -sp).toFixed(2) + 'px,0)';
        }
        return true;
      });
    }
  }
  function scanTilt() {
    if (touch || reduce) return;
    document.querySelectorAll('[data-tilt]').forEach(function (el) {
      if (!bind(el)) return;
      var max = parseFloat(el.getAttribute('data-tilt')) || 6;
      el.style.transition = 'transform .4s cubic-bezier(.2,.8,.2,1)';
      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect(), px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = 'perspective(900px) rotateY(' + (px * max) + 'deg) rotateX(' + (-py * max) + 'deg)';
      });
      el.addEventListener('mouseleave', function () { el.style.transform = 'perspective(900px) rotateY(0) rotateX(0)'; });
    });
  }
  function scanHeroEmbers() {
    var hero = document.querySelector('[data-hero-embers]:not([data-pf])');
    if (!hero || reduce) return; bind(hero);
    var on = true;
    new IntersectionObserver(function (e) { on = e[0].isIntersecting; }, { threshold: 0 }).observe(hero);
    addSystem(function () {
      if (on && emberCanvas && Math.random() < 0.5) {
        var r = hero.getBoundingClientRect();
        spawnEmber(r.left + Math.random() * r.width, r.bottom - Math.random() * 60,
          { spread: 0.5, vy: -(0.3 + Math.random() * 0.6), decay: 0.006 + Math.random() * 0.008, r: 0.6 + Math.random() * 1.6 });
      }
      return true;
    });
  }
  var marqueeOn = false;
  function scanMarquee() {
    var tracks = document.querySelectorAll('[data-marquee]:not([data-pf])');
    if (!tracks.length) return;
    tracks.forEach(bind);
    if (marqueeOn) return; marqueeOn = true;
    var last = scrollY, vel = 0;
    addEventListener('scroll', function () { vel = clamp((scrollY - last) * 0.4, -18, 18); last = scrollY; }, { passive: true });
    addSystem(function () {
      vel = lerp(vel, 0, 0.08);
      document.querySelectorAll('[data-marquee]').forEach(function (t) { t.style.transform = 'skewX(' + (vel * -0.14) + 'deg)'; });
      return true;
    });
  }
  function scanNav() {
    var nav = document.querySelector('[data-nav]:not([data-pf])'), bar = document.querySelector('[data-progress]');
    if (!nav) return; bind(nav);
    function upd() {
      var y = scrollY;
      nav.setAttribute('data-scrolled', y > 40 ? 'true' : 'false');
      if (bar) { var h = document.body.scrollHeight - innerHeight; bar.style.transform = 'scaleX(' + (h > 0 ? clamp(y / h, 0, 1) : 0) + ')'; }
    }
    addEventListener('scroll', upd, { passive: true }); upd();
  }
  function currentTheme() { return docEl.getAttribute('data-theme') === 'light' ? 'light' : 'dark'; }
  function applyThemeIcons() {
    var th = currentTheme();
    document.querySelectorAll('[data-theme-icon]').forEach(function (el) { el.style.display = el.getAttribute('data-theme-icon') === th ? '' : 'none'; });
  }
  function scanTheme() {
    applyThemeIcons();
    document.querySelectorAll('[data-theme-toggle]').forEach(function (btn) {
      if (!bind(btn)) return;
      btn.addEventListener('click', function () {
        var next = currentTheme() === 'light' ? 'dark' : 'light';
        if (next === 'light') docEl.setAttribute('data-theme', 'light'); else docEl.removeAttribute('data-theme');
        try { localStorage.setItem('pf-theme', next); } catch (e) {}
        parseAccent(); applyThemeIcons(); burst(mx, my);
      });
    });
  }
  function scanMenu() {
    var panel = document.querySelector('[data-mobile-nav]:not([data-pf])');
    if (!panel) return; bind(panel);
    var toggles = document.querySelectorAll('[data-menu-toggle]');
    function set(open) {
      panel.setAttribute('data-open', open ? 'true' : 'false');
      docEl.style.overflow = open ? 'hidden' : '';
      document.querySelectorAll('[data-menu-toggle]').forEach(function (t) { t.setAttribute('aria-expanded', open ? 'true' : 'false'); });
    }
    toggles.forEach(function (t) { if (bind(t)) t.addEventListener('click', function () { set(panel.getAttribute('data-open') !== 'true'); }); });
    panel.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', function () { set(false); }); });
  }

  /* ===================== split-text word reveal ===================== */
  var splitIO = null;
  function scanSplit() {
    var els = [].slice.call(document.querySelectorAll('[data-split]:not([data-pfsplit])'));
    if (!els.length) return;
    if (!splitIO) splitIO = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) { if (en.isIntersecting) { playSplit(en.target); splitIO.unobserve(en.target); } });
    }, { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });
    els.forEach(function (el) {
      el.setAttribute('data-pfsplit', '1');
      if (reduce) { el.style.opacity = '1'; return; }
      var inners = [];
      (function walk(node) {
        [].slice.call(node.childNodes).forEach(function (n) {
          if (n.nodeType === 3) {
            if (!n.textContent.replace(/\s/g, '')) return;
            var parts = n.textContent.split(/(\s+)/), frag = document.createDocumentFragment();
            parts.forEach(function (part) {
              if (!part) return;
              if (!part.trim()) { frag.appendChild(document.createTextNode(part)); return; }
              var o = document.createElement('span'); o.className = 'pf-w';
              var i = document.createElement('span'); i.className = 'pf-wi'; i.textContent = part;
              o.appendChild(i); frag.appendChild(o); inners.push(i);
            });
            node.replaceChild(frag, n);
          } else if (n.nodeType === 1 && n.tagName !== 'BR') { walk(n); }
        });
      })(el);
      el.__inners = inners;
      el.style.opacity = '1';
      splitIO.observe(el);
    });
  }
  function playSplit(el) {
    (el.__inners || []).forEach(function (i, idx) { i.style.transitionDelay = (idx * 0.03) + 's'; i.classList.add('in'); });
  }

  /* ===================== hero fade-on-scroll ===================== */
  var heroFadeEls = [], heroFadeOn = false;
  function scanHeroFade() {
    if (reduce) return;
    document.querySelectorAll('[data-hero-fade]:not([data-pffade])').forEach(function (el) { el.setAttribute('data-pffade', '1'); heroFadeEls.push(el); });
    if (heroFadeEls.length && !heroFadeOn) {
      heroFadeOn = true;
      addSystem(function () {
        var vh = innerHeight, y = scrollY;
        for (var i = 0; i < heroFadeEls.length; i++) {
          var el = heroFadeEls[i], amt = parseFloat(el.getAttribute('data-hero-fade')) || 1;
          if (y > vh * 1.35) continue;
          var p = clamp(y / (vh * 0.9), 0, 1);
          el.style.transform = 'translate3d(0,' + (y * 0.32 * amt).toFixed(1) + 'px,0)';
          el.style.opacity = (1 - p * 1.1).toFixed(3);
        }
        return true;
      });
    }
  }

  /* ===================== clip-path reveal (image uncover + zoom) ===================== */
  var clipIO = null;
  function scanClip() {
    var els = [].slice.call(document.querySelectorAll('[data-clip]:not([data-pfclip])'));
    if (!els.length) return;
    els.forEach(function (el) { el.setAttribute('data-pfclip', '1'); });
    if (reduce) { els.forEach(function (el) { el.classList.add('pf-clip', 'pf-clip-in'); }); return; }
    if (!clipIO) clipIO = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('pf-clip-in'); clipIO.unobserve(en.target); } });
    }, { threshold: 0.01, rootMargin: '0px 0px -8% 0px' });
    els.forEach(function (el) {
      el.classList.add('pf-clip'); clipIO.observe(el);
      // self-heal: never leave content permanently clipped if the observer misses
      setTimeout(function () {
        if (el.classList.contains('pf-clip-in')) return;
        var r = el.getBoundingClientRect();
        if (r.top < innerHeight && r.bottom > 0) { el.classList.add('pf-clip-in'); clipIO.unobserve(el); }
      }, 1400);
    });
  }

  /* ===================== pinned horizontal scroll ===================== */
  var hs = [], hsOn = false;
  function scanHScroll() {
    document.querySelectorAll('[data-hscroll]:not([data-pf])').forEach(function (sec) {
      bind(sec);
      var track = sec.querySelector('[data-hscroll-track]');
      if (track) hs.push({ sec: sec, track: track, dist: 0, disabled: false });
    });
    if (!hs.length) return;
    layoutHS();
    if (!hsOn) { hsOn = true; addEventListener('resize', layoutHS, { passive: true }); addSystem(hsFrame); }
  }
  function layoutHS() {
    var mobile = innerWidth <= 860 || touch;
    hs.forEach(function (s) {
      if (mobile || reduce) { s.disabled = true; s.sec.style.height = ''; s.track.style.transform = ''; return; }
      s.disabled = false;
      var d = s.track.scrollWidth - innerWidth + 96; if (d < 0) d = 0;
      s.dist = d; s.sec.style.height = (innerHeight + d) + 'px';
    });
  }
  function hsFrame() {
    for (var i = 0; i < hs.length; i++) {
      var s = hs[i]; if (s.disabled) continue;
      var r = s.sec.getBoundingClientRect(), span = s.sec.offsetHeight - innerHeight;
      var p = clamp((-r.top) / (span || 1), 0, 1);
      s.track.style.transform = 'translate3d(' + (-(p * s.dist)).toFixed(1) + 'px,0,0)';
    }
    return true;
  }

  /* ===================== cursor-lit tool board ===================== */
  function scanToolsBoard() {
    document.querySelectorAll('[data-toolboard]:not([data-pf])').forEach(function (board) {
      bind(board);
      var tiles = [].slice.call(board.querySelectorAll('[data-tool]'));
      if (!tiles.length) return;
      var glow = board.querySelector('[data-tool-glow]');
      var mx = 0, my = 0, active = false, R = 300, base = touch ? 0.6 : 0.14;

      function paint(tl, n) {
        tl.style.opacity = (0.4 + 0.6 * n).toFixed(3);
        tl.style.transform = 'translate3d(0,' + (-10 * n).toFixed(1) + 'px,0) scale(' + (1 + 0.05 * n).toFixed(3) + ')';
        tl.style.borderColor = 'color-mix(in srgb, var(--accent) ' + Math.round(n * 70) + '%, var(--line))';
        tl.style.boxShadow = '0 ' + (12 + 34 * n).toFixed(0) + 'px ' + (40 + 50 * n).toFixed(0) + 'px -26px rgba(255,90,30,' + (0.55 * n).toFixed(2) + ')';
        var mk = tl.querySelector('[data-tool-mark]');
        if (mk) mk.style.filter = 'saturate(' + (0.35 + 0.9 * n).toFixed(2) + ') brightness(' + (0.92 + 0.22 * n).toFixed(2) + ')';
      }
      if (reduce) { tiles.forEach(function (tl) { paint(tl, 0.72); }); return; }

      board.addEventListener('mousemove', function (e) { var r = board.getBoundingClientRect(); mx = e.clientX - r.left; my = e.clientY - r.top; active = true; }, { passive: true });
      board.addEventListener('mouseleave', function () { active = false; });

      addSystem(function (t) {
        var br = board.getBoundingClientRect();
        if (br.bottom < -100 || br.top > innerHeight + 200) return true;
        var fx, fy, show;
        if (active && !touch) { fx = mx; fy = my; show = 1; }
        else { fx = br.width * (0.5 + 0.4 * Math.sin(t / 1700)); fy = br.height * (0.5 + 0.38 * Math.sin(t / 1150 + 1.2)); show = touch ? 0 : 0.55; }
        if (glow) { glow.style.opacity = show; glow.style.transform = 'translate(' + fx + 'px,' + fy + 'px) translate(-50%,-50%)'; }
        for (var i = 0; i < tiles.length; i++) {
          var tl = tiles[i], b = tl.getBoundingClientRect();
          var cx = b.left - br.left + b.width / 2, cy = b.top - br.top + b.height / 2;
          var d = Math.hypot(cx - fx, cy - fy), n = clamp(1 - d / R, 0, 1);
          n = n * n * (3 - 2 * n); n = Math.max(n, base);
          paint(tl, n);
        }
        return true;
      });
    });
  }

  function scan() {
    try { scanNav(); } catch (e) {}
    try { scanTheme(); } catch (e) {}
    try { scanMenu(); } catch (e) {}
    try { scanMagnetic(); } catch (e) {}
    try { scanReveals(); } catch (e) {}
    try { scanCounters(); } catch (e) {}
    try { scanParallax(); } catch (e) {}
    try { scanTilt(); } catch (e) {}
    try { scanHeroEmbers(); } catch (e) {}
    try { scanMarquee(); } catch (e) {}
    try { scanSplit(); } catch (e) {}
    try { scanHeroFade(); } catch (e) {}
    try { scanClip(); } catch (e) {}
    try { scanHScroll(); } catch (e) {}
    try { scanToolsBoard(); } catch (e) {}
  }

  /* ===================== smooth scroll (Lenis if present) ===================== */
  function initLenis() {
    if (!reduce && window.Lenis) {
      try {
        var lenis = new window.Lenis({ duration: 1.1, easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); }, smoothWheel: true });
        PF.lenis = lenis;
        (function rl(t) { lenis.raf(t); requestAnimationFrame(rl); })(0);
      } catch (e) {}
    }
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href^="#"]');
      if (!a) return;
      var id = a.getAttribute('href'); if (id.length < 2) return;
      var tgt = document.querySelector(id); if (!tgt) return;
      e.preventDefault();
      if (PF.lenis) PF.lenis.scrollTo(tgt, { offset: -70 }); else tgt.scrollIntoView({ behavior: 'smooth' });
    });
  }

  /* ===================== cinematic page transition ===================== */
  function initTransition() {
    var ov = document.createElement('div'); ov.className = 'pf-wipe'; ov.innerHTML = '<span class="pf-wipe-mark">SG</span>';
    document.body.appendChild(ov);
    requestAnimationFrame(function () { requestAnimationFrame(function () { docEl.classList.add('pf-loaded'); }); });
    if (reduce) return;
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href]'); if (!a) return;
      var href = a.getAttribute('href'), target = a.getAttribute('target');
      if (!href || href[0] === '#' || target === '_blank' || href.indexOf('mailto:') === 0 ||
          href.indexOf('tel:') === 0 || /^https?:\/\//.test(href) || a.hasAttribute('data-no-wipe')) return;
      e.preventDefault();
      docEl.classList.remove('pf-loaded'); docEl.classList.add('pf-leaving');
      setTimeout(function () { window.location.href = href; }, 600);
    });
    addEventListener('pageshow', function (ev) { if (ev.persisted) { docEl.classList.remove('pf-leaving'); docEl.classList.add('pf-loaded'); } });
  }

  /* ===================== init ===================== */
  PF.init = function () {
    if (!PF._inited) {
      PF._inited = true;
      try { initEmberCanvas(); } catch (e) {}
      if (useCursor) { try { initCursor(); } catch (e) {} }
      try { initLenis(); } catch (e) {}
      try { initTransition(); } catch (e) {}
      try {
        var mo = new MutationObserver(function () { clearTimeout(PF._t); PF._t = setTimeout(scan, 100); });
        mo.observe(document.body, { childList: true, subtree: true });
      } catch (e) {}
    }
    scan();
  };

  setTimeout(function () {
    if (!PF._revealed) [].slice.call(document.querySelectorAll('[data-reveal],[data-split]')).forEach(function (el) { el.style.opacity = '1'; el.style.transform = 'none'; });
  }, 4500);
})();
