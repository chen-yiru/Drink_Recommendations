// ====== 可調參數（亦可在 HTML 的 .slideshow-container 上用 data-interval / data-start 覆寫）======
const SLIDE_AUTOPLAY_MS = 4000; // 自動播放間隔（毫秒，預設 4000）

(function () {
  // 取得主要容器（只支援單一輪播；要多個可用 querySelectorAll 迭代）
  const container = document.querySelector('.slideshow-container');
  const slides = Array.from(document.getElementsByClassName('mySlides'));
  const dots = Array.from(document.getElementsByClassName('dot'));
  const prevBtn = document.querySelector('.prev');
  const nextBtn = document.querySelector('.next');

  if (!container || slides.length === 0) {
    console.warn('[slideshow] 沒有找到 .slideshow-container 或 .mySlides，輪播未啟用');
    return;
  }

  // 讀取可選 data 屬性
  const intervalFromData = Number(container.getAttribute('data-interval'));
  const startFromData = Number(container.getAttribute('data-start'));
  const AUTOPLAY_MS = Number.isFinite(intervalFromData) && intervalFromData > 0
    ? intervalFromData
    : SLIDE_AUTOPLAY_MS;

  let slideIndex = Number.isFinite(startFromData) && startFromData >= 1 && startFromData <= slides.length
    ? (startFromData - 1) // 轉 0-based
    : 0;

  let timerId = null;
  let isPaused = false;

  // Helper：設定某元素是否顯示
  function setShown(el, shown) {
    el.style.display = shown ? 'block' : 'none';
    el.classList.toggle('active', shown);
  }

  // 顯示指定索引
  function render(index) {
    // 修正索引循環
    if (index >= slides.length) index = 0;
    if (index < 0) index = slides.length - 1;
    slideIndex = index;

    // 切換顯示（同時加上 active class）
    slides.forEach((s, i) => setShown(s, i === slideIndex));

    // dots（有就切換，沒有就忽略）
    if (dots.length) {
      dots.forEach(d => d.classList.remove('active'));
      if (dots[slideIndex]) dots[slideIndex].classList.add('active');
    }
  }

  // 下一張/上一張
  function go(delta) {
    render(slideIndex + delta);
  }

  // 直接到第 n 張（1-based for HTML 相容）
  function goTo(n) {
    const idx = Number(n) - 1;
    if (Number.isFinite(idx)) render(idx);
  }

  // 自動播放控制
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

  // 初始化畫面與計時
  render(slideIndex);
  startAutoplay();

  // ====== 事件綁定 ======
  // 與原本 HTML 的 inline onclick 相容
  window.plusSlides = function (n) { go(Number(n) || 1); };
  window.currentSlide = function (n) { goTo(n); };

  // 如果有箭頭，綁定點擊
  if (prevBtn) prevBtn.addEventListener('click', () => go(-1));
  if (nextBtn) nextBtn.addEventListener('click', () => go(1));

  // 若 dots 沒有 inline onclick，這裡一併補上
  if (dots.length) {
    dots.forEach((dot, i) => {
      if (!dot.hasAttribute('onclick')) {
        dot.addEventListener('click', () => goTo(i + 1));
      }
    });
  }

  // 滑鼠移入暫停、移出繼續
  container.addEventListener('mouseenter', pauseAutoplay);
  container.addEventListener('mouseleave', () => {
    isPaused = false;
    startAutoplay();
  });

  // 視窗可見性改變（切分頁時暫停 / 回來繼續）
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopAutoplay();
    } else if (!isPaused) {
      startAutoplay();
    }
  });

  // 當輪播不在視口內時，暫停（省資源）；回到視口再恢復
  let wasInView = true;
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.target !== container) return;
        if (entry.isIntersecting) {
          // 回到可視範圍
          wasInView = true;
          if (!isPaused && !timerId) startAutoplay();
        } else {
          // 離開可視範圍
          wasInView = false;
          stopAutoplay();
        }
      });
    }, { threshold: 0.1 });
    io.observe(container);
  }

  // 鍵盤左右鍵切換（輪播在視窗內才作用）
  document.addEventListener('keydown', (e) => {
    const rect = container.getBoundingClientRect();
    const viewportH = window.innerHeight || document.documentElement.clientHeight;
    const inView = rect.bottom > 0 && rect.top < viewportH;
    if (!inView) return;

    if (e.key === 'ArrowLeft') {
      go(-1);
    } else if (e.key === 'ArrowRight') {
      go(1);
    }
  });

  // 觸控滑動切換（手機/平板）
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
    // 判斷是否為水平滑動
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 20) {
      touchMoved = true;
    }
  }, { passive: true });

  container.addEventListener('touchend', (e) => {
    if (touchMoved) {
      const endX = (e.changedTouches && e.changedTouches[0]) ? e.changedTouches[0].clientX : touchStartX;
      const dx = endX - touchStartX;
      if (dx > 30) go(-1);   // 右滑：上一張
      if (dx < -30) go(1);   // 左滑：下一張
    }
    isPaused = false;
    // 只有在仍在視口內時才恢復
    if (wasInView) startAutoplay();
  });

  // 視窗卸載時清理 timer
  window.addEventListener('beforeunload', stopAutoplay);
})();
