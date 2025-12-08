import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, (process as any).cwd(), '');

  // Prioritize process.env (Netlify CI) -> then .env file variables -> then VITE_ prefixed
  const apiKey = process.env.API_KEY || env.API_KEY || env.VITE_API_KEY;
  
  return {
    plugins: [react()],
    define: {
      // This injects the API key into the browser bundle
      'process.env.API_KEY': JSON.stringify(apiKey)
    }
  }
})