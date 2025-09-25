// API Configuration for debate processing

export const getDebateApiUrl = () => {
  // In production, use Railway service
  if (process.env.NODE_ENV === 'production') {
    return process.env.NEXT_PUBLIC_RAILWAY_URL || 'https://debate-processor.railway.app';
  }
  
  // In development, use local API
  return process.env.NEXT_PUBLIC_RAILWAY_URL || 'http://localhost:3001';
};

export const getDebateEndpoint = (path: string = '') => {
  const baseUrl = getDebateApiUrl();
  return `${baseUrl}/api/debate${path}`;
};






