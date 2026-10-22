# ADR-0004: Anonymous Session Isolation Prior to User Authentication

| Metadata | Details |
| :--- | :--- |
| **Title** | ADR-0004: Anonymous Session Isolation Prior to User Authentication |
| **Phase** | PHASE_01: Requirements, Scope, Architecture, and Technical Specification |
| **Status** | Approved |
| **Version** | 1.0.0 |
| **Date** | 2026-10-22 |
| **Owner Role** | Senior Software Architect |

---

## 1. Context

CIPHER AI requires persistent scan history and dashboard metrics for the MVP demo. Introducing full user authentication (sign-up, email verification, login modals, session refresh tokens) early introduces friction for hackathon evaluators and consumes valuable development time. However, allowing an open, unpartitioned database table would expose all users' submitted scans to anyone querying the API.

## 2. Decision

We implement **anonymous session isolation** for the MVP:
1. When a user first opens the web app, the frontend generates or requests a client-scoped anonymous session UUID (`X-Session-ID`), stored in browser local storage.
2. The backend stores scans with `owner_type: 'anonymous_session'` and `owner_id: <session_uuid>`.
3. History listing (`GET /api/v1/scans`) and deletion (`DELETE /api/v1/scans/{id}`) require matching the client's `X-Session-ID`.
4. Supabase PostgreSQL tables have Row-Level Security enabled with no public read access; the backend accesses the database using the service role key and strictly enforces owner isolation in the repository layer.
5. In Phase 07/08, when Supabase Auth is enabled, authenticated users will transition to `owner_type: 'user'` with policies checking `auth.uid() = owner_id`.

## 3. Consequences

### Positive
- Zero sign-up friction for demo evaluators; scanning and history work immediately out-of-the-box.
- Prevents cross-session data leakage and IDOR attacks on scan records.
- Seamless upgrade path to Supabase Auth without changing the core database schema.

### Negative / Tradeoffs
- Anonymous session history is tied to the specific browser's local storage and does not synchronize across devices.
- Requires backend repository filtering rather than direct client-side Supabase queries.

## 4. Alternatives Considered

- **Global Unauthenticated History:** Rejected. Anyone opening the history page would see scans submitted by other users, creating severe privacy and security risks.
- **Mandatory User Auth in MVP:** Rejected. Forcing user registration before allowing a link to be scanned degrades the user experience and adds significant implementation overhead to the MVP.
