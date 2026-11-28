// src/lib/paper-slide-template.ts
// Paper Slide 模板 v4.0 (2026-11-27) — 公式卡相关的模板契约
//
// 设计目标:
//   1. 适用任何 paper: 2603.12109, 2606.18246, 未来 arxiv paper
//   2. section ↔ formula 解耦: key_formulas 通过 section_index 引用 sections
//
// deck 计划与它的构建期校验在 src/lib/deck-plan.mjs (可单测的 .mjs 库)。
//
// JSON shape 例子 (2603.12109 paper):
//   "key_formulas": [
//     {
//       "section_index": 2,  // 对应 sections_zh[2] = Q3.1
//       "label": { "zh": "AS 批评信号", "en": "AS critique signal" },
//       "formula": { "zh": "z_t^Q \\in \\{-1, 0, +1\\}", "en": "z_t^Q \\in \\{-1, 0, +1\\}" },
//       "context": { "zh": "查询是否获取信息性反馈", "en": "Whether query elicits informative feedback" }
//     },
//     ...
//   ]

export interface KeyFormula {
  section_index: number;
  label: { zh: string; en: string };
  formula: { zh: string; en: string };  // LaTeX 源码, KaTeX 渲染
  context?: { zh?: string; en?: string };
}

/**
 * 提取某 section 的 key_formulas
 */
export function getKeyFormulasForSection(
  keyFormulas: KeyFormula[] | undefined,
  sectionIndex: number
): KeyFormula[] {
  if (!keyFormulas) return [];
  return keyFormulas.filter((f) => f.section_index === sectionIndex);
}

/**
 * 取公式的本地化文本 (lang 字段, fallback 对方言)
 */
export function pickLocalized<T extends Record<string, string | undefined>>(
  obj: T,
  lang: "zh" | "en"
): string {
  return obj[lang] ?? obj.zh ?? obj.en ?? "";
}
