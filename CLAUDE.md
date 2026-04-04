# Project Instructions for Claude

Update this file and its linked sub-docs whenever you encounter information that should guide future work.

## Project Overview

A shared task manager for a couple (2 users) — a gentle AI companion, not a todo app. See [docs/product-vision.md](./docs/product-vision.md).

Core constraints (first-class, not afterthoughts):
- **ADHD/neurodivergent-friendly** — see [docs/design-adhd-principles.md](./docs/design-adhd-principles.md)
- **Mobile-first PWA** — see [docs/engineering-conventions.md](./docs/engineering-conventions.md#mobile-first-pwa)

## Working Style

- **Commit after each completed task** — when given a list, commit as soon as each is done before moving on.
- **Verify before committing** — always run `npm run build && npm run lint`. Fix all errors and warnings first.

## Before Building Anything

1. **Check the spec first.** Look in `docs/specs/`. If a matching spec exists with status `ready`, follow it. Update status to `in-progress` when starting, `done` when finished. Fill in Implementation notes as you go.
2. **Audit existing components.** Grep/glob `src/components/` and `src/app/` before writing new code — features are often partially built.
3. **Check the DB schema.** Review `supabase/migrations/` before designing new data structures.

## Feature Specs (`docs/specs/`)

`docs/specs/` contains one `.md` file per feature. Use `docs/specs/000_template.md` to create new ones.

- **Naming:** `NNN_feature-name.md` where `NNN` is the next available zero-padded number (e.g. `010_my-feature.md`). The template is `000`. **Keep files in numeric order — do not reuse or skip numbers.**
- **Status flow:** `draft` → `ready` → `in-progress` → `done`
- `ready` = reviewed, safe to implement without clarification
- If implementation diverges from the spec, update the spec to reflect reality

## Key References

- Auth: Supabase auth — `src/app/auth/` and `src/lib/`
- DB schema: `supabase/migrations/` (source of truth — do NOT edit `supabase-schema.sql`)
- Schema changes: `supabase migration new <name>` → edit → `supabase db push`
- Design tokens / colors / spacing: `src/app/globals.css`
- Component patterns: [docs/engineering-conventions.md](./docs/engineering-conventions.md)
- Product intent: [docs/product-vision.md](./docs/product-vision.md)
- ADHD design rules: [docs/design-adhd-principles.md](./docs/design-adhd-principles.md)
