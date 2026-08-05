---
name: gym-crm-architecture
description: Reference skill for the FlowForceRM gym CRM system architecture. Invoke before implementing a new feature to understand routing, data flow, component boundaries, and deployment setup.
---

## Project overview

**App:** FlowForceRM gym CRM  
**URL:** flowforcerm.com  
**Stack:** Next.js 14 App Router · TypeScript strict · Prisma 5 · PostgreSQL (Neon) · NextAuth 4 · Tailwind CSS · shadcn/ui  
**Deployment:** Vercel — auto-deploys from `main` branch on every `git push`

---

## Directory structure

```
C:\Code\gym-crm\
├── app/
│   ├── (dashboard)/          # Authenticated area (layout wraps all)
│   │   ├── admin/            # ADMIN + STAFF routes
│   │   │   ├── schedule/     # Class schedule management
│   │   │   ├── members/      # Member list, profiles
│   │   │   ├── shop/         # Store management
│   │   │   └── ...
│   │   ├── member/           # MEMBER routes
│   │   │   ├── schedule/     # Member-facing class calendar
│   │   │   └── ...
│   │   ├── dashboard/        # Coach/staff dashboard
│   │   └── kiosk/            # KIOSK self-check-in
│   ├── api/                  # Route handlers (Next.js API routes)
│   │   ├── auth/             # NextAuth endpoints
│   │   ├── bookings/         # GET, POST, PATCH + /counts
│   │   ├── schedules/        # GET, POST + /[id] GET, PUT, DELETE
│   │   ├── members/          # Member CRUD
│   │   └── ...
│   ├── layout.tsx            # Root layout (providers, fonts)
│   └── globals.css
├── components/
│   ├── ui/                   # shadcn/ui components (do not edit these)
│   └── ...                   # Shared custom components
├── lib/
│   ├── auth.ts               # NextAuth config + getAuthSession()
│   ├── db.ts                 # Prisma client singleton
│   ├── utils.ts              # cn(), formatDate(), etc.
│   └── time.ts               # Manila-timezone helpers
├── prisma/
│   └── schema.prisma         # Single source of truth for DB schema
└── public/
```

---

## Auth & roles

NextAuth 4 with JWT strategy. Session contains `user.role` and `user.id`.

| Role | Access |
|------|--------|
| ADMIN | Full access to all routes |
| STAFF | Admin area except destructive operations |
| MEMBER | `/member/*` only |
| KIOSK | `/kiosk/*` only — self-check-in |
| STORE | `/admin/shop` only |

Employees also have `employeeTypes[]`: `COACH`, `STAFF`, `ADMIN`. A person can be both COACH and STAFF.

Auth check in API routes:
```ts
const session = await getAuthSession();
if (!session || session.user.role !== "ADMIN") {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
```

---

## Data flow: server components + client components

- **Page files** (`page.tsx`) are React Server Components — fetch data with Prisma directly, pass as props
- **`-client.tsx` files** are Client Components (`"use client"`) — receive data as props, handle interaction, call API routes for mutations
- Pattern: `page.tsx` fetches initial data → passes to `*-client.tsx` → client mutates via `fetch("/api/...")` → refreshes local state (no full reload)

---

## Key data model relationships

```
User ──< Member (one-to-one)
User ──< Employee (one-to-one)
Employee ──< EmployeeType[]       COACH | STAFF | ADMIN
Employee ──< EmployeeTaughtService[]

ClassSession (sport type: Jiujitsu-Gi, Judo, Boxing…)
  └──< ClassAllowedService[]      which Subscriptions can attend

ClassSchedule (time slot)
  ├── isRecurring: Boolean
  ├── startDate / endDate
  ├── dayOfWeek (0=Sun … 6=Sat)
  ├── startTime / endTime
  ├── maxCapacity
  ├──< ClassScheduleCoach[]
  └──< ClassScheduleException[]   cancelled occurrences (date = UTC midnight)

Booking
  ├── memberId / employeeId
  ├── scheduleId              ← the specific time slot
  ├── sessionId               ← the sport type
  ├── scheduledDate: DateTime? ← UTC midnight of the booked occurrence
  └── status: CONFIRMED | ATTENDED | CANCELLED

CheckIn
  ├── memberId / employeeId
  ├── scheduleId
  └── checkedInAt: DateTime

Subscription
  ├── sessionsTotal / sessionsUsed  (null = unlimited)
  └── endDate (null = session-based)
```

---

## Critical architectural rules

1. **Date storage:** server always stores `new Date(str + "T00:00:00Z")` — UTC midnight as neutral label
2. **Date from client:** always `toLocaleDateString("en-CA")` → `YYYY-MM-DD` — never `toISOString()`
3. **`scheduledDate` is required** on every `Booking` — null-date bookings are invisible to date-filtered queries
4. **`scheduleId` vs `sessionId`:** `scheduleId` = this specific time slot; `sessionId` = the sport type shared by all slots. Booking existence checks must use `scheduleId`
5. **Exception filtering:** any calendar rendering recurring schedules must hide dates where a `ClassScheduleException` exists
6. **React hooks ordering:** all `useState` before any `useEffect` that references those variables (temporal dead zone)
7. **Schema changes:** `npx prisma db push` — no migrations folder used

---

## API conventions

- All routes in `app/api/` are Next.js Route Handlers (not Pages Router)
- Auth check first in every handler
- Date params arrive as `YYYY-MM-DD` strings; convert with `new Date(str + "T00:00:00Z")`
- Return `NextResponse.json(data)` for success, `NextResponse.json({ error }, { status })` for errors
- Booking mutations call the counts API (`/api/bookings/counts?weekStart=`) to refresh card counts after mutation
