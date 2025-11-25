import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');

  // Capture the API key from the specific VITE_API_KEY variable.
  // We fallback to process.env for CI/CD environments like Netlify.
  const apiKey = env.VITE_API_KEY || process.env.VITE_API_KEY || "";

  return {
    plugins: [react()],
    define: {
      // This ensures process.env.API_KEY is available in your code
      // We stringify it so it is inserted as a string literal in the client code
      'process.env.API_KEY': JSON.stringify(apiKey),
    },
  }
})