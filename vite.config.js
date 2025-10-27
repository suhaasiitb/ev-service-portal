import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/ev-service-portal/', // 👈 this line is critical for GitHub Pages
})
