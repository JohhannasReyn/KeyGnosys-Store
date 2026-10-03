import { posix } from 'node:path';

export const GUIDE_PREFIX = 'docs/guide/';
export const IMAGES_PREFIX = 'docs/images/';
export class DocsError extends Error {
  override name = 'DocsError';
}

export function guideFiles(paths: string[]): string[] {
  return paths.filter((p) => p.startsWith(GUIDE_PREFIX) && /\.mdx?$/.test(p)).sort();
}
export const destForGuide = (p: string) => `docs/${p.slice(GUIDE_PREFIX.length)}`;
export const destForImage = (p: string) => `images/${p.slice(IMAGES_PREFIX.length)}`;

const MD_IMAGE = /!\[[^\]]*\]\(\s*(?:<([^>]+)>|([^)\s]+))(?:\s+"[^"]*")?\s*\)/g;
const HTML_IMAGE = /<img\s[^>]*?src=["']([^"']+)["']/gi;
const HTML_IMAGE_UNQUOTED = /<img\s[^>]*?src=([^\s"'>]+)/gi;
const REF_STYLE_IMAGE = /^\[[^\]]+\]:\s*(?:<([^>]+)>|([^\s]+))(?:\s+["']?[^"']*["']?)?$/gm;

export function imageRefs(markdown: string, srcPath: string): string[] {
  const raw: string[] = [];
  for (const m of markdown.matchAll(MD_IMAGE)) raw.push(m[1] ?? m[2]);
  for (const m of markdown.matchAll(HTML_IMAGE)) raw.push(m[1]);
  for (const m of markdown.matchAll(HTML_IMAGE_UNQUOTED)) raw.push(m[1]);
  for (const m of markdown.matchAll(REF_STYLE_IMAGE)) raw.push(m[1] ?? m[2]);
  return raw.map((ref) => {
    if (/^[a-z][a-z0-9+.-]*:/i.test(ref) || ref.startsWith('//')) {
      throw new DocsError(`${srcPath}: external image ${ref} is not allowed (third-party request)`);
    }
    let resolved: string;
    try {
      resolved = posix.normalize(posix.join(posix.dirname(srcPath), decodeURI(ref)));
    } catch (e) {
      throw new DocsError(`${srcPath}: malformed URL ${ref} (${e instanceof Error ? e.message : String(e)})`);
    }
    if (!resolved.startsWith(IMAGES_PREFIX)) throw new DocsError(`${srcPath}: image ${ref} is outside docs/images`);
    return resolved;
  });
}

export function assertSafe(markdown: string, srcPath: string): void {
  const rules: [RegExp, string][] = [
    [/<script\b/i, '<script>'],
    [/[\s/"']on[a-z]+\s*=/i, 'inline event handler'],
    [/<iframe\b/i, '<iframe>'],
    [/<object\b/i, '<object>'],
    [/<embed\b/i, '<embed>'],
    [/<base\b/i, '<base>'],
    [/<meta\b/i, '<meta>'],
    [/<form\b/i, '<form>'],
    [/javascript:/i, 'javascript: URL'],
    [/vbscript:/i, 'vbscript: URL'],
    [/javascript&(#0*58|#x0*3a|colon);/i, 'entity-encoded javascript: URL'],
  ];
  for (const [re, what] of rules) if (re.test(markdown)) throw new DocsError(`${srcPath}: ${what} is not allowed in published docs`);
}

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/;

export function ensureTitle(markdown: string, srcPath: string): string {
  const fm = FRONTMATTER.exec(markdown);
  if (fm && /^title\s*:/m.test(fm[1])) return markdown;
  const body = fm ? markdown.slice(fm[0].length) : markdown;
  const h = /^#\s+(.+?)\s*$/m.exec(body);
  if (!h) throw new DocsError(`${srcPath}: no title (add frontmatter "title:" or a "# Heading")`);
  const rest = body.slice(0, h.index) + body.slice(h.index + h[0].length);
  const titleLine = `title: ${JSON.stringify(h[1])}`;
  return fm ? `---\n${titleLine}\n${fm[1]}\n---\n${rest}` : `---\n${titleLine}\n---\n\n${rest}`;
}

export function docsEntry(guidePaths: string[]): string {
  const index = guidePaths.find((p) => /^docs\/guide\/index\.mdx?$/.test(p));
  if (index) return '/docs/';
  const first = [...guidePaths].sort()[0];
  return `/docs/${first.slice(GUIDE_PREFIX.length).replace(/\.mdx?$/, '').toLowerCase()}/`;
}
