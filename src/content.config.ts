// src/content.config.ts - content2html content collections
// 按 PLAN-CONTENT2HTML-PROGRESS-MODE-20260617 §Step 1
// 2 collections: papers + progress
// Loader: glob (Astro v6 standard, JSON files in src/content/<collection>/)
// Schema: zod (Astro v6 standard, type safety + IDE autocomplete)
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const papers = defineCollection({
  loader: glob({
    pattern: '**/*.json',
    base: './src/content/papers',
    // Preserve arxiv-style id with dots (e.g. "2606.18246") — github-slugger strips dots by default.
    // Keep subdir path: 'papers/v1/2606.18246.json' → 'papers/v1/2606.18246' (allows future nested IDs).
    generateId: ({ entry }) => entry.replace(/\.json$/, ''),
  }),
  schema: z.object({
    type: z.literal('paper'),
    arxiv_id: z.string().optional(),
    title_zh: z.string(),
    title_en: z.string(),
    title_full_en: z.string().optional(),
    authors: z.array(z.string()),
    authors_with_affil_en: z.array(z.object({ name: z.string(), affil: z.array(z.string()) })).optional(),
    affiliations_en: z.array(z.string()).optional(),
    abstract_zh: z.string(),
    abstract_en: z.string(),
    sections_zh: z.array(
      z.object({ heading: z.string(), body: z.string() })
    ),
    sections_en: z.array(
      z.object({ heading: z.string(), body: z.string() })
    ),
    key_takeaways: z.array(z.string()),
    // v3.0 (2026-06-22) 加: paper slide 模板 — 重要公式卡片
    // 关联到 sections_zh/en 的 section_index; 没有时降级回 extractPaperBullets
    // 详见 docs/paper-slide-template.md
    key_formulas: z.array(
      z.object({
        section_index: z.number().int().nonnegative(),
        label: z.object({ zh: z.string(), en: z.string() }),
        formula: z.object({ zh: z.string(), en: z.string() }),  // LaTeX 源码 (KaTeX 渲染)
        context: z.object({ zh: z.string().optional(), en: z.string().optional() }).optional(),
      })
    ).optional(),
    // Paper metadata (slide 1 右下角元信息块用)
    published_date: z.string().optional(),         // YYYY-MM-DD
    code_url: z.string().url().optional(),         // 公开代码仓库
    venue: z.string().optional(),                   // e.g. "ICML 2026" / "NeurIPS 2025"
    venue_rank: z.string().optional(),              // e.g. "Post" / "Highlight" / "Oral" / "Spotlight"
    venue_url: z.string().url().optional(),         // e.g. "https://icml.cc"
    category: z.string().optional(),                // arXiv primary category, e.g. "cs.AI"
    field_large_zh: z.string().optional(),
    field_large_en: z.string().optional(),
    field_medium_zh: z.string().optional(),
    field_medium_en: z.string().optional(),
    field_small_zh: z.string().optional(),
    field_small_en: z.string().optional(),
    technologies_zh: z.array(z.string()).optional(),
    technologies_en: z.array(z.string()).optional(),
  }),
});

const progress = defineCollection({
  loader: glob({
    pattern: '**/*.json',
    base: './src/content/progress',
    // Preserve date-style id (e.g. "2026-06-17"). Keep subdir path for future nested IDs.
    generateId: ({ entry }) => entry.replace(/\.json$/, ''),
  }),
  schema: z.object({
    type: z.literal('progress'),
    project_name: z.string(),
    period: z.string(),
    done: z.array(z.string()),
    doing: z.array(z.string()),
    next: z.array(
      // [[task, agent, deadline], ...]
      z.tuple([z.string(), z.string(), z.string()])
    ),
    metrics: z.record(z.string(), z.string()).optional(),
  }),
});

export const collections = { papers, progress };
