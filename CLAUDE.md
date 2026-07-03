# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 请参考

请先阅读 `~/.claude/CLAUDE.md` 获得通用知识 (OMC / persona / 跨项目铁律)。

## Project Overview

content2html = 内容 (arxiv paper / 本地 progress) → 4 个 HTML 产物 (paper-slide / paper-summary / progress-slide / progress-report).

视觉系统 fork [op7418/guizang-ppt-skill](https://github.com/op7418/guizang-ppt-skill) v1.1.0 (Style B 瑞士国际主义).

独立 Astro project, 部署到 GitHub Pages (`mykcs.github.io/content2html/`).

## ⚠️ 项目区分

| 项目 | URL | 功能 | 状态 |
|------|-----|------|------|
| **content2html (本仓)** | mykcs.github.io/content2html/ | 内容→HTML 4 产物 | **活跃维护** |
| 主站 (mykcs.github.io) | mykcs.github.io/ | 王锐个人主页 | 活跃 (本仓不依赖) |
| content2html vs 主站 | 完全独立 Astro project, 不复用 build-pipeline / image-map / data-im (per ADR-0002) |

## 技术栈

- **Framework**: Astro v6.x + `@tailwindcss/vite` (Tailwind v4, migrated from `@astrojs/tailwind`)
- **i18n**: defaultLocale='zh' (跟主站相反), prefixDefaultLocale: true (zh 不加前缀走 `/`, en 加 `/en/` 前缀)
- **Skill trigger**: `/content2html` 或 `/c2h` (单一 trigger, 智能检测内容类型, per ADR-0005)
- **Visual fork**: guizang Style B (IKB 蓝 / 柠檬黄 / 柠檬绿 / 安全橙, per ADR-0004)

## 4 个产物

| 产物 | 用途 | 形态 |
|------|------|------|
| `paper-slide.html` | 学术组会 paper-reading 演讲 | 横向翻页 slide |
| `paper-summary.html` | 异步阅读 paper 摘要 | 单栏 long-form |
| `progress-slide.html` | 周报/工作进展演讲 | 横向翻页 slide |
| `progress-report.html` | 周报 long-form 归档 | 单栏 long-form |

## Common Commands

```bash
# Local dev
npm run dev

# Build (4 产物都生成)
npm run build

# Deploy via GitHub Actions (push to main auto-deploy)
git push origin main
```

## Architecture

- **4 产物独立页面**: `src/pages/[mode]/[lang]/index.astro` (mode = paper/progress, lang = zh/en)
- **共享 design tokens**: `src/styles/tokens.css` (IKB 蓝 + 柠檬黄 + 柠檬绿 + 安全橙)
- **Skill 模块**: `SKILL.md` 在仓根 (单 trigger `/content2html` 智能调度)

## Key Files

- `SKILL.md` — content2html skill 主入口 (frontmatter + trigger + 4 产物 SOP)
- `astro.config.mjs` — Astro 配置 (独立 project, 不复用主站 build-pipeline)
- `README.md` — 项目说明 + 4 ADR 指针
- `references/` — 4 产物的详细 SOP (mode-progress / mode-paper / shared-tokens / astro-injection)
- `docs/` — 设计文档 (paper-slide-template v3.3)
- `.claude/docs/adr/` — 5 份 ADR (0002 architecture / 0003 i18n / 0004 visual fork / 0005 dispatch + 0001 早期)

## 设计决策 (ADR)

| ADR | 决策 |
|-----|------|
| [0002-architecture](.claude/docs/adr/0002-content2html-architecture.md) | 独立 Astro project + 强解耦主站 |
| [0003-i18n](.claude/docs/adr/0003-content2html-i18n.md) | 双语支持 + 默认中文 |
| [0004-visual-fork](.claude/docs/adr/0004-content2html-visual-fork.md) | 4 产物统一 fork guizang Style B |
| [0005-dispatch](.claude/docs/adr/0005-content2html-dispatch.md) | 单一 trigger `/content2html` + 智能检测 |

设计历史 + 4 轮反转 + 提问技巧: `~/.claude/knowledge/cases/wiki/CASE-SKILL-CONTENT2HTML-DESIGN-20260617.md`

## GitHub Pages Deployment

GitHub Actions auto-deploy on push to main. Available at `https://mykcs.github.io/content2html/`.

Workflow: `.github/workflows/deploy.yml` (跟主站一样的 astro-build 模式).

## CI 4 站 CI 全绿硬规则 (CLAUDE.local.md §15)

任何 website-improve / sync-skill 触发 → 4 站 (mykcs.github.io / GDKVM / OSA / content2html) CI 必须全 `conclusion: success` 才算 done. 缺任一站 → BLOCKED.

## Skill Workflow — 改本仓触发模式

修改 `SKILL.md` frontmatter 或 trigger 段:

1. 跑 4 源三角验证 (per rich-audit §F.2.0 v2.6.36): `~/.agents/skills/host-self-evolve/SKILL.md`
2. bump version + 加 changelog (skill-as-code 协议)
3. smart-push 直 push main (单文件 micro edit)
4. 5 commands verification (git log/status/remote + gh run list CI green)

## Bilingual Content — 中英文同步

修改中文产物 → 同步检查英文产物, 反之亦然. 触发场景:

- 改 `src/content/zh/*` → 立即检查 `src/content/en/*` 对应条目
- 改 `src/styles/tokens.css` 配色注释 → 双语 string 同时更新

## 修改前必做

- `cd ~/Repo/webs/active/content2html && git remote -v` 三次确认 owner = `mykcs/content2html` (双账号铁律, 严禁 push 到 wangrui2025)
- shell 脚本完成或修改后 `shellcheck` 必跑
- 视觉修改完成后提示硬刷新 (Cmd+Shift+R / Ctrl+Shift+R)

## 已知限制 (不可修复)

**i18n `redirectToDefaultLocale: true` 警告**: Astro 自动生成根路由 `/` 的 redirect, 而 `src/pages/[lang]/index.astro` 的存在会与该自动路由冲突. Astro 要求 index.astro 必须存在, 否则 build 报错 `MissingIndexForInternationalizationError`. 此为 Astro by-design 行为, warning 无害.