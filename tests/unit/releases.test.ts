import { describe, expect, it } from 'vitest';
import {
  groupByPlatform, publishedReleases, summarize, validateRelease, ReleaseError, type GhRelease,
} from '../../src/lib/releases';

const SHA = 'a'.repeat(64);
const COMMIT = 'b'.repeat(40);
const DL = 'https://github.com/JohhannasReyn/KeyGnosys/releases/download/v1.0.0/';

function manifest(overrides: Record<string, unknown> = {}) {
  return {
    schema: 1, version: '1.0.0', tag: 'v1.0.0', commit: COMMIT, published: '2026-10-15T12:00:00Z',
    buildRunUrl: 'https://github.com/JohhannasReyn/KeyGnosys/actions/runs/123',
    artifacts: [
      { platform: 'windows', arch: 'x64', format: 'installer', file: 'KG-win.exe', size: 100, sha256: SHA, primary: true },
      { platform: 'linux', arch: 'x64', format: 'appimage', file: 'KG-linux.AppImage', size: 200, sha256: SHA, primary: true },
      { platform: 'linux', arch: 'x64', format: 'deb', file: 'KeyGnosys 1.0.0 amd64.deb', size: 300, sha256: SHA, primary: false },
    ],
    ...overrides,
  };
}
function release(overrides: Partial<GhRelease> = {}): GhRelease {
  return {
    tag_name: 'v1.0.0', name: 'KeyGnosys 1.0.0', draft: false, prerelease: false,
    published_at: '2026-10-15T12:00:00Z', html_url: 'https://github.com/JohhannasReyn/KeyGnosys/releases/tag/v1.0.0',
    body: 'Notes', assets: [
      { name: 'KG-win.exe', size: 100, browser_download_url: `${DL}KG-win.exe` },
      { name: 'KG-linux.AppImage', size: 200, browser_download_url: `${DL}KG-linux.AppImage` },
      { name: 'KeyGnosys 1.0.0 amd64.deb', size: 300, browser_download_url: `${DL}KeyGnosys.1.0.0.amd64.deb` },
      { name: 'keygnosys-release.json', size: 10, browser_download_url: `${DL}keygnosys-release.json` },
    ], ...overrides,
  };
}

describe('validateRelease', () => {
  it('accepts a valid manifest', () => {
    const r = validateRelease(release(), manifest());
    expect(r.version).toBe('1.0.0');
    expect(r.commit).toBe(COMMIT);
    expect(r.artifacts).toHaveLength(3);
  });
  it('uses browser_download_url for names with spaces', () => {
    const deb = validateRelease(release(), manifest()).artifacts.find((a) => a.format === 'deb')!;
    expect(deb.url).toBe(`${DL}KeyGnosys.1.0.0.amd64.deb`);
  });
  it('rejects malformed sha256', () => {
    const m = manifest();
    (m.artifacts[0] as { sha256: string }).sha256 = 'XYZ';
    expect(() => validateRelease(release(), m)).toThrow(ReleaseError);
  });
  it('rejects a platform the schema does not support (macos)', () => {
    const m = manifest();
    (m.artifacts[0] as { platform: string }).platform = 'macos';
    expect(() => validateRelease(release(), m)).toThrow(ReleaseError);
  });
  it('rejects unknown keys', () => {
    expect(() => validateRelease(release(), manifest({ extra: true }))).toThrow(ReleaseError);
  });
  it('rejects tag mismatch', () => {
    expect(() => validateRelease(release(), manifest({ tag: 'v9.9.9' }))).toThrow(/tag/);
  });
  it('rejects zero primaries for a platform', () => {
    const m = manifest();
    (m.artifacts[0] as { primary: boolean }).primary = false;
    expect(() => validateRelease(release(), m)).toThrow(/windows must have exactly one primary/);
  });
  it('rejects two primaries for a platform', () => {
    const m = manifest();
    (m.artifacts[2] as { primary: boolean }).primary = true;
    expect(() => validateRelease(release(), m)).toThrow(/linux must have exactly one primary/);
  });
  it('rejects duplicate file names', () => {
    const m = manifest();
    (m.artifacts[1] as { file: string }).file = 'KG-win.exe';
    expect(() => validateRelease(release(), m)).toThrow(/duplicate/);
  });
  it('rejects a file not attached to the release', () => {
    const r = release({ assets: release().assets.filter((a) => a.name !== 'KG-win.exe') });
    expect(() => validateRelease(r, manifest())).toThrow(/KG-win.exe is not attached/);
  });
  it('rejects size mismatch', () => {
    const r = release();
    r.assets[0].size = 999;
    expect(() => validateRelease(r, manifest())).toThrow(/size mismatch/);
  });
  it('rejects download URLs outside the app repo', () => {
    const r = release();
    r.assets[0].browser_download_url = 'https://evil.example/KG-win.exe';
    expect(() => validateRelease(r, manifest())).toThrow(/unexpected download URL/);
  });
});

describe('publishedReleases', () => {
  it('drops drafts, prereleases and unpublished; newest first', () => {
    const list = [
      release({ tag_name: 'v0.9.0', published_at: '2026-09-01T00:00:00Z' }),
      release({ tag_name: 'v1.1.0-rc1', prerelease: true, published_at: '2026-11-01T00:00:00Z' }),
      release({ tag_name: 'v2', draft: true }),
      release({ tag_name: 'v1.0.0', published_at: '2026-10-15T12:00:00Z' }),
      release({ tag_name: 'v0.0.1', published_at: null }),
    ];
    expect(publishedReleases(list).map((r) => r.tag_name)).toEqual(['v1.0.0', 'v0.9.0']);
  });
});

describe('summarize / groupByPlatform', () => {
  it('summarize returns null without a release', () => expect(summarize(null)).toBeNull());
  it('lists only platforms present in the manifest', () => {
    const m = manifest({ artifacts: [manifest().artifacts[0]] });
    const r = validateRelease(release(), m);
    expect(Object.keys(summarize(r)!.primaries)).toEqual(['windows']);
  });
  it('groups in PLATFORMS order with primary first', () => {
    const groups = groupByPlatform(validateRelease(release(), manifest()));
    expect(groups.map((g) => g.platform)).toEqual(['windows', 'linux']);
    expect(groups[1].artifacts[0].primary).toBe(true);
    expect(groups[1].name).toBe('Linux');
  });
});
