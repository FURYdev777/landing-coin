'use strict';
(() => {
 const $ = selector => document.querySelector(selector);
 const signaturePattern = /^[1-9A-HJ-NP-Za-km-z]{64,100}$/;
 const records = $('#wall-records');
 if (records) {
  const status = $('#wall-source-status'), more = $('#wall-earlier'), refresh = $('#wall-reload');
  let cursor = null, busy = false, count = 0, canLoadMore = false;
  const seen = new Set();
  const state = message => { const p = document.createElement('p'); p.className = 'feed-state'; p.textContent = message; records.replaceChildren(p); };
  function markCard(mark) {
   const article = document.createElement('article'); article.className = 'real-mark';
   let hash = 0; for (const c of mark.signature) hash = (hash * 31 + c.charCodeAt(0)) | 0;
   article.style.setProperty('--mark-angle', ((Math.abs(hash) % 7) - 3) * .6 + 'deg');
   const label = document.createElement('span'); label.className = 'mono'; label.textContent = 'PUBLIC MESSAGE / SOLANA';
   const body = document.createElement('p'); body.textContent = mark.message;
   const meta = document.createElement('footer');
   const wallet = document.createElement('span'); wallet.textContent = mark.wallet.length > 12 ? mark.wallet.slice(0, 4) + '…' + mark.wallet.slice(-4) : mark.wallet;
   wallet.title = mark.wallet;
   const transaction = document.createElement('a'); transaction.href = 'https://solscan.io/tx/' + encodeURIComponent(mark.signature);
   transaction.target = '_blank'; transaction.rel = 'noopener noreferrer'; transaction.textContent = 'Transaction ↗';
   const date = document.createElement('span'); date.className = 'mark-date mono';
   const ms = typeof mark.blockTime === 'number' ? mark.blockTime * 1000 : NaN;
   date.textContent = Number.isFinite(ms) && ms > 0 && !Number.isNaN(new Date(ms).getTime()) ? new Intl.DateTimeFormat('en', {year:'numeric', month:'short', day:'2-digit'}).format(new Date(ms)) : 'Date not supplied';
   meta.append(wallet, transaction); article.append(label, body, date, meta); return article;
  }
  async function load(reset = false) {
   if (busy) return;
   busy = true; refresh.disabled = true; more.disabled = true; records.setAttribute('aria-busy', 'true');
   status.textContent = 'READING THE EXISTING PUBLIC RECORD…';
   const requestedCursor = reset ? null : cursor;
   try {
    const query = new URLSearchParams({limit:'25'}); if (requestedCursor) query.set('before', requestedCursor);
    const response = await fetch('/api/wall/marks?' + query, {cache:'no-store', headers:{accept:'application/json'}, signal:AbortSignal.timeout(30000)});
    if (!response.ok) throw new Error('Source unavailable');
    const data = await response.json(); if (!Array.isArray(data.marks)) throw new Error('Invalid response');
    if (reset) { count = 0; seen.clear(); records.replaceChildren(); }
    for (const mark of data.marks) {
     if (!mark || typeof mark.message !== 'string' || !mark.message.trim() || typeof mark.wallet !== 'string' || typeof mark.signature !== 'string' || !signaturePattern.test(mark.signature) || seen.has(mark.signature)) continue;
     if (!count) records.replaceChildren(); records.append(markCard(mark)); count++; seen.add(mark.signature);
    }
    const next = typeof data.nextBefore === 'string' && signaturePattern.test(data.nextBefore) ? data.nextBefore : null;
    canLoadMore = data.hasMore === true && !!next && next !== requestedCursor; cursor = next;
    more.hidden = !canLoadMore;
    if (!count) state(canLoadMore ? 'No public messages were returned in this transaction batch. Earlier transactions remain to be checked.' : 'No messages were returned in the available record. No example posts are substituted.');
    status.textContent = count + ' MESSAGE' + (count === 1 ? '' : 'S') + ' LOADED / ' + (canLoadMore ? 'EARLIER TRANSACTIONS AVAILABLE' : 'END OF AVAILABLE RECORD');
    $('#wall-last-read').textContent = 'Last fetched here: ' + new Date().toLocaleString() + '. This is a paginated public record, not a total Wall count.';
   } catch (_) {
    status.textContent = count ? 'SOURCE UNAVAILABLE / KEEPING LOADED MESSAGES' : 'EXISTING WALL SERVICE UNAVAILABLE';
    if (!count) state('The public feed could not be reached here. Read or post using the official Wall below. No sample messages are shown.');
    more.hidden = !canLoadMore;
    $('#wall-last-read').textContent = count ? 'The last loaded messages remain visible. Refresh to retry; no new records have been inferred.' : 'No current messages could be loaded. The official Wall remains the route for reading and posting.';
   } finally { busy = false; refresh.disabled = false; more.disabled = false; records.setAttribute('aria-busy', 'false'); }
  }
  refresh.addEventListener('click', () => load(true)); more.addEventListener('click', () => load(false)); load(true);
 }
 const card = $('#lander-design-preview');
 if (card) {
  const name = $('#preview-holder-name'), flip = $('#preview-flip'), front = $('#preview-front'), back = $('#preview-back');
  name.addEventListener('input', () => { $('#preview-card-name').textContent = name.value.trim().slice(0, 40) || 'YOUR NAME'; });
  flip.addEventListener('click', () => {
   const turned = flip.getAttribute('aria-pressed') !== 'true';
   flip.setAttribute('aria-pressed', String(turned)); card.classList.toggle('is-turned', turned);
   front.setAttribute('aria-hidden', String(turned)); back.setAttribute('aria-hidden', String(!turned));
   $('#preview-flip-label').textContent = turned ? 'Show the front' : 'Read the reverse';
  });
  $('#download-design-preview').addEventListener('click', () => {
   // A watermarked design specimen only. Never reads or writes registry/wallet state.
   const escape = value => value.replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&apos;'}[c]));
   const holder = escape(name.value.trim().slice(0, 40) || 'YOUR NAME');
   const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="760" viewBox="0 0 1200 760"><rect width="1200" height="760" rx="24" fill="#F4F3EC"/><path d="M50 100H1150M50 650H1150" stroke="#2C3038"/><g font-family="Arial,sans-serif" fill="#0B0D12"><text x="55" y="70" font-size="26" font-weight="700">LANDING / DESIGN PREVIEW</text><text x="55" y="215" font-size="84" font-weight="700">Certified Lander.</text><text x="55" y="345" font-size="37">${holder}</text><text x="55" y="420" font-size="25">LANDER ID: NOT ISSUED</text><text x="55" y="470" font-size="25">NO VERIFIED WALLET OR BALANCE DATA</text><text x="55" y="535" font-size="24">No NFT. No promised utility. Gravity still works.</text><text x="55" y="705" font-size="26" font-weight="700">PREVIEW ONLY / NOT A REGISTRY-ISSUED CARD</text></g><g transform="translate(625 420) rotate(-20)"><rect x="-490" y="-60" width="980" height="115" fill="#FFC44F" fill-opacity=".92"/><text text-anchor="middle" y="15" font-family="Arial,sans-serif" font-size="55" font-weight="700" fill="#0B0D12">PREVIEW / NOT ISSUED</text></g></svg>`;
   const url = URL.createObjectURL(new Blob([svg], {type:'image/svg+xml'}));
   const link = document.createElement('a'); link.href = url; link.download = 'LANDING-design-preview-NOT-ISSUED.svg';
   document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
   $('#preview-download-status').textContent = 'Design preview downloaded. No Lander ID was issued. Get your registered card through the official flow.';
  });
 }
})();
