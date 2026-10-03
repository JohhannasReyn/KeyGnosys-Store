import type { FeedEntry } from '../../scripts/content/build-content';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

export function buildAtom(entries: FeedEntry[], siteUrl: string): string {
  const updated = entries[0]?.published ?? '1970-01-01T00:00:00Z';
  const items = entries.map((e) => [
    '  <entry>',
    `    <title>${esc(e.title)}</title>`,
    `    <id>${esc(e.url)}</id>`,
    `    <link rel="alternate" href="${esc(e.url)}"/>`,
    `    <updated>${esc(e.published)}</updated>`,
    `    <content type="text">${esc(e.notes)}</content>`,
    '  </entry>',
  ].join('\n'));
  return [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<feed xmlns="http://www.w3.org/2005/Atom">',
    '  <title>KeyGnosys releases</title>',
    `  <id>${siteUrl}/releases.xml</id>`,
    `  <link rel="self" href="${siteUrl}/releases.xml"/>`,
    `  <link rel="alternate" href="${siteUrl}/download/"/>`,
    '  <author><name>KeyGnosys</name></author>',
    `  <updated>${updated}</updated>`,
    ...items,
    '</feed>',
    '',
  ].join('\n');
}
