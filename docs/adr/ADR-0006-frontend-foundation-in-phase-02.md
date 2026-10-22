# ADR-0006: Frontend Foundation and Design System in Phase 02

| Metadata | Details |
| :--- | :--- |
| **Title** | ADR-0006: Frontend Foundation and Design System in Phase 02 |
| **Phase** | PHASE_02: UI/UX Design System, Page Layouts, Navigation, Reusable Components, Responsive Design, and User Flows |
| **Status** | Approved |
| **Version** | 1.0.0 |
| **Date** | 2026-10-22 |
| **Owner Role** | Senior UI/UX Designer & Frontend Architect |

---

## 1. Context

In the CIPHER AI master architecture, frontend and backend development are executed in parallel across rapid phases by distributed team members. Phase 01 completed the requirements, threat schemas, risk-scoring specification, and API contracts. 

Phase 02 requires delivering a fully documented design system, comprehensive page layouts, reusable accessible components, and interactive user flows demoable in a browser. A key question arose: should Phase 02 deliver only static design artifacts, or should it scaffold and deliver the operational `web/` single-page application (SPA) foundation with typed mock-data fixtures?

## 2. Decision

We establish the operational `web/` frontend foundation directly within Phase 02:
1. Scaffold `web/` using **React 18 / 19 with Vite, TypeScript (strict mode), Tailwind CSS, shadcn/ui primitives, React Router, Recharts, and Vitest with React Testing Library and jsdom**.
2. Encapsulate all data access behind a strongly typed `CipherApi` TypeScript interface matching the Phase 01 API contracts (`docs/api/api-contracts.md`) and JSON Schemas (`docs/api/schemas/*.json`).
3. Provide a deterministic `MockCipherApi` and typed fixtures in Phase 02 so every page, state, interaction, and responsive breakpoint is testable, demoable, and validated independently of backend availability.
4. Phase 03 will **verify and extend** this established `web/` project (focusing on backend FastAPI setup, Supabase initialization, and monorepo orchestration) rather than re-scaffolding or recreating the frontend application.
5. In Phase 06, the HTTP client (`HttpCipherApi`) will simply implement the identical `CipherApi` interface without requiring any changes to frontend component props or page hierarchy.

## 3. Consequences

### Positive
- Eliminates duplicate scaffolding work in Phase 03 and prevents architectural divergence between design specs and implementation.
- Provides immediate visual, accessible, and automated verification of UI/UX workflows against WCAG 2.1 AA standards and the Glossary and Wording Guide.
- Enables frontend unit and integration testing with Vitest/RTL against realistic security threat reports without any live network dependencies.
- Establishes a zero-drift contract boundary (`CipherApi`) that decouples frontend UI polish from backend FastAPI readiness.

### Negative / Tradeoffs
- Phase 02 must maintain typed mock fixtures that strictly mirror Phase 01 JSON Schemas field-for-field in `snake_case`.
- Phase 03 must treat the existing `web/` structure as authoritative and add environment wiring without mutating design tokens or component architectures.

## 4. Alternatives Considered

- **Deliver Design Specs and Mock HTML Only in Phase 02; Scaffold Vite in Phase 03:** Rejected because it creates a handoff friction point, delays component testing, and risks re-scaffolding mismatches in dependencies, Tailwind tokens, and shadcn/ui primitives.
- **Direct HTTP Mocking (e.g. MSW or Mirage):** Rejected in favor of a clean programmatic interface (`CipherApi` with `MockCipherApi` provider) to avoid service-worker setup overhead in test runners and build scripts while keeping the contract explicit and type-safe.
