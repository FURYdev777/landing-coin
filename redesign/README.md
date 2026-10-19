# LANDING: faithful Sites migration

The website in `docs/` is the production-prepared GitHub Pages port of the approved LANDING Sites version 13, source commit `6b5b89b619023e6d5b477667f3d45574a928f1be`.

The migration preserves the original visual/runtime implementation: SVG scenes, self-hosted fonts, grouped navigation, layouts, scroll animation, pause/reduced-motion behavior and interactions. The source provenance hashes remain in `redesign/source-manifest.json`.

## Intentional production deltas

The approved Sites build was a private review build. Before production, the branch intentionally changes only release-state material:

- canonical public pages are indexable;
- `robots.txt` allows crawling and references the production sitemap;
- private-review labels and the private review utility page are removed;
- legal pages are labeled as current policies rather than owner-review drafts;
- the production sitemap includes the canonical public legal pages;
- compatibility redirects remain `noindex,nofollow`;
- the 404 page remains `noindex`.

Non-release visual/runtime source files from Sites v13 remain byte-identical where required by QA.

## Existing integrations preserved

The frontend continues to use the existing registry backend directly, so GitHub Pages does not require a Sites Worker.

Wall transaction functions preserve the existing 5,000 LANDING payment, memo and verification flow. Certified Lander preserves Jupiter, registry-confirmed IDs, recovery and card download. Transparency preserves the existing backend classification and unavailable/partial-data handling.

The Cloudflare backend, D1/database configuration, mint, recipient, token amount, Jupiter integration, `docs/CNAME`, videos and unrelated repository files are not changed by the production-preparation pass.

## Validation

The `LANDING redesign QA` workflow checks:

- Sites v13 source provenance outside the intentional production deltas;
- production indexing/crawl state;
- local routes, assets and anchors;
- metadata, Open Graph, canonicals and structured data;
- JavaScript syntax;
- Wall/Lander integration contracts using isolated fixtures;
- all-page startup;
- responsive rendering at 1440, 1024, 768, 430, 390 and 360 px;
- horizontal overflow, runtime errors, broken images, menus, FAQ and motion controls.

The browser tests run only on localhost with isolated read-only fixtures. They do not publish, sign transactions or write to production services.

## Verification limits

Automated QA does not certify an actual wallet signature, a mainnet Wall payment, an eligible live Jupiter swap, a new Certified Lander registry claim or a card exported from a real transaction. Those actions require final live verification after deployment on the production origin.

The branch remains separate from `main` until explicit merge approval.
