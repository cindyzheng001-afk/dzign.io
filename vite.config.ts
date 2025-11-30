import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // We cast process to any to avoid TS errors when @types/node is not fully loaded
  const env = loadEnv(mode, (process as any).cwd(), '');

  const apiKey = env.VITE_API_KEY || process.env.VITE_API_KEY || "";

  return {
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(apiKey),
    },
  }
})