import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'out',
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name].js`,
        chunkFileNames: `assets/[name].[hash].js`,
        assetFileNames: `assets/[name].[ext]`
      },
      external: ['vscode']
    }
  },
  resolve: {
    alias: {
      '~': path.resolve(__dirname, 'src')
    }
  },
  experimental: {
    renderBuiltUrl(filename, { type }) {
      if (type == 'asset' && !['assets/index.js', 'assets/index.css'].includes(filename)) {
        // Function `window.__getChunkPath` is defined in `client\src\views\webviewHtmlProvider.ts`
        // We need this to correctly load bundle chunks in runtime
        return { runtime: `window.__webview.getChunkPath(${JSON.stringify(filename)})` };
      }
      return filename;
    }
  }
});
