# Astro Integration (content collection + page route + build)

> 4 产物如何写入 Astro project, 走 build pipeline
> ADR-0002 强解耦: 不复用主站 build-pipeline / image-map / data-im

## Content Collection 布局

```
src/content/
├── papers/
│   └── <arxiv-id>/
│       ├── outline.json        # 必需: 结构化 outline (zh + en)
│       ├── slide.html          # 产物 1: paper-slide.html
│       ├── summary.html        # 产物 2: paper-summary.html
│       └── figures/            # 产物附图 (可选)
│           ├── page03-fig1.png
│           └── page07-fig2.png
└── progress/
    └── <date>/                  # 例: 2026-06-17 (周报日期)
        ├── outline.json
        ├── slide.html
        ├── report.html
        └── figures/             # 可选
```

**outline.json Schema** 见 `references/mode-paper.md` / `references/mode-progress.md`。

## Page Route 矩阵

```
src/pages/[lang]/
├── index.astro                  # 根导航页 (4 产物索引)
├── paper/
│   └── [id]/
│       ├── slide.astro          # 渲染 paper-slide.html
│       └── summary.astro        # 渲染 paper-summary.html
└── progress/
    └── [date]/
        ├── slide.astro          # 渲染 progress-slide.html
        └── report.astro         # 渲染 progress-report.html
```

**4 URL 形态** (按 i18n 路由):

| i18n | paper-slide URL | progress-report URL |
|------|----------------|---------------------|
| zh (默认) | `/zh/paper/<id>/slide` | `/zh/progress/<date>/report` |
| en | `/en/paper/<id>/slide` | `/en/progress/<date>/report` |

## Page Generation 模式

```astro
---
// src/pages/[lang]/paper/[id]/slide.astro
import BaseLayout from "../../../../layouts/BaseLayout.astro";
import { getCollection, getEntry } from "astro:content";

const { lang, id } = Astro.params;
const entry = await getEntry("papers", id);

if (!entry) {
  throw new Error(`Paper not found: ${id}`);
}

const outline = entry.data.outline[lang as "zh" | "en"] ?? entry.data.outline.zh;
const slideHtml = entry.data.slide;  // 产物 1 的 HTML 字符串
---
<BaseLayout
  title={outline.title}
  description={outline.abstract}
  lang={lang as "zh" | "en"}
  productType="slide"
>
  <Fragment set:html={slideHtml} />
</BaseLayout>
```

**核心模式**: `outline.json` 存结构化数据, 产物 HTML 存 raw string, page 用 `set:html` 注入。

## Build Pipeline

```bash
# 1. type check
npx astro check

# 2. build
npm run build

# 输出: dist/
#   ├── zh/paper/2503.12345/slide/index.html
#   ├── zh/paper/2503.12345/summary/index.html
#   ├── en/paper/2503.12345/slide/index.html
#   ├── zh/progress/2026-06-17/slide/index.html
#   ├── zh/progress/2026-06-17/report/index.html
#   └── ...

# 3. 部署 (按 .github/workflows/deploy.yml)
# GitHub Pages → https://mykcs.github.io/content2html/
```

## i18n 配置 (astro.config.mjs)

```javascript
i18n: {
  defaultLocale: 'zh',          // 默认中文
  locales: ['zh', 'en'],
  routing: {
    prefixDefaultLocale: true,  // /zh/... 显式前缀 (主站是 false)
  },
}
```

**vs 主站差异**:
- 主站 (mykcs.github.io) `defaultLocale: 'en'` + `prefixDefaultLocale: false` → `/` 是英文
- 本 skill `defaultLocale: 'zh'` + `prefixDefaultLocale: true` → `/zh/` 是中文 (默认走 `/zh/...`)

## Content Collection Schema (Astro v6 loader API)

