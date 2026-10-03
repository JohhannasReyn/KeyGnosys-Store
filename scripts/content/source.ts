import type { GhRelease } from '../../src/lib/releases';

export interface ContentSource {
  listReleases(): Promise<GhRelease[]>;
  fetchJson(url: string): Promise<unknown>;
  resolveRef(ref: string): Promise<string>;
  listPaths(commit: string): Promise<string[]>;
  readFile(commit: string, path: string): Promise<Uint8Array>;
}
