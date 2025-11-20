// Manual type definitions to replace missing vite/client types
declare module '*.css';
declare module '*.png';
declare module '*.jpg';
declare module '*.jpeg';
declare module '*.svg';
declare module '*.gif';

// Ensure process.env is typed for the API key usage
declare const process: {
  env: {
    [key: string]: string | undefined;
  }
};
