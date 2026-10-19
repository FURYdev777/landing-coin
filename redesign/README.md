# LANDING: faithful Sites migration

The website in `docs/` is a byte-for-byte copy of the 57 public source files from Sites version 13, commit `6b5b89b619023e6d5b477667f3d45574a928f1be`. This replaces the earlier approximation on `sites-redesign` with the actual approved design: original SVG scenes, self-hosted fonts, all 24 HTML pages, grouped navigation, layout, scroll animation, pause/reduced-motion behavior and interactions.

`source-manifest.json` records SHA-256 hashes for every original file. Eleven additional redirect documents retain older GitHub URLs and the aliases served by the Sites Worker. The frontend uses the existing registry backend directly, so GitHub Pages requires no Sites Worker. The original Cloudflare backend, database configuration, mint, recipient, token amount and Jupiter integration remain untouched. Wall transaction functions are checked against the existing branch source. Lander verification still depends on registry-confirmed records; no ID is invented locally. Transparency keeps the existing backend classification and labels partial/missing data.

This branch is a review candidate. No merge, Pages deployment, DNS change, Sites deployment or backend write is included. The source's `noindex` and review labels are retained. Existing `docs/CNAME`, `.nojekyll`, videos, whitepaper and unrelated repository files are retained.

## Validation

The `LANDING redesign QA` workflow performs source-hash checks, local links/anchors, metadata, content, JavaScript syntax, isolated wallet/registry contract tests and startup simulations. A separate job renders every original page at 1440, 1024, 768, 430, 390 and 360 pixels, with screenshots and a machine-readable report in the `landing-redesign-browser-qa` Actions artifact. It serves files only on the runner's localhost; it never publishes them. Browser API responses are explicitly isolated fixtures. Failed checks must be resolved or reported before a production cutover.

Local checks:

```sh
python3 redesign/qa/verify-migration.py
python3 redesign/qa/verify-content.py
python3 redesign/qa/audit-final.py
node redesign/qa/preproduction-dom-smoke.cjs
node redesign/qa/test-live-flows.cjs /absolute/path/to/solana-web3-1.98.4/lib/index.iife.min.js
```

## Verification limits

The hosted source was inspected in the browser on desktop. The complete rendered branch still requires the browser workflow to pass. Isolated tests do not certify an actual wallet signature, a mainnet payment, an eligible live Jupiter swap, a new registry claim or a downloaded card produced by a real transaction. Those actions were not performed. Backend and CORS availability at the eventual production origin must remain part of release qualification. Source legal review labels are preserved.
