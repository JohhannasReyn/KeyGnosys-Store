import { describe, expect, it } from 'vitest';
import { e2eEndpoint } from '../../worker/e2e';

describe('e2eEndpoint', () => {
  it.each(['http://127.0.0.1:8788', 'http://localhost:8788'])('serves the outbox on %s', async (origin) => {
    const res = await e2eEndpoint(new Request(`${origin}/api/__e2e/outbox`));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });
  it.each(['https://keygnosys.com', 'https://keygnosys-site.example.workers.dev', 'http://127.0.0.1.example.com'])(
    '404s on any other host (%s)', async (origin) => {
      expect((await e2eEndpoint(new Request(`${origin}/api/__e2e/outbox`))).status).toBe(404);
      expect((await e2eEndpoint(new Request(`${origin}/api/__e2e/outbox`, { method: 'DELETE' }))).status).toBe(404);
    });
});
