// scripts/measure-slide-fit.mjs
// 量测每张 slide 的正文是否装得进 1920×1080 固定画布。
// 用法: node scripts/measure-slide-fit.mjs
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const dist = join(root, 'dist');
const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.woff2': 'font/woff2', '.txt': 'text/plain', '.xml': 'application/xml' };

const server = createServer((req, res) => {
  const url = decodeURIComponent((req.url ?? '/').split('?')[0]);
  let file = join(dist, url);
  if (!existsSync(file) || url.endsWith('/')) file = join(dist, url, 'index.html');
  if (!existsSync(file)) { res.statusCode = 404; res.end('not found'); return; }
  res.setHeader('Content-Type', MIME[extname(file)] ?? 'application/octet-stream');
  res.end(readFileSync(file));
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;

const routes = [
  'zh/paper/2603.12109/slide/', 'en/paper/2603.12109/slide/',
  'zh/paper/2606.18246/slide/', 'en/paper/2606.18246/slide/',
  'zh/progress/2026-06-17/slide/', 'en/progress/2026-06-17/slide/',
];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 956 } });
let failures = 0;

for (const route of routes) {
  await page.goto(origin + '/content2html/' + route, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  const total = await page.locator('.slide-page').count();
  const rows = [];
  for (let index = 0; index < total; index++) {
    if (index > 0) await page.keyboard.press('ArrowRight');
    await page.waitForFunction(n => document.querySelector('.slide-page.active')?.getAttribute('data-page') === String(n), index + 1);
    const measured = await page.evaluate(() => {
      const slide = document.querySelector('.slide-page.active');
      const box = slide.getBoundingClientRect();
      const scale = Number(getComputedStyle(slide).getPropertyValue('--slide-scale')) || 1;
      let worst = 0, worstText = '';
      for (const node of slide.querySelectorAll('*')) {
        if (node.children.length) continue;
        const text = (node.textContent ?? '').trim();
        if (!text) continue;
        const rect = node.getBoundingClientRect();
        if (!rect.height) continue;
        const over = Math.max(rect.bottom - box.bottom, rect.right - box.right);
        if (over > worst) { worst = over; worstText = text.slice(0, 60); }
      }
      const body = slide.querySelector('.slide-body');
      return {
        scale,
        canvas: { width: box.width / scale, height: box.height / scale },
        overflowPx: Math.round(worst * 10) / 10,
        worstText,
        bodyScroll: body ? { client: body.clientHeight, scroll: body.scrollHeight } : null,
        katex: slide.querySelectorAll('.katex').length,
        rawMath: (slide.textContent.match(/\$[^$\n]+\$/g) ?? []).length,
      };
    });
    rows.push({ slide: index + 1, ...measured });
  }
  console.log(`\n=== ${route} (${total} slides) ===`);
  for (const row of rows) {
    const bad = row.overflowPx > 0.5;
    if (bad) failures++;
    console.log(
      `  slide ${String(row.slide).padStart(2)}  overflow=${String(row.overflowPx).padStart(7)}px` +
      (row.bodyScroll ? `  body ${row.bodyScroll.client}/${row.bodyScroll.scroll}` : '  body -') +
      `  katex=${row.katex}  math=$count:${row.rawMath}` +
      (bad ? `  <-- OVERFLOW: ${row.worstText}` : '')
    );
  }
}
await browser.close();
server.closeAllConnections(); server.close();
console.log(`\n${failures ? `FAIL: ${failures} slide(s) overflow the canvas` : 'PASS: every slide fits the 1920x1080 canvas'}`);
process.exit(failures ? 1 : 0);
