// Manual type definitions to replace missing vite/client types
declare module '*.css';
declare module '*.png';
declare module '*.jpg';
declare module '*.jpeg';
declare module '*.svg';
declare module '*.gif';

// Ensure process.env is typed for the API key usage
declare var process: {
  env: {
    API_KEY: string;
    [key: string]: string | undefined;
  }
};