import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readdirSync, mkdirSync, writeFileSync } from 'node:fs';

const publicFiles = readdirSync(new URL('./public/', import.meta.url));
function coverAsset(base) {
  const matches = publicFiles.filter(file => new RegExp(`^${base}\\.(png|jpe?g|svg|avif)$`, 'i').test(file));
  if (matches.length !== 1) throw new Error(`Esperado um único asset público para ${base}; encontrados ${matches.length}.`);
  return '/' + matches[0];
}

export default defineConfig({
  plugins: [react(), {
    name: 'local-bundle-audit',
    apply: 'build',
    generateBundle(_options, bundle) {
      const chunks = Object.values(bundle).filter(item => item.type === 'chunk').map(item => ({ fileName: item.fileName, isEntry: item.isEntry, imports: item.imports, dynamicImports: item.dynamicImports, modules: Object.entries(item.modules).map(([id, value]) => ({ id: id.replaceAll('\\', '/'), renderedLength: value.renderedLength })) }));
      mkdirSync(new URL('./review/product-round/', import.meta.url), { recursive: true });
      writeFileSync(new URL('./review/product-round/bundle-modules.json', import.meta.url), JSON.stringify(chunks, null, 2));
    }
  }],
  define: { __COVER_ASSETS__: JSON.stringify({ logo: coverAsset('logo-acs'), news: coverAsset('capa-radar'), election: coverAsset('capa-eleicoes-2026'), newsWebp: publicFiles.includes('capa-radar.webp') ? '/capa-radar.webp' : null, electionWebp: publicFiles.includes('capa-eleicoes-2026.webp') ? '/capa-eleicoes-2026.webp' : null }) },
  server: {
    proxy: {
      '/api/live': { target: 'https://us-east1-radar-acs.cloudfunctions.net', changeOrigin: true, secure: true, rewrite: path => '/radarApi' + path },
      '^/api/advertising$': { target: 'https://us-east1-radar-acs.cloudfunctions.net', changeOrigin: true, secure: true, rewrite: path => '/radarApi' + path },
      '/__/firebase/': { target: 'https://radar-acs.web.app', changeOrigin: true, secure: true },
      '/api/admin/': { target: 'https://us-east1-radar-acs.cloudfunctions.net', changeOrigin: true, secure: true, rewrite: path => '/radarApi' + path },
      '^/api/radar/history': {
        target: 'https://us-east1-radar-acs.cloudfunctions.net',
        changeOrigin: true,
        secure: true,
        rewrite: path => path.replace('/api/radar/history', '/radarApi/api/briefing/history')
      },
      '^/api/radar/latest$': {
        target: 'https://us-east1-radar-acs.cloudfunctions.net',
        changeOrigin: true,
        secure: true,
        rewrite: () => '/radarApi/api/briefing/latest'
      }
    }
  },
  test: { environment: 'jsdom', setupFiles: './src/test/setup.js', include: ['src/**/*.test.{js,jsx}'] }
});
