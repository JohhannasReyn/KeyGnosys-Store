import { readdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parse } from 'parse5';

/**
 * Truthful by construction (spec §1): a built page may name a platform only when the release manifest
 * has a primary artifact for it. macOS is never shipped, so it may appear only as "not yet available for macOS".
 */
interface PNode { nodeName?: string; tagName?: string; value?: string; attrs?: { name: string; value: string }[]; childNodes?: PNode[] }
interface ManifestLike { artifacts: { platform: string; primary: boolean }[] }

const NAMES = { windows: 'Windows', linux: 'Linux', macos: 'macOS' } as const;
const SKIP = new Set(['script', 'style', 'template']);
const META = /^(description|og:title|og:description|twitter:title|twitter:description)$/;
const MACOS_ALLOWED = /not yet available for macOS/g;

export function manifestPlatforms(release: ManifestLike | null): string[] {
  return release ? [...new Set(release.artifacts.filter((a) => a.primary).map((a) => a.platform))] : [];
}

/** Visible text (plus title and meta descriptions), excluding trust-evidence link labels. */
function visibleText(html: string): string {
  const out: string[] = [];
  const walk = (n: PNode) => {
    if (n.nodeName === '#text') { out.push(n.value ?? ''); return; }
    const attr = (k: string) => n.attrs?.find((a) => a.name === k)?.value;
    if (n.tagName && SKIP.has(n.tagName)) return;
    if (n.tagName === 'ul' && (attr('class') ?? '').split(/\s+/).includes('evidence')) return;
    if (n.tagName === 'meta' && META.test(attr('name') ?? attr('property') ?? '')) out.push(attr('content') ?? '');
    n.childNodes?.forEach(walk);
  };
  walk(parse(html) as unknown as PNode);
  return out.join(' ');
}

/** Platform names (as displayed) that appear in the page without a matching manifest primary. */
export function platformViolations(html: string, platforms: string[]): string[] {
  const text = visibleText(html).replace(MACOS_ALLOWED, '');
  return Object.entries(NAMES)
    .filter(([id, name]) => !platforms.includes(id) && new RegExp(`\\b${name}\\b`).test(text))
    .map(([, name]) => name);
}

async function htmlFiles(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await htmlFiles(p))); else if (e.name.endsWith('.html')) out.push(p.split('\\').join('/'));
  }
  return out;
}

async function main() {
  const release = JSON.parse(await readFile('src/data/release.json', 'utf8')) as ManifestLike | null;
  const platforms = manifestPlatforms(release);
  const files = await htmlFiles('dist');
  const problems: string[] = [];
  for (const f of files) {
    for (const name of platformViolations(await readFile(f, 'utf8'), platforms)) {
      problems.push(`${f}: names ${name}, which has no artifact in the release manifest`);
    }
  }
  console.log(`check-platforms: ${files.length} pages, manifest platforms: ${platforms.join(', ') || '(no release)'}`);
  if (problems.length) { console.error(problems.join('\n')); process.exit(1); }
  console.log('check-platforms: OK');
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await main();
