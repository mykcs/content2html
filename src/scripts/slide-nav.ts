// src/scripts/slide-nav.ts — slide 横向翻页键盘导航
// 触发键: ArrowLeft/ArrowRight/ArrowUp/ArrowDown (单步) + PageUp/PageDown (5 步) +
//         Space (next) + Home/End (首/末) + 1-9 (直接跳到第 N 页)
// 兼容 Astro v6: 用 astro:page-load 事件触发, 支持 ViewTransitions 重复挂载
// 副作用: 在 .slide-deck 内注入 .slide-indicator (页码), 右上角 + 半透明背景

const ACTIVE_CLASS = "active";
const INDICATOR_CLASS = "slide-indicator";

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

function onKeyDown(e: KeyboardEvent): void {
  // 忽略输入框 / textarea / contentEditable
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
      e.preventDefault();
      navigate(1);
      break;
    case "ArrowLeft":
    case "ArrowUp":
      e.preventDefault();
      navigate(-1);
      break;
    case "PageDown":
      e.preventDefault();
      navigate(1);
      break;
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
      // 数字键 1-9 直接跳转
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

function init(): void {
  ensureFirstPageActive();
  document.addEventListener("keydown", onKeyDown);
}

function destroy(): void {
  document.removeEventListener("keydown", onKeyDown);
  document.querySelector(`.${INDICATOR_CLASS}`)?.remove();
}

// Astro v6 ViewTransitions 兼容: 每次页面切换重新挂载
document.addEventListener("astro:page-load", init);
document.addEventListener("astro:before-swap", destroy);
