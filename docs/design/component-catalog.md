# CIPHER AI — Reusable Component Catalog

| Metadata | Details |
| :--- | :--- |
| **Title** | Reusable Component Catalog |
| **Phase** | PHASE_02: UI/UX Design System, Page Layouts, Navigation, Reusable Components, Responsive Design, and User Flows |
| **Status** | Approved |
| **Version** | 1.0.0 |
| **Date** | 2026-10-22 |
| **Owner Role** | Senior UI/UX Designer & Frontend Architect |

---

## 1. Overview

This document provides technical documentation, prop interfaces, state variants, and accessibility contracts for all reusable components in CIPHER AI. All components adhere strictly to the safe-by-default invariant (plain-text rendering of untrusted content, no `dangerouslySetInnerHTML`), keyboard navigability, and WCAG 2.1 AA compliance.

---

## 2. Layout Components

### 2.1 `Logo`
- **File:** `web/src/components/layout/Logo.tsx`
- **Purpose:** Renders the original inline SVG geometric cipher-shield glyph and brand wordmark.
- **Props:**
  | Prop | Type | Default | Description |
  | :--- | :--- | :--- | :--- |
  | `collapsed` | `boolean` | `false` | When true, renders only the shield glyph without text. |
  | `showTagline` | `boolean` | `false` | Displays the subtitle "Understand threats." under the wordmark. |
  | `className` | `string` | `undefined` | Additional Tailwind styles. |
- **Accessibility:** Screen-reader accessible label: `"CIPHER AI - Return to homepage"`. SVG marked `aria-hidden="true"`.
- **Usage:**
  ```tsx
  <Logo showTagline />
  ```

### 2.2 `ThemeToggle`
- **File:** `web/src/components/layout/ThemeToggle.tsx`
- **Purpose:** Cycles interface appearance between `light`, `dark`, and `system` modes.
- **Props:**
  | Prop | Type | Default | Description |
  | :--- | :--- | :--- | :--- |
  | `showLabels` | `boolean` | `false` | Displays textual mode badge alongside the icon. |
  | `className` | `string` | `undefined` | Additional styles. |
- **Accessibility:** `aria-label="Current theme is [mode]. Click to switch theme mode."`
- **Usage:**
  ```tsx
  <ThemeToggle showLabels />
  ```

### 2.3 `AppShell`
- **File:** `web/src/components/layout/AppShell.tsx`
- **Purpose:** Primary application wrapper orchestrating the skip-to-content anchor, persistent 240px desktop sidebar, mobile topbar, bottom navigation, and `<Outlet />`.
- **Accessibility:** Features an accessible `<a href="#main-content">Skip to main content</a>` element that becomes visible upon receiving keyboard focus.

---

## 3. Risk & Presentation Components

### 3.1 `RiskBadge`
- **File:** `web/src/components/report/RiskBadge.tsx`
- **Purpose:** Communicates threat level through simultaneous combination of semantic color, text label, and unique iconography (color is never the sole conveyor of risk).
- **Props:**
  | Prop | Type | Default | Description |
  | :--- | :--- | :--- | :--- |
  | `level` | `RiskLevel` | *(Required)* | One of: `'low'`, `'medium'`, `'high'`, `'critical'`, `'inconclusive'`. |
  | `size` | `'sm' \| 'default' \| 'lg'` | `'default'` | Size scaling. |
  | `showIcon` | `boolean` | `true` | Renders the paired Lucide risk icon. |
- **Accessibility:** Marked with `role="status"` and `aria-label="Risk Level: [Label]"`.
- **Usage:**
  ```tsx
  <RiskBadge level="critical" size="lg" />
  ```

### 3.2 `RiskGauge`
- **File:** `web/src/components/report/RiskGauge.tsx`
- **Purpose:** Semi-circular instrument gauge rendering the clamped 0–100 risk score and level label.
- **Props:**
  | Prop | Type | Default | Description |
  | :--- | :--- | :--- | :--- |
  | `score` | `number` | *(Required)* | Integer score between 0 and 100. |
  | `level` | `RiskLevel` | *(Required)* | Categorical risk tier. |
  | `size` | `number` | `140` | SVG width and height in CSS pixels. |
- **Accessibility:** Conforms to WAI-ARIA `role="meter"`:
  `aria-valuenow={score}`, `aria-valuemin={0}`, `aria-valuemax={100}`, `aria-label="Risk Score: [N] out of 100 - [Level]"` (or N/A for inconclusive).
