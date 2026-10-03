# keygnosys.com Website — Design Spec

- **Date:** 2026-10-02
- **Status:** Draft for review
- **Repo:** `JohhannasReyn/KeyGnosys-Store` (this repo) — site source, public
- **App repo:** `JohhannasReyn/KeyGnosys` (MIT, C++/Python)
- **Domain:** `keygnosys.com`

## 1. Purpose and principles

KeyGnosys is a free, open-source, application-aware keyboard overlay and learning tool ("Master Keys to Your System"). The website's job is to:

1. Get people to a trustworthy download.
2. Prove — not just claim — that KeyGnosys and the site are clean.
3. Explain how to use it (docs).
4. Bring in sustainable revenue through services and sponsorship, never through the app itself.

**Principles (binding on every section below):**

- The app is free and open source, and core functionality is never paywalled. Configs and community profiles are free. No ads or telemetry.
- This does not foreclose future paid ecosystem services or creator products; any such offering needs its own spec and must not gate core functionality.
- The site makes **no third-party background requests** from the visitor's browser (precise definition in §6.1).
- Anything that must talk to an external service does so **at build time** or **server-side behind `keygnosys.com`**.
- Truthful by construction: the site never advertises something that doesn't exist (a platform build, a price, a feature).
- Unfinished business items are **omitted**, not shown as dead "Coming soon" cards, unless the placeholder itself is useful.

## 2. Scope

### In scope
Marketing home, download page, trust page, docs, "For teams & vendors" page with contact form, newsletter signup, supporter page (when configured), configs placeholder, privacy page, release feed, 404.

### Out of scope (separate specs)
- **Config catalog** — discovery, browsing, curation. Next spec.
- **Accounts / forum** — decided: use GitHub accounts. Forum = GitHub Discussions; config submissions = pull requests. No KeyGnosys account system.
- **App-side work** — release workflow, user guide content, any Linux/macOS backend work. The site only depends on the contracts defined in §5 and §9.
- Ratings, creators, sync, paid ecosystem content — not part of this site.

## 3. Pages

| Route | Content | Shown when |
|---|---|---|
| `/` | Existing 3D keyboard page, ported. Platform-aware download CTA (§4). Nav: Download · Docs · Trust · Teams · Community ↗ · GitHub ↗ (· Support when configured). | Always |
| `/download` | Latest version, release notes, artifact table grouped by platform (file, arch, format, size, SHA-256, link to build run). Verification instructions. Newsletter signup. "No release yet" state links to source. | Always |
| `/trust` | (a) What the app does and does not do — every claim links to the source lines that prove it. (b) How to verify a download: checksum + `gh attestation verify` commands. (c) This website: no cookies, no analytics, no third-party requests, CSP shown, link to site source and its public build logs. | Always |
| `/docs/…` | Starlight docs built from app repo `docs/guide/` (§9.2). | When `docs/guide/` exists; otherwise nav link omitted |
| `/teams` | Enterprise (deployment tooling, central config management, priority support) — contact. Custom configs for proprietary software — contact. Sponsored official configs for software vendors — contact. Workshops — fixed price if configured, otherwise contact. Contact form (§7). | Always |
| `/teams/thanks` | First-party success page after contact POST. | Always |
| `/support` | Supporter tiers with prices; links to GitHub Sponsors / Open Collective. Supporters get thanks and credit, never features. | Only when sponsorship is configured (§10). Otherwise route and nav link omitted |
| `/configs` | "Catalog coming soon." Link to configs folder on GitHub and "Submit a config via pull request" guide. | Always (useful placeholder) |
| `/subscribe/check-email`, `/subscribe/confirmed` | Newsletter double opt-in steps. | When newsletter configured |
| `/privacy` | Plain-English privacy policy (§8.4). | Always |
| `/releases.xml` | Atom feed of releases — email-free update option. | Always (empty feed before first release) |
| 404 | Branded not-found page. | — |

Community link → GitHub Discussions on `JohhannasReyn/KeyGnosys` (omitted until Discussions is enabled).

## 4. Download CTA logic

The CTA is driven by **both** the detected visitor OS **and** the artifacts actually present in the baked release manifest (§5). Detecting an OS never implies support for it.

| Visitor OS | Matching artifact in manifest? | CTA |
|---|---|---|
| Windows | yes | **Download for Windows** (primary artifact) + "Other platforms" |
| Linux | yes | **Download for Linux** (primary artifact) + "Other platforms" |
| Windows / Linux | no | "KeyGnosys isn't available for {OS} yet" + [View available downloads] |
| macOS | no (current state) | "KeyGnosys is not yet available for macOS" + [View available downloads] |
| Mobile / unknown | — | [View downloads] |
| Any, no release exists | — | "First release coming soon" + [View source on GitHub] |
| No JavaScript | — | Static list of every available platform from the manifest (server-rendered) |

