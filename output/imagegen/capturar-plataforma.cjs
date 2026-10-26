const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('/Users/klayvemguimaraeslealdasilva/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '../..');
const rewrites = new Map(require(path.join(root, 'vercel.json')).rewrites.map(r => [r.source, r.destination]));
const territory = require(path.join(root, 'api/territory'));
const mime = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.woff2':'font/woff2', '.png':'image/png', '.svg':'image/svg+xml' };
const server = http.createServer(async (req,res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/api/territory') {
    req.query = Object.fromEntries(url.searchParams);
    res.status = n => { res.statusCode = n; return res; };
    res.json = data => { res.setHeader('Content-Type','application/json'); res.end(JSON.stringify(data)); };
    try { await territory(req,res); } catch (error) { res.status(500).json({error:error.message}); }
    return;
  }
  const pathname = rewrites.get(url.pathname) || (url.pathname === '/' ? '/index.html' : url.pathname);
  const file = path.resolve(root, '.' + pathname);
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404).end(); return; }
  res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
});
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({headless:true, executablePath:'/Users/klayvemguimaraeslealdasilva/Library/Caches/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-mac-arm64/chrome-headless-shell'});
  try {
    const page = await browser.newPage({viewport:{width:724,height:1080},deviceScaleFactor:2,colorScheme:'dark'});
    const failures=[];
    page.on('pageerror',error => failures.push(error.message));
    await page.goto('http://127.0.0.1:'+server.address().port, {waitUntil:'networkidle',timeout:60000});
    await page.waitForFunction(() => document.querySelector('#regionOptions')?.children.length > 0, {timeout:30000});
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({path:path.join(__dirname,'dataterra-captura-plataforma-vertical.png'),fullPage:false});
    console.log(JSON.stringify({viewport:'724x1080',errors:failures,tiles:await page.locator('.leaflet-tile-loaded').count()}));
    await page.setViewportSize({width:1600,height:1000});
    await page.waitForTimeout(1200);
    await page.screenshot({path:path.join(__dirname,'dataterra-captura-plataforma-desktop.png'),fullPage:false});
  } finally { await browser.close(); await new Promise(resolve=>server.close(resolve)); }
})().catch(error => { console.error(error); server.close(); process.exitCode=1; });
