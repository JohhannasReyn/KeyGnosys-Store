import {
  MANIFEST_ASSET, publishedReleases, ReleaseError, validateRelease, type ValidatedRelease,
} from '../../src/lib/releases';
import {
  assertSafe, destForGuide, destForImage, docsEntry, DocsError, ensureTitle, guideFiles, imageRefs,
} from './docs';
import type { ContentSource } from './source';

export interface FeedEntry { tag: string; title: string; url: string; published: string; notes: string }
export interface BuiltContent {
  release: ValidatedRelease | null;
  feed: FeedEntry[];
  docs: null | { commit: string; version: string | null; entry: string; files: { dest: string; data: Uint8Array }[] };
  mainCommit: string | null;
}

export async function buildContent(src: ContentSource): Promise<BuiltContent> {
  const releases = publishedReleases(await src.listReleases());
  let release: ValidatedRelease | null = null;
  if (releases.length > 0) {
    const latest = releases[0];
    const asset = latest.assets.find((a) => a.name === MANIFEST_ASSET);
    if (!asset) throw new ReleaseError(`${latest.tag_name}: release has no ${MANIFEST_ASSET}`);
    release = validateRelease(latest, await src.fetchJson(asset.browser_download_url));
  }
  const feed = releases.slice(0, 20).map((r) => ({
    tag: r.tag_name, title: r.name || r.tag_name, url: r.html_url, published: r.published_at!, notes: r.body ?? '',
  }));

  const mainCommit = release ? null : await src.resolveRef('main');
  const commit = release ? release.commit : mainCommit!;
  const paths = await src.listPaths(commit);
  const guides = guideFiles(paths);
  if (guides.length === 0) return { release, feed, docs: null, mainCommit };

  const decoder = new TextDecoder('utf-8', { fatal: true });
  const files: { dest: string; data: Uint8Array }[] = [];
  const images = new Set<string>();
  for (const g of guides) {
    const text = decoder.decode(await src.readFile(commit, g));
    assertSafe(text, g);
    for (const ref of imageRefs(text, g)) {
      if (!paths.includes(ref)) throw new DocsError(`${g}: image ${ref} not found at ${commit.slice(0, 7)}`);
      images.add(ref);
    }
    files.push({ dest: destForGuide(g), data: new TextEncoder().encode(ensureTitle(text, g)) });
  }
  for (const img of images) files.push({ dest: destForImage(img), data: await src.readFile(commit, img) });

  return { release, feed, docs: { commit, version: release?.version ?? null, entry: docsEntry(guides), files }, mainCommit };
}
