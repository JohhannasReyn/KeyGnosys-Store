import { expect, test } from '@playwright/test';

test('3D scene engages and hidden overlays are inert', async ({ page }) => {
  await page.goto('/');
  await page.mouse.move(10, 10);
  await page.mouse.move(200, 200);
  await expect(page.locator('body')).toHaveClass(/immersive/, { timeout: 20_000 });
  await expect(page.locator('#gl')).toBeVisible();
  await expect(page.locator('.ov[data-page="1"]')).toHaveAttribute('inert', '');
  await expect(page.locator('.ov[data-page="0"]')).not.toHaveAttribute('inert', '');
});

test('reduced motion stays flat and never downloads three.js', async ({ page }) => {
  const lazy: string[] = [];
  page.on('request', (r) => { if (/\/_astro\/(three|keyboard-scene)[.-]/.test(r.url())) lazy.push(r.url()); });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.waitForTimeout(3000);
  await expect(page.locator('body')).not.toHaveClass(/immersive/);
  expect(lazy).toEqual([]);
});

test('mini keyboard switches layers', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); // keep flat for a stable layout
  await page.goto('/');
  await page.getByRole('button', { name: '⇪ Cursor' }).click();
  await expect(page.getByRole('button', { name: '⇪ Cursor' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#minikbd .mk.co').first()).toBeVisible();
});

test('short landscape viewport stays flat with a usable Download CTA', async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto('/');
  await page.mouse.move(10, 10);
  await page.mouse.move(200, 200);
  await page.waitForTimeout(3000);
  await expect(page.locator('body')).not.toHaveClass(/immersive/);
  await expect(page.locator('html')).not.toHaveClass(/immersive-pending/);
  const cta = page.locator('[data-cta] a').first();
  await expect(cta).toBeVisible();
  await cta.click({ trial: true });
});

test('shrinking below the immersive size falls back to the flat, scrollable page', async ({ page }) => {
  await page.goto('/');
  await page.mouse.move(10, 10);
  await page.mouse.move(200, 200);
  await expect(page.locator('body')).toHaveClass(/immersive/, { timeout: 20_000 });
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(page.locator('[data-cta] a').first()).toBeVisible();
  await expect(page.locator('.ov[data-page="3"]')).not.toHaveAttribute('inert', '');
  await page.mouse.wheel(0, 600);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
});
