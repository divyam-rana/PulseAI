// Helper to get the correct API URL for all environments
export const getApiUrl = (): string => {
  // If VITE_API_URL is explicitly set, use it
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // In production (Cloud Run), API is served from same origin
  if (import.meta.env.PROD) {
    return '';
  }
  
  // In development, default to localhost:3001
  return 'http://localhost:3001';
};
