import { mkdir, writeFile } from 'node:fs/promises';
import { z } from 'zod';
import { ManifestSchema } from '../src/lib/release-manifest';

await mkdir('public/schemas', { recursive: true });
await writeFile('public/schemas/keygnosys-release-v1.json', JSON.stringify(z.toJSONSchema(ManifestSchema), null, 2));
