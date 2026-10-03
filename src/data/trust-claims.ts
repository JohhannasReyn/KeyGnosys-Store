import type { TrustClaim } from '../lib/trust';

/**
 * Owner-maintained. A claim is published only when `verified: true` and every evidence
 * entry is pinned to the current release commit (or any commit before the first release).
 * See docs/launch-checklist.md, "Re-verify trust claims".
 */
export const trustClaims: TrustClaim[] = [
  { id: 'nothing-hits-disk', title: 'Nothing hits disk', detail: 'No keystroke content is ever written, at any log level.', verified: false, evidence: [] },
  { id: 'no-network', title: 'No network, ever', detail: 'No telemetry, no update check, no crash upload.', verified: false, evidence: [] },
  { id: 'positional-codes', title: 'Positional codes only', detail: 'The core never resolves keys to characters.', verified: false, evidence: [] },
  { id: 'least-privilege', title: 'Least privilege', detail: 'Owner-only socket; no elevation on Windows by default.', verified: false, evidence: [] },
];
