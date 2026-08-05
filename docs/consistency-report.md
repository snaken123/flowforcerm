# GymRM Documentation Consistency Report

**FlowForceRM — GymRM**
*Audit date: July 2026*

This report identifies inconsistencies between different parts of the codebase, between implementation and observed behaviour, and cross-cutting concerns that affect documentation accuracy.

---

## Section 1 — Naming Inconsistencies

### 1.1 "Athlete" vs "Member"

**Finding:** The sidebar navigation label is "Athletes" and the URL is `/admin/members`. The database model is `Member`. The code, API routes, and page titles use "member" or "Member" consistently. The sidebar label "Athletes" is the only place the term "athlete" appears in the UI.

**Impact:** User-facing documentation should use "athlete" when describing the sidebar but "member" everywhere else to match the API and data model. The user manual uses "athlete" (per sidebar label) in context but "member" in technical descriptions — this is the correct convention to maintain.

---

### 1.2 "Special Logins" vs "System Accounts"

**Finding:** The Settings sidebar item is labelled "Special Logins" in the UI. The API endpoint is `POST /api/admin/system-accounts`. The code comments and variable names use "system accounts".

**Impact:** The administrator guide uses "Special Logins" when referring to the Settings page location (correct for navigation) and "system accounts" when referring to the accounts themselves (correct for technical context). This distinction should be maintained consistently.

---

### 1.3 "Free Trial" Capitalization

**Finding:** The codebase uses several forms: `free-trial-registration` (source field value), `FreeTrialToken` (model name), "free trial" (API path segments), and "Free Trial" (UI labels). No single canonical form exists.

**Recommendation:** Standardise to "free trial" (lowercase, two words) in prose, `free-trial` in URL slugs and source values, and PascalCase (`FreeTrialToken`) in code identifiers. The current documentation uses "free-trial" in technical contexts and "Free Trial" when capitalised in headings — acceptable.

---

## Section 2 — Behavioural Inconsistencies

### 2.1 STORE Role: Inconsistent Member Access

**Finding:**
- `GET /api/members` — STORE is allowed (confirmed in route)
- `GET /api/subscriptions` — STORE is blocked (returns 403)
- `GET /api/members/[id]` — STORE is allowed (full record)

