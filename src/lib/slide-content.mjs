// src/lib/slide-content.mjs
// 论文正文 → 演示 block 的无损投影、行内数学标记、演示版式估算与分页
//
// 为什么是这个文件 (2026-11-27):
//   旧实现用 `body.match(/^\d+\.\s+[^\n]+/gm)` 只取编号行, 非编号正文整段丢弃 ——
//   纯散文型 section 会产出空 slide (2606.18246 的 Q1/Q3/Q4 整页只有标题),
//   而且 2603.12109 的 Q4.1/Q4.2/Q5/Q6/Q7 因为手写下标错位, 显示的是别的章节。
//   本模块改成三件事:
//     1. projectPaperBody: 每一行非空源码行都落到且只落到一个 block (无损)
//     2. markMath: 把正文里的数学 token 包成 $...$, 交给 KaTeX auto-render
//     3. 版式模型 + splitBlocksForSlides: 估算每张 slide 的正文高度, 装不下就分页
//
// block 四种形态 (与 CommonMark 结构一致):
//   - heading:   编号大纲标题 ("1. 核心现象：信息自锁定（SeL）")
//   - item:      markdown 列表项 ("- 动作选择（AS）失效：…")
//   - formula:   独立数学行 ("∇_ω L̃_aug(ω) ∝ E_τ […]")
//   - paragraph: 散文 (章节领起句或大纲项的续写说明)

/**
 * @typedef {'heading' | 'item' | 'formula' | 'paragraph'} SlideBlockKind
 * @typedef {{ kind: SlideBlockKind, text: string }} SlideBlock
 * @typedef {SlideBlock[]} SlideBlockChunk
 * @typedef {SlideBlock[][]} SlideBlockChunks
 */

// 编号标题: "1. xxx" / "12. xxx"
const NUMBERED_HEADING = /^(\d+)\.\s+\S/;
// markdown 列表项: "- xxx" / "* xxx" / "+ xxx" (marker 后必须有空白, 避免误吃 "+1：…")
const BULLET_ITEM = /^[-*+]\s+(\S.*)$/;
// 强数学标记: 希腊字母/箭头单独出现通常是散文, 不作为公式判据
const MATH_MARKER = /[∈∇∝⪯←∑∫∂]/;
// CJK 开头 => 散文
const CJK_LEAD = /^[一-鿿]/;
const FORMULA_MAX_CHARS = 160;

function isFormulaLine(line) {
  if (line.length > FORMULA_MAX_CHARS) return false;
  if (CJK_LEAD.test(line)) return false;
  return MATH_MARKER.test(line);
}

/**
 * 主入口: 论文正文 → 有序 block 列表 (无损)
 *
 * 规则:
 *   - 空行 = 段落边界
 *   - "- xxx" → item
 *   - "1. xxx" → heading
 *   - 短行且含强数学标记且非 CJK 开头 → formula
 *   - 其余行按段落合并 (软换行 → 空格)
 *
 * @param {string} body
 * @returns {SlideBlock[]}
 */
export function projectPaperBody(body) {
  /** @type {SlideBlock[]} */
  const blocks = [];
  /** @type {string[]} */
  let paragraph = [];

  const flush = () => {
    if (!paragraph.length) return;
    blocks.push({ kind: 'paragraph', text: paragraph.join(' ') });
    paragraph = [];
  };

  for (const raw of body.split('\n')) {
    const line = raw.trim();
    if (!line) {
      flush();
      continue;
    }
    const bullet = BULLET_ITEM.exec(line);
    if (bullet) {
      flush();
      blocks.push({ kind: 'item', text: bullet[1].trim() });
      continue;
    }
    if (NUMBERED_HEADING.test(line)) {
      flush();
      blocks.push({ kind: 'heading', text: line });
      continue;
    }
    if (isFormulaLine(line)) {
      flush();
      blocks.push({ kind: 'formula', text: line });
      continue;
    }
    paragraph.push(line);
  }
  flush();
  return blocks;
}

// ---------------------------------------------------------------------------
// 行内数学标记
// ---------------------------------------------------------------------------

// 长模式在前, 避免 `z_t` 抢先匹配 `z_t^Q`
const TOKEN_RE =
  /z_t\^[A-Z]|z_t\b|A_t|Ã_t|P_τ|N_τ|I_th|C_BT|Acc_Q|u_t|Ψ_t|Ψ(?!t)|ω|τ|π_ω|L̃/g;