- **Usage:**
  ```tsx
  <RiskGauge score={85} level="critical" />
  ```

### 3.3 `ConfidenceMeter`
- **File:** `web/src/components/report/ConfidenceMeter.tsx`
- **Purpose:** Displays the independent confidence rating (`low`, `medium`, `high`) reflecting evidence depth.
- **Accessibility:** Wrapped in `role="group"` with explicit text and visual bar representation.

---

## 4. Report Forensic Components

### 4.1 `DefangedUrl`
- **File:** `web/src/components/common/DefangedUrl.tsx`
- **Purpose:** Renders a neutralized URL (`hxxps://`, `[.]` delimiters).
- **Security Invariant:** **Never renders as an HTML anchor (`<a>`) tag.** Untrusted destinations are displayed strictly as selectable monospace plain text.
- **Props:**
  | Prop | Type | Default | Description |
  | :--- | :--- | :--- | :--- |
  | `url` | `string` | *(Required)* | Raw or defanged URL string. |
  | `truncateThreshold` | `number` | `80` | Character cutoff before offering the "Full / Less" toggle. |
  | `showCopy` | `boolean` | `true` | Embeds the `CopyButton`. |
- **Usage:**
  ```tsx
  <DefangedUrl url="http://192.0.2.14:8080/login" />
  ```

### 4.2 `IndicatorItem` & `IndicatorList`
- **File:** `web/src/components/report/IndicatorItem.tsx`, `IndicatorList.tsx`
- **Purpose:** Collapsible display of specific lexical or heuristic clues.
- **Props:**
  - `indicator`: `Indicator` object strictly adhering to Phase 01 schema.
  - `isHighlighted`: `boolean` (pulsing focus ring when selected from AI citation chip).
- **Accessibility:** Trigger button uses `aria-expanded` and `aria-controls`. `observed_value` is displayed inside a `<div class="select-all font-mono">` block.

### 4.3 `AIExplanationPanel`
- **File:** `web/src/components/report/AIExplanationPanel.tsx`
- **Purpose:** Synthesized plain-language threat narrative. Labeled as `"AI-Generated"` (`AI Threat Summary`) when generated by an LLM, or `"Deterministic Summary"` (`Deterministic Threat Summary`) when produced via fallback heuristics.
- **Interaction:** Indicator chips within key findings trigger smooth scrolling, keyboard focus transfer, and highlighting on the cited indicator element.

### 4.4 `ScoreBreakdownTable`
- **File:** `web/src/components/report/ScoreBreakdownTable.tsx`
- **Purpose:** Full audit table displaying each indicator ID, contribution points, category cap flag, and total score clamped to 0–100.

### 4.5 `EvidenceTimeline`
- **File:** `web/src/components/report/EvidenceTimeline.tsx`
- **Purpose:** Third-party reputation and blocklist records with explicit `checked_at` timestamps. Shows an accessible empty state (*"External Evidence Not Available in this version"*) when empty.

---

## 5. Scan & Input Components

### 5.1 `UrlScanForm` & `MessageScanForm`
- **File:** `web/src/components/scan/UrlScanForm.tsx`, `MessageScanForm.tsx`
- **Purpose:** Accessible form controls with client-side validation, live character counters (up to 5,000 max), channel selectors, and accessible error ties via `aria-describedby` and `aria-invalid`.
- **States:** `idle`, `validating`, `submitting`, `error`.

### 5.2 `ScanInputCard`
- **File:** `web/src/components/scan/ScanInputCard.tsx`
- **Purpose:** Dual-mode tabbed interface allowing instant switching between URL analysis and message scam analysis.

---

## 6. Feedback & Utility Components

### 6.1 `DisclaimerBanner`
- **File:** `web/src/components/common/DisclaimerBanner.tsx`
- **Purpose:** Renders the mandatory limitation sentence: *"No strong indicators were found by CIPHER AI. This does not guarantee that the content is safe."*

### 6.2 `ErrorState`
- **File:** `web/src/components/common/ErrorState.tsx`
- **Purpose:** Maps `ErrorEnvelope` codes (`RATE_LIMITED`, `DEPENDENCY_UNAVAILABLE`, `INVALID_URL`, `NOT_FOUND`, etc.) to friendly recovery guidance and displays the trace `request_id`.

### 6.3 `ConfirmDialog`
- **File:** `web/src/components/common/ConfirmDialog.tsx`
- **Purpose:** Accessible modal dialog with focus trap and escape-key dismissal for irreversible actions (e.g., deleting scan history).
