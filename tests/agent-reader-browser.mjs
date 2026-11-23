import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync,existsSync,statSync,mkdirSync} from 'node:fs';
import path from 'node:path';
const dist=path.resolve('dist'),base='/content2html/';
const types={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'application/javascript','.txt':'text/plain; charset=utf-8','.md':'text/plain; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.woff2':'font/woff2'};
const server=createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost');
  if (!url.pathname.startsWith(base)) {res.writeHead(404);return res.end();}
  let file=path.resolve(dist,url.pathname.slice(base.length));
  if (!file.startsWith(dist+path.sep) && file!==dist) {res.writeHead(404);return res.end();}
  if (existsSync(file)&&statSync(file).isDirectory())file=path.join(file,'index.html');
  if (!existsSync(file)){res.writeHead(404);return res.end();}
  res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.end(readFileSync(file));
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port;
const expected=['llms.txt','agent/SKILL.md'].map(p=>readFileSync(path.join(dist,p),'utf8').trimEnd()).join('\n\n---\n\n')+'\n';
const evidence=process.env.READER_EVIDENCE_DIR;
if(evidence)mkdirSync(evidence,{recursive:true});
let browser;
try {
  browser=await chromium.launch({headless:true,...(process.env.CHROME_EXECUTABLE?{executablePath:process.env.CHROME_EXECUTABLE}:{})});
  for(const lang of ['zh','en'])for(const [label,viewport,mobile] of [['desktop',{width:1440,height:900},false],['phone',{width:440,height:956},true]]) {
    const ctx=await browser.newContext({viewport,deviceScaleFactor:mobile?3:1,isMobile:mobile,hasTouch:mobile,permissions:['clipboard-read','clipboard-write']});
    const page=await ctx.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(origin+base+lang+'/');
    const link=page.locator('main a[href="'+base+lang+'/agent/"]');
    await link.click();
    await page.waitForFunction(()=>!document.querySelector('#agent-copy-button')?.disabled);
    assert.equal(await page.locator('#agent-context').inputValue(),expected);
    await page.locator('#agent-copy-button').click();
    await page.waitForFunction(()=>document.querySelector('#agent-status').textContent===document.querySelector('#agent-copy').dataset.done);
    assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),expected);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    assert.deepEqual(errors,[]);
    if(evidence)await page.screenshot({path:path.join(evidence,lang+'-'+label+'.png'),fullPage:true});
    console.log(lang+' '+label+': directory click, exact copy, no errors/overflow PASS');
    await ctx.close();
  }
  const ctx=await browser.newContext();
  await ctx.addInitScript(()=>Object.defineProperty(navigator,'clipboard',{value:{writeText:async()=>{throw Error('denied')}}}));
  const page=await ctx.newPage();
  await page.goto(origin+base+'zh/agent/');
  await page.waitForFunction(()=>!document.querySelector('#agent-copy-button')?.disabled);
  await page.locator('#agent-copy-button').click();
  await page.waitForFunction(()=>document.querySelector('#agent-status').textContent===document.querySelector('#agent-copy').dataset.fallback);
  assert.equal(await page.locator('#agent-context').evaluate(el=>el.selectionEnd-el.selectionStart),expected.length);
  await ctx.close();
  const off=await browser.newContext({javaScriptEnabled:false});
  const nojs=await off.newPage();
  await nojs.goto(origin+base+'en/agent/');
  assert.equal(await nojs.locator('#agent-copy-button').isVisible(),false);
  assert.equal(await nojs.locator('main a[href="'+base+'llms.txt"]').isVisible(),true);
  assert.equal((await nojs.request.get(origin+base+'llms.txt')).status(),200);
  assert.equal((await nojs.request.get(origin+base+'agent/SKILL.md')).status(),200);
  await off.close();
  console.log('clipboard-denied and JS-disabled fallbacks PASS');
} finally {
  if(browser)await browser.close();
  await new Promise(resolve=>server.close(resolve));
}
