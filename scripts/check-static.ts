import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parse } from 'parse5';
import { cssExternalRefs, externalResources, resolveInternal } from './static-rules';

async function walk(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p))); else out.push(p.split('\\').join('/'));
  }
  return out;
}
interface PNode { tagName?: string; attrs?: { name: string; value: string }[]; childNodes?: PNode[] }
function hrefs(html: string): string[] {
  const out: string[] = [];
  const visit = (n: PNode) => {
    if (n.tagName === 'a') { const h = n.attrs?.find((a) => a.name === 'href')?.value; if (h) out.push(h); }
    n.childNodes?.forEach(visit);
  };
  visit(parse(html) as unknown as PNode);
  return out;
}

const files = await walk('dist');
const problems: string[] = [];
let external = 0;
for (const f of files) {
  if (f.endsWith('.html')) {
    const html = await readFile(f, 'utf8');
    problems.push(...externalResources(html).map((x) => `${f}: third-party resource ${x}`));
    for (const h of hrefs(html)) {
      if (/^(https?:)?\/\//.test(h)) { external++; continue; }
      if (/^(mailto:|#)/.test(h)) continue;
      if (h.startsWith('/') && !resolveInternal(h, existsSync)) problems.push(`${f}: broken internal link ${h}`);
    }
  } else if (f.endsWith('.css')) {
    problems.push(...cssExternalRefs(await readFile(f, 'utf8')).map((x) => `${f}: third-party CSS ref ${x}`));
  }
}
console.log(`check-static: ${files.length} files, ${external} external links (not followed)`);
if (problems.length) { console.error(problems.join('\n')); process.exit(1); }
console.log('check-static: OK');
