import { expect, it } from 'vitest';
import { z } from 'zod';
import { ManifestSchema } from '../../src/lib/release-manifest';
it('published JSON schema lists only supported platforms', () => {
  const s = z.toJSONSchema(ManifestSchema) as { required: string[]; properties: { artifacts: { items: { properties: { platform: { enum: string[] } } } } } };
  expect(s.required).toContain('artifacts');
  expect(s.properties.artifacts.items.properties.platform.enum).toEqual(['windows', 'linux']);
});
