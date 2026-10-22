import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Con avvia.cmd (localhost:5173) l'archivio delle bollette sta sempre nel CT 203:
  // /api/ si inoltra lì. BOLLETTE_SU nel .env serve solo per provarlo altrove.
  const env = loadEnv(mode, process.cwd(), '')
  return {
    base: './',
    plugins: [svelte()],
    server: { proxy: { '/api': env.BOLLETTE_SU || 'http://10.10.50.21' } },
  }
})
