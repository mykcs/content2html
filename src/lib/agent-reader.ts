import { getCollection } from 'astro:content';

const origin = 'https://mykcs.github.io';
const base = import.meta.env.BASE_URL.replace(/\/$/, '');
export const readerPath = (suffix: string) => base + '/' + suffix.replace(/^\//, '');
export const readerUrl = (suffix: string) => new URL(readerPath(suffix), origin).href;

export async function agentCatalog() {
  const papers = (await getCollection('papers') as Array<{id:string;data:{title_zh:string;title_en:string;arxiv_id?:string}}>).sort((a,b) => a.id.localeCompare(b.id));
  const progress = (await getCollection('progress') as Array<{id:string;data:{project_name:string}}>).sort((a,b) => a.id.localeCompare(b.id));
  return {
    name: 'content2html',
    purpose: 'Bilingual paper summaries, presentation decks and archived progress reports.',
    languages: ['zh', 'en'],
    indexes: { zh: readerUrl('zh/'), en: readerUrl('en/') },
    guides: { zh: readerUrl('zh/agent/'), en: readerUrl('en/agent/'), rules: readerUrl('agent/SKILL.md') },
    papers: papers.map(({id,data}) => ({
      title: {zh: data.title_zh, en: data.title_en},
      original: data.arxiv_id ? 'https://arxiv.org/abs/' + data.arxiv_id : null,
      pages: Object.fromEntries(['zh','en'].map(lang => [lang, {
        read: readerUrl(lang + '/paper/' + id + '/summary/'),
        slides: readerUrl(lang + '/paper/' + id + '/slide/'),
      }])),
    })),
    progress: progress.map(({id,data}) => ({
      title: data.project_name,
      pages: Object.fromEntries(['zh','en'].map(lang => [lang, {
        read: readerUrl(lang + '/progress/' + id + '/report/'),
        slides: readerUrl(lang + '/progress/' + id + '/slide/'),
      }])),
    })),
  };
}

const link = (label: string, url: string) => '- [' + label.replace(/[\[\]\r\n]/g, ' ') + '](' + url + ')';
export async function llmsText() {
  const c = await agentCatalog();
  return [
    '# content2html',
    '',
    '> ' + c.purpose,
    '',
    '## Read first',
    link('中文目录', c.indexes.zh), link('English index', c.indexes.en),
    link('给 Agent 读', c.guides.zh), link('For agents', c.guides.en),
    link('Agent reading rules', c.guides.rules),
    link('Machine-readable catalog', readerUrl('agent/site.json')),
    '',
    '## Published paper summaries and slide decks',
    ...c.papers.flatMap(p => ['### ' + (p.title.zh + ' / ' + p.title.en).replace(/[\r\n]/g,' '),
      ...['zh','en'].flatMap(lang => [link(lang + ' summary', p.pages[lang].read),link(lang + ' slides',p.pages[lang].slides)]),
      ...(p.original ? [link('Original paper',p.original)] : []), '']),
    '## Published archived progress',
    ...c.progress.flatMap(p => ['### ' + p.title.replace(/[\r\n]/g,' '),
      ...['zh','en'].flatMap(lang => [link(lang + ' report',p.pages[lang].read),link(lang + ' slides',p.pages[lang].slides)]), '']),
    'The catalog contains public titles and links only. Open the linked pages for content and source evidence. Archived progress is not live status.',
    '',
  ].join('\n');
}
