import type { APIRequestContext, Page } from '@playwright/test';

export const ROUTES = ['/', '/download/', '/trust/', '/teams/', '/configs/', '/privacy/', '/docs/', '/docs/getting-started/',
  '/support/', '/subscribe/', '/subscribe/check-email/', '/teams/thanks/', '/errors/rate-limited/'];

export interface OutboxEntry { kind: 'contact' | 'subscribe'; subject?: string; text?: string; replyTo?: string; email?: string }
export const clearOutbox = async (r: APIRequestContext) => { await r.delete('/api/__e2e/outbox'); };
export const outbox = async (r: APIRequestContext) => (await (await r.get('/api/__e2e/outbox')).json()) as OutboxEntry[];

/** Makes forms look like a human took a minute (the <3 s "fast" signal is tested separately). JS-enabled pages only. */
export const ageForms = (page: Page) =>
  page.evaluate(() => document.querySelectorAll<HTMLInputElement>('input[name="t"]').forEach((t) => { t.value = String(Date.now() - 60_000); }));

export async function fillContact(page: Page, o: { name?: string; email?: string; company?: string; interest?: string; message?: string; newsletter?: boolean } = {}) {
  await page.fill('#cf-name', o.name ?? 'Ada Lovelace');
  await page.fill('#cf-email', o.email ?? 'ada@example.com');
  await page.fill('#cf-company', o.company ?? '');
  await page.selectOption('#cf-interest', o.interest ?? 'enterprise');
  await page.fill('#cf-message', o.message ?? 'We would like a rollout plan for 40 seats.');
  if (o.newsletter) await page.check('#cf-newsletter');
}
