# CIPHER AI — Frontend Security Architecture and Threat Mitigations

| Metadata | Details |
| :--- | :--- |
| **Title** | Frontend Security Architecture and Threat Mitigations |
| **Phase** | PHASE_02: UI/UX Design System, Page Layouts, Navigation, Reusable Components, Responsive Design, and User Flows |
| **Status** | Approved |
| **Version** | 1.0.0 |
| **Date** | 2026-10-22 |
| **Owner Role** | Senior Security Engineer & Accessible Frontend Architect |

---

## 1. Threat Model Applied to Frontend

Because CIPHER AI processes adversarial URLs and phishing messages designed specifically to deceive users and exploit client rendering engines, the frontend itself represents an active security boundary. Malicious payloads submitted for inspection may seek to:
1. Exploit Cross-Site Scripting (XSS) via unescaped rendering of submitted parameters, path keywords, or AI summaries.
2. Trick users into clicking hostile destinations via auto-linking user agents or deceptive browser protocols (`javascript:`, `data:`).
3. Conduct visual spoofing via Unicode bidirectional control characters (BiDi overrides) or zero-width character cloaking.
4. Execute layout exhaustion / denial of service attacks via unbroken 10,000-character tokens designed to blow out document rendering.
5. Exfiltrate secrets or probe browser storage.

---

## 2. Implemented Defense Invariants

### 2.1 Pure Plain-Text Rendering (Zero Raw HTML / No `dangerouslySetInnerHTML`)
- **Codebase Invariant:** Zero instances of `dangerouslySetInnerHTML`, `innerHTML`, or raw HTML injection exist in the codebase.
- Scanned text, observed indicator values, AI explanations, and metadata are rendered strictly through standard React string expressions (`{text}`), ensuring automatic contextual HTML entity encoding by React's virtual DOM.
- Automated static checks verify that no unescaped markdown or HTML parser is loaded into the client bundle.

### 2.2 Strict Defanging and Link Neutralization
- **Defanged Representation:** All analyzed URLs are converted to neutralized forms (`http` -> `hxxp`, `https` -> `hxxps`, host dots -> `[.]`).
- **No Anchor Tags:** Suspicious URLs are displayed inside `<span class="font-mono select-all">` elements with a dedicated `CopyButton`. They are **never** rendered as clickable `<a>` elements by default.
- **Future Policy for Optional Clickability:** If a future post-MVP setting allows opening links, it must:
  1. Be disabled by default.
  2. Require an explicit confirmation dialogue warning the user of direct external connection.
  3. Enforce strict `rel="noopener noreferrer"` and `target="_blank"`.
  4. Strictly reject `javascript:`, `data:`, and `vbscript:` URI schemes.

### 2.3 Adversarial Unicode & BiDi Override Neutralization
- The utility `sanitizeAdversarialText` scans for Right-to-Left Override (`\u202E`, `\u202D`, `\u2066`–`\u2069`) and zero-width cloaking characters (`\u200B`, `\u200C`, `\u200D`, `\uFEFF`).
- Characters designed to reverse visual order (e.g., hiding `.exe` extensions behind `.pdf`) are neutralized and replaced with visible indicators (`[BIDI]`, `[ZW]`).

### 2.4 Layout & DOS Protections
- All monospace display blocks use CSS `break-all` and `max-w-full`.
- The `truncateForDisplay` utility safely collapses unbroken URLs longer than 80 characters, providing a "Full / Less" disclosure toggle while ensuring the full text is copied accurately by `CopyButton`.

### 2.5 Storage Isolation & Zero Secrets
- No API keys, database credentials, or secret tokens are bundled into client code.
- `web/.env.example` specifies only `VITE_API_BASE_URL`.
- Browser `localStorage` is restricted strictly to theme preferences (`cipher_theme`) and anonymous session tracking (`cipher_session_id`), wrapped in defensive `try/catch` handlers.

### 2.6 Dev Tooling Exclusion
- Dev-only routes (`/dev/states`) and test harnesses are guarded by `import.meta.env.DEV` and stripped from production Vite output bundles (`dist/`).

### 2.7 Console Logging Discipline
- Unsanitized user inputs and full threat payloads are **never logged to the browser console** (`console.log`) in production code.

---

## 3. Content Security Policy (CSP) Recommendation (For Phase 10)

For production deployment in Phase 10, the following strict CSP header is recommended:

```http
Content-Security-Policy: 
  default-src 'self';
  script-src 'self' 'nonce-{RANDOM_NONCE}';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data:;
  font-src 'self';
  connect-src 'self' https://api.cipher-ai.local;
  frame-ancestors 'none';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
```

### Notes on Inline Scripts:
- The pre-paint theme initializer in `web/index.html` is an inline script that executes synchronously before DOM paint to prevent light/dark flicker.
- In production, this inline script must be served with an authoritative SHA-256 hash or cryptographic nonce (`'nonce-...'`) to eliminate `'unsafe-inline'` script allowances.
