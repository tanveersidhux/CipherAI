# CIPHER AI — Design Tokens and Color Contrast Specification

| Metadata | Details |
| :--- | :--- |
| **Title** | Design Tokens and Color Contrast Specification |
| **Phase** | PHASE_02: UI/UX Design System, Page Layouts, Navigation, Reusable Components, Responsive Design, and User Flows |
| **Status** | Approved |
| **Version** | 1.0.0 |
| **Date** | 2026-10-22 |
| **Owner Role** | Senior UI/UX Designer & Frontend Architect |

---

## 1. Overview and Architecture

Design tokens in CIPHER AI serve as the single source of truth for visual presentation. Tokens are defined as CSS custom properties (`--token`) in `web/src/index.css` and mapped into `tailwind.config.ts`.

Both light and dark themes are fully supported. Theme selection is driven by the `.dark` class applied to `<html>`, with a default derived from the system preference `prefers-color-scheme`.

---

## 2. Token Definitions and Contrast Verification

Contrast ratios are calculated mathematically using the standard WCAG relative luminance formula:
$$L = 0.2126 \cdot R + 0.7152 \cdot G + 0.0722 \cdot B$$
where $R, G, B$ are gamma-expanded from 8-bit sRGB:
$$C_{\text{lin}} = \begin{cases} \frac{C}{12.92} & \text{if } C \le 0.03928 \\ \left(\frac{C + 0.055}{1.055}\right)^{2.4} & \text{otherwise} \end{cases}$$
The contrast ratio between two surfaces with relative luminances $L_1$ and $L_2$ ($L_1 > L_2$) is:
$$\text{Ratio} = \frac{L_1 + 0.05}{L_2 + 0.05} : 1$$

Target compliance:
- **WCAG 2.1 AA Normal Text:** Minimum **4.5:1**
- **WCAG 2.1 AA UI Boundaries and Large Elements:** Minimum **3.0:1**

---

### 2.1 Light Theme Token Table

| CSS Variable | Tailwind Token | Value (Hex / HSL) | Paired Surface | Measured Contrast | Compliance |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `--background` | `bg-background` | `#FFFFFF` | N/A (Canvas) | — | — |
| `--foreground` | `text-foreground` | `#0F172A` | `#FFFFFF` | **17.85:1** | WCAG AAA (Pass) |
| `--card` | `bg-card` | `#FFFFFF` | N/A | — | — |
| `--card-foreground` | `text-card-foreground` | `#0F172A` | `#FFFFFF` | **17.85:1** | WCAG AAA (Pass) |
| `--muted` | `bg-muted` | `#F1F5F9` | `#FFFFFF` | — | — |
| `--muted-foreground`| `text-muted-foreground`| `#475569` | `#FFFFFF` | **7.58:1** | WCAG AAA (Pass) |
| `--primary` | `bg-primary` | `#0F766E` (Teal-700) | `#FFFFFF` (Text) | **5.47:1** | WCAG AA (Pass) |
| `--primary-foreground`| `text-primary-foreground`| `#FFFFFF` | `#0F766E` | **5.47:1** | WCAG AA (Pass) |
| `--secondary` | `bg-secondary` | `#F1F5F9` | `#FFFFFF` | — | — |
| `--secondary-foreground`| `text-secondary-foreground`| `#0F172A` | `#F1F5F9` | **16.12:1** | WCAG AAA (Pass) |
| `--destructive` | `bg-destructive` | `#DC2626` | `#FFFFFF` (Text) | **4.64:1** | WCAG AA (Pass) |
| `--destructive-foreground`| `text-destructive-foreground`| `#FFFFFF` | `#DC2626` | **4.64:1** | WCAG AA (Pass) |
| `--border` | `border-border` | `#64748B` (Boundaries) | `#FFFFFF` | **4.76:1** | UI Boundary (Pass >3:1) |
| `--ring` | `ring-ring` | `#0F766E` | `#FFFFFF` | **5.47:1** | Focus Ring (Pass >3:1) |

---

### 2.2 Dark Theme Token Table

| CSS Variable | Tailwind Token | Value (Hex / HSL) | Paired Surface | Measured Contrast | Compliance |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `--background` | `bg-background` | `#090D16` | N/A (Canvas) | — | — |
| `--foreground` | `text-foreground` | `#F8FAFC` | `#090D16` | **18.57:1** | WCAG AAA (Pass) |
| `--card` | `bg-card` | `#0F172A` | N/A | — | — |
| `--card-foreground` | `text-card-foreground` | `#F8FAFC` | `#0F172A` | **16.14:1** | WCAG AAA (Pass) |
| `--muted` | `bg-muted` | `#1E293B` | `#090D16` | — | — |
| `--muted-foreground`| `text-muted-foreground`| `#94A3B8` | `#090D16` | **7.58:1** | WCAG AAA (Pass) |
| `--primary` | `bg-primary` | `#14B8A6` (Teal-500) | `#090D16` (Text) | **7.81:1** | WCAG AAA (Pass) |
| `--primary-foreground`| `text-primary-foreground`| `#090D16` | `#14B8A6` | **7.81:1** | WCAG AAA (Pass) |
| `--secondary` | `bg-secondary` | `#1E293B` | `#090D16` | — | — |
| `--secondary-foreground`| `text-secondary-foreground`| `#F8FAFC` | `#1E293B` | **12.43:1** | WCAG AAA (Pass) |
| `--destructive` | `bg-destructive` | `#EF4444` | `#090D16` (Text) | **4.82:1** | WCAG AA (Pass) |
| `--destructive-foreground`| `text-destructive-foreground`| `#090D16` | `#EF4444` | **4.82:1** | WCAG AA (Pass) |
| `--border` | `border-border` | `#64748B` | `#090D16` | **3.16:1** | UI Boundary (Pass >3:1) |
| `--ring` | `ring-ring` | `#14B8A6` | `#090D16` | **7.81:1** | Focus Ring (Pass >3:1) |