```typescript
// src/content/config.ts
import { defineCollection, z } from "astro:content";

const papers = defineCollection({
  loader: glob({ pattern: "*/outline.json", base: "./src/content/papers" }),
  schema: z.object({
    id: z.string(),  // arxiv id
    lang: z.enum(["zh", "en"]),
    title: z.string(),
    authors: z.array(z.string()),
    abstract: z.string(),
    arxiv_id: z.string(),
    doi: z.string().optional(),
    categories: z.array(z.string()),
    sections: z.array(z.object({
      heading: z.string(),
      heading_zh: z.string().optional(),
      level: z.number(),
      paragraphs: z.array(z.string()),
      figures: z.array(z.string()).optional(),
    })),
    key_takeaways: z.array(z.string()),
    figures_index: z.array(z.object({
      id: z.string(),
      caption: z.string(),
      path: z.string(),
    })),
    slide: z.string(),   // raw HTML
    summary: z.string(), // raw HTML
  }),
});

const progress = defineCollection({
  loader: glob({ pattern: "*/outline.json", base: "./src/content/progress" }),
  schema: z.object({
    id: z.string(),  // YYYY-MM-DD
    lang: z.enum(["zh", "en"]),
    project_name: z.string(),
    period: z.string(),
    summary: z.string(),
    done: z.array(z.object({
      category: z.string(),
      title: z.string(),
      detail: z.string(),
      evidence: z.string().optional(),
    })),
    doing: z.array(z.object({
      title: z.string(),
      progress: z.string(),
      blocker: z.string().optional(),
    })),
    next: z.array(z.string()),
    metrics: z.object({
      commits: z.number(),
      lines_added: z.number(),
      lines_removed: z.number(),
      files_changed: z.number(),
    }),
    highlights: z.array(z.string()),
    slide: z.string(),
    report: z.string(),
  }),
});

export const collections = { papers, progress };
```

## ⚠️ Loader 规则 (跟主站一致)

**单文件=单 entry 用 `glob()`, 不用 `file()`** — `file()` 会把 JSON 顶级键拆成多个 entry。

本 skill 每个 paper 1 个目录 (内含 `outline.json` + `slide.html` + `summary.html` + `figures/`), 走 `glob({ pattern: "*/outline.json" })` 是正确选择。

## ⚠️ 强解耦 (ADR-0002 铁律)

| 行为 | 禁用 (主站融合) | 启用 (本 skill) |
|------|----------------|----------------|
| 复用主站 build-pipeline integration | ❌ | ✅ (本 skill 0 integration) |
| 复用主站 image-map.json | ❌ | ✅ (figures 直接 `public/figures/`) |
| 复用主站 data-im 占位符 | ❌ | ✅ (无占位符) |
| 复用主站 `src/pages/slides/` | ❌ | ✅ (本 skill 独立 `src/pages/`) |
| 复用主站 GitHub Actions deploy | ❌ | ✅ (本 skill 独立 `mykcs.github.io/content2html.yml`) |

**核心理由**: 主站 1 年 50+ paper slides 累加会变胖, 独立仓库 archive 干净 + 强解耦 (主站升级不影响本 skill)。

## Build 验证 (9 项回归)

按 `process.md §C.4` 跑 9 项回归脚本, 确保 build 干净:

```bash
cd /Users/myk/Repo/mykcs/content2html
ls -d dist/ && \
  npx astro check && \
  grep -r "astro-route-announcer" dist/ && \
  grep -r "application/ld+json" dist/ && \
  grep -r "navigator.serviceWorker.register" dist/ || true; \
  grep -r "@fontsource" dist/ || grep -r "--color-" dist/; \
  grep -r 'class="[^"]*bg-[^"]*"' dist/ | head -5; \
  test -z "$(grep -r 'is:inline' dist/ | grep -v 'third-party')" && echo "OK" || echo "WARN"; \
  grep -r "og:image" dist/
```

## 关联

- `astro.config.mjs` — i18n + base path 配置
- `src/styles/global.css` — Tailwind v4 @theme 块
- `src/layouts/BaseLayout.astro` — 4 产物共用 layout
- `SKILL.md` step 6-7 (写入 + build)
