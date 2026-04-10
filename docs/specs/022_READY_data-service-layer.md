# Feature: Data Service Layer

> **File:** `022_data-service-layer.md`
> **Status:** ready

## What & Why

**Problem:** State management is scattered — components call Supabase directly, optimistic update logic is copy-pasted across components, there is no shared local cache, and manual `router.refresh()` calls are used to force re-syncs. This causes data getting out of sync (a mutation in one component isn't reflected in another), race conditions, and a fragile partner-data update story.

**Goal:** Introduce a service layer per data model (Todo, Quest, User, CalendarEvent) and Zustand stores as the single authoritative local cache. Supabase Realtime subscriptions keep the stores live. Components read from the store and fire mutations — the sync complexity is invisible to them.

**Explicitly NOT covered:**
- Moving API routes to a different hosting model
- Changing the DB schema
- Google Calendar sync (it feeds into CalendarEvent store but its own fetch logic stays in `src/lib/google-calendar.ts`)
- Push notifications or background sync outside of the active browser session

---

## State Management: Zustand + Supabase Realtime

### Decision rationale

| Option | Verdict | Reason |
|--------|---------|--------|
| **Zustand + Realtime** | ✅ Use | Simple, explicit store per model. Realtime pushes changes directly into the store — no extra fetch round-trip. Partner updates land instantly without polling. Right complexity for a 2-user app. |
| TanStack Query + Realtime | ⚠️ Overkill | TQ is designed for poll/invalidate cycles. With Realtime already pushing updates, TQ's stale-while-revalidate and background-refetch machinery is redundant. Two abstractions where one suffices. |
| TanStack Query alone (no Realtime) | ❌ Skip | Pull-based only; partner updates require polling or manual refresh. |
| Redux Toolkit | ❌ Skip | Too heavy for this scope. |

**Rule of thumb for state:**
- **Zustand stores** — server state (todos, quests, user/partner, events). Shared across components, synced to DB.
- **`useState`** — pure UI state (open panels, form fields, filter toggles, loading spinners). Not shared, not persisted.

---

## How It Works

### Layer diagram

```
Supabase DB
  ↑  writes (via service functions, through API routes where server logic needed)
  ↓  pushes (Supabase Realtime → patches store directly, no refetch)

[Service Layer]   src/services/
  Pure async functions. No React, no state. One file per model.

[Zustand Stores]  src/stores/
  In-memory cache + actions. Initialised from SSR props, kept live by Realtime.
  Exposes: data slice, mutation actions, subscription lifecycle.

[Components]      src/components/
  Read from store via selector hook. Call store actions.
  Never import services or Supabase directly.
```

---

### 1. Service layer — `src/services/`

Plain async functions, typed, no side effects. Accept a Supabase client as the first argument so the same functions work in both server (RSC, API routes) and browser contexts.

Subtasks are stored **flat** in the same `todos` table (they are just todos with `parent_id` set). They live in the same store and are accessed via selectors:

```typescript
// Reading subtasks — no separate store, no extra fetch
const subtasks = useTodoStore(s => s.myTodos.filter(t => t.parent_id === parentId))
```

This means the Realtime subscription on the `todos` table covers subtasks automatically.

**Files:**
- `src/services/todo-service.ts` — `fetchTodos`, `fetchSubtasks`, `createTodo`, `updateTodo`, `deleteTodo`, `toggleTodo`, `reorderTodo`
- `src/services/quest-service.ts` — `fetchQuests`, `createQuest`, `updateQuest`, `archiveQuest`, `linkTask`, `unlinkTask`
- `src/services/user-service.ts` — `fetchUser`, `fetchPartner`, `updateUser`
- `src/services/event-service.ts` — `fetchCalendarEvents`, `createEvent`, `updateEvent`, `deleteEvent`

```typescript
// src/services/todo-service.ts
import { SupabaseClient } from '@supabase/supabase-js'
import { Todo } from '@/lib/types'

export async function fetchTodos(
  supabase: SupabaseClient,
  userId: string
): Promise<Todo[]> {
  const { data, error } = await supabase
    .from('todos')
    .select('*, subtasks_count:todos!parent_id(count)')
    .eq('user_id', userId)
    .is('parent_id', null)
    .order('index')
  if (error) throw error
  return data
}

export async function toggleTodo(
  supabase: SupabaseClient,
  id: string,
  completed: boolean
): Promise<Todo> {
  const { data, error } = await supabase
    .from('todos')
    .update({ completed })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}
```

---

### 2. Zustand stores — `src/stores/`

One store per model. Each store owns:
- The local data slice
- Mutation actions (optimistic-first)
- A `subscribe` / `unsubscribe` function that manages the Realtime channel

**Files:**
- `src/stores/todo-store.ts`
- `src/stores/quest-store.ts`
- `src/stores/user-store.ts`
- `src/stores/event-store.ts`

#### Mutation pattern (optimistic-first)

```typescript
// src/stores/todo-store.ts
import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'
import * as todoService from '@/services/todo-service'
import { Todo } from '@/lib/types'

const supabase = createClient()

interface TodoStore {
  myTodos: Todo[]
  partnerTodos: Todo[]
  // Initialise from SSR-fetched data (called once in Dashboard on mount)
  init: (myTodos: Todo[], partnerTodos: Todo[]) => void
  // Mutations
  toggleTodo: (id: string, completed: boolean) => Promise<void>
  addTodo: (todo: Omit<Todo, 'id' | 'created_at'>) => Promise<void>
  updateTodo: (id: string, patch: Partial<Todo>) => Promise<void>
  deleteTodo: (id: string) => Promise<void>
  // Realtime lifecycle
  subscribe: (userId: string, partnerId: string | null) => () => void
}

export const useTodoStore = create<TodoStore>((set, get) => ({
  myTodos: [],
  partnerTodos: [],

  init: (myTodos, partnerTodos) => set({ myTodos, partnerTodos }),

  toggleTodo: async (id, completed) => {
    // 1. Optimistic update
    set(s => ({
      myTodos: s.myTodos.map(t => t.id === id ? { ...t, completed } : t),
    }))
    // 2. Persist — on error, roll back
    try {
      await todoService.toggleTodo(supabase, id, completed)
    } catch {
      set(s => ({
        myTodos: s.myTodos.map(t => t.id === id ? { ...t, completed: !completed } : t),
      }))
    }
    // No re-fetch needed — Realtime will push the confirmed record
  },

  addTodo: async (todo) => {
    const tempId = `temp-${Date.now()}`
    const optimistic = { ...todo, id: tempId, created_at: new Date().toISOString() } as Todo
    set(s => ({ myTodos: [...s.myTodos, optimistic] }))
    try {
      const created = await todoService.createTodo(supabase, todo)
      // Replace temp with real record
      set(s => ({ myTodos: s.myTodos.map(t => t.id === tempId ? created : t) }))
    } catch {
      set(s => ({ myTodos: s.myTodos.filter(t => t.id !== tempId) }))
    }
  },

  updateTodo: async (id, patch) => {
    const prev = get().myTodos.find(t => t.id === id)
    set(s => ({ myTodos: s.myTodos.map(t => t.id === id ? { ...t, ...patch } : t) }))
    try {
      await todoService.updateTodo(supabase, id, patch)
    } catch {
      if (prev) set(s => ({ myTodos: s.myTodos.map(t => t.id === id ? prev : t) }))
    }
  },

  deleteTodo: async (id) => {
    const prev = get().myTodos.find(t => t.id === id)
    set(s => ({ myTodos: s.myTodos.filter(t => t.id !== id) }))
    try {
      await todoService.deleteTodo(supabase, id)
    } catch {
      if (prev) set(s => ({ myTodos: [...s.myTodos, prev] }))
    }
  },

  subscribe: (userId, partnerId) => {
    const channel = supabase
      .channel('todos')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'todos', filter: `user_id=eq.${userId}` },
        ({ eventType, new: record, old }) => {
          set(s => {
            const todos = s.myTodos
            if (eventType === 'INSERT') return { myTodos: [...todos, record as Todo] }
            if (eventType === 'UPDATE') return { myTodos: todos.map(t => t.id === record.id ? record as Todo : t) }
            if (eventType === 'DELETE') return { myTodos: todos.filter(t => t.id !== old.id) }
            return s
          })
        }
      )

    if (partnerId) {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'todos', filter: `user_id=eq.${partnerId}` },
        ({ eventType, new: record, old }) => {
          set(s => {
            const todos = s.partnerTodos
            if (eventType === 'INSERT') return { partnerTodos: [...todos, record as Todo] }
            if (eventType === 'UPDATE') return { partnerTodos: todos.map(t => t.id === record.id ? record as Todo : t) }
            if (eventType === 'DELETE') return { partnerTodos: todos.filter(t => t.id !== old.id) }
            return s
          })
        }
      )
    }

    channel.subscribe()
    // Return cleanup function
    return () => supabase.removeChannel(channel)
  },
}))
```

#### Realtime reconnection and initial fetch

**Supabase Realtime does not replay missed events on reconnect.** When the channel drops (network hiccup, tab sleeping, device lock) and re-establishes, only events from that moment forward are received. Any DB changes during the gap are silently lost.

The fix: move the initial fetch inside the channel's `subscribe` callback and re-run it on every `SUBSCRIBED` status event. This covers both first load and reconnect in one place, removing the need for a separate `init` action:

```typescript
subscribe: (userId, partnerId) => {
  const refetch = async () => {
    const [mine, theirs] = await Promise.all([
      todoService.fetchTodos(supabase, userId),
      partnerId ? todoService.fetchTodos(supabase, partnerId) : Promise.resolve([]),
    ])
    set({ myTodos: mine, partnerTodos: theirs })
  }

  const channel = supabase
    .channel('todos')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'todos',
        filter: `user_id=eq.${userId}` },
      ({ eventType, new: record, old }) => { /* patch myTodos */ }
    )
    .on('postgres_changes', { event: '*', schema: 'public', table: 'todos',
        filter: `user_id=eq.${partnerId}` },
      ({ eventType, new: record, old }) => { /* patch partnerTodos */ }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') refetch()
    })

  return () => supabase.removeChannel(channel)
}
```

SSR-hydrated props from `page.tsx` are still passed into `Dashboard` but only used as the initial render placeholder — the store refetch on `SUBSCRIBED` immediately overwrites them, keeping a single code path for freshness.

#### Subscription lifecycle hook

A single hook wires all stores and is called once from `Dashboard`:

```typescript
// src/hooks/useStoreInit.ts
'use client'
import { useEffect } from 'react'
import { useTodoStore } from '@/stores/todo-store'
import { useQuestStore } from '@/stores/quest-store'
import { User } from '@/lib/types'

export function useStoreInit({ user }: { user: User }) {
  const subscribeTodos = useTodoStore(s => s.subscribe)
  const subscribeQuests = useQuestStore(s => s.subscribe)

  useEffect(() => {
    const unsubTodos = subscribeTodos(user.id, user.partner_id)
    const unsubQuests = subscribeQuests(user.id)
    return () => { unsubTodos(); unsubQuests() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
```

---

### 3. Component usage

Components read from the store via selector and call store actions. No Supabase, no prop drilling for server state.

```tsx
// Before
function TodoList({ todos, onRefresh }) {
  const [localTodos, setLocalTodos] = useState(todos)
  const toggle = async (id) => {
    setLocalTodos(...)
    await supabase.from('todos').update(...)
    onRefresh()
  }
}

// After
function TodoList({ userId }) {
  const todos = useTodoStore(s => s.myTodos.filter(t => t.user_id === userId))
  const toggle = useTodoStore(s => s.toggleTodo)
  // Optimistic + sync is inside the store action
}
```

`Dashboard.tsx` calls `useStoreInit()` and becomes a layout component. It no longer holds `localMyTodos` / `localPartnerTodos` state and no longer passes `onRefresh` callbacks down.

---

### 4. API routes vs. direct service calls

| Use case | Where mutation goes |
|---|---|
| Simple CRUD (todos, quests, events) | Service function → Supabase client directly (RLS handles auth) |
| Server-side logic required (AI, momentum, checkin) | API route → service function server-side |
| Google Calendar fetch | Stays in `src/lib/google-calendar.ts`, feeds into event store on init |

---

## Done When

- [ ] `src/services/` has one typed file per model (`todo`, `quest`, `user`, `event`)
- [ ] `src/stores/` has one Zustand store per model with actions and `subscribe`/`unsubscribe`
- [ ] `src/hooks/useStoreInit.ts` initialises all stores and wires Realtime subscriptions
- [ ] `Dashboard.tsx` calls `useStoreInit` and no longer holds `localMyTodos` / `localPartnerTodos` state
- [ ] `router.refresh()` calls removed from mutation paths (Realtime handles sync)
- [ ] All todo mutations (create, toggle, edit, delete, reorder) go through store actions with optimistic rollback
- [ ] All quest mutations go through store actions
- [ ] Partner todo updates are reflected live without manual refresh
- [ ] Components do not import `@supabase/supabase-js` or call Supabase directly
- [ ] `maintainMomentum` call removed from `page.tsx`; quest nudge logic folded into the `finalize` action in `/api/checkin/route.ts`
- [ ] No regressions in existing functionality (animations, AI nudges, momentum)
- [ ] `npm run build && npm run lint` passes

**Open questions**
- None. All design questions resolved — see decisions below.

**Design decisions**
- **Subtasks flat in todo store.** Subtasks are todos with `parent_id`; no separate store or channel needed. Use `s.myTodos.filter(t => t.parent_id === id)` as the selector.
- **Realtime does not replay missed events.** Re-fetch inside the `subscribe` callback on every `SUBSCRIBED` status fires on both initial load and reconnect. SSR props are a render placeholder only.
- **`maintainMomentum` moves to check-in finalize.** The function currently runs on every `page.tsx` server render. Its two jobs — `process_daily_momentum` (already in `finalize`) and quest nudge generation — will both run inside the `finalize` action of `/api/checkin`. The call is removed from `page.tsx`. This means momentum maintenance is triggered by the user completing their daily check-in, which is the right semantic home for it.

**Implementation notes**
_Filled in during/after implementation._
