/* Isolated localhost browser QA. Never deploys and never contacts a live wallet/API. */
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(__dirname, '../..');
const docs = path.join(root, 'docs');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'redesign/source-manifest.json')));
const output = path.join(root, 'redesign/qa-output');
fs.mkdirSync(output, { recursive: true });
const types = {'.html':'text/html', '.css':'text/css', '.js':'application/javascript', '.svg':'image/svg+xml', '.webp':'image/webp', '.jpg':'image/jpeg', '.ttf':'font/ttf'};
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  let file = path.resolve(docs, '.' + decodeURIComponent(url.pathname));
  if (!file.startsWith(docs + path.sep) && file !== docs) { res.writeHead(403); return res.end(); }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  const found = fs.existsSync(file) && fs.statSync(file).isFile();
  if (!found) file = path.join(docs, '404.html');
  res.writeHead(found ? 200 : 404, {'Content-Type':types[path.extname(file)] || 'application/octet-stream'});
  res.end(fs.readFileSync(file));
});
const results = [];
(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const origin = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch();
  try {
    for (const width of [1440, 1024, 768, 430, 390, 360]) {
      const context = await browser.newContext({viewport:{width, height:900}, reducedMotion:'reduce'});
      // Deterministic read-only fixtures. All other external requests are refused.
      await context.route('**/*', async route => {
        const request = route.request(); const url = new URL(request.url());
        if (url.origin === origin) return route.continue();
        assert.equal(request.method(), 'GET', 'No external writes allowed in QA');
        if (url.pathname === '/api/wall/marks') return route.fulfill({json:{status:'ok',marks:[],hasMore:false,nextBefore:null}});
        if (url.pathname === '/api/transparency') return route.fulfill({json:{updatedAt:'2026-10-19T12:00:00Z',holders:{totalPositiveOwners:9,independentHolders:4,projectWallets:4,liquidityPools:1,founderControlled:0,exchangeWallets:0,complete:false},liquidity:{},market:null}});
        if (url.pathname.endsWith('/index.iife.min.js')) return route.fulfill({contentType:'application/javascript',body:fs.readFileSync(process.env.WEB3_IIFE)});
        return route.abort();
      });
      const page = await context.newPage();
      for (const name of Object.keys(manifest.files).filter(n => n.endsWith('.html'))) {
        const route = '/' + name.replace(/index\.html$/, '');
        const errors = [];
        const listener = error => errors.push(error.message);
        page.on('pageerror', listener);
        const response = await page.goto(origin + route, {waitUntil:'load'});
        assert.equal(response.status(), 200, route);
        await page.evaluate(() => document.fonts.ready);
        const info = await page.evaluate(() => ({
          title: document.title,
          overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
          h1: document.querySelectorAll('h1').length,
          noindex: document.querySelector('meta[name="robots"]')?.content.includes('noindex'),
          brokenImages: [...document.images].filter(x => x.complete && !x.naturalWidth).map(x => x.src)
        }));
        assert.equal(info.overflow, false, `${width} ${route}: horizontal overflow`);
        assert.equal(info.h1, 1, route);
        assert(info.noindex, route);
        assert.deepEqual(info.brokenImages, [], `${width} ${route}: broken images`);
        assert.deepEqual(errors, [], `${width} ${route}: runtime errors`);
        if (width <= 430) {
          const menu = page.getByRole('button', {name:'Open navigation', exact:true});
          await menu.click();
          await page.locator('#mobile-nav').waitFor({state:'visible'});
          await page.keyboard.press('Escape');
          assert.equal(await menu.getAttribute('aria-expanded'), 'false');
        }
        await page.screenshot({path:path.join(output, `${width}-${name.replaceAll('/', '_')}.png`), fullPage:true});
        results.push({width, route, ...info});
        page.off('pageerror', listener);
      }
      // Read-only UI controls and reduced-motion opt-in, both page controllers.
      for (const route of ['/', '/about.html']) {
        await page.goto(origin + route);
        const motion = page.locator('.motion-toggle');
        assert.equal(await motion.getAttribute('aria-pressed'), 'true');
        await motion.click();
        assert.equal(await motion.getAttribute('aria-pressed'), 'false');
        await motion.click();
        assert.equal(await motion.getAttribute('aria-pressed'), 'true');
      }
      await page.goto(origin + '/faq.html');
      const question = page.locator('main details').first();
      await question.locator('summary').click();
      assert.equal(await question.getAttribute('open'), '');
      await page.goto(origin + '/wall.html');
      assert.equal(await page.locator('#leave-mark').isDisabled(), true);
      await page.goto(origin + '/lander/');
      assert.equal(await page.locator('#download-card').isVisible(), false);
      for (const [alias, target] of Object.entries(manifest.redirects)) {
        await page.goto(origin + '/' + alias + '?review=1#check');
        await page.waitForURL(origin + target + '?review=1#check');
      }
      await context.close();
    }
    fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify({status:'PASS',pages:results.length,widths:[1440,1024,768,430,390,360],results}, null, 2));
    console.log(`PASS: ${results.length} rendered pages; six widths; no overflow, runtime errors or missing images; menus, FAQ, motion controls and aliases. External data is fixture-only; live wallet qualification is not asserted.`);
  } finally { await browser.close(); }
})().catch(error => {fs.writeFileSync(path.join(output,'failure.txt'),error.stack); console.error(error); process.exitCode=1;}).finally(() => server.close());
