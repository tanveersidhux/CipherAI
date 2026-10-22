# ADR-0005: Strict Schema Validation and Rejection Policy for AI Outputs

| Metadata | Details |
| :--- | :--- |
| **Title** | ADR-0005: Strict Schema Validation and Rejection Policy for AI Outputs |
| **Phase** | PHASE_01: Requirements, Scope, Architecture, and Technical Specification |
| **Status** | Approved |
| **Version** | 1.0.0 |
| **Date** | 2026-10-22 |
| **Owner Role** | AI Engineer & Security Architect |

---

## 1. Context

Generative AI models are stochastic and prone to schema drift, markdown wrapping, markdown hallucination, or emitting unescaped characters. Furthermore, prompt injection attempts may coerce the model into returning malformed payloads or unvalidated claims. If an application directly renders unvalidated AI responses, it risks frontend crashes, XSS vulnerabilities, or displaying unvetted assertions.

## 2. Decision

All outputs returned by the LLM service **must strictly validate against a Pydantic v2 / JSON Schema (`AIExplanation`)**:
1. The backend requests structured JSON from the model using provider json-mode / tool-calling schemas.
2. The response is parsed and validated against the `AIExplanation` schema.
3. Every cited indicator ID in `key_findings` must exist in the report's detected indicators array. Any non-existent or fabricated indicator ID triggers schema rejection.
4. If validation fails, exactly **one retry** is permitted with a feedback error prompt.
5. If the retry fails, times out (15s ceiling), or throws an API exception, the backend **immediately discards the raw AI output and activates the deterministic fallback engine**.
6. The frontend renders the report with `processing.ai_status = fallback_used` without interrupting user workflow.

## 3. Consequences

### Positive
- Guarantees 100% type safety for frontend consumers.
- Prevents hallucinated or fabricated indicator references from entering user reports.
- Ensures total service resilience: the user always receives a complete threat report even during total AI outage.

### Negative / Tradeoffs
- Discarding slightly malformed AI text results in falling back to templated output, even if parts of the AI text were legible.

## 4. Alternatives Considered

- **Relaxed / Regex Parsing of AI Output:** Rejected. Heuristic parsing is brittle and exposes the frontend to injection and rendering bugs.
- **Surface Raw Error to User on AI Failure:** Rejected. Users must never be blocked from seeing their security assessment because an optional AI explanation failed.
