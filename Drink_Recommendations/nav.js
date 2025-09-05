// ====== 可調參數 ======
const SLIDE_AUTOPLAY_MS = 4000; // 自動播放間隔（毫秒）

(function () {
  // 取得元素
  const container = document.querySelector('.slideshow-container');
  const slides = Array.from(document.getElementsByClassName('mySlides'));
  const dots = Array.from(document.getElementsByClassName('dot'));
  const prevBtn = document.querySelector('.prev');
  const nextBtn = document.querySelector('.next');

  if (!container || slides.length === 0) {
    console.warn('[slideshow] 沒有找到 .slideshow-container 或 .mySlides，輪播未啟用');
    return;
  }

  let slideIndex = 0;             // 0-based
  let timerId = null;
  let isPaused = false;

  // 顯示指定索引
  function render(index) {
    // 修正索引循環
    if (index >= slides.length) index = 0;
    if (index < 0) index = slides.length - 1;
    slideIndex = index;

    // 切換顯示
    slides.forEach((s, i) => {
      s.style.display = (i === slideIndex) ? 'block' : 'none';
    });

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
    render(Number(n) - 1);
  }

  // 自動播放
  function startAutoplay() {
    stopAutoplay();
    timerId = setInterval(() => go(1), SLIDE_AUTOPLAY_MS);
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
  render(0);
  startAutoplay();

  // ====== 事件綁定 ======

  // 與你原本 HTML 的 inline onclick 相容
  window.plusSlides = function (n) { go(Number(n) || 1); };
  window.currentSlide = function (n) { goTo(n); };

  // 如果有箭頭，綁定點擊
  if (prevBtn) prevBtn.addEventListener('click', () => go(-1));
  if (nextBtn) nextBtn.addEventListener('click', () => go(1));

  // 滑鼠移入暫停、移出繼續
  container.addEventListener('mouseenter', pauseAutoplay);
  container.addEventListener('mouseleave', () => {
    isPaused = false;
    startAutoplay();
  });

  // 視窗可見性改變（切分頁時暫停）
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopAutoplay();
    } else if (!isPaused) {
      startAutoplay();
    }
  });

  // 鍵盤左右鍵切換
  document.addEventListener('keydown', (e) => {
    // 只在輪播於視窗內時作用
    const rect = container.getBoundingClientRect();
    const inView = rect.bottom > 0 && rect.top < (window.innerHeight || document.documentElement.clientHeight);
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
      if (dx > 30) go(-1);       // 右滑：上一張
      if (dx < -30) go(1);       // 左滑：下一張
    }
    isPaused = false;
    startAutoplay();
  });

})();
