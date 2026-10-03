import { readdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parse } from 'parse5';

/**
 * Truthful by construction (spec §1): the site must never present a platform as currently
 * downloadable/supported unless the validated release manifest has an artifact for it.
 *
 * 1. Structured (primary): every element carrying `data-platform="<p>"` (download CTAs, asset-table
 *    sections and rows, trust verify blocks) must name a platform present in the manifest.
 * 2. Availability regions (secondary): inside elements marked `data-availability` (the download CTA,
 *    the download page content, the trust #verify section, the home hero), visible text may not name a
 *    platform (whole word, case-insensitive) that is not in the manifest, except in the
 *    "not yet available for macOS" / "isn't available for <Platform> yet" phrasings.
 * Prose outside those regions (docs, roadmap, compatibility notes, trust evidence labels) is not scanned.
 */
interface PNode { nodeName?: string; tagName?: string; value?: string; attrs?: { name: string; value: string }[]; childNodes?: PNode[] }
interface ManifestLike { artifacts: { platform: string; primary: boolean }[] }

const NAMES = { windows: 'Windows', linux: 'Linux', macos: 'macOS' } as const;
const SKIP = new Set(['script', 'style', 'template']);
const ALLOWED = /not yet available for macOS|isn['’]t available for (?:Windows|Linux|macOS) yet/gi;

export function manifestPlatforms(release: ManifestLike | null): string[] {
  return release ? [...new Set(release.artifacts.filter((a) => a.primary).map((a) => a.platform))] : [];
}

const attrOf = (n: PNode, k: string) => n.attrs?.find((a) => a.name === k)?.value;

/** Every data-platform value in the page, and the visible text of each availability region. */
function scan(html: string): { tagged: { tag: string; platform: string }[]; regions: string[] } {
  const tagged: { tag: string; platform: string }[] = [];
  const regions: string[] = [];
  const text = (n: PNode, out: string[]) => {
    if (n.nodeName === '#text') { out.push(n.value ?? ''); return; }
    if (n.tagName && SKIP.has(n.tagName)) return;
    n.childNodes?.forEach((c) => text(c, out));
  };
  const walk = (n: PNode, inRegion: boolean) => {
    if (n.tagName && SKIP.has(n.tagName)) return;
    const p = attrOf(n, 'data-platform');
    if (p !== undefined) tagged.push({ tag: n.tagName ?? '?', platform: p });
    const isRegion = !inRegion && attrOf(n, 'data-availability') !== undefined;
    if (isRegion) { const out: string[] = []; text(n, out); regions.push(out.join(' ')); }
    n.childNodes?.forEach((c) => walk(c, inRegion || isRegion));
  };
  walk(parse(html) as unknown as PNode, false);
  return { tagged, regions };
}

/** Human-readable violations: unavailable platforms tagged with data-platform, or named in an availability region. */
export function platformViolations(html: string, platforms: string[]): string[] {
  const { tagged, regions } = scan(html);
  const out = tagged
    .filter((t) => !platforms.includes(t.platform))
    .map((t) => `<${t.tag} data-platform="${t.platform}"> has no artifact in the release manifest`);
  const text = regions.join(' ').replace(ALLOWED, '');
  for (const [id, name] of Object.entries(NAMES)) {
    if (!platforms.includes(id) && new RegExp(`\\b${name}\\b`, 'i').test(text)) {
      out.push(`availability region names ${name}, which has no artifact in the release manifest`);
    }
  }
  return out;
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
    for (const v of platformViolations(await readFile(f, 'utf8'), platforms)) problems.push(`${f}: ${v}`);
  }
  console.log(`check-platforms: ${files.length} pages, manifest platforms: ${platforms.join(', ') || '(no release)'}`);
  if (problems.length) { console.error(problems.join('\n')); process.exit(1); }
  console.log('check-platforms: OK');
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await main();
