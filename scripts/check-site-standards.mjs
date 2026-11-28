import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import postcss from 'postcss';
import { formatCalendar, formatPeriod, splitLogLabel } from '../src/lib/calendar.mjs';
import { syncMessageStyles, messageStyles } from './sync-message-styles.mjs';
import { checkAgentReader } from './check-agent-reader.mjs';
import { checkAllSlideContent } from './check-slide-content.mjs';
export const root = fileURLToPath(new URL('../', import.meta.url));
export const STANDARD = 'content2html-20261120';
export const BASE = '/content2html/';
export const tokens = fs.readFileSync(path.join(root, 'src/styles/tokens.css'), 'utf8');
export const tokenNames = [...new Set([...tokens.matchAll(/(--[a-z][a-z-]+)\s*:/g)].map(match => match[1]))];
const tokenSet = new Set(tokenNames);
const owned = /^--(?:type-|weight-|leading-|tracking-|space-|measure-|slide-|print-)/;
export const hash = bytes => createHash('sha256').update(bytes).digest('hex');
export function filesBelow(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? filesBelow(path.join(dir, entry.name)) : [path.join(dir, entry.name)]).sort();
}
export function sourceIdentity() {
  return { sha: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
    dirty: Boolean(execFileSync('git', ['status', '--porcelain', '--untracked-files=normal'], { cwd: root, encoding: 'utf8' }).trim()) };
}
export function inspectCss(css, label = 'CSS') {
  const errors = [];
  const ast = postcss.parse(css, { from: label });
  ast.walkDecls(decl => {
    for (const match of decl.value.matchAll(/var\((--[a-z-]+)/g)) {
      if (owned.test(match[1]) && !tokenSet.has(match[1])) errors.push(`${label}: unknown token ${match[1]}`);
    }
    const adapter = decl.parent.type === 'atrule' && decl.parent.name === 'theme' && decl.parent.params === 'inline' && !tokenSet.has(decl.prop) && (decl.value === 'initial' || /^var\(--[a-z-]+\)$/.test(decl.value));
    if (owned.test(decl.prop) && !adapter) errors.push(`${label}: duplicated token owner ${decl.prop}`);
    if (decl.prop.startsWith('--')) return;
    const { prop, value } = decl;
    const typePrefix = { 'font-family': 'type-font-', 'font-size': '(?:type-(?!font-)|print-root)', 'font-weight': 'weight-', 'line-height': 'leading-', 'letter-spacing': 'tracking-' }[prop];
    if (prop === 'font' && value !== 'inherit') errors.push(`${label}: font shorthand bypasses semantic roles`);
    if (typePrefix && value !== 'inherit' && !new RegExp(`^var\\(--${typePrefix}[a-z-]*\\)$`).test(value)) errors.push(`${label}: ${decl.parent.selector} ${prop}:${value} bypasses typography`);
    if (/^(padding|margin|gap|column-gap|row-gap)(?:-(?:top|right|bottom|left|inline|block))?$/.test(prop) && /[\d.](?:px|rem|em|mm|cm|in|ch|ex|pt)\b/.test(value)) errors.push(`${label}: ${decl.parent.selector} ${prop}:${value} bypasses spacing`);
    if (prop === 'max-width' && /[\d.](?:px|rem|em|ch|ex|mm|cm|in|pt)\b/.test(value)) errors.push(`${label}: ${decl.parent.selector} max-width:${value} bypasses measure`);
  });
  return errors;
}
export function inspectSource(source, label = 'source.astro') {
  if (label.endsWith('tokens.css')) return [];
  const errors = [];
  source = source.replace(/<!-- BEGIN SHARED MESSAGE STYLES -->[\s\S]*?<!-- END SHARED MESSAGE STYLES -->/, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '');
  const blocks = label.endsWith('.css') ? [source] : [...source.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)].map(match => match[1]);
  for (const css of blocks) errors.push(...inspectCss(css, label));
  for (const match of source.matchAll(/style="([^"]+)"/g)) errors.push(...inspectCss(`inline{${match[1]}}`, label));
  if (/\btext-(?:xs|sm|base|lg|xl|\d+xl)\b|\b(?:text|leading|tracking|font)-\[/.test(source)) errors.push(`${label}: nonsemantic typography utility`);
  if (/\bmax-w-(?:xs|sm|md|lg|xl|\d+xl|\[)/.test(source)) errors.push(`${label}: nonsemantic measure utility`);
  if (/\bfont-size=["']\d/.test(source)) errors.push(`${label}: unowned SVG typography`);
  if (source.includes('data-source-quote=') && !label.endsWith('ProgressLogText.astro')) errors.push(`${label}: only the archived progress message renderer may mark quoted evidence`);
  return errors;
}
export function decode(text) {
  return text.replace(/&#(?:x([\da-f]+)|(\d+));/gi, (_, hex, dec) => String.fromCodePoint(parseInt(hex || dec, hex ? 16 : 10)))
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;|&#39;/g, "'").replace(/&nbsp;/g, ' ');
}
export const textOf = html => decode(html.replace(/<!--[\s\S]*?-->/g, '').replace(/<[^>]+>/g, '')).trim();
const attr = (tag, name) => decode(new RegExp(`\\b${name}=["']([^"']*)["']`).exec(tag)?.[1] ?? '');
export function datesIn(html) {
  return [...html.matchAll(/<(time|span)\b([^>]*\bdata-calendar-value=[^>]*)>([\s\S]*?)<\/\1>/g)].map(match => ({
    value: attr(match[2], 'data-calendar-value'), lang: attr(match[2], 'data-calendar-lang'), kind: attr(match[2], 'data-calendar-kind'), text: textOf(match[3]), datetime: attr(match[2], 'datetime') }));
}
const periodEntries = filesBelow(path.join(root, 'src/content/progress')).filter(file => file.endsWith('.json')).map(file => ({ id: path.basename(file, '.json'), ...JSON.parse(fs.readFileSync(file, 'utf8')) }));
const quotedMessages = new Set(periodEntries.flatMap(entry => [...entry.done, ...entry.doing].map(value => splitLogLabel(value).message)));
export function inspectHtml(html, css, label = 'HTML') {
  const errors = [];
  const htmlTag = /<html\b[^>]*>/.exec(html)?.[0] ?? '';
  const role = attr(htmlTag, 'data-page-role');
  if (attr(htmlTag, 'data-design-system') !== STANDARD || !['slide', 'longform', 'message', 'redirect'].includes(role)) errors.push(`${label}: missing standards layout/role`);
  if (!css.includes(`--site-design-system:${STANDARD}`) && !css.includes(`--site-design-system: ${STANDARD}`)) errors.push(`${label}: stylesheet missing canonical owner`);
  if (!/font-family:\s*var\(--type-font-/.test(css) || !/font-size:\s*var\(--type-/.test(css)) errors.push(`${label}: stylesheet missing real typography consumers`);
  const bodyTag = /<body\b[^>]*>/.exec(html)?.[0] ?? '';
  const bodyClass = role === 'slide' ? 'slide-deck' : role === 'longform' ? 'longform' : 'message-page';
  if (!attr(bodyTag, 'class').split(/\s+/).includes(bodyClass) || !/<main\b[^>]*id=["']main["']/.test(html)) errors.push(`${label}: real body/main does not consume its role`);
  for (const match of html.matchAll(/style="([^"]+)"/g)) errors.push(...inspectCss(`inline{${decode(match[1])}}`, label));
  for (const date of datesIn(html)) {
    try {
      if (!['date', 'period'].includes(date.kind) || date.text !== (date.kind === 'period' ? formatPeriod : formatCalendar)(date.value, date.lang) || (date.kind === 'date' && date.datetime !== date.value)) errors.push(`${label}: nonstandard calendar ${JSON.stringify(date)}`);
    } catch { errors.push(`${label}: invalid calendar ${JSON.stringify(date)}`); }
  }
  let visible = /<body\b[^>]*>([\s\S]*?)<\/body>/i.exec(html)?.[1] ?? html;
  visible = visible.replace(/<(script|style|pre|code|math)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<(time|span)\b[^>]*data-calendar-value=[^>]*>[\s\S]*?<\/\1>/g, '')
    .replace(/<span\b[^>]*data-source-quote=[^>]*>([\s\S]*?)<\/span>/g, (whole, text) => {
      if (!quotedMessages.has(textOf(text))) errors.push(`${label}: unknown quote boundary`);
      return '';
    })
    .replace(/<span\b[^>]*data-source-identifier=[^>]*>([\s\S]*?)<\/span>/g, (whole, text) => {
      if (!periodEntries.some(entry => entry.id === textOf(text))) errors.push(`${label}: unknown identifier boundary`);
      return '';
    });
  visible = textOf(visible);
  if (/\b\d{4}[-/.]\d{1,2}(?:[-/.]\d{1,2})?\b|\b\d{1,2}[-/]\d{1,2}[-/]\d{4}\b|\d{4}\s*年\s*\d{1,2}\s*月(?:\s*\d{1,2}\s*日)?|\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+(?:\d{1,2},?\s+)?\d{4}\b/i.test(visible)) errors.push(`${label}: visible calendar text bypasses DateText`);
  return errors;
}
export function routeInventory(dist = path.join(root, 'dist')) {
  return filesBelow(dist).filter(file => file.endsWith('.html')).map(file => {
    const html = fs.readFileSync(file, 'utf8');
    const relative = path.relative(dist, file).replaceAll(path.sep, '/');
    const sheets = [...html.matchAll(/<link\b[^>]*>/g)].filter(match => attr(match[0], 'rel') === 'stylesheet').map(match => attr(match[0], 'href'));
    const inline = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)].map(match => match[1]);
    const css = [...inline, ...sheets.map(href => {
      if (!href.startsWith(BASE)) throw new Error(`${relative}: nonlocal stylesheet ${href}`);
      return fs.readFileSync(path.join(dist, href.slice(BASE.length)), 'utf8');
    })].join('\n');
    const refresh = [...html.matchAll(/<meta\b[^>]*>/g)].find(match => attr(match[0], 'http-equiv').toLowerCase() === 'refresh');
    const target = refresh ? attr(refresh[0], 'content').replace(/^\d+;\s*url=/i, '') : null;
    const role = attr(/<html\b[^>]*>/.exec(html)?.[0] ?? '', 'data-page-role');
    return { file: relative, url: BASE + relative.replace(/index\.html$/, ''), role, target,
      sha256: hash(html), dates: datesIn(html), slides: [...html.matchAll(/\bdata-page="\d+"/g)].length,
      stylesheets: sheets, errors: inspectHtml(html, css, relative) };
  });
}
export function checkStandards({ output = true } = {}) {
  syncMessageStyles({ check: true });
  const sources = [...filesBelow(path.join(root, 'src')).filter(file => /\.(css|astro)$/.test(file)), path.join(root, 'public/404.html')];
  const errors = sources.flatMap(file => inspectSource(fs.readFileSync(file, 'utf8'), path.relative(root, file)));
  let routes = [];
  if (output) {
    routes = routeInventory();
    errors.push(...routes.flatMap(route => route.errors));
    const required = ['index.html', '404.html', ...['en', 'zh'].flatMap(lang => [
      `${lang}/index.html`, `${lang}/404/index.html`, `${lang}/agent/index.html`,
      ...filesBelow(path.join(root, 'src/content/papers')).filter(file => file.endsWith('.json')).flatMap(file => ['slide', 'summary'].map(type => `${lang}/paper/${path.basename(file, '.json')}/${type}/index.html`)),
      ...periodEntries.flatMap(entry => ['slide', 'report'].map(type => `${lang}/progress/${entry.id}/${type}/index.html`)),
    ])];
    for (const file of required) if (!routes.some(route => route.file === file)) errors.push(`Missing route ${file}`);
    errors.push(...checkAgentReader(path.join(root, "dist"), required.filter(file=>/^(zh|en)\/(paper|progress)\//.test(file))));
    errors.push(...checkAllSlideContent(path.join(root, 'dist'), path.join(root, 'src/content/papers')));
    if (!fs.readFileSync(path.join(root, 'dist/404.html'), 'utf8').includes(messageStyles())) errors.push('Built 404 embeds stale token/message owners');
    fs.mkdirSync(path.join(root, 'test-results/standards'), { recursive: true });
    fs.writeFileSync(path.join(root, 'test-results/standards/route-inventory.json'), JSON.stringify({ source: sourceIdentity(), routes }, null, 2) + '\n');
  }
  if (errors.length) throw new Error(errors.join('\n'));
  return { sourceFiles: sources.length, html: routes.length, decks: routes.filter(route => route.role === 'slide').length };
}
if (process.argv[1] === fileURLToPath(import.meta.url)) console.log('Site standards:', checkStandards({ output: !process.argv.includes('--source-only') }));
