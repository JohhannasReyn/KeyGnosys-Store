import { parse } from 'parse5';

interface PNode { tagName?: string; attrs?: { name: string; value: string }[]; childNodes?: PNode[]; content?: PNode }
const OWN_HOSTS = new Set(['keygnosys.com', 'www.keygnosys.com']);
const FETCHING_RELS = new Set(['stylesheet', 'preload', 'modulepreload', 'prefetch', 'preconnect', 'dns-prefetch', 'icon', 'apple-touch-icon', 'manifest', 'mask-icon']);
const RESOURCE_ATTRS: Record<string, string[]> = {
  script: ['src'], img: ['src', 'srcset'], source: ['src', 'srcset'], video: ['src', 'poster'], audio: ['src'],
  iframe: ['src'], embed: ['src'], object: ['data'], form: ['action'], input: ['formaction'], button: ['formaction'],
  track: ['src'], image: ['href'], use: ['href'],
};

function isExternal(url: string): boolean {
  const u = url.trim();
  if (u.startsWith('//')) return !OWN_HOSTS.has(u.slice(2).split('/')[0]);
  if (!/^https?:/i.test(u)) return false;
  return !OWN_HOSTS.has(new URL(u).hostname);
}
const srcsetUrls = (v: string) => v.split(',').map((c) => c.trim().split(/\s+/)[0]).filter(Boolean);

export function externalResources(html: string): string[] {
  const out: string[] = [];
  const walk = (n: PNode) => {
    const attrs = n.attrs ?? [];
    const get = (k: string) => attrs.find((a) => a.name === k)?.value;
    if (n.tagName === 'link') {
      const rels = (get('rel') ?? '').toLowerCase().split(/\s+/);
      const href = get('href');
      for (const rel of rels) if (FETCHING_RELS.has(rel) && href && isExternal(href)) out.push(`link[${rel}]=${href}`);
    }
    for (const attr of RESOURCE_ATTRS[n.tagName ?? ''] ?? []) {
      const v = get(attr);
      if (!v) continue;
      for (const u of attr === 'srcset' ? srcsetUrls(v) : [v]) if (isExternal(u)) out.push(`${n.tagName}[${attr}]=${u}`);
    }
    for (const c of n.childNodes ?? []) walk(c);
    if (n.content) walk(n.content);
  };
  walk(parse(html) as unknown as PNode);
  return out;
}

export function cssExternalRefs(css: string): string[] {
  const out: string[] = [];
  for (const m of css.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)) if (isExternal(m[1])) out.push(m[1]);
  for (const m of css.matchAll(/@import\s+['"]([^'"]+)['"]/g)) if (isExternal(m[1])) out.push(m[1]);
  return out;
}

export function resolveInternal(href: string, exists: (p: string) => boolean): string | null {
  const path = decodeURI(href.split(/[?#]/)[0]);
  const candidates = path.endsWith('/') ? [`dist${path}index.html`] : [`dist${path}`, `dist${path}.html`, `dist${path}/index.html`];
  return candidates.find(exists) ?? null;
}
