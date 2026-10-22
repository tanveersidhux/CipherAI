# CIPHER AI — Glossary and Wording Guide

| Metadata | Details |
| :--- | :--- |
| **Title** | Glossary and Wording Guide |
| **Phase** | PHASE_01: Requirements, Scope, Architecture, and Technical Specification |
| **Status** | Approved |
| **Version** | 1.0.0 |
| **Date** | 2026-10-22 |
| **Owner Role** | Senior Software Architect & Security Engineer |

---

## 1. Purpose

This document establishes standardized terminology, definitions, and language conventions for the CIPHER AI project. It governs user interface copy, machine-generated outputs (including deterministic fallback and LLM explanations), technical documentation, and error envelopes.

Consistent wording is essential to maintain security integrity, manage user expectations, and prevent legal or operational liability arising from false assurances of safety.

---

## 2. Core Terminology

| Term | Technical Definition | User-Facing Explanation |
| :--- | :--- | :--- |
| **Observable Indicator** | A deterministic, verifiable fact extracted directly from raw input using lexical, syntactic, or structural analysis without external network queries or heuristic extrapolation. | An objective fact directly present in the link or message (e.g., an IP address used as a host, or an embedded password request). |
| **Inferred Risk** | Heuristic or pattern-based assessment derived from combining indicators, structural characteristics, or statistical markers. Inferred risk reflects suspicion rather than an established physical fact. | A logical warning or pattern identified by security analysis that suggests deceptive intent. |
| **External Evidence** | Third-party reputation, blocklist, or threat database records retrieved via authoritative lookups, explicitly carrying a provider identity and timestamp. | Independent verification from external security databases and intelligence feeds. |
| **Score Contribution** | A discrete, bounded integer adjustment (positive points, or negative points for explicit mitigating factors) tied to a specific indicator ID and evidence kind. | The point value added to the threat rating by a specific finding. |
| **Category Cap** | An upper ceiling on the maximum cumulative score contribution that can be accumulated within a single indicator category. | A rule preventing a single type of clue from artificially inflating the total score. |
| **Risk Score** | An integer clamped between `0` and `100` representing the aggregate weighted suspicion of the submitted asset. | A numerical score from 0 to 100 measuring potential threat indicators. |
| **Risk Level** | Categorical tier derived deterministically from the risk score: `low` (0–24), `medium` (25–49), `high` (50–74), `critical` (75–100), or `inconclusive`. | The overall risk category assigned to the analyzed link or message. |
| **Confidence** | An independent categorical metric (`low`, `medium`, `high`) reflecting the completeness, depth, and corroboration of available evidence, independent of whether the risk score is high or low. | How confident the system is in its evaluation based on available data. |
| **Inconclusive** | A terminal assessment state applied when input is unparsable, severely truncated, or analyzers fail, preventing meaningful evaluation. It is never coerced to low or safe. | A result indicating that the input could not be analyzed reliably. |
| **Defanged URL** | A sanitized representation of a URL modified to prevent accidental execution, clicking, or protocol handling by user agents (e.g., `hxxps://example[.]com/login`). | A neutralized link displayed in a safe format so it cannot be accidentally clicked. |
| **Threat Report** | The canonical standardized data contract (`ThreatReport`) produced by the backend, containing input metadata, assessment, indicators, score breakdown, external evidence, AI explanation, and recommended actions. | The complete security evaluation report generated for your scan. |
| **Anonymous Session** | A client-scoped, cryptographically signed identifier (UUID) enabling history tracking and scan isolation prior to the introduction of Supabase user authentication. | A private, temporary session allowing you to view your recent scans without signing in. |
| **SSRF (Server-Side Request Forgery)** | An attack vector where a server is coerced into sending unauthorized network requests to internal, loopback, or cloud-metadata endpoints. | A security vulnerability prevented by strictly forbidding outbound URL fetching in the MVP. |

---

## 3. Approved and Forbidden Phrasing

### 3.1 Absolute Invariant: No Guarantee of Safety

Security analysis of lexical inputs cannot prove the absence of malicious intent (zero-day phishing, compromised benign infrastructure, dynamic cloaking). Therefore, CIPHER AI systems **must never** assure, guarantee, or state that any content is safe, harmless, legitimate, or verified.

