import { resolve } from 'node:path';
import { buildContent } from './content/build-content';
import { fixtureSource } from './content/fixture-source';
import { githubSource } from './content/github-source';
import { writeContent } from './content/write-content';

const args = process.argv.slice(2);
const fx = args.indexOf('--fixtures');
const source = fx >= 0
  ? fixtureSource(resolve('fixtures/content', args[fx + 1] ?? 'default'))
  : githubSource('JohhannasReyn/KeyGnosys', process.env.GITHUB_TOKEN);

try {
  const c = await buildContent(source);
  await writeContent(c, process.cwd());
  console.log(`fetch-content: release=${c.release?.version ?? 'none'} docs=${c.docs ? `${c.docs.files.length} files @ ${c.docs.commit.slice(0, 7)}` : 'none'} feed=${c.feed.length}`);
} catch (e) {
  console.error(`fetch-content FAILED: ${(e as Error).message}`);
  process.exit(1);
}
