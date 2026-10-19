'use strict';
(() => {
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const root = document.documentElement;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let paused = reducedMotion.matches;
let framePending = false;
let toastTimer;
const motionButton = $('.motion-toggle');
const toast = $('#toast');
function notify(message) {
 clearTimeout(toastTimer); toast.textContent = message; toast.classList.add('visible');
 toastTimer = setTimeout(() => toast.classList.remove('visible'), 3800);
}
function setMotion(next, announce = false) {
 paused = next; root.classList.toggle('motion-paused', paused);
 motionButton.setAttribute('aria-pressed', String(paused));
 motionButton.setAttribute('aria-label', paused ? 'Resume decorative motion' : 'Pause decorative motion');
 motionButton.title = paused ? 'Resume motion' : 'Pause motion';
 $('.pause-icon').textContent = paused ? '▷' : 'Ⅱ'; $('.motion-label').textContent = paused ? 'MOTION OFF' : 'MOTION ON';
 if (paused) $$('.reveal.awaiting').forEach(el => el.classList.remove('awaiting'));
 if (announce) notify(paused ? 'Motion paused. Gravity remains active.' : 'Motion resumed. Continue the descent.');
 updateScroll();
}
motionButton.addEventListener('click', () => { root.classList.toggle('motion-opt-in', paused); setMotion(!paused, true); document.dispatchEvent(new Event('landing:motionchange')); });
reducedMotion.addEventListener('change', event => { root.classList.remove('motion-opt-in'); setMotion(event.matches); document.dispatchEvent(new Event('landing:motionchange')); });
setMotion(paused);

const menuToggle = $('.menu-toggle');
const mobileNav = $('#mobile-nav');
function closeMenu() { mobileNav.hidden = true; menuToggle.setAttribute('aria-expanded', 'false'); menuToggle.setAttribute('aria-label', 'Open navigation'); }
menuToggle.addEventListener('click', () => {
 const isOpen = menuToggle.getAttribute('aria-expanded') === 'true';
 mobileNav.hidden = isOpen; menuToggle.setAttribute('aria-expanded', String(!isOpen));
 menuToggle.setAttribute('aria-label', isOpen ? 'Open navigation' : 'Close navigation');
});
$$('a', mobileNav).forEach(link => link.addEventListener('click', closeMenu));
document.addEventListener('click', e => { if (!e.target.closest('.header')) closeMenu(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !mobileNav.hidden) { closeMenu(); menuToggle.focus(); } });
matchMedia('(min-width: 761px)').addEventListener('change', e => { if (e.matches) closeMenu(); });

// Native scroll, one animation frame per paint, no continuous render loop.
function updateScroll() {
 const range = document.documentElement.scrollHeight - window.innerHeight;
 const progress = range > 0 ? Math.min(1, Math.max(0, window.scrollY / range)) : 0;
 root.style.setProperty('--page-progress', progress.toFixed(5));
 root.style.setProperty('--hero-progress', Math.min(1, Math.max(0, window.scrollY / 650)).toFixed(4));
 $('#altitude').textContent = String(Math.round(404 * (1-progress))).padStart(3, '0');
 const chapters = $$('.chapter');
 let current = chapters[0];
 for (const chapter of chapters) { if (chapter.getBoundingClientRect().top <= innerHeight * .42) current = chapter; }
 if (progress > .99) current = $('#touchdown');
 $$('.descent-rail nav a').forEach(a => {
  const active = a.hash === '#' + current.id;
  a.classList.toggle('active', active);
  if (active) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current');
 });
 framePending = false;
}
function scheduleScroll() { if (!framePending) { framePending = true; requestAnimationFrame(updateScroll); } }
window.addEventListener('scroll', scheduleScroll, {passive:true});
window.addEventListener('resize', scheduleScroll, {passive:true});
document.fonts.ready.then(scheduleScroll);

if ('IntersectionObserver' in window && !paused) {
 const reveals = $$('.reveal');
 const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.remove('awaiting'); observer.unobserve(entry.target); } });
 }, { threshold: .07, rootMargin: '0px 0px 35px 0px' });
 root.classList.add('motion-ready');
 reveals.forEach(el => { if (el.getBoundingClientRect().top > innerHeight) el.classList.add('awaiting'); observer.observe(el); });
}

$$('[data-copy]').forEach(button => button.addEventListener('click', async () => {
 try {
  await navigator.clipboard.writeText(button.dataset.copy);
  const label = $('span', button); label.textContent = 'Copied ✓';
  setTimeout(() => label.textContent = 'Copy address', 2200);
  notify('Official mint copied. Always verify before you swap.');
 } catch (_) { notify('Copy is unavailable. Select the full mint address above.'); }
}));

const tabs = $$('[role="tab"]');
function activateTab(tab) {
 tabs.forEach(item => {
  const selected = item === tab;
  item.setAttribute('aria-selected', String(selected)); item.tabIndex = selected ? 0 : -1;
  $('#' + item.getAttribute('aria-controls')).hidden = !selected;
 });
 scheduleScroll();
}
tabs.forEach((tab, i) => {
 tab.addEventListener('click', () => activateTab(tab));
 tab.addEventListener('keydown', e => {
  let index;
  if (e.key === 'ArrowRight') index = (i+1)%tabs.length;
  if (e.key === 'ArrowLeft') index = (i-1+tabs.length)%tabs.length;
  if (e.key === 'Home') index = 0;
  if (e.key === 'End') index = tabs.length-1;
  if (index !== undefined) { e.preventDefault(); activateTab(tabs[index]); tabs[index].focus(); }
 });
});

