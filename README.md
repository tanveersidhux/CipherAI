# CIPHER AI

> **Tagline:** Understand threats. Protect what matters.

## Product Summary
CIPHER AI is an AI-assisted digital security and threat intelligence platform. Users submit suspicious URLs and scam messages to receive an evidence-based, explainable risk assessment, a plain-language AI explanation, prioritized recommended actions, and private scan history. The core architecture pairs a deterministic security engine (offline lexical heuristics and transparent category caps) with a bounded AI threat intelligence analyst (strict schema validation and deterministic fallback).

---

## Project Phase Roadmap & Status

| Phase | Description | Status | Report / Spec |
| :--- | :--- | :--- | :--- |
| **PHASE 01** | Specification, Schemas, Scoring Spec, Threat Model, Architecture | **COMPLETE** | [PHASE_01_REPORT.md](file:///docs/phase-reports/PHASE_01_REPORT.md) |
| **PHASE 02** | UI/UX Design System, Page Layouts, Accessible Components, Web Shell | **COMPLETE** | [PHASE_02_REPORT.md](file:///docs/phase-reports/PHASE_02_REPORT.md) |
| **PHASE 03** | Monorepo Scaffolding, FastAPI Foundation, Database Migration, Health API | **COMPLETE** | [PHASE_03_REPORT.md](file:///docs/phase-reports/PHASE_03_REPORT.md) |
| **PHASE 04** | Core Security Engine, Lexical URL/Message Analysis, Risk Scoring | *NEXT* | [risk-scoring-spec.md](file:///docs/architecture/risk-scoring-spec.md) |
| **PHASE 05** | Bounded AI Intelligence, Structured Prompts, Schema Validation | *PLANNED* | [ai-spec.md](file:///docs/architecture/ai-spec.md) |
| **PHASE 06** | Real Scan Endpoints, Scanning Workflows, Mock Replacement | *PLANNED* | [api-contracts.md](file:///docs/api/api-contracts.md) |
| **PHASE 07** | Persistence Layer, Anonymous Sessions, History, Dashboard Telemetry | *PLANNED* | [data-model.md](file:///docs/architecture/data-model.md) |

---

## Quick Start (Clone to Running in Under 15 Minutes)

For a comprehensive guide, see [Local Development Guide](file:///docs/setup/local-development.md).

### 1. Backend API (`api/`)
```bash
cd api
python -m venv .venv

# Activate virtualenv (Windows: .\.venv\Scripts\Activate.ps1 | Linux/macOS: source .venv/bin/activate)
pip install -r requirements-dev.txt

# Start backend server
uvicorn app.main:app --reload --port 8000
```
- API Base: `http://localhost:8000`
- Health Check: `http://localhost:8000/api/v1/health`
- Interactive Docs (Dev only): `http://localhost:8000/docs`

### 2. Frontend Client (`web/`)
```bash
cd web
npm ci
npm run dev
```
- Web Application: `http://localhost:5173`
- Connection Status: Accessible from the Settings page

### 3. Run All Automated Verification
```bash
# Frontend checks
cd web
npm run lint && npm run typecheck && npm run test && npm run build

# Backend checks
cd ../api
ruff check . && ruff format --check . && pytest --cov=app

# Secret scan
cd ..
node scripts/check-no-secrets-in-web.mjs
```

---

## Documentation Index

### 1. Requirements & Project Scope
- [Product Requirements Document (PRD)](file:///docs/requirements/PRD.md)
- [User Personas and Stories](file:///docs/requirements/user-stories.md)
- [Scope Allocation Matrix](file:///docs/requirements/scope-matrix.md)
- [Non-Functional Requirements](file:///docs/requirements/non-functional-requirements.md)
- [Hackathon Execution Plan & Demo Script](file:///docs/requirements/execution-plan.md)
- [Project Risk Register](file:///docs/requirements/risk-register.md)
- [Glossary and Wording Guide](file:///docs/requirements/glossary-and-wording.md)

### 2. Architecture & Design
- [System Architecture](file:///docs/architecture/architecture.md)
- [Backend Foundation Architecture](file:///docs/architecture/backend-foundation.md)
- [Risk-Scoring Specification & Indicator Catalog](file:///docs/architecture/risk-scoring-spec.md)
- [AI Safety and Explanation Specification](file:///docs/architecture/ai-spec.md)
- [Data Model & Persistence Specification](file:///docs/architecture/data-model.md)
- [Draft Database Schema (SQL)](file:///docs/architecture/schema-draft.sql)
- [Threat Model & Security Mitigation](file:///docs/security/threat-model.md)

### 3. Setup & Development Guides
- [Local Development Guide](file:///docs/setup/local-development.md)
- [Database Setup & Migration Guide](file:///docs/setup/database-setup.md)
- [Contributing & PR Guidelines](file:///CONTRIBUTING.md)

### 4. Architecture Decision Records (ADRs)
- [ADR-0001: Initial Architecture Selection](file:///docs/adr/ADR-0001-initial-architecture.md)
- [ADR-0002: Deterministic-First Risk Scoring](file:///docs/adr/ADR-0002-deterministic-first-scoring.md)
- [ADR-0003: No Backend Fetching of Submitted URLs in MVP](file:///docs/adr/ADR-0003-no-backend-fetching-in-mvp.md)
- [ADR-0004: Anonymous Session Isolation Prior to User Authentication](file:///docs/adr/ADR-0004-anonymous-session-before-auth.md)
- [ADR-0005: Strict Schema Validation and Rejection Policy for AI Outputs](file:///docs/adr/ADR-0005-ai-output-schema-validation.md)
- [ADR-0006: Frontend Foundation in Phase 02](file:///docs/adr/ADR-0006-frontend-foundation-in-phase-02.md)
- [ADR-0007: Backend Foundation Extensions and Reconciliations](file:///docs/adr/ADR-0007-backend-foundation-extensions.md)

### 5. UI/UX Design System (Phase 02)
- [Design Principles & Visual Identity](file:///docs/design/design-principles.md)
- [Design Tokens & Contrast Audit](file:///docs/design/tokens.md)
- [Information Architecture & Navigation Sitemap](file:///docs/design/information-architecture.md)
- [Wireframes (Desktop, Tablet, Mobile)](file:///docs/design/wireframes.md)
- [User Flows & State Machines](file:///docs/design/user-flows.md)
- [Reusable Component Catalog](file:///docs/design/component-catalog.md)
- [Responsive Design Rules](file:///docs/design/responsive-rules.md)
- [Accessibility Specification & Audit (WCAG 2.1 AA)](file:///docs/design/accessibility.md)
- [Frontend Security Notes & Safe Rendering](file:///docs/design/frontend-security-notes.md)

### 6. API Contracts & Schemas
- [OpenAPI 3.1 Contract (YAML)](file:///docs/api/openapi-draft.yaml)
- [Human-Readable API Contracts](file:///docs/api/api-contracts.md)
- [JSON Schemas](file:///docs/api/schemas/)
  - [ThreatReport Schema](file:///docs/api/schemas/threat-report.schema.json)
  - [Indicator Schema](file:///docs/api/schemas/indicator.schema.json)
  - [ScoreContribution Schema](file:///docs/api/schemas/score-contribution.schema.json)
  - [ExternalEvidence Schema](file:///docs/api/schemas/external-evidence.schema.json)
  - [AIExplanation Schema](file:///docs/api/schemas/ai-explanation.schema.json)
  - [RecommendedAction Schema](file:///docs/api/schemas/recommended-action.schema.json)
  - [ErrorEnvelope Schema](file:///docs/api/schemas/error-envelope.schema.json)
  - [Example ThreatReport JSON](file:///docs/api/schemas/examples/threat-report.example.json)

### 7. Phase Completion Reports
- [PHASE 01 Completion Report](file:///docs/phase-reports/PHASE_01_REPORT.md)
- [PHASE 02 Completion Report](file:///docs/phase-reports/PHASE_02_REPORT.md)
- [PHASE 03 Completion Report](file:///docs/phase-reports/PHASE_03_REPORT.md)