const MATH_MAP = {
  'z_t^Q': '$z_t^Q$',
  'z_t^U': '$z_t^U$',
  z_t: '$z_t$',
  A_t: '$A_t$',
  u_t: '$u_t$',
  'Ã_t': '$\\tilde{A}_t$',
  'P_τ': '$P_\\tau$',
  'N_τ': '$N_\\tau$',
  I_th: '$I_{th}$',
  C_BT: '$C_{BT}$',
  Acc_Q: '$Acc_Q$',
  'Ψ_t': '$\\Psi_t$',
  'Ψ': '$\\Psi$',
  'ω': '$\\omega$',
  'τ': '$\\tau$',
  'π_ω': '$\\pi_\\omega$',
  'L̃': '$\\tilde{L}$',
};

// 已经是数学上下文 (紧邻 { } _ ^) 的 token 不单独标记:
// `{z_t}_{t=0}^{H−1}`、`Ψ_{t+1}` 单独包 $…$ 会破坏整体语义。
const MATH_CONTEXT = /[{_^{}]/;
// 已用 $…$ 包裹的区域不再二次标记 (幂等)
const DELIMITED = /(\$\$[\s\S]*?\$\$|\$[^$\n]*\$)/g;

/**
 * 把文本里的数学 token 包成 $...$ (KaTeX auto-render 负责渲染)
 *
 * @param {string} text
 * @returns {string}
 */
export function markMath(text) {
  return text
    .split(DELIMITED)
    .map((part) => {
      if (part.startsWith('$')) return part;
      return part.replace(TOKEN_RE, (match, offset, whole) => {
        const before = offset > 0 ? whole[offset - 1] : '';
        const after = whole[offset + match.length] ?? '';
        if (MATH_CONTEXT.test(before) || MATH_CONTEXT.test(after)) return match;
        return MATH_MAP[match] ?? match;
      });
    })
    .join('');
}

// ---------------------------------------------------------------------------
// 演示版式模型
// ---------------------------------------------------------------------------

/**
 * 演示画布与正文区域的确定性尺寸/字号模型。
 * 数值全部来自 src/styles/tokens.css + src/styles/global.css, 改 token 时同步这里。
 */
export const SLIDE_METRICS = {
  canvasWidth: 1920,
  canvasHeight: 1080,
  paddingBlock: 80,
  paddingInline: 100,
  /** 正文可用高度 = 1080 − 80×2 */
  contentHeight: 920,
  /** 正文可用宽度 = 1920 − 100×2 */
  contentWidth: 1720,
  /** 正文测量宽度 (--measure-slide-section) */
  measureWidth: 1720,
  /** 标题测量宽度 (--measure-slide-heading) */
  headingMeasure: 1024,
  /** 列表左缩进 (.slide-body-list padding-left) */
  listIndent: 24,
  /** 标题块与正文之间的间距 (.col-span-12 … gap-5) */
  wrapGap: 20,
  /** 正文块之间的间距 (.slide-body gap) */
  bodyGap: 6,
  /** 标题块高度: kicker 13px/1.5 + mb 12 + accent-bar 4 + mb 24 */
  headerFixed: 19.5 + 12 + 4 + 24,
  /** 公式卡 + “公式” 标签的高度 */
  formulaCardHeight: 19.5 + 16 + (19.2 * 2 + 18.75 + 43.2 + 17.25 + 6.4),
  /** 各 block 的字号/行距 */
  fonts: {
    heading: { size: 24, line: 1.35 },
    paragraph: { size: 18, line: 1.5 },
    item: { size: 18, line: 1.5 },
    formula: { size: 17.6, line: 1.4 },
  },
  h2: { size: 56, line: 1.15 },
  /** 正文留 8% 余量, 避免估算误差贴着画布边缘 */
  safety: 0.08,
};

/** 文本宽度: CJK = 1em, 拉丁/数字 = 0.5em (对 Times/Helvetica 偏保守) */
function widthUnits(text) {
  let units = 0;
  for (const char of text) units += /[⺀-鿿＀-￯]/.test(char) ? 1 : 0.5;
  return units;
}

/**
 * 估算一段文字占几行
 * @param {string} text
 * @param {{size: number, line: number}} font
 * @param {number} availableWidth
 */
export function estimateLineCount(text, font, availableWidth) {
  const units = widthUnits(text);
  if (units === 0) return 0;
  const capacity = availableWidth / font.size;
  return Math.max(1, Math.ceil(units / capacity));
}

/**
 * 估算一个 block 的高度 (px)
 *
 * 用渲染后的文本计算 (正文里的数学 token 会被包成 $...$), 因为 KaTeX 行盒更高。
 * markMath 是幂等的, 已经标记过的文本再标记一次结果不变。
 *
 * @param {SlideBlock} block
 * @param {number} width
 */
export function estimateBlockHeight(block, width = SLIDE_METRICS.measureWidth) {
  const font = SLIDE_METRICS.fonts[block.kind] ?? SLIDE_METRICS.fonts.paragraph;
  const available = block.kind === 'item' ? width - SLIDE_METRICS.listIndent : width;
  const rendered = block.kind === 'formula' ? block.text : markMath(block.text);
  const lines = estimateLineCount(rendered, font, available);
  // KaTeX 行盒比普通行高
  const mathFactor = rendered.includes('$') ? 1.25 : 1;
  let height = lines * font.size * font.line * mathFactor;
  if (block.kind === 'heading') height += 4.8;  // margin-top
  if (block.kind === 'item') height += 4.8;    // margin top/bottom
  return height;
}

/**
 * 估算一组 block 的总高度 (含 block 间距)
 * @param {SlideBlock[]} blocks
 * @param {number} width
 */
export function estimateBlocksHeight(blocks, width = SLIDE_METRICS.measureWidth) {
  if (!blocks.length) return 0;
  const sum = blocks.reduce((total, block) => total + estimateBlockHeight(block, width), 0);
  return sum + Math.max(0, blocks.length - 1) * SLIDE_METRICS.bodyGap;
}

/**
 * 估算标题块 (kicker + rule + h2) 的高度
 * @param {string} heading
 */
export function estimateHeaderHeight(heading) {
  const lines = estimateLineCount(heading, SLIDE_METRICS.h2, SLIDE_METRICS.headingMeasure);
  return SLIDE_METRICS.headerFixed + lines * SLIDE_METRICS.h2.size * SLIDE_METRICS.h2.line;
}

/**
 * 一节正文在一张 slide 上的可用高度
 * @param {{heading: string, hasFormula: boolean}} options
 */
export function availableBodyHeight({ heading, hasFormula }) {
  const used = estimateHeaderHeight(heading) + SLIDE_METRICS.wrapGap;
  const card = hasFormula ? SLIDE_METRICS.formulaCardHeight : 0;
  const free = SLIDE_METRICS.contentHeight - used - card;
  return Math.floor(free * (1 - SLIDE_METRICS.safety));
}

/**
 * 把一节的 block 切成若干张 slide 的正文。
 * 规则:
 *   - 累积到超出预算就开新的一页
 *   - 标题 block 不留在上一页末尾 (跟它的列表项一起走)
 *   - 单个 block 本身超预算时独占一页 (由构建期断言报错)
 *
 * @param {SlideBlock[]} blocks
 * @param {{budget: number, width?: number}} options
 * @returns {SlideBlock[][]}
 */
export function splitBlocksForSlides(blocks, { budget, width = SLIDE_METRICS.measureWidth }) {
  if (!blocks.length) return [[]];
  /** @type {SlideBlock[][]} */
  const slides = [];
  let current = [];
  let height = 0;

  const push = () => {
    if (current.length) slides.push(current);
    current = [];
    height = 0;
  };

  for (const block of blocks) {
    const blockHeight = estimateBlockHeight(block, width);
    const wouldBe = height + (current.length ? SLIDE_METRICS.bodyGap : 0) + blockHeight;
    if (current.length && wouldBe > budget) {
      // 标题不留在本页末尾: 留给下一页跟它的列表项一起
      if (current[current.length - 1].kind === 'heading') {
        const orphan = current.pop();
        push();
        current.push(orphan);
        height = estimateBlockHeight(orphan, width);
      } else {
        push();
      }
    }
    const next = height + (current.length ? SLIDE_METRICS.bodyGap : 0) + blockHeight;
    current.push(block);
    height = next;
  }
  push();
  return slides;
}

/**
 * 把一节正文切成若干页 slide 的正文, 并在构建期断言每页都装得下画布。
 *
 * @param {{heading: string, body: string, hasFormula: boolean}} options
 * @returns {{blocks: SlideBlock[], chunks: SlideBlock[][], budget: number}}
 */
export function splitSectionBlocks({ heading, body, hasFormula }) {
  const blocks = projectPaperBody(body);
  const budget = availableBodyHeight({ heading, hasFormula });
  const chunks = splitBlocksForSlides(blocks, { budget });
  for (const chunk of chunks) {
    const height = estimateBlocksHeight(chunk);
    if (height > budget) {
      throw new Error(
        `Slide body exceeds the canvas budget (${Math.round(height)}px > ${budget}px) for section「${heading}」. ` +
          `Shorten the source body or give the section its own slide.`
      );
    }
  }
  return { blocks, chunks, budget };
}
