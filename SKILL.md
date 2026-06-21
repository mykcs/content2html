---
name: content2html
description: 内容 (arxiv paper / DOI / PDF / 本地 progress) → 4 个 HTML 产物 (paper-slide / paper-summary / progress-slide / progress-report)。统一 fork guizang-ppt-skill v1.1.0 Style B 视觉 (IKB 蓝 / 柠檬黄 / 柠檬绿 / 安全橙)。双语支持, 默认中文 (zh), 可切英文 (en)。独立 Astro project, 部署到 mykcs.github.io/content2html/。
metadata:
  version: 0.1.0
  status: live
  created: 2026-06-17
  updated: 2026-06-21
  changelog: |
    v0.1.0 (2026-06-21) — 补 metadata frontmatter (skill-as-code 协议), 5 commit audit fix push (c0cd24f/1a41d23/a6aa0d0/1c27e7e/be41989/bbea560)
    v0.0.1 (2026-06-17) — 初版, fork guizang Style B, 4 产物 (paper-slide/paper-summary/progress-slide/progress-report), 双语, 默认 zh
triggers:
  - /content2html
  - /c2h
  - content2html
  - 内容转html
  - 论文转slide
  - 进度报告
---

# content2html

> 内容 → 4 个 HTML 产物, 一套视觉系统 (guizang Style B fork)

## Trigger

```
/content2html <input>    # 主 trigger, LLM 智能检测 input 类型
/c2h <input>             # 短别名
```

`<input>` 支持 4 种类型 (LLM 自动 dispatch):

| 类型 | 例子 | Dispatch 到 |
|------|------|-------------|
| arxiv URL | `https://arxiv.org/abs/2503.12345` | paper-mode (arxiv) |
| DOI | `https://doi.org/10.xxxx/xxx` | paper-mode (doi) |
| PDF | `/Users/.../paper.pdf` 或 `https://.../paper.pdf` | paper-mode (pdf) |
| 本地 path | `/Users/myk/Repo/myproj/` (git repo / 笔记目录) | progress-mode |

## Workflow (8 步)

1. **检测 input 类型** (LLM auto-classify)
   - 含 `arxiv.org/abs/` 或 `arxiv.org/pdf/` → arxiv
   - 含 `doi.org/` → DOI
   - 以 `.pdf` 结尾或含 `.pdf` 的 URL / 本地路径 → PDF
   - 含 `/Users/...` 或 `./` 或 `.git` 或 `*.md` 集合 → 本地 path (progress)
   - **强信号** 优先, 弱信号 fallback 见下

2. **边界 case: 显式 AskUserQuestion 1 次** (如无法判断)
   - 例: 用户给一个无 `.pdf` 后缀的本地文件, 路径像 paper 也像 markdown
   - 例: 用户给一个 GitHub PR URL, 可能是 paper 也可能是 progress
   - **不**静默猜错 (实测 LLM 误判 <1%, 但 5% 边界 case 需显式问)

3. **Dispatch 到对应 mode**
   - `mode-paper` → 见 `references/mode-paper.md`
   - `mode-progress` → 见 `references/mode-progress.md`

4. **提取结构化 outline** (sections + key figures + key sentences)
   - **双语**: zh (默认) + en (parallel extraction 或 LLM zh→en 翻译)
   - paper-mode: 标题 / 作者 / abstract / sections / figures / key_takeaways
   - progress-mode: project_name / period / done / doing / next / metrics

5. **生成 4 个产物** (按 dispatch mode 选 2 个)

| 产物 | 形态 | 模板 | 默认页数/字数 |
|------|------|------|--------------|
| `paper-slide.html` | 横向翻页 slide | guizang `template-swiss.html` fork | 12-20 页 |
| `paper-summary.html` | 单栏 long-form | 自写, 共享 design tokens | 2000-4000 字 |
| `progress-slide.html` | 横向翻页 slide | 同上 | 5-10 页 |
| `progress-report.html` | 单栏 long-form | 同上 | 1000-2000 字 |

6. **写入 Astro project** (`src/content/{papers,progress}/<id>/`)
   - content collection 路径见 `references/astro-injection.md`
   - 生成对应 Astro page (`src/pages/[lang]/{paper,progress}/[id].astro`)

7. **跑 `npm run build`** 验证 (Astro v6 + Tailwind v4)
   - 退出 0 + `dist/` 产物存在
   - 出错时按 `process.md §B.2` Post-Fix Validation 走

