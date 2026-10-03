import { describe, expect, it } from 'vitest';
import { manifestPlatforms, platformViolations } from '../../scripts/check-platforms';

const page = (body: string, head = '') => `<!doctype html><html><head><title>KeyGnosys</title>${head}</head><body>${body}</body></html>`;
const art = (platform: string, primary = true) => ({ platform, primary, file: `f-${platform}`, url: 'u', size: 1 });
const region = (inner: string) => `<div data-availability>${inner}</div>`;

describe('manifestPlatforms', () => {
  it('lists platforms with a primary artifact; none without a release', () => {
    expect(manifestPlatforms({ artifacts: [art('windows'), art('linux', false)] })).toEqual(['windows']);
    expect(manifestPlatforms(null)).toEqual([]);
  });
});

describe('platformViolations: structured data-platform check', () => {
  it('fails a data-platform="linux" element with a windows-only manifest', () => {
    const v = platformViolations(page('<a href="x" data-platform="linux">Get it</a>'), ['windows']);
    expect(v).toHaveLength(1);
    expect(v[0]).toMatch(/data-platform="linux"/);
  });
  it('fails any data-platform element when there is no release', () => {
    expect(platformViolations(page('<section data-platform="windows"></section>'), [])).toHaveLength(1);
    expect(platformViolations(page('<table><tbody><tr data-platform="linux"><td>x</td></tr></tbody></table>'), [])).not.toEqual([]);
  });
  it('passes data-platform elements whose platform is in the manifest', () => {
    const html = page('<a data-platform="windows">a</a><section data-platform="linux"></section>');
    expect(platformViolations(html, ['windows', 'linux'])).toEqual([]);
  });
  it('checks data-platform outside availability regions too', () => {
    expect(platformViolations(page('<main><div data-platform="macos"></div></main>'), ['windows', 'linux'])).toHaveLength(1);
  });
});

describe('platformViolations: availability-region text check', () => {
  it('fails "Download for Linux" in an availability region with a windows-only manifest', () => {
    const v = platformViolations(page(region('<a href="x">Download for Linux</a>')), ['windows']);
    expect(v).toHaveLength(1);
    expect(v[0]).toMatch(/Linux/);
  });
  it('is case-insensitive and whole-word', () => {
    expect(platformViolations(page(region('<p>runs on LINUX</p>')), ['windows'])).toHaveLength(1);
    expect(platformViolations(page(region('<p>WindowsXYZ macOSish</p>')), [])).toEqual([]);
  });
  it('passes when both platforms are in the manifest', () => {
    const html = page(region('<a data-platform="windows">Download for Windows</a><a data-platform="linux">Download for Linux</a>'));
    expect(platformViolations(html, ['windows', 'linux'])).toEqual([]);
  });
  it('allows the macOS-unavailable phrasings', () => {
    expect(platformViolations(page(region('<p>KeyGnosys is not yet available for macOS</p>')), ['windows'])).toEqual([]);
    expect(platformViolations(page(region("<p>KeyGnosys isn't available for Linux yet</p>")), ['windows'])).toEqual([]);
    expect(platformViolations(page(region('<p>KeyGnosys isn’t available for macOS yet</p>')), ['windows'])).toEqual([]);
    expect(platformViolations(page(region('<p>Works on macOS</p>')), ['windows', 'linux'])).toHaveLength(1);
  });
  it('fails any platform name in a region when there is no release', () => {
    expect(platformViolations(page(region('<p>Windows</p>')), [])).toHaveLength(1);
    expect(platformViolations(page(region('<p>First release coming soon</p>')), [])).toEqual([]);
  });
  it('ignores scripts, styles and attributes inside regions', () => {
    const html = page(region(`<div data-release='{"linux":1}' title="linux"></div><script>"Linux"</script><style>/* macOS */</style>`));
    expect(platformViolations(html, [])).toEqual([]);
  });
});

describe('platformViolations: prose outside availability regions is not scanned', () => {
  it('passes a docs page saying "Linux support is planned" with a windows-only manifest', () => {
    const html = page('<main><h1>Compatibility</h1><p>Linux support is planned. macOS is on the roadmap.</p></main>',
      '<meta name="description" content="Linux and macOS plans">');
    expect(platformViolations(html, ['windows'])).toEqual([]);
  });
  it('passes trust evidence labels and other prose with no release', () => {
    const html = page('<ul class="evidence"><li><a href="x">Linux socket created mode 0600 ↗</a></li></ul><p>Windows pipe DACL</p>');
    expect(platformViolations(html, [])).toEqual([]);
  });
});
