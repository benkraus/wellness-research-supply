# Wellness Research Supply — Brand Guide

## Brand Overview
Wellness Research Supply is a premium, modern storefront that pairs clinical clarity with an aquatic, research-forward atmosphere. The visual language balances deep navy surfaces with luminous aqua gradients to communicate trust, precision, and calm momentum.

## Brand Voice
- **Confident, precise**: grounded in science and safety.
- **Calm, modern**: minimal, spacious, measured.
- **Guiding, not salesy**: informative, supportive, transparent.
- **Action-forward**: “Discover,” “Explore,” “Compare,” “Verify.”

## Color Palette
Primary palette:
- **Ink (Primary text on bright surfaces):** `#062B45`
- **Aqua (Primary accent / interactive):** `#21CFE0`
- **Teal (Secondary accent):** `#2FE6C5`
- **Mint (Highlight / premium glow):** `#B8F7AE`
- **Dark Surface (Primary background):** `#041B2B`

Supporting neutrals:
- **Primary foreground:** `#F0FDFA`
- **Muted foreground:** `#5FAFB9`

## Gradients
Use gradients to create an aquatic glow over deep navy. Keep edges soft and avoid harsh banding.

**Hero glow (recommended):**
```css
background: radial-gradient(
  120% 120% at 10% 10%,
  rgba(33, 207, 224, 0.25) 0%,
  rgba(47, 230, 197, 0.15) 40%,
  rgba(4, 27, 43, 1) 75%
);
```

**Ambient card wash:**
```css
background: linear-gradient(
  135deg,
  rgba(33, 207, 224, 0.18) 0%,
  rgba(184, 247, 174, 0.12) 100%
);
```

## Typography
Primary typeface: **Montserrat** (sans-serif).

Guidelines:
- **Headings:** semi-bold; tight but not cramped; confident.
- **Body:** regular weight; slightly generous line-height.
- **UI labels:** small + semi-bold for clarity.

CSS:
```css
font-family: "Montserrat", sans-serif;
```

## Design System / Tokens (Implementation)
The storefront uses token-based styling: CSS variables define the palette, and token classes (`bg-ui-*`, `text-ui-*`, `border-ui-*`) consume it.

### Token intent
- **Backgrounds:** `--bg-base`, `--bg-subtle`, `--bg-component`, `--bg-field`
- **Foregrounds:** `--fg-base`, `--fg-muted`, `--fg-interactive`
- **Borders:** `--border-base`, `--border-strong`, `--border-interactive`

Example mapping:
```css
:root,
[data-mode="dark"] {
  --bg-base: #041B2B;
  --bg-subtle: #062132;
  --bg-component: rgba(33, 207, 224, 0.1);

  --fg-base: #F0FDFA;
  --fg-muted: #5FAFB9;
  --fg-interactive: #B8F7AE;

  --border-base: rgba(47, 230, 197, 0.15);
  --border-strong: rgba(47, 230, 197, 0.3);
  --border-interactive: #21CFE0;

  --bg-interactive: #21CFE0;
  --fg-on-color: #062B45;
}
```

## Component Guidelines

### Navigation (Header)
- Background: `--bg-base` with subtle border (`--border-base`).
- Active/hover states: **Aqua** accents; avoid heavy fills.
- Keep whitespace generous; let the palette do the work.

### Buttons
- **Primary:** Aqua fill (`--bg-interactive`) with Ink text (`--fg-on-color`).
- **Secondary:** Transparent with `--border-interactive`; Mint hover highlight.
- **Destructive:** only use existing danger tokens; no alternative reds.

### Cards (Product, Account, Checkout)
- Use `--bg-subtle` / `--bg-component` for surfaces.
- Prefer subtle glow + border over heavy shadows.
- Use Mint sparingly as a highlight (never as body text).

### Forms
- Fields: `--bg-field` + subtle hover.
- Focus: `--border-interactive` and/or a soft Aqua glow.
- Labels: clear, minimal, and stable (avoid jittery animations).

### Side Menu
- Overlay: dark surface tint (`--bg-overlay`) with strong dim.
- Panel: crisp surface (avoid blurring the panel itself).
- Link hover: Mint or Aqua for a premium “pop.”

## Accessibility
- Maintain **4.5:1 contrast** for body text on dark surfaces.
- Don’t rely on color alone for focus/active states—use outline/glow.
- Mint can “vibrate” on dark backgrounds if overused—reserve it for highlights.

## Do / Don’t

### Do: token-driven, consistent
```css
.card {
  background: var(--bg-component);
  border: 1px solid var(--border-base);
  color: var(--fg-base);
}
```

### Don’t: hardcoded light theme
```css
.card {
  background: #fff;
  color: #000;
}
```

### Do: restrained, premium hover
```css
a:hover {
  color: var(--fg-interactive);
}
```

### Don’t: neon overload
```css
a:hover {
  color: #ff00ff;
}
```