const dialogs = $$('dialog');
function openDialog(id) { $(id).showModal(); }
dialogs.forEach(dialog => {
 $('.dialog-close', dialog).addEventListener('click', () => dialog.close());
 dialog.addEventListener('click', e => {
  if (e.target !== dialog) return;
  const rect = dialog.getBoundingClientRect();
  if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) dialog.close();
 });
});
const certificate = $('#certificate');
const flipButton = $('#flip-card');
function flipCertificate(flipped) {
 certificate.classList.toggle('is-flipped', flipped); flipButton.setAttribute('aria-pressed', String(flipped));
 $('.certificate-front').setAttribute('aria-hidden', String(flipped));
 $('.certificate-back').setAttribute('aria-hidden', String(!flipped));
}
flipCertificate(false);
flipButton.addEventListener('click', () => flipCertificate(!certificate.classList.contains('is-flipped')));
// Limited pointer tilt for fine pointers; keyboard/touch use the explicit rotate control.
if (matchMedia('(hover:hover) and (pointer:fine)').matches) {
 $('.certificate-stage').addEventListener('pointermove', e => {
  if (paused || certificate.classList.contains('is-flipped')) return;
  const b = certificate.getBoundingClientRect();
  const x = Math.max(-1,Math.min(1,(e.clientX - b.left)/b.width*2-1));
  const y = Math.max(-1,Math.min(1,(e.clientY - b.top)/b.height*2-1));
  certificate.style.transform = `rotateY(${x*9-5}deg) rotateX(${-y*7+4}deg) rotateZ(-4deg)`;
 });
 $('.certificate-stage').addEventListener('pointerleave', () => { certificate.style.transform = ''; });
 flipButton.addEventListener('click', () => { certificate.style.transform = ''; });
}
$('#customize-card').addEventListener('click', () => openDialog('#card-dialog'));
function cardName() { return $('#lander-name').value.trim() || 'YOUR NAME'; }
function updateCardName() { $('#cert-name').textContent = cardName(); flipCertificate(false); certificate.style.transform = ''; }
$('#card-form').addEventListener('submit', e => { e.preventDefault(); updateCardName(); $('#card-dialog').close(); notify('Your sample card is ready. No real Lander ID issued.'); });
function escapeXML(value) { return value.replace(/[<>&"']/g, char => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[char])); }
$('#download-card').addEventListener('click', () => {
 updateCardName();
 const name = escapeXML(cardName().toUpperCase());
 const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="760" viewBox="0 0 1200 760"><rect width="1200" height="760" rx="30" fill="#F4F3EC"/><path d="M0 660h1200v70q0 30-30 30H30q-30 0-30-30z" fill="#FFC44F"/><g fill="none" stroke="#b4b9af"><circle cx="990" cy="350" r="230"/><circle cx="990" cy="350" r="200" stroke-dasharray="3 8"/><path d="M730 350h470M990 110v470"/></g><path d="M76 65h24v45h40v23H76z" fill="#0B0D12"/><text x="165" y="112" font-family="Arial,sans-serif" font-size="26" letter-spacing="7" fill="#0B0D12">LANDING</text><text x="865" y="100" font-family="monospace" font-size="17" fill="#0B0D12">DESIGN PREVIEW</text><text x="76" y="217" font-family="monospace" font-size="16" fill="#555d61">NO MOON REQUIRED.</text><text x="70" y="330" font-family="Arial,sans-serif" font-weight="bold" font-size="108" letter-spacing="-6" fill="#0B0D12">Certified</text><text x="70" y="435" font-family="Arial,sans-serif" font-weight="bold" font-size="108" letter-spacing="-6" fill="#0B0D12">Lander.</text><text x="76" y="526" font-family="monospace" font-size="14" fill="#555d61">ISSUED TO (SAMPLE)</text><text x="76" y="578" font-family="Arial,sans-serif" font-size="34" fill="#0B0D12">${name}</text><text x="76" y="707" font-family="monospace" font-size="18" fill="#0B0D12">PREVIEW ONLY / NO REAL LANDER ID ISSUED</text><text x="76" y="737" font-family="monospace" font-size="12" fill="#0B0D12">NO MOON. NO PROMISES. JUST LANDING.</text><path d="m950 280 40 90 40-90" fill="#FFC44F" stroke="#0B0D12" stroke-width="4"/></svg>`;
 const url = URL.createObjectURL(new Blob([svg],{type:'image/svg+xml;charset=utf-8'}));
 const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'LANDING-design-preview.svg'; document.body.append(anchor); anchor.click(); anchor.remove();
 setTimeout(() => URL.revokeObjectURL(url), 3000);
 notify('Design sample downloaded. Gravity included.');
});

updateScroll();
})();