### 3.2 Forbidden Phrasing Table

The following phrases are strictly forbidden in UI text, LLM prompt templates, LLM responses, system logs, API responses, and marketing copy:

| Forbidden Phrase | Why It Is Forbidden | Mandatory Alternative |
| :--- | :--- | :--- |
| `"This link is safe."` | Creates false security assurance; zero-day or cloaked threats cannot be ruled out. | `"No strong indicators were found by CIPHER AI. This does not guarantee that the content is safe."` |
| `"This message is 100% legitimate."` | Impossible to verify with certainty from lexical patterns alone. | `"No common scam patterns were identified in this message. Exercise normal caution."` |
| `"No threat exists."` | Absolute claims are factually false in threat intelligence. | `"No known threat indicators detected in the submitted input."` |
| `"Verified authentic sender."` | Lexical analysis cannot authenticate sender identity without cryptographic signature validation. | `"Claimed sender identity cannot be verified."` |
| `"Safe to click / Safe to open."` | Direct recommendation to engage with unvetted assets. | `"If you proceed, verify the destination address independently."` |
| `"Guaranteed clean."` | Absolute claim of non-maliciousness. | `"Low risk indicators found based on available heuristics."` |
| `"Threat eliminated."` | CIPHER AI is an intelligence and analysis platform, not an endpoint remediation tool. | `"Recommended mitigation actions provided below."` |

---

## 4. Mandatory Wording Templates

### 4.1 Low Risk Verdict (Mandatory Limitation Text)

Whenever the risk level is determined to be `low` (score 0–24), the UI and ThreatReport `assessment.verdict_label` and `assessment.limitations` **must** include the following verbatim statement:

> **Mandatory Limitation Notice:**  
> *"No strong indicators were found by CIPHER AI. This does not guarantee that the content is safe."*

### 4.2 Inconclusive Verdict Copy

When an analysis produces an `inconclusive` result, the following copy must be presented:

> **Inconclusive Notice:**  
> *"CIPHER AI could not perform a conclusive evaluation because the input was unparsable, insufficient in length, or unsupported. This result does not imply that the content is benign."*

### 4.3 AI Explanation Attribution Label

Any content originating from or formatted by the AI service must be clearly labeled to distinguish generative synthesis from deterministic security evidence:

> **AI Badge Copy:**  
> *"AI Threat Summary (Generated based on structured indicators. Always verify critical findings.)"*

### 4.4 External Evidence Disclaimer

Any displayed external evidence (reputation queries) where the status is `not_flagged` must include the standard note:

> **External Evidence Note:**  
> *"A status of not_flagged indicates this asset is not currently listed in external databases; it does not constitute proof of safety."*

---

## 5. Risk Level Display Standards

Risk level visual representations must always pair color with text and iconography to satisfy accessibility requirements (WCAG 2.1 AA).

| Risk Level | Score Range | Color Token / Family | Approved Icon | Approved Label |
| :--- | :--- | :--- | :--- | :--- |
| **Low** | 0 – 24 | Teal / Green (`#0D9488` / `#16A34A`) | Shield with check (`ShieldCheck`) | `Low risk indicators found` |
| **Medium** | 25 – 49 | Amber (`#D97706`) | Shield with alert (`ShieldAlert`) | `Suspicious patterns detected` |
| **High** | 50 – 74 | Orange (`#EA580C`) | Alert triangle (`AlertTriangle`) | `High risk indicators identified` |
| **Critical** | 75 – 100 | Red (`#DC2626`) | Octagon alert (`AlertOctagon`) | `Critical threat indicators identified` |
| **Inconclusive** | N/A | Slate / Gray (`#64748B`) | Help circle (`HelpCircle`) | `Evaluation inconclusive` |

---

## 6. Document Cross-References

- [Product Requirements Document](file:///docs/requirements/PRD.md)
- [Risk Scoring Specification](file:///docs/architecture/risk-scoring-spec.md)
- [AI Safety & Explanation Specification](file:///docs/architecture/ai-spec.md)
- [Threat Model](file:///docs/security/threat-model.md)
