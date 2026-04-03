# Project Instructions for Claude

## Maintaining This File

You are allowed and **required** to update this file (`CLAUDE.md`) and its linked sub-documents whenever you encounter information that should be added or updated — project conventions, discovered gotchas, architecture decisions, tooling notes, etc. Do not wait to be asked.

## Project Overview

A shared task manager for a couple (2 users). The goal is to help both partners organize and share responsibilities as a team — not just track tasks, but actually make it easier to collaborate and stay aligned day-to-day.

This is **not a todo app** — it is a gentle AI companion that helps two people live with less friction and more joy. Tasks are just the mechanism. See [docs/product-vision.md](./docs/product-vision.md).

Core design constraints — both are first-class requirements, not afterthoughts:
- **ADHD/neurodivergent-friendly** — see [docs/design-adhd-principles.md](./docs/design-adhd-principles.md)
- **Mobile-first PWA** — designed for phone use first; desktop is an enhancement. See [docs/engineering-conventions.md](./docs/engineering-conventions.md#mobile-first-pwa)

## Working Style

- **Commit after each completed task.** When given a list of tasks, create a git commit as soon as each one is done — before moving to the next.
- **Verify build and lint before committing.** Always run `npm run build && npm run lint` before creating a commit. Fix all errors and warnings before proceeding.

## Before Building Anything

1. **Check the roadmap first.** Read [docs/roadmap.md](./docs/roadmap.md) before starting any feature. If the feature is listed there, the description contains the design intent — follow it. Update the status to `[~]` (in progress) when you start.
2. **Audit existing components.** Run a quick grep/glob over `src/components/` and `src/app/` before writing new code. Features are often partially built. Add to what exists; don't duplicate.
3. **Check the DB schema.** Review `supabase/migrations/` for relevant tables and columns before designing new data structures.

## Keeping Docs in Sync

All docs in `docs/` are living documents — keep them accurate as the codebase evolves.

- **Roadmap** (`docs/roadmap.md`): Update feature status when you start (`[~]`) and finish (`[x]`) work. Add a note to the feature entry naming which component(s) implement it.
- **Engineering conventions** (`docs/engineering-conventions.md`): Update when new patterns are established, new primitives are added, or architectural decisions are made.
- **Design guidelines** (`docs/design-visual-guidelines.md`) and **ADHD principles** (`docs/design-adhd-principles.md`): Update if a design decision deviates from or extends what is documented.
- **Product vision** (`docs/product-vision.md`): Update if the product direction changes in a meaningful way.
- **This file** (`CLAUDE.md`): Update whenever you encounter information that should guide future work — gotchas, new conventions, new sub-documents.

## Key References

- Next.js internals: read `node_modules/next/dist/docs/` before writing Next.js code (see AGENTS.md)
- Auth: Supabase auth, see `src/app/auth/` and `src/lib/`
- DB schema: `supabase/migrations/` (managed via Supabase CLI)
- Schema changes: `supabase migration new <name>` → edit the file → `supabase db push`
- Do NOT edit `supabase-schema.sql` — it is kept only as a reference, migrations are the source of truth

## Sub-documents

- [Product Roadmap](./docs/roadmap.md) ← **start here before building any feature**
- [Product Vision](./docs/product-vision.md)
- [ADHD/Neurodivergent Design Principles](./docs/design-adhd-principles.md)
- [Visual Design Guidelines](./docs/design-visual-guidelines.md)
- [Engineering Conventions](./docs/engineering-conventions.md)
