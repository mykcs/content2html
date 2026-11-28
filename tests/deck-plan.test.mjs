import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { assertDeckPlan, cleanSectionHeading, deckKicker, resolveDeckSlide, sectionQuestionKey } from '../src/lib/deck-plan.mjs';

const load = (name) => JSON.parse(fs.readFileSync(path.join(process.cwd(), 'src/content/papers', name), 'utf8'));
const paper = load('2603.12109.json');
const other = load('2606.18246.json');

test('section keys are read from the heading itself', () => {
  assert.equal(sectionQuestionKey('Q3.1. 构建 AS 通道批评信号'), '3');
  assert.equal(sectionQuestionKey('Q4. 论文做了哪些实验？（1/2）'), '4');
  assert.equal(sectionQuestionKey('1. 引言'), '1');
  assert.equal(sectionQuestionKey('没有编号'), null);
  assert.equal(cleanSectionHeading('Q3.1. 构建 AS 通道批评信号'), '构建 AS 通道批评信号');
  assert.equal(cleanSectionHeading('1. 引言'), '引言');
});

test('a correct plan passes', () => {
  assert.doesNotThrow(() => assertDeckPlan(
    [
      { key: 'Q1', label: '试图解决什么问题', section: 0 },
      { key: 'Q2', label: '相关研究', section: 1 },
      { key: 'Q3.1', label: '构建 AS 通道批评信号', section: 2 },
      { key: 'Q3.2', label: '构建 BT 通道批评信号', section: 3 },
      { key: 'Q3.3', label: '边际感知辅助目标', section: 4 },
      { key: 'Q3.4', label: '最小侵入式优势重加权', section: 5 },
      { key: 'Q4.1', label: '实验 (设置 + Table 1)', section: 6 },
      { key: 'Q4.2', label: '实验 (动态 + 鲁棒性 + λ)', section: 7 },
      { key: 'Q5', label: '进一步探索', section: 8 },
      { key: 'Q6', label: '总结', section: 9 },
      { key: 'Q7', label: '进一步了解', section: 10 },
    ],
    paper.sections_zh
  ));
});

test('the historical off-by-N plan is rejected (Q4.1 rendering Q3.2)', () => {
  // 2026-11-27 修复前的真实写法: Q4.1/Q4.2/Q5/Q6/Q7 引用了 sections[3..7]
  assert.throws(
    () => assertDeckPlan(
      [
        { key: 'Q1', label: '试图解决什么问题', section: 0 },
        { key: 'Q4.1', label: '实验 (设置 + Table 1)', section: 3 },
        { key: 'Q4.2', label: '实验 (动态 + 鲁棒性 + λ)', section: 4 },
        { key: 'Q5', label: '进一步探索', section: 5 },
        { key: 'Q6', label: '总结', section: 6 },
        { key: 'Q7', label: '进一步了解', section: 7 },
      ],
      paper.sections_zh
    ),
    /引用 section 3|Q3/
  );
});

test('a section that never appears in the deck is rejected', () => {
  assert.throws(
    () => assertDeckPlan([{ key: 'Q1', label: '试图解决什么问题', section: 0 }], paper.sections_zh),
    /从未出现在 deck 里/
  );
});

test('using the same section twice is rejected', () => {
  assert.throws(
    () => assertDeckPlan(
      [
        { key: 'Q1', label: '试图解决什么问题', section: 0 },
        { key: 'Q2', label: '相关研究', section: 0 },
      ],
      paper.sections_zh
    ),
    /已被 slide Q1 使用/
  );
});

test('out-of-order and duplicate keys are rejected', () => {
  assert.throws(
    () => assertDeckPlan(
      [
        { key: 'Q2', label: '相关研究', section: 1 },
        { key: 'Q1', label: '试图解决什么问题', section: 0 },
      ],
      paper.sections_zh
    ),
    /deck 顺序错乱/
  );
  assert.throws(
    () => assertDeckPlan(
      [
        { key: 'Q1', label: 'a', section: 0 },
        { key: 'Q1', label: 'b', section: 1 },
      ],
      paper.sections_zh
    ),
    /重复的 slide key|deck 顺序错乱/
  );
});

test('numeric headings are checked too', () => {
  assert.doesNotThrow(() => assertDeckPlan(
    [
      { key: 'Q1', label: '试图解决什么问题', section: 0 },
      { key: 'Q2', label: '方法', section: 1 },
      { key: 'Q3', label: '实验', section: 2 },
      { key: 'Q4', label: '分析', section: 3 },
      { key: 'Q5', label: '总结', section: 4 },
    ],
    other.sections_zh
  ));
  assert.throws(
    () => assertDeckPlan(
      [
        { key: 'Q1', label: '试图解决什么问题', section: 0 },
        { key: 'Q2', label: '方法', section: 1 },
        { key: 'Q3', label: '实验', section: 2 },
        { key: 'Q4', label: '分析', section: 3 },
        { key: 'Q5', label: '总结', section: 2 },
      ],
      other.sections_zh
    ),
    /属于 Q3|已被 slide/
  );
});

test('resolveDeckSlide returns the section behind a key', () => {
  const plan = [
    { key: 'Q1', label: '试图解决什么问题', section: 0 },
    { key: 'Q3.1', label: '构建 AS 通道批评信号', section: 2 },
  ];
  const resolved = resolveDeckSlide(plan, paper.sections_zh, 'Q3.1');
  assert.equal(resolved.index, 2);
  assert.equal(resolved.section.heading, paper.sections_zh[2].heading);
  assert.equal(deckKicker(resolved.slide), 'Q3.1 · 构建 AS 通道批评信号');
  assert.throws(() => resolveDeckSlide(plan, paper.sections_zh, 'Q9'), /Unknown deck key/);
});
