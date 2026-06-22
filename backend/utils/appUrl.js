const trimTrailingSlash = (url) => url.replace(/\/+$/, '');

export const getApiBaseUrl = () => {
  if (process.env.API_BASE_URL) {
    return trimTrailingSlash(process.env.API_BASE_URL);
  }

  const port = process.env.PORT || 8000;
  return `http://localhost:${port}`;
};

export const getAllowedOrigins = () => {
  const configured = (process.env.FRONTEND_URL || process.env.CLIENT_URL || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (process.env.NODE_ENV !== 'production') {
    return [...new Set([...configured, 'http://localhost:5173', 'http://127.0.0.1:5173'])];
  }

  return configured.length > 0 ? configured : ['http://localhost:5173'];
};
