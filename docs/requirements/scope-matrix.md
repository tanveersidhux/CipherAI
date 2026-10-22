# CIPHER AI — Scope Matrix and Resource Allocation

| Metadata | Details |
| :--- | :--- |
| **Title** | Scope Matrix and Resource Allocation |
| **Phase** | PHASE_01: Requirements, Scope, Architecture, and Technical Specification |
| **Status** | Approved |
| **Version** | 1.0.0 |
| **Date** | 2026-10-22 |
| **Owner Role** | Senior Software Architect & Technical Product Analyst |

---

## 1. Overview & Constraints

This matrix maps every planned product capability to its execution phase, assigned team role, delivery tier (MVP vs Post-MVP), estimated effort, and technical risk.

### Budget & Capacity Constraints
- **Team Size:** 3 to 4 engineers
  - Frontend Engineer (FE)
  - Backend Security Engineer (BE)
  - AI / ML Engineer (AI)
  - DevOps / Full-Stack Engineer (DevOps) *(In a 3-person team, BE and FE share DevOps duties)*
- **Elapsed Hackathon Time Budget:** 12 to 24 calendar hours
- **Total Person-Hour Budget:** 
  - 3-Person Team (12h–24h): 36 to 72 person-hours
  - 4-Person Team (12h–24h): 48 to 96 person-hours
- **Principle:** Ship a working, deployable MVP first. Optional features must never block MVP delivery or become prerequisites for it.

---

## 2. Master Feature Allocation Matrix

| Feature ID | Feature Name | Tier | Phase | Owning Role | Est. Person-Hours | Risk Level | Scope & Boundary Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **F-01** | Specification & System Architecture | **MVP** | Phase 01 | All / Lead Architect | 4.0 | Low | Requirements, schemas, models, threat model, testing strategy. (No code). |
| **F-02** | Design System, UI Tokens & Layouts | **MVP** | Phase 02 | Frontend Engineer | 6.0 | Medium | Tailwind + shadcn/ui components, AppShell, RiskGauge, forms, mobile layout. |
| **F-03** | Monorepo Scaffolding & Health API | **MVP** | Phase 03 | BE + FE | 4.0 | Low | FastAPI backend skeleton, Vite frontend skeleton, config, `/api/v1/health`. |
| **F-04** | Security Engine (URL & Message) | **MVP** | Phase 04 | Backend Security | 8.0 | High | Lexical URL parsing, homoglyphs, message pattern rules, score calculator. |
| **F-05** | AI Orchestration & Fallback Engine | **MVP** | Phase 05 | AI Engineer | 6.0 | High | Evidence packet builder, prompt template, schema validator, fallback generator. |
| **F-06** | Full-Stack Integration & Scanning UX | **MVP** | Phase 06 | FE + BE | 6.0 | Medium | End-to-end scan flows (URL & message), report rendering, loading & error states. |
| **F-07** | Persistence, History & Dashboard | **MVP** | Phase 07 | DevOps / BE | 6.0 | Medium | Supabase PostgreSQL tables, anonymous session history, dashboard aggregations. |
| **F-08** | Security Hardening & Pre-Flight QA | **MVP** | Phase 09 | All | 4.0 | High | Regex ReDoS audit, input limits, rate limiting, zero-secrets check, e2e test suite. |
| **F-09** | Production Deployment & Demo Polish | **MVP** | Phase 10 | DevOps / Lead | 4.0 | Medium | Containerization/hosting (Vercel/Render/Fly), seed demo data, demo rehearsals. |
| **F-10** | Investigation Cases & Notes | Post-MVP | Phase 07 | Full-Stack | 6.0 | Medium | Post-MVP optional: grouping scans into case dossiers with notes. |
| **F-11** | Supabase User Authentication | Post-MVP | Phase 07/08 | Backend / DevOps | 5.0 | Medium | Post-MVP optional: JWT verification and `auth.uid()` RLS policies. |
| **F-12** | Third-Party Threat Feed Enrichment | Post-MVP | Phase 08 | Backend Security | 4.0 | Low | Post-MVP optional: Safe Browsing API / VirusTotal adapter. |
| **F-13** | Email (.eml / Header) Ingestion | Post-MVP | Phase 08 | Backend Security | 6.0 | High | Post-MVP optional: RFC 822 email parser, SPF/DKIM/DMARC checks. |
| **F-14** | Batch Scanning Endpoint | Post-MVP | Phase 08 | Backend Security | 4.0 | Medium | Post-MVP optional: CSV / bulk URL scanner with job queue. |
| **F-15** | Report Export (PDF & STIX JSON) | Post-MVP | Phase 08 | Frontend / Full-Stack | 4.0 | Low | Post-MVP optional: Client-side printable PDF and JSON export. |
| **F-16** | Watchlists & Automated Alerts | Post-MVP | Phase 08 | Full-Stack | 6.0 | High | Post-MVP optional: Domain change tracking and email notifications. |
| **F-17** | Browser Extension | Post-MVP | Phase 08 | Frontend Engineer | 8.0 | High | Post-MVP optional: Manifest v3 popup and content-script scanner. |
| **F-18** | Evaluation Pipeline & Feedback Loops | Post-MVP | Phase 11 | AI Engineer | 6.0 | Medium | Post-MVP optional: User feedback endpoint and prompt drift monitoring. |

