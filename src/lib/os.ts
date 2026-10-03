import { PLATFORMS, PLATFORM_NAMES, type Platform } from './platforms';
import type { ReleaseSummary } from './releases';

export const SOURCE_URL = 'https://github.com/JohhannasReyn/KeyGnosys';

export type DetectedOS = 'windows' | 'linux' | 'macos' | 'mobile' | 'unknown';
export interface OsSignals { ua: string; uaDataPlatform?: string | null; uaDataMobile?: boolean | null; maxTouchPoints?: number }

export function detectOS(s: OsSignals): DetectedOS {
  const touch = (s.maxTouchPoints ?? 0) > 1;
  if (s.uaDataMobile) return 'mobile';
  switch (s.uaDataPlatform) {
    case 'Windows': return 'windows';
    case 'Linux': return 'linux';
    case 'macOS': return touch ? 'mobile' : 'macos';
    case 'Android': case 'iOS': return 'mobile';
    case 'Chrome OS': case 'Chromium OS': return 'unknown';
  }
  const ua = s.ua;
  if (/Android|iPhone|iPad|iPod|Mobile/i.test(ua)) return 'mobile';
  if (/Windows NT/.test(ua)) return 'windows';
  if (/CrOS/.test(ua)) return 'unknown';
  if (/Macintosh|Mac OS X/.test(ua)) return touch ? 'mobile' : 'macos';
  if (/Linux|X11/.test(ua)) return 'linux';
  return 'unknown';
}

export type CtaModel =
  | { kind: 'download'; platform: Platform; label: string; href: string; file: string; showOthers: boolean }
  | { kind: 'unavailable'; label: string; href: '/download/'; linkLabel: 'View available downloads' }
  | { kind: 'browse'; label: 'View downloads'; href: '/download/' }
  | { kind: 'no-release'; label: 'First release coming soon'; href: string; linkLabel: 'View source on GitHub' };

const NO_RELEASE: CtaModel = { kind: 'no-release', label: 'First release coming soon', href: SOURCE_URL, linkLabel: 'View source on GitHub' };

function downloadCta(p: Platform, release: ReleaseSummary): CtaModel | null {
  const a = release.primaries[p];
  if (!a) return null;
  return {
    kind: 'download', platform: p, label: `Download for ${PLATFORM_NAMES[p]}`, href: a.url, file: a.file,
    showOthers: Object.keys(release.primaries).length > 1,
  };
}

export function selectCta(os: DetectedOS, release: ReleaseSummary | null): CtaModel {
  if (!release) return NO_RELEASE;
  if (os === 'mobile' || os === 'unknown') return { kind: 'browse', label: 'View downloads', href: '/download/' };
  if (os === 'macos') {
    return { kind: 'unavailable', label: 'KeyGnosys is not yet available for macOS', href: '/download/', linkLabel: 'View available downloads' };
  }
  return downloadCta(os, release) ?? {
    kind: 'unavailable', label: `KeyGnosys isn't available for ${PLATFORM_NAMES[os]} yet`,
    href: '/download/', linkLabel: 'View available downloads',
  };
}

export function staticCtaList(release: ReleaseSummary | null): CtaModel[] {
  if (!release) return [NO_RELEASE];
  return PLATFORMS.map((p) => downloadCta(p, release)).filter((c): c is CtaModel => c !== null);
}
