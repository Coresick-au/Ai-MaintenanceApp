import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from "vite-plugin-singlefile"
import { fileURLToPath, URL } from 'node:url'

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  const isElectronBuild = mode === 'electron'

  return {
    plugins: [
      react(),
      isElectronBuild && viteSingleFile(),
    ].filter(Boolean),
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      port: 3000,
      host: true
    },
    build: {
      rollupOptions: isElectronBuild ? {} : {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            charts: ['recharts'],
            utils: ['date-fns', 'xlsx']
          }
        }
      }
    },
    base: './',
  }
})