# CIPHER AI — Accessibility (WCAG 2.1 AA) Specification & Audit

| Metadata | Details |
| :--- | :--- |
| **Title** | Accessibility (WCAG 2.1 AA) Specification and Audit |
| **Phase** | PHASE_02: UI/UX Design System, Page Layouts, Navigation, Reusable Components, Responsive Design, and User Flows |
| **Status** | Approved |
| **Version** | 1.0.0 |
| **Date** | 2026-10-22 |
| **Owner Role** | Senior UI/UX Designer & Accessible Frontend Engineer |

---

## 1. Executive Summary

In cybersecurity and threat detection systems, accessibility is a mission-critical safety requirement. Users assessing high-risk links or urgent extortion messages may be under extreme time pressure or utilizing assistive screen readers, keyboard navigation, or high-contrast display settings. An inaccessible security alert can lead directly to credential compromise or financial loss.

CIPHER AI is built to conform strictly with **WCAG 2.1 Level AA** criteria.

---

## 2. WCAG 2.1 AA Compliance Checklist

### 2.1 Perceivable
- **1.1.1 Non-text Content (Level A):** All functional icons (Lucide icons) carry accessible textual equivalents or are marked `aria-hidden="true"` when paired with adjacent descriptive text. The logo SVG incorporates explicit `aria-label="CIPHER AI - Return to homepage"`.
- **1.3.1 Info and Relationships (Level A):**
  - Proper semantic HTML landmarks (`<header>`, `<nav>`, `<aside>`, `<main id="main-content">`, `<footer>`, `<article>`).
  - Strict heading hierarchy on every page: a single `<h1>` followed by logical `<h2>` and `<h3>` tags.
  - Form controls tied directly to error messages and helper guidance via `aria-describedby` and `aria-invalid`.
  - RiskGauge conforms to `role="meter"` with `aria-valuenow`, `aria-valuemin="0"`, `aria-valuemax="100"`.
- **1.3.2 Meaningful Sequence (Level A):** Logical DOM order matches visual layout. Skip-to-content anchor is the first DOM element.
- **1.4.1 Use of Color (Level A):** **Color is never the sole conveyor of risk.** Every risk level badge and metric pairs its semantic color with a dedicated icon (`ShieldCheck`, `ShieldAlert`, `AlertTriangle`, `AlertOctagon`, `HelpCircle`) and canonical text string.
- **1.4.3 Contrast (Minimum) (Level AA):** All normal text-to-background pairs exceed 4.5:1. UI component boundaries and focus rings exceed 3.0:1 (verified mathematically in `docs/design/tokens.md`).
- **1.4.4 Resize Text (Level AA):** The entire application scales smoothly up to 200% zoom without clipping or loss of functionality.
- **1.4.10 Reflow (Level AA):** Responsive layouts reflow cleanly at 320px viewport width with zero horizontal document scroll.
- **1.4.11 Non-text Contrast (Level AA):** Interactive borders, toggles, and form inputs meet the 3:1 contrast boundary requirement.

### 2.2 Operable
- **2.1.1 Keyboard (Level A):** Every interactive control (navigation links, tab switchers, inputs, textareas, copy buttons, collapsibles, confirm dialogs, print triggers) is 100% operable via keyboard (`Tab`, `Shift+Tab`, `Enter`, `Space`, `Escape`).
- **2.1.2 No Keyboard Trap (Level A):** Modals (`ConfirmDialog`) trap focus while active and reliably restore focus to the triggering element upon dismissal.
- **2.2.2 Pause, Stop, Hide (Level A):** Animations and pulse effects respect `prefers-reduced-motion: reduce`.
- **2.4.1 Bypass Blocks (Level A):** A visible `<a href="#main-content">Skip to main content</a>` anchor is provided on every page.
- **2.4.4 Link Purpose (In Context) (Level A):** Every button and link includes descriptive label copy.
- **2.4.7 Focus Visible (Level AA):** High-contrast focus indicators (`focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2`) are active on all interactable elements.
- **2.5.5 Target Size (Level AAA / Best Practice):** Mobile touch targets meet the minimum **44px × 44px** standard.

### 2.3 Understandable
- **3.1.1 Language of Page (Level A):** Entry document specifies `<html lang="en">`.
- **3.2.1 On Focus (Level A):** Moving focus to inputs or links never automatically triggers a navigation or form submission.
- **3.3.1 Error Identification (Level A):** Client validation errors are identified in text and announced via `role="alert"`.
- **3.3.2 Labels or Instructions (Level A):** Inputs provide explicit labels and reserved domain examples (`https://login.example.test`).

### 2.4 Robust
- **4.1.2 Name, Role, Value (Level A):** Custom widgets (gauges, collapsibles, tabs, dialogs) utilize Radix UI primitives with certified WAI-ARIA roles.
- **4.1.3 Status Messages (Level AA):** Loading indicators use `aria-live="polite"` to announce processing states without interrupting ongoing speech.

---

## 3. Keyboard Walkthrough and Per-Page Audit Results

A comprehensive manual keyboard walkthrough was conducted across all MVP routes using keyboard only (`Tab`, `Shift+Tab`, `Enter`, `Space`, `Arrow Keys`, `Escape`):

| Page Route | Page Name | Primary Keyboard Interactions Tested | Focus Restoration Verified | Result |
| :--- | :--- | :--- | :--- | :--- |
| `/` | Landing & Quick Scan | Skip link -> Logo -> Sidebar nav -> Mode tabs -> URL input -> Submit -> Trust cards | Yes | **PASS** |
| `/scan/url` | Dedicated URL Scan | Input focus -> Error trigger via invalid protocol -> AI toggle -> Submit | Yes | **PASS** |
| `/scan/message` | Dedicated Message Scan | Textarea -> Channel select dropdown -> Counter inspection -> Submit | Yes | **PASS** |
| `/reports/:reportId` | Threat Report | Back link -> Print button -> Copy buttons -> Indicator chip navigation -> Accordion collapse/expand | Yes (Focus moves to indicator trigger upon chip click) | **PASS** |
| `/history` | Scan History | Search input -> Risk filter -> Type filter -> Table sort triggers -> View report -> Delete dialog trap | Yes (Focus restored to row upon modal close) | **PASS** |
| `/dashboard` | Dashboard Metrics | StatCards -> Chart data table toggle -> Table navigation | Yes | **PASS** |
| `/settings` | Settings & Privacy | Theme mode buttons -> Copy session ID -> Reset storage dialog | Yes | **PASS** |
| `/cases` | Cases Placeholder | Return to scanner button | Yes | **PASS** |
| `*` | 404 Not Found | Return home button -> History link | Yes | **PASS** |

**Walkthrough Outcome:** 100% Pass across all 9 routes.
