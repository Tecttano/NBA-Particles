import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
      server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: {
          '/api/nba': {
            target: 'https://stats.nba.com/stats',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api\/nba/, ''),
            headers: {
              'Referer': 'https://stats.nba.com/',
              'x-nba-stats-origin': 'stats',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          },
          '/api/bbref-proxy': {
            target: 'https://www.basketball-reference.com',
            changeOrigin: true,
            rewrite: (path) => {
              const url = new URL(path, 'http://localhost');
              const targetUrl = url.searchParams.get('url') || '/';
              return new URL(targetUrl).pathname;
            },
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          }
        }
      },
      plugins: [react()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
});