- The CTA's platform list comes from the manifest. Code never constructs a download URL for a platform not in the manifest.
- OS detection: small first-party script reading `navigator.userAgentData?.platform` with `navigator.userAgent` fallback. Pure function `detectOS(ua, uaData) → 'windows' | 'linux' | 'macos' | 'mobile' | 'unknown'`.
- CTA selection: pure function `selectCta(os, manifest) → CtaModel`, unit-tested over the full matrix above.

## 5. Release data

### 5.1 Flow

```
App repo: release published
      │  (release workflow attaches artifacts + keygnosys-release.json)
      ▼
repository_dispatch → site repo GitHub Action
      ▼
Site build fetches latest release + manifest from GitHub API (read-only token)
      ▼
Validated manifest baked into static output (/releases.json, /download, CTA data, /releases.xml)
      ▼
Deployed to Cloudflare. Visitors never call the GitHub API.
```

Clicking a download link navigates to the GitHub-hosted asset — a deliberate user navigation, allowed under §6.1.

### 5.2 Release manifest contract

Every app release **must** attach `keygnosys-release.json`, generated by the app's release workflow (not hand-written). The site does **not** classify artifacts by filename.

```json
{
  "schema": 1,
  "version": "1.0.0",
  "tag": "v1.0.0",
  "commit": "<full git sha>",
  "published": "2026-10-15T12:00:00Z",
  "buildRunUrl": "https://github.com/JohhannasReyn/KeyGnosys/actions/runs/<id>",
  "artifacts": [
    {
      "platform": "windows",
      "arch": "x64",
      "format": "installer",
      "file": "KeyGnosys-1.0.0-windows-x64-setup.exe",
      "size": 12345678,
      "sha256": "<64 hex chars>",
      "primary": true
    }
  ]
}
```

- `platform`: `windows | linux` (extensible; `macos` only when a real build exists).
- **Schema support for a platform does not imply product support.** Only a validated artifact attached to a real published release establishes availability. The site never lists, links, or advertises a platform from schema values, configuration, or detection alone.
- `format`: `installer | portable | appimage | deb | rpm | tarball`.
- Exactly one `primary: true` per platform (the CTA target).
- `artifacts` is an array because one platform may ship several formats.

### 5.3 Build-time validation (`src/lib/releases.ts`)

| Situation | Result |
|---|---|
| No releases exist (API 200, empty) | Normal "no release yet" state. Build succeeds. |
| Latest release has valid manifest | Baked into output. |
| Release exists but manifest missing | **Build fails.** |
| Manifest fails schema (zod), duplicate/missing primary, malformed sha256 | **Build fails.** |
| Manifest names a file not attached to the release, or size mismatch | **Build fails.** |
| GitHub API error / timeout / rate limit | **Build fails.** |

A failed build never deploys; the currently deployed site is unaffected.

## 6. Architecture

### 6.1 Third-party request rule (normative)

**Rule:** During page rendering and in-page interaction, the visitor's browser makes no request to any origin other than the site's own origin.

- **Counts as a violation:** any subresource (script, style, font, image, media, iframe, worker), any `fetch`/XHR/beacon/WebSocket, any `preconnect`/`dns-prefetch`/`prefetch`/`preload` hint to another origin, and any form POST to another origin.
- **Allowed:** top-level navigations the user deliberately initiates (clicking a link to GitHub, Discussions, or a release asset download).
- **External services** (GitHub API, email, newsletter provider) are reached only at build time or from first-party server endpoints (`/api/*`).
- **Consequences:** fonts self-hosted; Three.js and all 3D assets bundled from npm; no CDN script/style/font URLs anywhere; no analytics; no third-party CAPTCHA.

Enforced by the test in §11.3 and by the CSP in §6.5.

### 6.2 Stack and hosting

