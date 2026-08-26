# RFForge — Design System

*A precision-instrument interface for RF/PA engineering calculations.*

Reference synthesis: Krea AI (card hierarchy, soft depth), Plain (dark structural clarity), Resend (restraint, monospace data), Sentry (bento grid dashboard density). Direction layered on top: Apple-grade typography and motion restraint, glassmorphism as the primary surface language, strict bento-grid layout discipline, built on shadcn/ui primitives.

---

## 1. Design Philosophy

RFForge should feel like an instrument, not an app. Every design decision should answer: *does this make the numbers easier to trust and read?*

**Five governing principles:**
1. **Precision over decoration** — glass, blur, and glow are structural (depth, grouping, hierarchy), never applied for visual flourish alone.
2. **Bento, strictly** — the interface is a grid of self-contained modules. No module bleeds into another. No freeform layout escapes the grid.
3. **Apple-grade typographic restraint** — one type family, a disciplined type scale, generous whitespace, no more than 2 font weights visible on a single screen at once.
4. **Dark-first** — this is an instrument used in focus sessions; dark mode is the default and the primary design target, not an afterthought toggle.
5. **Data is the hero** — chrome (nav, labels, containers) recedes; numbers, curves, and units are the brightest, highest-contrast elements on screen.

---

## 2. Typography

### 2.1 Font Family
Use Apple's system font stack as the primary typeface — it is free, variable-weight, and immediately reads as "considered" the way Apple's own product UIs do.

```
--font-sans: -apple-system, "SF Pro Display", "SF Pro Text", "Inter", system-ui, sans-serif;
--font-mono: "SF Mono", "JetBrains Mono", "IBM Plex Mono", ui-monospace, monospace;
```

- **SF Pro (via -apple-system)** — all UI text: labels, navigation, body copy, headings.
- **Monospace family** — reserved exclusively for **numeric/data values**: calculated results, units, coordinates, table figures, code. This single rule is what makes a technical tool *feel* technical — numbers in monospace, everything else in the humanist sans.

### 2.2 Type Scale (Apple-style: fewer sizes, clear jumps)

| Token | Size | Weight | Use |
|---|---|---|---|
| `--text-display` | 34px | 700 (Bold) | Page-level title only, used once per screen |
| `--text-title` | 22px | 600 (Semibold) | Module/card titles |
| `--text-headline` | 17px | 600 (Semibold) | Sub-section headers within a card |
| `--text-body` | 15px | 400 (Regular) | Default UI text, labels, descriptions |
| `--text-caption` | 13px | 400 (Regular) | Secondary/meta text, helper text |
| `--text-micro` | 11px | 500 (Medium) | Tags, badges, axis labels |
| `--text-data-lg` | 32px | 600 (Semibold), monospace | Primary numeric result (e.g. PAE value) |
| `--text-data-md` | 20px | 500 (Medium), monospace | Secondary numeric values |
| `--text-data-sm` | 13px | 400 (Regular), monospace | Table cells, inline values, units |

