# Feature: Refined Dark Mode (Grey Scale)

> **File:** `029_dark-mode-refinement.md`
> **Status:** done

## What & Why

The current dark mode implementation uses a "Deep Ocean" (deep blue) palette (`#0D1B2A`). While thematic, it can feel overly "saturated" for some users and lacks the neutral, professional aesthetic that many prefer for dark interfaces.

**Goal:**
- Transition the dark mode color scheme from deep blue to a neutral, sophisticated dark grey (Zinc-based) palette. This improves visual comfort, reduces color fatigue, and provides a cleaner canvas for the brand's primary teal/cyan accent.

**Explicitly out of scope:**
- Changing the light mode palette.
- Adding multiple dark mode themes (e.g., "Midnight" vs "Dim").
- Enabling auto-switching based on system preferences (maintaining ADHD-friendly visual predictability).

---

## Design Decisions

### 1. New Palette Selection (Zinc/Neutral)
We will move away from blue-tinted backgrounds to a neutral grey scale. The "Zinc" scale is chosen for its modern, balanced feel that isn't too "warm" or too "cold."

| Token | Current (Deep Blue) | Proposed (Dark Grey) | Rationale |
|-------|----------------------|----------------------|-----------|
| `--background` | `#0D1B2A` | `#09090b` (Zinc-950) | Deepest neutral background. |
| `--card` / `--popover` | `#162335` | `#18181b` (Zinc-900) | Subtle elevation for containers. |
| `--foreground` | `#E8EDF5` | `#fafafa` (Zinc-50) | Clean, high-contrast text. |
| `--muted` / `--secondary` | `#1A3040` | `#27272a` (Zinc-800) | Secondary surfaces and disabled states. |
| `--muted-foreground` | `#8A9BB0` | `#a1a1aa` (Zinc-400) | De-emphasized text and icons. |
| `--border` / `--input` | `#2A3F52` | `#27272a` (Zinc-800) | Subtle, non-distracting borders. |
| `--accent` | `#1E3D52` | `#27272a` (Zinc-800) | Hover states and highlights. |

### 2. Primary Color Adaptation
The brand's primary color (`--color-primary`) is a bright Teal/Cyan (`#00B5C8`).
- In dark mode, we will keep the slightly brightened version (`#00C8DC`) to ensure it "glows" effectively against the neutral grey background without being overstimulating.
- All "completion" and "momentum" colors will remain teal/green based, as they provide the positive reinforcement core to the product's mission.

### 3. ADHD-Friendly Constraints
- **Low Stimulation:** Neutral grey reduces the overall "chroma" of the interface, helping the user focus on task content.
- **Visual Predictability:** Dark mode remains a manual toggle only. This prevents unexpected UI shifts that can be jarring or distracting.
- **Warm Alerts:** The "Sunset Coral" (`#FF9F7F`) for alerts and destructive actions is preserved, as it avoids the "alarmist" nature of pure red.

---

## Technical Changes (Spec)

### CSS Variable Overrides
The `.dark` class in `src/app/globals.css` will be updated with the new Zinc-based tokens. We will also update custom design tokens that were previously blue-tinted:

| Variable | Current | Proposed |
|----------|---------|----------|
| `--color-foam` | `#1A3040` (Deep Navy) | `#27272a` (Zinc-800) |
| `--shadow-card` | `0 2px 8px rgba(0, 0, 0, 0.3)` | `0 2px 8px rgba(0, 0, 0, 0.5)` |
| `--shadow-elevated` | `0 4px 16px rgba(0, 0, 0, 0.4)` | `0 4px 16px rgba(0, 0, 0, 0.6)` |
| `--overlay-bg` | `rgba(0, 0, 0, 0.6)` | `rgba(0, 0, 0, 0.7)` |

### Component Audit
While most components use the semantic tokens (e.g., `bg-card`, `border-border`), a few areas need specific attention:
1. **Shadows:** Ensure shadows don't have blue tints.
2. **Scrollbars:** Verify that scrollbar colors (if customized) are neutral.
3. **Difficulty Indicators:** Ensure the "Involved" (Violet) and "Moderate" (Coral) colors still harmonize with the new grey background.

---

## Done When
- [x] Dark mode uses neutral grey shades (Zinc) instead of deep blue.
- [x] Contrast ratios meet WCAG AA standards (4.5:1 for normal text).
- [x] Brand primary (Teal) is clearly legible and aesthetically pleasing on the new background.
- [x] All blue-tinted variables (`--background`, `--card`, `--border`, `--color-foam`) are migrated to neutral grey equivalents.
- [x] Scrollbars are customized to match the new palette (subtle grey thumbs, transparent tracks).
- [x] Manual toggle still works as expected and state persists correctly.
- [x] Theme initialization is robust (FOUC prevention via `theme-init.js`).
- [x] Hydration mismatches are resolved (Syncing state in `useTheme` on mount).
- [x] Theme selection is synchronized across the entire application (including Login page).
