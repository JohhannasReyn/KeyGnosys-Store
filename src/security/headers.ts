export interface CspSources { scriptHashes: string[]; styleHashes: string[]; styleAttrHashes: string[] }

const quoted = (hashes: string[]) => [...new Set(hashes)].sort().map((h) => `'${h}'`);

export function buildCsp(s: CspSources): string {
  const d = [
    "default-src 'self'",
    ["script-src 'self'", ...quoted(s.scriptHashes)].join(' '),
    ["style-src 'self'", ...quoted(s.styleHashes)].join(' '),
  ];
  if (s.styleAttrHashes.length) d.push(["style-src-attr 'unsafe-hashes'", ...quoted(s.styleAttrHashes)].join(' '));
  d.push("img-src 'self' data:", "font-src 'self'", "connect-src 'self'", "form-action 'self'",
    "frame-ancestors 'none'", "base-uri 'self'", "object-src 'none'");
  return d.join('; ');
}

export function securityHeaders(csp: string, opts: { hsts: boolean }): Record<string, string> {
  const h: Record<string, string> = {
    'Content-Security-Policy': csp,
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), usb=(), payment=()',
  };
  if (opts.hsts) h['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains';
  return h;
}

export function renderHeadersFile(h: Record<string, string>): string {
  return ['/*', ...Object.entries(h).map(([k, v]) => `  ${k}: ${v}`), '',
    '/_astro/*', '  Cache-Control: public, max-age=31536000, immutable', ''].join('\n');
}
