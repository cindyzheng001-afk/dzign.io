import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');

  // aggressively search for the API key in various common environment variable names
  const apiKey = env.API_KEY || 
                 env.VITE_API_KEY || 
                 env.GOOGLE_API_KEY || 
                 env.GEMINI_API_KEY || 
                 env.GOOGLE_GENAI_API_KEY ||
                 process.env.API_KEY ||
                 process.env.VITE_API_KEY ||
                 "";

  return {
    plugins: [react()],
    define: {
      // This ensures process.env.API_KEY is available in your code
      'process.env.API_KEY': JSON.stringify(apiKey),
    },
  }
})