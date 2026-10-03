import { describe, expect, it } from 'vitest';
import { buildCsp, renderHeadersFile, securityHeaders } from '../../src/security/headers';

describe('buildCsp', () => {
  it('emits the spec §6.5 policy with sorted, de-duplicated hashes', () => {
    const csp = buildCsp({ scriptHashes: ['sha256-b', 'sha256-a', 'sha256-a'], styleHashes: [], styleAttrHashes: [] });
    expect(csp).toBe("default-src 'self'; script-src 'self' 'sha256-a' 'sha256-b'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'self'; object-src 'none'");
  });
  it('never allows unsafe-inline or unsafe-eval', () => {
    const csp = buildCsp({ scriptHashes: ['sha256-a'], styleHashes: ['sha256-s'], styleAttrHashes: ['sha256-t'] });
    expect(csp).not.toMatch(/unsafe-inline|unsafe-eval/);
  });
  it('adds style-src-attr with unsafe-hashes only when style attributes exist', () => {
    expect(buildCsp({ scriptHashes: [], styleHashes: [], styleAttrHashes: ['sha256-t'] })).toContain("style-src-attr 'unsafe-hashes' 'sha256-t'");
    expect(buildCsp({ scriptHashes: [], styleHashes: [], styleAttrHashes: [] })).not.toContain('style-src-attr');
  });
});

describe('securityHeaders', () => {
  it('includes the required headers and omits HSTS by default', () => {
    const h = securityHeaders('CSP', { hsts: false });
    expect(h).toEqual({
      'Content-Security-Policy': 'CSP',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), usb=(), payment=()',
    });
  });
  it('adds HSTS when enabled', () => {
    expect(securityHeaders('CSP', { hsts: true })['Strict-Transport-Security']).toBe('max-age=31536000; includeSubDomains');
  });
});

describe('renderHeadersFile', () => {
  it('applies headers to all paths and long-caches hashed assets', () => {
    expect(renderHeadersFile({ A: '1' })).toBe('/*\n  A: 1\n\n/_astro/*\n  Cache-Control: public, max-age=31536000, immutable\n');
  });
});
