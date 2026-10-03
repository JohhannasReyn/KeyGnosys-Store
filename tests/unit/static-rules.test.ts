import { describe, expect, it } from 'vitest';
import { cssExternalRefs, externalResources, resolveInternal } from '../../scripts/static-rules';

describe('externalResources', () => {
  it('flags cross-origin resource loads and hints', () => {
    const html = `
      <script src="https://cdnjs.cloudflare.com/x.js"></script>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2">
      <link rel="preconnect" href="https://fonts.gstatic.com">
      <link rel="dns-prefetch" href="//example.net">
      <img src="https://img.example/a.png"><img srcset="/a.png 1x, https://img.example/b.png 2x">
      <iframe src="https://youtube.com/embed/x"></iframe>
      <form action="https://formspree.io/f/x"></form>`;
    expect(externalResources(html)).toEqual([
      'script[src]=https://cdnjs.cloudflare.com/x.js', 'link[stylesheet]=https://fonts.googleapis.com/css2',
      'link[preconnect]=https://fonts.gstatic.com', 'link[dns-prefetch]=//example.net',
      'img[src]=https://img.example/a.png', 'img[srcset]=https://img.example/b.png',
      'iframe[src]=https://youtube.com/embed/x', 'form[action]=https://formspree.io/f/x',
    ]);
  });
  it('allows same-origin resources, own-domain absolute URLs and plain links', () => {
    const html = `<script src="/_astro/a.js"></script><link rel="canonical" href="https://keygnosys.com/x/">
      <link rel="icon" href="https://keygnosys.com/favicon.svg"><a href="https://github.com/x">x</a><form action="/api/contact"></form>`;
    expect(externalResources(html)).toEqual([]);
  });
});

describe('cssExternalRefs', () => {
  it('flags remote url() and @import', () => {
    expect(cssExternalRefs("@import url('https://x.com/a.css'); .a{background:url(https://x.com/b.png)} .b{background:url(/ok.png)}"))
      .toEqual(['https://x.com/a.css', 'https://x.com/b.png']);
  });
});

describe('resolveInternal', () => {
  const files = new Set(['dist/index.html', 'dist/download/index.html', 'dist/releases.xml', 'dist/404.html']);
  const exists = (p: string) => files.has(p);
  it.each([
    ['/', 'dist/index.html'], ['/download/', 'dist/download/index.html'], ['/download/#verify', 'dist/download/index.html'],
    ['/releases.xml', 'dist/releases.xml'], ['/missing/', null],
  ])('%s -> %s', (href, out) => expect(resolveInternal(href, exists)).toBe(out));
});
