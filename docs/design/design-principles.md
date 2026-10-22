# CIPHER AI — Design Principles and Visual Identity

| Metadata | Details |
| :--- | :--- |
| **Title** | Design Principles and Visual Identity |
| **Phase** | PHASE_02: UI/UX Design System, Page Layouts, Navigation, Reusable Components, Responsive Design, and User Flows |
| **Status** | Approved |
| **Version** | 1.0.0 |
| **Date** | 2026-10-22 |
| **Owner Role** | Senior UI/UX Designer & Frontend Architect |

---

## 1. Executive Summary

CIPHER AI (*"Understand threats. Protect what matters."*) is an AI-assisted threat intelligence application designed to analyze suspicious URLs and scam messages. In security and threat intelligence tools, poorly considered design creates catastrophic cognitive failure modes: panic-inducing red banners cause alert fatigue, overconfident "safe" badges lull users into compromised situations, and opaque technical jargon alienates the non-specialist users who need protection most.

This document formalizes the design philosophy, visual identity, cognitive ergonomics, and brand elements for CIPHER AI. Every layout, component, interaction, and microcopy string across mobile, tablet, and desktop viewports adheres strictly to these rules.

---

## 2. Core Design Principles

### 2.1 Clarity Over Alarm
Security interfaces too often resort to dramatic siren aesthetics—flashing red lights, aggressive skull icons, and sensational warning dialogues. CIPHER AI prioritizes composure and clarity. Even critical threats are communicated through structured, dignified, and legible data visualizations. Threat assessment is an analytical activity, not an emergency siren; clarity fosters rational, decisive action.

### 2.2 Evidence Before Verdict
We never present a risk score or verdict without immediately exposing the factual indicators that produced it. Users must be able to audit why an asset received a particular score. Every recommendation links directly back to observed indicators (e.g., an IP address host or non-standard port) or inferred heuristics (e.g., credential-lure paths or artificial urgency).

### 2.3 Calm and Trustworthy Tone
Microcopy must be authoritative, objective, and level-headed. We avoid alarmist buzzwords ("DANGER!", "HACKED!", "LETHAL"). Instead, we state facts: *"Direct numerical IP host observed. Path requests authentication credentials over unencrypted HTTP."* Guidance is framed as clear, empowering next steps rather than scolding instructions.

### 2.4 Never Overclaim (Zero-Guarantee Invariant)
Threat intelligence operating on lexical inputs cannot prove the negative. A link with zero recognized threat indicators may still lead to a zero-day exploit, compromised legitimate infrastructure, or an evasive cloaked server. Therefore:
- **Absolute Invariant:** CIPHER AI never claims, implies, or displays that any URL or message is "safe", "clean", "100% legitimate", or "harmless".
- **Approved Framing:** Low-risk assessments always use the wording: *"Low risk indicators found"* paired with the mandatory disclaimer: *"No strong indicators were found by CIPHER AI. This does not guarantee that the content is safe."*

### 2.5 Progressive Disclosure (Summary First, Evidence on Demand)
We design for dual audiences: non-technical users seeking immediate actionable guidance, and security practitioners requiring deep forensic detail.
- **Top Level (Immediate):** The Risk Gauge, Risk Badge, executive AI Threat Summary, and prioritized Recommended Actions are visible above the fold without scrolling.
- **Deep Level (On Demand):** Observable Indicators, Inferred Risk Heuristics, External Evidence, and the mathematical Score Contribution Table are cleanly grouped in expandable, collapsible sections with monospace technical inspection.

### 2.6 Safe by Default (Defanged URLs and Untrusted Content)
All user-submitted content (links, message bodies, parameter strings) is treated as hostile and untrusted:
- URLs are automatically **defanged** (`hxxps://`, `[.]` host delimiters) to eliminate accidental clicks.
- Scanned inputs and indicator values are rendered strictly as inert text, never as executable HTML anchors or unescaped markup.
- No `dangerouslySetInnerHTML` is permitted anywhere in the frontend codebase.

### 2.7 Accessible by Default (WCAG 2.1 AA)
Security tools must be universally accessible. High contrast, keyboard operability, screen reader semantics (`role="meter"`, `aria-live="polite"`), and clear visual focus indicators are not optional post-optimizations; they are core architectural requirements. Color is never used as the sole conveyor of risk.

---

## 3. Visual Identity and Brand Aesthetics

