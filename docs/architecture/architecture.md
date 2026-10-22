# CIPHER AI — System Architecture Specification

| Metadata | Details |
| :--- | :--- |
| **Title** | System Architecture Specification |
| **Phase** | PHASE_01: Requirements, Scope, Architecture, and Technical Specification |
| **Status** | Approved |
| **Version** | 1.0.0 |
| **Date** | 2026-10-22 |
| **Owner Role** | Senior Software Architect & Security Engineer |

---

## 1. System Overview

CIPHER AI is structured as a decoupled monorepo comprising a single-page React frontend application (`web`) and a stateless FastAPI backend service (`api`). The platform is designed around strict separation of concerns:
- **Deterministic Security Engine:** Executes lexical, syntactic, and structural threat analysis offline with zero outbound network calls.
- **AI Threat Intelligence Orchestrator:** Consumes sanitized structured evidence packets, invoking an LLM with strict output schema validation and immediate deterministic fallback.
- **Persistence Layer:** Supabase PostgreSQL with row-level security intent, supporting anonymous session isolation in MVP and seamless migration to Supabase Auth post-MVP.

---

## 2. Architecture Diagrams

### 2.1 System Context Diagram (C4 Level 1)

```mermaid
graph TB
    subgraph "External World"
        User["User / Security Analyst\n(Browser / Mobile)"]
        LLMProvider["External LLM Provider\n(e.g., Anthropic Claude / Gemini)\n(Outbound HTTPS)"]
    end

    subgraph "CIPHER AI Monorepo System"
        WebApp["CIPHER AI Web Application\n(React + Vite SPA)\nClient-side rendering"]
        BackendAPI["CIPHER AI API Service\n(FastAPI / Python)\nStateless REST backend"]
        Database["Persistence Store\n(Supabase PostgreSQL)\nRow-Level Security"]
    end

    User -->|"HTTPS / UI Navigation"| WebApp
    WebApp -->|"REST / JSON API (/api/v1/*)\nCarries X-Session-ID"| BackendAPI
    BackendAPI -->|"Structured Evidence Prompts\n(15s timeout)"| LLMProvider
    BackendAPI -->|"Service Role Persistence\nSession-scoped storage"| Database
```

### 2.2 Container & Component Diagram (C4 Level 2)

```mermaid
graph TB
    subgraph "Frontend Container: web (React + Vite + TS)"
        UI["UI Layer (shadcn/ui + Tailwind)"]
        Router["React Router v6"]
        ScanViews["Scan Views (URL / Message)"]
        ReportViews["Report Views (Gauge, Indicators, Breakdown)"]
        DashboardView["Dashboard & History Views"]
        APIClient["Typed API Client (Fetch wrapper)"]
        Validation["Client Validation (Zod/UX only)"]

        UI --> Router
        Router --> ScanViews
        Router --> ReportViews
        Router --> DashboardView
        ScanViews --> Validation
        ScanViews --> APIClient
        DashboardView --> APIClient
    end

    subgraph "Backend Container: api (FastAPI + Python)"
        APIEntry["FastAPI Main App & Middleware\n(CORS, RequestID, RateLimiter)"]
        APIRouter["API v1 Router (/scans, /health, /dashboard)"]
        PydanticSchemas["Input / Output Schemas\n(Pydantic v2)"]
        
        subgraph "Security Engine (Pure Python / No Network)"
            URLAnalyzer["URL Lexical & Structural Analyzer"]
            MsgAnalyzer["Message Pattern Analyzer"]
            ScoringEngine["Risk Scorer & Category Caps"]
            ReportBuilder["ThreatReport Builder"]
        end

        subgraph "AI Subsystem"
            EvidenceBuilder["Evidence Packet Sanitizer"]
            LLMClient["LLM Provider Client (httpx)"]
            FallbackEngine["Deterministic Fallback Engine"]
        end

        subgraph "Data Access Layer"
            Repo["Scan Repository Layer"]
            SupabaseClient["Supabase / PostgreSQL Client"]
        end
    end

    APIClient -->|"HTTPS REST"| APIEntry
    APIEntry --> APIRouter
    APIRouter --> PydanticSchemas
    APIRouter --> URLAnalyzer
    APIRouter --> MsgAnalyzer
    URLAnalyzer --> ScoringEngine
    MsgAnalyzer --> ScoringEngine
    ScoringEngine --> ReportBuilder
    ReportBuilder --> EvidenceBuilder
    EvidenceBuilder --> LLMClient
    LLMClient -.->|"Timeout / Error"| FallbackEngine
    FallbackEngine --> ReportBuilder
    LLMClient --> ReportBuilder
    ReportBuilder --> Repo
    Repo --> SupabaseClient
    SupabaseClient -->|"PostgreSQL Connection"| Database
```

### 2.3 Scan Data Flow Sequence Diagram

