# content2html

> **内容 (arxiv paper / 本地 progress) → HTML (slide + long-form)**
> 视觉系统 fork [op7418/guizang-ppt-skill](https://github.com/op7418/guizang-ppt-skill) v1.1.0 (Style B 瑞士国际主义)

独立 Astro project，部署到 GitHub Pages（`mykcs.github.io/content2html/`）。

## 4 个产物

| 产物 | 用途 | 形态 |
|------|------|------|
| `paper-slide.html` | 学术组会 paper-reading 演讲 | 横向翻页 slide |
| `paper-summary.html` | 异步阅读 paper 摘要 | 单栏 long-form |
| `progress-slide.html` | 周报/工作进展演讲 | 横向翻页 slide |
| `progress-report.html` | 周报 long-form 归档 | 单栏 long-form |

## 设计决策 (ADR)

| ADR | 决策 |
|-----|------|
| [0002-architecture](../.claude/docs/adr/0002-content2html-architecture.md) | 独立 Astro project + 强解耦主站 |
| [0003-i18n](../.claude/docs/adr/0003-content2html-i18n.md) | 双语支持 + 默认中文 |
| [0004-visual-fork](../.claude/docs/adr/0004-content2html-visual-fork.md) | 4 产物统一 fork guizang Style B |
| [0005-dispatch](../.claude/docs/adr/0005-content2html-dispatch.md) | 单一 trigger `/content2html` + 智能检测 |

设计历史 + 4 轮反转 + 提问技巧: [`~/.claude/knowledge/cases/wiki/CASE-SKILL-CONTENT2HTML-DESIGN-20260617.md`](../.claude/knowledge/cases/wiki/CASE-SKILL-CONTENT2HTML-DESIGN-20260617.md)

## Skill Trigger

```
/content2html <input>    # 主 trigger, LLM 智能检测 input 类型
/c2h <input>             # 短别名
```

支持 input: arxiv URL / DOI / PDF / 本地 path

## 本地开发

```bash
npm install
npm run dev          # http://127.0.0.1:4321
npm run build        # static build → dist/
```
