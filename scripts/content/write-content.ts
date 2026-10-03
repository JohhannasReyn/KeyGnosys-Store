import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { ContentStatus } from '../../src/config/site';
import type { BuiltContent } from './build-content';

export async function writeContent(c: BuiltContent, root: string): Promise<void> {
  const data = join(root, 'src', 'data');
  const docsRoot = join(root, 'src', 'content', 'docs');
  await rm(docsRoot, { recursive: true, force: true });
  await mkdir(data, { recursive: true });
  const status: ContentStatus = {
    hasRelease: c.release !== null,
    hasDocs: c.docs !== null,
    docsEntry: c.docs?.entry ?? null,
    docsCommit: c.docs?.commit ?? null,
    docsVersion: c.docs?.version ?? null,
  };
  await writeFile(join(data, 'release.json'), JSON.stringify(c.release, null, 2));
  await writeFile(join(data, 'feed.json'), JSON.stringify(c.feed, null, 2));
  await writeFile(join(data, 'content-status.json'), JSON.stringify(status, null, 2));
  for (const f of c.docs?.files ?? []) {
    const out = join(docsRoot, ...f.dest.split('/'));
    await mkdir(dirname(out), { recursive: true });
    await writeFile(out, f.data);
  }
}
