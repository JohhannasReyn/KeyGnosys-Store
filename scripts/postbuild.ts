import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { site } from '../src/config/site';
import { buildCsp, renderHeadersFile, securityHeaders, type CspSources } from '../src/security/headers';
import { scanHtml } from './csp-hashes';

async function htmlFiles(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await htmlFiles(p)));
    else if (e.name.endsWith('.html')) out.push(p);
  }
  return out;
}

const files = await htmlFiles('dist');
if (files.length === 0) { console.error('postbuild: no HTML in dist/'); process.exit(1); }
const all: CspSources = { scriptHashes: [], styleHashes: [], styleAttrHashes: [] };
const forbidden: string[] = [];
for (const f of files) {
  const s = scanHtml(await readFile(f, 'utf8'));
  all.scriptHashes.push(...s.scriptHashes);
  all.styleHashes.push(...s.styleHashes);
  all.styleAttrHashes.push(...s.styleAttrHashes);
  forbidden.push(...s.forbidden.map((x) => `${f}: ${x}`));
}
if (forbidden.length) { console.error(`postbuild: forbidden inline code:\n${forbidden.join('\n')}`); process.exit(1); }

const headers = securityHeaders(buildCsp(all), { hsts: site.hsts });
await writeFile(join('dist', '_headers'), renderHeadersFile(headers));
await mkdir(join('worker', 'generated'), { recursive: true });
await writeFile(join('worker', 'generated', 'security-headers.json'), JSON.stringify(headers, null, 2));
const n = (a: string[]) => new Set(a).size;
console.log(`postbuild: ${files.length} pages; hashes script=${n(all.scriptHashes)} style=${n(all.styleHashes)} style-attr=${n(all.styleAttrHashes)}`);