### 2.3 Rules
- Line height: 1.4 for body text, 1.15 for display/title text, 1.2 for numeric data.
- Letter-spacing: -0.02em on display/title (Apple's tightened tracking on large text), 0 elsewhere.
- Never use more than 2 weights on one screen simultaneously (e.g. Semibold + Regular). No Light or Black weights — they read as fragile or heavy-handed, not precise.

---

## 3. Color System

Dark-first, with a light-mode mirror for completeness. Values expressed as CSS custom properties intended for a shadcn/ui `globals.css` layer — but documented here, not defined here, per your request to keep the system in markdown.

### 3.1 Base Surfaces (Dark — default)

| Token | Value | Use |
|---|---|---|
| `--background` | `#0A0B0D` | App base, near-black not pure black (pure black kills glass depth) |
| `--surface-1` | `#131417` | Base card surface (non-glass elements) |
| `--surface-2` | `#1B1D21` | Elevated surface (modals, popovers) |
| `--border-subtle` | `rgba(255,255,255,0.08)` | Default card/module border |
| `--border-strong` | `rgba(255,255,255,0.16)` | Focused/active border |

### 3.2 Glass Surface Tokens

| Token | Value | Use |
|---|---|---|
| `--glass-bg` | `rgba(255,255,255,0.04)` | Base glass panel fill |
| `--glass-bg-elevated` | `rgba(255,255,255,0.07)` | Glass panel on hover/active |
| `--glass-border` | `rgba(255,255,255,0.12)` | 1px hairline border on all glass panels |
| `--glass-blur` | `blur(20px)` | Standard backdrop blur |
| `--glass-blur-strong` | `blur(40px)` | Modal/overlay backdrop blur |
| `--glass-shadow` | `0 8px 32px rgba(0,0,0,0.4)` | Depth shadow under glass panels |
| `--glass-inner-highlight` | `inset 0 1px 0 rgba(255,255,255,0.06)` | Top hairline highlight, simulates light catching glass edge |

**Glassmorphism composition (apply together, always):**
```
background: var(--glass-bg);
backdrop-filter: var(--glass-blur);
border: 1px solid var(--glass-border);
box-shadow: var(--glass-shadow), var(--glass-inner-highlight);
border-radius: var(--radius-lg);
```

Glass is used for: bento cards, the top navigation bar, modals, dropdown/select menus, the AI explanation panel. Glass is **not** used for: buttons (should be solid/opaque for tap clarity), form input fields (should be `--surface-1` solid for legibility of typed values), and tables (solid surface for scan-reading dense data).

### 3.3 Accent Colors (semantic, RF-domain-specific)

| Token | Value | Meaning |
|---|---|---|
| `--accent-primary` | `#0A84FF` | Primary interactive accent (Apple system blue) — buttons, active states, links |
| `--accent-rf-match` | `#5E5CE6` | Module A (Matching Network) accent — indigo |
| `--accent-rf-power` | `#30D158` | Module B (PA Performance) accent — green, reads as "healthy signal" |
| `--accent-rf-freq` | `#FF9F0A` | Module C (Frequency Scaling) accent — amber, signals "degradation/warning zone" |
| `--accent-ai` | `#BF5AF2` | Module D (AI layer) accent — purple, visually distinct from calculated data |
| `--accent-danger` | `#FF453A` | Out-of-range values, compression warnings |
| `--accent-success` | `#32D74B` | In-spec / validated results |

Each module owning a consistent accent color is the single strongest wayfinding device in a bento layout — a user should know which module a card belongs to by color alone, without reading the title.

### 3.4 Text Colors

| Token | Value | Use |
|---|---|---|
| `--text-primary` | `rgba(255,255,255,0.92)` | Headings, primary data |
| `--text-secondary` | `rgba(255,255,255,0.60)` | Body copy, descriptions |
| `--text-tertiary` | `rgba(255,255,255,0.38)` | Placeholder, disabled, micro-labels |

### 3.5 Light Mode Mirror
Light mode exists but is secondary. Base `--background: #F5F5F7` (Apple's exact system light gray), `--surface-1: #FFFFFF`, glass tokens shift to `rgba(0,0,0,0.03)` fills with `rgba(0,0,0,0.08)` borders. Accent colors stay identical — Apple's system colors are calibrated to work on both.

---

## 4. Bento Grid System

This is the layout law of the product — every screen is composed from this grid, no exceptions.

### 4.1 Grid Foundation
- 12-column grid, `24px` gutter, `24px` outer margin on desktop.
- Base unit: `8px`. All spacing, padding, and card sizing must be multiples of 8.
- Row height unit: `120px` base row, cards span in multiples of this.

### 4.2 Bento Card Sizing (standardized, do not freeform)

| Card size | Grid span | Use case |
|---|---|---|
| `bento-sm` | 3 cols × 1 row | Single stat (e.g. P1dB value, Q factor) |
| `bento-md` | 4 cols × 2 rows | Chart or grouped inputs |
| `bento-lg` | 6 cols × 2 rows | Primary chart (P_out/Gain/PAE curves) |
| `bento-xl` | 8 cols × 3 rows | Frequency scaling visualizer, hero chart |
| `bento-full` | 12 cols × variable | Data table (Module results log), Smith chart |

### 4.3 Bento Rules
1. Every card has equal corner radius: `--radius-lg: 20px`. No exceptions, no mixed radii on the same screen.
2. Every card has identical internal padding: `24px`, regardless of size.
3. Cards never touch — the `24px` gutter is non-negotiable, it's what makes each card read as a discrete instrument, not a fused panel.
4. Card density decreases as size increases — a `bento-sm` card shows one number; a `bento-xl` card can carry a chart, a legend, and annotations, but never more than 3 distinct data groupings.
5. Module color-coding (§3.3) appears as a **2px top border accent** on each card, or a subtle colored glow in the top-left corner of the glass fill — this is the only place saturated color appears in the entire dark interface. Everything else stays neutral so the accent actually reads as signal.

### 4.4 Example Bento Layout — Module B Screen
```
Row 1: [bento-sm: P_sat] [bento-sm: P1dB] [bento-sm: PAE peak] [bento-sm: Gain]
Row 2-3: [bento-xl: P_out/Gain/PAE combined chart — spans remaining width]
Row 4: [bento-lg: Input parameters panel] [bento-md: AI explanation panel]
```

---

## 5. Glassmorphism Implementation Guide

Glass must be applied with restraint — Apple's own use of translucency (Control Center, macOS menu bar) is the calibration target: subtle, functional, never gaudy.

**Do:**
- Layer glass over a subtly animated or gradient background so the blur has something to actually diffuse (a flat single-color background makes glass pointless).
- Use consistent blur radius across all glass elements on one screen — mixing blur strengths reads as inconsistent, not intentional.
- Reserve the strongest blur (`--glass-blur-strong`) for true overlays (modals) so there's a clear depth hierarchy between "content that's floating above other content" and "content that's just a styled card."

**Don't:**
- Don't stack glass on glass (a glass card inside a glass panel) — contrast collapses and text becomes unreadable.
- Don't apply glass to any element containing dense small text (tables, form fields) — legibility of numbers always wins over aesthetic consistency.
- Don't use colored/tinted glass except for the thin top-border accent in §4.3 — tinted glass at this scale reads as low-budget "glassmorphism trend" rather than Apple-grade restraint.

**Background treatment to support glass:**
A very subtle radial gradient mesh behind the entire app — dark base with faint hints of `--accent-rf-match` and `--accent-rf-power` bleeding in at low opacity (3-5%) from opposite corners. This gives the glass cards something atmospheric to blur, similar to how macOS wallpaper interacts with Control Center panels.

---

## 6. Component Guidance (shadcn/ui mapping)

RFForge is built on shadcn/ui primitives. This section maps each shadcn component to its RFForge-specific treatment — override shadcn defaults using the tokens above, don't introduce new component patterns outside this library.

| shadcn component | RFForge treatment |
|---|---|
| `Card` | Base bento card — apply glass tokens from §3.2, `--radius-lg`, module accent border |
| `Button` | Solid fill (`--accent-primary`), never glass. `--radius-md: 12px`. Height 40px default, 36px for compact/inline actions |
| `Input` | Solid `--surface-1` background (not glass), monospace font for numeric inputs, `--border-subtle` default / `--border-strong` on focus with a soft `--accent-primary` glow ring |
| `Select` / `DropdownMenu` | Glass surface (`--glass-blur-strong`), since these float above content like a modal |
| `Tabs` | Used for module switching (A/B/C/D) — active tab underline in the current module's accent color |
| `Slider` | For frequency sweep ranges — track in `--surface-2`, filled portion in module accent color, monospace value readout above the thumb |
| `Table` | Solid surface, monospace for all numeric columns, `--text-secondary` for headers, zebra-striping at 2% opacity max (subtlety over pattern) |
| `Tooltip` | Glass, small, used for equation reference on hover (e.g. hovering "Q factor" shows the formula) |
| `Badge` | Used for unit labels (GHz, dBm, %) — `--text-micro`, `--surface-2` fill, no glass |
| `Dialog` | Strongest glass blur in the system — this is the one true "floating above everything" surface |
| `Toggle` | Used for the AI explanation layer on/off switch (§Module D) — clear on/off states, `--accent-ai` when active |
| `Skeleton` | Loading state for calculations — should never take longer than ~300ms to resolve, so keep skeletons brief and subtle, not elaborate shimmer animations |

---

## 7. Data Visualization Standards

Charts are the product's centerpiece — treat them with the same rigor as the equations behind them.

- **Chart library:** Recharts, styled to match this system exactly — no default Recharts theming.
- **Line weight:** 2px for primary data series, 1px dashed for reference/threshold lines (e.g. P1dB marker line).
- **Curve color:** matches the owning module's accent color (§3.3). Never use more than 2 series colors on one chart — if more series are needed, vary opacity/weight instead of introducing new hues.
- **Gridlines:** `rgba(255,255,255,0.06)`, horizontal only where possible — vertical gridlines add clutter without adding readability for these curve types.
- **Axis labels:** `--text-micro`, `--text-tertiary` color, monospace for numeric ticks.
- **Annotations (band markers, threshold lines):** label text in `--text-caption`, positioned to never overlap the curve itself.
- **Smith Chart (Module A stretch feature):** render in SVG, not a charting library — circles and reactance arcs in `--border-subtle`, the matching path traced in `--accent-rf-match` at 2px weight with a small glowing dot marker at the final matched point.

---

## 8. Iconography

- Use **Lucide icons** (shadcn's default icon set) exclusively — no mixed icon libraries.
- Stroke width: 1.5px consistently.
- Icon color: `--text-secondary` at rest, `--text-primary` or module accent on active/hover.
- Icon size: 16px inline with text, 20px for standalone action buttons, 24px for module/nav identifiers.

---

## 9. Motion

Apple-style motion: fast, purposeful, never decorative.

| Interaction | Duration | Easing |
|---|---|---|
| Hover state (card, button) | 150ms | `ease-out` |
| Card entrance (on data load) | 300ms | `cubic-bezier(0.16, 1, 0.3, 1)` (Apple's signature "spring-out" ease) |
| Modal/dialog open | 250ms | same spring-out ease, paired with backdrop blur fade-in |
| Chart data transition (input change → new curve) | 400ms | `ease-in-out`, values should visibly interpolate, not snap — this reinforces that it's a live calculation, not a static image swap |
| Tab switch | 200ms | `ease-out`, with a sliding underline indicator |

No bounce, no elastic overshoot, no skeuomorphic flourishes. Motion exists to communicate state change, not to entertain.

---

## 10. Spacing & Radius Tokens (reference)

| Token | Value |
|---|---|
| `--space-1` | 4px |
| `--space-2` | 8px |
| `--space-3` | 12px |
| `--space-4` | 16px |
| `--space-6` | 24px |
| `--space-8` | 32px |
| `--space-12` | 48px |
| `--radius-sm` | 8px |
| `--radius-md` | 12px |
| `--radius-lg` | 20px |
| `--radius-full` | 9999px |

---

## 11. Accessibility Baseline

- Minimum text contrast: `--text-secondary` on `--glass-bg` must be tested at final opacity — glass surfaces are the highest risk for contrast failure. If a glass card's body text fails WCAG AA (4.5:1), raise `--text-secondary` opacity for that context rather than lowering blur.
- All interactive elements retain a visible `--accent-primary` focus ring (2px, offset 2px) regardless of glass/solid surface.
- Numeric data must never be conveyed by color alone (e.g. "red = out of spec") — always pair with an icon or text label, since color-only signaling fails for color-blind users and is exactly the kind of error-prone shortcut a precision tool shouldn't take.

---

## 12. What Success Looks Like

If someone screenshots RFForge and shows it to an RF engineer without context, the two things they should say are: *"this looks like a real tool, not a portfolio project"* and *"I can read every number on this screen at a glance."* Every rule above exists in service of those two reactions — glass and bento are the visual language, but legibility of the underlying engineering data is the actual product.
