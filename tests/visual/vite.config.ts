import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite';

export default defineConfig({
  root: 'tests/visual',
  plugins: [svelte()],
  server: { strictPort: true },
});
