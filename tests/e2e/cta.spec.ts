import { expect, test, type Browser } from '@playwright/test';

const UA = {
  windows: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140.0 Safari/537.36',
  linux: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/140.0 Safari/537.36',
  mac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15',
  iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
};

/** Chromium reports the host OS via userAgentData; hide it (and host touch support) so the UA string under test decides. */
async function pageAs(browser: Browser, ua: string) {
  const ctx = await browser.newContext({ userAgent: ua });
  await ctx.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, 'userAgentData', { get: () => undefined });
    Object.defineProperty(Navigator.prototype, 'maxTouchPoints', { get: () => 0 }); // host touch hardware must not turn a Mac UA into mobile
  });
  const page = await ctx.newPage();
  await page.goto('/download/');
  return page.locator('[data-cta]').first();
}

test('Windows visitor gets the Windows installer', async ({ browser }) => {
  const cta = await pageAs(browser, UA.windows);
  await expect(cta.getByRole('link', { name: 'Download for Windows' })).toHaveAttribute('href', /windows-x64-setup\.exe$/);
  await expect(cta.getByRole('link', { name: 'Other platforms' })).toBeVisible();
});

test('Linux visitor gets the primary Linux artifact', async ({ browser }) => {
  const cta = await pageAs(browser, UA.linux);
  await expect(cta.getByRole('link', { name: 'Download for Linux' })).toHaveAttribute('href', /\.AppImage$/);
});

test('macOS visitor is told the truth and offered no download', async ({ browser }) => {
  const cta = await pageAs(browser, UA.mac);
  await expect(cta).toContainText('KeyGnosys is not yet available for macOS');
  await expect(cta.getByRole('link', { name: /Download for/ })).toHaveCount(0);
  await expect(cta.getByRole('link', { name: 'View available downloads' })).toHaveAttribute('href', '/download/');
});

test('mobile visitor is pointed at the downloads page', async ({ browser }) => {
  const cta = await pageAs(browser, UA.iphone);
  await expect(cta.getByRole('link', { name: 'View downloads' })).toBeVisible();
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });
  test('all available platforms are listed', async ({ page }) => {
    await page.goto('/download/');
    const cta = page.locator('[data-cta]').first();
    await expect(cta.getByRole('link', { name: 'Download for Windows' })).toBeVisible();
    await expect(cta.getByRole('link', { name: 'Download for Linux' })).toBeVisible();
  });
});
