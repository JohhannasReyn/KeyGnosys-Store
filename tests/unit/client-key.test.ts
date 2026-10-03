import { expect, it } from 'vitest';
import { clientKey } from '../../worker/lib/client-key';
it('is a stable salted hash that never contains the IP', async () => {
  const a = await clientKey('203.0.113.7', 's1');
  expect(a).toMatch(/^[0-9a-f]{32}$/);
  expect(a).toBe(await clientKey('203.0.113.7', 's1'));
  expect(a).not.toBe(await clientKey('203.0.113.7', 's2'));
  expect(a).not.toContain('203');
});
