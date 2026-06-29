// src/scripts/slide-nav.ts — slide 翻页 + 缩放 (OSA-like: dark frame + auto-scale + bottom controls)
//
// 翻页触发 (4 选 1):
//   - 键盘: Arrow* / Space / PageUp-Down / Home/End / 1-9
//   - 滚轮: wheel deltaY (debounce 700ms)
//   - 触屏: touchstart/end swipe (threshold 50px)
//   - 控件: 点击 controls 缩放按钮 (ZoomIn/ZoomOut/Fit)
//
// 缩放 (OSA-style 4 档 + Fit):
//   - Fit: 计算 viewport / 1920×1080 min scale, 上限 1
//   - 1.0× / 0.75× / 0.5×: 固定档位
//   - 控件点击循环切换
//
// 关键 fix (2026-06-17): 旧版只挂 astro:page-load, content2html 没装 ViewTransitions
//   → 首次加载 init() 不 fire → 键盘没反应。本版补 DOMContentLoaded + 直接调用。

const ACTIVE_CLASS = "active";
const CONTROLS_CLASS = "slide-controls";
const WHEEL_DEBOUNCE_MS = 700;
const TOUCH_SWIPE_THRESHOLD = 50;
const SLIDE_W = 1920;
const SLIDE_H = 1080;
const FRAME_PAD = 80;
const ZOOM_LEVELS = [0.5, 0.75, 1, "fit"] as const;
type ZoomLevel = (typeof ZOOM_LEVELS)[number];
type ZoomAction = ZoomLevel | "print";

// === Navigation ===
// Page number is shown once in top-right .slide-meta-bar .meta-page (e.g. "01 / 14").
// Previously also rendered bottom-right (CSS ::after) + bottom-left (slide-indicator JS) — REMOVED 2026-06-21.
function navigate(shift: number): void {
  const pages = Array.from(
    document.querySelectorAll<HTMLElement>(".slide-page")
  );
  if (pages.length === 0) return;

  const current = pages.findIndex((p) => p.classList.contains(ACTIVE_CLASS));
  if (current < 0) {
    pages[0]?.classList.add(ACTIVE_CLASS);
    return;
  }

  const next = Math.max(0, Math.min(pages.length - 1, current + shift));
  if (next === current) return;

  pages[current].classList.remove(ACTIVE_CLASS);
  pages[next].classList.add(ACTIVE_CLASS);
}

function ensureFirstPageActive(): void {
  const pages = Array.from(
    document.querySelectorAll<HTMLElement>(".slide-page")
  );
  if (pages.length === 0) return;
  const hasActive = pages.some((p) => p.classList.contains(ACTIVE_CLASS));
  if (!hasActive) pages[0].classList.add(ACTIVE_CLASS);
}

// === Scaling (OSA-style fit-to-viewport + 3 manual levels) ===
function fitScale(): number {
  const availableW = window.innerWidth - FRAME_PAD;
  const availableH = window.innerHeight - FRAME_PAD;
  return Math.min(availableW / SLIDE_W, availableH / SLIDE_H, 1);
}

function applyZoom(level: ZoomLevel): void {
  const scale = level === "fit" ? fitScale() : level;
  // Round 16 fix (2026-06-29): set --slide-scale on .slide-deck element, not
  // :root. global.css defines `.slide-deck { --slide-scale: 1 }` which has
  // higher CSS specificity than :root, so setting on documentElement was
  // silently overridden by the class rule (cascade). Set on the actual
  // element using the var (.slide-page) to win specificity.
  const deck = document.querySelector<HTMLElement>(".slide-deck");
  if (deck) deck.style.setProperty("--slide-scale", String(scale));
  // Update controls display
  const display = document.querySelector<HTMLElement>(".slide-controls__zoom");
  if (display) display.textContent = level === "fit" ? "Fit" : `${Math.round(level * 100)}%`;
  // Toggle .active class on Fit button
  const fitBtn = document.querySelector<HTMLButtonElement>("[data-zoom='fit']");
  if (fitBtn) fitBtn.classList.toggle("active", level === "fit");
}

