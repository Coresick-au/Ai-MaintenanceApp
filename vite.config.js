import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from "vite-plugin-singlefile"
// import Inspector from 'vite-plugin-react-inspector'

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
  base: './', 
})