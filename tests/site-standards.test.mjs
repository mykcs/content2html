import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { formatCalendar, parseCalendar, formatPeriod, splitLogLabel } from '../src/lib/calendar.mjs';
import { root, STANDARD, inspectSource, inspectHtml, checkStandards } from '../scripts/check-site-standards.mjs';
const css = `:root{--site-design-system:${STANDARD}}body{font-family:var(--type-font-serif);font-size:var(--type-prose)}`;
const html = body => `<html lang="zh" data-design-system="${STANDARD}" data-page-role="longform"><body class="longform"><main id="main">${body}</main></body></html>`;
test('calendar labels preserve year/month/day precision without timezone coercion', () => {
  for (const [raw, zh] of [['2026','2026年'],['2026-06','2026年6月'],['2026-06-17','2026年6月17日'],['2000-02-29','2000年2月29日']]) {
    assert.equal(formatCalendar(raw,'zh'),zh); assert.equal(formatCalendar(raw,'en'),raw);
  }
  assert.equal(parseCalendar('2026-06').precision,'month');
  for (const raw of ['0000','1900-02-29','2026-02-29','2026-13','2026-00-01','2026-04-31','2026-06-00','2026-6-17','2026/06/17','June 17, 2026','2026-06-17T23:30:00-12:00']) assert.throws(() => formatCalendar(raw));
  assert.throws(() => formatCalendar('2026-06-17','fr'));
});
test('period labels project only known calendar boundaries and retain their note', () => {
  assert.equal(formatPeriod('2026-06-04 ~ 2026-06-17 (最近 2 周)','zh'),'2026年6月4日 至 2026年6月17日 (最近 2 周)');
  assert.equal(formatPeriod('2026-06 ~ 2026-07','en'),'2026-06 – 2026-07');
  assert.throws(() => formatPeriod('2026-07-02 ~ 2026-06-01'));
  assert.throws(() => formatPeriod('2026-06 ~ 2026-07-01'));
  assert.deepEqual(splitLogLabel('[2026-06-12] fix: CASE-20260612, original 2026-06-12'), { date:'2026-06-12', message:'fix: CASE-20260612, original 2026-06-12' });
  assert.deepEqual(splitLogLabel('[WIP] paper 2603.12109'), { date:null, message:'[WIP] paper 2603.12109' });
});
test('source gate rejects independent font/line/spacing/measure rules and unknown tokens', () => {
  for (const css of ['main{font-size:17px}', 'p{line-height:1.13}', '.card{padding:13px}', '.body{max-width:77rem}', 'main{font-family:cursive}', 'p{font-size:var(--type-does-not-exist)}', 'p{font-size:calc(var(--type-body) + 9px)}', 'p{font-size:var(--leading-body)}', 'p{font-family:var(--type-font-serif), cursive}', 'p{line-height:calc(var(--leading-body) + .4)}', '.body{max-width:77ch}', '.card{padding:13pt}', ':root{--type-body:17px}']) assert.ok(inspectSource(css,'fixture.css').length,css);
  assert.ok(inspectSource('<main class="text-[17px]">Bad</main>').length);
  assert.ok(inspectSource('<main class="text-sm max-w-5xl">Bad</main>').length);
  assert.deepEqual(inspectSource('main{font:inherit;padding:calc(var(--space-unit) * 4);max-width:var(--measure-reading)}','fixture.css'),[]);
});
test('a correct shell with an independently styled main still fails', () => {
  const good = html('<h1>Heading</h1><p>Body</p>');
  assert.deepEqual(inspectHtml(good,css),[]);
  assert.ok(inspectHtml(html('<h1 style="font-size:17px">Heading</h1>'),css).length);
  assert.ok(inspectHtml(good.replace('class="longform"','class="custom-page"'),css).length);
  assert.ok(inspectHtml(good,'body{font:16px serif}').length);
  assert.ok(inspectHtml(good.replace('data-design-system=', 'data-unused='),css).length);
});
test('raw named, slash, ISO and spaced CJK dates fail outside a declared date/quote/identifier boundary', () => {
  for (const date of ['2026-06-17','06/17/2026','2026/06/17','June 17, 2026','JUNE 2026','2026 年 6 月 17 日','2026年6月17日']) assert.ok(inspectHtml(html(`<p>${date}</p>`),css).length,date);
  const date = '<time datetime="2026-06-17" data-calendar-value="2026-06-17" data-calendar-kind="date" data-calendar-lang="zh">2026年6月17日</time>';
  assert.deepEqual(inspectHtml(html(date),css),[]);
  assert.ok(inspectHtml(html(date.replace('2026年6月17日','2026/06/17')),css).length);
  assert.deepEqual(inspectHtml(html('<code>2026-06-17T01:00:00Z</code><script type="application/ld+json">{"datePublished":"2026-06-17"}</script><a href="/progress/2026-06-17/">archive</a>'),css),[]);
  assert.ok(inspectHtml(html('<span data-source-quote="commit-message">Made up June 17, 2026</span>'),css).length);
});
test('the source gate and standalone generated style owner stay coherent', () => {
  assert.ok(checkStandards({output:false}).sourceFiles >= 26);
});
test('manual browser gate is exact-ref and cannot publish a feature branch', () => {
  const workflow = fs.readFileSync(path.join(root,'.github/workflows/deploy.yml'),'utf8');
  for (const expected of ['expected_sha:', 'git rev-parse HEAD', 'npm run test:standards:browser', "github.ref == 'refs/heads/main'", 'ubuntu-24.04', 'retention-days: 3']) assert.ok(workflow.includes(expected), expected);
  assert.ok(!workflow.includes('pull_request:') && !workflow.includes('self-hosted'));
  const config = fs.readFileSync(path.join(root,'astro.config.mjs'),'utf8');
  assert.ok(config.includes("base: '/content2html'") && config.includes('assetsInlineLimit: 0'));
});
