import { describe, expect, it } from 'vitest';
import { manifestPlatforms, platformViolations } from '../../scripts/check-platforms';

const page = (body: string, head = '') => `<!doctype html><html><head><title>KeyGnosys</title>${head}</head><body>${body}</body></html>`;
const art = (platform: string, primary = true) => ({ platform, primary, file: `f-${platform}`, url: 'u', size: 1 });

describe('manifestPlatforms', () => {
  it('lists platforms with a primary artifact; none without a release', () => {
    expect(manifestPlatforms({ artifacts: [art('windows'), art('linux', false)] })).toEqual(['windows']);
    expect(manifestPlatforms(null)).toEqual([]);
  });
});

describe('platformViolations', () => {
  it('fails a windows-only manifest when the page mentions Linux', () => {
    expect(platformViolations(page('<p>Now on Windows and Linux.</p>'), ['windows'])).toEqual(['Linux']);
  });
  it('passes when every named platform is in the manifest', () => {
    expect(platformViolations(page('<p>Download for Windows</p><p>Download for Linux</p>'), ['windows', 'linux'])).toEqual([]);
  });
  it('fails on any platform name when there is no release', () => {
    expect(platformViolations(page('<p>Windows</p>'), [])).toEqual(['Windows']);
    expect(platformViolations(page('<p>Linux</p>'), [])).toEqual(['Linux']);
    expect(platformViolations(page('<p>macOS</p>'), [])).toEqual(['macOS']);
    expect(platformViolations(page('<p>First release coming soon</p>'), [])).toEqual([]);
  });
  it('checks the title and meta description too', () => {
    expect(platformViolations(page('', '<meta name="description" content="An overlay for Linux.">'), ['windows'])).toEqual(['Linux']);
  });
  it('allows macOS only in "not yet available for macOS"', () => {
    expect(platformViolations(page('<p>KeyGnosys is not yet available for macOS</p>'), ['windows'])).toEqual([]);
    expect(platformViolations(page('<p>Works on macOS</p>'), ['windows', 'linux'])).toEqual(['macOS']);
  });
  it('ignores trust-evidence link text, scripts, styles and attributes', () => {
    const html = page(`<ul class="evidence"><li><a href="x">Linux socket created mode 0600 ↗</a></li></ul>
      <div data-release='{"windows":1}' title="linux"></div><script>"Linux"</script><style>/* macOS */</style>`);
    expect(platformViolations(html, [])).toEqual([]);
  });
  it('matches whole words only', () => {
    expect(platformViolations(page('<p>KeyGnosys-1.0.0-linux-x64.AppImage WindowsXYZ</p>'), [])).toEqual([]);
  });
});
