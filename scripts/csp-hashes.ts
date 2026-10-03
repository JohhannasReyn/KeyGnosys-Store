import { createHash } from 'node:crypto';
import { parse } from 'parse5';
import type { CspSources } from '../src/security/headers';

interface PNode { nodeName: string; tagName?: string; attrs?: { name: string; value: string }[]; childNodes?: PNode[]; content?: PNode; value?: string }
const EXEC_TYPES = new Set(['', 'module', 'text/javascript', 'application/javascript']);

export const sha256 = (s: string) => `sha256-${createHash('sha256').update(s, 'utf8').digest('base64')}`;

export function scanHtml(html: string): CspSources & { forbidden: string[] } {
  const out = { scriptHashes: [] as string[], styleHashes: [] as string[], styleAttrHashes: [] as string[], forbidden: [] as string[] };
  const walk = (n: PNode) => {
    const attrs = n.attrs ?? [];
    const attr = (k: string) => attrs.find((a) => a.name === k)?.value;
    for (const a of attrs) {
      if (/^on/i.test(a.name)) out.forbidden.push(`<${n.tagName} ${a.name}>`);
      if (['href', 'src', 'action', 'formaction'].includes(a.name) && /^\s*javascript:/i.test(a.value)) out.forbidden.push(`<${n.tagName} ${a.name}=javascript:>`);
      if (a.name === 'style') out.styleAttrHashes.push(sha256(a.value));
    }
    const text = () => (n.childNodes ?? []).map((c) => c.value ?? '').join('');
    if (n.tagName === 'script' && attr('src') === undefined && EXEC_TYPES.has((attr('type') ?? '').toLowerCase())) out.scriptHashes.push(sha256(text()));
    if (n.tagName === 'style') out.styleHashes.push(sha256(text()));
    for (const c of n.childNodes ?? []) walk(c);
    if (n.content) walk(n.content);
  };
  walk(parse(html) as unknown as PNode);
  return out;
}
