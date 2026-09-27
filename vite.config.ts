import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    // With VITE_API_URL=/api, forward API calls to the local backend (cd server && npm run dev).
    // In production CloudFront routes /api/* to API Gateway, so the same URL works there.
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
})
