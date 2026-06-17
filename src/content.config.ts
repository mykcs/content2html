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
    // Preserve arxiv-style id with dots (e.g. "2606.18246") — github-slugger strips dots by default
    generateId: ({ entry }) =>
      entry.replace(/\.json$/, '').replace(/^.*\//, ''),
  }),
  schema: z.object({
    id: z.string(),
    type: z.literal('paper'),
    arxiv_id: z.string().optional(),
    title_zh: z.string(),
    title_en: z.string(),
    authors: z.array(z.string()),
    abstract_zh: z.string(),
    abstract_en: z.string(),
    sections_zh: z.array(
      z.object({ heading: z.string(), body: z.string() })
    ),
    sections_en: z.array(
      z.object({ heading: z.string(), body: z.string() })
    ),
    key_takeaways: z.array(z.string()),
  }),
});

const progress = defineCollection({
  loader: glob({
    pattern: '**/*.json',
    base: './src/content/progress',
    // Preserve date-style id (e.g. "2026-06-17")
    generateId: ({ entry }) =>
      entry.replace(/\.json$/, '').replace(/^.*\//, ''),
  }),
  schema: z.object({
    id: z.string(), // YYYY-MM-DD format
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