function zoomNext(): void {
  const current = readCurrentZoom();
  const idx = ZOOM_LEVELS.indexOf(current);
  const next = ZOOM_LEVELS[(idx + 1) % ZOOM_LEVELS.length];
  applyZoom(next);
}

function zoomPrev(): void {
  const current = readCurrentZoom();
  const idx = ZOOM_LEVELS.indexOf(current);
  const prev = ZOOM_LEVELS[(idx - 1 + ZOOM_LEVELS.length) % ZOOM_LEVELS.length];
  applyZoom(prev);
}

function readCurrentZoom(): ZoomLevel {
  const display = document.querySelector<HTMLElement>(".slide-controls__zoom");
  if (!display) return "fit";
  const txt = display.textContent ?? "Fit";
  if (txt === "Fit") return "fit";
  const pct = parseInt(txt, 10) / 100;
  return (ZOOM_LEVELS.find((z) => z === pct) ?? "fit") as ZoomLevel;
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
    case "+":
    case "=":
      e.preventDefault();
      zoomNext();
      break;
    case "-":
    case "_":
      e.preventDefault();
      zoomPrev();
      break;
    case "0":
      e.preventDefault();
      applyZoom("fit");
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
        }
      }
  }
}

// === Wheel (debounced) ===
let lastWheelTime = 0;
function onWheel(e: WheelEvent): void {
  // Ctrl+wheel = zoom (trackpad pinch)
  if (e.ctrlKey || e.metaKey) {
    e.preventDefault();
    e.deltaY < 0 ? zoomNext() : zoomPrev();
    return;
  }
  // Plain wheel = page flip
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

// === Controls bar wiring ===
function onControlsClick(e: Event): void {
  const btn = (e.target as HTMLElement | null)?.closest<HTMLElement>("[data-zoom]");
  if (!btn) return;
  const level = btn.dataset.zoom as ZoomAction | undefined;
  if (!level) return;
  if (level === "print") {
    window.print();
    return;
  }
  applyZoom(level);
}

// === Resize handler ===
function onResize(): void {
  // Re-fit if currently in "fit" mode
  const display = document.querySelector<HTMLElement>(".slide-controls__zoom");
  if (display?.textContent === "Fit") applyZoom("fit");
}

// === Attach / Detach ===
function attach(): void {
  ensureFirstPageActive();
  applyZoom("fit");
  document.addEventListener("keydown", onKeyDown);
  window.addEventListener("wheel", onWheel, { passive: false });
  document.addEventListener("touchstart", onTouchStart, { passive: true });
  document.addEventListener("touchend", onTouchEnd, { passive: true });
  window.addEventListener("resize", onResize);
  // Round 16 fix: use document-level click delegation (per §L25 L26 §H).
  // Original attached only to .slide-controls, but Astro 5+ may render controls
  // after module script executes (deferred hydration), causing null querySelector.
  // Document delegation works regardless of element order.
  document.addEventListener("click", onControlsClick as EventListener);
}

function detach(): void {
  document.removeEventListener("keydown", onKeyDown);
  window.removeEventListener("wheel", onWheel);
  document.removeEventListener("touchstart", onTouchStart);
  document.removeEventListener("touchend", onTouchEnd);
  window.removeEventListener("resize", onResize);
  // Round 16 fix: match attach() — remove document-level click delegation
  document.removeEventListener("click", onControlsClick as EventListener);
}

// Round 16 fix v5 (2026-06-29): always register DOMContentLoaded listener
// and ALSO call attach synchronously if document is already past loading.
// The 2 paths handle both:
// - module script runs while body is parsing (rare): DOMContentLoaded fires
//   later, listener catches it
// - module script runs after body is parsed (common): direct call works
// In both cases, attach runs at most once per "trigger" because of
// idempotent operations (addEventListener for click is the same target/handler
// pair → deduped by browser; setProperty same value is no-op).
document.addEventListener("DOMContentLoaded", attach, { once: true });
if (document.readyState !== "loading") {
  attach();
}
document.addEventListener("astro:page-load", attach);
document.addEventListener("astro:before-swap", detach);
