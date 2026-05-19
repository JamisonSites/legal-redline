import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    proxy: {
      '/ecfr-api': {
        target: 'https://www.ecfr.gov',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ecfr-api/, '/api/versioner/v1'),
      },
      '/govinfo-api': {
        target: 'https://api.govinfo.gov',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/govinfo-api/, ''),
      }
    }
  }
})
