import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// In dev, proxy /api calls to the Mac Mini's Express server so we can
// test against real data. In production, the Express server serves the
// built app directly and /api is same-origin — no proxy needed.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://192.168.1.191:3002',
        changeOrigin: true,
      },
    },
  },
})
