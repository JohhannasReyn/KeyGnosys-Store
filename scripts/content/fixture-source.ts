import { readFile, readdir } from 'node:fs/promises';
import { join, posix, relative, sep } from 'node:path';
import type { GhRelease } from '../../src/lib/releases';
import type { ContentSource } from './source';

/** Layout: <dir>/releases.json, <dir>/assets/<asset name>, <dir>/repo/** (app repo files). */
export function fixtureSource(dir: string): ContentSource {
  const repo = join(dir, 'repo');
  async function walk(d: string): Promise<string[]> {
    const out: string[] = [];
    for (const e of await readdir(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) out.push(...(await walk(p)));
      else out.push(relative(repo, p).split(sep).join(posix.sep));
    }
    return out;
  }
  return {
    listReleases: async () => JSON.parse(await readFile(join(dir, 'releases.json'), 'utf8')) as GhRelease[],
    fetchJson: async (url) => JSON.parse(await readFile(join(dir, 'assets', decodeURIComponent(url.split('/').pop()!)), 'utf8')),
    resolveRef: async () => '0'.repeat(40),
    listPaths: async () => walk(repo),
    readFile: async (_c, p) => new Uint8Array(await readFile(join(repo, ...p.split('/')))),
  };
}
