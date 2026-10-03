import { expect, it } from 'vitest';
import { buildAtom } from '../../src/lib/atom';
it('escapes XML and lists entries', () => {
  const xml = buildAtom([{ tag: 'v1', title: 'A & <B>', url: 'https://github.com/x?a=1&b=2', published: '2026-10-15T12:00:00Z', notes: '"hi"' }], 'https://keygnosys.com');
  expect(xml).toContain('<title>A &amp; &lt;B&gt;</title>');
  expect(xml).toContain('href="https://github.com/x?a=1&amp;b=2"');
  expect(xml).toContain('<content type="text">&quot;hi&quot;</content>');
  expect(xml).toContain('<updated>2026-10-15T12:00:00Z</updated>');
});
it('empty feed is valid and deterministic', () => {
  const xml = buildAtom([], 'https://keygnosys.com');
  expect(xml).not.toContain('<entry>');
  expect(xml).toContain('<updated>1970-01-01T00:00:00Z</updated>');
});
