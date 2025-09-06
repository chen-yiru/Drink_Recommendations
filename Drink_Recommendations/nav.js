/* nav.js — 漢堡選單 + 輪播（合併版｜更新：配合右側抽屜，用 .active；向下相容 .open）
 * 結構需求同前版，CSS 已支援 #site-nav.active/.open 從右側滑出
 */

/* =========================
   全域可調參數
========================= */
const MOBILE_BREAKPOINT = 768;    // ≤ 768px 視為手機
const SLIDE_AUTOPLAY_MS = 4000;   // 輪播預設自動播放間隔（毫秒）

/* =========================
   漢堡選單 + 子選單
========================= */
(function () {
  const hamburger = document.getElementById('hamburger');
  const siteNav   = document.getElementById('site-nav');
  const navList   = document.getElementById('nav-list');

  if (!hamburger || !siteNav || !navList) return;

  const isMobile = () => window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`).matches;

  function setBodyScrollLock(lock) {
    document.documentElement.style.overflow = lock ? 'hidden' : '';
    document.body.style.overflow = lock ? 'hidden' : '';
  }

  function toggleNav(force) {
    const isOpen = siteNav.classList.contains('active') || siteNav.classList.contains('open');
    const willOpen = typeof force === 'boolean' ? force : !isOpen;

    // 主要使用 .active；同時維持 .open 相容
    siteNav.classList.toggle('active', willOpen);
    siteNav.classList.toggle('open',   willOpen);
    hamburger.classList.toggle('active', willOpen);
    hamburger.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
    setBodyScrollLock(willOpen);

    if (!willOpen) closeAllSubmenus();
  }

  function closeAllSubmenus() {
    submenuParents.forEach(li => {
      li.classList.remove('open');
      const a = li.querySelector(':scope > a');
      if (a) a.setAttribute('aria-expanded', 'false');
      li.removeAttribute('data-armed');
    });
  }

  // 找出所有有子選單的 li
  const submenuParents = Array.from(navList.querySelectorAll('li')).filter(li =>
    li.querySelector(':scope > ul')
  );

  // 初始化子選單父層
  submenuParents.forEach(li => {
    li.classList.add('has-submenu');
    const link = li.querySelector(':scope > a');
    if (!link) return;

    // ARIA
    link.setAttribute('aria-haspopup', 'true');
    link.setAttribute('aria-expanded', 'false');

    // 手機：點父層先展開；若 href 為實體連結，需第二次點才跳轉
    link.addEventListener('click', (e) => {
      if (!isMobile()) return; // 桌機交給 CSS hover

      const href = link.getAttribute('href') || '#';
      const isHashOrVoid = href === '#' || href.trim().toLowerCase() === 'javascript:void(0)';
      const armed = li.hasAttribute('data-armed');

      if (!li.classList.contains('open')) {
        e.preventDefault();
        // 關閉其他已開
        submenuParents.forEach(other => {
          if (other !== li) {
            other.classList.remove('open');
            const oa = other.querySelector(':scope > a');
            if (oa) oa.setAttribute('aria-expanded', 'false');
            other.removeAttribute('data-armed');
          }
        });
        li.classList.add('open');
        link.setAttribute('aria-expanded', 'true');

        if (!isHashOrVoid) li.setAttribute('data-armed', 'true');
        return;
      }

      // 已展開：有實體連結時，第一次武裝、第二次放行
      if (!isHashOrVoid) {
        if (!armed) {
          e.preventDefault();
          li.setAttribute('data-armed', 'true');
          return;
        }
        // 第二次點擊：放行並收起抽屜
        toggleNav(false);
        return;
      }

      // # 或 void：切換展開
      e.preventDefault();
      const willOpen = !li.classList.contains('open');
      li.classList.toggle('open', willOpen);
      link.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
      if (!willOpen) li.removeAttribute('data-armed');
    });
  });

  // 漢堡：開/關主選單
  hamburger.addEventListener('click', () => toggleNav());

  // 點外部關閉（僅手機）
  document.addEventListener('click', (e) => {
    if (!isMobile()) return;
    const isOpen = siteNav.classList.contains('active') || siteNav.classList.contains('open');
    if (!isOpen) return;

    if (!siteNav.contains(e.target) && !hamburger.contains(e.target)) toggleNav(false);
  });

  // ESC 關閉
  document.addEventListener('keydown', (e) => {
    const isOpen = siteNav.classList.contains('active') || siteNav.classList.contains('open');
    if (e.key === 'Escape' && isOpen) toggleNav(false);
  });

  // 尺寸變更：離開手機狀態時重置
  window.addEventListener('resize', () => {
    if (!isMobile()) {
      siteNav.classList.remove('active', 'open');
      hamburger.classList.remove('active');
      hamburger.setAttribute('aria-expanded', 'false');
      setBodyScrollLock(false);
      closeAllSubmenus();
    }
  });
})();

/* =========================
   輪播（Slideshow）
========================= */
(function () {
  const container = document.querySelector('.slideshow-container');
  const slides = Array.from(document.getElementsByClassName('mySlides'));
  const dots = Array.from(document.getElementsByClassName('dot'));
  const prevBtn = document.querySelector('.prev');
  const nextBtn = document.querySelector('.next');

  if (!container || slides.length === 0) return;

  const intervalFromData = Number(container.getAttribute('data-interval'));
  const startFromData = Number(container.getAttribute('data-start'));
  const AUTOPLAY_MS = Number.isFinite(intervalFromData) && intervalFromData > 0
    ? intervalFromData
    : SLIDE_AUTOPLAY_MS;

  let slideIndex = Number.isFinite(startFromData) && startFromData >= 1 && startFromData <= slides.length
    ? (startFromData - 1)
    : 0;

  let timerId = null;
  let isPaused = false;
  let wasInView = true;

  function setShown(el, shown) {
    el.style.display = shown ? 'block' : 'none';
    el.classList.toggle('active', shown);
  }

  function render(index) {
    if (index >= slides.length) index = 0;
    if (index < 0) index = slides.length - 1;
    slideIndex = index;

    slides.forEach((s, i) => setShown(s, i === slideIndex));

    if (dots.length) {
      dots.forEach(d => d.classList.remove('active'));
      if (dots[slideIndex]) dots[slideIndex].classList.add('active');
    }
  }

  function go(delta)   { render(slideIndex + delta); }
  function goTo(n)     { const i = (Number(n) || 1) - 1; render(i); }

  function startAutoplay() { stopAutoplay(); timerId = setInterval(() => go(1), AUTOPLAY_MS); }
  function stopAutoplay()  { if (timerId) { clearInterval(timerId); timerId = null; } }
  function pauseAutoplay() { isPaused = true; stopAutoplay(); }

  // 初始化
  render(slideIndex);
  startAutoplay();

  // 與 inline onclick 相容
  window.plusSlides   = (n) => go(Number(n) || 1);
  window.currentSlide = (n) => goTo(n);

  // 按鈕
  if (prevBtn) prevBtn.addEventListener('click', () => go(-1));
  if (nextBtn) nextBtn.addEventListener('click', () => go(1));

  // dots 事件（若未使用 inline）
  if (dots.length) {
    dots.forEach((dot, i) => {
      if (!dot.hasAttribute('onclick')) {
        dot.addEventListener('click', () => goTo(i + 1));
      }
    });
  }

  // 滑鼠 hover 控制
  container.addEventListener('mouseenter', pauseAutoplay);
  container.addEventListener('mouseleave', () => {
    isPaused = false;
    startAutoplay();
  });

  // 分頁切換可見性
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopAutoplay();
    else if (!isPaused) startAutoplay();
  });

  // 不在視口內暫停
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.target !== container) return;
        if (entry.isIntersecting) {
          wasInView = true;
          if (!isPaused && !timerId) startAutoplay();
        } else {
          wasInView = false;
          stopAutoplay();
        }
      });
    }, { threshold: 0.1 });
    io.observe(container);
  }

  // 鍵盤左右鍵
  document.addEventListener('keydown', (e) => {
    const rect = container.getBoundingClientRect();
    const viewportH = window.innerHeight || document.documentElement.clientHeight;
    const inView = rect.bottom > 0 && rect.top < viewportH;
    if (!inView) return;

    if (e.key === 'ArrowLeft') go(-1);
    else if (e.key === 'ArrowRight') go(1);
  });

  // 觸控滑動（手機）
  let touchStartX = 0, touchStartY = 0, touchMoved = false;

  container.addEventListener('touchstart', (e) => {
    if (!e.touches || !e.touches[0]) return;
    touchMoved = false;
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    pauseAutoplay();
  }, { passive: true });

  container.addEventListener('touchmove', (e) => {
    if (!e.touches || !e.touches[0]) return;
    const dx = e.touches[0].clientX - touchStartX;
    const dy = e.touches[0].clientY - touchStartY;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 20) touchMoved = true;
  }, { passive: true });

  container.addEventListener('touchend', (e) => {
    if (touchMoved) {
      const endX = (e.changedTouches && e.changedTouches[0]) ? e.changedTouches[0].clientX : touchStartX;
      const dx = endX - touchStartX;
      if (dx > 30) go(-1);
      if (dx < -30) go(1);
    }
    isPaused = false;
    startAutoplay();
  });

  // 卸載清理
  window.addEventListener('beforeunload', stopAutoplay);
})();
