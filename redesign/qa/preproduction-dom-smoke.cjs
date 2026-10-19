const fs=require('fs'),vm=require('vm'),assert=require('assert');
const {execFileSync}=require('child_process');
const pathModule=require('path');const root=pathModule.resolve(__dirname,'../..');
function treeFor(file){return JSON.parse(execFileSync('python',['-c',String.raw`
import json
from html.parser import HTMLParser
class P(HTMLParser):
 def __init__(self):super().__init__();self.root={'tag':'document','attrs':{},'children':[]};self.stack=[self.root]
 def handle_starttag(self,t,a):
  n={'tag':t,'attrs':dict(a),'children':[]};self.stack[-1]['children'].append(n)
  if t not in {'meta','link','img','input','br','hr','source','area','base','embed','param','track','wbr'}:self.stack.append(n)
 def handle_endtag(self,t):
  if len(self.stack)>1:self.stack.pop()
 def handle_startendtag(self,t,a):self.stack[-1]['children'].append({'tag':t,'attrs':dict(a),'children':[]})
p=P();p.feed(open(__import__('sys').argv[1]).read());print(json.dumps(p.root))
`,file],{encoding:'utf8'}));}
class Evt{constructor(type){this.type=type;}preventDefault(){this.defaultPrevented=true;}}
class Target{constructor(){this.events={}}addEventListener(t,f){(this.events[t]??=[]).push(f)}dispatchEvent(e){e.target??=this;for(const f of this.events[e.type]??[])f(e);return true}}
class Element extends Target{
 constructor(t,parent){super();this.tagName=t.tag;this.attrs={...t.attrs};this.parent=parent;this.children=t.children.map(n=>new Element(n,this));this.style={values:{},setProperty(k,v){this.values[k]=v}};this.textContent='';this.value='';this.hidden='hidden'in this.attrs;this.rect={top:1400,height:300,width:1000,left:0,bottom:1700,right:1000};const cl=new Set((this.attrs.class||'').split(/\s+/).filter(Boolean));this.classList={contains:k=>cl.has(k),add:(...ks)=>{ks.forEach(k=>cl.add(k));this.attrs.class=[...cl].join(' ')},remove:(...ks)=>{ks.forEach(k=>cl.delete(k));this.attrs.class=[...cl].join(' ')},toggle:(k,on)=>{on??=!cl.has(k);on?cl.add(k):cl.delete(k);this.attrs.class=[...cl].join(' ');return on}};this.dataset={};for(const [k,v]of Object.entries(this.attrs)){if(k.startsWith('data-'))this.dataset[k.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=v}}
 replaceChildren(...children){this.children=[];for(const c of children)this.append(c)}get href(){return this.attrs.href||this._href||''}set href(v){this._href=v}set className(v){this.classList.remove(...(this.attrs.class||'').split(/\s+/).filter(Boolean));this.classList.add(...String(v).split(/\s+/).filter(Boolean))}get className(){return this.attrs.class||''}get id(){return this.attrs.id||''}get hash(){return (this.attrs.href||'').includes('#')?'#'+this.attrs.href.split('#')[1]:''}
 setAttribute(k,v){this.attrs[k]=String(v)}getAttribute(k){return this.attrs[k]??null}removeAttribute(k){delete this.attrs[k]}
 matches(sel){let tag=sel.match(/^[a-zA-Z]+/);if(tag&&tag[0]!==this.tagName)return false;for(const m of sel.matchAll(/\.([\w-]+)/g))if(!this.classList.contains(m[1]))return false;for(const m of sel.matchAll(/#([\w-]+)/g))if(this.id!==m[1])return false;for(const m of sel.matchAll(/\[([\w-]+)(?:="([^"]*)")?\]/g)){if(!(m[1]in this.attrs)||m[2]!==undefined&&this.attrs[m[1]]!==m[2])return false}return true}
 all(){return this.children.flatMap(c=>[c,...c.all()])}
 querySelectorAll(sel){const parts=sel.split(' ');return this.all().filter(el=>{let i=parts.length-1;if(!el.matches(parts[i--]))return false;let p=el.parent;while(i>=0){while(p&&!p.matches(parts[i]))p=p.parent;if(!p)return false;p=p.parent;i--}return true})}
 querySelector(sel){return this.querySelectorAll(sel)[0]??null}getBoundingClientRect(){return this.rect}getTotalLength(){return 1000}getPointAtLength(t){return {x:t,y:t*.3}}focus(){this.focused=true}scrollIntoView(){}showModal(){this.open=true}close(){this.open=false}append(...elements){for(const el of elements){this.children.push(el);el.parent=this}}remove(){if(this.parent)this.parent.children=this.parent.children.filter(c=>c!==this)}click(){this.dispatchEvent(new Evt('click'))}
}
async function boot(path,reduced=false,failure=false){
 const tree=treeFor(root+'/docs/'+path);const doc=new Element(tree,null);doc.documentElement=doc.querySelector('html');doc.body=doc.querySelector('body');doc.documentElement.scrollHeight=12000;doc.hidden=false;doc.fonts={ready:Promise.resolve()};doc.createElement=t=>new Element({tag:t,attrs:{},children:[]},null);
 const hero=doc.querySelector('.hero');if(hero)hero.rect={top:0,bottom:900,left:0,right:1200,height:900,width:1200};
 let now=0,id=0;const frames=new Map(),media=new Map();const win=new Target();win.innerHeight=800;win.scrollY=0;const isHome=path==='index.html';const url='https://landing-descent-prototype.madmike74.chatgpt.site/'+(path==='index.html'?'':path);
 const mm=q=>{if(!media.has(q)){let target=new Target();target.matches=q.includes('prefers-reduced-motion')?reduced:!q.includes('hover:hover');media.set(q,target)}return media.get(q)};
 // Isolated fixture: never delivered to the website or represented as real data.
 const transparency={updatedAt:'2026-10-17T00:00:00Z',holders:{totalPositiveOwners:20,independentHolders:12,projectWallets:3,liquidityPools:1,founderControlled:2,exchangeWallets:0,complete:false},market:null};let wallVariant='empty';
 const mockFetch=async url=>{if(failure)throw new Error('Isolated offline failure fixture');url=new URL(url,'https://landing-descent-prototype.madmike74.chatgpt.site');url=url.pathname+url.search;if(url.startsWith('/api/transparency'))return Response.json(transparency);if(url.startsWith('/api/wall/marks'))return Response.json({status:'ok',marks:wallVariant==='real'?[{signature:'A'.repeat(88),wallet:'B'.repeat(44),message:'<img src=x onerror=alert(1)>',blockTime:1}]:[],hasMore:wallVariant==='empty',nextBefore:wallVariant==='empty'?'A'.repeat(88):null});throw new Error('Unexpected URL '+url)};
 const ctx={document:doc,window:win,innerHeight:800,scrollY:0,performance:{now:()=>now},matchMedia:mm,requestAnimationFrame:fn=>{frames.set(++id,fn);return id},cancelAnimationFrame:i=>frames.delete(i),ResizeObserver:class{observe(){}},IntersectionObserver:class{observe(){}unobserve(){}},setTimeout:()=>0,clearTimeout(){},setInterval:()=>0,Event:Evt,navigator:{clipboard:{writeText:async()=>{}}},Blob,URL,URLSearchParams,Response,AbortSignal,fetch:mockFetch,location:new URL(url),console};
 vm.createContext(ctx);for(const f of (isHome?['app.js','motion.js','site.js']:['site.js']))vm.runInContext(fs.readFileSync(root+'/docs/'+f,'utf8'),ctx,{filename:f});await new Promise(setImmediate);
 function tick(dt=16){now+=dt;const next=[...frames.values()];frames.clear();next.forEach(fn=>fn(now));}
 tick();assert.equal(doc.documentElement.classList.contains('motion-paused'),reduced);
 if(isHome){assert(doc.documentElement.classList.contains('flight-ready'));assert(doc.querySelector('#home-wall-feed').children[0].textContent.includes(failure?'temporarily unavailable':'transaction batch'));}
 if(path==='transparency.html'&&!failure){assert(doc.querySelector('#coverage-note').textContent.includes('PARTIAL OWNER COVERAGE'));assert.equal(doc.querySelector('[data-reading="independent"]').textContent,String(transparency.holders.independentHolders));assert.equal(doc.querySelector('[data-reading="price"]').textContent,'Unavailable');assert(doc.querySelector('#market-state').textContent.includes('did not return current market data'));}

 if(failure&&path==='transparency.html'){assert.equal(doc.querySelector('#snapshot-status').textContent,'EXISTING SOURCE UNAVAILABLE');assert.equal(doc.querySelector('[data-reading="independent"]').textContent,'Unavailable');assert.equal(doc.querySelector('#refresh-transparency').disabled,false);assert(doc.querySelector('#coverage-note').textContent.includes('No current counts are inferred'));}
 doc.querySelector('.menu-toggle').click();assert.equal(doc.querySelector('#mobile-nav').hidden,false);doc.querySelector('.menu-toggle').click();assert.equal(doc.querySelector('#mobile-nav').hidden,true);
 doc.querySelector('.motion-toggle').click();tick();assert.equal(doc.documentElement.classList.contains('motion-paused'),!reduced);
 return path+(reduced?' / reduced motion':' / motion')+(failure?' / failed read-only API':'');
}
(async()=>{for(const path of ['index.html',...JSON.parse(fs.readFileSync(root+'/docs/page-manifest.json','utf8')).filter(p=>p.path!=='/').map(p=>p.path.slice(1)+(p.path.endsWith('/')?'index.html':'')),'404.html'])for(const reduced of [false,true])console.log('PASS:',await boot(path,reduced));for(const file of ['index.html','transparency.html'])for(const reduced of [false,true])console.log('PASS:',await boot(file,reduced,true));console.log('PASS: all retained page startup, mobile navigation and motion controls; partial owner coverage and unavailable market fields; direct-API homepage Wall preview. DOM simulation, no CSS/browser rendering asserted.');})().catch(e=>{console.error(e);process.exit(1)});
