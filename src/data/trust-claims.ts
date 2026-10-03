import type { TrustClaim } from '../lib/trust';

/**
 * Owner-maintained. A claim is published only when `verified: true` and every evidence
 * entry is pinned to the current release commit (or any commit before the first release).
 * See docs/launch-checklist.md, "Re-verify trust claims".
 */
const C = '84a571b8154e256efca2ee9144a32bf3dcbfdf5e'; // app repo main on GitHub when evidence was drafted and re-checked (2026-10-03)

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
    title: 'No network code beyond the IPC endpoint',
    detail: 'The core and the UI talk to each other over an owner-only IPC endpoint: a Unix domain socket on Linux, a named pipe on Windows. In the cited core and UI sources, that endpoint is the only networking code: no TCP/UDP sockets and no HTTP client.',
    verified: false,
    evidence: [
      { commit: C, path: 'core/src/endpoint_posix.cpp', lines: [481, 491], label: 'Linux: the only socket the core opens is AF_UNIX (endpoint_posix.cpp)' },
      { commit: C, path: 'core/src/endpoint_windows.cpp', lines: [131, 133], label: 'Windows: the core serves a named pipe, not a network socket (endpoint_windows.cpp)' },
      { commit: C, path: 'python/keygnosys/coreclient/ipc.py', lines: [19, 34], label: 'The UI imports only QLocalSocket for networking (ipc.py)' },
      { commit: C, path: 'python/keygnosys/paths.py', lines: [46, 51], label: 'The endpoint the UI connects to is a pipe or socket path, not a host (paths.py)' },
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
    title: 'Owner-only IPC endpoint',
    detail: 'Only the user who started the core can open its IPC endpoint: the socket is mode 0600 on Linux, and the named pipe’s DACL grants only the creating user on Windows.',
    verified: false,
    evidence: [
      { commit: C, path: 'core/src/endpoint_posix.cpp', lines: [493, 505], label: 'Linux socket bound under umask 0177, then set to mode 0600 (endpoint_posix.cpp)' },
      { commit: C, path: 'core/src/endpoint_windows.cpp', lines: [50, 121], label: 'Windows pipe DACL grants the creating user only (endpoint_windows.cpp)' },
      { commit: C, path: 'core/src/endpoint_windows.cpp', lines: [131, 133], label: 'The pipe is created with that owner-only DACL (endpoint_windows.cpp)' },
    ],
  },
];
