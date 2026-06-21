import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

await page.goto('https://mykcs.github.io/content2html/zh/paper/2603.12109/slide/', { waitUntil: 'networkidle' });
await page.waitForTimeout(800);

// Show slide 5 by isolating it
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

// Screen slide 5
await showOnly(4);
await page.screenshot({ path: '/Users/myk/Repo/webs/active/content2html/scripts/v3-screen-slide5.png' });

// Print slide 5 (force print mode)
await page.emulateMedia({ media: 'print' });
await page.waitForTimeout(500);
await page.screenshot({ path: '/Users/myk/Repo/webs/active/content2html/scripts/v3-print-slide5.png' });

await browser.close();
console.log('v3 done');
