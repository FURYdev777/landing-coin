'use strict';
(() => {
 const root = document.documentElement;
 const clamp = (n, a = 0, b = 1) => Math.max(a, Math.min(b, n));
 const query = s => document.querySelector(s);
 const scenes = [
  ['.type-transit','--ribbon-p',1,-.3],
  ['.attitude-grid','--attitude-p',.95,-.15],
  ['.principles-spread','--principles-p',.82,.15],
  ['.token-diagram','--config-p',.95,.26],
  ['.allocation-story','--allocation-p',.95,.32],
  ['.routes','--routes-p',.92,.40],
  ['.wall-stage','--wall-p',.95,.22],
  ['.certificate-stage','--card-p',.95,.30],
  ['.community-network','--community-p',.95,.15],
  ['.touchdown-scene','--landing-p',.95,.22],
  ['.touchdown-copy','--touchdown-copy-p',.95,.40],
  ['.big-word','--word-p',1,.60]
 ].map(([selector,key,start,end]) => ({el:query(selector),key,start,end,current:0,target:0})).filter(scene => scene.el);
 const waypoints = [...document.querySelectorAll('.chapter-waypoint')];
 const hero = query('.hero');
 const path = query('.descent-path');
 const beacon = query('.trajectory-beacon');
 const card = query('.certificate');
 const manifesto = query('#manifesto-switch');
 const manifestoToggle = query('#manifesto-toggle');
 const manifestoReplay = query('#manifesto-replay');
 let manifestoManual = false;
 let grounded = false;
 let frame = 0;
 let needsMeasure = true;
 let heroVisible = true;
 let initial = true;
 let epoch = performance.now();
 let last = epoch;
 let flightProgress = 0;
 let pathLength = 0;
 let resumeAfterTab = false;
 try { pathLength = path.getTotalLength(); } catch (_) { if (beacon) beacon.style.display = 'none'; }
 const paused = () => root.classList.contains('motion-paused');
 function setManifesto(next) {
  if (!manifesto || grounded === next) return;
  grounded = next;
  manifesto.classList.toggle('is-grounded', next);
  manifestoToggle.setAttribute('aria-pressed', String(next));
  query('.manifesto-before').setAttribute('aria-hidden', String(next));
  query('.manifesto-after').setAttribute('aria-hidden', String(!next));
 }
 manifestoToggle.addEventListener('click', () => { manifestoManual = true; setManifesto(!grounded); });
 manifestoReplay.addEventListener('click', () => { manifestoManual = true; setManifesto(!grounded); });
 function measure() {
  const h = window.innerHeight;
  scenes.forEach(scene => {
   const top = scene.el.getBoundingClientRect().top;
   scene.target = clamp((h * scene.start - top) / (h * (scene.start - scene.end)));
   if (initial) scene.current = scene.target;
  });
  const rect = hero.getBoundingClientRect();
  heroVisible = rect.bottom > 0 && rect.top < h;
  flightProgress = clamp(-rect.top / Math.max(rect.height * .75, 1));
  waypoints.forEach(el => {
   const p = clamp((h * .9 - el.getBoundingClientRect().top)/(h * .45));
   el.style.setProperty('--waypoint-p', paused() ? '1' : p.toFixed(4));
  });
  initial = false; needsMeasure = false;
 }
 function render(now) {
  frame = 0;
  if (document.hidden) { resumeAfterTab = true; return; }
  if (needsMeasure) measure();
  const dt = Math.min(64,Math.max(0,now-last)); last = now;
  const smoothing = 1 - Math.exp(-dt/115);
  let unsettled = false;
  scenes.forEach(scene => {
   if (paused()) scene.current = 1;
   else {
    scene.current += (scene.target-scene.current)*smoothing;
    if (Math.abs(scene.target-scene.current) > .0005) unsettled = true;
    else scene.current = scene.target;
   }
   scene.el.style.setProperty(scene.key, scene.current.toFixed(5));
   if (scene.key === '--principles-p' && !manifestoManual) setManifesto(scene.current > .48);
   if (scene.key === '--card-p') card.style.setProperty('--scroll-turn', `${(1-scene.current)*-25}deg`);
   if (scene.key === '--landing-p') scene.el.classList.toggle('landed',scene.current>.985);
  });
  let flying = false;
  if (!paused() && heroVisible && pathLength && beacon) {
   const t = Math.max(clamp((now-epoch)/9000),flightProgress*.8);
   const point = path.getPointAtLength(pathLength*t);
   beacon.setAttribute('cx', point.x.toFixed(2)); beacon.setAttribute('cy', point.y.toFixed(2));
   hero.style.setProperty('--flight-draw', Math.max(.04,t).toFixed(4));
   flying = t < 1;
  } else if (paused()) hero.style.setProperty('--flight-draw','1');
  if (!manifestoManual && paused()) setManifesto(true);
  if (!paused() && (unsettled || flying)) schedule();
 }
 function schedule() { if (!frame && !document.hidden) frame = requestAnimationFrame(render); }
 function requestMeasure() { needsMeasure = true; schedule(); }
 window.addEventListener('scroll',requestMeasure,{passive:true});
 window.addEventListener('resize',requestMeasure,{passive:true});
 window.addEventListener('pageshow',requestMeasure);
 document.addEventListener('landing:motionchange', () => {
  if (!paused()) { epoch = performance.now(); last = epoch; }
  requestMeasure();
 });
 document.addEventListener('visibilitychange',() => {
  if (document.hidden) { if (frame) cancelAnimationFrame(frame); frame=0; }
  else { last=performance.now(); if (resumeAfterTab) resumeAfterTab=false; requestMeasure(); }
 });
 if ('ResizeObserver' in window) { const resize=new ResizeObserver(requestMeasure);resize.observe(document.body); }
 document.fonts.ready.then(requestMeasure);
 root.classList.add('flight-ready');
 requestMeasure();
})();
