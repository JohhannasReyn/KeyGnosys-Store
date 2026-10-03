import type { GhRelease } from '../../src/lib/releases';
import type { ContentSource } from './source';

export function githubSource(repo: string, token?: string, fetchFn: typeof fetch = fetch): ContentSource {
  const headers: Record<string, string> = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const get = async (url: string, h: Record<string, string> = headers) => {
    const res = await fetchFn(url, { headers: h, signal: AbortSignal.timeout(20_000) });
    if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`);
    return res;
  };
  const api = async (path: string) => (await get(`https://api.github.com${path}`)).json();

  return {
    listReleases: async () => (await api(`/repos/${repo}/releases?per_page=30`)) as GhRelease[],
    // Public release asset: no auth header (it would be dropped on the cross-origin redirect anyway).
    fetchJson: async (url) => (await get(url, { Accept: 'application/octet-stream' })).json(),
    resolveRef: async (ref) => ((await api(`/repos/${repo}/commits/${ref}`)) as { sha: string }).sha,
    listPaths: async (commit) => {
      const t = (await api(`/repos/${repo}/git/trees/${commit}?recursive=1`)) as { truncated: boolean; tree: { path: string; type: string }[] };
      if (t.truncated) throw new Error(`tree for ${commit} is truncated; cannot list docs reliably`);
      return t.tree.filter((e) => e.type === 'blob').map((e) => e.path);
    },
    readFile: async (commit, path) =>
      new Uint8Array(await (await get(`https://raw.githubusercontent.com/${repo}/${commit}/${encodeURI(path)}`, {})).arrayBuffer()),
  };
}
