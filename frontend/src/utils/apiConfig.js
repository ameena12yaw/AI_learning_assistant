const trimTrailingSlash = (url) => url.replace(/\/+$/, '');

const normalizeApiBaseUrl = (url) => {
  if (!url) return '';
  const trimmed = trimTrailingSlash(url);
  // Avoid double /api paths if env var was set with a trailing /api
  return trimmed.replace(/\/api$/i, '');
};

const configuredUrl = normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL || '');
const usesApiProxy = import.meta.env.VITE_USE_API_PROXY === 'true';
const isProduction = import.meta.env.PROD;

export const API_BASE_URL = configuredUrl || (isProduction ? '' : 'http://localhost:8000');

export const isApiMisconfigured = isProduction && !configuredUrl && !usesApiProxy;

export const getApiConnectionErrorMessage = () => {
  if (isApiMisconfigured) {
    return 'API URL is not configured. Set VITE_API_BASE_URL in Vercel to your Render backend URL, then redeploy.';
  }

  if (isProduction) {
    return `Cannot reach the API at ${API_BASE_URL}. Check that the backend is deployed and running.`;
  }

  return `Cannot reach the API at ${API_BASE_URL}. Start the backend with: cd backend && npm run dev`;
};
