import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const normalizeApiBaseUrl = (url) => {
  if (!url) return ''
  return url.trim().replace(/\/+$/, '').replace(/\/api$/i, '')
}

export default defineConfig(({ mode }) => {
  const fileEnv = loadEnv(mode, process.cwd(), '')
  const viteApiUrl = normalizeApiBaseUrl(
    process.env.VITE_API_BASE_URL || fileEnv.VITE_API_BASE_URL || ''
  )
  const backendUrl = normalizeApiBaseUrl(
    process.env.BACKEND_URL || fileEnv.BACKEND_URL || ''
  )
  const useApiProxy = mode === 'production' && !viteApiUrl && Boolean(backendUrl)

  if (mode === 'production') {
    console.log('[vite] Production API env:', {
      VITE_API_BASE_URL: viteApiUrl || '(not set)',
      BACKEND_URL: backendUrl || '(not set)',
      useApiProxy,
    })
  }

  return {
    plugins: [react(), tailwindcss()],
    define: {
      'import.meta.env.VITE_API_BASE_URL': JSON.stringify(viteApiUrl),
      'import.meta.env.VITE_USE_API_PROXY': JSON.stringify(useApiProxy ? 'true' : ''),
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      chunkSizeWarningLimit: 1200,
    },
    server: {
      port: 5173,
    },
    preview: {
      port: 4173,
    },
  }
})
