# Testing keygnosys.com

| Command | What it checks |
|---|---|
| `npm test` | Unit tests (Vitest): validation, release/docs/trust rules, CSP hashing, Worker handlers |
| `npx playwright test` | Builds with fixtures + all optional sections (`build:e2e`), runs the Worker locally (`wrangler dev --env e2e`), tests pages, CTA, forms with/without JS, 3D fallbacks, third-party requests, CSP violations, headers |
| `npm run check:static` | Built HTML/CSS: no cross-origin resources or hints; all internal links resolve |
| `npm run check:budget` | Initial transfer per route ≤ 300 KB Brotli (quality 11), counting HTML, CSS, JS, fonts and images requested before network idle, excluding the lazy `three`/`keyboard-scene` chunks. Sizes are computed from `dist/` files, not from the network, so results are deterministic. |
| `npm run check:lighthouse` | Lighthouse (npm `lighthouse`, version pinned in package-lock), default mobile config with simulated throttling, Playwright's Chromium, headless; 3 runs per route; median; performance ≥ 95 and accessibility ≥ 95 |

Lighthouse runs against `astro preview` (static files only), on GitHub's `ubuntu-24.04` runner in CI. Simulated throttling makes scores mostly independent of runner speed. If a performance score flaps around 95, check the run-to-run spread in the log before changing anything; do not lower the threshold.
