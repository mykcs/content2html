// scripts/estimate-slide-fit.mjs
// 对构建产物做版式估算: 每张 slide 的正文是否装得进 1920×1080 固定画布。
//
// 为什么需要它: .slide-page 是 overflow:hidden 的固定画布, 正文超出就会被裁切,
// 浏览器门禁 (scripts/verify-site-standards.mjs) 会以 "text clipped by a rendered
// ancestor" 失败。本脚本用与构建期相同的模型 (src/lib/slide-content.mjs) 复核产物,
// 无需浏览器即可发现风险; 浏览器门禁仍是最终裁切判定。
//
// 用法: node scripts/estimate-slide-fit.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SLIDE_METRICS,
  availableBodyHeight,
  estimateBlocksHeight,
  estimateHeaderHeight,
} from '../src/lib/slide-content.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const dist = path.join(root, 'dist');

const decode = (text) =>
  text.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
const stripTags = (text) => decode(text.replace(/<[^>]*>/g, ''));

const decks = [
  'zh/paper/2603.12109/slide', 'en/paper/2603.12109/slide',
  'zh/paper/2606.18246/slide', 'en/paper/2606.18246/slide',
  'zh/progress/2026-06-17/slide', 'en/progress/2026-06-17/slide',
];

let failures = 0;
for (const deck of decks) {
  const html = fs.readFileSync(path.join(dist, deck, 'index.html'), 'utf8');
  const slides = [...html.matchAll(/<section class="slide-page[^"]*"[\s\S]*?<\/section>/g)].map((m) => m[0]);
  console.log(`\n=== ${deck} (${slides.length} slides) ===`);
  slides.forEach((slide, index) => {
    const bodyMatch = /<div class="slide-body[^"]*">([\s\S]*?)<\/div>\s*(?:<\/div>|<section)/.exec(slide);
    let bodyHeight = 0;
    let blocks = 0;
    if (bodyMatch) {
      const inner = bodyMatch[1];
      const pieces = [...inner.matchAll(
        /<p class="slide-body-block slide-body-(\w+)[^"]*">([\s\S]*?)<\/p>|<li class="slide-body-item">([\s\S]*?)<\/li>/g
      )];
      const kinds = [];
      for (const piece of pieces) {
        const kind = piece[1] ?? 'item';
        const text = stripTags(piece[2] ?? piece[3] ?? '');
        if (!text.trim()) continue;
        blocks++;
        kinds.push(kind);
        bodyHeight += 0; // 由下面的 estimateBlocksHeight 统一计算
      }
      const estimate = estimateBlocksHeight(
        kinds.map((kind, position) => ({
          kind,
          text: stripTags(
            pieces[position][2] ?? pieces[position][3] ?? ''
          ),
        }))
      );
      bodyHeight = estimate;
    }
    const h2Text = stripTags(/<h2[^>]*>([\s\S]*?)<\/h2>/.exec(slide)?.[1] ?? '');
    const headerHeight = estimateHeaderHeight(h2Text);
    const hasFormulaCard = slide.includes('formula-card--prominent');
    const used = headerHeight + (hasFormulaCard ? SLIDE_METRICS.formulaCardHeight : 0) + SLIDE_METRICS.wrapGap + bodyHeight;
    const budget = availableBodyHeight({ heading: h2Text, hasFormula: hasFormulaCard });
    const slack = budget - bodyHeight;
    const ok = slack >= 0;
    if (!ok) failures++;
    console.log(
      `  slide ${String(index + 1).padStart(2)}  body=${String(Math.round(bodyHeight)).padStart(4)}px  budget=${budget}px  slack=${String(Math.round(slack)).padStart(5)}px  blocks=${String(blocks).padStart(2)}` +
      (ok ? '' : '   <-- OVERFLOW')
    );
  });
}
console.log(`\n${failures ? `FAIL: ${failures} slide(s) exceed the canvas budget` : 'PASS: every slide fits the 1920x1080 canvas budget'}`);
console.log('(静态估算; 最终裁切判定由浏览器门禁 scripts/verify-site-standards.mjs 复核)');
process.exit(failures ? 1 : 0);
