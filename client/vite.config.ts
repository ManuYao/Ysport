import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// ── Plugin : vérifie que le backend Express est joignable au démarrage ─────────
function backendHealthCheck(url = 'http://localhost:3001/api/health') {
  return {
    name: 'backend-health-check',
    async buildStart() { /* build prod : pas de check */ },
    configureServer() {
      // Lance le check 1s après le démarrage pour laisser le temps à Vite de s'initialiser
      setTimeout(async () => {
        try {
          const res = await fetch(url, { signal: AbortSignal.timeout(3000) })
          if (res.ok) {
            console.log('\n  \x1b[32m✔\x1b[0m  Backend API    \x1b[32mprêt\x1b[0m  →  ' + url.replace('/api/health', ''))
          } else {
            console.warn('\n  \x1b[33m⚠\x1b[0m  Backend API    HTTP ' + res.status + '  →  ' + url.replace('/api/health', ''))
          }
        } catch {
          console.warn('\n  \x1b[33m⚠\x1b[0m  Backend API    \x1b[33mnon joignable\x1b[0m  →  lance \x1b[36mnpm run dev\x1b[0m dans /server')
        }
      }, 1000)
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), backendHealthCheck()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
