import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import { existsSync, readFileSync } from 'node:fs';

const statusFile = new URL('./src/data/content-status.json', import.meta.url);
const status = existsSync(statusFile) ? JSON.parse(readFileSync(statusFile, 'utf8')) : { hasDocs: false };

const docs = starlight({
  title: 'KeyGnosys Docs',
  disable404Route: true,
  pagefind: false,        // D3: keeps CSP free of 'wasm-unsafe-eval'
  expressiveCode: false,  // D3: avoids inline-style code blocks
  social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/JohhannasReyn/KeyGnosys' }],
  sidebar: [{ label: 'Guide', items: [{ autogenerate: { directory: 'docs' } }] }],
  customCss: ['./src/styles/starlight.css'],
  components: { Footer: './src/components/docs/DocsFooter.astro' },
});

export default defineConfig({
  site: 'https://keygnosys.com',
  output: 'static',
  trailingSlash: 'always',
  build: { format: 'directory', inlineStylesheets: 'never' },
  integrations: status.hasDocs ? [docs] : [],
  vite: {
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/three')) return 'three';
          },
        },
      },
    },
  },
});
