import {createServer} from 'node:http';
import {readFileSync,statSync} from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const dist=path.resolve('dist');
const types={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.json':'application/json','.svg':'image/svg+xml','.woff2':'font/woff2','.png':'image/png'};
const server=createServer((req,res)=>{try{
 const url=new URL(req.url,'http://local');assert.ok(url.pathname.startsWith('/content2html/'));
 let f=path.resolve(dist,url.pathname.slice('/content2html/'.length));assert.ok(f===dist||f.startsWith(dist+'/'));
 if(statSync(f).isDirectory())f=path.join(f,'index.html');
 res.setHeader('Content-Type',types[path.extname(f)]||'application/octet-stream');res.end(readFileSync(f));
}catch{res.writeHead(404).end()}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin='http://127.0.0.1:'+server.address().port+'/content2html/';
const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
const axe=readFileSync(process.env.AXE_PATH||'node_modules/axe-core/axe.min.js','utf8');
try{
 for(const lang of ['en','zh'])for(const width of [320,390,440,1440]){
 const mobile=width<761;
 const ctx=await browser.newContext({viewport:{width,height:mobile?956:900},...(mobile?{isMobile:true,hasTouch:true,deviceScaleFactor:3}:{})});
 const p=await ctx.newPage();
 await p.goto(origin+lang+'/paper/2603.12109/slide/',{waitUntil:'domcontentloaded'});
 await p.waitForFunction(()=>document.body.dataset.sourceLinksReady==='true');
 const panel=p.locator('#slide-source-links');
 const originals=p.locator('.slide-page.active .slide-info-corner a[data-mobile-source]');
 const targets=await originals.evaluateAll(links=>links.map(a=>a.href));
 assert.ok(targets.length>=2);
 if(mobile){
  assert.ok(await panel.isVisible());assert.ok(!(await originals.first().isVisible()));
  await panel.locator('summary').click();
  const links=panel.locator('a');
  assert.deepEqual(await links.evaluateAll(a=>a.map(x=>x.href)),targets);
  assert.ok(await links.evaluateAll(a=>a.every(x=>{const r=x.getBoundingClientRect();return r.width>=24&&r.height>=44})));
  await p.evaluate(axe);
  const targetWarnings=await p.evaluate(async()=>{const r=await axe.run(document,{runOnly:{type:'rule',values:['target-size']}});return r.violations.flatMap(v=>v.nodes.map(n=>n.target))});
  assert.ok(!targetWarnings.some(t=>JSON.stringify(t).includes('slide-info-corner')||JSON.stringify(t).includes('slide-source-links')),JSON.stringify(targetWarnings));
  await panel.locator('summary').focus();await p.keyboard.press('Space');assert.ok(!(await panel.evaluate(e=>e.open)));
  await p.locator('body').click({position:{x:5,y:5}});await p.keyboard.press('ArrowRight');
  assert.equal(await panel.isVisible(),false);
  await p.keyboard.press('Home');assert.ok(await panel.isVisible());
 }else{assert.equal(await panel.isVisible(),false);assert.ok(await originals.first().isVisible());}
 const geometry=await p.locator('.slide-page.active').evaluate(e=>[e.offsetWidth,e.offsetHeight]);
 assert.deepEqual(geometry,[1920,1080]);
 await p.emulateMedia({media:'print'});
 assert.equal(await panel.isVisible(),false);assert.ok(await originals.first().isVisible());
 assert.equal(await p.locator('.slide-source-text').first().isVisible(),false);
 console.log(lang,width,'PASS metadata links and original print source geometry');
 await ctx.close();
 }
}finally{await browser.close();await new Promise(r=>server.close(r));}
