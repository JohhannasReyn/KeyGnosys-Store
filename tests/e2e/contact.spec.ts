import { expect, test } from '@playwright/test';
import { ageForms, clearOutbox, fillContact, outbox } from './helpers';

test.beforeEach(async ({ request }) => clearOutbox(request));

test.describe('with JavaScript', () => {
  test('success sends exactly one message', async ({ page, request }) => {
    await page.goto('/teams/');
    await fillContact(page);
    await ageForms(page);
    await page.getByRole('button', { name: 'Send message' }).click();
    await page.waitForURL('**/teams/thanks/');
    const box = await outbox(request);
    expect(box).toEqual([expect.objectContaining({ kind: 'contact', replyTo: 'ada@example.com', subject: 'KeyGnosys contact: Enterprise deployment & support' })]);
  });

  test('server-side validation errors render inline without leaving the page', async ({ page, request }) => {
    await page.goto('/teams/');
    await fillContact(page, { message: ' '.repeat(12) }); // passes the browser's minlength, fails the server's trimmed check
    await ageForms(page);
    await page.getByRole('button', { name: 'Send message' }).click();
    await expect(page.locator('#contact-form [data-error-for="message"]')).toHaveText('Message must be at least 10 characters.');
    await expect(page.locator('#cf-message')).toHaveAttribute('aria-invalid', 'true');
    expect(new URL(page.url()).pathname).toBe('/teams/');
    expect(await outbox(request)).toEqual([]);
  });

  test('double click still sends once', async ({ page, request }) => {
    await page.goto('/teams/');
    await fillContact(page);
    await ageForms(page);
    await page.getByRole('button', { name: 'Send message' }).dblclick();
    await page.waitForURL('**/teams/thanks/');
    expect((await outbox(request)).filter((e) => e.kind === 'contact')).toHaveLength(1);
  });

  test('provider failure shows the banner and keeps the message', async ({ page, request }) => {
    await page.goto('/teams/');
    await fillContact(page, { email: 'ada@fail-email.test', message: 'Please keep this text safe.' });
    await ageForms(page);
    await page.getByRole('button', { name: 'Send message' }).click();
    await expect(page.locator('#contact-form [data-form-banner="send_failed"]')).toBeVisible();
    await expect(page.locator('#cf-message')).toHaveValue('Please keep this text safe.');
    await expect(page.getByRole('button', { name: 'Send message' })).toBeEnabled();
    expect(await outbox(request)).toEqual([]);
  });

  test('newsletter opt-in subscribes after sending', async ({ page, request }) => {
    await page.goto('/teams/');
    await fillContact(page, { newsletter: true });
    await ageForms(page);
    await page.getByRole('button', { name: 'Send message' }).click();
    await page.waitForURL('**/teams/thanks/confirm-subscription/');
    expect((await outbox(request)).map((e) => e.kind)).toEqual(['contact', 'subscribe']);
  });

  test('newsletter failure never loses the contact', async ({ page, request }) => {
    await page.goto('/teams/');
    await fillContact(page, { email: 'ada@fail-subscribe.test', newsletter: true });
    await ageForms(page);
    await page.getByRole('button', { name: 'Send message' }).click();
    await page.waitForURL('**/teams/thanks/subscription-failed/');
    expect((await outbox(request)).map((e) => e.kind)).toEqual(['contact']);
  });

  test('fast submission is delivered flagged, without subscribing', async ({ page, request }) => {
    await page.goto('/teams/');
    await fillContact(page, { newsletter: true });
    await page.evaluate(() => { (document.querySelector('input[name="t"]') as HTMLInputElement).value = String(Date.now()); });
    await page.getByRole('button', { name: 'Send message' }).click();
    await page.waitForURL('**/teams/thanks/');
    const box = await outbox(request);
    expect(box).toHaveLength(1);
    expect(box[0].subject).toMatch(/^\[Possible spam\] /);
  });

  test('non-ASCII input arrives intact', async ({ page, request }) => {
    await page.goto('/teams/');
    await fillContact(page, { name: 'José Ñúñez 山田', message: 'Grüße — 你好 👋 world!' });
    await ageForms(page);
    await page.getByRole('button', { name: 'Send message' }).click();
    await page.waitForURL('**/teams/thanks/');
    const text = (await outbox(request))[0].text!;
    expect(text).toContain('Name: José Ñúñez 山田');
    expect(text).toContain('Grüße — 你好 👋 world!');
  });
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('success via plain HTTP POST', async ({ page, request }) => {
    await page.goto('/teams/');
    await fillContact(page);
    await page.getByRole('button', { name: 'Send message' }).click();
    await page.waitForURL('**/teams/thanks/');
    expect(await outbox(request)).toHaveLength(1);
  });

  test('re-render escapes markup', async ({ page, request }) => {
    const message = '"><script>window.__pwned=1</script> long enough to pass';
    const company = '"><img src="x" id="pwned">';
    await page.goto('/teams/');
    await fillContact(page, { email: 'not-an-email', company, message });
    await page.getByRole('button', { name: 'Send message' }).click();
    await expect(page.locator('#contact-form [data-error-for="email"]')).toHaveText('Please enter a valid email address.');
    await expect(page.locator('#cf-email')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('#cf-message')).toHaveValue(message);
    await expect(page.locator('#cf-company')).toHaveValue(company);
    await expect(page.locator('#pwned')).toHaveCount(0);
    expect(await page.evaluate(() => [...document.scripts].some((s) => s.textContent?.includes('__pwned')))).toBe(false);
    expect(await outbox(request)).toEqual([]);
  });

  test('provider failure re-renders with banner and values', async ({ page }) => {
    await page.goto('/teams/');
    await fillContact(page, { email: 'ada@fail-email.test', message: 'Please keep this text safe.' });
    await page.getByRole('button', { name: 'Send message' }).click();
    await expect(page.locator('#contact-form [data-form-banner="send_failed"]')).toBeVisible();
    await expect(page.locator('#cf-message')).toHaveValue('Please keep this text safe.');
  });

  test('rate limiting shows a first-party page', async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false, extraHTTPHeaders: { 'x-e2e-rate-limit': 'block' } });
    const page = await ctx.newPage();
    await page.goto('/teams/');
    await fillContact(page);
    await page.getByRole('button', { name: 'Send message' }).click();
    await expect(page.getByRole('heading', { name: 'Too many requests' })).toBeVisible();
  });
});
