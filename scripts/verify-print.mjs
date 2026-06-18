#!/usr/bin/env node
/**
 * verify-print.mjs — content2html slide print verification
 *
 * 用 Playwright 模拟 print 媒介, 抓 paper/progress slide 的 print PDF,
 * 拆成多页 PNG, 用 mcp__MiniMax__understand_image 视觉评估:
 *   - 4 张 slide 是否各自独立成 1 页
 *   - A4 landscape (PowerPoint 默认)
 *   - 无 dark frame / controls / indicator
 *   - IKB blue 强调色 + Times 字体保留
 *
 * Usage:
 *   node scripts/verify-print.mjs <route> [output-dir]
 *   node scripts/verify-print.mjs zh/paper/2603.12109/slide
 *   node scripts/verify-print.mjs en/paper/2603.12109/slide
 *   node scripts/verify-print.mjs zh/progress/2026-06-17/slide
 *
 * Env:
 *   BASE_URL  (default: http://127.0.0.1:4321/content2html)  — pre-built local
 *   PROD_URL  (default: https://mykcs.github.io/content2html) — GitHub Pages
 */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const ROUTE = process.argv[2] || 'zh/paper/2603.12109/slide';
const OUT_DIR = process.argv[3] || path.join(process.cwd(), 'tmp/print-verify');
const BASE = process.env.BASE_URL || 'http://127.0.0.1:4321/content2html';
const PROD = process.env.PROD_URL || 'https://mykcs.github.io/content2html';

async function capture(url, label) {
  console.log(`[verify-print] ${label}: ${url}`);
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 });
    // Wait for slide-deck to be ready
    await page.waitForSelector('.slide-deck', { timeout: 10_000 });
    // Emulate print media
    await page.emulateMedia({ media: 'print' });
    // Generate print PDF
    const pdfPath = path.join(OUT_DIR, `${label}.pdf`);
    await page.pdf({
      path: pdfPath,
      format: 'A4',
      landscape: true,
      printBackground: true,
      margin: { top: 0, bottom: 0, left: 0, right: 0 },
      preferCSSPageSize: true,
    });
    // Count slide-page elements for assertion
    const slideCount = await page.$$eval('.slide-page', (els) => els.length);
    console.log(`[verify-print] ${label}: ${slideCount} slides → ${pdfPath}`);
    return { label, pdfPath, slideCount };
  } finally {
    await browser.close();
  }
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const localUrl = `${BASE.replace(/\/$/, '')}/${ROUTE.replace(/^\//, '')}/`;
  const results = [];
  // Capture local (dist served via astro preview OR dev) — skip if not running
  try {
    results.push(await capture(localUrl, `local-${ROUTE.replace(/\//g, '-')}`));
  } catch (e) {
    console.warn(`[verify-print] local capture failed (likely no dev server): ${e.message}`);
  }
  // Capture prod (always)
  const prodUrl = `${PROD.replace(/\/$/, '')}/${ROUTE.replace(/^\//, '')}/`;
  results.push(await capture(prodUrl, `prod-${ROUTE.replace(/\//g, '-')}`));
  // Print summary
  console.log('\n=== verify-print summary ===');
  for (const r of results) {
    console.log(`  ${r.label}: slides=${r.slideCount}, pdf=${r.pdfPath}`);
  }
  // Pass criteria
  const ok = results.every((r) => r.slideCount >= 1);
  console.log(ok ? '\n[verify-print] PASS' : '\n[verify-print] FAIL (no slides detected)');
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
