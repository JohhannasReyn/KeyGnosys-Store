import { describe, expect, it, vi } from 'vitest';
import { createSubscriber } from '../../worker/lib/buttondown';

const cfg = { apiBase: 'https://api.buttondown.com/', apiKey: 'k' };
const call = (f: ReturnType<typeof vi.fn>) => f.mock.calls[0] as unknown as [string, RequestInit];

describe('createSubscriber', () => {
  it('posts email only, with token and pinned API version (double opt-in by omission of type)', async () => {
    const f = vi.fn(async () => new Response('{}', { status: 201 }));
    expect(await createSubscriber(cfg, 'a@b.co', f as unknown as typeof fetch)).toBe('ok');
    const [url, init] = call(f);
    expect(url).toBe('https://api.buttondown.com/v1/subscribers');
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({ Authorization: 'Token k', 'X-API-Version': '2026-04-01', 'Content-Type': 'application/json' });
    expect(JSON.parse(init.body as string)).toEqual({ email_address: 'a@b.co' });
  });
  it.each([400, 409, 422])('treats %i (already subscribed/rejected) as ok to avoid revealing membership', async (s) => {
    expect(await createSubscriber(cfg, 'a@b.co', (async () => new Response('{}', { status: s })) as unknown as typeof fetch)).toBe('ok');
  });
  it.each([401, 429, 500, 503])('treats %i as failed', async (s) => {
    expect(await createSubscriber(cfg, 'a@b.co', (async () => new Response('{}', { status: s })) as unknown as typeof fetch)).toBe('failed');
  });
  it('treats network errors as failed', async () => {
    expect(await createSubscriber(cfg, 'a@b.co', (async () => { throw new TypeError('net'); }) as unknown as typeof fetch)).toBe('failed');
  });
});
