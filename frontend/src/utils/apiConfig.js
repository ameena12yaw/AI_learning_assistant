const trimTrailingSlash = (url) => url.replace(/\/+$/, '');

const configuredUrl = trimTrailingSlash(import.meta.env.VITE_API_BASE_URL || '');
const isProduction = import.meta.env.PROD;

export const API_BASE_URL = configuredUrl || (isProduction ? '' : 'http://localhost:8000');

export const isApiMisconfigured = isProduction && !configuredUrl;

export const getApiConnectionErrorMessage = () => {
  if (isApiMisconfigured) {
    return 'API URL is not configured. Set VITE_API_BASE_URL in Vercel and redeploy.';
  }

  if (isProduction) {
    return `Cannot reach the API at ${API_BASE_URL}. Check that the backend is deployed and running.`;
  }

  return `Cannot reach the API at ${API_BASE_URL}. Start the backend with: cd backend && npm run dev`;
};
