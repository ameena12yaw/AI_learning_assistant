import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

const normalizeBackendUrl = (url) => {
  if (!url) return '';
  return url.trim().replace(/\/+$/, '').replace(/\/api$/i, '');
};

const backendUrl = normalizeBackendUrl(
  process.env.VITE_API_BASE_URL || process.env.BACKEND_URL || ''
);

const proxyRewrites = backendUrl
  ? [
      { source: '/api/:path*', destination: `${backendUrl}/api/:path*` },
      { source: '/uploads/:path*', destination: `${backendUrl}/uploads/:path*` },
      { source: '/((?!assets/).*)', destination: '/index.html' },
    ]
  : [{ source: '/((?!assets/).*)', destination: '/index.html' }];

const updateVercelConfig = (filePath) => {
  if (!fs.existsSync(filePath)) return;

  const config = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  config.rewrites = proxyRewrites;
  fs.writeFileSync(filePath, `${JSON.stringify(config, null, 2)}\n`);
  console.log(`Updated ${path.relative(rootDir, filePath)} API proxy → ${backendUrl || 'none'}`);
};

updateVercelConfig(path.join(rootDir, 'vercel.json'));
updateVercelConfig(path.join(rootDir, 'frontend', 'vercel.json'));

const envFile = path.join(rootDir, 'frontend', '.env.production.local');

if (fs.existsSync(envFile) && fs.readFileSync(envFile, 'utf8').includes('VITE_USE_API_PROXY')) {
  fs.unlinkSync(envFile);
}

if (!backendUrl) {
  console.warn(
    'Warning: BACKEND_URL or VITE_API_BASE_URL is not set. Set one in Vercel environment variables before building.'
  );
}