- **Astro** (static output) + **Starlight** for `/docs`.
- **Cloudflare Workers with static assets** (verified 2026-10-02 as Cloudflare's recommendation for new projects). Server endpoints `/api/contact` and `/api/subscribe` run as Worker routes on the same origin. Static-asset routing, bindings and preview settings are defined in `wrangler.jsonc` (not only in the dashboard). Wrangler is pinned at a version supporting Worker Previews (≥ 4.135.0).
- **Deploys run in this repo's GitHub Actions** (`wrangler deploy`) on push to `main` and on `repository_dispatch` from the app repo. Every PR (including from forks) runs the full build and test suite without secrets. Fork PRs get build and test only, with no deployment or provider secrets. Preview deployments, which need Cloudflare credentials, run only for trusted PR contexts (branches in this repo). Previews deploy to a **separate preview Worker** that has no email binding and no newsletter credentials: its forms run in a sandbox mode that never contacts production email or newsletter resources. Build logs are public.
- DNS for `keygnosys.com` on Cloudflare; Email Routing forwards `hello@keygnosys.com` to the owner's inbox.

### 6.3 Repo layout

```
src/pages/            index, download, trust, teams, teams/thanks, support, configs, privacy,
                      subscribe/*, releases.xml.ts, 404
src/components/       KeyboardScene, DownloadCta, AssetTable, PriceCard, ContactForm, SubscribeForm
src/lib/releases.ts   fetch + validate manifest (build time)
src/lib/os.ts         detectOS, selectCta (pure)
src/lib/contact.ts    validation + spam checks (pure, shared by endpoint)
src/config/site.ts    feature config: sponsorship, workshop prices, newsletter, discussions (§10)
src/content/docs/     populated at build time from app repo docs/guide/
worker/               /api/contact, /api/subscribe handlers
public/fonts/         self-hosted WOFF2 subsets
```

### 6.4 Performance

- Three.js installed from npm (current version, replacing CDN r128), imported as ES modules so only used parts are bundled.
- 3D scene lazy-loaded after first render (idle callback / visibility). With no WebGL or `prefers-reduced-motion: reduce`, a static keyboard image is shown instead; all content and CTAs work identically.
- Fonts (Fraunces, Hanken Grotesk, JetBrains Mono) self-hosted as subsetted WOFF2; the primary text face is preloaded; `font-display: swap`.
- Images via Astro's image pipeline (AVIF/WebP, responsive sizes).
- Cache: hashed assets `Cache-Control: public, max-age=31536000, immutable`; HTML revalidates.

### 6.5 Security headers

Required on every response (HTML, assets, `/api/*`). The delivery mechanism (e.g. Workers static-asset header config vs. headers set in the Worker) is chosen in the implementation plan after verification (§13); the values below are normative.

| Header | Value |
|---|---|
| `Content-Security-Policy` | `default-src 'self'; script-src 'self' <build-generated hashes>; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'self'; object-src 'none'` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `no-referrer` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), usb=(), payment=()` |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` — enabled only after production HTTPS is verified on apex and `www`. No preload initially. |

