import type { TrustClaim } from '../lib/trust';

/**
 * Owner-maintained. A claim is published only when `verified: true` and every evidence
 * entry is pinned to the current release commit (or any commit before the first release).
 * See docs/launch-checklist.md, "Re-verify trust claims".
 */
const C = '84a571b8154e256efca2ee9144a32bf3dcbfdf5e'; // app repo main when evidence was drafted

export const trustClaims: TrustClaim[] = [
  {
    id: 'nothing-hits-disk',
    title: 'Nothing hits disk',
    detail: 'No keystroke content is ever written, at any log level.',
    verified: false,
    evidence: [
      { commit: C, path: 'docs/SPEC.md', lines: [2114, 2116], label: 'The commitment: no keystroke log file, at any log level (SPEC §12.1)' },
      { commit: C, path: 'core/include/kgn/diagnostics.hpp', lines: [12, 13], label: 'Diagnostics may never contain keystroke content (diagnostics.hpp)' },
      { commit: C, path: 'core/src/main.cpp', lines: [205, 226], label: 'Core output is startup status and diagnostic codes on stderr only (main.cpp)' },
    ],
  },
  {
    id: 'no-network',
    title: 'No network, ever',
    detail: 'No telemetry, no update check, no crash upload.',
    verified: false,
    evidence: [
      { commit: C, path: 'docs/SPEC.md', lines: [2117, 2119], label: 'The commitment: no sockets beyond the local IPC endpoint (SPEC §12.2)' },
      { commit: C, path: 'core/src/endpoint_posix.cpp', lines: [481, 490], label: 'The only socket the core opens is AF_UNIX (endpoint_posix.cpp)' },
      { commit: C, path: 'python/keygnosys/coreclient/ipc.py', lines: [19, 19], label: 'The UI talks to the core over a local socket only (ipc.py)' },
    ],
  },
  {
    id: 'positional-codes',
    title: 'Positional codes only',
    detail: 'The core never resolves keys to characters.',
    verified: false,
    evidence: [
      { commit: C, path: 'core/include/kgn/keycode.hpp', lines: [1, 12], label: 'Keys are positional W3C codes, the only vocabulary (keycode.hpp)' },
      { commit: C, path: 'core/src/platform/windows/scancode_keymap.cpp', lines: [11, 20], label: 'Windows backend maps hardware scancodes, not characters (scancode_keymap.cpp)' },
    ],
  },
  {
    id: 'least-privilege',
    title: 'Least privilege',
    detail: 'Owner-only socket; no elevation on Windows by default.',
    verified: false,
    evidence: [
      { commit: C, path: 'core/src/endpoint_posix.cpp', lines: [492, 506], label: 'Linux socket created mode 0600 (endpoint_posix.cpp)' },
      { commit: C, path: 'core/src/endpoint_windows.cpp', lines: [50, 118], label: 'Windows pipe DACL grants the creating user only (endpoint_windows.cpp)' },
      { commit: C, path: 'docs/SPEC.md', lines: [1603, 1605], label: 'Running unelevated is the default on Windows (SPEC)' },
    ],
  },
];
