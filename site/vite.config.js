import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import fs from 'fs'

// Custom plugin to copy the /public/admin folder into dist/
function copyAdminFolder() {
  return {
    name: 'copy-admin-folder',
    closeBundle() {
      const srcDir = resolve(__dirname, 'public/admin')
      const destDir = resolve(__dirname, 'dist/admin')

      if (!fs.existsSync(srcDir)) {
        console.warn('⚠️ No /public/admin folder found.')
        return
      }

      fs.mkdirSync(destDir, { recursive: true })
      const files = fs.readdirSync(srcDir)
      for (const file of files) {
        fs.copyFileSync(`${srcDir}/${file}`, `${destDir}/${file}`)
      }
      console.log('✅ Copied /admin folder to dist output.')
    }
  }
}

// Export final config
export default defineConfig({
  plugins: [react(), copyAdminFolder()],
  base: '/ev-service-portal/',
})
