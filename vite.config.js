import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/ev-service-portal/',
  plugins: [
    react(),
  ]
})