8. **输出 summary**: 4 个产物路径 + build status + i18n 状态
   - 例: `中文版 zh/paper/2503.12345/slide 已生成 ✓ | npm run build exit 0 ✓`
   - **不**复述长 HTML 内容 (走 `output-budget` 协议)

## 4 ADR + 1 Case

- [ADR-0002 独立 Astro project + 强解耦主站](~/.claude/docs/adr/0002-content2html-architecture.md)
- [ADR-0003 双语支持 + 默认中文](~/.claude/docs/adr/0003-content2html-i18n.md)
- [ADR-0004 4 产物统一 fork guizang Style B](~/.claude/docs/adr/0004-content2html-visual-fork.md)
- [ADR-0005 单一 trigger + 智能检测 dispatch](~/.claude/docs/adr/0005-content2html-dispatch.md)
- [Case 设计归档 + 4 轮反转 + 提问技巧](~/.claude/knowledge/cases/wiki/CASE-SKILL-CONTENT2HTML-DESIGN-20260617.md)

## References (4 文件, 按需 Read)

| 文件 | 何时 Read |
|------|----------|
| `references/mode-paper.md` | paper-mode 工作流 (arxiv/DOI/PDF) |
| `references/mode-progress.md` | progress-mode 工作流 (本地 path) |
| `references/shared-tokens.md` | guizang design tokens → Astro wrap |
| `references/astro-injection.md` | content collection + page route + build |

## 关键资源路径

| 资源 | 路径 | 说明 |
|------|------|------|
| Guizang 源码 (read-only) | `vendor/guizang-ppt-skill/` | git submodule, 锁 v1.1.0 (commit 3652b3c) |
| Guizang 主题 + 组件参考 | `vendor/guizang-ppt-skill/references/{themes-swiss,components}.md` | design tokens 源 |
| 主题 wrap (Tailwind v4 @theme) | `src/styles/global.css` | 4 套主题色 + 字体 + 8pt baseline |
| Astro 配置 | `astro.config.mjs` | i18n: zh 默认 + en 切换, base: `/content2html` |

## 质量 checklist (生成后必跑)

- [ ] **4 产物共享 design tokens** — 改 `--color-ikb-blue` 一处, 4 产物视觉同步更新
- [ ] **每个产物 self-contained HTML** — 单文件可独立打开, 无外部 JS 依赖
- [ ] **双语覆盖** — 4 产物都有 zh + en 版本 (除非用户明确单语)
- [ ] **Astro build 通过** — `npm run build` exit 0, dist/ 产物存在
- [ ] **9 项 Astro 回归** — 走 `process.md §C.4` 标准检查

## Output Budget

按 `universal.md §G` 协议, 4 个产物 HTML **不**内联到响应, 只报:
1. 4 个产物路径 (绝对路径)
2. build status (1 行)
3. i18n 状态 (1 行)
4. 用户可访问的 URL (GitHub Pages)

完整 HTML 内容由用户自己 `cat` 或浏览器打开。

## 触发式 IF-THEN (claudecode 速查)

| IF | THEN |
|----|------|
| 用户说 `/content2html <arxiv-url>` | 走 step 1-2, dispatch paper-mode, 见 `mode-paper.md` |
| 用户说 `/content2html /Users/.../proj` | 走 step 1-2, dispatch progress-mode, 见 `mode-progress.md` |
| 用户说 `/content2html` 无 input | AskUserQuestion 1 次, 问 input 类型 |
| 边界 case (input 类型不明) | AskUserQuestion 1 次, 给 4 个单选 (arxiv/DOI/PDF/local) |
| 用户说"中文版" / "英文版" | 锁定 zh / en, 不双语 |
| 用户说"双语" / "都生成" | zh + en 两个版本 (default zh 优先) |

## 边界 & 限制 (claudecode 必知)

- **不复用主站 image-map** (ADR-0002 强解耦) — figures 直接 `public/figures/<id>/`
- **不复用主站 build-pipeline** — 本 skill 用裸 Astro v6 + Tailwind v4
- **guizang submodule read-only** — 不改 `vendor/guizang-ppt-skill/`, 视觉系统 fork 在 `src/styles/global.css`
- **不静默 defer** — 走 `process.md §C.2` 零容忍, 任何"下次再做"必须当场完成或 AskUserQuestion
