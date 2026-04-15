# Engageneering™ — Platform

**Stop Teaching. Start Engaging.**
A global crowd learning platform powered by ARIA — 12 autonomous agents, zero human intervention.

---

## Stack

| Layer | Technology | Hosting |
|-------|-----------|---------|
| Frontend | HTML / JS | Netlify |
| Backend API | Python 3.11 · FastAPI | Render |
| Database | PostgreSQL 15 (Supabase) | Supabase |
| Auth | Supabase Auth + custom JWT | Supabase |
| CI/CD | GitHub Actions | GitHub |
| Email | SendGrid (free tier) | SendGrid |

**Cost at launch: $0/month.** Upgrades at scale.

---

## Repository Structure

```
engageneering/
├── frontend/              ← Static HTML/JS (Netlify)
│   ├── index.html
│   ├── platform.html
│   ├── aria_architecture_v2.html
│   ├── registration_flow.html
│   └── ...
├── backend/               ← Python FastAPI (Render)
│   ├── main.py            ← App entry point
│   ├── config.py          ← Settings via pydantic-settings
│   ├── requirements.txt
│   ├── .env.example       ← Copy to .env, fill secrets
│   ├── routers/
│   │   └── auth.py        ← /api/v1/auth/* endpoints
│   ├── models/
│   │   └── user.py        ← Pydantic request/response schemas
│   ├── services/
│   │   └── auth_service.py ← Registration, login, ARIA init logic
│   └── db/
│       └── supabase.py    ← Supabase client singleton
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql ← Full DB schema
└── .github/
    └── workflows/
        └── deploy.yml     ← CI/CD: lint → deploy frontend + backend
```

---

## Local Setup

### 1. Clone the repo

```bash
git clone https://github.com/YOUR_ORG/engageneering.git
cd engageneering
```

### 2. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Open the SQL editor and run `supabase/migrations/001_initial_schema.sql`
3. In Authentication → Providers, enable Google and LinkedIn OAuth
4. Copy your project URL, anon key, and service role key

### 3. Configure the backend

```bash
cd backend
cp .env.example .env
# Edit .env with your Supabase keys, OAuth credentials, and JWT secret
```

### 4. Install and run

```bash
pip install -r requirements.txt
uvicorn main:app --reload
# API live at http://localhost:8000
# Docs at http://localhost:8000/docs (debug mode only)
```

### 5. Run the frontend

Open `frontend/index.html` directly in a browser, or serve with:
```bash
cd frontend && python -m http.server 8080
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/auth/register/email` | Register with email + password |
| POST | `/api/v1/auth/magic-link` | Send magic link (register or login) |
| POST | `/api/v1/auth/verify-email` | Verify email token → activate account |
| POST | `/api/v1/auth/login/email` | Login with email + password |
| POST | `/api/v1/auth/oauth/callback` | Handle Google / LinkedIn OAuth |
| GET  | `/api/v1/auth/me` | Get current user profile |
| PATCH | `/api/v1/auth/me/role` | Update role (Seeker/Answerer/Both/Institution) |
| PATCH | `/api/v1/auth/me/expertise` | Update expertise tags |
| GET  | `/health` | Health check |

---

## Deployment

### Render (Backend)

1. Connect your GitHub repo to [render.com](https://render.com)
2. New → Web Service → Python
3. Build command: `pip install -r requirements.txt`
4. Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Add all `.env` variables in the Render environment tab
6. Copy your Render API key and service ID to GitHub Secrets

### Netlify (Frontend)

1. Connect your GitHub repo to [netlify.com](https://netlify.com)
2. Publish directory: `frontend`
3. No build command needed
4. Copy your Netlify auth token and site ID to GitHub Secrets

### GitHub Secrets Required

```
NETLIFY_AUTH_TOKEN
NETLIFY_SITE_ID
RENDER_API_KEY
RENDER_SERVICE_ID
```

---

## Trademark

Engageneering™ and Engageneer™ are registered trademarks (Section 41).
© 2025 Engageneering™. All rights reserved.
