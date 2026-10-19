"""Verify byte-for-byte Sites source fidelity and static Pages compatibility."""
from pathlib import Path
import hashlib, json, re, subprocess

root = Path(__file__).resolve().parents[2]
manifest = json.loads((root / 'redesign/source-manifest.json').read_text())
for name, expected in manifest['files'].items():
    actual = hashlib.sha256((root / 'docs' / name).read_bytes()).hexdigest()
    assert actual == expected, f'Sites source changed: {name}'
for name, target in manifest['redirects'].items():
    text = (root / 'docs' / name).read_text()
    assert f'href="{target}"' in text and 'noindex,nofollow' in text, name
    assert 'location.search+location.hash' in text, name
    destination = root / 'docs' / (target.lstrip('/') + ('index.html' if target.endswith('/') else ''))
    assert destination.exists(), (name, target)
for file in (root / 'docs').rglob('*.js'):
    subprocess.run(['node', '--check', str(file)], check=True)
for original, snapshot in [('wall.js', 'branch-wall.js'), ('lander.js', 'branch-lander.js')]:
    assert (root/'redesign/content/upstream'/original).read_text().strip() == (root/'redesign/content'/snapshot).read_text().strip(), original
assert 'Disallow: /' in (root/'docs/robots.txt').read_text()
assert 'landingcoin.fun' in (root/'docs/CNAME').read_text()
assert (root/'docs/.nojekyll').exists()
assert not (root/'docs/.openai').exists()
print(f"PASS: all {len(manifest['files'])} original Sites files are byte-identical; {len(manifest['redirects'])} compatibility URLs resolve; JS syntax, review noindex, CNAME and source integration provenance verified.")
