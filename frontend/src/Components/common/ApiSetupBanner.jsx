import { isApiMisconfigured } from '../../utils/apiConfig.js';

const ApiSetupBanner = () => {
  if (!isApiMisconfigured) {
    return null;
  }

  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
      <strong>API not configured.</strong> In Vercel, set{' '}
      <code className="rounded bg-amber-100 px-1 dark:bg-amber-900">VITE_API_BASE_URL</code> to your
      deployed backend URL (e.g. Render), then redeploy.
    </div>
  );
};

export default ApiSetupBanner;
