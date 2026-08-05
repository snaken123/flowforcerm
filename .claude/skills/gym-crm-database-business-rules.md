---
name: gym-crm-database-business-rules
description: Database schema reference and business rules for the FlowForceRM gym CRM. Invoke before writing Prisma queries, schema changes, or any code that reads/writes bookings, schedules, or subscriptions.
---

## Database

- **Engine:** PostgreSQL (Neon serverless)
- **ORM:** Prisma 5
- **Schema file:** `prisma/schema.prisma`
- **Apply changes:** `npx prisma db push` (no migrations folder — never run `prisma migrate`)
- **Prisma client:** `lib/db.ts` (singleton)

---

## Date storage rules (CRITICAL)

| Context | Correct approach | Wrong approach |
|---------|-----------------|----------------|
| Client → server (date string) | `toLocaleDateString("en-CA")` → `"2025-07-28"` | `toISOString()` (UTC shift) |
| Server stores date | `new Date("2025-07-28T00:00:00Z")` | `new Date("2025-07-28")` (TZ-dependent) |
| DB comparison | Both sides use UTC midnight → equal | Mixing UTC midnight with local midnight → off-by-one |

Manila = UTC+8. A date string without `T00:00:00Z` will be parsed in server timezone, producing the wrong day.

---

## Booking rules

### `scheduledDate` is mandatory
Every `Booking` must have `scheduledDate` set to the UTC midnight of the specific class occurrence.

**Without `scheduledDate`, the booking is invisible to:**
- Admin dialog fetch (filters `WHERE scheduledDate = :date`)
- Card count API (`/api/bookings/counts`) which filters by week range
- Any date-scoped report

### `scheduleId` vs `sessionId`
- `scheduleId` → the specific `ClassSchedule` row (e.g., "Monday 7:30 PM Judo")
- `sessionId` → the `ClassSession` type (e.g., "Judo") shared by ALL Judo schedules

**Booking existence checks must use `scheduleId`**, not `sessionId`. Using `sessionId` matches all bookings for the sport across every time slot and day.

### Booking transfer (override pattern)
When editing one occurrence of a recurring class:
1. Add `ClassScheduleException` on original schedule for that date
2. Create non-recurring `ClassSchedule` (startDate = endDate = that date)
3. Transfer bookings: `updateMany WHERE scheduleId = original AND scheduledDate = date`

### Delete safety
Before deleting a `ClassSchedule`, check `WHERE scheduleId = id AND status != CANCELLED`. If any exist, return 409 and require explicit confirmation.

---

## Schedule visibility rules

A `ClassSchedule` occurrence is **visible** on a given date only if:
- Recurring: `dayOfWeek` matches AND `startDate ≤ date ≤ endDate` AND **no `ClassScheduleException` exists for that date**
- Non-recurring: `startDate == date == endDate` AND no exception (exceptions on one-time classes are rare but possible)

Both admin and member calendars must apply this filter.

---

## Card count queries

Card counts on the schedule grid must be **week-scoped** using `/api/bookings/counts?weekStart=YYYY-MM-DD`.

The counts endpoint:
```ts
// bookings: groupBy scheduleId WHERE status != CANCELLED AND scheduledDate BETWEEN weekStart AND weekEnd
// checkIns: groupBy scheduleId WHERE checkedInAt BETWEEN weekStart AND weekEnd+1day
```

Server-rendered all-time totals are only used for initial hydration; after any mutation, re-fetch the counts endpoint.

---

## Subscription rules

- `sessionsTotal: null` = unlimited (date-based subscription)
- `endDate: null` = session-based (never expires by date, only when sessions run out)
- `sessionsUsed` must be incremented atomically with the booking creation (use Prisma transaction)
- A member can only book a class if they have an active subscription covering that `ClassSession` (via `ClassAllowedService`)

---

## Common Prisma patterns

### Fetch schedule with exceptions (for calendar rendering)
```ts
const schedules = await prisma.classSchedule.findMany({
  where: { startDate: { lte: weekEnd }, endDate: { gte: weekStart } },
  include: {
    session: true,
    coaches: { include: { employee: { include: { user: true } } } },
    exceptions: { select: { date: true } },
  },
});
```

### Week-scoped booking counts
```ts
const counts = await prisma.booking.groupBy({
  by: ["scheduleId"],
  where: {
    scheduleId: { not: null },
    status: { not: "CANCELLED" },
    scheduledDate: { gte: weekStart, lte: weekEnd },
  },
  _count: { id: true },
});
```

### Date-filtered bookings for a dialog
```ts
const bookings = await prisma.booking.findMany({
  where: {
    scheduleId: scheduleId,
    scheduledDate: new Date(dateStr + "T00:00:00Z"),
    status: { not: "CANCELLED" },
  },
  include: { member: { include: { user: true } } },
});
```

### Create booking (always include scheduledDate)
```ts
await prisma.booking.create({
  data: {
    memberId,
    scheduleId,
    sessionId,
    scheduledDate: new Date(dateStr + "T00:00:00Z"),
    status: "CONFIRMED",
  },
});
```

### Transfer bookings to override schedule
```ts
await prisma.booking.updateMany({
  where: {
    scheduleId: originalScheduleId,
    scheduledDate: new Date(dateStr + "T00:00:00Z"),
  },
  data: { scheduleId: overrideScheduleId },
});
```

---

## groupBy gotchas

- `groupBy` on a nullable field silently drops rows where the field is `null` — always add `{ not: null }` to the `where` clause
- `_count` returns the count under `_count.id` not directly as a number; access as `row._count.id`

---

## Past-date protection

Classes in the past (Manila time) cannot be edited, deleted, or have their bookings transferred. The Manila date is:
```ts
const manilaNow = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }));
```
Compare `classDate < manilaNow.date` before any destructive action.
