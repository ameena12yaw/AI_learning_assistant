# AI Learning Assistant

Full-stack AI-powered study assistant built with the MERN stack. Upload PDFs, chat with AI about your documents, generate flashcards and quizzes, track progress — all powered by [OpenRouter](https://openrouter.ai/).

Inspired by the [Time To Program tutorial](https://www.youtube.com/watch?v=iaAdWmAu0TE).

## Features

- **User Authentication** — JWT-based login & signup
- **PDF Upload & Viewer** — Upload, store, and read documents in-app
- **AI Chat** — Context-aware Q&A about your documents (OpenRouter)
- **AI Summary & Concept Explainer** — One-click summaries and deep dives
- **Flashcards** — Auto-generated with flip animation and favorites
- **Quizzes** — Custom multiple-choice quizzes with score analytics
- **Dashboard** — Progress tracking with recent activity feed
- **Responsive UI** — Modern design with Tailwind CSS v4

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| Frontend | React, Vite, Tailwind CSS, React Router |
| Backend | Node.js, Express, JWT, Multer |
| Database | Supabase (PostgreSQL) |
| AI | [OpenRouter](https://openrouter.ai/) |

## Prerequisites

- Node.js 18+
- [Supabase](https://supabase.com) project (free tier works)
- [OpenRouter](https://openrouter.ai/) account and API key

## Setup

### 1. Create Supabase tables

1. Create a project at [supabase.com](https://supabase.com)
2. Open **SQL Editor** → **New query**
3. Paste and run the contents of `backend/supabase/schema.sql`

### 2. Backend

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env` with your keys from **Supabase → Project Settings → API**:

- `SUPABASE_URL` — Project URL
- `SUPABASE_SERVICE_ROLE_KEY` — `service_role` key (keep secret, backend only)
- `OPENROUTER_API_KEY` — from [OpenRouter Keys](https://openrouter.ai/keys)
- `OPENROUTER_MODEL` — optional; defaults to a free model (see [models](https://openrouter.ai/models))
- `JWT_SECRET` — any secure random string

```bash
npm install
npm run dev
```

The API runs at `http://localhost:8000`.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open the Vite URL shown (typically `http://localhost:5173`).

## Environment Variables

Create `backend/.env`:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
OPENROUTER_API_KEY=your_openrouter_api_key
OPENROUTER_MODEL=openrouter/free
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d
MAX_FILE_SIZE=10485760
PORT=8000
NODE_ENV=development
```

## Project Structure

```
learning_assistant/
├── backend/
│   ├── supabase/       # SQL schema for Supabase
│   ├── config/         # Supabase & file upload config
│   ├── controllers/    # Route handlers
│   ├── middleware/     # Auth & error handling
│   └── utils/          # OpenRouter AI, PDF parsing & DB helpers
└── frontend/
    └── src/
        ├── Components/ # Reusable UI components
        ├── pages/      # Route pages
        ├── services/   # API client functions
        └── context/    # Auth state
```

## API Overview

| Endpoint | Description |
|----------|-------------|
| `POST /api/auth/register` | Create account |
| `POST /api/auth/login` | Sign in |
| `POST /api/documents/upload` | Upload PDF |
| `POST /api/ai/chat` | AI chat about document |
| `POST /api/ai/generate-flashcards` | Generate flashcards |
| `POST /api/ai/generate-quiz` | Generate quiz |
| `GET /api/progress/dashboard` | Dashboard stats |

## Production Deployment

The frontend is deployed on **Vercel**. The Express API should be deployed separately (e.g. **Render**) because it needs persistent file uploads and long-running AI requests.

### 1. Deploy the API (Render)

1. Push this repo to GitHub.
2. Create a **Web Service** on [Render](https://render.com) from the repo.
3. Set **Root Directory** to `backend`.
4. **Build command:** `npm install`
5. **Start command:** `npm start`
6. Add environment variables from `backend/.env.example`:
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
   - `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`
   - `JWT_SECRET`, `NODE_ENV=production`
   - `API_BASE_URL` — your Render service URL (e.g. `https://ai-learning-assistant-api.onrender.com`)
   - `FRONTEND_URL` — your Vercel app URL (e.g. `https://your-app.vercel.app`)
   - `OPENROUTER_SITE_URL` — same as `FRONTEND_URL` (optional)

Or use the included `render.yaml` blueprint for one-click setup.

### 2. Deploy the frontend (Vercel)

**Option A — Root Directory: `frontend` (recommended)**

| Setting | Value |
|---------|--------|
| Root Directory | `frontend` |
| Framework Preset | Vite |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Node.js Version | 20 |

**Option B — deploy from repo root**

| Setting | Value |
|---------|--------|
| Build Command | `npm run build` |
| Output Directory | `frontend/dist` |
| Install Command | `npm install` (default) |

**Vercel environment variable (required):**

```
VITE_API_BASE_URL=https://your-api.onrender.com
```

Redeploy after adding env vars. Vite bakes `VITE_*` values in at build time.

### 3. Verify

- API health: `GET https://your-api.onrender.com/api/health`
- Frontend loads and login/register work against the deployed API
