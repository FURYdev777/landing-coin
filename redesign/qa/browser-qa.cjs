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
      let fixtureId = 42;
      const context = await browser.newContext({viewport:{width, height:900}, reducedMotion:'reduce'});
      // Deterministic read-only fixtures. All other external requests are refused.
      await context.route('**/*', async route => {
        const request = route.request(); const url = new URL(request.url());
        if (url.origin === origin) return route.continue();
        assert.equal(request.method(), 'GET', 'No external writes allowed in QA');
        if (url.pathname === '/api/wall/marks') return route.fulfill({json:{status:'ok',marks:[],hasMore:false,nextBefore:null}});
        if (url.pathname === '/api/transparency') return route.fulfill({json:{updatedAt:'2026-10-19T12:00:00Z',holders:{totalPositiveOwners:9,independentHolders:4,projectWallets:4,liquidityPools:1,founderControlled:0,exchangeWallets:0,complete:false},liquidity:{},market:null}});
        if (url.pathname.endsWith('/index.iife.min.js')) return route.fulfill({contentType:'application/javascript',body:fs.readFileSync(process.env.WEB3_IIFE)});
        if (url.pathname.includes('html2canvas') && process.env.HTML2CANVAS_FILE) return route.fulfill({contentType:'application/javascript',body:fs.readFileSync(process.env.HTML2CANVAS_FILE)});
        if (url.pathname === '/api/lander') return route.fulfill({json:{status:'confirmed',lander:{id:fixtureId,wallet:'CBPwvUZrDQThyM6a54shKPpywvpTyYQQ2Ng7FWPZPM88',balanceRaw:'123456789',signature:'A'.repeat(88),confirmedSlot:345678901,createdAt:'2026-10-19 12:00:00'}}});
        return route.abort();
      });
      const page = await context.newPage();
      for (const name of Object.keys(manifest.files).filter(n => n.endsWith('.html') && n !== 'review.html')) {
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
          privateReviewLabel: document.body.innerText.includes('PRIVATE REVIEW BUILD') || document.body.innerText.includes('PRIVATE REVIEW /'),
          brokenImages: [...document.images].filter(x => x.complete && !x.naturalWidth).map(x => x.src)
        }));
        assert.equal(info.overflow, false, `${width} ${route}: horizontal overflow`);
        assert.equal(info.h1, 1, route);
        assert.equal(info.noindex, name === '404.html', `${width} ${route}: robots state`);
        assert.equal(info.privateReviewLabel, false, `${width} ${route}: private review label`);
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
      assert.equal(await page.locator('#download-card').isVisible(), true);
      assert.equal(await page.locator('#download-card').isDisabled(), true);
      assert.equal(await page.locator('#lander-card').getAttribute('data-certification'), 'preview');
      assert.equal((await page.locator('.registered-brand').innerText()).trim(), 'LANDING COIN');
      assert.equal(await page.locator('#registered-card-front .registered-astronaut').count(), 0);
      assert.equal(await page.locator('#card-id').innerText(), '----');
      await page.locator('#lander-name').fill('EXAMPLE LANDER');
      await page.locator('#restore-wallet').fill('CBPwvUZrDQThyM6a54shKPpywvpTyYQQ2Ng7FWPZPM88');
      await page.locator('#restore-card').click();
      await page.locator('#lander-card[data-certification="confirmed"]').waitFor();
      assert.equal(await page.locator('#download-card').isDisabled(), false);
      assert.equal(await page.locator('#card-id').innerText(), '0042');
      assert.equal(await page.locator('#lander-id').inputValue(), '0042');
      async function checkCardLayout() {
        const geometry = await page.evaluate(() => {
          const front = document.getElementById('registered-card-front').getBoundingClientRect();
          const selectors = ['.registered-brand', '.registered-verify', 'h3', '.registered-id-block', '.registered-holder', '.registered-details', '.registered-proof', '.registered-card-footer'];
          const boxes = selectors.map(selector => {
            const el = document.querySelector('#registered-card-front ' + selector), r = el.getBoundingClientRect();
            return {selector,left:r.left,right:r.right,top:r.top,bottom:r.bottom,overflow:el.scrollWidth>el.clientWidth+1};
          });
          const intersects = (a,b) => a.left < b.right-1 && a.right > b.left+1 && a.top < b.bottom-1 && a.bottom > b.top+1;
          return {outside:boxes.filter(r=>r.left<front.left-1 || r.right>front.right+1 || r.top<front.top-1 || r.bottom>front.bottom+1 || r.overflow),overlap:intersects(boxes[0],boxes[1]) || intersects(boxes[2],boxes[3]) || intersects(boxes[3],boxes[4])};
        });
        assert.deepEqual(geometry.outside, [], `${width}: card clipping`);
        assert.equal(geometry.overlap, false, `${width}: card overlap`);
      }
      await checkCardLayout();
      const frontSize = await page.locator('#registered-card-front').evaluate(el => ({w:el.clientWidth,h:el.clientHeight}));
      assert(Math.abs(frontSize.w/frontSize.h - 85.6/53.98) < .01, 'credit-card ratio');
      await page.locator('#live-card-flip').click();
      const backSize = await page.locator('#registered-card-back').evaluate(el => ({w:el.clientWidth,h:el.clientHeight,overflow:el.scrollHeight>el.clientHeight+1}));
      assert.deepEqual(backSize, {...frontSize,overflow:false}, 'equal front/back sizes');
      await page.locator('#registered-card-back').screenshot({path:path.join(output, `${width}-certified-lander-back.png`)});
      await page.locator('#live-card-flip').click();
      await page.locator('#registered-card-front').screenshot({path:path.join(output, `${width}-certified-lander-card.png`)});
      const [download] = await Promise.all([page.waitForEvent('download'), page.locator('#download-card').click()]);
      assert.equal(download.suggestedFilename(), 'certified-lander-0042-example-lander.png');
      await download.saveAs(path.join(output, `${width}-certified-lander-export.png`));
      fixtureId = 12345678;
      await page.locator('#lander-name').fill('A'.repeat(40));
      await page.locator('#restore-card').click();
      await page.waitForFunction(() => document.getElementById('card-id').textContent === '12345678');
      await checkCardLayout();
      for (const [alias, target] of Object.entries(manifest.redirects)) {
        await page.goto(origin + '/' + alias + '?ref=1#check');
        await page.waitForURL(origin + target + '?ref=1#check');
      }
      await context.close();
    }
    fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify({status:'PASS',pages:results.length,widths:[1440,1024,768,430,390,360],results}, null, 2));
    console.log(`PASS: ${results.length} production renderings; six widths; indexability state, no private review labels, no overflow, runtime errors or missing images; menus, FAQ, motion controls and aliases. External data is fixture-only; live wallet qualification is not asserted.`);
  } finally { await browser.close(); }
})().catch(error => {fs.writeFileSync(path.join(output,'failure.txt'),error.stack); console.error(error); process.exitCode=1;}).finally(() => server.close());
