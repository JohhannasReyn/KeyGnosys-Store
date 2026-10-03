import { readFileSync } from 'node:fs';

// Usage: check-headers <apex-url> [<www-url>]. Every URL must be https; www must end up on the apex.
const [apex, www] = process.argv.slice(2).filter(Boolean).map((u) => u.replace(/\/$/, ''));
if (!apex) { console.error('usage: check-headers <apex-url> [<www-url>]'); process.exit(2); }
const expected = JSON.parse(readFileSync('worker/generated/security-headers.json', 'utf8')) as Record<string, string>;
const problems: string[] = [];

async function checkSite(base: string, expectHost: string): Promise<number> {
  if (!base.startsWith('https://')) problems.push(`${base}: not https`);
  const home = await fetch(`${base}/`); // follows redirects (www -> apex)
  const final = new URL(home.url);
  if (final.protocol !== 'https:' || final.hostname !== expectHost) problems.push(`${base}: ended at ${home.url}, expected https://${expectHost}/`);
  const html = await home.text();
  // Astro inlines small scripts, so any quoted /_astro/ asset (js, css, font) will do.
  const asset = /(?:src|href)="(\/_astro\/[^"]+)"/.exec(html)?.[1];
  const targets = [`${final.origin}/`, `${final.origin}/download/`, `${final.origin}/api/contact`, ...(asset ? [`${final.origin}${asset}`] : [])];
  for (const url of targets) {
    const res = await fetch(url);
    for (const [k, v] of Object.entries(expected)) if (res.headers.get(k) !== v) problems.push(`${base} -> ${url}: ${k} = ${res.headers.get(k)}`);
  }
  return targets.length;
}

const apexHost = new URL(apex).hostname;
let n = await checkSite(apex, apexHost);
if (www) n += await checkSite(www, apexHost);
if (problems.length) { console.error(problems.join('\n')); process.exit(1); }
console.log(`check-headers: ${n} URLs OK (${www ? 'apex + www' : 'apex only'})`);
