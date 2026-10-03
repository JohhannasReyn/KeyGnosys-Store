import { describe, expect, it } from 'vitest';
import { renderForm, renderPage } from '../../worker/render';

const missing = { fetch: async () => new Response('Not Found', { status: 404 }) } as unknown as Parameters<typeof renderPage>[0];

describe('render fallback when the static page is missing', () => {
  it('renderPage keeps the status and serves a minimal first-party body', async () => {
    const res = await renderPage(missing, 'https://keygnosys.com', '/errors/rate-limited/', 429);
    expect(res.status).toBe(429);
    expect(res.headers.get('Content-Type')).toBe('text/html; charset=utf-8');
    expect(await res.text()).toContain('Something went wrong — email hello@keygnosys.com');
  });
  it('renderForm keeps the status and serves a minimal first-party body', async () => {
    const res = await renderForm(missing, 'https://keygnosys.com', '/teams/', { values: {}, errors: {} }, 422);
    expect(res.status).toBe(422);
    expect(await res.text()).toContain('Something went wrong — email hello@keygnosys.com');
  });
});
