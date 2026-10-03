import { expect, test } from '@playwright/test';

test.use({ javaScriptEnabled: false });

test('without JavaScript every section and the footer are reachable by scrolling', async ({ page }) => {
  await page.goto('/');
  expect(await page.evaluate(() => document.documentElement.scrollHeight > window.innerHeight)).toBe(true);
  for (const id of ['h-hero', 'h-diff', 'h-caps', 'h-trust']) {
    const h = page.locator(`#${id}`);
    await h.scrollIntoViewIfNeeded();
    await expect(h).toBeInViewport();
  }
  const privacy = page.locator('footer').getByRole('link', { name: 'Privacy' });
  await privacy.scrollIntoViewIfNeeded();
  await expect(privacy).toBeInViewport();
  await expect(page.locator('.hero-static img')).toBeVisible();
});
