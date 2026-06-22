import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

for (const lang of ['zh', 'en']) {
  await page.goto(`https://mykcs.github.io/content2html/${lang}/paper/2606.18246/slide/`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2000);
  for (let i = 0; i < 6; i++) {
    await page.evaluate((idx) => {
      document.querySelectorAll('.slide-page').forEach((el, j) => {
        if (j === idx) {
          el.style.cssText = 'opacity: 1 !important; visibility: visible !important; position: relative !important; display: grid !important;';
          el.classList.add('active');
        } else {
          el.style.cssText = 'display: none !important;';
        }
      });
    }, i);
    await page.waitForTimeout(400);
    await page.screenshot({ path: `/Users/myk/Repo/webs/active/content2html/scripts/v18246-${lang}-s${i+1}.png` });
    console.log(`${lang}/slide ${i+1} captured`);
  }
}
await browser.close();
