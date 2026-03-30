# Engineering Conventions

This document defines code quality standards, component architecture rules, and practices for this project. When writing or reviewing code, treat these as requirements, not suggestions.

---

## Component Architecture

### The layered abstraction rule

Components exist in a hierarchy. **Raw JSX belongs only at the lowest layer.** As abstraction level increases, components should be composed exclusively from lower-level components — not from raw HTML tags.

```
Layer 0 — Primitives (Button, Input, Badge, Icon, Card, ...)
  → May contain raw JSX
  → Generic, configurable, no domain knowledge

Layer 1 — Domain atoms (TodoCard, PriorityBadge, DueDateLabel, ...)
  → Built from Layer 0 primitives
  → Ideally no raw JSX; if unavoidable, minimal and justified

Layer 2 — Feature components (TodoColumn, AddTaskForm, ...)
  → Built from Layer 1 components
  → No raw JSX — only composition

Layer 3 — Page / layout components
  → Orchestration only; no styling logic
```

**Concrete example of what to avoid** — in `TodoColumn.tsx`:
```tsx
// Bad — raw JSX repeated inline, no reuse
<button onClick={() => onDelete(todo.id)} className="text-gray-300 hover:text-red-400 transition flex-shrink-0 mt-0.5">
  <Trash2 size={14} />
</button>

// Good — use a generic IconButton primitive
<IconButton icon={Trash2} onClick={() => onDelete(todo.id)} variant="danger" />
```

### One component per file

Do not co-locate multiple exported or non-trivial components in a single file. `TodoCard` living inside `TodoColumn.tsx` makes both harder to find, test, and reuse. Each component gets its own file.

Exception: tiny, tightly-coupled sub-components that are never used elsewhere may live in the same file but must be defined above the parent and clearly named (e.g. `function ColumnHeader`).

---

## Generic / Configurable Primitives

Primitives should be **configurable through props**, not duplicated. Instead of writing a new `<button>` every time, use a `Button` component that accepts:

- `variant` — e.g. `primary | ghost | danger | subtle`
- `size` — e.g. `sm | md | lg`
- `icon` — optional leading/trailing icon component
- `href` — renders as an `<a>` or Next.js `<Link>` when provided
- `loading` — shows a spinner and disables interaction
- `onClick` — standard handler

```tsx
// Bad — raw inline button
<button type="submit" className="text-xs bg-rose-500 hover:bg-rose-600 text-white px-3 py-1 rounded-lg transition">
  Save
</button>

// Good — configurable primitive
<Button type="submit" size="sm" variant="primary">Save</Button>
```

The same principle applies to: `Input`, `Select`, `Badge`, `IconButton`, `Card`, `Label`, `DatePicker`, `EmptyState`, etc.

---

## Tailwind & Styling

- **No raw Tailwind class strings in feature/page components.** Style decisions belong in primitives.
- Use `cva` (class-variance-authority) or a similar utility for variant-based styling within primitives — not ternary chains inside `className`.
- Design token values (colors, spacing, radii) must come from the CSS variables defined in `globals.css`, not hardcoded hex or Tailwind color names. See `docs/design-visual-guidelines.md`.

```tsx
// Bad
className={`bg-white border rounded-xl px-3 py-2.5 flex items-start gap-2.5 shadow-sm transition ${completing ? 'completing-card' : ''}`}

// Good — encapsulated in a Card primitive, variant drives the rest
<Card variant={completing ? 'completing' : 'default'}>
```

---

## TypeScript

- All component props must have an explicit interface or type (no inline `{ foo: string }` in function signatures for anything beyond trivial cases).
- Prefer named interfaces over inline types for props — they show up in IDE hints.
- No `any`. Use `unknown` and narrow, or model the type properly.
- Avoid type assertions (`as Foo`) except at system boundaries (e.g. parsing external API responses).

---

## File & Folder Structure

```
src/
  components/
    ui/               ← Layer 0 primitives (Button, Input, Badge, Card, ...)
    [feature]/        ← Layer 1+ domain components grouped by feature
  app/                ← Next.js pages and layouts (Layer 3)
  lib/                ← Utilities, Supabase client, types
```

Primitives live in `components/ui/`. They must have no imports from `lib/` (no Supabase, no domain types).

---

## Mobile-First PWA

This app is built as a **Progressive Web App (PWA)**, designed primarily for mobile use. Treat desktop as an enhancement, not the baseline.

### Layout & interaction

- Design every screen for a 390px viewport first (iPhone 14 baseline), then scale up
- Use `min-h-[44px]` / `min-w-[44px]` touch targets on all interactive elements (already in `globals.css` for `.btn-*`)
- No hover-only affordances — any interactive hint that relies on `:hover` must have a visible equivalent on touch
- Avoid fixed pixel widths; use `w-full`, `max-w-*`, and fluid grids
- Bottom navigation / actions within thumb reach — primary actions should not live at the top of the screen on mobile

### PWA requirements

- `manifest.json` must define: `name`, `short_name`, `start_url`, `display: standalone`, `background_color`, `theme_color` (use `--color-primary: #0077B6`), and icons at 192px + 512px
- Service worker for offline support — at minimum, cache the app shell so it loads without a network connection
- `<meta name="viewport" content="width=device-width, initial-scale=1">` must be present in layout (verify in `app/layout.tsx`)
- Add to home screen prompt should be handled gracefully — don't suppress the browser default

### Performance expectations

- Target Lighthouse PWA score ≥ 90
- First Contentful Paint < 2s on a mid-tier mobile device
- No layout shift during auth/data load — use skeleton states, not spinners that shift content

---

## Component Checklist

Before committing a component, verify:

- [ ] Does it use raw JSX where a primitive already exists or should exist?
- [ ] Are there any co-located components that belong in their own file?
- [ ] Are Tailwind classes leaking into a layer where they don't belong?
- [ ] Are props typed with a named interface?
- [ ] Is the component doing more than one thing? (If yes — split it)
