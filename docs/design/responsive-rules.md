# CIPHER AI — Responsive Design Rules and Breakpoint Specification

| Metadata | Details |
| :--- | :--- |
| **Title** | Responsive Design Rules and Breakpoint Specification |
| **Phase** | PHASE_02: UI/UX Design System, Page Layouts, Navigation, Reusable Components, Responsive Design, and User Flows |
| **Status** | Approved |
| **Version** | 1.0.0 |
| **Date** | 2026-10-22 |
| **Owner Role** | Senior UI/UX Designer & Frontend Architect |

---

## 1. Overview and Core Invariants

CIPHER AI provides a unified, fluid experience across the full spectrum of modern hardware: from compact mobile smartphones at 360px viewport width up to ultra-wide desktop monitors (1280px+).

### Absolute Responsive Invariants
1. **Zero Horizontal Page Scroll:** No page, component, code block, or URL string shall introduce horizontal scrollbars to the root document (`overflow-x: hidden` on viewport boundaries, `break-all` and `truncate` on untrusted strings).
2. **Touch Target Size:** Interactive targets (buttons, links, inputs, collapsibles) must maintain a minimum touch bounding box of **44px × 44px** on mobile viewports.
3. **Table-to-Card Transformation:** High-density data tables (`ScanHistoryTable`) transform automatically into accessible vertical cards on viewports narrower than 768px.
4. **Accessible Alternative Views:** Rich data visualizations (Recharts donut and trend charts) automatically present a toggleable tabular data alternative and an always-visible textual summary.

---

## 2. Canonical Breakpoints and Layout Matrix

CIPHER AI defines three core architectural viewport tiers matching Tailwind CSS breakpoints:

| Viewport Tier | Width (CSS Pixels) | Navigation Scheme | Content Area Width | Grid Behavior | Component Adaptations |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Mobile** | `360px – 767px` | Fixed bottom bar (`MobileNav`, 64px) + Top header (`TopBar`, 56px) | 100% full-bleed with `px-4` padding | 1-column stacked | Tables transform to cards; risk gauge stacks above summary text; charts display text summary. |
| **Tablet** | `768px – 1023px` | Sticky top header with brand and settings; compact navigation | Fluid container with `px-6` padding | 1-to-2 column adaptive | 2-column stat grids; full desktop table layout activates; charts display side-by-side. |
| **Desktop** | `≥ 1024px – 1280px+` | Persistent left sidebar (`SidebarNav`, 240px fixed width) | Centered max `1100px` content container (`pl-60`) | 2-to-3 column asymmetric | Multi-column layouts; sticky sidebar navigation; expanded indicator inspection grids. |

---

## 3. Component-Specific Responsive Rules

### 3.1 ScanHistoryTable Transformation
- **Desktop (≥ 768px):** Rendered as a full multi-column HTML table with columns: `Date & Time`, `Type`, `Target / Fragment`, `Risk Level & Score`, `Actions`.
- **Mobile (< 768px):** Transformed via Tailwind utilities (`hidden md:block` vs `md:hidden`) into a vertical list of stacked cards (`role="feed"`). Each card features:
  - Top row: scan type badge and formatted date.
  - Middle: defanged target text inside a monospace block with `break-all`.
  - Bottom row: `RiskBadge`, numeric score pill, and action buttons (Report, Delete).

### 3.2 Risk Visualizations (Charts)
- Recharts instances are enclosed inside `<ResponsiveContainer width="100%" height="100%">` wrappers.
- On screens narrower than 480px, chart legends and secondary labels are collapsed or hidden to prevent SVG clipping.
- Every chart component incorporates an accessible textual summary above the canvas, ensuring assistive technology users and mobile users can consume the metrics without needing SVG interaction.
- A "Show Data Table" button allows instant toggling between graphical and structured tabular representations.

### 3.3 Defanged URLs & Long Content
- Long unbroken strings (e.g. URLs with extensive query parameters or SHA-256 digests) utilize `break-all` and `font-mono`.
- For inline displays, the `truncateForDisplay` utility collapses strings exceeding 80 characters into a truncated `[start]...[end]` format with an interactive "Full / Less" disclosure trigger.

---

## 4. Zoom and Reflow Compliance (WCAG 1.4.4 & 1.4.10)

- **200% Zoom:** The layout gracefully shifts into the tablet and mobile column hierarchy without content clipping, overlap, or loss of functionality.
- **320px Reflow:** At 320px width (simulated 400% zoom on 1280px screen), the interface displays single-column cards with responsive font scaling (`text-xs` / `text-sm`) and zero horizontal clipping.
