import { fileURLToPath, URL } from 'node:url';
import { execSync } from 'node:child_process';
import path from 'path';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueDevTools from 'vite-plugin-vue-devtools';
import tailwindcss from '@tailwindcss/vite';

let hash = '';
let version = '';
try {
  hash = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
} catch (error) {
  console.error('Error getting git hash:', error);
  hash = 'DEV';
}

try {
  version = execSync('git describe --tags --abbrev=0', {
    encoding: 'utf8',
  }).trim();
} catch {
  console.error('Error getting git version.');
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), vueDevTools(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@flarm': path.resolve(__dirname, '../nmea-web-serial/packages/nmea-web-serial/src'),
    },
  },
  define: {
    'import.meta.env.VITE_APP_NAME': JSON.stringify('powerflarm-vue'),
    'import.meta.env.VITE_COMMIT_HASH': JSON.stringify(hash),
    'import.meta.env.VITE_VERSION': JSON.stringify(version),
  },
  base: '/flarm/',
});
