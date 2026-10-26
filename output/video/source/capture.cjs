const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const {performance}=require('node:perf_hooks');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../../..');
const out=path.resolve(__dirname,'..');
fs.mkdirSync(path.join(out,'captures'),{recursive:true});
const rewrites=new Map(require(path.join(root,'vercel.json')).rewrites.map(r=>[r.source,r.destination]));
const territory=require(path.join(root,'api/territory'));
const cacheFile=path.join(out,'captures','source-responses.json');
const cache=new Map((fs.existsSync(cacheFile)?JSON.parse(fs.readFileSync(cacheFile,'utf8')).responses:[]).filter(([,v])=>v.status===200));
const pending=new Map();
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.woff2':'font/woff2','.svg':'image/svg+xml','.png':'image/png','.pdf':'application/pdf'};
function saveCache(){fs.writeFileSync(cacheFile,JSON.stringify({capturedAt:new Date().toISOString(),note:'Unmodified real API responses reused during filming to avoid recording network wait time.',responses:[...cache.entries()]},null,2))}
async function apiResponse(query){
 const key=new URLSearchParams(query).toString();if(cache.has(key))return cache.get(key);
 if(pending.has(key))return pending.get(key);
 const promise=new Promise(async resolve=>{
  let status=200;const res={status:n=>{status=n;return res},setHeader(){},json:data=>{const result={status,data};cache.set(key,result);saveCache();resolve(result)}};
  try{await territory({query,method:'GET'},res)}catch(e){res.status(500).json({error:e.message})}
 });pending.set(key,promise);return promise;
}
const server=http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname==='/api/territory'){
  const result=await apiResponse(Object.fromEntries(url.searchParams));res.writeHead(result.status,{'Content-Type':'application/json'});res.end(JSON.stringify(result.data));return;
 }
 const relative=url.pathname==='/__studio'?'/output/video/source/studio.html':rewrites.get(url.pathname)||(url.pathname==='/'?'/index.html':decodeURIComponent(url.pathname));
 const file=path.resolve(root,'.'+relative);
 if(!file.startsWith(root+path.sep)||relative.split('/').some(s=>s.startsWith('.'))||!mime[path.extname(file)]||!fs.existsSync(file)){res.writeHead(404).end();return}
 res.setHeader('Content-Type',mime[path.extname(file)]);fs.createReadStream(file).pipe(res);
});
let browser;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const recording=process.argv.includes('--record');
 browser=await chromium.launch({headless:true,...(process.env.DATATERRA_CHROMIUM_PATH?{executablePath:process.env.DATATERRA_CHROMIUM_PATH}:{}),args:['--autoplay-policy=no-user-gesture-required']});
 const context=await browser.newContext({viewport:{width:1920,height:1080},deviceScaleFactor:1,colorScheme:'dark',...(recording?{recordVideo:{dir:path.join(out,'captures'),size:{width:1920,height:1080}}}:{})});
 await context.addInitScript(()=>{try{localStorage.setItem('dataterra-theme','dark');localStorage.setItem('dataterra-language','pt-BR')}catch{}});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:'+server.address().port+'/__studio',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.fonts.status==='loaded');
 const frame=await (await page.$('#app')).contentFrame();
 await frame.waitForFunction(()=>typeof regionSearchOptions!=='undefined'&&regionSearchOptions.length>0&&typeof siteAnalysis!=='undefined'&&siteAnalysis,null,{timeout:60000});
 await frame.evaluate(()=>document.fonts.ready);
 const region=await frame.evaluate(()=>regionSearchOptions.find(x=>x.name==='Barueri'));
 const initialRegion=await frame.evaluate(()=>regionSearchOptions.find(x=>x.name==='Campinas'&&x.state==='SP'&&x.source==='candidate'));
 console.log(JSON.stringify({phase:'loaded',region}));
 if(!region)throw new Error('Barueri not found');
 // Warm the two real scenarios concurrently. No values or warnings are fabricated.
 const lat=Number(region.lat).toFixed(5),lng=Number(region.lng).toFixed(5);
 await Promise.all([
  ...[100,50].flatMap(radius=>['environment','basin','transmission','climate'].map(kind=>apiResponse({kind,lat,lng,radius:String(radius)}))),
  ...['environment','basin','transmission','climate'].map(kind=>apiResponse({kind,lat:Number(initialRegion.lat).toFixed(5),lng:Number(initialRegion.lng).toFixed(5),radius:'100'}))
 ]);
 console.log(JSON.stringify({phase:'sources-ready',responses:[...cache.entries()].map(([key,v])=>({key,status:v.data.status}))}));
 await frame.locator('[data-tab-target="controls-region"]').click();
 await frame.locator('#regionSearch').fill(region.label);
 await frame.locator('#regionSearch').press('Enter');
 await frame.waitForTimeout(1800);
 await frame.waitForFunction(()=>Object.values(liveTerritory).every(x=>x.status!=='loading'),null,{timeout:60000});
 await frame.locator('[data-tab-target="result-summary"]').click();
 await page.screenshot({path:path.join(out,'captures','layout-review.png')});
 const geometry=await frame.evaluate(()=>({region:regionSearchOptions.find(x=>x.name==='Barueri'),bounds:document.querySelector('#map').getBoundingClientRect().toJSON(),site:simulatedSite,scores:siteAnalysis.groupScores,sources:Object.fromEntries(Object.entries(liveTerritory).map(([k,v])=>[k,v.status]))}));
 fs.writeFileSync(path.join(out,'captures','review.json'),JSON.stringify({geometry,errors},null,2));
 await page.evaluate(()=>{document.getElementById('browser').style.opacity=0;document.getElementById('steps').style.opacity=0;document.getElementById('footnote').style.opacity=0;document.getElementById('pointer').style.opacity=0;renderFinale(3.2)});
 await page.screenshot({path:path.join(out,'captures','flag-review.png')});
 await page.evaluate(()=>renderFinale(8));
 await page.screenshot({path:path.join(out,'captures','logo-review.png')});
 if(!recording){console.log(JSON.stringify({phase:'review-ready',errors,geometry}));await context.close();await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));return}
 let pointer={x:1055,y:600};
 async function point(selector,offset={x:.5,y:.5}){const box=await frame.locator(selector).boundingBox();if(!box)throw new Error('No box: '+selector);return{x:box.x+box.width*offset.x,y:box.y+box.height*offset.y}}
 async function move(target,ms=600){
  const start={...pointer};const at=performance.now();
  while(true){const progress=Math.min(1,(performance.now()-at)/ms),e=progress*progress*(3-2*progress);const bend=Math.sin(progress*Math.PI)*Math.min(45,Math.abs(target.x-start.x)*.06);pointer={x:start.x+(target.x-start.x)*e,y:start.y+(target.y-start.y)*e-bend};
   await page.evaluate(p=>pointerAt(p.x,p.y),pointer);await page.mouse.move(pointer.x,pointer.y);if(progress===1)break;await sleep(16);
  }
 }
 async function click(){await page.evaluate(()=>pulse());await page.mouse.click(pointer.x,pointer.y)}
 async function prepare(){
  await page.evaluate(()=>resetStudio());
  await frame.evaluate(id=>{map.stop();updateSiteRadius(100);selectRegion(id);map.stop();activatePanelTabByTarget('controls-region');activatePanelTabByTarget('result-summary');document.querySelector('#analysis-results').scrollTop=0;map.setView([-22.7,-47.4],6,{animate:false})},initialRegion.id);
  await frame.waitForTimeout(1500);await frame.waitForFunction(()=>Object.values(liveTerritory).every(x=>x.status!=='loading'),null,{timeout:60000});
  pointer={x:1030,y:590};await page.evaluate(p=>pointerAt(p.x,p.y),pointer);await page.mouse.move(pointer.x,pointer.y);
  await page.evaluate(()=>document.activeElement?.blur());await sleep(400);
 }
 let start;
 const until=async seconds=>{const remaining=start+seconds*1000-performance.now();if(remaining>0)await sleep(remaining)};
 async function searchFlow(speed=1){
  await until(.25*speed);await move(await point('#regionSearch'),550*speed);await click();
  await frame.locator('#regionSearch').press('Meta+A');
  await frame.locator('#regionSearch').pressSequentially('Barueri - SP',{delay:48*speed});
  await until(1.65*speed);await move(await point('#focusRegion'),430*speed);await click();
  await until(3.2*speed);await page.evaluate(()=>setStep(1));await move(await point('[data-tab-target="controls-site"]'),520*speed);await click();
  await until(4.05*speed);await move(await point('#siteRadiusInput'),420*speed);await click();
  await frame.locator('#siteRadiusInput').press('Meta+A');await frame.locator('#siteRadiusInput').fill('50');
  await frame.locator('#siteRadiusInput').press('Tab');
  await until(5.45*speed);await page.evaluate(()=>setStep(2));
  await move(await point('[data-tab-target="result-summary"]'),730*speed);await click();
  const box=await frame.locator('#selectedScoreGroups').boundingBox();await page.evaluate(box=>highlight(box),box);
  await move(await point('#selectedScoreGroups',{x:.64,y:.83}),440*speed);
 }
 await prepare();await page.evaluate(()=>cue('#ff00aa'));start=performance.now();
 await searchFlow();await until(9.8);await page.evaluate(()=>highlight(null));await until(10);await page.evaluate(()=>cue(null));
 console.log(JSON.stringify({phase:'first-take',seconds:(performance.now()-start)/1000}));
 await prepare();await page.evaluate(()=>cue('#00ffff'));start=performance.now();
 await searchFlow(.78);await until(5.65);await page.evaluate(()=>highlight(null));
 const close=await page.locator('#close-tab').boundingBox();await move({x:close.x+close.width/2,y:close.y+close.height/2},620);await click();
 const closeAt=(performance.now()-start)/1000;
 await until(16);await page.evaluate(()=>cue(null));await sleep(350);
 console.log(JSON.stringify({phase:'second-take',closeAt,seconds:(performance.now()-start)/1000,errors}));
 const video=page.video();await page.close();await context.close();await video.saveAs(path.join(out,'captures','raw-takes.webm'));
 fs.writeFileSync(path.join(out,'captures','recording.json'),JSON.stringify({createdAt:new Date().toISOString(),width:1920,height:1080,clips:[{name:'dataterra-01-demonstracao',cue:'#ff00aa',duration:10},{name:'dataterra-02-brasil-na-marca',cue:'#00ffff',duration:16,closeAt}],errors},null,2));
 await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));
})().catch(async e=>{console.error(e);if(browser)await browser.close();server.closeAllConnections();server.close();process.exitCode=1});
