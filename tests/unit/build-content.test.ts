import { describe, expect, it, vi } from 'vitest';
import { buildContent } from '../../scripts/content/build-content';
import type { ContentSource } from '../../scripts/content/source';
import type { GhRelease } from '../../src/lib/releases';

const COMMIT = 'c'.repeat(40);
const MAIN = 'd'.repeat(40);
const DL = 'https://github.com/JohhannasReyn/KeyGnosys/releases/download/v1.0.0/';
const enc = (s: string) => new TextEncoder().encode(s);

const rel: GhRelease = {
  tag_name: 'v1.0.0', name: null, draft: false, prerelease: false, published_at: '2026-10-15T12:00:00Z',
  html_url: 'https://github.com/JohhannasReyn/KeyGnosys/releases/tag/v1.0.0', body: 'n',
  assets: [
    { name: 'KG.exe', size: 5, browser_download_url: `${DL}KG.exe` },
    { name: 'keygnosys-release.json', size: 1, browser_download_url: `${DL}keygnosys-release.json` },
  ],
};
const manifest = {
  schema: 1, version: '1.0.0', tag: 'v1.0.0', commit: COMMIT, published: '2026-10-15T12:00:00Z',
  buildRunUrl: 'https://github.com/JohhannasReyn/KeyGnosys/actions/runs/1',
  artifacts: [{ platform: 'windows', arch: 'x64', format: 'installer', file: 'KG.exe', size: 5, sha256: 'e'.repeat(64), primary: true }],
};
const files: Record<string, string> = {
  'docs/SPEC.md': '# dev',
  'docs/guide/index.md': '# Welcome\n\n![k](../images/k.png)',
  'docs/images/k.png': 'PNG',
};

function source(o: Partial<ContentSource> = {}): ContentSource {
  return {
    listReleases: async () => [rel],
    fetchJson: async () => manifest,
    resolveRef: async () => MAIN,
    listPaths: async () => Object.keys(files),
    readFile: async (_c, p) => enc(files[p]),
    ...o,
  };
}

describe('buildContent', () => {
  it('builds release, feed and release-pinned docs', async () => {
    const listPaths = vi.fn(async () => Object.keys(files));
    const c = await buildContent(source({ listPaths }));
    expect(c.release?.version).toBe('1.0.0');
    expect(c.feed).toEqual([{ tag: 'v1.0.0', title: 'v1.0.0', url: rel.html_url, published: rel.published_at, notes: 'n' }]);
    expect(listPaths).toHaveBeenCalledWith(COMMIT);
    expect(c.docs?.commit).toBe(COMMIT);
    expect(c.docs?.version).toBe('1.0.0');
    expect(c.docs?.entry).toBe('/docs/');
    expect(c.docs?.files.map((f) => f.dest).sort()).toEqual(['docs/index.md', 'images/k.png']);
  });
  it('never publishes developer docs', async () => {
    const c = await buildContent(source());
    expect(c.docs?.files.some((f) => f.dest.includes('SPEC'))).toBe(false);
  });
  it('no releases: docs come from main', async () => {
    const c = await buildContent(source({ listReleases: async () => [] }));
    expect(c.release).toBeNull();
    expect(c.feed).toEqual([]);
    expect(c.docs?.commit).toBe(MAIN);
    expect(c.docs?.version).toBeNull();
  });
  it('release without manifest fails', async () => {
    const bare = { ...rel, assets: rel.assets.filter((a) => a.name !== 'keygnosys-release.json') };
    await expect(buildContent(source({ listReleases: async () => [bare] }))).rejects.toThrow(/no keygnosys-release.json/);
  });
  it('invalid manifest fails', async () => {
    await expect(buildContent(source({ fetchJson: async () => ({ schema: 2 }) }))).rejects.toThrow(/manifest invalid/);
  });
  it('API errors fail', async () => {
    await expect(buildContent(source({ listReleases: async () => { throw new Error('GitHub API 502'); } }))).rejects.toThrow(/502/);
  });
  it('missing docs/guide -> docs null', async () => {
    const c = await buildContent(source({ listPaths: async () => ['docs/SPEC.md'] }));
    expect(c.docs).toBeNull();
  });
  it('referenced image missing from repo fails', async () => {
    await expect(buildContent(source({ listPaths: async () => ['docs/guide/index.md'] }))).rejects.toThrow(/k\.png.*not found/);
  });
  it('unsafe docs fail', async () => {
    const bad: Record<string, string> = { ...files, 'docs/guide/index.md': '# W\n<script>x</script>' };
    await expect(buildContent(source({ readFile: async (_c, p) => enc(bad[p]) }))).rejects.toThrow(/<script>/);
  });
});