No `'unsafe-inline'` for scripts. Any unavoidable inline script (e.g. Starlight's theme bootstrap) is allowed only by a hash computed at build time. Astro is configured not to inline stylesheets.

## 7. Contact form

### 7.1 Fields and limits

| Field | Rule |
|---|---|
| `name` | required, 1–100 chars, no control chars |
| `email` | required, ≤254 chars, single address, syntactic check, no CR/LF |
| `company` | optional, ≤100 chars |
| `interest` | required enum: `enterprise · custom-config · sponsored-config · workshop · other` |
| `message` | required, 10–5000 chars |
| `newsletter` | optional checkbox, **unchecked by default** |
| `website` | honeypot (hidden; must be empty) |
| `t` | form render timestamp (submission under 3 s is a spam *signal*, not grounds for discard on its own) |

### 7.2 Base behavior (no JavaScript)

`<form method="post" action="/api/contact">`. The endpoint:

1. Applies rate limiting: Cloudflare's native Rate Limiting binding, **3 requests per 60 seconds per visitor**, shared across `/api/contact` and `/api/subscribe`.
   - This is an intentional change from the earlier 5-per-10-minutes draft (the binding supports only 10 s or 60 s periods), not an equivalent.
   - It is a **burst-abuse control, not a globally strict quota**: Cloudflare's counters are local to each data-center location and eventually consistent.
   - The client IP is used only transiently, as the input to an anonymous limiter key (salted SHA-256 hash). It is never persisted or logged.
2. Validates every field server-side (client validation is advisory only).
3. On validation errors: responds `422` with a first-party HTML page re-rendering the form with field errors and submitted values preserved (newsletter box keeps the visitor's choice).
4. Honeypot filled: `303` → `/teams/thanks` as if successful, and sends nothing. Fast submission (< 3 s) alone: the message is still delivered, with the subject prefixed `[Possible spam]` and the newsletter opt-in not acted on.
5. On success: sends the email, then `303` → `/teams/thanks`.
6. Rate-limited requests get `429` with a first-party page (or JSON) asking to retry later or email directly.

### 7.3 JavaScript enhancement

Same endpoint, `Accept: application/json`, inline errors, no reload. No separate behavior path.

### 7.4 Server-side safety

- `From` is a fixed first-party address. `To` is fixed. Subject is built from the `interest` enum only. The visitor's email appears only in `Reply-To`, after validation. No user-controlled headers.
- Body sent as plain text.
- Provider credentials are Worker secrets, never shipped to the client.
- Logs record only outcome codes (e.g. `contact.sent`, `contact.invalid`, `contact.provider_error`) — never names, emails, or message content.
- Provider failure → `502` page/JSON: "We couldn't send this — email hello@keygnosys.com directly." The submitted values are re-rendered so nothing is lost.
- If spam becomes a demonstrated problem, any added control must keep §6.1 (first-party only).

Delivery uses Cloudflare Email Routing's send-email binding to the verified owner address.

## 8. Newsletter

### 8.1 Consent

- Never implied by any other action. Contact form checkbox is unchecked by default.
- Subscription happens only after explicit selection **and** double opt-in confirmation.
- Standalone signup: single email field on `/download` and in the footer, posting to `/api/subscribe`.
- Email-free alternative: `/releases.xml`.

### 8.2 Separate operations

Contact and newsletter are independent operations, even when submitted together:

1. Contact message is validated and sent first.
2. Only if the checkbox was checked **and** the contact succeeded, the server calls the newsletter provider.
3. A newsletter failure never fails or loses the contact message. The success page says: "Message sent. We couldn't start your subscription — you can sign up on the Download page."

### 8.3 Provider

- Browser never contacts the provider. `/api/subscribe` and `/api/contact` call it server-side.
- Requirements: API subscriber creation, double opt-in, one-click unsubscribe, open/click tracking disabled. Candidate: Buttondown (confirm capabilities at plan time).
- Subscriber data lives only at the provider — no site database.
- Every email includes an unsubscribe link and the owner's postal address (CAN-SPAM).

### 8.4 Privacy page covers

What is collected (contact: sent to owner's inbox, not stored by the site; newsletter: email + signup date at the named provider), why, retention, how to unsubscribe or request deletion, the transient IP use for rate limiting, and that newsletters carry no tracking.

## 9. Content sources

### 9.1 Home page port
The existing `index.html` (committed as `KeyGnosys Orbit.html` in `221a852`) is ported into Astro components: copy and design preserved; Google Fonts and cdnjs Three.js replaced per §6; "Get it for Windows" replaced by `DownloadCta`.

### 9.2 Docs
Build fetches `docs/guide/` (Markdown + referenced images from `docs/images/`) from:

- **Before any release exists:** the app repo's `main` branch.
- **Once a release exists:** the commit of the latest release (the manifest's `commit`). Public docs therefore never describe behavior newer than the downloadable release. Doc fixes ship with the next release (a docs-only patch release is acceptable).

The docs page footer states which version/commit the docs describe. Developer docs (`SPEC.md`, plans, test logs, superpowers specs) are never published. If `docs/guide/` does not exist at that ref (API 404), docs are omitted and the nav link hidden; any other API error fails the build.

### 9.3 Trust claims
Each claim on `/trust` about app behavior (e.g. "no network access", "no keystroke content written to disk") must cite evidence — source, tests, build config, or architecture docs — via permalinks **pinned to a commit SHA** (never `main` or moving line numbers). Claims describing a downloadable release cite evidence at that release manifest's `commit`; before the first release, evidence is pinned to a specific `main` commit and labelled as pre-release. When a new release changes the cited commit, claims are re-verified and links updated as part of the release checklist. A claim without pinned evidence is not published. Claims **default to unpublished**: a claim appears only after the owner explicitly marks its evidence as checked (`verified: true`). Implementers and automation never set that flag.

## 10. Feature configuration

`src/config/site.ts` controls optional sections. When unset, the section, its route (where applicable), and nav link are omitted.

| Key | Controls |
|---|---|
| `sponsorship` (Sponsors/Open Collective URLs + tiers) | `/support`, nav link |
| `workshopPricing` | Fixed prices on `/teams`; otherwise workshops show "contact" |
| `newsletter` (provider configured + postal address) | Signup forms, contact checkbox, `/subscribe/*` |
| `discussionsUrl` | Community nav link |

## 11. Testing

All run in GitHub Actions on every PR; deploy requires green.

### 11.1 Unit (Vitest)
- `releases.ts`: every row of §5.3 using fixtures; primary-per-platform; platform list derived only from manifest.
- `os.ts`: `detectOS` for Windows, Linux, macOS, iOS, Android, unknown; `selectCta` over the full §4 matrix including macOS-without-artifact, platform-detected-but-no-artifact, no-release.
- `contact.ts`: every field rule; honeypot discards; fast submission alone is delivered with `[Possible spam]` tag and no newsletter action; header-injection attempts (CR/LF in email/name).
- Endpoint handlers (with mocked bindings): newsletter call only when checked; newsletter failure keeps contact success; provider failure returns fallback with values preserved; logs contain no PII.

### 11.2 Browser (Playwright, against local `wrangler dev`)
- Every route renders.
- CTA matches each emulated OS × manifest fixture (incl. macOS fallback).
- Contact form: success, validation errors and provider failure — each **with JS disabled and enabled**.
- 3D scene falls back to static image with WebGL disabled and with reduced motion.

### 11.3 Third-party request test
Playwright records every request while loading each route and running scripted interactions (scroll, layer toggles, form fill/submit against mocked providers, OS emulation). Fails on any request matching §6.1's violation list. External links are asserted to be plain `<a href>` without prefetch, and are not followed. A static check also scans built HTML for any cross-origin `src`, `<link>` resource hint, or form `action`.

### 11.4 Performance budget
- **Initial route transfer ≤ 300 KB, Brotli-compressed**, counting: HTML, CSS, JS executed before the 3D trigger, fonts used in first render, first-render images. Excluding: lazily loaded 3D scene/assets and anything loaded only after deliberate interaction. Measured deterministically: Playwright collects the pre-trigger request list; a script sums the Brotli-compressed size of those build files. Hard fail.
- **Lighthouse CI** (pinned Lighthouse version, mobile preset, simulated throttling, median of 3 runs, config committed): accessibility ≥ 95 hard fail; performance ≥ 95 asserted. The environment is documented in the config so variance failures are diagnosable.

### 11.5 Headers
Test asserts §6.5 headers on local preview for HTML, assets and `/api/*` responses. A post-deploy smoke check verifies the same against both production hostnames, the apex `keygnosys.com` and `www.keygnosys.com` (following www's redirect to the apex), over HTTPS. HSTS stays disabled until that check passes on both hostnames, and is asserted once enabled.

### 11.6 Links
Link checker over built output (internal hard fail; external reported).

## 12. Dependencies

### A. Site development dependencies
**None.** Everything builds against fixtures and placeholders.

### B. Functional production dependencies (each gates only its own feature)

| Dependency | Unlocks |
|---|---|
| App release workflow publishing artifacts + `keygnosys-release.json` + checksums + build attestation | Real downloads, CTA, trust verification steps |
| App repo `repository_dispatch` step on release | Automatic site rebuild on release |
| `docs/guide/` in app repo (at least getting-started) | `/docs` and nav link |
| `keygnosys.com` on Cloudflare DNS + Email Routing for `hello@` | Production domain, contact form delivery |
| Newsletter provider account (tracking off, double opt-in on) + postal address (PO box / virtual mailbox) | Newsletter signup |
| GitHub Discussions enabled | Community nav link |

**Initial launch requires only:** Cloudflare DNS + Email Routing. Without a release the site truthfully shows "first release coming soon".

### C. Optional ecosystem/business dependencies (never block launch)
GitHub Sponsors / Open Collective and tier prices · workshop pricing · config catalog spec · any future ecosystem features. Omitted from the site until configured (§10).

## 13. Planning-time verification

Must be confirmed before implementation starts; the plan records the outcome and adjusts the mechanism (not the requirements) if needed:

1. Cloudflare's current recommended hosting for new projects (Workers static assets vs. Pages) and its PR-preview model.
2. The mechanism for applying §6.5 security headers to static assets and `/api/*` responses on the chosen platform.
3. Cloudflare Email Routing send-email binding restrictions (verified destinations, sender domain requirements, DNS prerequisites, limits).
4. Cloudflare Rate Limiting binding availability and semantics on the chosen plan. (Verified: GA; periods 10 s or 60 s only; location-local. Resolved by the 3-per-60-s decision in §7.2.)
5. Newsletter provider (Buttondown or alternative): API subscriber creation, double opt-in, one-click unsubscribe, ability to disable open/click tracking.
6. Starlight/Astro compatibility with a hash-based CSP (no `'unsafe-inline'` scripts) and non-inlined styles.
