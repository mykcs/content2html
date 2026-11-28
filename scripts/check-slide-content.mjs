// scripts/check-slide-content.mjs
// 内容覆盖门禁: 论文的每一节正文都必须出现在对应的双语 deck 里。
//
// 2026-11-27 新增。修复前的真实故障 (用 scripts/probe-slide-content.mjs 复现):
//   - 2606.18246 的 Q1/Q3/Q4 三张 slide 正文覆盖率为 0% (整页只有标题)
//   - 2603.12109 的 Q4.1/Q4.2/Q5 显示的是 Q3.2/Q3.3/Q3.4 的内容, Q7 从未出现
// 本检查把这些变成构建失败, 而不是发布出去。
import fs from 'node:fs';
import path from 'node:path';
import { markMath, projectPaperBody } from '../src/lib/slide-content.mjs';

const decode = (text) =>
  text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');

const visibleText = (html) =>
  decode(
    html
      .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
      .replace(/<[^>]+>/g, ' ')
  )
    .replace(/\s+/g, ' ')
    .trim();

const normalize = (text) => text.replace(/[\s ]+/g, '');

/** 取出 deck 里每一张 slide 的可见文本 */
function slideTexts(html) {
  return [...html.matchAll(/<section class="slide-page[^"]*"[\s\S]*?<\/section>/g)].map((match) =>
    visibleText(match[0])
  );
}

/**
 * 校验一个 deck 覆盖了论文的全部正文
 * @param {{dist: string, paperId: string, lang: string, paper: any}} options
 * @returns {string[]} 错误列表
 */
export function checkSlideContent({ dist, paperId, lang, paper }) {
  const errors = [];
  const file = path.join(dist, lang, 'paper', paperId, 'slide', 'index.html');
  if (!fs.existsSync(file)) return [`missing deck ${lang}/paper/${paperId}/slide/`];
  const html = fs.readFileSync(file, 'utf8');
  const slides = slideTexts(html);
  const deckText = normalize(slides.join(' '));
  const sections = lang === 'zh' ? paper.sections_zh : paper.sections_en;

  sections.forEach((section, index) => {
    // deck 里的小标题去掉了 "Q3.1." / "1." 前缀 (kicker 已经标了位置)
    const heading = visibleText(section.heading).replace(/^Q\d+(?:\.\d+)?\.\s*/, '').replace(/^\d+\.\s*/, '');
    // 1) 这一节的标题必须出现在 deck 里
    if (!deckText.includes(normalize(heading))) {
      errors.push(`${lang}/${paperId}: section ${index} heading missing from deck: ${heading}`);
    }
    // 2) 这一节的每一行正文都必须出现在 deck 里 (按 block 粒度, 段落合并后匹配)
    for (const block of projectPaperBody(section.body)) {
      // 正文里的数学 token 在 deck 里被包成 $...$ (独立公式行保留原文)
      const source = block.kind === 'formula' ? block.text : markMath(block.text);
      const needle = normalize(source);
      if (needle.length < 8) continue; // 过短的行不单独断言
      if (!deckText.includes(needle)) {
        errors.push(`${lang}/${paperId}: section ${index} body text missing from deck: ${block.text.slice(0, 60)}`);
      }
    }
  });

  // 3) 核心贡献必须在 deck 里
  for (const takeaway of paper.key_takeaways) {
    if (!deckText.includes(normalize(visibleText(takeaway)))) {
      errors.push(`${lang}/${paperId}: key takeaway missing from deck: ${takeaway.slice(0, 60)}`);
    }
  }

  // 4) 不允许空 slide (有正文的 section 对应的 slide 至少要有内容)
  const empty = slides.filter((text) => text.replace(/\d+\s*\/\s*\d+/g, '').trim().length < 12).length;
  if (empty > 0) errors.push(`${lang}/${paperId}: ${empty} slide(s) render without content`);

  return errors;
}

/**
 * 校验全部论文 deck
 * @param {string} dist
 * @param {string} papersDir
 */
export function checkAllSlideContent(dist, papersDir) {
  const errors = [];
  for (const file of fs.readdirSync(papersDir).filter((name) => name.endsWith('.json'))) {
    const paper = JSON.parse(fs.readFileSync(path.join(papersDir, file), 'utf8'));
    const paperId = paper.arxiv_id ?? path.basename(file, '.json');
    for (const lang of ['zh', 'en']) {
      errors.push(...checkSlideContent({ dist, paperId, lang, paper }));
    }
  }
  return errors;
}
