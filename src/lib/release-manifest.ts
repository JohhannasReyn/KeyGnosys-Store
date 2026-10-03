import { z } from 'zod';
import { PLATFORMS } from './platforms';
export { PLATFORMS, PLATFORM_NAMES, type Platform } from './platforms';

export const ArtifactSchema = z.strictObject({
  platform: z.enum(PLATFORMS),
  arch: z.enum(['x64', 'arm64']),
  format: z.enum(['installer', 'portable', 'appimage', 'deb', 'rpm', 'tarball']),
  file: z.string().min(1).max(200),
  size: z.number().int().positive(),
  sha256: z.string().regex(/^[0-9a-f]{64}$/, 'sha256 must be 64 lowercase hex characters'),
  primary: z.boolean(),
});

export const ManifestSchema = z.strictObject({
  schema: z.literal(1),
  version: z.string().regex(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/),
  tag: z.string().min(1),
  commit: z.string().regex(/^[0-9a-f]{40}$/),
  published: z.string().datetime(),
  buildRunUrl: z.string().regex(/^https:\/\/github\.com\/JohhannasReyn\/KeyGnosys\/actions\/runs\/\d+(?:\/.*)?$/),
  artifacts: z.array(ArtifactSchema).min(1),
});

export type Manifest = z.infer<typeof ManifestSchema>;
export type Artifact = z.infer<typeof ArtifactSchema>;
