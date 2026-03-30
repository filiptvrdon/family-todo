e# Visual Design Guidelines

This document is the source of truth for the visual identity of Family Todo. All UI decisions should reference and conform to these guidelines.

---

## Spirit & Inspiration

The design is dedicated to someone who finds the world a bit overwhelming — so everything visual should feel **calm, warm, and inviting**, never clinical or demanding.

**Mood board:** Coastal beach at golden hour. Turquoise shallow water, soft aqua waves breaking on warm sand, pale seafoam on the shore. The palette comes directly from a coastal beach color reference — teal and cyan primaries grounded by sandy warm neutrals.

This aesthetic should feel:
- **Calming** — not stimulating or chaotic
- **Warm** — not cold or sterile
- **Joyful** — small moments of delight (a tile pattern here, a wave motif there)
- **Focused** — the content breathes, nothing competes for attention

---

## Color Palette

### Primary Colors

| Role | Name | Hex | Usage |
|------|------|-----|-------|
| Background | Warm Linen | `#FAF7F2` | Page background — warm, low-saturation base |
| Primary | Shallow Water | `#00B5C8` | Buttons, links, active states, key highlights |
| Primary Light | Soft Aqua | `#7DD6D1` | Hover states, soft accents, progress fills |
| Primary Dark | Deep Tidal | `#0099AA` | Pressed states, headings that need weight |

### Text Colors

| Role | Name | Hex | Usage |
|------|------|-----|-------|
| Body Text | Charcoal | `#1A1A2E` | Primary readable text — high contrast on white |
| Secondary Text | Driftwood | `#5C5C7A` | Captions, metadata, helper text |
| Disabled Text | Sea Mist | `#ADB5BD` | Placeholder text, disabled states |

### Accent / Feedback Colors

| Role | Name | Hex | Usage |
|------|------|-----|-------|
| Sand | Warm Sand | `#DEC9A8` | Highlights, tags, streaks, "today" badge |
| Seafoam | Pale Seafoam | `#D6EFE4` | Card backgrounds, subtle section fills |
| Completion | Ocean Teal | `#10BBAA` | Completed task states, success feedback |
| Gentle Alert | Sunset Coral | `#FF9F7F` | Overdue tasks — warm, not alarming |

> **Hard rule:** Never use red for overdue or missed tasks. Sunset Coral communicates urgency without shame.

---

## Typography

### Font Stack

- **UI Font:** Geist Sans (already in the project) — clean, modern, readable
- **Accent / Headings:** Consider adding a humanist serif for section titles (e.g. Lora, Playfair Display) to evoke the Mediterranean character — decide when implementing

### Scale

| Level | Size | Weight | Usage |
|-------|------|--------|-------|
| Page title | 28px / 1.75rem | 700 | Dashboard greeting, page headers |
| Section heading | 20px / 1.25rem | 600 | Column headers, card titles |
| Body | 16px / 1rem | 400 | Task titles, descriptions |
| Small / Meta | 13px / 0.8125rem | 400 | Due dates, tags, partner attribution |
| Micro | 11px / 0.6875rem | 500 | Badges, counters |

### Readability rules

- Minimum body text contrast: **4.5:1** against background (WCAG AA)
- Line height: **1.5** for body text, **1.3** for headings
- Maximum line width: **65ch** — never let text run full-width

---

## Spacing & Layout

- Base unit: **4px**
- Use multiples: 4, 8, 12, 16, 24, 32, 48, 64
- Cards: `16px` internal padding, `8px` gap between cards
- Section spacing: `32px` between major sections
- Touch targets: minimum **44px** tall (ADHD users benefit from larger tap areas)

---

## Shape & Depth

- Border radius: **12px** for cards, **8px** for buttons, **999px` for pills/badges
- Shadows: soft and low — `0 2px 8px rgba(0, 181, 200, 0.08)` (tinted with primary, not grey)
- No harsh borders — use `1px solid #D6EFE4` (Pale Seafoam) for card outlines when needed

---

## Iconography

- Library: **lucide-react** (already in project)
- Style: outline, not filled — feels lighter
- Size: 20px standard, 16px for inline/meta contexts
- Color: matches text context (Charcoal for actions, Azure for interactive)

---

## Motion & Animation

- Keep animations **subtle and purposeful** — ADHD users can be distracted by excess motion
- Task completion: a short satisfying checkmark animation + brief color transition to Tide Green
- Celebration moments (streak, shared win): a gentle confetti burst or pulse — opt-in/dismissable
- Duration guideline: 150ms for micro (hover), 250ms for transitions, 400ms for celebrations
- Respect `prefers-reduced-motion` — all non-essential animations should be skipped

---

## Decorative Elements

Lean into the Portugal/ocean theme through:
- **Tile patterns** — azulejo-inspired geometric accents as section dividers or empty states
- **Wave motifs** — subtle SVG wave as a page separator or card bottom border
- **Warm photography or illustration** — empty states can use a small illustration (VW van, beach scene) instead of a generic "no items" message

These should be **accent**, never background noise.

---

## Tone of Voice (Visual Copy)

Consistent with the ADHD principles doc:
- Warm, first-person encouragement: "You've got this." / "Nice work today."
- Never: "You have 3 overdue tasks." → Instead: "3 things waiting for you when you're ready."
- Partner attribution: light and celebratory — "Filip just finished the dishes!"

---

## What NOT to do

- No red for errors or overdue states
- No dark mode auto-switch (removes predictability — users with ADHD benefit from consistency)
- No long lists without chunking or folding
- No blinking, pulsing, or autoplaying elements (unless opt-in)
- No dense information grids — whitespace is not wasted space

---

## References

- [ADHD/Neurodivergent Design Principles](./design-adhd-principles.md)