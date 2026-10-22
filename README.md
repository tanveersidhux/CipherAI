# CIPHER AI

> **Tagline:** Understand threats. Protect what matters.

## Product Summary
CIPHER AI is an AI-assisted digital security and threat intelligence web application. Users submit suspicious URLs, scam messages, and later emails to receive an evidence-based, explainable risk assessment, a plain-language AI explanation, prioritized recommended actions, and a private scan history with investigation tooling. The core architecture pairs a deterministic security engine (offline lexical rules and transparent category caps) with a bounded AI threat intelligence analyst (strict schema validation and deterministic fallback).

---

## Current Status: Phase 02 (Frontend Foundation & UI/UX Design System)
> **Notice:** **PHASE_01** (Specification & Technical Architecture) and **PHASE_02** (UI/UX Design System, Page Layouts, Navigation, Reusable Components, Responsive Design, and Mock-Driven Frontend Shell) are delivered. The `web/` application shell is fully operational and verified with typed mock fixtures mirroring Phase 01 schemas. Phase 03 will scaffold the FastAPI backend and database while verifying this existing frontend foundation per ADR-0006.

---

## Frontend Development (`web/`)

CIPHER AI features an accessible, responsive, dark/light themed React single-page application built on Vite, TypeScript (strict), Tailwind CSS, and shadcn/ui primitives.

### Prerequisites
- Node.js LTS (v20+ recommended)
- `npm`

### Quick Start
```bash
# Navigate to web application directory
cd web

# Install dependencies
npm install

# Run local development server
npm run dev

# Run strict TypeScript typecheck
npm run typecheck

# Run linter
npm run lint

# Run Vitest test suite
npm test

# Run tests with coverage
npm run test:coverage

# Build for production
npm run build
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
- [Risk-Scoring Specification & Indicator Catalog](file:///docs/architecture/risk-scoring-spec.md)
- [AI Safety and Explanation Specification](file:///docs/architecture/ai-spec.md)
- [Data Model & Persistence Specification](file:///docs/architecture/data-model.md)
- [Draft Database Schema (SQL)](file:///docs/architecture/schema-draft.sql)

### 3. Architecture Decision Records (ADRs)
- [ADR-0001: Initial Architecture Selection](file:///docs/adr/ADR-0001-initial-architecture.md)
- [ADR-0002: Deterministic-First Risk Scoring](file:///docs/adr/ADR-0002-deterministic-first-scoring.md)
- [ADR-0003: No Backend Fetching of Submitted URLs in MVP](file:///docs/adr/ADR-0003-no-backend-fetching-in-mvp.md)
- [ADR-0004: Anonymous Session Isolation Prior to User Authentication](file:///docs/adr/ADR-0004-anonymous-session-before-auth.md)
- [ADR-0005: Strict Schema Validation and Rejection Policy for AI Outputs](file:///docs/adr/ADR-0005-ai-output-schema-validation.md)
- [ADR-0006: Frontend Foundation in Phase 02](file:///docs/adr/ADR-0006-frontend-foundation-in-phase-02.md)

### 4. UI/UX Design System & Specification (Phase 02)
- [Design Principles & Visual Identity](file:///docs/design/design-principles.md)
- [Design Tokens & Contrast Audit](file:///docs/design/tokens.md)
- [Information Architecture & Navigation Sitemap](file:///docs/design/information-architecture.md)
- [Wireframes (Desktop, Tablet, Mobile)](file:///docs/design/wireframes.md)
- [User Flows & State Machines](file:///docs/design/user-flows.md)
- [Reusable Component Catalog](file:///docs/design/component-catalog.md)
- [Responsive Design Rules](file:///docs/design/responsive-rules.md)
- [Accessibility Specification & Audit (WCAG 2.1 AA)](file:///docs/design/accessibility.md)
- [Frontend Security Notes & Safe Rendering](file:///docs/design/frontend-security-notes.md)

### 5. API Contracts & Schemas
- [OpenAPI 3.1 Draft Contract (YAML)](file:///docs/api/openapi-draft.yaml)
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

### 6. Security, Testing & Phase Reports
- [Threat and Abuse Model](file:///docs/security/threat-model.md)
- [Testing & QA Strategy (Traceability Matrix)](file:///docs/testing/test-strategy.md)
- [Phase 01 Completion Report](file:///docs/phase-reports/PHASE_01_REPORT.md)
- [Phase 02 Completion Report](file:///docs/phase-reports/PHASE_02_REPORT.md)
