import fs from 'node:fs';
import path from 'node:path';
export function checkAgentReader(dist, expectedContentRoutes) {
  const errors = [];
  const expect = (condition, message) => { if (!condition) errors.push('Agent reader: ' + message); };
  try {
    const catalog = JSON.parse(fs.readFileSync(path.join(dist,'agent/site.json'),'utf8'));
    const llms = fs.readFileSync(path.join(dist,'llms.txt'),'utf8');
    const rules = fs.readFileSync(path.join(dist,'agent/SKILL.md'),'utf8');
    const exactKeys = (object, keys) => JSON.stringify(Object.keys(object).sort()) === JSON.stringify([...keys].sort());
    expect(exactKeys(catalog,['name','purpose','languages','indexes','guides','papers','progress']), 'unexpected catalog field');
    expect(catalog.name === 'content2html', 'incorrect catalog identity');
    expect(llms.startsWith('# content2html\n'), 'missing readable directory');
    expect(rules.startsWith('# content2html'), 'missing rules');
    const links = [...Object.values(catalog.indexes),...Object.values(catalog.guides)];
    for (const [kind,entries] of [['paper',catalog.papers],['progress',catalog.progress]]) {
      for (const entry of entries) {
        expect(exactKeys(entry,kind==='paper'?['title','original','pages']:['title','pages']), 'non-public metadata in ' + kind);
        expect(exactKeys(entry.pages,['zh','en']), 'locale coverage');
        for (const locale of ['zh','en']) {
          expect(exactKeys(entry.pages[locale],['read','slides']), 'missing reading/slides pair');
          links.push(...Object.values(entry.pages[locale]));
        }
      }
    }
    for (const file of expectedContentRoutes) {
      expect(links.includes("https://mykcs.github.io/content2html/"+file.replace(/index\.html$/, "")), "catalog omitted "+file);
    }
    for (const url of links) {
      const parsed = new URL(url);
      expect(parsed.origin === 'https://mykcs.github.io' && parsed.pathname.startsWith('/content2html/'), 'incorrect canonical base ' + url);
      const relative = parsed.pathname.slice('/content2html/'.length);
      const target = path.resolve(dist,relative+(relative.endsWith('/')?'index.html':''));
      expect(target.startsWith(path.resolve(dist)+path.sep) && fs.existsSync(target), 'missing target ' + url);
      expect(llms.includes(url), 'directory missing ' + url);
    }
    for (const locale of ['zh','en']) {
      const html = fs.readFileSync(path.join(dist,locale,'index.html'),'utf8');
      expect(html.includes('/content2html/'+locale+'/agent/'), 'index missing reader link');
      const guide = fs.readFileSync(path.join(dist,locale,'agent/index.html'),'utf8');
      expect(guide.includes('/content2html/agent/reader.js') && guide.includes('/content2html/llms.txt'), 'reader missing base-safe assets');
    }
    expect(catalog.papers.length > 0 && catalog.progress.length > 0,'empty source projection');
  } catch (error) { errors.push('Agent reader: '+error.message); }
  return errors;
}
