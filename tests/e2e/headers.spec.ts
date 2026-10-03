import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

const expected = JSON.parse(readFileSync('worker/generated/security-headers.json', 'utf8')) as Record<string, string>;

function check(headers: Record<string, string>) {
  for (const [k, v] of Object.entries(expected)) expect(headers[k.toLowerCase()], k).toBe(v);
  const csp = headers['content-security-policy'];
  expect(csp).toContain("frame-ancestors 'none'");
  expect(csp.split(';').find((d) => d.trim().startsWith('script-src'))).not.toMatch(/unsafe-inline|unsafe-eval/);
}

/** Astro inlines small scripts, so fall back to a stylesheet or any /_astro/ asset URL in the page. */
async function hashedAsset(page: Page): Promise<string> {
  await page.goto('/');
  let asset: string | null = null;
  for (const [selector, attr] of [
    ['script[src^="/_astro/"]', 'src'],
    ['link[rel="stylesheet"][href^="/_astro/"]', 'href'],
    ['link[rel="modulepreload"][href^="/_astro/"]', 'href'],
  ] as const) {
    const loc = page.locator(selector);
    if ((await loc.count()) > 0) { asset = await loc.first().getAttribute(attr); if (asset) break; }
  }
  asset ??= (await page.content()).match(/(?:src|href)="(\/_astro\/[^"]+)"/)?.[1] ?? null;
  expect(asset, 'an /_astro/ asset must be present on /').toBeTruthy();
  return asset!;
}

test('static pages, docs, assets, feed and API all carry the required headers', async ({ request, page }) => {
  const asset = await hashedAsset(page);
  for (const path of ['/', '/docs/', '/releases.xml', asset]) check((await request.get(path)).headers());
  check((await request.get('/api/contact')).headers());
  check((await request.post('/api/contact', { form: { name: '' }, headers: { Accept: 'application/json' } })).headers());
});

test('hashed assets are long-cached', async ({ request, page }) => {
  const asset = await hashedAsset(page);
  expect((await request.get(asset)).headers()['cache-control']).toBe('public, max-age=31536000, immutable');
});
