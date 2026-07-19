import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

await page.goto('https://mykcs.github.io/content2html/zh/paper/2603.12109/slide/', { waitUntil: 'networkidle' });
await page.waitForTimeout(800);

const showOnly = async (idx) => {
  await page.evaluate((i) => {
    document.querySelectorAll('.slide-page').forEach((el, j) => {
      if (j === i) {
        el.style.cssText = 'opacity: 1 !important; visibility: visible !important; position: relative !important; display: grid !important;';
        el.classList.add('active');
      } else {
        el.style.cssText = 'display: none !important;';
      }
    });
  }, idx);
  await page.waitForTimeout(300);
};

// Slide 1 (info-corner + meta-bar interaction)
await showOnly(0);
await page.screenshot({ path: new URL('./final-screen-slide1.png', import.meta.url).pathname });

// Slide 5 (text-heavy, kicker + h2 + bullets)
await showOnly(4);
await page.screenshot({ path: new URL('./final-screen-slide5.png', import.meta.url).pathname });

// Print mode
await page.emulateMedia({ media: 'print' });
await page.waitForTimeout(500);
await showOnly(0);
await page.screenshot({ path: new URL('./final-print-slide1.png', import.meta.url).pathname });

await showOnly(4);
await page.screenshot({ path: new URL('./final-print-slide5.png', import.meta.url).pathname });

await browser.close();
console.log('Final screenshots done');
