const trimTrailingSlash = (url) => url.replace(/\/+$/, '');

export const getApiBaseUrl = () => {
  if (process.env.API_BASE_URL) {
    return trimTrailingSlash(process.env.API_BASE_URL).replace(/\/api$/i, '');
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

  return configured;
};

export const isOriginAllowed = (origin) => {
  if (!origin) return true;

  const allowedOrigins = getAllowedOrigins();
  if (allowedOrigins.includes(origin)) return true;

  try {
    const { hostname } = new URL(origin);
    if (hostname.endsWith('.vercel.app')) return true;
  } catch {
    return false;
  }

  return false;
};
