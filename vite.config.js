import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from "vite-plugin-singlefile"
import { fileURLToPath, URL } from 'node:url'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(), 
    viteSingleFile(),
    // Inspector({
    //   toggleButtonVisibility: 'always', // Options: 'always' | 'active' | 'never'
    //   toggleComboKey: 'control-shift', // Default key combo to trigger inspection
    // })
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    host: true
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          charts: ['recharts'],
          pdf: ['jspdf', 'html2canvas'],
          utils: ['date-fns', 'xlsx']
        }
      }
    }
  },
  base: './', 
})