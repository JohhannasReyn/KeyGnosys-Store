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
