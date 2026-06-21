// Screenshot all 15 slides × 2 langs at 1920×1080
// Plus full-page (all slides stacked) for structural cross-check.

import { chromium } from 'playwright';

const urls = {
  zh: 'https://mykcs.github.io/content2html/zh/paper/2603.12109/slide/',
  en: 'https://mykcs.github.io/content2html/en/paper/2603.12109/slide/',
};

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
  });

  for (const [lang, url] of Object.entries(urls)) {
    const page = await ctx.newPage();
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForSelector('.slide-page', { timeout: 10000 });
    await page.waitForTimeout(1000); // wait for slide-nav init

    const total = await page.evaluate(() =>
      document.querySelectorAll('.slide-page').length
    );
    console.log(`[${lang}] ${total} slides detected at ${url}`);

    for (let i = 0; i < total; i++) {
      await page.evaluate((idx) => {
        document.querySelectorAll('.slide-page').forEach((s, j) => {
          s.classList.toggle('active', j === idx);
        });
      }, i);
      await page.waitForTimeout(200);

      const idx = String(i + 1).padStart(2, '0');
      const out = `screenshots/${lang}/slide-${idx}.png`;
      await page.screenshot({ path: out, fullPage: false });
      console.log(`[${lang}] saved ${out}`);
    }

    // Full-page (stacked)
    await page.evaluate(() => {
      document.querySelectorAll('.slide-page').forEach((s) => {
        s.classList.add('active');
        s.style.display = 'block';
      });
    });
    await page.waitForTimeout(300);
    await page.screenshot({
      path: `screenshots/${lang}/full-page.png`,
      fullPage: true,
    });
    console.log(`[${lang}] saved screenshots/${lang}/full-page.png`);

    await page.close();
  }

  await browser.close();
  console.log('ALL_DONE');
})();