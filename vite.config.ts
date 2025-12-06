import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // We cast process to any to avoid TS errors when @types/node is not fully loaded
  const env = loadEnv(mode, (process as any).cwd(), '');

  // Check env.API_KEY first (loaded from .env), then VITE_API_KEY, then system process.env
  const apiKey = env.API_KEY || env.VITE_API_KEY || process.env.API_KEY || "";

  return {
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(apiKey),
    },
  }
})