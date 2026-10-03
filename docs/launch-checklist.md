# Launch checklist

## Required for keygnosys.com to go live
1. Cloudflare: add the `keygnosys.com` zone and switch nameservers at the registrar (the domain can stay registered where it is).
2. Email Routing: enable; add and **verify** the owner's inbox as a destination; route `hello@keygnosys.com` to it.
3. GitHub repo secrets `CLOUDFLARE_API_TOKEN` (Workers Scripts: Edit) and `CLOUDFLARE_ACCOUNT_ID`; create the `production` environment.
4. Worker secrets: `npx wrangler secret put CONTACT_TO` (verified inbox) and `RL_KEY_SALT` (random 32+ chars).
5. Add custom domains to `wrangler.jsonc` (`"routes": [{ "pattern": "keygnosys.com", "custom_domain": true }]`) and a Cloudflare redirect rule `www.keygnosys.com/*` → `https://keygnosys.com/$1`. Set repo variables `SITE_URL=https://keygnosys.com` and `SITE_WWW_URL=https://www.keygnosys.com`.
6. Once the custom domain serves the site, set `"workers_dev": false` for production (top level of `wrangler.jsonc`, not `env.preview`) and deploy, so the `*.workers.dev` URL stops serving the production Worker.
7. Preview Worker: the first trusted PR creates `keygnosys-site-preview`. **Never** set `CONTACT_TO`, `BUTTONDOWN_API_KEY` or an email binding on it. Its forms are sandboxed by design.
8. HSTS: only after `npx tsx scripts/check-headers.ts https://keygnosys.com https://www.keygnosys.com` passes (both hostnames serve over HTTPS and www lands on the apex), set `hsts: true` in `src/config/site.ts` and deploy. The next post-deploy check then asserts HSTS on both.
9. Production deploys are disabled until `PRODUCTION_DEPLOY_ENABLED=true`. Set that repo variable (Settings → Secrets and variables → Actions → Variables) once items 1–5 are done; until then `deploy.yml` runs CI on `main` but skips the `deploy` job.

## Preview deployments
`.github/workflows/preview.yml` deploys same-repo PRs and manual (`workflow_dispatch`) runs to the separate `keygnosys-site-preview` Worker; fork and Dependabot PRs never deploy, and the production Worker is never touched. Each run updates the stable URL `https://keygnosys-site-preview.<subdomain>.workers.dev`, and each PR also gets a `pr-<number>` preview alias; both URLs are written to the run's summary. Required (names only):
- Repo secret `CLOUDFLARE_API_TOKEN` with Account → Workers Scripts: Edit and Account Settings: Read.
- Repo secret `CLOUDFLARE_ACCOUNT_ID`.
- A registered workers.dev subdomain on the Cloudflare account (Workers & Pages → your subdomain).
- No other secrets: preview forms are sandboxed (`SANDBOX_FORMS=on`), so it needs no `CONTACT_TO`, `RL_KEY_SALT`, `BUTTONDOWN_API_KEY` or email setup.

## Each feature turns on when its dependency is ready
- Downloads: app release workflow per docs/app-release-integration.md.
- Docs: `docs/guide/` in the app repo (at least a getting-started page).
- Newsletter: Buttondown account; confirm open/click tracking is **off**; set the confirmation redirect to
  `https://keygnosys.com/subscribe/confirmed/`; add the postal address (PO box/virtual mailbox) to Buttondown's footer;
  `npx wrangler secret put BUTTONDOWN_API_KEY`; set `newsletter: { postalAddress }` in `src/config/site.ts`.
- Community: enable GitHub Discussions on the app repo; set `discussionsUrl`.

## Re-verify trust claims
Claims default to unpublished (`verified: false`). Only the owner sets `verified: true`; implementers, reviewers and automation never do.
- Review each drafted claim's evidence in `src/data/trust-claims.ts`; set `verified: true` only after reading it.
  **On every app release**, re-pin evidence to the new manifest `commit`, re-read it, and keep `verified: true` only if it still holds
  (the build warns and hides stale claims until you do).

## Optional, never blocks launch
- `sponsorship` (GitHub Sponsors / Open Collective + tiers) → `/support/` appears.
- `workshopPricing` → prices on `/teams/`.
