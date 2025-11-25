// Manual type definitions to replace missing vite/client types
declare module '*.css';
declare module '*.png';
declare module '*.jpg';
declare module '*.jpeg';
declare module '*.svg';
declare module '*.gif';

// Ensure process.env is typed for the API key usage
// We augment the existing NodeJS.ProcessEnv interface rather than redeclaring the global process variable.
// This prevents "Cannot redeclare block-scoped variable" errors and ensures process.cwd() is recognized in vite.config.ts.
declare namespace NodeJS {
  interface Process {
    cwd(): string;
    env: ProcessEnv;
  }
  interface ProcessEnv {
    API_KEY: string;
    [key: string]: string | undefined;
  }
}