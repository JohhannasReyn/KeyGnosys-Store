import { expect, it } from 'vitest';
import { formatBytes, formatDate } from '../../src/lib/format';
it('formats bytes', () => {
  expect(formatBytes(500)).toBe('500 B');
  expect(formatBytes(1536)).toBe('1.5 KB');
  expect(formatBytes(12345678)).toBe('11.8 MB');
});
it('formats dates deterministically (UTC date)', () => expect(formatDate('2026-10-15T23:59:00Z')).toBe('2026-10-15'));
