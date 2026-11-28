import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  SLIDE_METRICS,
  availableBodyHeight,
  estimateBlocksHeight,
  markMath,
  projectPaperBody,
  splitBlocksForSlides,
  splitSectionBlocks,
} from '../src/lib/slide-content.mjs';

const papers = fs.readdirSync(path.join(process.cwd(), 'src/content/papers')).filter((name) => name.endsWith('.json'));
const load = (name) => JSON.parse(fs.readFileSync(path.join(process.cwd(), 'src/content/papers', name), 'utf8'));

test('the projection keeps every source line exactly once', () => {
  const body = [
    '第一段。',
    '',
    '1. 标题一',
    '说明一。',
    '- 列表项 A',
    '- 列表项 B',
    '',
    '第二段。',
  ].join('\n');
  const blocks = projectPaperBody(body);
  assert.deepEqual(blocks, [
    { kind: 'paragraph', text: '第一段。' },
    { kind: 'heading', text: '1. 标题一' },
    { kind: 'paragraph', text: '说明一。' },
    { kind: 'item', text: '列表项 A' },
    { kind: 'item', text: '列表项 B' },
    { kind: 'paragraph', text: '第二段。' },
  ]);
  // 段落合并后仍能还原每一行
  const restored = blocks.filter((block) => block.kind !== 'heading').map((block) => block.text).join(' ');
  for (const line of body.split('\n').filter((line) => line.trim() && !/^\d+\.\s/.test(line.trim()))) {
    assert.ok(restored.includes(line.trim().replace(/^[-*+]\s+/, '')), line);
  }
});

test('prose-only bodies still produce blocks (the old regex produced none)', () => {
  const blocks = projectPaperBody('我们在 200M、500M、1B、2B 稠密 decoder-only 模型上评估 > <former。');
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].kind, 'paragraph');
  assert.ok(blocks[0].text.includes('decoder-only'));
});

test('a bullet marker needs whitespace, so "+1" stays prose', () => {
  const blocks = projectPaperBody('- +1：查询获得了信息性反馈\n+1：不是列表项');
  assert.equal(blocks.length, 2);
  assert.equal(blocks[0].kind, 'item');
  assert.equal(blocks[0].text, '+1：查询获得了信息性反馈');
  assert.equal(blocks[1].kind, 'paragraph');
});

test('standalone math lines are formulas, prose with math stays prose', () => {
  const blocks = projectPaperBody('∇_ω L̃_aug(ω) ∝ E_τ [Σ]\n这里给出推导：∇ 表示梯度。');
  assert.equal(blocks[0].kind, 'formula');
  assert.equal(blocks[1].kind, 'paragraph');
});

test('markMath wraps tokens once and leaves delimited math alone', () => {
  assert.equal(markMath('定义 z_t^Q ∈ {−1, 0, +1}'), '定义 $z_t^Q$ ∈ {−1, 0, +1}');
  assert.equal(markMath('已经 $z_t$ 标记过'), '已经 $z_t$ 标记过');
  assert.equal(markMath(markMath('z_t')), '$z_t$', 'markMath must be idempotent');
});

test('markMath does not split compound math expressions', () => {
  assert.equal(markMath('{z_t}_{t=0}^{H−1}'), '{z_t}_{t=0}^{H−1}');
  assert.equal(markMath('Ψ_{t+1}'), 'Ψ_{t+1}');
});

test('every paper section body survives the projection without losing a line', () => {
  for (const name of papers) {
    const paper = load(name);
    for (const lang of ['zh', 'en']) {
      const sections = lang === 'zh' ? paper.sections_zh : paper.sections_en;
      for (const section of sections) {
        const blocks = projectPaperBody(section.body);
        const sourceLines = section.body.split('\n').filter((line) => line.trim());
        assert.ok(blocks.length > 0, `${name} ${lang}: ${section.heading} produced no blocks`);
        // 每一行要么成为 block, 要么成为某个 block 的一部分
        const joined = blocks.map((block) => block.text).join(' ');
        for (const line of sourceLines) {
          const needle = line.trim().replace(/^[-*+]\s+/, '').replace(/^\d+\.\s+/, '');
          assert.ok(joined.includes(needle), `${name} ${lang}: lost "${needle.slice(0, 40)}"`);
        }
      }
    }
  }
});

test('a section that cannot fit on one slide is split into several that each fit', () => {
  const body = Array.from({ length: 60 }, (_, index) => `第 ${index + 1} 行说明。`).join('\n\n');
  const { chunks, budget } = splitSectionBlocks({ heading: '测试标题', body, hasFormula: false });
  assert.ok(chunks.length > 1, 'a long section must be split');
  for (const chunk of chunks) {
    assert.ok(estimateBlocksHeight(chunk) <= budget, 'each chunk must fit the canvas budget');
  }
  const restored = chunks.flat().map((block) => block.text).join(' ');
  for (let index = 1; index <= 60; index++) assert.ok(restored.includes(`第 ${index} 行说明。`));
});

test('a heading never ends a slide alone', () => {
  const blocks = [
    { kind: 'paragraph', text: 'x'.repeat(400) },
    { kind: 'heading', text: '1. 标题' },
    { kind: 'item', text: '属于这个标题的列表项' },
  ];
  const budget = 200;
  const chunks = splitBlocksForSlides(blocks, { budget });
  for (const chunk of chunks) {
    assert.ok(!(chunk[chunk.length - 1].kind === 'heading'), 'a heading must not be the last block of a slide');
  }
});

test('every published paper section fits its budget without splitting when it is short', () => {
  for (const name of papers) {
    const paper = load(name);
    for (const lang of ['zh', 'en']) {
      const sections = lang === 'zh' ? paper.sections_zh : paper.sections_en;
      for (const section of sections) {
        const budget = availableBodyHeight({
          heading: section.heading.replace(/^Q\d+(?:\.\d+)?\.\s*/, ''),
          hasFormula: (paper.key_formulas ?? []).some((formula) => formula.section_index === sections.indexOf(section)),
        });
        assert.ok(budget > 200, `${name} ${lang}: budget too small for ${section.heading}`);
      }
    }
  }
});

test('the canvas model matches the shipped tokens', () => {
  assert.equal(SLIDE_METRICS.canvasWidth, 1920);
  assert.equal(SLIDE_METRICS.canvasHeight, 1080);
  assert.equal(SLIDE_METRICS.contentHeight, 1080 - 80 * 2);
  assert.equal(SLIDE_METRICS.contentWidth, 1920 - 100 * 2);
});
