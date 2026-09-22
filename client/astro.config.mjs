import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import node from '@astrojs/node';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const backendUrl = (
  process.env.BACKEND_URL ||
  (process.env.NODE_ENV === 'production'
    ? 'https://api.ksubzone.com'
    : 'http://127.0.0.1:5000')
).replace(/\/+$/, '');

// https://astro.build/config
export default defineConfig({
  site: 'https://www.ksubzone.com',
  output: 'hybrid',
  adapter: node({
    mode: 'standalone',
  }),
  integrations: [
    react(),
  ],
  devToolbar: {
    enabled: false,
  },
  vite: {
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        'next/link': path.resolve(__dirname, './src/lib/shims/next-link.tsx'),
        'next/image': path.resolve(__dirname, './src/lib/shims/next-image.tsx'),
        'next/navigation': path.resolve(__dirname, './src/lib/shims/next-navigation.ts'),
      },
    },
    define: {
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
      'process.env': '{}',
    },
    server: {
      proxy: {
        '/api': {
          target: backendUrl,
          changeOrigin: true,
        },
        '/uploads': {
          target: backendUrl,
          changeOrigin: true,
        },
      },
    },
    ssr: {
      noExternal: ['lucide-react'],
    },
  },
});
