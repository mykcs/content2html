// src/lib/paper-slide-template.ts
// Paper Slide 模板 v3.0 (2026-06-22) — 通用 paper slide 渲染模板
//
// 设计目标:
//   1. 适用任何 paper: 2603.12109, 2606.18246, 未来 arxiv paper
//   2. section ↔ formula 解耦: key_formulas 通过 section_index 引用 sections
//   3. 渐进增强: 没有 key_formulas 时降级回 extractPaperBullets (旧行为)
//
// 渲染流程:
//   paper.sections_zh[i] → <PaperSlideSection sectionIndex={i} keyFormulas={...}>
//     ↓ 内部渲染
//   kicker + h2 + (可选) formula 卡片 + 简述
//
// JSON shape 例子 (2603.12109 paper):
//   "key_formulas": [
//     {
//       "section_index": 2,  // 对应 sections_zh[2] = Q3
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

/**
 * 包装 LaTeX 公式 (KaTeX inline): $$...$$
 * 用户传的公式源码不应带 $ 包装, 这里统一加
 */
export function wrapFormulaForKatex(latex: string, displayMode: boolean = false): string {
  return displayMode ? `$$${latex}$$` : `$$${latex}$$`;
}
