import { describe, expect, it } from 'vitest';
import { detectOS, selectCta, staticCtaList, SOURCE_URL } from '../../src/lib/os';
import type { ReleaseSummary } from '../../src/lib/releases';

const UA = {
  win: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140.0 Safari/537.36',
  linux: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/140.0 Safari/537.36',
  mac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15',
  android: 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 Chrome/140.0 Mobile Safari/537.36',
  iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
  cros: 'Mozilla/5.0 (X11; CrOS x86_64 15000.0.0) AppleWebKit/537.36 Chrome/140.0 Safari/537.36',
};

describe('detectOS', () => {
  it.each([
    [{ ua: UA.win }, 'windows'],
    [{ ua: UA.linux }, 'linux'],
    [{ ua: UA.mac }, 'macos'],
    [{ ua: UA.mac, maxTouchPoints: 5 }, 'mobile'], // iPadOS desktop-mode UA
    [{ ua: UA.android }, 'mobile'],
    [{ ua: UA.iphone }, 'mobile'],
    [{ ua: UA.cros }, 'unknown'],
    [{ ua: 'curl/8.0' }, 'unknown'],
    [{ ua: UA.linux, uaDataPlatform: 'Windows' }, 'windows'], // UA-CH wins
    [{ ua: UA.win, uaDataMobile: true }, 'mobile'],
    [{ ua: UA.win, uaDataPlatform: 'Chrome OS' }, 'unknown'],
  ] as const)('%o -> %s', (signals, expected) => expect(detectOS(signals)).toBe(expected));
});

const both: ReleaseSummary = {
  version: '1.0.0',
  primaries: {
    windows: { file: 'KG.exe', url: 'https://github.com/x/KG.exe', size: 1 },
    linux: { file: 'KG.AppImage', url: 'https://github.com/x/KG.AppImage', size: 1 },
  },
};
const winOnly: ReleaseSummary = { version: '1.0.0', primaries: { windows: both.primaries.windows } };

describe('selectCta', () => {
  it('windows + windows artifact -> download with others', () => {
    expect(selectCta('windows', both)).toEqual({
      kind: 'download', platform: 'windows', label: 'Download for Windows',
      href: 'https://github.com/x/KG.exe', file: 'KG.exe', showOthers: true,
    });
  });
  it('linux + linux artifact -> download', () => {
    expect(selectCta('linux', both)).toMatchObject({ kind: 'download', label: 'Download for Linux' });
  });
  it('single platform -> no "other platforms"', () => {
    expect(selectCta('windows', winOnly)).toMatchObject({ showOthers: false });
  });
  it('linux detected, no linux artifact -> truthful unavailable', () => {
    expect(selectCta('linux', winOnly)).toEqual({
      kind: 'unavailable', label: "KeyGnosys isn't available for Linux yet",
      href: '/download/', linkLabel: 'View available downloads',
    });
  });
  it('macOS never gets a download', () => {
    expect(selectCta('macos', both)).toEqual({
      kind: 'unavailable', label: 'KeyGnosys is not yet available for macOS',
      href: '/download/', linkLabel: 'View available downloads',
    });
  });
  it.each(['mobile', 'unknown'] as const)('%s -> browse', (os) => {
    expect(selectCta(os, both)).toEqual({ kind: 'browse', label: 'View downloads', href: '/download/' });
  });
  it.each(['windows', 'linux', 'macos', 'mobile', 'unknown'] as const)('%s + no release -> coming soon', (os) => {
    expect(selectCta(os, null)).toEqual({
      kind: 'no-release', label: 'First release coming soon', href: SOURCE_URL, linkLabel: 'View source on GitHub',
    });
  });
});

describe('staticCtaList (no-JS)', () => {
  it('lists every available platform from the manifest only', () => {
    expect(staticCtaList(winOnly).map((c) => c.label)).toEqual(['Download for Windows']);
    expect(staticCtaList(both).map((c) => c.label)).toEqual(['Download for Windows', 'Download for Linux']);
  });
  it('no release -> single coming-soon entry', () => {
    expect(staticCtaList(null)).toEqual([selectCta('windows', null)]);
  });
});