---

### 2.3 Semantic Risk Tokens (Light and Dark)

All risk level badges and cards pair text with dedicated semantic backgrounds and borders:

| Risk Level | Token Prefix | Theme | Surface (bg) | Text (fg) | Border | Measured Contrast (fg on bg) | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Low** | `risk-low` | Light | `#ECFDF5` | `#065F46` | `#A7F3D0` | **7.29:1** | Pass (AA) |
| **Low** | `risk-low` | Dark | `#064E3B` | `#34D399` | `#047857` | **5.06:1** | Pass (AA) |
| **Medium** | `risk-medium` | Light | `#FFFBEB` | `#92400E` | `#FDE68A` | **6.84:1** | Pass (AA) |
| **Medium** | `risk-medium` | Dark | `#451A03` | `#FBBF24` | `#78350F` | **8.97:1** | Pass (AAA) |
| **High** | `risk-high` | Light | `#FFF7ED` | `#9A3412` | `#FED7AA` | **6.88:1** | Pass (AA) |
| **High** | `risk-high` | Dark | `#431407` | `#FB923C` | `#7C2D12` | **6.92:1** | Pass (AA) |
| **Critical** | `risk-critical` | Light | `#FEF2F2` | `#991B1B` | `#FECACA` | **7.60:1** | Pass (AAA) |
| **Critical** | `risk-critical` | Dark | `#450A0A` | `#F87171` | `#7F1D1D` | **5.84:1** | Pass (AA) |
| **Inconclusive** | `risk-inconclusive`| Light | `#F1F5F9` | `#334155` | `#CBD5E1` | **9.45:1** | Pass (AAA) |
| **Inconclusive** | `risk-inconclusive`| Dark | `#1E293B` | `#94A3B8` | `#334155` | **5.71:1** | Pass (AA) |

---

## 3. Typography Scale and Usage Rules

No remote fonts (e.g. Google Fonts) are loaded. System fonts are utilized for maximum security, zero third-party tracking, and immediate rendering.

- **`font-sans`:** `ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`
  - Used for titles, labels, explanations, button copy, dialogs.
- **`font-mono`:** `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace`
  - Used strictly for defanged URLs, SHA-256 hashes, IP addresses, port numbers, indicator IDs (`URL_IP_HOST`), and raw evidence fragments.

### Type Hierarchy
| Scale Name | CSS Size / Leading | Weight | Usage |
| :--- | :--- | :--- | :--- |
| `text-xs` | 0.75rem (12px) / 1rem | 400, 500 | Metadata, timestamps, table captions, helper subtext |
| `text-sm` | 0.875rem (14px) / 1.25rem | 400, 500 | Body text, indicator descriptions, table rows, button copy |
| `text-base` | 1.00rem (16px) / 1.50rem | 400, 600 | Card body text, input fields, accordion triggers |
| `text-lg` | 1.125rem (18px) / 1.75rem | 600 | Card titles, section headers, score breakdown summary |
| `text-xl` | 1.25rem (20px) / 1.75rem | 600, 700 | Subsection headings, modal titles |
| `text-2xl` | 1.50rem (24px) / 2.00rem | 700 | Page titles (`h1`), risk verdict headline |
| `text-4xl` | 2.25rem (36px) / 2.50rem | 800 | Hero headline, numeric risk score inside gauge |

---

## 4. Spacing, Radius, Shadow, and Motion Tokens

### 4.1 Spacing Scale
CIPHER AI employs a strict 4px grid (`0.25rem` multiplier):
- `p-1` (4px), `p-2` (8px), `p-3` (12px), `p-4` (16px), `p-6` (24px), `p-8` (32px).
- Minimum touch target for interactive elements: **44px × 44px** (`min-h-[44px] min-w-[44px]` on mobile).

### 4.2 Border Radius
- Default radius: `var(--radius, 0.5rem)` (8px).
- Small elements / badges: `rounded-md` (6px) or `rounded-full` (pills).
- Modals and large cards: `rounded-lg` (8px) or `rounded-xl` (12px).

### 4.3 Elevation and Shadows
- `shadow-sm`: `0 1px 2px 0 rgb(0 0 0 / 0.05)` (Subtle card border elevation).
- `shadow-md`: `0 4px 6px -1px rgb(0 0 0 / 0.1)` (Dropdowns, popovers).
- `shadow-lg`: `0 10px 15px -3px rgb(0 0 0 / 0.1)` (Modals, confirm dialogs).

### 4.4 Motion Tokens and Accessibility
All animations and transitions respect `prefers-reduced-motion: reduce`:
```css
@media (prefers-reduced-motion: reduce) {
  *, ::before, ::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```
Default UI transitions use smooth ease: `transition-all duration-200 ease-in-out`.
