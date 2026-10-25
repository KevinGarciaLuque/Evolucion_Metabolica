import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'

// Identificador único de cada build: se escribe en dist/sw.js para que cada despliegue
// cambie el service worker y los navegadores detecten que hay una versión nueva.
const buildId = Date.now().toString(36)

function swBuildId() {
  return {
    name: 'sw-build-id',
    apply: 'build',
    closeBundle() {
      const ruta = path.resolve('dist', 'sw.js')
      if (fs.existsSync(ruta)) {
        fs.writeFileSync(ruta, fs.readFileSync(ruta, 'utf8').replaceAll('__BUILD_ID__', buildId))
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), swBuildId()],
})
