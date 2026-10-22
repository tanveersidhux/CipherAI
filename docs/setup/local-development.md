# CIPHER AI: Local Development Guide

| Metadata | Details |
| :--- | :--- |
| **Project** | CIPHER AI (Understand threats. Protect what matters.) |
| **Document** | Local Development Setup and Developer Experience Guide |
| **Phase** | PHASE_03: Scaffolding, FastAPI Foundation, Database, and Health |
| **Version** | 1.0.0 |
| **Date** | 2026-10-22 |

---

## 1. Prerequisites

Before setting up CIPHER AI locally, ensure you have the following installed on your machine:

- **Node.js**: `v20.x` or `v22.x LTS` (v24 also supported)
- **npm**: `v10.x` or newer
- **Python**: `3.11` or newer (`python --version`)
- **Git**: `2.30+`
- **Optional**: Supabase CLI (if running local Supabase stack via Docker)

---

## 2. Fast Clone-to-Running Walkthrough (Under 15 Minutes)

### Step 2.1: Clone the Repository
```bash
git clone https://github.com/tanveersidhux/CipherAI.git
cd CipherAI
```

### Step 2.2: Setup Backend (`api/`)
```bash
cd api

# 1. Create Python virtual environment
python -m venv .venv

# 2. Activate virtual environment
# Windows PowerShell:
.\.venv\Scripts\Activate.ps1
# macOS / Linux:
source .venv/bin/activate

# 3. Upgrade pip and install pinned development dependencies
python -m pip install --upgrade pip
pip install -r requirements-dev.txt

# 4. Create environment file from template
copy .env.example .env   # Windows
# cp .env.example .env   # macOS / Linux

# 5. Start the backend API dev server
uvicorn app.main:app --reload --port 8000
```
Backend will be live at: **http://localhost:8000**
- Health endpoint: **http://localhost:8000/api/v1/health**
- Interactive API Docs (Development only): **http://localhost:8000/docs**

---

### Step 2.3: Setup Frontend (`web/`)
In a separate terminal:
```bash
cd web

# 1. Install frontend dependencies
npm ci

# 2. Create environment file from template
copy .env.example .env   # Windows
# cp .env.example .env   # macOS / Linux

# 3. Start the Vite dev server
npm run dev
```
Frontend will be live at: **http://localhost:5173**

---

## 3. Verification Commands

Run all verification suites locally before opening pull requests:

### Backend Quality Suite
```bash
cd api
# Run linter
ruff check .

# Check code formatting
ruff format --check .

# Run all tests with coverage report
pytest --cov=app --cov-report=term-missing
```

### Frontend Quality Suite
```bash
cd web
# Lint code
npm run lint

# TypeScript type check
npm run typecheck

# Run test suite
npm run test

# Build production bundle
npm run build
```

### Repository Secret Scan
```bash
# From repository root:
node scripts/check-no-secrets-in-web.mjs
```

---

## 4. Environment Variables Reference

### Backend (`api/.env`)
| Variable | Default | Purpose |
| :--- | :--- | :--- |
| `APP_ENV` | `development` | Operating environment (`development`, `test`, `production`). |
| `APP_VERSION` | `1.0.0` | Application semver string. |
| `LOG_LEVEL` | `INFO` | Logging verbosity (`DEBUG`, `INFO`, `WARNING`, `ERROR`). |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:5173` | Comma-separated allowlist of web origins. |
| `RATE_LIMIT_SCANS_PER_MINUTE` | `30` | Scan submission rate limiter limit. |
| `MAX_MESSAGE_CHARS` | `5000` | Maximum character length for scam messages. |
| `MAX_URL_CHARS` | `2048` | Maximum character length for analyzed URLs. |
| `MAX_REQUEST_BODY_BYTES` | `20000` | Max raw HTTP body size enforced by ASGI middleware. |
| `ENABLE_API_DOCS` | `true` (dev) | Toggles `/docs` and `/redoc` endpoints. |
| `SUPABASE_URL` | *(optional)* | Supabase project REST URL. |
| `SUPABASE_SERVICE_ROLE_KEY` | *(optional)* | Backend-only service role key for database. |
| `DB_HEALTHCHECK_TIMEOUT_SECONDS` | `2.0` | Timeout for health check database probe. |
| `LLM_ENABLED` | `false` | Enable or disable LLM explanation pipeline. |

### Frontend (`web/.env`)
| Variable | Default | Purpose |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | `http://localhost:8000` | Target URL for backend FastAPI health and scan endpoints. |

---

## 5. Troubleshooting Common Issues

### Port 8000 or 5173 Already in Use
- Change backend port: `uvicorn app.main:app --reload --port 8080` and update `VITE_API_BASE_URL=http://localhost:8080` in `web/.env`.
- Change frontend port: `npm run dev -- --port 3000` and add `http://localhost:3000` to `CORS_ALLOWED_ORIGINS` in `api/.env`.

### CORS Errors in Browser Console
- Ensure the frontend URL (e.g. `http://localhost:5173`) is listed in `CORS_ALLOWED_ORIGINS` in `api/.env`.
- Ensure no trailing slash is included in origins.

### Backend Health Shows `database: not_configured`
- This is normal and expected for local offline development. CIPHER AI operates fully offline with mock data when no database is configured.
