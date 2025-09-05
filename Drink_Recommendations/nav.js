/* nav.js — 漢堡選單 + 輪播（合併版）
 * 需求：
 * 1) 導覽結構需包含：
 *    - <button id="hamburger" ...>
 *    - <nav id="site-nav"><ul id="nav-list">...</ul></nav>
 *    - 子選單結構：<li><a>父層</a><ul>子選單</ul></li>
 * 2) 輪播結構需包含（若需要）：
 *    - <div class="slideshow-container" [data-interval="4000"] [data-start="1"]>
 *        <div class="mySlides"> ... </div>
 *        <div class="mySlides"> ... </div>
 *        <a class="prev">‹</a>
 *        <a class="next">›</a>
 *        <span class="dot"></span>...
 *      </div>
 *
 * 建議 CSS（手機）：
 *  @media (max-width:768px){
 *    #site-nav > ul { display:none; }
 *    #site-nav.open > ul { display:flex; flex-direction:column; }
 *    nav li ul { display:none !important; position:static !important; }
 *    nav li.open > ul { display:block !important; }
 *  }
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

  if (!hamburger || !siteNav || !navList) {
    // 沒導覽元素就不啟用（避免報錯）
    return;
  }

  const isMobile = () => window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`).matches;

  function toggleNav(force) {
    const willOpen = typeof force === 'boolean' ? force : !siteNav.classList.contains('open');
    siteNav.classList.toggle('open', willOpen);
    hamburger.classList.toggle('active', willOpen);
    hamburger.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
    if (!willOpen) closeAllSubmenus();
  }

  function closeAllSubmenus() {
    submenuParents.forEach(li => {
      li.classList.remove('open');
      const a = li.querySelector(':scope > a');
      if (a) a.setAttribute('aria-expanded', 'false');
      li.removeAttribute('data-armed'); // 取消「首次點擊不跳轉」保護
    });
  }

  // 找出所有有子選單的 li
  const submenuParents = Array.from(navList.querySelectorAll('li')).filter(li =>
    li.querySelector(':scope > ul')
  );

  // 初始化有子選單的 li
  submenuParents.forEach(li => {
    li.classList.add('has-submenu');
    const link = li.querySelector(':scope > a');
    if (!link) return;

    // ARIA
    link.setAttribute('aria-haspopup', 'true');
    link.setAttribute('aria-expanded', 'false');

    // 手機點擊：展開/收合子選單；第二次點同一父層才真的導向
    link.addEventListener('click', (e) => {
      if (!isMobile()) return; // 桌機交給 CSS hover

      const href = link.getAttribute('href') || '#';
      const isHashOrVoid = href === '#' || href.trim().toLowerCase() === 'javascript:void(0)';
      const armed = li.hasAttribute('data-armed');

      // 若未展開，先展開並攔截跳轉
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

        // 若 href 是實體連結，給一次「武裝」機會（第二次點才跳走）
        if (!isHashOrVoid) {
          li.setAttribute('data-armed', 'true');
        }
        return;
      }

      // 若已展開：
      //  - 有子選單且 href 是實體連結：第一次點（armed=true）僅準備；第二次點才放行
      if (!isHashOrVoid) {
        if (!armed) {
          e.preventDefault();
          li.setAttribute('data-armed', 'true');
          return;
        }
        // 第二次點：讓它照常導航，並關閉選單
        toggleNav(false);
        return;
      }

      // href 是 # 或 void(0) ：切換展開/收合
      e.preventDefault();
      const willOpen = !li.classList.contains('open');
      li.classList.toggle('open', willOpen);
      link.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
      if (!willOpen) li.removeAttribute('data-armed');
    });
  });

  // 漢堡按鈕：開/關主選單
  hamburger.addEventListener('click', () => toggleNav());

  // 點擊外部：若在手機狀態且目前開啟，則關閉
  document.addEventListener('click', (e) => {
    if (!isMobile()) return;
    if (!siteNav.classList.contains('open')) return;

    const insideNav = siteNav.contains(e.target) || hamburger.contains(e.target);
    if (!insideNav) toggleNav(false);
  });

  // ESC 關閉
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && siteNav.classList.contains('open')) {
      toggleNav(false);
    }
  });

  // 視窗尺寸變更：離開手機狀態時重置
  window.addEventListener('resize', () => {
    if (!isMobile()) {
      siteNav.classList.remove('open');
      hamburger.classList.remove('active');
      hamburger.setAttribute('aria-expanded', 'false');
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

  if (!container || slides.length === 0) {
    // 沒有輪播結構就不啟用
    return;
  }

  // 可用 data-interval / data-start 覆寫預設
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

  function go(delta) {
    render(slideIndex + delta);
  }

  function goTo(n) {
    const idx = Number(n) - 1;
    if (Number.isFinite(idx)) render(idx);
  }

  function startAutoplay() {
    stopAutoplay();
    timerId = setInterval(() => go(1), AUTOPLAY_MS);
  }

  function stopAutoplay() {
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
  }

  function pauseAutoplay() {
    isPaused = true;
    stopAutoplay();
  }

  function resumeAutoplay() {
    if (!isPaused) return;
    isPaused = false;
    startAutoplay();
  }

  // 初始化
  render(slideIndex);
  startAutoplay();

  // 與 inline onclick 相容
  window.plusSlides = function (n) { go(Number(n) || 1); };
  window.currentSlide = function (n) { goTo(n); };

  // 按鈕
  if (prevBtn) prevBtn.addEventListener('click', () => go(-1));
  if (nextBtn) nextBtn.addEventListener('click', () => go(1));

  // dots 沒有 inline 的話補監聽
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
  let touchStartX = 0;
  let touchStartY = 0;
  let touchMoved = false;

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
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 20) {
      touchMoved = true;
    }
  }, { passive: true });

  container.addEventListener('touchend', (e) => {
    if (touchMoved) {
      const endX = (e.changedTouches && e.changedTouches[0]) ? e.changedTouches[0].clientX : touchStartX;
      const dx = endX - touchStartX;
      if (dx > 30) go(-1);
      if (dx < -30) go(1);
    }
    isPaused = false;
    if (wasInView) startAutoplay();
  });

  // 卸載清理
  window.addEventListener('beforeunload', stopAutoplay);
})();
