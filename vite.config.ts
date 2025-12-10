import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // REMOVED: The define block that was injecting API_KEY into browser bundle
  // API calls now go through Netlify Functions which handle the key server-side
  
  build: {
    outDir: 'dist',
    sourcemap: false, // Disable sourcemaps in production for extra security
  }
})