**Analysis:** The intent is that STORE staff can look up members (to find who's buying) but cannot see subscription details. However, `GET /api/members/[id]` returns the member with all subscriptions included. This may be a gap — STORE can effectively read subscription data through the member detail endpoint.

**Recommendation:** Flag this as a potential security gap in the Open Questions report. The API documentation accurately documents what the code does; the question is whether the behaviour is intentional.

---

### 2.2 Walk-in Check-in: Duplicate Guard Timezone

**Finding:** The `POST /api/checkins/attend` endpoint's walk-in duplicate guard uses Manila timezone day boundaries. The `POST /api/checkins` endpoint (non-attend check-in path) does not have an explicit same-day duplicate guard — it relies on the Booking unique constraint, which only applies when `scheduleId` is provided.

**Impact:** A member could have multiple `CheckIn` records via the non-attend path on the same day (e.g., staff manually checking in twice). The attend path is the correct one for kiosk and scheduled check-ins.

**Recommendation:** Note this distinction in the API documentation. The attend path is the primary check-in mechanism; the checkins route is a simpler manual entry.

---

### 2.3 ClassSession.startsAt / endsAt Fields Unused in Scheduling

**Finding:** `ClassSession` has `startsAt` and `endsAt` fields, which appear to be intended for one-time event scheduling. However, all scheduling logic in `ClassSchedule` uses `dayOfWeek`, `startTime`, and `endTime` (string-based). The `startsAt`/`endsAt` fields are not referenced in any API route logic.

**Impact:** These fields are schema-level but functionally dead. Documentation of the schema notes them as "for one-time events" but they are not exercised by any current feature.

---

### 2.4 Booking.sessionReturned Flag Not Reflected in UI

**Finding:** The `Booking.sessionReturned` boolean is set when a session is credited back on cancellation. However, the member detail and booking list UIs do not visually distinguish between bookings that did vs. did not return a session.

**Impact:** Accurate for database documentation but the UI documentation cannot claim this distinction is visible.

---

## Section 3 — API Documentation Cross-Checks

### 3.1 `GET /api/schedules/[id]` Response

**Finding in code:** The route returns `{ bookingCount: number }` (non-cancelled bookings for the schedule). The API documentation accurately reflects this.

**Note:** The route does not return the full schedule object — only the count. This is useful for the schedule delete confirmation dialog.

---

### 3.2 `/api/register/classes` Service Filter

**Finding:** The route filters available free-trial services based on service slug matching specific strings (yoga/judo/jiujitsu for adults; kids judo/jiujitsu for kids mode). This filtering is hardcoded in the route, not based on a configurable flag on the Service model.

**Impact:** If new services are added that should appear in the free-trial flow, the route handler must be updated manually. The API documentation notes this behaviour.

---

### 3.3 `/api/shop/items/[id]/restock` Metadata Fields

**Finding:** The restock endpoint accepts `costPerUnit`, `supplier`, `notes`, and `date` fields but does not persist them to any table — only `qty` is used (increments stock). The `ShopInventoryLog` entry for restocks is created by the inventory-log endpoint, not restock.

**Impact:** The API documentation notes this gap: "optional metadata fields are accepted but not currently persisted."

---

## Section 4 — Database Documentation Cross-Checks

### 4.1 Booking Unique Constraint

**Schema:** `@@unique([memberId, scheduleId, scheduledDate])`

**Verification:** This constraint is live in the Neon database (applied July 2026 via `npx prisma db push --accept-data-loss`). The database reference accurately documents this constraint.

---

### 4.2 ClassScheduleException.date Timezone

**Finding:** The exception date is stored as `DateTime` at "midnight UTC" per the schema comment. However, when creating exceptions, the date is passed as a Manila calendar date (`YYYY-MM-DD`). The conversion to UTC midnight must happen at the application layer. The current implementation should be verified to confirm Manila midnight vs. UTC midnight is handled consistently.

**Recommendation:** Add a note in the database reference that exception dates are stored as midnight UTC but compared against Manila calendar dates in schedule filtering logic.

---

### 4.3 FreeTrialToken: One Token Per Email at a Time

**Finding:** The `POST /api/register/initiate` endpoint deletes any existing unused token for an email before creating a new one. This is a business rule encoded in the route handler, not in the schema (no unique constraint on email in FreeTrialToken).

**Impact:** The database reference notes only the schema. The API documentation correctly captures this behaviour.

---

## Section 5 — Documentation Suite Consistency

### 5.1 Cross-Document Terminology

The following terminology is used consistently across all seven documents:

| Term | Usage |
|------|-------|
| "Asia/Manila" | Timezone references |
| "NS-XXXXX" | Member number format |
| "ADMIN, STAFF, STORE, MEMBER, KIOSK" | Role names (all caps) |
| "Neon" | Database provider |
| "Vercel Blob" | Photo storage |
| "Google Drive" | Receipt storage |
| "Semaphore" | SMS provider |
| "Resend" | Transactional email provider |

### 5.2 Field Name Casing

All field names in the API documentation are presented in `camelCase` to match the JSON request/response bodies. The database reference uses `camelCase` to match Prisma schema field names. Both are internally consistent.

---

## Summary of Inconsistencies

| # | Issue | Severity | Action |
|---|-------|----------|--------|
| 1.1 | "Athletes" vs "Members" terminology split | Low | Convention established in docs — maintain as-is |
| 1.2 | "Special Logins" vs "system accounts" | Low | Both terms retained contextually — acceptable |
| 1.3 | "Free Trial" capitalisation variants | Low | Standardise going forward |
| 2.1 | STORE role can read subscription data via member detail | Medium | Flag in Open Questions — potential security gap |
| 2.2 | Walk-in duplicate guard only on attend path | Medium | Documented accurately; gap noted |
| 2.3 | ClassSession.startsAt/endsAt unused | Low | Documented in database reference |
| 2.4 | sessionReturned not visible in UI | Low | Documented in database reference only |
| 3.3 | Restock metadata not persisted | Low | Documented in API docs |
| 4.2 | Exception date timezone handling | Medium | Recommend verification and note in database reference |
| 4.3 | FreeTrialToken one-per-email rule not in schema | Low | Documented in API docs |
