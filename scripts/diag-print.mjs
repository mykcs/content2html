import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto('http://localhost:4321/content2html/zh/paper/2603.12109/slide/', { waitUntil: 'load' });
await page.waitForTimeout(500);
await page.emulateMedia({ media: 'print' });
await page.waitForTimeout(500);

// 1) Check actual layout box in print mode
const box = await page.evaluate(() => {
  const slide = document.querySelector('.slide-page[data-page="1"]');
  const r = slide.getBoundingClientRect();
  const cs = getComputedStyle(slide);
  // Find a sample child to see where content actually renders
  const h1 = slide.querySelector('h1');
  const hr = slide.querySelector('h2, .kicker, hr');
  return {
    slide: { y: r.y, h: r.height, w: r.width, bottom: r.bottom, right: r.right,
             csWidth: cs.width, csHeight: cs.height, csZoom: cs.zoom, csTransform: cs.transform },
    h1: h1 ? { ...h1.getBoundingClientRect().toJSON(), text: h1.textContent.substring(0, 50) } : null,
  };
});
console.log('=== Layout box (print mode) ===');
console.log(JSON.stringify(box, null, 2));

// 2) Render PDF with Edge-like defaults
const pdfBuf = await page.pdf({
  width: '297mm',
  height: '167mm',
  printBackground: true,
  margin: { top: 0, bottom: 0, left: 0, right: 0 },
  preferCSSPageSize: true,  // honor @page size
});
writeFileSync('/tmp/print-diag.pdf', pdfBuf);
console.log(`\nPDF: ${pdfBuf.length} bytes, saved to /tmp/print-diag.pdf`);

// 3) Also try without preferCSSPageSize
const pdfBuf2 = await page.pdf({
  printBackground: true,
  margin: { top: 0, bottom: 0, left: 0, right: 0 },
});
writeFileSync('/tmp/print-diag2.pdf', pdfBuf2);
console.log(`PDF2 (no overrides): ${pdfBuf2.length} bytes, saved to /tmp/print-diag2.pdf`);

await browser.close();
