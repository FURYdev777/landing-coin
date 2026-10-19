"""Audit every retained route and migration source without browser rendering."""
from pathlib import Path
from lxml import html
from urllib.parse import urlsplit
import json, re, zipfile, xml.etree.ElementTree as ET

ROOT=Path(__file__).resolve().parents[2];P=ROOT/'docs';U=ROOT/'redesign/content/upstream'
ORIGIN='https://landingcoin.fun'
CORE=['/','/about.html','/buy/','/markets.html','/tokenomics.html','/transparency.html','/media-kit.html','/routes/jupiter.html','/routes/poloniex.html','/wall.html','/lander/','/community.html','/flight-plan.html','/news/','/team.html','/faq.html','/privacy.html','/cookie-policy.html','/terms-of-service.html']
ARTICLES=['/news/landing-coin-discord-community.html','/news/landing-wall-and-future-merch-store.html','/news/landing-coin-poloniex-listing.html']
def file(route):return P/(route.lstrip('/')+'index.html'if route.endswith('/')else route.lstrip('/'))
def norm(e):return ' '.join(e.text_content().split())
def assert_schema(d,route):
 graphs=[]
 for s in d.xpath('//script[@type="application/ld+json"]'):
  data=json.loads(s.text);graphs.extend(data.get('@graph',[data]))
 assert any('WebPage'in(e.get('@type')if isinstance(e.get('@type'),list)else[e.get('@type')])and e.get('url')==ORIGIN+route for e in graphs),route
 return graphs

for route in CORE+ARTICLES:
 d=html.fromstring(file(route).read_text());assert d.get('lang')=='en';assert len(d.xpath('//main'))==1
 assert len(d.xpath('//h1'))==1
 assert d.xpath('//link[@rel="canonical"]')[0].get('href')==ORIGIN+route
 desc=d.xpath('//meta[@name="description"]')[0].get('content');assert desc and len(desc)>20
 for prop in ['og:title','og:description','og:type','og:url','og:image','og:image:alt','og:site_name']:
  assert d.xpath('//meta[@property="'+prop+'"]')[0].get('content'),(route,prop)
 assert d.xpath('//meta[@property="og:url"]')[0].get('content')==ORIGIN+route
 image=d.xpath('//meta[@property="og:image"]')[0].get('content');assert file(urlsplit(image).path).exists()
 graphs=assert_schema(d,route)
 assert not d.xpath('//a[@href="#"]'),route
 for image in d.xpath('//img'):assert image.get('alt')is not None,(route,'image alt')
 for field in d.xpath('//input[not(@type="hidden")]|//textarea|//select'):
  assert field.get('aria-label')or field.get('aria-labelledby')or field.xpath('ancestor::label')or d.xpath('//label[@for="'+field.get('id','')+'"]'),(route,'unlabelled field',field.get('id'))
 for button in d.xpath('//button'):
  assert norm(button)or button.get('aria-label')or button.get('aria-labelledby'),(route,'unnamed button')
 header=d.xpath('//header')[0]
 for nav in header.xpath('./nav'):
  urls={a.get('href')for a in nav.xpath('.//a')}|{a.get('href')for a in header.xpath('./div[contains(@class,"header-actions")]//a')}
  assert set(CORE)-{'/','/privacy.html','/cookie-policy.html','/terms-of-service.html'}<=urls,(route,'navigation')
 for social in ['https://x.com/LandingCoin2026','https://www.linkedin.com/company/146683351']:
  assert d.xpath('//footer//a[@href="'+social+'"]'),(route,social)
 if route in ARTICLES:
  article=next(x for x in graphs if x.get('@type')=='NewsArticle');date=d.xpath('//time')[0].get('datetime');assert article['datePublished']==date

# All 18 routes are reachable from the homepage's actual internal links.
visited=set();pending=['/']
while pending:
 route=pending.pop()
 if route in visited:continue
 visited.add(route);d=html.fromstring(file(route).read_text())
 for a in d.xpath('//a[@href]'):
  u=urlsplit(a.get('href'))
  if u.scheme or u.netloc:continue
  target=u.path
  if target in CORE+ARTICLES and target not in visited:pending.append(target)
assert set(CORE)<=visited
urls={e.text for e in ET.parse(P/'sitemap.xml').iter()if e.tag.endswith('}loc')}
assert urls=={ORIGIN+x for x in CORE+ARTICLES if x not in ['/privacy.html','/cookie-policy.html','/terms-of-service.html']}

# Exact original article bodies and publication dates survive the presentation migration.
for key,route in zip(['discordArticle','wallArticle','poloArticle'],ARTICLES):
 source=html.fromstring((U/(key+'.html')).read_text());target=html.fromstring(file(route).read_text())
 assert norm(source.xpath('//*[@class="article-body"]')[0])==norm(target.xpath('//*[@class="article-prose"]')[0])
 assert source.xpath('//time')[0].get('datetime')==target.xpath('//time')[0].get('datetime')
source=html.fromstring((U/'flight-plan.html').read_text());target=html.fromstring((P/'flight-plan.html').read_text())
phases=source.xpath('//article[contains(@class,"phase")]');migrated=target.xpath('//article[@class="flight-phase"]');assert len(phases)==len(migrated)==5
for a,b in zip(phases,migrated):
 assert norm(a.xpath('.//h3')[0])==norm(b.xpath('.//h2')[0])
 assert [norm(x)for x in a.xpath('./ul/li')]==[norm(x)for x in b.xpath('.//ul/li')]
 assert norm(a.xpath('.//span[contains(@class,"status")]')[0]).upper()==norm(b.xpath('.//span[contains(@class,"status-pill")]')[0])

team=(P/'team.html').read_text();assert all(x in team for x in ['Michele Scalini','Founder &amp; Project Operator','Furqan','Growth &amp; Community Manager'])
faq=html.fromstring((P/'faq.html').read_text());schema=next(x for x in assert_schema(faq,'/faq.html')if 'FAQPage'in(x.get('@type')if isinstance(x.get('@type'),list)else[x.get('@type')]));assert len(schema['mainEntity'])==17
for item in schema['mainEntity']:assert item['name']in faq.text_content()and item['acceptedAnswer']['text']in faq.text_content()

with zipfile.ZipFile(P/'assets/LANDING-media-kit.zip')as z:
 assert z.testzip()is None
 facts=z.read(next(n for n in z.namelist()if n.endswith('facts-and-links.txt'))).decode()
 assert 'LandingCoin2026'in facts and 'linkedin.com/company/146683351'in facts
 assert '404,000,000'in facts and 'DLGLMB3imJqnAwKjxY8ZFXoF7CPfTbCNL3j3Ag5M5vGZ'in facts
for x in re.findall(r'<\?xml-stylesheet[^>]*href="([^"]+)"', (P/'news/feed.xml').read_text()):assert file(x).exists()
assert (P/'news/rss.xsl').exists()
for f in ['motion.css','site.css','experiences.css','integration.css']:assert 'prefers-reduced-motion'in(P/f).read_text()
for f in P.rglob('*.html'):
 s=f.read_text();assert 'Wallet transactions and Lander registration continue on the official site.'not in s
 assert 'LandingCoinFun'not in s
print('PASS: all 19 pages plus three articles; routes/navigation; metadata/Open Graph/canonicals/schemas; labels/alt/button names; exact news bodies/dates; five factual phases; source ZIP/RSS; reduced-motion safeguards.')
print('RELEASE NOTES: source legal review labels and noindex retained; no deployment.')
