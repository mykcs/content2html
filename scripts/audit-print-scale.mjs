// Comprehensive audit: which elements fail to scale from screen 1920x1080 to print 297x167mm?
// Walks all .slide-page children, compares each computed font-size/border/padding against expected 0.585× ratio
import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto('http://localhost:4321/content2html/zh/paper/2603.12109/slide/', { waitUntil: 'networkidle' });

// Collect screen-mode computed font-size for every visible element
await page.emulateMedia({ media: 'screen' });
await page.waitForTimeout(500);

const screenData = await page.evaluate(() => {
  const out = [];
  document.querySelectorAll('.slide-page *').forEach((el, i) => {
    const cs = getComputedStyle(el);
    if (cs.fontSize && cs.fontSize !== '0px') {
      out.push({
        i, tag: el.tagName.toLowerCase(),
        cls: el.className?.toString().split(' ').slice(0, 2).join(' ') || '',
        text: el.textContent?.substring(0, 30).replace(/\s+/g, ' '),
        fontSize: parseFloat(cs.fontSize),
        borderLeftWidth: parseFloat(cs.borderLeftWidth) || 0,
        padding: cs.padding,
        parent: el.parentElement?.className?.toString().split(' ').slice(0, 2).join(' ') || '',
      });
    }
  });
  return out;
});

// Collect print-mode computed font-size for same elements (use index to match)
await page.emulateMedia({ media: 'print' });
await page.waitForTimeout(500);

const printData = await page.evaluate(() => {
  const out = [];
  document.querySelectorAll('.slide-page *').forEach((el, i) => {
    const cs = getComputedStyle(el);
    if (cs.fontSize && cs.fontSize !== '0px') {
      out.push({
        i,
        fontSize: parseFloat(cs.fontSize),
        borderLeftWidth: parseFloat(cs.borderLeftWidth) || 0,
      });
    }
  });
  return out;
});

// Find mismatch (ratio > 0.7 means element didn't scale properly)
console.log('=== Elements where print/screen ratio > 0.7 (failed to scale) ===');
const RATIO_TARGET = 0.585;
const FAIL_THRESHOLD = 0.7;
let failCount = 0;
const seen = new Set();
for (let i = 0; i < screenData.length; i++) {
  const s = screenData[i];
  const p = printData[i];
  if (!p || !s || s.fontSize < 4) continue;  // skip tiny inherited
  const ratio = p.fontSize / s.fontSize;
  const key = `${s.cls}-${s.tag}-${s.fontSize}`;
  if (seen.has(key)) continue;
  seen.add(key);
  if (ratio > FAIL_THRESHOLD) {
    failCount++;
    if (failCount <= 20) {
      console.log(`  ${s.tag}.${s.cls} | text="${s.text}" | screen=${s.fontSize}px print=${p.fontSize}px ratio=${ratio.toFixed(3)}`);
    }
  }
}
console.log(`\nTotal failures: ${failCount} (target ratio: ${RATIO_TARGET})`);

await browser.close();