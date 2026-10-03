import { describe, expect, it } from 'vitest';
import { scanHtml, sha256 } from '../../scripts/csp-hashes';

const EMPTY = 'sha256-47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU=';

describe('scanHtml', () => {
  it('hashes inline executable scripts only', () => {
    const r = scanHtml('<script></script><script type="module"></script><script src="/a.js"></script><script type="application/json">{}</script>');
    expect(r.scriptHashes).toEqual([EMPTY, EMPTY]);
  });
  it('hashes inline style elements and decoded style attributes', () => {
    const r = scanHtml('<style></style><p style="a&amp;b"></p>');
    expect(r.styleHashes).toEqual([EMPTY]);
    expect(r.styleAttrHashes).toEqual([sha256('a&b')]);
  });
  it('hashes exact script text', () => {
    expect(scanHtml('<script>let a = "<b>";</script>').scriptHashes).toEqual([sha256('let a = "<b>";')]);
  });
  it('walks <template> content', () => {
    expect(scanHtml('<template><script></script></template>').scriptHashes).toEqual([EMPTY]);
  });
  it('flags inline handlers and javascript: URLs', () => {
    const r = scanHtml('<a href="javascript:x()">x</a><button onclick="x()">y</button>');
    expect(r.forbidden).toEqual(['<a href=javascript:>', '<button onclick>']);
  });
});
