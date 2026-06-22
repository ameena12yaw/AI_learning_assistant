import 'dotenv/config';

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import './config/supabase.js';
import { assertOpenRouterConfigured } from './config/openrouter.js';
import { getAllowedOrigins, isOriginAllowed } from './utils/appUrl.js';
import { ensureStorageBucket } from './utils/documentStorage.js';
import errorHandler from './middleware/errorHandler.js';
import authRoutes from './routes/authRoutes.js';
import documentRoutes from './routes/documentRoutes.js';
import flashcardRoutes from './routes/flashcardRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import quizRoutes from './routes/quizRoutes.js';
import progressRoutes from './routes/progressRoutes.js';

assertOpenRouterConfigured();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const allowedOrigins = getAllowedOrigins();

const helmetMiddleware = helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
});

// Allow the Vite app (different port) to embed PDFs from /uploads
app.use((req, res, next) => {
  if (req.path.startsWith('/uploads')) {
    next();
    return;
  }
  helmetMiddleware(req, res, next);
});

app.use('/uploads', (req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
});

app.use(
  cors({
    origin(origin, callback) {
      if (isOriginAllowed(origin)) {
        callback(null, true);
        return;
      }

      console.warn(`CORS blocked for origin: ${origin}`);
      callback(null, false);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'AI Learning Assistant API',
    health: '/api/health',
    docs: 'Use /api/* routes. Frontend is deployed separately on Vercel.',
  });
});

app.get('/api/health', async (req, res) => {
  const storage = await ensureStorageBucket();

  res.status(200).json({
    success: true,
    status: 'ok',
    environment: process.env.NODE_ENV || 'development',
    storage: {
      provider: 'supabase',
      ...storage,
    },
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/flashcards', flashcardRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/progress', progressRoutes);

app.use(errorHandler);

app.use((req, res) => {
  const isApiRoute = req.path.startsWith('/api');
  res.status(404).json({
    success: false,
    error: 'Route not found',
    statusCode: 404,
    method: req.method,
    path: req.path,
    hint: isApiRoute
      ? 'This API path does not exist or requires a different HTTP method (e.g. /api/auth/login is POST only, not GET).'
      : 'This is the API server. Open the React app in your browser (local dev: http://localhost:5173).',
  });
});

const PORT = process.env.PORT || 8000;

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, async () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);

    const storage = await ensureStorageBucket();
    if (storage.ok) {
      console.log(`Document storage ready: Supabase bucket "${storage.bucket}" (public=${storage.public})`);
    } else {
      console.warn(
        `Document storage not ready: ${storage.error}. Run backend/supabase/migrations/002_storage_bucket.sql in Supabase SQL Editor.`
      );
    }

    if (process.env.NODE_ENV === 'production' && allowedOrigins.length === 0) {
      console.warn('Warning: FRONTEND_URL is not set. CORS may block browser requests.');
    }
  });
}

process.on('unhandledRejection', (err) => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});

export default app;
