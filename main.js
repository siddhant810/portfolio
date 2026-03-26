// ===================== SHARED PORTFOLIO JS =====================

document.addEventListener('DOMContentLoaded', () => {

  // =====================
  // THEME TOGGLE
  // =====================
  const themeToggle = document.getElementById('themeToggle');
  const savedTheme = localStorage.getItem('theme');

  if (savedTheme === 'light') {
    document.body.classList.add('light-mode');
  }

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      document.body.classList.toggle('light-mode');

      if (document.body.classList.contains('light-mode')) {
        localStorage.setItem('theme', 'light');
      } else {
        localStorage.setItem('theme', 'dark');
      }
    });
  }

  // =====================
  // CUSTOM CURSOR
  // =====================
  const cursor = document.getElementById('cursor');
  const ring = document.getElementById('cursorRing');

  if (cursor && ring && window.innerWidth > 768) {
    let mx = 0, my = 0, rx = 0, ry = 0;

    document.addEventListener('mousemove', e => {
      mx = e.clientX;
      my = e.clientY;
    });

    const animateCursor = () => {
      cursor.style.left = mx + 'px';
      cursor.style.top = my + 'px';
      rx += (mx - rx) * 0.12;
      ry += (my - ry) * 0.12;
      ring.style.left = rx + 'px';
      ring.style.top = ry + 'px';
      requestAnimationFrame(animateCursor);
    };

    animateCursor();

    document.querySelectorAll('a, button, .project-card, .skill-category, .theme-toggle').forEach(el => {
      el.addEventListener('mouseenter', () => {
        cursor.style.background = 'var(--accent2)';
        cursor.style.transform = 'translate(-50%,-50%) scale(1.5)';
        ring.style.width = '52px';
        ring.style.height = '52px';
        ring.style.borderColor = 'rgba(255,107,157,0.4)';
      });

      el.addEventListener('mouseleave', () => {
        cursor.style.background = 'var(--accent)';
        cursor.style.transform = 'translate(-50%,-50%) scale(1)';
        ring.style.width = '36px';
        ring.style.height = '36px';
        ring.style.borderColor = 'rgba(108,99,255,0.5)';
      });
    });
  } else {
    if (cursor) cursor.style.display = 'none';
    if (ring) ring.style.display = 'none';
    document.body.style.cursor = 'auto';
  }

  // =====================
  // NAV SHRINK
  // =====================
  const nav = document.querySelector('nav');
  if (nav) {
    window.addEventListener('scroll', () => {
      nav.style.padding = window.scrollY > 60 ? '12px 60px' : '20px 60px';
    });
  }

  // =====================
  // SCROLL REVEAL
  // =====================
  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) e.target.classList.add('visible');
    });
  }, { threshold: 0.08 });

  document.querySelectorAll('.reveal').forEach(r => observer.observe(r));

  // =====================
  // ACTIVE NAV LINK
  // =====================
  const current = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(a => {
    const href = a.getAttribute('href');
    if (href === current || (current === '' && href === 'index.html')) {
      a.classList.add('active');
    }
  });

});