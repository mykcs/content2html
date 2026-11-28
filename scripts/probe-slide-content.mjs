// scripts/probe-slide-content.mjs
// 内容覆盖报告: 论文每一节正文有多少真正出现在双语 deck 里。
//
// 用法: node scripts/probe-slide-content.mjs
// 退出码 1 表示存在覆盖缺口 (与 scripts/check-slide-content.mjs 的门禁同源)。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { markMath, projectPaperBody } from '../src/lib/slide-content.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const dist = path.join(root, 'dist');
const papersDir = path.join(root, 'src/content/papers');

const decode = (text) =>
  text.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
const visibleText = (html) =>
  decode(html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ');
const normalize = (text) => text.replace(/[\s ]+/g, '');

let gaps = 0;
for (const file of fs.readdirSync(papersDir).filter((name) => name.endsWith('.json')).sort()) {
  const paper = JSON.parse(fs.readFileSync(path.join(papersDir, file), 'utf8'));
  const paperId = paper.arxiv_id ?? path.basename(file, '.json');
  for (const lang of ['zh', 'en']) {
    const html = fs.readFileSync(path.join(dist, lang, 'paper', paperId, 'slide', 'index.html'), 'utf8');
    const slides = [...html.matchAll(/<section class="slide-page[^"]*"[\s\S]*?<\/section>/g)].map((m) => m[0]);
    const deckText = normalize(slides.map((s) => visibleText(s)).join(' '));
    const sections = lang === 'zh' ? paper.sections_zh : paper.sections_en;
    console.log(`\n=== ${lang}/paper/${paperId}/slide — ${slides.length} slides, ${sections.length} sections ===`);
    sections.forEach((section, index) => {
      const blocks = projectPaperBody(section.body);
      let hit = 0;
      const missing = [];
      for (const block of blocks) {
        const source = block.kind === 'formula' ? block.text : markMath(block.text);
        const needle = normalize(source);
        if (needle.length < 8) continue;
        if (deckText.includes(needle)) hit++;
        else missing.push(block.text.slice(0, 58));
      }
      const total = hit + missing.length;
      const percent = total ? Math.round((hit / total) * 100) : 100;
      if (missing.length) gaps += missing.length;
      console.log(
        `  section ${String(index).padStart(2)} ${percent === 100 ? 'OK ' : 'GAP'} coverage=${String(percent).padStart(3)}% (${hit}/${total}) ${section.heading.slice(0, 34)}`
      );
      for (const text of missing) console.log(`        MISSING: ${text}`);
    });
  }
}
console.log(`\n${gaps ? `RESULT: ${gaps} content gap(s)` : 'RESULT: every section body is fully present in both decks'}`);
process.exit(gaps ? 1 : 0);
