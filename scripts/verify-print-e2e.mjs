// scripts/verify-print-e2e.mjs
// End-to-end print verification: ensures PDF page count matches slide count + visual fidelity.
//
// Why: Print pipeline has 4 layers of bugs that all look like "wrong page count":
//   1. transform: scale() ignored by print engine → use mm-based sizing
//   2. rem references root html (not .slide-page) → must shrink html font-size
//   3. break-after: page on all slides + tail content → trailing blank
//   4. :last-child selector doesn't match (slide-controls/script after slide 13)
//
// Each fix attempt addressed ONE layer. This verifier checks ALL 4 layers + page count
// so we catch regressions early.
//
// Deja Vu: triggered by user asking "为什么打印14页" after 8+ fix commits on this same
// issue (2f0e7dd, 0fda967, bfb850c, bef1017, ...). Without this script, future fixes
// will repeat the same loop.
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const URL = process.env.URL || 'https://mykcs.github.io/content2html/zh/paper/2603.12109/slide/';

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

// P1 #3 fix (2026-06-27): SLIDE_COUNT is REQUIRED (no DOM auto-detect, no default).
// DOM auto-detect via page.locator('.slide-page').count() was tried previously but
// fails for paper slides that have <section class="slide-page"> inside map() loops
// or inside component-rendered markup where Playwright counts nested/extra nodes.
// SLIDE_COUNT is the single source of truth — caller must pass it explicitly
// matching the actual slide count in the slide.astro source (e.g. 16 for 2603.12109,
// 6 for 2606.18246, 5 for progress 2026-06-17).
const rawSlideCount = process.env.SLIDE_COUNT;
if (!rawSlideCount) {
  console.error('❌ SLIDE_COUNT env var is required.');
  console.error('   Usage: SLIDE_COUNT=16 node scripts/verify-print-e2e.mjs');
  console.error('   Known slide counts:');
  console.error('     - 2603.12109 paper slide: 16');
  console.error('     - 2606.18246 paper slide: 6');
  console.error('     - progress 2026-06-17 slide: 5');
  process.exit(2);
}
const SLIDE_COUNT = parseInt(rawSlideCount, 10);
if (!Number.isFinite(SLIDE_COUNT) || SLIDE_COUNT <= 0) {
  console.error(`❌ SLIDE_COUNT must be a positive integer, got: ${rawSlideCount}`);
  process.exit(2);
}

// 1. Page count via Playwright page.pdf()
const buf = await page.pdf({
  width: '297mm', height: '167mm',
  printBackground: true,
  margin: { top: 0, bottom: 0, left: 0, right: 0 },
  preferCSSPageSize: true,
});
writeFileSync('/tmp/print-verify.pdf', buf);
const pdfPages = (buf.toString('binary').match(/\/Type\s*\/Page[^s]/g) || []).length;

// 2. Visual fidelity check (no 100% font-size artifacts)
await page.emulateMedia({ media: 'print' });
await page.waitForTimeout(500);
const audit = await page.evaluate(() => {
  const results = { layers: {} };

  // Layer 1: slide width = 297mm (mm-based, not 1920px)
  const slide = document.querySelector('.slide-page');
  const cs = getComputedStyle(slide);
  results.layers.mm_based = cs.width === '1122.52px' ? '✓' : `✗ (got ${cs.width})`;

  // Layer 2: html font-size = 9.37px (rem scaling)
  const html = document.documentElement;
  results.layers.rem_scaling = getComputedStyle(html).fontSize === '9.37px' ? '✓' : `✗ (got ${getComputedStyle(html).fontSize})`;

  // Layer 3: last slide should NOT have break-after: page (which caused 14-page bug).
  // It SHOULD have break-before: page (from .slide-page + .slide-page adjacent sibling
  // combinator) — that's the correct fix from bef1017.
  const allSlides = document.querySelectorAll('.slide-page');
  const lastSlide = allSlides[allSlides.length - 1];
  const lastCs = getComputedStyle(lastSlide);
  const breakAfterOnLast = lastCs.breakAfter;
  const breakBeforeOnLast = lastCs.breakBefore;
  results.layers.no_trailing = (breakAfterOnLast === 'auto' && breakBeforeOnLast === 'page')
    ? '✓' : `✗ (last slide: break-after=${breakAfterOnLast}, break-before=${breakBeforeOnLast})`;

  // Layer 4: page break strategy = break-before on slides 2-N
  const secondSlide = allSlides[1];
  const slide2BreakBefore = getComputedStyle(secondSlide).breakBefore;
  results.layers.break_before = slide2BreakBefore === 'page' ? '✓' : `✗ (slide 2 has ${slide2BreakBefore})`;

  // Bonus: takeaway-item font-size scaled
  const takeaway = document.querySelector('.takeaway-item');
  if (takeaway) {
    const fs = parseFloat(getComputedStyle(takeaway).fontSize);
    results.layers.takeaway_scaled = fs < 25 ? '✓' : `✗ (${fs}px, expected ~18.74px)`;
  }

  return results;
});

// 3. Extract last 2 pages and check sizes (blank page = small file)
// Threshold: relative to average non-blank page size (50% heuristic).
// Small papers (e.g. 2606.18246 with 6 short sections) have page PNG ~2KB
// at 50dpi (legitimate), so absolute 5KB threshold false-positives.
execSync(`pdftoppm -png -r 50 -f ${pdfPages - 1} -l ${pdfPages} /tmp/print-verify.pdf /tmp/print-verify-page`, { encoding: 'utf8' });
const fs = await import('node:fs');
const lastPages = fs.readdirSync('/tmp').filter(f => f.startsWith('print-verify-page-')).sort();
// Compute average across all rendered pages for relative threshold
const allPageSizes = lastPages.map(p => fs.statSync(`/tmp/${p}`).size);
const avgSize = allPageSizes.reduce((a, b) => a + b, 0) / allPageSizes.length;
const lastPageSize = allPageSizes[allPageSizes.length - 1];
// Blank = last page < 50% of avg (catches real blanks without false-positives on small papers)
const lastPageBlank = lastPageSize < avgSize * 0.5;

// 4. Final verdict
console.log('=== Print E2E Verification ===\n');
console.log(`Slide count:    ${SLIDE_COUNT}`);
console.log(`PDF page count: ${pdfPages}`);
console.log(`Last page size: ${allPageSizes[allPageSizes.length - 1]?.size} bytes ${lastPageBlank ? '(BLANK!)' : ''}\n`);
console.log('Layer checks:');
Object.entries(audit.layers).forEach(([k, v]) => console.log(`  ${k.padEnd(20)} ${v}`));

const pageCountOk = pdfPages === SLIDE_COUNT;
const noBlank = !lastPageBlank;
const allLayers = Object.values(audit.layers).every(v => v === '✓');
const pass = pageCountOk && noBlank && allLayers;

console.log(`\n${pass ? '✅ PASS' : '❌ FAIL'}: pageCount=${pageCountOk}, noBlank=${noBlank}, layers=${allLayers}`);
process.exit(pass ? 0 : 1);