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

## Key References

- Next.js internals: read `node_modules/next/dist/docs/` before writing Next.js code (see AGENTS.md)
- Auth: Supabase auth, see `src/app/auth/` and `src/lib/`
- DB schema: `supabase/migrations/` (managed via Supabase CLI)
- Schema changes: `supabase migration new <name>` → edit the file → `supabase db push`
- Do NOT edit `supabase-schema.sql` — it is kept only as a reference, migrations are the source of truth

## Sub-documents

- [Product Vision](./docs/product-vision.md)
- [ADHD/Neurodivergent Design Principles](./docs/design-adhd-principles.md)
- [Visual Design Guidelines](./docs/design-visual-guidelines.md)
- [Engineering Conventions](./docs/engineering-conventions.md)
