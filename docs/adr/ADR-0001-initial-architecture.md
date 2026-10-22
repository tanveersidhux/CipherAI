# ADR-0001: Initial Architecture Selection

| Metadata | Details |
| :--- | :--- |
| **Title** | ADR-0001: Initial Architecture Selection |
| **Phase** | PHASE_01: Requirements, Scope, Architecture, and Technical Specification |
| **Status** | Approved |
| **Version** | 1.0.0 |
| **Date** | 2026-10-22 |
| **Owner Role** | Senior Software Architect |

---

## 1. Context

CIPHER AI is an AI-assisted threat intelligence application designed for a 12 to 24-hour hackathon by a 3 to 4-person engineering team. We need an architectural foundation that allows rapid independent feature development across UI, security heuristics, AI prompt orchestration, and database persistence, while minimizing deployment complexity and eliminating runtime failure modes.

## 2. Decision

We adopt a **monorepo structure** containing:
1. `web`: A client-side Single-Page Application (SPA) built with React 18, Vite, TypeScript, Tailwind CSS, shadcn/ui, and Recharts.
2. `api`: A stateless Python backend built with FastAPI, Pydantic v2, and Pytest.
3. `supabase`: A managed PostgreSQL database with Row-Level Security (RLS) enabled.

The frontend never calls external LLM APIs, reputation providers, or the Supabase service role key directly; all business logic, validation, scoring, and orchestration pass through the FastAPI backend.

## 3. Consequences

### Positive
- Strict separation of frontend presentation and backend security logic.
- Pure client-side SPA hosting (e.g., Vercel, static CDN) eliminates Node server maintenance.
- FastAPI automatically provides OpenAPI 3.1 documentation and high-performance async I/O.
- Security secrets (`LLM_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) are isolated entirely within the backend environment.

### Negative / Tradeoffs
- Cross-Origin Resource Sharing (CORS) must be configured between frontend and backend origins.
- Requires coordinating models between Python (Pydantic) and TypeScript.

## 4. Alternatives Considered

- **Full-Stack Next.js (Node.js):** Rejected because writing low-level lexical security parsers and IDN homoglyph engines in Python is faster and leverages robust standard libraries (`idna`, `tldextract`, `urllib.parse`).
- **All-in-One Monolith with Server-Side Templates (Django / Jinja):** Rejected because interactive security dashboards (e.g., interactive Recharts, dynamic risk gauges, client-side defanging toggles) require a rich, responsive modern SPA experience.
