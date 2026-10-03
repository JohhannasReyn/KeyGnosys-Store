import { describe, expect, it, vi } from 'vitest';
import { githubSource } from '../../scripts/content/github-source';

const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });

describe('githubSource', () => {
  it('sends auth and API version headers when a token is set', async () => {
    const f = vi.fn(async () => ok([]));
    await githubSource('o/r', 'tok', f as unknown as typeof fetch).listReleases();
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.github.com/repos/o/r/releases?per_page=30');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok');
    expect((init.headers as Record<string, string>)['X-GitHub-Api-Version']).toBe('2022-11-28');
  });
  it('throws on non-2xx', async () => {
    const f = vi.fn(async () => new Response('x', { status: 503 }));
    await expect(githubSource('o/r', undefined, f as unknown as typeof fetch).listReleases()).rejects.toThrow(/503/);
  });
  it('throws when the tree is truncated', async () => {
    const f = vi.fn(async () => ok({ truncated: true, tree: [] }));
    await expect(githubSource('o/r', undefined, f as unknown as typeof fetch).listPaths('x')).rejects.toThrow(/truncated/);
  });
  it('lists blob paths only', async () => {
    const f = vi.fn(async () => ok({ truncated: false, tree: [{ path: 'docs', type: 'tree' }, { path: 'docs/a.md', type: 'blob' }] }));
    expect(await githubSource('o/r', undefined, f as unknown as typeof fetch).listPaths('x')).toEqual(['docs/a.md']);
  });
});
