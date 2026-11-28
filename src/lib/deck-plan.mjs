// src/lib/deck-plan.mjs
// Deck 计划: 一张 section slide 声明它用哪一节 + 自称什么
//
// 2026-11-27 新增。修复前的真实故障:
//   2603.12109 的 Q4.1/Q4.2/Q5/Q6/Q7 五张 slide 手写 sections[3..7],
//   实际渲染的是 Q3.2/Q3.3/Q3.4/Q4.1/Q4.2 的内容, 且第 8-10 节从未出现;
//   2606.18246 的第 5 节「结论」也从未出现。
//   计划 + 构建期校验让这类错位变成构建失败, 而不是发布出去。

/**
 * @typedef {object} DeckSlide
 * @property {string} key      Q 编号, 例如 "Q3.1"
 * @property {string} label    短标签, 例如 "构建 AS 通道批评信号"
 * @property {number} section  引用 sections[lang] 的下标
 */

/**
 * @typedef {{ heading: string, body: string }} PaperSection
 */

/**
 * 从 section 标题取出它自己的 Q 编号 (主号)。
 * "Q3.1. 构建 AS 通道批评信号" → "3";  "1. 引言" → "1";  无编号 → null
 *
 * @param {string} heading
 * @returns {string | null}
 */
export function sectionQuestionKey(heading) {
  const q = /^Q(\d+)(?:\.\d+)?\.\s*/.exec(heading);
  if (q) return q[1];
  const numeric = /^(\d+)\.\s+/.exec(heading);
  if (numeric) return numeric[1];
  return null;
}

/**
 * 去掉 section 标题里的 Q 编号 / 数字前缀 (kicker 已经标了位置)
 *
 * @param {string} heading
 * @returns {string}
 */
export function cleanSectionHeading(heading) {
  return heading.replace(/^Q\d+(?:\.\d+)?\.\s*/, '').replace(/^\d+\.\s*/, '');
}

function majorOf(key) {
  return /^Q(\d+)/.exec(key)?.[1] ?? '';
}

/**
 * 校验 deck 计划与论文 section 是否一致。
 * 任何不一致都直接抛错 —— 让错误在构建期暴露, 而不是把错内容发布出去。
 *
 * 校验项:
 *   1. section 下标合法, 且每节最多被引用一次
 *   2. 论文的每一节都必须出现在计划里 (否则该节永远看不到)
 *   3. 计划顺序与 section 顺序一致 (deck 叙事顺序 = 论文顺序)
 *   4. slide 自称的 Q 主号必须与被引用 section 标题里的 Q 主号一致
 *      (这一条直接拦住 “标 Q4.1 却渲染 Q3.2” 这类错位)
 *   5. slide key 不重复
 *
 * @param {DeckSlide[]} plan
 * @param {PaperSection[]} sections
 */
export function assertDeckPlan(plan, sections) {
  const errors = [];
  const used = new Map();

  for (const slide of plan) {
    if (!Number.isInteger(slide.section) || slide.section < 0 || slide.section >= sections.length) {
      errors.push(`slide ${slide.key}: section ${slide.section} 越界 (共 ${sections.length} 节)`);
      continue;
    }
    const previous = used.get(slide.section);
    if (previous) {
      errors.push(`slide ${slide.key}: section ${slide.section} 已被 slide ${previous} 使用`);
    } else {
      used.set(slide.section, slide.key);
    }
    const heading = sections[slide.section].heading;
    const headingKey = sectionQuestionKey(heading);
    const major = majorOf(slide.key);
    if (headingKey && headingKey !== major) {
      errors.push(`slide ${slide.key}: 引用 section ${slide.section}「${heading}」属于 Q${headingKey}`);
    }
    if (!major) errors.push(`slide ${slide.key}: key 缺少 Q 主号`);
  }

  for (let index = 0; index < sections.length; index++) {
    if (!used.has(index)) errors.push(`section ${index}「${sections[index].heading}」从未出现在 deck 里`);
  }

  for (let index = 1; index < plan.length; index++) {
    if (plan[index].section <= plan[index - 1].section) {
      errors.push(`deck 顺序错乱: ${plan[index - 1].key}(${plan[index - 1].section}) 之后是 ${plan[index].key}(${plan[index].section})`);
    }
  }

  const keys = plan.map((slide) => slide.key);
  for (const key of new Set(keys)) {
    if (keys.filter((other) => other === key).length > 1) errors.push(`重复的 slide key ${key}`);
  }

  if (errors.length) {
    throw new Error(`Deck 计划与论文内容不一致:\n - ${errors.join('\n - ')}`);
  }
}

/**
 * 按 key 取 deck 计划里的一张 slide 及其对应的 section。
 * 让页面模板不再手写下标 —— 计划是唯一事实来源。
 *
 * @param {DeckSlide[]} plan
 * @param {PaperSection[]} sections
 * @param {string} key
 */
export function resolveDeckSlide(plan, sections, key) {
  const slide = plan.find((entry) => entry.key === key);
  if (!slide) throw new Error(`Unknown deck key: ${key}`);
  return { slide, section: sections[slide.section], index: slide.section };
}

/**
 * slide 的标题行: "Q3.1 · 构建 AS 通道批评信号"
 *
 * @param {DeckSlide} slide
 * @returns {string}
 */
export function deckKicker(slide) {
  return `${slide.key} · ${slide.label}`;
}
