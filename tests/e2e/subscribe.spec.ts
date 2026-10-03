import { expect, test } from '@playwright/test';
import { clearOutbox, outbox } from './helpers';

test.use({ javaScriptEnabled: false });
test.beforeEach(async ({ request }) => clearOutbox(request));

test('footer signup goes through double opt-in page', async ({ page, request }) => {
  await page.goto('/privacy/');
  await page.fill('#footer-subscribe-email', 'reader@example.com');
  await page.locator('footer').getByRole('button', { name: 'Subscribe' }).click();
  await page.waitForURL('**/subscribe/check-email/');
  expect(await outbox(request)).toEqual([{ kind: 'subscribe', email: 'reader@example.com' }]);
});

test('invalid email re-renders the subscribe page with the error', async ({ page }) => {
  await page.goto('/subscribe/');
  await page.fill('#subscribe-page-email', 'nope');
  await page.getByRole('button', { name: 'Subscribe' }).click();
  await expect(page.locator('[data-error-for="email"]')).toHaveText('Please enter a valid email address.');
  await expect(page.locator('#subscribe-page-email')).toHaveValue('nope');
});

test('provider failure lands on the failure page', async ({ page }) => {
  await page.goto('/subscribe/');
  await page.fill('#subscribe-page-email', 'x@fail-subscribe.test');
  await page.getByRole('button', { name: 'Subscribe' }).click();
  await page.waitForURL('**/subscribe/failed/');
});