```mermaid
sequenceDiagram
    autonumber
    actor User as User / Browser
    participant Web as Web SPA (React)
    participant API as Backend API (FastAPI)
    participant Engine as Security Engine
    participant AI as AI Service / Fallback
    participant DB as Supabase DB

    User->>Web: Submits URL or message
    Web->>Web: Client-side UX validation (format, length)
    Web->>API: POST /api/v1/scans/{type} (JSON payload + X-Session-ID)
    API->>API: Assign X-Request-ID, apply rate limits, validate Pydantic schema
    API->>Engine: Run lexical & pattern analysis (offline, deterministic)
    Engine->>Engine: Detect indicators, compute category caps, clamp risk score (0-100)
    Engine-->>API: Return indicators, score breakdown, and assessment
    
    alt options.use_ai == true
        API->>AI: Build structured evidence packet (sanitized, delimited)
        AI->>AI: Invoke LLM with strict 15s timeout
        alt LLM Success & Valid JSON Schema
            AI-->>API: Validated AIExplanation object
        else Timeout / Refusal / Schema Failure
            AI->>AI: Generate Deterministic Fallback explanation
            AI-->>API: Fallback AIExplanation (ai_status: fallback_used)
        end
    else options.use_ai == false
        API->>AI: Generate Deterministic Fallback explanation (ai_status: disabled)
        AI-->>API: Fallback AIExplanation
    end

    API->>Engine: Assemble standardized ThreatReport
    
    opt Persistence Enabled
        API->>DB: Persist scan record (hash, truncated preview, report JSONB)
        DB-->>API: Acknowledge persistence
    end

    API-->>Web: HTTP 200 OK (ThreatReport + X-Request-ID)
    Web->>User: Render threat gauge, defanged preview, indicators, and actions
```

### 2.4 Deployment Architecture Diagram

```mermaid
graph LR
    subgraph "Client Layer"
        Browser["Modern Browser\n(Desktop / Mobile)"]
    end

    subgraph "Frontend Hosting (Vercel / Cloudflare Pages / Static)"
        StaticAssets["Vite React SPA Build (dist/)\nHTML, JS, CSS, Assets"]
    end

    subgraph "Backend Compute (Render / Fly.io / Container)"
        FastAPIService["Uvicorn / FastAPI Process\n(Stateless Container)\nPort 8000"]
    end

    subgraph "Managed Cloud Services"
        LLMAPIService["LLM Provider Endpoint\n(Anthropic Claude / Gemini API)\nHTTPS Outbound"]
        SupabasePostgres["Supabase Cloud\nPostgreSQL 15+ Database\nRow-Level Security Enabled"]
    end

    Browser -->|"HTTPS (Static Assets)"| StaticAssets
    Browser -->|"HTTPS API Calls (/api/v1/*)"| FastAPIService
    FastAPIService -->|"Egress HTTPS (Port 443)"| LLMAPIService
    FastAPIService -->|"Egress Connection (Port 5432/6543)"| SupabasePostgres
```

---

## 3. Technology Rationale & Hackathon Constraints

| Component | Selected Technology | Alternative Considered | Rationale Under 12–24h Constraint |
| :--- | :--- | :--- | :--- |
| **Frontend Framework** | React 18 + Vite + TypeScript | Next.js / Nuxt | Vite offers instantaneous HMR, straightforward static deployment without SSR node runtime overhead, and seamless compatibility with pure client-side SPA routing. |
| **Styling & Components** | Tailwind CSS + shadcn/ui | MUI / Chakra UI | shadcn/ui provides pre-styled, accessible Radix-based primitives that live directly in the codebase, enabling rapid customization without heavyweight runtime CSS-in-JS dependencies. |
| **Data Visualization** | Recharts | D3.js / Chart.js | Recharts provides declarative, responsive React SVG charts that integrate natively with Tailwind theme tokens. |
| **Backend API** | Python 3.11+ / FastAPI | Node.js / Express / Go | FastAPI provides native async execution, automatic OpenAPI schema generation, and high-speed data validation via Pydantic v2. Python is also the standard language for security heuristics. |
| **Security Engine** | Pure Python Standard Library + `tldextract` | External microservice / Regex engines | Pure Python rules run completely offline in memory (< 5ms execution), ensuring zero network dependencies, zero cold starts, and zero SSRF risk. |
| **Persistence** | Supabase PostgreSQL | SQLite / MongoDB | Supabase provides immediate managed PostgreSQL with built-in Row-Level Security, ready for frictionless upgrade to user auth post-MVP. |

---

## 4. Module Responsibilities & Directory Mapping

