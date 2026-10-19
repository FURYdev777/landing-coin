"""Verify production migration integrity while preserving the approved Sites v13 visual/runtime source."""
from pathlib import Path
import hashlib, json, re, subprocess

root = Path(__file__).resolve().parents[2]
docs = root / 'docs'
manifest = json.loads((root / 'redesign/source-manifest.json').read_text())

# Production intentionally changes canonical HTML metadata/review labels plus crawl manifests.
# Everything else from Sites v13 must remain byte-identical.
removed = {'review.html'}
production_deltas = {
    name for name in manifest['files']
    if name.endswith('.html')
} | {'robots.txt', 'sitemap.xml', 'page-manifest.json', 'integration.css', 'lander-live.js'}

for name, expected in manifest['files'].items():
    path = docs / name
    if name in removed:
        assert not path.exists(), f'Private review page must not ship: {name}'
        continue
    assert path.exists(), f'Missing Sites source file: {name}'
    if name not in production_deltas:
        actual = hashlib.sha256(path.read_bytes()).hexdigest()
        assert actual == expected, f'Unexpected Sites source change: {name}'

# Compatibility redirects stay private to crawlers and preserve query/fragment forwarding.
for name, target in manifest['redirects'].items():
    text = (docs / name).read_text()
    assert f'href="{target}"' in text and 'noindex,nofollow' in text, name
    assert 'location.search+location.hash' in text, name
    destination = docs / (target.lstrip('/') + ('index.html' if target.endswith('/') else ''))
    assert destination.exists(), (name, target)

# Canonical public pages are indexable; 404 and compatibility redirects are not.
public = json.loads((docs / 'page-manifest.json').read_text())
assert public and all(item['path'] != '/review.html' for item in public)
for item in public:
    route = item['path']
    path = docs / (route.lstrip('/') + ('index.html' if route.endswith('/') else ''))
    source = path.read_text()
    robots = re.search(r'<meta name="robots" content="([^"]+)"', source)
    assert robots and 'noindex' not in robots.group(1), route
    assert 'PRIVATE REVIEW BUILD' not in source, route
    assert 'PRIVATE REVIEW /' not in source, route
    assert '/review.html' not in source, route

error404 = (docs / '404.html').read_text()
assert 'noindex' in error404

# JavaScript remains syntactically valid.
for file in docs.rglob('*.js'):
    if file.name == 'wallet-standard.js':
        subprocess.run(['node', '--input-type=module', '--check'], input=file.read_text(), text=True, check=True)
    else:
        subprocess.run(['node', '--check', str(file)], check=True)

# Existing transaction integrations remain tied to the preserved implementation snapshots.
for original, snapshot in [('wall.js', 'branch-wall.js'), ('lander.js', 'branch-lander.js')]:
    assert (root/'redesign/content/upstream'/original).read_text().strip() == (root/'redesign/content'/snapshot).read_text().strip(), original

robots = (docs/'robots.txt').read_text()
assert 'Allow: /' in robots and 'Disallow: /' not in robots
assert 'Sitemap: https://landingcoin.fun/sitemap.xml' in robots
assert 'landingcoin.fun' in (docs/'CNAME').read_text()
assert (docs/'.nojekyll').exists()
assert not (docs/'.openai').exists()

print(
    f"PASS: approved Sites v13 non-production-delta files remain byte-identical; "
    f"{len(public)} public pages are indexable; {len(manifest['redirects'])} compatibility redirects remain noindex; "
    "private review page removed; JS syntax, CNAME, crawl policy and integration provenance verified."
)
