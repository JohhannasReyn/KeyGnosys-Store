import { describe, expect, it } from 'vitest';
import { publishableClaims, type TrustClaim } from '../../src/lib/trust';

const A = 'a'.repeat(40);
const B = 'b'.repeat(40);
const claim = (o: Partial<TrustClaim> = {}): TrustClaim => ({
  id: 'no-network', title: 'No network, ever', detail: 'd', verified: true,
  evidence: [{ label: 'core/net', path: 'core/net.cpp', lines: [10, 20], commit: A }], ...o,
});

describe('publishableClaims', () => {
  it('publishes verified pre-release claims with pinned permalinks', () => {
    const { claims, warnings } = publishableClaims([claim()], null);
    expect(warnings).toEqual([]);
    expect(claims[0].prerelease).toBe(true);
    expect(claims[0].links[0].url).toBe(`https://github.com/JohhannasReyn/KeyGnosys/blob/${A}/core/net.cpp#L10-L20`);
  });
  it('omits #L fragment when no lines', () => {
    const c = claim({ evidence: [{ label: 'x', path: 'docs/ARCH.md', commit: A }] });
    expect(publishableClaims([c], null).claims[0].links[0].url).toMatch(/ARCH\.md$/);
  });
  it('excludes unverified claims with a warning', () => {
    const r = publishableClaims([claim({ verified: false })], null);
    expect(r.claims).toEqual([]);
    expect(r.warnings[0]).toMatch(/no-network: not verified/);
  });
  it('defaults to unpublished when verified is missing', () => {
    const { verified: _v, ...rest } = claim();
    expect(publishableClaims([rest], null).claims).toEqual([]);
  });
  it('excludes claims without evidence', () => {
    expect(publishableClaims([claim({ evidence: [] })], null).claims).toEqual([]);
  });
  it('throws on a non-SHA commit (e.g. "main")', () => {
    expect(() => publishableClaims([claim({ evidence: [{ label: 'x', path: 'p', commit: 'main' }] })], null)).toThrow(/40-hex/);
  });
  it('publishes claims matching the release commit as release-scoped', () => {
    const r = publishableClaims([claim()], { commit: A, version: '1.0.0' });
    expect(r.claims[0].prerelease).toBe(false);
  });
  it('hides claims whose evidence predates the release', () => {
    const r = publishableClaims([claim()], { commit: B, version: '1.1.0' });
    expect(r.claims).toEqual([]);
    expect(r.warnings[0]).toMatch(/no-network: evidence .* does not match release 1\.1\.0/);
  });
});
