import axios from 'axios';
import { BASE_URL } from './apiPaths';
import { getApiConnectionErrorMessage, isApiMisconfigured } from './apiConfig.js';

const DEFAULT_TIMEOUT = 30000;
const AI_TIMEOUT = 120000;
const UPLOAD_TIMEOUT = 120000;

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: DEFAULT_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

axiosInstance.interceptors.request.use(
  (config) => {
    if (isApiMisconfigured) {
      return Promise.reject(new Error(getApiConnectionErrorMessage()));
    }

    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const url = config.url || '';
    if (url.includes('/api/ai/')) {
      config.timeout = config.timeout ?? AI_TIMEOUT;
    } else if (url.includes('/api/documents/upload')) {
      config.timeout = config.timeout ?? UPLOAD_TIMEOUT;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const apiMessage = error.response?.data?.error;

    if (error.code === 'ECONNABORTED') {
      const isAiRequest = error.config?.url?.includes('/api/ai/');
      const message = isAiRequest
        ? 'AI request timed out. This can take up to 2 minutes — please try again.'
        : 'Request timed out. Please try again.';
      return Promise.reject(Object.assign(new Error(message), { code: 'ECONNABORTED' }));
    }

    if (!error.response && (error.code === 'ERR_NETWORK' || error.message === 'Network Error')) {
      return Promise.reject(
        new Error(
          `${getApiConnectionErrorMessage()} If the API health check works in the browser, set FRONTEND_URL on Render to your Vercel URL.`
        )
      );
    }

    if (error.response?.data?.error?.includes?.('CORS blocked')) {
      return Promise.reject(
        new Error(
          'CORS blocked by the API. On Render, set FRONTEND_URL to your exact Vercel site URL and redeploy the backend.'
        )
      );
    }

    if (error.response?.status === 405) {
      return Promise.reject(
        new Error(
          'Request failed (405). The frontend is calling itself instead of the API. Set VITE_API_BASE_URL in Vercel to your Render URL and redeploy.'
        )
      );
    }

    if (apiMessage) {
      return Promise.reject(Object.assign(new Error(apiMessage), { status: error.response?.status }));
    }

    if (error.response?.status === 500) {
      return Promise.reject(new Error('Server error occurred, please try again later.'));
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
