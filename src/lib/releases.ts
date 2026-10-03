import { z } from 'zod';
import { ManifestSchema, type Artifact } from './release-manifest';
import { PLATFORMS, PLATFORM_NAMES, type Platform } from './platforms';

export interface GhAsset { name: string; size: number; browser_download_url: string }
export interface GhRelease {
  tag_name: string; name: string | null; draft: boolean; prerelease: boolean;
  published_at: string | null; html_url: string; body: string | null; assets: GhAsset[];
}
export const MANIFEST_ASSET = 'keygnosys-release.json';
const DOWNLOAD_PREFIX = 'https://github.com/JohhannasReyn/KeyGnosys/releases/download/';

export class ReleaseError extends Error {
  override name = 'ReleaseError';
}

export type ReleaseArtifact = Artifact & { url: string };
export interface ValidatedRelease {
  version: string; tag: string; commit: string; published: string; buildRunUrl: string;
  htmlUrl: string; notes: string; artifacts: ReleaseArtifact[];
}
export interface ReleaseSummary {
  version: string;
  primaries: Partial<Record<Platform, { file: string; url: string; size: number }>>;
}

export function publishedReleases(list: GhRelease[]): GhRelease[] {
  return list
    .filter((r) => !r.draft && !r.prerelease && r.published_at)
    .sort((a, b) => Date.parse(b.published_at!) - Date.parse(a.published_at!));
}

export function validateRelease(release: GhRelease, manifestJson: unknown): ValidatedRelease {
  const tag = release.tag_name;
  const parsed = ManifestSchema.safeParse(manifestJson);
  if (!parsed.success) throw new ReleaseError(`${tag}: manifest invalid:\n${z.prettifyError(parsed.error)}`);
  const m = parsed.data;
  if (m.tag !== tag) throw new ReleaseError(`${tag}: manifest tag ${m.tag} does not match release tag`);

  const files = new Set<string>();
  for (const a of m.artifacts) {
    if (files.has(a.file)) throw new ReleaseError(`${tag}: duplicate artifact file ${a.file}`);
    files.add(a.file);
  }
  for (const p of new Set(m.artifacts.map((a) => a.platform))) {
    const n = m.artifacts.filter((a) => a.platform === p && a.primary).length;
    if (n !== 1) throw new ReleaseError(`${tag}: ${p} must have exactly one primary artifact, found ${n}`);
  }

  const artifacts = m.artifacts.map((a) => {
    const asset = release.assets.find((x) => x.name === a.file);
    if (!asset) throw new ReleaseError(`${tag}: ${a.file} is not attached to the release`);
    if (asset.size !== a.size) throw new ReleaseError(`${tag}: size mismatch for ${a.file} (manifest ${a.size}, asset ${asset.size})`);
    if (!asset.browser_download_url.startsWith(DOWNLOAD_PREFIX)) {
      throw new ReleaseError(`${tag}: unexpected download URL for ${a.file}`);
    }
    return { ...a, url: asset.browser_download_url };
  });

  return {
    version: m.version, tag: m.tag, commit: m.commit, published: m.published, buildRunUrl: m.buildRunUrl,
    htmlUrl: release.html_url, notes: release.body ?? '', artifacts,
  };
}

export function summarize(r: ValidatedRelease | null): ReleaseSummary | null {
  if (!r) return null;
  const primaries: ReleaseSummary['primaries'] = {};
  for (const a of r.artifacts) if (a.primary) primaries[a.platform] = { file: a.file, url: a.url, size: a.size };
  return { version: r.version, primaries };
}

export function groupByPlatform(r: ValidatedRelease) {
  return PLATFORMS.filter((p) => r.artifacts.some((a) => a.platform === p)).map((p) => ({
    platform: p,
    name: PLATFORM_NAMES[p],
    artifacts: r.artifacts.filter((a) => a.platform === p).sort((a, b) => Number(b.primary) - Number(a.primary)),
  }));
}
