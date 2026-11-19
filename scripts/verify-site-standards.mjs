// Exact-candidate acceptance: serves this checkout's dist under its real base.
import { createServer } from 'node:http';
import { readFileSync, statSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import { chromium, webkit } from 'playwright';
import { root, BASE, STANDARD, tokenNames, routeInventory, sourceIdentity } from './check-site-standards.mjs';
import { formatCalendar, formatPeriod } from '../src/lib/calendar.mjs';
const dist = path.join(root, 'dist');
const out = process.env.SITE_STANDARDS_EVIDENCE_DIR || path.join(root, 'test-results/standards/browser');
mkdirSync(out, { recursive: true });
const source = sourceIdentity();
if (process.env.EXPECTED_SHA) {
  assert.equal(source.sha, process.env.EXPECTED_SHA, 'candidate HEAD must match the requested SHA');
  assert.equal(source.dirty, false, 'candidate browser must use a clean checkout');
}
const routes = routeInventory();
assert.ok(routes.length > 0);
assert.deepEqual(routes.flatMap(route => route.errors), []);
const types = { '.html':'text/html', '.css':'text/css', '.js':'application/javascript', '.svg':'image/svg+xml', '.png':'image/png', '.webp':'image/webp', '.jpg':'image/jpeg', '.woff2':'font/woff2', '.woff':'font/woff', '.ttf':'font/ttf', '.json':'application/json' };
const server = createServer((req, res) => {
  try {
    const url = new URL(req.url, 'http://local');
    if (!url.pathname.startsWith(BASE)) throw new Error('outside base');
    const relative = decodeURIComponent(url.pathname.slice(BASE.length));
    let file = path.resolve(dist, relative);
    if (file !== dist && !file.startsWith(dist + path.sep)) throw new Error('outside dist');
    if (statSync(file).isDirectory()) file = path.join(file, 'index.html');
    res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
    res.end(readFileSync(file));
  } catch { res.statusCode = 404; res.setHeader('Content-Type', 'text/html'); res.end(readFileSync(path.join(dist, '404.html'))); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const rows = [], redirects = [], failures = [], negativeFixtures = [], printRuns = [];

async function readSurface(page) {
  return page.evaluate(({ names }) => {
    const html = document.documentElement;
    const rootStyle = getComputedStyle(html);
    const rootSize = parseFloat(rootStyle.fontSize);
    const families = ['sans', 'serif', 'mono'].map(role => {
      const probe = document.createElement('span');
      probe.style.fontFamily = `var(--type-font-${role})`;
      document.body.append(probe);
      const font = getComputedStyle(probe).fontFamily;
      probe.remove();
      return { role, font };
    });
    const lines = names.filter(name => name.startsWith('--leading-')).map(name => parseFloat(rootStyle.getPropertyValue(name)));
    const weights = names.filter(name => name.startsWith('--weight-')).map(name => rootStyle.getPropertyValue(name).trim());
    const styles = new Map(), errors = [], clips = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (!node.textContent.trim()) continue;
      const el = node.parentElement;
      if (!el || el.closest('script, style, svg, math, .katex')) continue;
      if (el.closest('.skip-link') && !el.matches(':focus')) continue;
      const style = getComputedStyle(el);
      if (style.display === 'none' || style.visibility !== 'visible') continue;
      if (el.closest('details:not([open])') && !el.closest('summary')) continue;
      const range = document.createRange(); range.selectNodeContents(node);
      const rect = range.getBoundingClientRect();
      if (!rect.width || !rect.height) continue;
      const parentSize = parseFloat(getComputedStyle(el.parentElement).fontSize);
      const size = parseFloat(style.fontSize);
      const isMarker = ['SUP', 'SUB'].includes(el.tagName);
      const approvedSize = names.filter(name => name.startsWith('--type-') && !name.startsWith('--type-font-')).some(name => {
        const match = /^([\d.]+)(rem|em|px)$/.exec(style.getPropertyValue(name).trim());
        if (!match) return false;
        const value = Number(match[1]) * (match[2] === 'rem' ? rootSize : match[2] === 'em' ? parentSize : 1);
        return Math.abs(value - size) < .08;
      }) || (isMarker && Math.abs(size - parentSize * .75) < .08);
      const ratio = parseFloat(style.lineHeight) / size;
      const sample = { font: style.fontFamily, size: style.fontSize, weight: style.fontWeight, line: style.lineHeight, tracking: style.letterSpacing };
      styles.set(JSON.stringify(sample), sample);
      const context = { tag: el.tagName, class: el.className, text: node.textContent.trim().slice(0, 95), ...sample };
      if (!families.some(family => family.font === style.fontFamily)) errors.push({ kind: 'font', ...context });
      if (!approvedSize) errors.push({ kind: 'size', ...context });
      if (!weights.includes(style.fontWeight)) errors.push({ kind: 'weight', ...context });
      const tracking = style.letterSpacing === 'normal' ? 0 : parseFloat(style.letterSpacing);
      const ownedTracking = names.filter(name => name.startsWith('--tracking-')).some(name => {
        const raw = style.getPropertyValue(name).trim();
        const value = parseFloat(raw);
        return Number.isFinite(value) && (Math.abs(tracking - value * (raw.endsWith('em') ? size : 1)) < .08 || Math.abs(tracking - value * (raw.endsWith('em') ? parentSize : 1)) < .08);
      });
      if (!ownedTracking) errors.push({ kind: 'tracking', ...context });
      if (!lines.some(value => Math.abs(value - ratio) < .012) && !(isMarker && ratio === 0)) errors.push({ kind: 'leading', ...context });
      for (let ancestor = el; ancestor && ancestor !== document.documentElement; ancestor = ancestor.parentElement) {
        const cs = getComputedStyle(ancestor), box = ancestor.getBoundingClientRect();
        if (!box.width || !box.height) continue;
        const clippedX = ['hidden', 'clip'].includes(cs.overflowX) && (rect.left < box.left - 2 || rect.right > box.right + 2);
        const clippedY = ['hidden', 'clip'].includes(cs.overflowY) && (rect.top < box.top - 2 || rect.bottom > box.bottom + 2);
        if (clippedX || clippedY) { clips.push({ ...context, ancestor: ancestor.className, clippedX, clippedY }); break; }
      }
    }
    const active = document.querySelector('.slide-page.active');
    const canvas = active && { width: active.offsetWidth, height: active.offsetHeight, rect: active.getBoundingClientRect().toJSON(),
      scale: Number(getComputedStyle(active).getPropertyValue('--slide-scale')) };
    const invalidImages = [...document.querySelectorAll('main img')].filter(img => img.currentSrc && new URL(img.currentSrc).origin === location.origin && (!img.complete || img.naturalWidth === 0)).map(img => img.src);
    return { standard: rootStyle.getPropertyValue('--site-design-system').trim(), styles: [...styles.values()], errors, clips,
      overflow: html.scrollWidth - innerWidth, canvas, invalidImages,
      dates: [...document.querySelectorAll('[data-calendar-value]')].map(el => ({ value: el.dataset.calendarValue, lang: el.dataset.calendarLang, kind: el.dataset.calendarKind, text: el.textContent })) };
  }, { names: tokenNames });
}
function assertSurface(data) {
  assert.equal(data.standard, STANDARD);
  assert.ok(data.styles.length > 0, 'must inspect actual page-body text');
  assert.deepEqual(data.errors, [], 'unowned computed text styles');
  assert.deepEqual(data.clips, [], 'text clipped by a rendered ancestor');
  assert.ok(data.overflow <= 2, `document overflow ${data.overflow}px`);
  assert.deepEqual(data.invalidImages, [], 'missing content images');
  if (data.canvas) {
    assert.equal(data.canvas.width, 1920); assert.equal(data.canvas.height, 1080);
    assert.ok(data.canvas.scale > 0 && data.canvas.scale <= 1);
    assert.ok(data.canvas.rect.left >= -1 && data.canvas.rect.top >= -1, 'fit canvas begins inside viewport');
  }
  for (const date of data.dates) assert.equal(date.text, (date.kind === 'period' ? formatPeriod : formatCalendar)(date.value, date.lang));
}
async function readConsumer(page, selector, property) {
  return page.locator(selector).first().evaluate((el, property) => ({ value: getComputedStyle(el)[property], width: el.getBoundingClientRect().width }), property);
}
async function proveConsumer(page, token, value, selector, property, width = false) {
  const before = await readConsumer(page, selector, property);
  const previous = await page.evaluate(token => ({ value: document.documentElement.style.getPropertyValue(token), priority: document.documentElement.style.getPropertyPriority(token) }), token);
  let after;
  try {
    await page.evaluate(({ token, value }) => document.documentElement.style.setProperty(token, value), { token, value });
    await page.waitForFunction(({ selector, property, before, width }) => {
      const el = document.querySelector(selector);
      return el && getComputedStyle(el)[property] !== before.value && (!width || Math.abs(el.getBoundingClientRect().width - before.width) > .5);
    }, { selector, property, before, width }, { polling: 'raf', timeout: 2500 });
    after = await readConsumer(page, selector, property);
  } finally {
    await page.evaluate(({ token, previous }) => {
      if (previous.value) document.documentElement.style.setProperty(token, previous.value, previous.priority);
      else document.documentElement.style.removeProperty(token);
    }, { token, previous });
  }
  await page.waitForFunction(({ selector, property, before, width }) => {
    const el = document.querySelector(selector);
    return el && getComputedStyle(el)[property] === before.value && (!width || Math.abs(el.getBoundingClientRect().width - before.width) < .2);
  }, { selector, property, before, width }, { polling: 'raf', timeout: 2500 });
  const restored = await readConsumer(page, selector, property);
  assert.notEqual(after.value, before.value, `${token} must change a real consumer`);
  assert.equal(restored.value, before.value, `${token} must restore its consumer`);
  if (width) { assert.ok(Math.abs(after.width - before.width) > .5); assert.ok(Math.abs(restored.width - before.width) < .2); }
  return { token, selector, property, before, after, restored, testValue: value };
}
async function consumerProofs(page, role) {
  const slide = role === 'slide';
  const message = ['message', 'redirect'].includes(role);
  const body = slide ? '.slide-page.active' : 'body';
  const heading = slide ? '.slide-page.active h1' : 'main h1';
  const proofs = [
    ['--type-font-' + (message ? 'sans' : 'serif'), 'monospace', body, 'fontFamily'],
    ['--type-prose', '20px', body, 'fontSize'],
    ['--weight-normal', '550', body, 'fontWeight'],
    ['--tracking-body', '.03em', body, 'letterSpacing'],
    [role === 'longform' ? '--leading-prose' : '--leading-body', '2.1', body, 'lineHeight'],
    [message ? '--type-message-title' : '--type-headline', '40px', heading, 'fontSize'],
    ['--space-unit', '.5rem', slide ? '.slide-page.active' : message ? '.message' : 'body', slide ? 'gap' : 'paddingLeft'],
    ...(slide ? [
      ['--slide-space-inline', '60px', '.slide-page.active', 'paddingLeft'],
      ['--measure-slide-title', '18rem', heading, 'maxWidth', true],
      ['--leading-title', '1.87', heading, 'lineHeight'],
    ] : [[message ? '--measure-message' : '--measure-reading', '16rem', message ? '.message' : 'body', 'maxWidth', true]]),
  ];
  const results = [];
  for (const proof of proofs) results.push(await proveConsumer(page, ...proof));
  return results;
}
async function localImages(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    const images = [...document.querySelectorAll('main img')].filter(img => new URL(img.src).origin === location.origin);
    await Promise.all(images.map(async img => { img.loading = 'eager'; await img.decode(); }));
  });
}
function runPrint(route) {
  const known = route.url.includes('/paper/2603.12109/') ? 16 : route.url.includes('/paper/2606.18246/') ? 6 : route.url.includes('/progress/2026-06-17/') ? 5 : null;
  assert.ok(known, `New deck ${route.url} needs an intentional print page-count expectation`);
  assert.equal(route.slides, known, 'build/source slide count must match the print regression');
  const key = route.file.replace(/[^a-z0-9]+/gi, '-');
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['scripts/verify-print-e2e.mjs'], { cwd: root,
      env: { ...process.env, URL: origin + route.url, SLIDE_COUNT: String(known), PRINT_EVIDENCE_DIR: out, PRINT_EVIDENCE_NAME: key } });
    let log = '';
    child.stdout.on('data', chunk => { log += chunk; }); child.stderr.on('data', chunk => { log += chunk; });
    child.on('error', reject);
    child.on('close', code => {
      writeFileSync(path.join(out, `${key}-print.log`), log);
      printRuns.push({ route: route.url, expectedPages: known, exitCode: code });
      if (code !== 0) reject(new Error(`${route.url} existing print regression failed:\n${log}`)); else resolve();
    });
  });
}
try {
  for (const [engine, type] of Object.entries({ chromium, webkit })) {
    const browser = await type.launch();
    try {
      for (const route of routes.filter(route => route.target)) {
        const page = await browser.newPage();
        try {
          await page.goto(origin + route.url); await page.waitForURL(origin + route.target);
          redirects.push({ engine, from: route.url, to: route.target, mode: 'unmodified built HTML' });
        } finally { await page.close(); }
      }
      // Prove a shared shell cannot conceal an independently styled main body.
      {
        const page = await browser.newPage();
        try {
          await page.goto(origin + BASE + 'en/'); await localImages(page);
          const style = await page.addStyleTag({ content: 'main h1 { font-family: cursive !important; font-size: 17px !important; line-height: 1.13 !important; }' });
          await page.waitForFunction(() => getComputedStyle(document.querySelector('main h1')).fontSize === '17px');
          const bad = await readSurface(page);
          assert.equal(bad.standard, STANDARD); assert.ok(bad.errors.some(error => error.kind === 'font') && bad.errors.some(error => error.kind === 'size'));
          assert.throws(() => assertSurface(bad));
          negativeFixtures.push({ engine, fixture: 'good-shell-bad-main', rejected: true, errors: bad.errors });
          await style.evaluate(el => el.remove());
          assertSurface(await readSurface(page));
        } finally { await page.close(); }
      }
      for (const route of routes) for (const width of [1280, 440]) {
        const context = await browser.newContext({ viewport: { width, height: 956 }, reducedMotion: 'reduce', colorScheme: 'light', serviceWorkers: 'block' });
        const page = await context.newPage();
        page.setDefaultTimeout(12000);
        const key = `${engine}-${route.file.replace(/[^a-z0-9]+/gi, '-')}-${width}`;
        const pageErrors = [], localFailures = [], remoteFailures = [];
        page.on('pageerror', error => pageErrors.push(error.message));
        page.on('response', response => { if (response.status() >= 400) (response.url().startsWith(origin) ? localFailures : remoteFailures).push({ url: response.url(), status: response.status() }); });
        try {
          if (route.target) await page.route(origin + route.url, intercepted => intercepted.fulfill({ contentType: 'text/html', body: readFileSync(path.join(dist, route.file), 'utf8').replace(/<meta\b[^>]*http-equiv="refresh"[^>]*>/i, '') }));
          const response = await page.goto(origin + route.url);
          assert.equal(response.status(), 200);
          await localImages(page);
          const skip = page.locator('.skip-link');
          if (await skip.count()) {
            await page.keyboard.press('Tab');
            await page.waitForFunction(() => document.activeElement?.classList.contains('skip-link') && document.activeElement.getBoundingClientRect().top >= 0);
            assert.equal(await skip.getAttribute('href'), '#main');
            await page.keyboard.press('Tab');
          }
          if (route.role === 'slide') await page.waitForFunction(() => Number(getComputedStyle(document.querySelector('.slide-page.active')).getPropertyValue('--slide-scale')) < 1);
          const measurements = [];
          const consumption = await consumerProofs(page, route.role);
          for (let index = 0; index < Math.max(route.slides, 1); index++) {
            if (route.slides) {
              if (index > 0) await page.keyboard.press('ArrowRight');
              await page.waitForFunction(number => document.querySelector('.slide-page.active')?.getAttribute('data-page') === String(number), index + 1);
              assert.equal(await page.locator('.slide-page.active').count(), 1);
              if (index === 1) consumption.push(await proveConsumer(page, '--leading-slide-heading', '1.87', '.slide-page.active h2', 'lineHeight'));
            }
            const measurement = await readSurface(page);
            assertSurface(measurement);
            assert.equal(measurement.dates.length, route.dates.length);
            if (measurement.canvas) { assert.ok(measurement.canvas.rect.right <= width + 1); assert.ok(measurement.canvas.rect.bottom <= 957); }
            measurements.push({ slide: route.slides ? index + 1 : null, ...measurement });
            await page.screenshot({ path: path.join(out, `${key}${route.slides ? `-slide-${String(index + 1).padStart(2, '0')}` : ''}.png`), fullPage: !route.slides });
          }
          if (route.slides) {
            await page.keyboard.press('Home');
            await page.waitForFunction(() => document.querySelector('.slide-page.active')?.getAttribute('data-page') === '1');
            await page.locator('[data-zoom="0.5"]').click();
            await page.waitForFunction(() => getComputedStyle(document.querySelector('.slide-page.active')).getPropertyValue('--slide-scale').trim() === '0.5');
            await page.locator('[data-zoom="fit"]').click();
            await page.waitForFunction(() => document.querySelector('[data-zoom="fit"]')?.classList.contains('active'));
            // Both engines validate the print role; Chromium additionally runs
            // the established PDF/page-count/pdftotext regression below.
            await page.emulateMedia({ media: 'print' });
            await page.waitForFunction(() => getComputedStyle(document.documentElement).fontSize === '9.37px');
            const print = await page.evaluate(() => ({ root: getComputedStyle(document.documentElement).fontSize,
              slides: [...document.querySelectorAll('.slide-page')].map(el => { const s = getComputedStyle(el); return { width: parseFloat(s.width), height: parseFloat(s.height), visible: s.visibility, after: s.breakAfter, before: s.breakBefore }; }),
              controls: getComputedStyle(document.querySelector('.slide-controls')).display }));
            assert.equal(print.root, '9.37px'); assert.equal(print.controls, 'none'); assert.equal(print.slides.length, route.slides);
            print.slides.forEach((slide, i) => { assert.ok(Math.abs(slide.width - 297 * 96 / 25.4) < .1); assert.ok(Math.abs(slide.height - 167 * 96 / 25.4) < .1); assert.equal(slide.visible, 'visible'); assert.equal(slide.after, 'auto'); if (i > 0) assert.equal(slide.before, 'page'); });
            consumption.push(await proveConsumer(page, '--print-root', '10.2px', 'html', 'fontSize'));
            measurements.push({ media: 'print', ...print });
            await page.emulateMedia({ media: 'screen' });
          }
          const languageSwitch = page.locator('.lang-toggle');
          if (await languageSwitch.count()) {
            const href = await languageSwitch.getAttribute('href');
            assert.ok(routes.some(other => other.url === href), `Missing language route ${href}`);
            await languageSwitch.click();
            await page.waitForURL(origin + href);
          }
          assert.deepEqual(pageErrors, [], 'page script errors'); assert.deepEqual(localFailures, [], 'candidate asset failures');
          rows.push({ engine, route: route.url, file: route.file, htmlSha256: route.sha256, width, height: 956,
            mode: route.target ? 'fallback-with-refresh-disabled (real navigation tested separately)' : 'unmodified built page', measurements, consumption, remoteFailures });
          console.log(`PASS ${engine} ${route.url} ${width}px ${route.slides ? `${route.slides} slides + print roles` : 'page'}`);
        } catch (error) {
          await page.screenshot({ path: path.join(out, `${key}-FAIL.png`), fullPage: !route.slides }).catch(() => {});
          failures.push({ engine, route: route.url, width, error: error.message });
          console.error(`FAIL ${engine} ${route.url} ${width}px: ${error.message}`);
        } finally { await context.close(); }
      }
      // Exercise the standalone host fallback as an actual HTTP 404 response.
      const missing = await browser.newPage({ viewport: { width: 440, height: 956 } });
      try {
        assert.equal((await missing.goto(origin + BASE + '__standards_missing__/')).status(), 404);
        assertSurface(await readSurface(missing));
        await missing.screenshot({ path: path.join(out, `${engine}-real-404-440.png`), fullPage: true });
      } finally { await missing.close(); }
    } finally { await browser.close(); }
  }
  // Stop at the first failed PDF contract, retaining every completed render.
  if (failures.length === 0) for (const route of routes.filter(route => route.role === 'slide')) await runPrint(route);
} finally {
  server.closeAllConnections(); server.close();
  writeFileSync(path.join(out, 'measurements.json'), JSON.stringify({ source, standard: STANDARD, routes, rows, redirects, negativeFixtures, printRuns, failures }, null, 2) + '\n');
}
assert.deepEqual(failures, [], 'every candidate route and slide must pass');
assert.equal(rows.length, routes.length * 4);
assert.equal(printRuns.length, routes.filter(route => route.role === 'slide').length);
console.log(`PASS ${routes.length} HTML, ${rows.length} route/engine/viewport renders, ${printRuns.length} real PDF print regressions`);
