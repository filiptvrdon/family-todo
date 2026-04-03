# Engineering Conventions

Treat these as requirements, not suggestions.

---

## Component Architecture

Four layers — **raw JSX belongs only at Layer 0**:

```
Layer 0 — Primitives (Button, Input, Badge, Card, IconButton, ...)
  → May contain raw JSX. Generic, no domain knowledge.

Layer 1 — Domain atoms (TodoCard, PriorityBadge, DueDateLabel, ...)
  → Built from Layer 0. No raw JSX.

Layer 2 — Feature components (TodoColumn, AddTaskForm, ...)
  → Built from Layer 1. No raw JSX.

Layer 3 — Page / layout components
  → Orchestration only. No styling logic.
```

**One component per file.** Exception: tiny tightly-coupled sub-components never used elsewhere may live in the same file, defined above the parent.

---

## Primitives

Primitives are **configurable through props**, not duplicated. Standard props for interactive primitives:
- `variant` — e.g. `primary | ghost | danger | subtle`
- `size` — e.g. `sm | md | lg`
- `icon`, `loading`, `onClick`, `href`

Applies to: `Button`, `Input`, `Select`, `Badge`, `IconButton`, `Card`, `Label`, `DatePicker`, `EmptyState`, etc.

---

## Tailwind & Styling

- **No raw Tailwind class strings in feature/page components.** Style decisions belong in primitives.
- Use `cva` for variant-based styling within primitives — not ternary chains in `className`.
- Design token values (colors, spacing, radii) must come from CSS variables in `globals.css` — not hardcoded hex or Tailwind color names.

---

## TypeScript

- All component props must have an explicit named interface (not inline `{ foo: string }` in the signature).
- No `any`. Use `unknown` and narrow, or model the type properly.
- No type assertions (`as Foo`) except at system boundaries (parsing external API responses).

---

## File & Folder Structure

```
src/
  components/
    ui/           ← Layer 0 primitives (no imports from lib/)
    [feature]/    ← Layer 1+ domain components grouped by feature
  app/            ← Next.js pages and layouts (Layer 3)
  lib/            ← Utilities, Supabase client, types
```

---

## Layout Width System

Three canonical widths defined as CSS variables in `globals.css`:

| Variable | Value | Used for |
|----------|-------|----------|
| `--width-content` | `1024px` | Page content — use `.layout-container` class |
| `--width-panel` | `50%` | Modals, drawers, bottom sheets |
| `--width-form` | `400px` | Auth/settings forms — use `.form-page` + `.form-card` |

- **Never** manually repeat `max-w-5xl mx-auto px-4` — use `.layout-container`.
- **Bottom sheets** use `.detail-panel-popup` — full-width on mobile, `--width-panel` centered on `≥768px`.
- Panels and modals must **never** be full viewport width on desktop.

---

## Mobile-First PWA

Design every screen for **390px viewport first**, then scale up.

- `min-h-[44px]` / `min-w-[44px]` touch targets on all interactive elements
- No hover-only affordances — every `:hover` hint needs a visible touch equivalent
- Bottom navigation / primary actions within thumb reach
- No fixed pixel widths — use `w-full`, `max-w-*`, fluid grids
- `manifest.json`: `display: standalone`, `theme_color: #00B5C8`, icons at 192px + 512px
- Service worker for offline app shell
- Target: Lighthouse PWA ≥ 90, FCP < 2s, no layout shift during load (use skeletons, not spinners)

---

## Local State + Background Sync Pattern

Use whenever a mutation must reflect **immediately** in the UI without waiting for `router.refresh()`.

```tsx
// 1. Mirror server props into local state
const [localTodos, setLocalTodos] = useState<Todo[]>(todos)

// 2. Keep in sync when server re-renders push new props
useEffect(() => { setLocalTodos(todos) }, [todos])

// 3. Client-side fetch — hits Supabase directly, instant update
const refreshLocal = useCallback(async () => {
  const { data } = await supabase.from('todos').select('*')
    .eq('user_id', profile.id).order('created_at', { ascending: false })
  if (data) setLocalTodos(data)
}, [supabase, profile.id])

// 4. On mutation: refresh local instantly, server in background
onDone={() => {
  refreshLocal()    // instant
  router.refresh()  // background — full consistency
}}
```

**When to use:** any operation that writes to DB outside the normal optimistic-update flow (AI check-in creating tasks, bulk imports), or wherever `router.refresh()` alone causes a visible stale-data flash.

Pass local state down to children, not the original props.
