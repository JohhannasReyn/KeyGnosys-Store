export interface Evidence { label: string; path: string; lines?: [number, number]; commit: string }
/** `verified` is set ONLY by the owner after reading the evidence. Missing or false means unpublished. */
export interface TrustClaim { id: string; title: string; detail: string; verified?: boolean; evidence: Evidence[] }
export interface PublishedClaim extends TrustClaim { prerelease: boolean; links: { label: string; url: string }[] }

const REPO = 'https://github.com/JohhannasReyn/KeyGnosys';

export function publishableClaims(
  claims: TrustClaim[],
  release: { commit: string; version: string } | null,
): { claims: PublishedClaim[]; warnings: string[] } {
  const warnings: string[] = [];
  const out: PublishedClaim[] = [];
  for (const c of claims) {
    for (const e of c.evidence) {
      if (!/^[0-9a-f]{40}$/.test(e.commit)) throw new Error(`${c.id}: evidence commit "${e.commit}" must be a 40-hex SHA`);
    }
    if (c.verified !== true) { warnings.push(`${c.id}: not verified by owner; hidden`); continue; }
    if (c.evidence.length === 0) { warnings.push(`${c.id}: no evidence; hidden`); continue; }
    if (release && c.evidence.some((e) => e.commit !== release.commit)) {
      warnings.push(`${c.id}: evidence commit does not match release ${release.version} (${release.commit.slice(0, 7)}); hidden until re-verified`);
      continue;
    }
    out.push({
      ...c,
      prerelease: release === null,
      links: c.evidence.map((e) => ({
        label: e.label,
        url: `${REPO}/blob/${e.commit}/${e.path}${e.lines ? `#L${e.lines[0]}-L${e.lines[1]}` : ''}`,
      })),
    });
  }
  return { claims: out, warnings };
}
