import { expect, test } from '@playwright/test';

test('without WebGL the page stays flat with the static image and working CTA', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(3000);
  await expect(page.locator('body')).not.toHaveClass(/immersive/);
  await expect(page.locator('.hero-static img')).toBeVisible();
  await expect(page.locator('[data-cta] a').first()).toBeVisible();
});
