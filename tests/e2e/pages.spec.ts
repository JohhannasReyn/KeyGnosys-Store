import { expect, test } from '@playwright/test';
import { ROUTES } from './helpers';

for (const path of ROUTES) {
  test(`${path} renders`, async ({ page }) => {
    const res = await page.goto(path);
    expect(res?.status()).toBe(200);
    await expect(page.locator('h1').first()).toBeVisible();
  });
}

test('unknown path returns the branded 404', async ({ page }) => {
  const res = await page.goto('/no-such-page/');
  expect(res?.status()).toBe(404);
  await expect(page.getByText("That key isn't mapped.")).toBeVisible();
});

test('download page lists every fixture artifact with checksums', async ({ page }) => {
  await page.goto('/download/');
  for (const f of ['KeyGnosys-1.0.0-windows-x64-setup.exe', 'KeyGnosys-1.0.0-linux-x64.AppImage', 'KeyGnosys 1.0.0 amd64.deb']) {
    await expect(page.getByRole('link', { name: f })).toBeVisible();
  }
  await expect(page.locator('code.sha').first()).toHaveText(/^[0-9a-f]{64}$/);
});

test('developer docs are never published', async ({ page }) => {
  expect((await page.goto('/docs/spec/'))?.status()).toBe(404);
});

test('newsletter checkbox is unchecked by default', async ({ page }) => {
  await page.goto('/teams/');
  await expect(page.locator('#cf-newsletter')).not.toBeChecked();
});