```
cipher-ai/
├── README.md
├── .gitignore
├── docs/                             # Complete project documentation
├── web/                              # Frontend React SPA
│   ├── src/
│   │   ├── components/ui/            # Reusable shadcn/ui primitives
│   │   ├── components/layout/        # AppShell, TopBar, SidebarNav
│   │   ├── components/scan/          # ScanInputCard, DefangedDisplay
│   │   ├── components/report/        # RiskGauge, IndicatorList, ScoreBreakdownTable
│   │   ├── components/charts/        # Recharts visualizations
│   │   ├── lib/api/                  # Typed client for FastAPI endpoints
│   │   ├── lib/validation/           # Client-side UX validation schemas
│   │   └── types/                    # TypeScript interfaces mirroring ThreatReport
├── api/                              # Backend FastAPI Service
│   ├── app/
│   │   ├── core/                     # config.py, errors.py, logging.py, security.py
│   │   ├── api/v1/                   # FastAPI route handlers (health, scans, dashboard)
│   │   ├── schemas/                  # Pydantic v2 schemas for all data models
│   │   ├── engine/                   # Pure deterministic security analyzer modules
│   │   │   ├── url_validation.py     # RFC 3986 lexical validator
│   │   │   ├── url_analyzer.py       # Indicator detection rules for URLs
│   │   │   ├── message_analyzer.py   # Indicator detection rules for messages
│   │   │   ├── scoring.py            # Category caps and clamped score calculator
│   │   │   └── report_builder.py     # Assembles standardized ThreatReport
│   │   ├── ai/                       # LLM orchestration & fallback
│   │   │   ├── client.py             # HTTP client with timeout & retry budget
│   │   │   ├── prompts.py            # System prompts with delimited evidence injection
│   │   │   ├── schemas.py            # Pydantic schema for structured output
│   │   │   └── fallback.py           # Deterministic template fallback generator
│   │   └── repositories/             # Persistence abstraction (Supabase / In-Memory)
└── supabase/                         # Database schema and migrations
```

---

## 5. Planned SSRF-Safe Fetcher Specification

### 5.1 MVP Policy: Zero Fetching
In the MVP, CIPHER AI **does not fetch, resolve, or make any network requests to user-supplied URLs**. All analysis is strictly lexical, syntactic, and structural. This design eliminates Server-Side Request Forgery (SSRF) at the architectural level.

### 5.2 Future Fetcher Specifications (Post-MVP Requirement)
If a future phase (e.g., Phase 08) introduces dynamic website content inspection, it **must** strictly enforce the following multi-layer defense-in-depth controls:

1. **Protocol Scheme Allowlist:** Strictly permit `http://` and `https://` only. Block `file://`, `gopher://`, `ftp://`, `dict://`, `data:`, `javascript:`, and all other schemes.
2. **Pre-Flight DNS Resolution & IP Filtering:**
   - Resolve DNS records prior to opening socket connections.
   - Inspect every resolved IP address against non-routable CIDR blocks:
     - Private IPv4 (RFC 1918): `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`
     - Loopback (RFC 1122): `127.0.0.0/8`
     - Link-Local (RFC 3927): `169.254.0.0/16` (including cloud metadata services like `169.254.169.254`)
     - Broadcast & Multicast: `224.0.0.0/4`, `240.0.0.0/4`, `255.255.255.255/32`
     - IPv6 equivalents: `::1`, `fc00::/7`, `fe80::/10`
3. **DNS Rebinding Prevention:** Pin the validated IP address and connect directly to that IP via custom socket transport, passing the original hostname exclusively in the HTTP `Host` header and TLS SNI.
4. **Manual Redirect Traversal:** Disable automated HTTP client redirect following. Inspect each HTTP 3xx redirect target individually, repeating the full DNS and IP validation routine at every hop (maximum 3 hops).
5. **Resource and Timeout Ceilings:**
   - Connection timeout: 3 seconds.
   - Read timeout: 5 seconds.
   - Maximum response body size: 512 KB (enforced via streaming chunk termination).
   - Content-Type restriction: inspect only `text/html`, `application/xhtml+xml`.
6. **Network Isolation:** Run the fetcher process inside an isolated network sandbox or VPC with egress firewalls blocking all traffic to internal cluster subnets and cloud metadata endpoints.

---

## 6. Locked Architecture Decisions

1. **Deterministic Primary Source of Truth:** The deterministic rules engine owns the risk score. The LLM explains and summarizes findings but cannot raise or lower the score without a recorded, bounded contribution.
2. **Strict Offline Execution for MVP:** The backend performs no outbound network fetching of submitted links.
3. **No Certification of Safety:** No report or UI view may ever present the verdict "safe" or guarantee non-maliciousness. The most favorable verdict is `low` with the label *"Low risk indicators found."*
4. **Standardized Error Enveloping:** All API endpoints must format non-2xx responses using the standard error envelope `{ error: { code, message, details, request_id } }`.
5. **Backend Secret Isolation:** Secret keys (`LLM_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) are backend-only and forbidden in frontend code.
6. **Defanged Presentation:** URLs flagged with indicators are rendered defanged and unclickable by default.

---

## 7. Document Cross-References

- [Product Requirements Document](file:///c:/Users/HP/OneDrive/Desktop/CipherAI/docs/requirements/PRD.md)
- [Risk Scoring Specification](file:///c:/Users/HP/OneDrive/Desktop/CipherAI/docs/architecture/risk-scoring-spec.md)
- [AI Safety Specification](file:///c:/Users/HP/OneDrive/Desktop/CipherAI/docs/architecture/ai-spec.md)
- [Data Model Specification](file:///c:/Users/HP/OneDrive/Desktop/CipherAI/docs/architecture/data-model.md)
- [Threat and Abuse Model](file:///c:/Users/HP/OneDrive/Desktop/CipherAI/docs/security/threat-model.md)
