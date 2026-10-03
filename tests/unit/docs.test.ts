import { describe, expect, it } from 'vitest';
import {
  assertSafe, destForGuide, destForImage, docsEntry, DocsError, ensureTitle, guideFiles, imageRefs,
} from '../../scripts/content/docs';

describe('guideFiles', () => {
  it('selects only markdown under docs/guide and never developer docs', () => {
    const paths = ['docs/SPEC.md', 'docs/guide/index.md', 'docs/guide/setup/linux.mdx', 'docs/guide/notes.txt',
      'docs/superpowers/specs/x.md', 'docs/images/a.png', 'README.md'];
    expect(guideFiles(paths)).toEqual(['docs/guide/index.md', 'docs/guide/setup/linux.mdx']);
  });
});

describe('destinations', () => {
  it('maps guide and images into the Starlight content dir', () => {
    expect(destForGuide('docs/guide/setup/linux.md')).toBe('docs/setup/linux.md');
    expect(destForImage('docs/images/legend-base.png')).toBe('images/legend-base.png');
  });
});

describe('imageRefs', () => {
  it('resolves markdown and html image refs relative to the file', () => {
    const md = '![a](../images/a.png)\n![b](<../images/b c.png> "t")';
    expect(imageRefs(md, 'docs/guide/x.md')).toEqual(['docs/images/a.png', 'docs/images/b c.png']);
    expect(imageRefs('<img src="../../images/d.png">', 'docs/guide/sub/y.md')).toEqual(['docs/images/d.png']);
  });
  it('rejects refs escaping docs/', () => {
    expect(() => imageRefs('<img src="../../images/d.png">', 'docs/guide/x.md')).toThrow(/outside docs\/images/);
  });
  it('rejects external images (third-party request)', () => {
    expect(() => imageRefs('![x](https://cdn.example/x.png)', 'docs/guide/x.md')).toThrow(DocsError);
  });
  it('rejects images outside docs/images', () => {
    expect(() => imageRefs('![x](../SPEC.png)', 'docs/guide/x.md')).toThrow(/outside docs\/images/);
  });
  it('resolves reference-style image definitions', () => {
    const md = '[id]: ../images/logo.png\n\n![use][id]';
    expect(imageRefs(md, 'docs/guide/x.md')).toEqual(['docs/images/logo.png']);
  });
  it('resolves unquoted html src attributes', () => {
    expect(imageRefs('<img src=../images/a.png>', 'docs/guide/x.md')).toEqual(['docs/images/a.png']);
  });
  it('rejects reference-style external definitions', () => {
    expect(() => imageRefs('[id]: https://cdn.example/logo.png\n\n![use][id]', 'docs/guide/x.md')).toThrow(DocsError);
  });
  it('throws DocsError on malformed % sequence in URL', () => {
    expect(() => imageRefs('![x](../images/bad%ZZ.png)', 'docs/guide/x.md')).toThrow(DocsError);
  });
});

describe('assertSafe', () => {
  it.each([
    '<script>x</script>',
    '<img src="a" onerror="x">',
    '<svg/onload=alert(1)>',
    '<img/src=x/onerror=y>',
    '<iframe src="/x">',
    '<object data="/x">',
    '<embed src="/x">',
    '<base href="/x">',
    '<meta http-equiv="refresh">',
    '<form action="/x">',
    '[a](javascript:alert(1))',
    '[a](vbscript:x)',
    '[a](javascript&#58;alert(1))',
  ])('rejects %s', (s) => expect(() => assertSafe(s, 'docs/guide/x.md')).toThrow(DocsError));
  it('accepts plain markdown', () => expect(() => assertSafe('# Hi\n\nOnline docs are nice.', 'docs/guide/x.md')).not.toThrow());
});

describe('ensureTitle', () => {
  it('keeps existing frontmatter title', () => {
    const md = '---\ntitle: Setup\n---\n\nBody';
    expect(ensureTitle(md, 'p')).toBe(md);
  });
  it('derives title from first heading and removes it', () => {
    expect(ensureTitle('# Getting "started"\n\nBody', 'p')).toBe('---\ntitle: "Getting \\"started\\""\n---\n\n\nBody');
  });
  it('adds title into existing frontmatter without one', () => {
    expect(ensureTitle('---\ndescription: d\n---\n# T\nx', 'p')).toBe('---\ntitle: "T"\ndescription: d\n---\n\nx');
  });
  it('throws when no title can be found', () => {
    expect(() => ensureTitle('no heading', 'docs/guide/x.md')).toThrow(/no title/);
  });
});

describe('docsEntry', () => {
  it('prefers index', () => expect(docsEntry(['docs/guide/a.md', 'docs/guide/index.md'])).toBe('/docs/'));
  it('falls back to first file slug', () => expect(docsEntry(['docs/guide/Getting-Started.md'])).toBe('/docs/getting-started/'));
});
