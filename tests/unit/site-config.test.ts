import { describe, expect, it } from 'vitest';
import { applyOverrides, navItems, site, type ContentStatus } from '../../src/config/site';

const none: ContentStatus = { hasRelease: false, hasDocs: false, docsEntry: null, docsCommit: null, docsVersion: null };

describe('navItems', () => {
  it('omits optional entries when unconfigured', () => {
    expect(navItems(site, none).map((i) => i.label)).toEqual(['Download', 'Trust', 'Teams', 'GitHub']);
  });
  it('includes docs, support and community when configured', () => {
    const cfg = applyOverrides(site, JSON.stringify({
      discussionsUrl: 'https://github.com/JohhannasReyn/KeyGnosys/discussions',
      sponsorship: { githubSponsorsUrl: 'https://github.com/sponsors/JohhannasReyn', tiers: [] },
    }));
    const items = navItems(cfg, { ...none, hasDocs: true, docsEntry: '/docs/' });
    expect(items.map((i) => i.label)).toEqual(['Download', 'Docs', 'Trust', 'Teams', 'Support', 'Community', 'GitHub']);
    expect(items.find((i) => i.label === 'Community')?.external).toBe(true);
  });
  it('hides docs when hasDocs is true but entry is missing', () => {
    expect(navItems(site, { ...none, hasDocs: true }).some((i) => i.label === 'Docs')).toBe(false);
  });
});

describe('applyOverrides', () => {
  it('returns base unchanged for undefined/empty input', () => {
    expect(applyOverrides(site, undefined)).toEqual(site);
    expect(applyOverrides(site, '')).toEqual(site);
  });
  it('rejects unknown keys', () => {
    expect(() => applyOverrides(site, '{"nope":1}')).toThrow(/unknown override key: nope/);
  });
});