---

## 3. Effort Reconciliation & Budget Feasibility

### 3.1 MVP Person-Hour Rollup

| Role | Assigned MVP Phases | MVP Person-Hours (4-Person Team) | MVP Person-Hours (3-Person Team) |
| :--- | :--- | :--- | :--- |
| **Frontend Engineer** | Phase 01 (1h), Phase 02 (6h), Phase 03 (2h), Phase 06 (3h), Phase 09 (1h), Phase 10 (1h) | **14.0 h** | **17.0 h** *(assumes some shared devops)* |
| **Backend Security Engineer** | Phase 01 (1h), Phase 03 (2h), Phase 04 (8h), Phase 06 (3h), Phase 09 (1h), Phase 10 (1h) | **16.0 h** | **19.0 h** *(assumes some shared devops)* |
| **AI Engineer** | Phase 01 (1h), Phase 05 (6h), Phase 06 (1h), Phase 09 (1h), Phase 10 (1h) | **10.0 h** | **12.0 h** |
| **DevOps / Full-Stack** | Phase 01 (1h), Phase 07 (6h), Phase 09 (1h), Phase 10 (2h) | **10.0 h** | Distributed to BE/FE |
| **TOTAL MVP EFFORT** | | **50.0 person-hours** | **48.0 person-hours** |

### 3.2 Elapsed Calendar-Time Alignment
- In a **24-Hour Schedule** with 4 developers: Total capacity = 96 person-hours. MVP requires 50 person-hours (52% utilization), leaving 46 person-hours of buffer for sleep, integration debugging, and potential post-MVP stretches.
- In a **12-Hour Schedule** with 4 developers: Total capacity = 48 person-hours. MVP requires 48–50 person-hours (98% utilization). Under this compressed timeline, all Post-MVP items are hard-dropped, and Phase 07 focuses exclusively on session-scoped history without cases or notes.

### 3.3 Scope Cut-Line Triggers

If development falls behind schedule during MVP execution, the following scope-reduction cuts are pre-approved and logged:

1. **Cut Trigger 1 (At Hour 8 of 12 / Hour 14 of 24):** If database persistence is delayed, drop Supabase PostgreSQL persistence and run scan history purely in browser `localStorage` + backend in-memory LRU cache.
2. **Cut Trigger 2 (At Hour 9 of 12 / Hour 16 of 24):** Drop dashboard aggregate charts (`/api/v1/dashboard/summary`), redirecting default navigation straight to `/scan/url`.
3. **Cut Trigger 3:** All Post-MVP items (Authentication, Cases, EML, External feeds, PDF export) are strictly frozen until Phase 10 deployment of the MVP is verified live.

---

## 4. Document Cross-References

- [Product Requirements Document](file:///c:/Users/HP/OneDrive/Desktop/CipherAI/docs/requirements/PRD.md)
- [Execution Plan](file:///c:/Users/HP/OneDrive/Desktop/CipherAI/docs/requirements/execution-plan.md)
- [Risk Register](file:///c:/Users/HP/OneDrive/Desktop/CipherAI/docs/requirements/risk-register.md)
- [Architecture Document](file:///c:/Users/HP/OneDrive/Desktop/CipherAI/docs/architecture/architecture.md)
