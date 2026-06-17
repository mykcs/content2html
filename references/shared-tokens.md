# Shared Design Tokens (guizang Style B fork)

> 4 产物统一 fork guizang-ppt-skill v1.1.0 Style B 视觉
> ADR-0004: design tokens 复用 + slide 翻页 / long-form 长文分叉

## Token 源 → 注入点

```
vendor/guizang-ppt-skill/references/{themes-swiss,components}.md   (read-only)
                              ↓
              src/styles/global.css (@theme {} 块)
                              ↓
        自动生成 Tailwind v4 utility class (4 产物共用)
```

**关键**: guizang submodule 永远不改, 视觉系统 fork 在 `src/styles/global.css` 的 `@theme {}` 块。

## 4 主题色 (CSS 变量)

| 变量 | 16 进制 | 适用场景 |
|------|---------|---------|
| `--color-ikb-blue` | `#002FA7` | 默认学术稳重 (克莱因蓝) |
| `--color-lemon-yellow` | `#FFF44F` | 高亮 / 警示 (柠檬黄) |
| `--color-lemon-green` | `#C5E063` | success / positive (柠檬绿) |
| `--color-safety-orange` | `#FF7900` | warning / 重点 (安全橙) |

**全部 light variant**:
- `--color-ikb-blue-light` (`#4A5DBF`) / `--color-ikb-blue-dark` (`#001A5C`)
- `--color-lemon-yellow-light` (`#FFF89A`)
- `--color-lemon-green-light` (`#DCE99A`)
- `--color-safety-orange-light` (`#FFA640`)

## 字体变量

| 变量 | 字体栈 | 用途 |
|------|--------|------|
| `--font-sans` | `'Helvetica Neue', 'Inter', system-ui, sans-serif` | slide 端 (瑞士风无衬线) |
| `--font-serif` | `'Times New Roman', 'Noto Serif SC', Georgia, serif` | long-form 端 (学术衬线) |
| `--font-mono` | `'JetBrains Mono', 'Fira Code', 'SF Mono', monospace` | 代码块 |

## 网格 + 间距

| 变量 | 值 | 用途 |
|------|---|------|
| `--spacing-baseline` | `8px` | 8pt baseline 网格 |
| `--grid-rule-width` | `0.5px` | 发丝线 hairline |
| `--grid-rule-style` | `solid` | 网格线 style |
| `--text-display` | `4.5rem` (72pt) | slide title |
| `--text-headline` | `2.25rem` (36pt) | section heading |
| `--text-title` | `1.5rem` (24pt) | sub-section |
| `--text-body` | `1rem` (16pt) | body |
| `--text-caption` | `0.75rem` (12pt) | caption / footer |

## Utility Class (Tailwind v4 自动生成)

| Class | 用途 |
|-------|------|
| `.swiss-rule` | 发丝线 (`<hr>` 替代) |
| `.slide-deck` | slide 容器 (100vw × 100vh, overflow hidden) |
| `.slide-page` | 单页 slide (绝对定位, 默认 opacity 0) |
| `.slide-page.active` | 当前页 (opacity 1, z-index 1) |
| `.longform` | long-form 容器 (max-width 45rem = 720px, 居中, 衬线) |
| `.longform h1, h2, h3` | long-form 标题 (无衬线, 紧字距) |

## 主题切换 (Tailwind v4 特性)

```css
/* 改一处 → 4 产物同步更新 */
@theme {
  --color-ikb-blue: #002FA7;  /* 改这个值, 4 产物里所有 blue 都变 */
}
```

**Tailwind v4 @theme 行为**:
- 改 `--color-ikb-blue` → 重新生成 `bg-ikb-blue` / `text-ikb-blue` / `border-ikb-blue` utility
- 改 `--font-sans` → 重新生成 `font-sans` utility
- 改 `--text-display` → 重新生成 `text-display` utility

## 主题配色 (4 套切换)

```css
/* IKB 蓝 (默认) */
@theme { --color-ikb-blue: #002FA7; }

/* 柠檬黄 (亮色) */
@theme { --color-ikb-blue: #FFD500; }  /* 改 1 个变量即可切换 */

/* 柠檬绿 */
@theme { --color-ikb-blue: #C5E803; }

/* 安全橙 */
@theme { --color-ikb-blue: #FF7900; }
```

**注意**: guizang 4 套主题对应 4 个 accent 色, 但本 skill wrap 后只有 1 个 `ikb-blue` 变量。**4 套切换**需 claudecode 手动改 `src/styles/global.css` 的 `@theme {}` 块 (不改 guizang submodule)。

## ⚠️ Tailwind v4 gotcha: 主题 token tree-shaking

**问题**: Tailwind v4 默认 tree-shake 主题 token — 只在 `:root` 输出被 utility class 引用的 token。

**影响**: 改 `@theme` 加新 token, 但 source code 没引用 → 编译后 `:root` 不存在该 CSS 变量 → 模板里 `var(--my-token)` 失效。

**缓解**:
1. 引用新 token 前, 确认 source code 至少 1 处用到 (e.g. `bg-ikb-blue` 出现在某 .astro 文件)
2. 或在 `@theme` 块手动 `@source` 引用
3. **本 skill 已规避**: 4 套主题色 + 字体 + 间距全部已被 `global.css` 的 utility class (`.swiss-rule` / `.slide-deck` / `.longform`) 引用, 不会 tree-shake

## 复用模式 (4 产物)

```astro
---
// paper-slide.astro / paper-summary.astro / progress-*.astro 都用同一模式
import BaseLayout from "../../../layouts/BaseLayout.astro";
import "../../../styles/global.css";  // Tailwind v4 自动 inject
---
<BaseLayout
  title="..."
  description="..."
  lang="zh"
  productType="slide"  <!-- 或 "longform" -->
>
  <!-- 产物内容: 引用 .swiss-rule / .longform / .slide-page 等 utility -->
</BaseLayout>
```

`BaseLayout.astro` 根据 `productType` 自动给 `<html>` 加 `slide-mode` / `longform-mode` class, 给 `<body>` 加 `slide-deck` / `longform` class。

## 关联

- `src/styles/global.css` — 实际 `@theme` 块
- `vendor/guizang-ppt-skill/references/themes-swiss.md` — 主题色源
- `vendor/guizang-ppt-skill/references/components.md` — callout / stat / pipeline 组件
- `SKILL.md` — design tokens 在 4 产物的一致性 checklist
