---
name: coding-standards-ui-guidelines
description: Coding conventions and UI implementation guidelines for the NorthSouth gym CRM. Invoke before writing any new component, API route, or utility function to ensure consistency with existing patterns.
---

## TypeScript

- Strict mode is on — no `any`, no `!` non-null assertions unless unavoidable
- Prefer `type` over `interface` for object shapes (unless extending)
- API response types live in `types/` or co-located with the route
- Zod for runtime validation at API boundaries; TypeScript types for internal code

---

## Next.js App Router conventions

### Server Components (default)
- `page.tsx` and `layout.tsx` are Server Components unless marked `"use client"`
- Fetch data with Prisma directly inside Server Components — no API call needed
- Pass data as props to Client Components

### Client Components (`"use client"`)
- Named `*-client.tsx` when they correspond to a page
- Receive initial data as props from the server page
- Call API routes (`fetch("/api/...")`) for mutations and refreshes
- **Hook ordering rule:** all `useState` declarations must come before any `useEffect` that references them

### API Route Handlers
- File: `app/api/[resource]/route.ts`
- Always check auth first: `const session = await getAuthSession(); if (!session) return 403`
- Return `NextResponse.json(data)` for success
- Return `NextResponse.json({ error: "message" }, { status: 4xx })` for errors
- No default exports — export named `GET`, `POST`, `PUT`, `PATCH`, `DELETE`

---

## React patterns

### State management
- Local `useState` for UI state (open/close, selected item, loading)
- No global state library — pass props or use context for shared state
- Avoid `useReducer` unless state transitions are complex

### Effects
```ts
// CORRECT — useState before useEffect
const [weekStart, setWeekStart] = useState(...);
const [viewMode, setViewMode] = useState("week");

useEffect(() => {
  // can reference weekStart and viewMode safely
}, [weekStart, viewMode]);

// WRONG — useEffect before useState (temporal dead zone crash)
useEffect(() => { /* references weekStart */ }, [weekStart]); // ReferenceError!
const [weekStart, setWeekStart] = useState(...); // declared too late
```

### Data refresh after mutation
```ts
// After any booking mutation:
await fetch("/api/bookings", { method: "POST", body: ... });
await refreshCardCounts(); // re-fetch /api/bookings/counts?weekStart=
// Do NOT do a full router.refresh() — update local state directly
```

---

## Styling

- **Tailwind CSS only** — no inline styles, no CSS modules, no styled-components
- Use `cn()` from `lib/utils.ts` for conditional class merging
- Follow existing color scheme: dark backgrounds (`bg-slate-900`, `bg-zinc-800`), white text
- Sport type color chips: each `ClassSession` has a color stored in DB; use it for badge backgrounds
- Spacing: use Tailwind scale (`p-4`, `gap-2`, `mt-6`) — never arbitrary values without strong reason

### shadcn/ui usage
- Import from `@/components/ui/` — do not modify these files
- Use `Dialog`, `Button`, `Badge`, `Card`, `Select`, `Input`, `Label`, `Tabs` from shadcn
- Button variants: `default` (primary), `outline` (secondary), `ghost` (tertiary), `destructive` (delete/cancel)
- Always provide `aria-label` on icon-only buttons

---

## Icons

- **lucide-react only** — do not mix icon sets
- Common icons in this project:
  - `LayoutGrid` — week view toggle
  - `Calendar` — day view toggle
  - `ChevronLeft` / `ChevronRight` — week/day navigation
  - `Pencil` — edit
  - `Trash2` — delete
  - `Plus` — add/create
  - `X` — close/cancel
  - `Check` — confirm/attended
  - `User` / `Users` — member/athlete

---

## Error handling

- **API routes:** return structured error `{ error: "Human-readable message" }` with appropriate HTTP status
- **Client:** show toast notification on failure (`sonner` or `react-hot-toast` — check which is installed)
- **Never** show raw error messages or stack traces to users
- **Loading states:** set `isLoading = true` before async call, `false` in finally block; disable submit button while loading

---

## Code quality rules

- No comments unless the WHY is non-obvious (hidden constraint, workaround, subtle invariant)
- No TODO comments in committed code — create a task instead
- No dead code — remove unused imports, variables, and commented-out blocks before committing
- No backwards-compatibility shims (renaming to `_unused`, re-exporting deleted types, etc.)
- No features beyond the task — don't add error handling for scenarios that can't happen

---

## File naming

| Type | Convention | Example |
|------|-----------|---------|
| Page | `page.tsx` | `app/(dashboard)/admin/schedule/page.tsx` |
| Client component | `*-client.tsx` | `schedule-client.tsx` |
| Shared component | PascalCase | `components/BookingDialog.tsx` |
| API route | `route.ts` | `app/api/bookings/route.ts` |
| Utility | camelCase | `lib/time.ts` |
| Type file | `types.ts` or co-located | `app/api/bookings/types.ts` |

---

## Imports

- Use `@/` path alias for all project imports (maps to project root)
- Group imports: external packages → `@/` imports → relative imports
- No barrel `index.ts` files unless they already exist