### 3.1 Security-Oriented but Approachable
CIPHER AI merges the precision of enterprise cybersecurity platforms with the welcoming polish of modern consumer productivity software. We avoid the dark-neon "matrix hacker" cliché in favor of a sleek, modern, glass-accented interface utilizing neutral slate surfaces, purposeful cyan/emerald brand accents, and a disciplined semantic palette.

### 3.2 Dual Theme System (Light and Dark)
The interface offers seamless Dark and Light themes with automatic system preference detection and zero flash of unstyled content (FOUC).
- **Dark Theme (Default):** Deep slate surfaces (`#090D16`, `#0F172A`, `#1E293B`) reduce eye fatigue during extended investigative sessions and emphasize risk badges.
- **Light Theme:** Crisp alabaster and cool slate neutrals (`#FFFFFF`, `#F8FAFC`, `#F1F5F9`) designed for bright office environments and high-readability printing.

### 3.3 Semantic Risk Palette
Each of the 5 risk levels possesses a dedicated semantic color family paired with specific iconography and textual tier labels. All color pairs meet or exceed the WCAG 2.1 AA 4.5:1 contrast requirement for normal text and 3:1 for UI boundaries:

| Risk Level | Score Range | Primary Hue | Light Surface / Text | Dark Surface / Text | Associated Lucide Icon | Canonical Label |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Low** | 0 – 24 | Emerald / Teal | `#ECFDF5` / `#065F46` | `#064E3B` (20%) / `#34D399` | `ShieldCheck` | `Low risk indicators found` |
| **Medium** | 25 – 49 | Amber / Gold | `#FFFBEB` / `#92400E` | `#78350F` (25%) / `#FBBF24` | `ShieldAlert` | `Suspicious patterns detected` |
| **High** | 50 – 74 | Orange / Coral | `#FFF7ED` / `#9A3412` | `#7C2D12` (25%) / `#FB923C` | `AlertTriangle` | `High risk indicators identified` |
| **Critical** | 75 – 100 | Crimson / Red | `#FEF2F2` / `#991B1B` | `#7F1D1D` (25%) / `#F87171` | `AlertOctagon` | `Critical threat indicators identified` |
| **Inconclusive** | N/A | Slate / Zinc | `#F1F5F9` / `#334155` | `#1E293B` (50%) / `#94A3B8` | `HelpCircle` | `Inconclusive, not enough information` |

### 3.4 Typography System
We deliberately eliminate external web font downloads (Google Fonts, Adobe Fonts) to preserve network privacy, eliminate CDN tracking, optimize cold start performance, and support offline-capable enterprise deployments.
- **Primary Interface Font:** Modern System Sans Stack (`ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`).
- **Forensic & Data Font:** System Monospace Stack (`ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace`). Used for defanged URLs, hashes, IP addresses, port numbers, indicator IDs, and cryptographic digests.

---

## 4. Logo Treatment & Brand Glyphs

The CIPHER AI logo combines an original SVG geometric glyph—a stylized shield intersected by digital cipher circuitry—with clean, high-legibility modern sans-serif typography.

### 4.1 Inline SVG Wordmark Concept
The glyph consists of an outer protective shield perimeter enclosing a centralized glowing node with bilateral keyway facets, symbolizing cryptographic decryption and protective surveillance.

```svg
<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-primary">
  <!-- Outer Shield Contour -->
  <path d="M16 3L5 7V15C5 21.6 9.7 27.7 16 29C22.3 27.7 27 21.6 27 15V7L16 3Z" 
        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <!-- Cipher Core Node -->
  <circle cx="16" cy="14" r="3" fill="currentColor"/>
  <!-- Analytical Pulse Rays -->
  <path d="M16 17V22M13 14H10M19 14H22" 
        stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
</svg>
```

### 4.2 Wordmark Treatment
- **Primary Text:** `CIPHER` in bold uppercase (tracking-wide, 700 weight).
- **Secondary Text:** `AI` in cyan/emerald brand highlight (tracking-normal, 600 weight).
- **Tagline (Optional context):** *"Understand threats. Protect what matters."* rendered in muted small text (`text-xs text-muted-foreground`).

---

## 5. Architectural Alignment

All subsequent Phase 02 artifacts (`tokens.md`, `wireframes.md`, `user-flows.md`, `component-catalog.md`, and the implemented React components in `web/src/components/`) reference and implement these non-negotiable principles.
