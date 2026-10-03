import { expect, test } from '@playwright/test';
import { ageForms, clearOutbox, fillContact, ROUTES } from './helpers';

const ORIGIN = 'http://127.0.0.1:8788';

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    (window as unknown as { __csp: string[] }).__csp = [];
    document.addEventListener('securitypolicyviolation', (e) =>
      (window as unknown as { __csp: string[] }).__csp.push(`${e.violatedDirective} ${e.blockedURI}`));
  });
});

for (const path of ROUTES) {
  test(`no third-party requests or CSP violations on ${path}`, async ({ page, context, request }) => {
    const offsite: string[] = [];
    await context.route('**/*', (route) => {
      const url = route.request().url();
      if (!url.startsWith(ORIGIN) && !url.startsWith('data:')) { offsite.push(`${route.request().resourceType()} ${url}`); return route.abort(); }
      return route.continue();
    });
    const res = await page.goto(path);
    expect(res?.headers()['content-security-policy']).toContain("default-src 'self'");
    await page.mouse.wheel(0, 1200);
    if (path === '/') for (const name of ['Base', 'Ctrl · Chrome', '⇪ Cursor']) await page.getByRole('button', { name }).click({ timeout: 2000 }).catch(() => {});
    if (path === '/teams/') {
      await clearOutbox(request);
      await fillContact(page);
      await ageForms(page);
      await page.getByRole('button', { name: 'Send message' }).click();
      await page.waitForURL('**/teams/thanks/');
    }
    await page.waitForLoadState('networkidle');
    expect(offsite).toEqual([]);
    expect(await page.evaluate(() => (window as unknown as { __csp: string[] }).__csp)).toEqual([]);
    expect(await page.locator('link[rel~="prefetch"], link[rel~="preconnect"], link[rel~="dns-prefetch"], a[data-astro-prefetch]').count()).toBe(0);
  });
}
