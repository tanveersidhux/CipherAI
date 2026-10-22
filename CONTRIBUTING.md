# Contributing to CIPHER AI

Thank you for contributing to CIPHER AI (Understand threats. Protect what matters.).

This repository is structured as a monorepo containing:
- `api/`: FastAPI backend foundation, security analysis engine, and health services.
- `web/`: React 19 + TypeScript + Vite + Tailwind + shadcn/ui frontend client.
- `supabase/`: Database schema, migrations, and security policies (RLS).
- `docs/`: Product requirements, threat intelligence specifications, architecture decisions, and phase reports.

---

## 1. Branching Strategy

- **`main` Branch:** Always production-ready, passing all CI checks, and deployable. Direct pushes to `main` are restricted.
- **Phase Feature Branches:** Named according to the phase and topic:
  - Format: `phase-<number>-<short-description>`
  - Examples: `phase-03-fastapi-scaffolding`, `phase-04-security-engine`
- **Hotfix Branches:** `hotfix/<issue-description>`
- All pull requests must branch from `main`, reference relevant acceptance criteria, and merge back via squash or rebase once approved and CI passes.

---

## 2. Commit Message Guidelines (Conventional Commits)

We enforce [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>(<scope>): <short description in present tense>

[optional body explaining motivation and context]

[optional footer(s), e.g. Closes #123]
```

### Approved Types
- `feat`: A new feature or endpoint.
- `fix`: A bug fix or error envelope resolution.
- `docs`: Documentation only changes (PRD, ADRs, guides).
- `style`: Changes that do not affect the meaning of code (formatting, white-space).
- `refactor`: A code change that neither fixes a bug nor adds a feature.
- `test`: Adding or correcting tests.
- `chore`: Maintenance tasks, dependency updates, CI workflows.

### Approved Scopes
- `api`: FastAPI backend, middleware, routers, schemas.
- `web`: React frontend, components, hooks, routes.
- `engine`: Core security analysis and scoring algorithms.
- `db`: Supabase migrations, RLS policies, seeds.
- `ci`: GitHub Actions workflows and linters.
- `docs`: Architectural and setup documentation.

### Example Commits
- `feat(api): add fastapi foundation and health endpoint`
- `test(api): add unit tests for request id sanitization and body size limits`
- `fix(web): correct trailing slash normalization in config client`
- `docs(adr): record additive extensions in ADR-0007`

---

## 3. Security and Secret Safety Rules

1. **Never Commit Secrets:** Never commit `.env` files, Supabase service role keys, LLM API keys, or JWT secrets.
2. **Untracked Environment Files:** Use `.env.example` templates for configuration reference. Real secrets stay local in untracked `.env` files or in secure host environments.
3. **No Frontend Secrets:** Secret variables (`SUPABASE_SERVICE_ROLE_KEY`, `LLM_API_KEY`, `SUPABASE_JWT_SECRET`) must never exist in frontend code or build configurations. We enforce this with automated verification scripts.
4. **Standard Error Envelope:** All backend errors must return `{ error: { code, message, details, request_id } }` and must never leak internal stack traces or database URLs.
5. **No Outbound URL Fetching in MVP:** The backend engine strictly performs offline deterministic lexical analysis; it never fetches user-submitted URLs.

---

## 4. Local Development Workflow

Before opening a pull request, run all verification suites locally:

### Web Frontend
```bash
cd web
npm run lint
npm run typecheck
npm run test
npm run build
```

### Backend API
```bash
cd api
ruff check .
ruff format --check .
pytest --cov=app tests/
```

### Secret Scan
```bash
node scripts/check-no-secrets-in-web.mjs
```
