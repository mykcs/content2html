// src/scripts/slide-nav.ts — slide 横向/纵向翻页 (scroll + keyboard + touch)
// 触发键: ArrowLeft/Right/Up/Down + Space + PageUp/Down + Home/End + 1-9 直跳
// 触发滚轮: wheel deltaY (debounce 700ms, 避免 Mac trackpad 连续触发)
// 触发触屏: touchstart/touchend swipe (阈值 50px)
//
// 关键 fix (2026-06-17): 旧版只挂 astro:page-load, content2html 没装 ViewTransitions
//   → 首次加载 init() 不 fire → 键盘没反应。本版补 DOMContentLoaded + 直接调用。
//
// Astro v6 ViewTransitions 兼容: astro:page-load 挂载 + astro:before-swap 清理

const ACTIVE_CLASS = "active";
const INDICATOR_CLASS = "slide-indicator";
const WHEEL_DEBOUNCE_MS = 700;
const TOUCH_SWIPE_THRESHOLD = 50;

function navigate(shift: number): void {
  const pages = Array.from(
    document.querySelectorAll<HTMLElement>(".slide-page")
  );
  if (pages.length === 0) return;

  const current = pages.findIndex((p) => p.classList.contains(ACTIVE_CLASS));
  if (current < 0) {
    pages[0]?.classList.add(ACTIVE_CLASS);
    updateIndicator(0, pages.length);
    return;
  }

  const next = Math.max(0, Math.min(pages.length - 1, current + shift));
  if (next === current) return;

  pages[current].classList.remove(ACTIVE_CLASS);
  pages[next].classList.add(ACTIVE_CLASS);
  updateIndicator(next, pages.length);
}

function updateIndicator(current: number, total: number): void {
  let el = document.querySelector<HTMLElement>(`.${INDICATOR_CLASS}`);
  if (!el) {
    el = document.createElement("div");
    el.className = INDICATOR_CLASS;
    document.querySelector(".slide-deck")?.appendChild(el);
  }
  el.textContent = `${current + 1} / ${total}`;
}

function ensureFirstPageActive(): void {
  const pages = Array.from(
    document.querySelectorAll<HTMLElement>(".slide-page")
  );
  if (pages.length === 0) return;
  const hasActive = pages.some((p) => p.classList.contains(ACTIVE_CLASS));
  if (!hasActive) pages[0].classList.add(ACTIVE_CLASS);
  const current = pages.findIndex((p) => p.classList.contains(ACTIVE_CLASS));
  updateIndicator(Math.max(0, current), pages.length);
}

// === Keyboard ===
function onKeyDown(e: KeyboardEvent): void {
  const tag = (e.target as HTMLElement | null)?.tagName;
  if (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    (e.target as HTMLElement | null)?.isContentEditable
  ) {
    return;
  }

  switch (e.key) {
    case "ArrowRight":
    case "ArrowDown":
    case " ":
    case "PageDown":
      e.preventDefault();
      navigate(1);
      break;
    case "ArrowLeft":
    case "ArrowUp":
    case "PageUp":
      e.preventDefault();
      navigate(-1);
      break;
    case "Home":
      e.preventDefault();
      navigate(-999);
      break;
    case "End":
      e.preventDefault();
      navigate(999);
      break;
    default:
      if (e.key >= "1" && e.key <= "9") {
        e.preventDefault();
        const pages = document.querySelectorAll<HTMLElement>(".slide-page");
        const target = parseInt(e.key, 10) - 1;
        if (target < pages.length) {
          const current = Array.from(pages).findIndex((p) =>
            p.classList.contains(ACTIVE_CLASS)
          );
          if (current >= 0) pages[current].classList.remove(ACTIVE_CLASS);
          pages[target].classList.add(ACTIVE_CLASS);
          updateIndicator(target, pages.length);
        }
      }
  }
}

// === Wheel (debounced) ===
let lastWheelTime = 0;
function onWheel(e: WheelEvent): void {
  // 拦截: slide-deck 是 overflow:hidden, 默认不滚动; 这里用 wheel 触发翻页
  e.preventDefault();
  const now = Date.now();
  if (now - lastWheelTime < WHEEL_DEBOUNCE_MS) return;
  lastWheelTime = now;
  navigate(e.deltaY > 0 ? 1 : -1);
}

// === Touch swipe ===
let touchStartY = 0;
function onTouchStart(e: TouchEvent): void {
  touchStartY = e.touches[0]?.clientY ?? 0;
}
function onTouchEnd(e: TouchEvent): void {
  const endY = e.changedTouches[0]?.clientY ?? 0;
  const dy = touchStartY - endY;
  if (Math.abs(dy) >= TOUCH_SWIPE_THRESHOLD) {
    navigate(dy > 0 ? 1 : -1);
  }
}

function attach(): void {
  ensureFirstPageActive();
  document.addEventListener("keydown", onKeyDown);
  window.addEventListener("wheel", onWheel, { passive: false });
  document.addEventListener("touchstart", onTouchStart, { passive: true });
  document.addEventListener("touchend", onTouchEnd, { passive: true });
}

function detach(): void {
  document.removeEventListener("keydown", onKeyDown);
  window.removeEventListener("wheel", onWheel);
  document.removeEventListener("touchstart", onTouchStart);
  document.removeEventListener("touchend", onTouchEnd);
  document.querySelector(`.${INDICATOR_CLASS}`)?.remove();
}

// 关键: 不依赖 astro:page-load (无 ViewTransitions 不 fire)
// 1) 同步挂载: 脚本是 module + defer, DOMContentLoaded 已经触发
// 2) 兜底: DOMContentLoaded 还在 loading 时挂监听
// 3) ViewTransitions 兼容: 切页时重新挂载
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", attach, { once: true });
} else {
  attach();
}
document.addEventListener("astro:page-load", attach);
document.addEventListener("astro:before-swap", detach);
