# GymRM API Documentation

**NorthSouth Fight Sports — GymRM**
*Version: Current as of July 2026*

---

## Overview

All API routes are Next.js Route Handlers under `/app/api/`. Authentication uses NextAuth 4 JWT sessions via `getAuthSession()`. Roles: `ADMIN`, `STAFF`, `STORE`, `KIOSK`, `MEMBER`. All day-boundary calculations use the **Asia/Manila** timezone (UTC+8). Request bodies are validated with Zod. Sensitive operations are recorded via `logAudit()`.

### Authentication

Include session cookies (set by NextAuth) on every request. Unauthenticated requests receive `401`. Insufficient role receives `403`.

### Base URL

```
https://app.northsouth.com.ph
```

---

## Members

### GET /api/members

**Auth:** ADMIN, STAFF, STORE

| Param | Type | Description |
|-------|------|-------------|
| `status` | query string | Filter by member status |
| `q` | query string | Case-insensitive search across firstName, lastName, email |

**Response 200:** Array of up to 500 members (ordered by lastName), each including `user.email` and active `subscriptions` (with service).

**Errors:** 401, 403

---

### POST /api/members

**Auth:** ADMIN, STAFF, STORE

**Body:**
```json
{
  "firstName": "string (required, min 1)",
  "lastName": "string (required, min 1)",
  "email": "string (optional, valid email)",
  "phone": "string (optional)",
  "status": "ACTIVE | INACTIVE (default ACTIVE)",
  "emergencyName": "string (optional)",
  "emergencyPhone": "string (optional)"
}
```

**Business logic:**
- Member number auto-generated as `NS-00001` format; retries up to 3 times on collision
- If `email` provided: creates User + Member, sends welcome email with temp credentials via Resend
- If no `email`: creates guest Member with no user account
- Audit: `CREATE_MEMBER`

**Response 201:** Created member  
**Errors:** 400, 401, 403, 409 (email taken), 500 (member number collision)

---

### GET /api/members/[id]

**Auth:** ADMIN, STAFF, STORE — full record; MEMBER — own profile only (sensitive fields `medicalNotes`, `notes`, `emergencyName`, `emergencyPhone`, `emergencyRel` are stripped)

**Response 200:** Member with `user.email`, all subscriptions (with service), last 10 check-ins, rank records  
**Errors:** 401, 403, 404

---

### PATCH /api/members/[id]

**Auth role-based fields:**
- `MEMBER`: `photoUrl`, `emergencyName`, `emergencyPhone`, `emergencyRel`, `phone`, `dateOfBirth`, `address` (own record only)
- `STAFF`: `notes` only
- `ADMIN/STORE`: all fields

**Body (ADMIN/STORE, all optional):** `status`, `memberNumber`, `firstName`, `lastName`, `phone`, `dateOfBirth`, `address`, `photoUrl`, `gender`, `email`, `notes`, `medicalNotes`, `emergencyName`, `emergencyPhone`, `emergencyRel`, `waiverSigned`, `joinDate`, `activatedAt`, `guardianUserId`, `source`

**Business logic:**
- `waiverSigned: true` also sets `waiverDate = now`
- First-time `activatedAt` auto-generates member number if missing
- `email` change propagates to linked User record
- Audit: `UPDATE_MEMBER`

**Response 200:** Updated member  
**Errors:** 400, 401, 403, 500

---

### DELETE /api/members/[id]

**Auth:** ADMIN only

**Body:**
```json
{ "adminPassword": "string (required)" }
```

**Business logic:** Cascading hard delete (payments → check-ins → ranks → bookings → subscriptions → member). Audit: `DELETE_MEMBER`.

**Response 200:** `{ "success": true }`  
**Errors:** 400, 401, 403, 404

---

### POST /api/members/[id]/freeze-all

**Auth:** ADMIN only

**Body:**
```json
{
  "days": "integer (positive, required)",
  "reason": "string (min 1, required)",
  "password": "string (admin password, required)"
}
```

**Business logic:** Verifies admin password. Sets all ACTIVE subscriptions to PAUSED. Sets `frozenAt`, `frozenUntil`, extends `endDate` by `days`. Sets member status to `FROZEN`. Audit: `FREEZE_MEMBER`.

**Response 200:** `{ "success": true, "frozenUntil": "ISO string" }`  
**Errors:** 400, 401, 403

---

### POST /api/members/[id]/unfreeze-all

**Auth:** ADMIN only

**Body:**
```json
{
  "reason": "string (min 1, required)",
  "password": "string (admin password, required)"
}
```

**Business logic:** Verifies admin password. Restores PAUSED subscriptions to ACTIVE, adjusts endDate. Sets member status to ACTIVE. Audit: `UNFREEZE_MEMBER`.

**Response 200:** `{ "success": true }`  
**Errors:** 400, 401, 403

---

### POST /api/members/[id]/convert

**Auth:** ADMIN, STAFF, STORE

**Body:**
```json
{
  "memberNumber": "string (optional, auto-generated if blank)",
  "serviceId": "string (required)",
  "startDate": "YYYY-MM-DD (required)",
  "endDate": "YYYY-MM-DD (optional)",
  "sessionsTotal": "integer positive (optional)",
  "price": "number min 0 (required)",
  "paymentMethod": "string (optional)",
  "billingCycle": "MONTHLY | QUARTERLY | SEMI_ANNUAL | ANNUAL (default MONTHLY)"
}
```

**Business logic:** Member must be `INACTIVE`. Transactionally assigns member number, sets status to `ACTIVE`, sets `activatedAt = now`, creates subscription and payment record. Audit: `CONVERT_TRIAL_TO_MEMBER`.

**Response 200:** `{ "member": {...}, "subscription": {...} }`  
**Errors:** 400, 403, 404, 409 (not INACTIVE or member number conflict)

---

### POST /api/members/[id]/face

**Auth:** ADMIN, STAFF, STORE

**Body:** `{ "descriptor": [128 numbers] }`

**Response 200:** `{ "id", "firstName", "lastName" }`  
**Errors:** 400, 401, 403

### DELETE /api/members/[id]/face

**Auth:** ADMIN, STAFF, STORE  
**Response 200:** `{ "ok": true }`

---

### POST /api/members/[id]/resend-activation

**Auth:** ADMIN only  
**Business logic:** Generates new 10-char temp password, updates user, sends activation email.  
**Errors:** 400, 401, 403, 404, 500

---

### POST /api/members/child

**Auth:** ADMIN only

**Body:**
```json
{
  "firstName": "string (required)",
  "lastName": "string (required)",
  "guardianUserId": "string (required)",
  "phone": "string (optional)",
  "dateOfBirth": "ISO date (optional)",
  "gender": "string (optional)"
}
```

**Business logic:** Creates a member with no user account. Links to existing guardian user. Auto-generates member number. Audit: `CREATE_MEMBER`.

**Response 201:** Created member  
**Errors:** 400, 403, 404 (guardian not found)

---

### GET /api/members/lookup

**Auth:** ADMIN, STAFF, KIOSK

| Param | Type | Description |
|-------|------|-------------|
| `q` | query string (required) | Member number (`NS-XXXXX`) or UUID |

**Response 200:** Member with active subscriptions, last check-in, and `todayClasses` (schedules today in Manila time matching the member's active services)  
**Errors:** 400, 401, 403, 404

---

### GET /api/members/face-descriptors

**Auth:** ADMIN, STAFF, KIOSK  
**Response 200:** Array of `{ id, firstName, lastName, photoUrl, memberNumber, faceDescriptor }` for active members with stored descriptors

---

## Subscriptions

### GET /api/subscriptions

**Auth:** ADMIN, STAFF — all; MEMBER — own only; STORE — 403

| Param | Type | Description |
|-------|------|-------------|
| `memberId` | string | Filter by member |
| `employeeId` | string | Filter by employee |
| `status` | string | Filter by status |

**Response 200:** Array ordered by `createdAt desc`, each with member, employee, and service

---

### POST /api/subscriptions

**Auth:** ADMIN, STAFF, STORE

**Body:**
```json
{
  "memberId": "string (required if no employeeId)",
  "employeeId": "string (required if no memberId)",
  "serviceId": "string (required)",
  "packageId": "string (optional)",
  "billingCycle": "MONTHLY (default)",
  "price": "number min 0 (required)",
  "startDate": "string (optional, defaults now)",
  "endDate": "string (optional)",
  "sessionsTotal": "integer positive or null (optional)",
  "notes": "string max 500 (optional)",
  "paymentMethod": "string (optional)"
}
```

**Business logic:** If member is FROZEN, new subscription starts as PAUSED. Creates PAID payment if `price > 0`. Auto-activates INACTIVE members. Audit: `ASSIGN_MEMBERSHIP`.

**Response 201:** Subscription with service, member, employee  
**Errors:** 400, 403

---

### PATCH /api/subscriptions/[id]

**Auth:** ADMIN, STAFF, STORE

**Body:**
```json
{
  "startDate": "YYYY-MM-DD (required)",
  "endDate": "YYYY-MM-DD or null (required)",
  "sessionsUsed": "integer min 0 (optional)",
  "notes": "string max 500 (optional)",
  "reason": "string min 1 (required)"
}
```

**Validation:** `endDate` must not precede `startDate`. `sessionsUsed` cannot exceed `sessionsTotal`. `notes` max 500 characters; omitting the field leaves existing notes unchanged.

**Business logic:** Auto-updates status (EXPIRED if sessions exhausted, ACTIVE if restored). Audit: `EDIT_SUBSCRIPTION`.

**Response 200:** `{ "success": true }`  
**Errors:** 400, 403, 404

---

### DELETE /api/subscriptions/[id]

**Auth:** ADMIN only

**Body:**
```json
{
  "reason": "string min 1 (required)",
  "password": "string (admin password, required)"
}
```

**Business logic:** Blocked if any booking records exist (must cancel instead). Verifies admin password. Audit: `DELETE_MEMBERSHIP`.

**Response 200:** `{ "success": true }`  
**Errors:** 400, 401, 403, 404, 409 (has attendance history)

---

### POST /api/subscriptions/[id]/use-session

**Auth:** ADMIN, STAFF, STORE  
**Business logic:** Atomically increments `sessionsUsed` only if `sessionsUsed < sessionsTotal`. Prevents overbilling under concurrency. Sets status to EXPIRED if sessions exhausted.

**Response 200:** `{ "subscription": {...}, "expired": boolean }`  
**Errors:** 400 (not active, not session-based, or no sessions remaining), 403, 404

---

### POST /api/subscriptions/[id]/freeze

**Auth:** ADMIN only

**Body:** `{ "days": integer positive }`

**Business logic:** Subscription must be ACTIVE. Sets to PAUSED, records `frozenAt`/`frozenUntil`, sets member to FROZEN.

**Response 200:** `{ "success": true, "frozenUntil": "ISO string" }`  
**Errors:** 400, 403, 404

---

## Check-ins

### POST /api/checkins

**Auth:** ADMIN, STAFF, KIOSK

**Body:**
```json
{
  "memberId": "string (required)",
  "serviceId": "string (optional)",
  "classSessionId": "string (optional)",
  "scheduleId": "string (optional)",
  "notes": "string (optional)",
  "force": "boolean (optional, default false)"
}
```

**Business logic:** Member must be ACTIVE. If `serviceId` provided, verifies non-exhausted subscription exists. Same-day duplicate guard: if the member already has a check-in today (Manila timezone), returns 409 with `{ "code": "already_checked_in_today", "checkedInAt": "ISO string" }`. Pass `force: true` to bypass and record a second check-in.

**Response 201:** Check-in record with member  
**Errors:** 400, 401, 403, 404, 409 (duplicate — use `force: true` to bypass)

---

### GET /api/checkins

**Auth:** ADMIN, STAFF, KIOSK — any; MEMBER — own only

| Param | Type | Description |
|-------|------|-------------|
| `memberId` | string | Filter by member |
| `scheduleId` | string | Filter by schedule |
| `date` | YYYY-MM-DD | Filter by date |
| `limit` | integer (default 50) | Max results |

**Response 200:** Array of check-ins with member summary (id, name, memberNumber, photoUrl)

---

### POST /api/checkins/attend

**Auth:** ADMIN, STAFF, KIOSK

**Body:**
```json
{
  "memberId": "string (required)",
  "classIds": ["string (at least 1)"],
  "scheduleId": "string (optional)",
  "scheduledDate": "YYYY-MM-DD (optional)"
}
```

**Business logic (transaction):**
- Member must be ACTIVE
- Duplicate guard: same schedule+day blocks re-check-in (walk-in: same-day block)
- Creates one CheckIn record
- For each class: finds eligible subscription, atomically decrements sessions
- Creates/updates Booking to ATTENDED

**Response 200:** `{ "ok": true }`  
**Errors:** 400, 401, 403, 404, 409 (already checked in)

---

### POST /api/checkins/kiosk

**Auth:** Any authenticated session

**Body:** `{ "memberId": "string (required)" }`

**Business logic:**
- Member must be ACTIVE with valid non-exhausted subscription
- 30-minute cooldown between check-ins
- Auto-links to current Manila-time schedule slot if exactly one matching slot is running
- Sets notes to "Face recognition kiosk"

**Response 201:** `{ "ok": true, "checkIn": {...}, "member": {...} }`  
**Errors:** 400, 403 (no active membership), 404, 409 (already checked in, includes `checkedInAt`)

---

## Bookings

### GET /api/bookings

**Auth:** ADMIN, STAFF, STORE

| Param | Type | Description |
|-------|------|-------------|
| `scheduleId` | string (required) | Schedule to query |
| `date` | YYYY-MM-DD (optional) | Specific date |

**Response 200:** Array (up to 200) of non-cancelled bookings ordered by `createdAt asc`, with member (including active subscriptions and service colors) and employee details

---

### POST /api/bookings

**Auth:** Any authenticated user

**Body:**
```json
{
  "sessionId": "string (required)",
  "scheduleId": "string (required)",
  "subscriptionId": "string (optional)",
  "memberId": "string (optional)",
  "employeeId": "string (optional)",
  "scheduledDate": "YYYY-MM-DD (optional)"
}
```

**Business logic:** Staff can book on behalf of any member. Member booking for self: verifies active non-exhausted subscription, blocks if class has already ended. Duplicate and capacity checks.

**Response 201:** Booking object  
**Errors:** 400, 401, 403, 404, 409 (already booked or class full)

---

### PATCH /api/bookings

**Auth:** ADMIN only

**Body:**
```json
{
  "fromScheduleId": "string (required)",
  "toScheduleId": "string (required)",
  "date": "YYYY-MM-DD (required)"
}
```

**Business logic:** Bulk transfer of all non-cancelled bookings from one schedule to another for a specific date.

**Response 200:** `{ "transferred": count }`  
**Errors:** 400, 403

---

### PATCH /api/bookings/[id]

**Auth:** ADMIN, STAFF, STORE

**Body:** `{ "status": "CONFIRMED | ATTENDED" }`

**Response 200:** Updated booking  
**Errors:** 400, 403

---

### DELETE /api/bookings/[id]

**Auth:** Any authenticated user

**Body (optional):**
```json
{
  "reason": "string",
  "returnSession": "boolean (default true)"
}
```

**Business logic:** Members can only cancel their own non-attended, non-past bookings. If `returnSession: true` and booking had a session-based subscription, decrements `sessionsUsed` (guarded against going below 0), re-activates if subscription was EXPIRED.

**Response 200:** `{ "success": true }`  
**Errors:** 400, 401, 403, 404, 409 (already cancelled)

---

### GET /api/bookings/counts

**Auth:** ADMIN, STAFF, STORE

| Param | Type | Description |
|-------|------|-------------|
| `weekStart` | YYYY-MM-DD (required) | Start of 7-day window |

**Response 200:** `{ "bookings": { "[scheduleId]": count }, "checkIns": { "[scheduleId]": count } }`

---

## Classes (ClassSessions)

### POST /api/classes

**Auth:** ADMIN only

**Body:**
```json
{
  "name": "string (required)",
  "color": "string (optional, default #3B82F6)",
  "location": "string (optional)",
  "notes": "string (optional)",
  "allowedServiceIds": ["string (optional)"]
}
```

**Response 201:** ClassSession with `allowedServices` and booking count

---

### PATCH /api/classes/[id]

**Auth:** ADMIN only  
**Body:** Same as POST (all optional). `allowedServiceIds` fully replaces existing.  
**Response 200:** Updated ClassSession

### DELETE /api/classes/[id]

**Auth:** ADMIN only  
**Response 200:** `{ "ok": true }`

---

### GET /api/classes/[id]/bookings

**Auth:** ADMIN, STAFF, STORE  
**Response 200:** CONFIRMED and ATTENDED bookings, ordered by lastName then firstName

---

## Schedules

### GET /api/schedules

**Auth:** Any authenticated session  
**Response 200:** All active schedules with `classDef` and coaches, ordered by dayOfWeek then startTime

---

### POST /api/schedules

**Auth:** ADMIN only

**Body:**
```json
{
  "classId": "string (required)",
  "dayOfWeek": "0-6 (required, 0=Sun)",
  "startTime": "HH:MM (required)",
  "endTime": "HH:MM (required)",
  "location": "string (optional)",
  "maxCapacity": "integer positive (optional)",
  "coachIds": ["string (optional)"],
  "isRecurring": "boolean (optional)",
  "startDate": "string or null (optional)",
  "endDate": "string or null (optional)"
}
```

**Response 201:** Schedule with classDef and coaches. Audit: `CREATE_SCHEDULE`.

---

### GET /api/schedules/[id]

**Auth:** ADMIN, STAFF, STORE  
**Response 200:** `{ "bookingCount": number }`  
**Errors:** 403, 404

---

### PATCH /api/schedules/[id]

**Auth:** ADMIN only  
**Body:** `classId`, `dayOfWeek`, `startTime`, `endTime`, `location`, `maxCapacity`, `coachIds`, `endDate` (all optional). `coachIds` fully replaces existing.  
**Response 200:** Updated schedule. Audit: `UPDATE_SCHEDULE`.

---

### DELETE /api/schedules/[id]

**Auth:** ADMIN only

**Body:**
```json
{
  "mode": "this | succeeding | all (default all)",
  "date": "YYYY-MM-DD (required for this/succeeding)",
  "force": "boolean (default false)"
}
```

**Business logic:**
- Cannot delete past sessions
- Returns 409 with booking details if bookings exist and `force: false`
- `this`: creates a `ClassScheduleException` (soft-cancels one occurrence)
- `succeeding`: sets `endDate` to day before `date`
- `all`: hard deletes entire schedule

**Response 200:** `{ "ok": true, "action": "exception_created | end_date_set | deleted" }`  
**Errors:** 400 (past date), 403, 404, 409 (has bookings, with details)

---

## Services

### GET /api/services

**Auth:** Public

| Param | Type | Description |
|-------|------|-------------|
| `withPackages` | `true` | Include active packages ordered by sortOrder |

**Response 200:** All services with subscription count and optionally packages

---

### POST /api/services

**Auth:** ADMIN only

**Body:**
```json
{
  "name": "string (required, min 1)",
  "description": "string (optional)",
  "category": "string (required, min 1)",
  "color": "string (default #3B82F6)",
  "monthlyPrice": "number (optional)",
  "dropInPrice": "number (optional)"
}
```

**Business logic:** Auto-generates `slug` from name via `slugify()`.  
**Response 201:** Created service

---

### PATCH /api/services/[id]

**Auth:** ADMIN only  
**Body:** `name`, `description`, `category`, `color`, `monthlyPrice`, `dropInPrice`, `isActive` (all optional)  
**Response 200:** Updated service

### DELETE /api/services/[id]

**Auth:** ADMIN only  
**Response 200:** `{ "success": true }`

---

### GET /api/services/[id]/packages

**Auth:** Public  
**Response 200:** Active packages ordered by `sortOrder`

---

### POST /api/services/[id]/packages

**Auth:** ADMIN only

**Body:**
```json
{
  "name": "string (min 1, required)",
  "sessions": "integer positive or null (required)",
  "validDays": "integer positive (required)",
  "memberPrice": "number min 0 (required)",
  "nonMemberPrice": "number min 0 (required)",
  "sortOrder": "integer (default 0)"
}
```

**Response 201:** Created package

---

### PATCH /api/services/[id]/packages/[pkgId]

**Auth:** ADMIN only  
**Body:** `name`, `sessions`, `validDays`, `memberPrice`, `nonMemberPrice`, `isActive` (all optional)  
**Response 200:** Updated package

### DELETE /api/services/[id]/packages/[pkgId]

**Auth:** ADMIN only  
**Response 200:** `{ "success": true }`

---

## Employees

### GET /api/employees

**Auth:** ADMIN, STAFF, STORE

| Param | Type | Description |
|-------|------|-------------|
| `q` | string | Case-insensitive search on firstName/lastName |

**Response 200:** Up to 20 employees `{ id, firstName, lastName, employeeTypes }` ordered by lastName

---

### POST /api/employees

**Auth:** ADMIN only

**Body:**
```json
{
  "firstName": "string (required)",
  "lastName": "string (required)",
  "email": "valid email (required)",
  "phone": "string (optional)",
  "title": "string (optional)",
  "role": "ADMIN | STAFF (required)",
  "employeeTypes": ["string (defaults to ['STAFF'])"],
  "hireDate": "string (optional)",
  "dateOfBirth": "string or null (optional)",
  "belt": "string or null (optional)",
  "certifications": "string or null (optional)",
  "taughtServiceIds": ["string (optional)"]
}
```

**Business logic:** Creates User + Employee. If orphaned user (no employee or member) exists for email, it is removed. Sends activation email. Audit: `CREATE_EMPLOYEE`.

**Response 201:** Employee record  
**Errors:** 400, 403, 409 (email in use)

---

### PATCH /api/employees/[id]

**Auth:** ADMIN only  
**Body:** Same fields as POST plus `isActive` (all optional). `employeeTypes` must have min 1 value. `taughtServiceIds` fully replaces existing.  
**Response 200:** Updated employee. Audit: `UPDATE_EMPLOYEE`.  
**Errors:** 400, 403, 404, 409

---

### POST /api/employees/[id]/resend-activation

**Auth:** ADMIN only  
**Response 200:** `{ "ok": true }`  
**Errors:** 400, 403, 404, 500

---

## Payments

### POST /api/payments

**Auth:** ADMIN, STAFF, STORE

**Body:**
```json
{
  "memberId": "string (required)",
  "subscriptionId": "string (optional)",
  "amount": "number positive (required)",
  "method": "string (optional)",
  "status": "PAID | PENDING | OVERDUE | WAIVED (default PAID)",
  "paidAt": "ISO string (optional, defaults now)",
  "notes": "string (optional)"
}
```

**Response 201:** Created payment  
**Errors:** 400, 403

---

## Ranks

### POST /api/ranks

**Auth:** ADMIN only

**Body:**
```json
{
  "memberId": "string (required)",
  "martialArt": "string (required)",
  "rank": "string (required)",
  "stripes": "integer 1-4 or null (optional)",
  "awardedAt": "ISO string (required)",
  "awardedBy": "string (optional)",
  "notes": "string (optional)"
}
```

**Response 201:** Created rank record  
**Errors:** 400, 403, 500

### PATCH /api/ranks/[id]

**Auth:** ADMIN only  
**Body:** All fields optional.  
**Response 200:** Updated rank

### DELETE /api/ranks/[id]

**Auth:** ADMIN only  
**Response 200:** `{ "success": true }`

---

## Guardian

### GET /api/guardian

**Auth:** ADMIN, STAFF, STORE

| Param | Type | Description |
|-------|------|-------------|
| `q` | string (required, min 1) | Search MEMBER-role users by email or name |

**Response 200:** Array of `{ id, name, email, member: { id, firstName, lastName } }` (up to 10)

---

### POST /api/guardian

**Auth:** ADMIN only

**Body:**
```json
{
  "email": "valid email (required)",
  "name": "string (min 1, required)"
}
```

**Business logic:** Creates a User with `role: MEMBER` and `mustChangePassword: true`. No Member record. Returns temp password in response (not emailed — for staff to relay directly).

**Response 201:** `{ "user": { id, name, email }, "tempPassword": "string" }`  
**Errors:** 400, 403, 409 (email in use)

---

## Shop

### GET /api/shop/items

**Auth:** ADMIN, STAFF, STORE

| Param | Type | Description |
|-------|------|-------------|
| `category` | DRINKS \| MERCHANDISE | Filter by category |
| `includeInactive` | `true` | Include inactive items (default: active only) |

**Response 200:** Items ordered by category then name

---

### POST /api/shop/items

**Auth:** ADMIN, STAFF, STORE

**Body:**
```json
{
  "name": "string (min 1, required)",
  "category": "DRINKS | MERCHANDISE (required)",
  "sellingPrice": "number min 0 (required)",
  "costPrice": "number min 0 (default 0)",
  "stock": "integer min 0 (default 0)",
  "photoUrl": "string max 200,000 chars (optional)"
}
```

**Response 201:** Created shop item

---

### PATCH /api/shop/items/[id]

**Auth:** ADMIN, STAFF, STORE  
**Body:** `name`, `category`, `sellingPrice`, `costPrice`, `stock`, `photoUrl` (nullable), `isActive` (all optional)  
**Response 200:** Updated item

### DELETE /api/shop/items/[id]

**Auth:** ADMIN, STAFF, STORE  
**Business logic:** Soft delete — sets `isActive: false`.  
**Response 200:** `{ "ok": true }`

---

### POST /api/shop/items/[id]/restock

**Auth:** ADMIN, STAFF, STORE

**Body:**
```json
{
  "qty": "integer min 1 (required)",
  "costPerUnit": "number (optional)",
  "supplier": "string (optional)",
  "notes": "string (optional)",
  "date": "string (optional)"
}
```

**Response 200:** Updated shop item with new stock count

---

### GET /api/shop/sales

**Auth:** ADMIN, STAFF, STORE

| Param | Type | Description |
|-------|------|-------------|
| `from` | ISO date | Start date filter |
| `to` | ISO date | End date filter |
| `category` | DRINKS \| MERCHANDISE | Filter by item category |
| `incomplete` | `true` | Show only sales missing paymentMode or receiptUrl |

**Response 200:** Sales with items (including shopItem), buyerMember, buyerEmployee, ordered newest first

---

### POST /api/shop/sales

**Auth:** ADMIN, STAFF, STORE

**Body:**
```json
{
  "items": [
    {
      "shopItemId": "string (required)",
      "quantity": "integer min 1 (required)",
      "priceAtSale": "number min 0 (required)"
    }
  ],
  "buyerMemberId": "string (optional)",
  "buyerEmployeeId": "string (optional)",
  "buyerName": "string (optional)",
  "paymentMode": "string (optional)",
  "receiptUrl": "string (optional)",
  "notes": "string (optional)"
}
```

**Business logic (transaction):**
- All items must exist and be active
- Price override: if `priceAtSale` differs from listed price by more than 0.001, `notes` must be non-empty
- Atomically decrements stock only if `stock >= quantity` (prevents negative stock)
- Creates `ShopInventoryLog` entry per item

**Response 201:** Sale with items and buyer details  
**Errors:** 400 (price override without notes), 404 (item not found), 409 (insufficient stock)

---

### PATCH /api/shop/sales/[id]

**Auth:** ADMIN, STAFF, STORE  
**Body:** `buyerMemberId`, `buyerEmployeeId`, `buyerName`, `paymentMode` (min 1 if provided), `receiptUrl`, `notes` (all optional)  
**Response 200:** Updated sale

---

### GET /api/shop/inventory-log

**Auth:** ADMIN, STAFF, STORE

| Param | Type | Description |
|-------|------|-------------|
| `shopItemId` | string | Filter by item |

**Response 200:** Up to 200 log entries with item name and category, newest first

---

### POST /api/shop/inventory-log

**Auth:** ADMIN, STAFF, STORE

**Body:**
```json
{
  "shopItemId": "string (required)",
  "type": "COUNT | ADJUSTMENT (required)",
  "quantity": "integer (required, can be negative for ADJUSTMENT)",
  "reason": "string (optional)"
}
```

**Business logic:** `COUNT` sets stock to quantity. `ADJUSTMENT` increments/decrements stock.

**Response 201:** Created log entry

---

## Auth

### POST /api/auth/forgot-password

**Auth:** Public  
**Rate limit:** 5 requests per IP per 10 minutes

**Body:** `{ "email": "string (required)" }`

**Business logic:** Always returns `{ ok: true }` regardless (prevents email enumeration). If user with password found, generates 32-byte hex token with 1-hour expiry, sends reset email via Resend.

**Response 200:** `{ "ok": true }`  
**Errors:** 400, 429 (rate limited)

---

### POST /api/auth/reset-password

**Auth:** Public

**Body:**
```json
{
  "token": "string (required)",
  "password": "string min 8 chars (required)"
}
```

**Business logic:** Validates token and expiry. Hashes new password, clears reset token, sets `mustChangePassword: false`.

**Response 200:** `{ "ok": true }`  
**Errors:** 400 (missing fields, password too short, invalid/expired token)

---

### POST /api/auth/verify-password

**Auth:** ADMIN, STAFF, KIOSK

**Body:** `{ "password": "string (required)" }`

**Business logic:** Verifies the authenticated user's own password against bcrypt hash. Used client-side before sensitive admin operations.

**Response 200:** `{ "success": true }`  
**Errors:** 400, 401, 403, 404

---

### POST /api/change-password

**Auth:** Any authenticated user

**Body:** `{ "newPassword": "string min 8 chars (required)" }`

**Business logic:** Hashes new password, sets `mustChangePassword: false`. If employee without employee number, auto-assigns `EM-00001` format on first activation.

**Response 200:** `{ "ok": true }`  
**Errors:** 400, 401

---

## Admin

### GET /api/admin/revenue

**Auth:** ADMIN only

| Param | Type | Description |
|-------|------|-------------|
| `type` | `daily` \| `monthly` (required) | Report granularity |
| `date` | YYYY-MM-DD (required for daily) | Specific day |
| `year` | integer (required for monthly) | Year |
| `month` | integer 1-12 (required for monthly) | Month |

**Business logic:** Returns PAID payments within Manila time boundaries.

**Response 200:**
```json
{
  "total": 12345.00,
  "payments": [
    {
      "id": "...",
      "memberName": "...",
      "memberNumber": "NS-00001",
      "service": "...",
      "amount": 1500.00,
      "method": "cash",
      "paidAt": "ISO string",
      "notes": "..."
    }
  ]
}
```

**Errors:** 400, 401

---

### GET /api/admin/settings/pricelist

**Auth:** Public (read) / ADMIN (write)

**Response 200:**
```json
{
  "packages": "JSON string (array of package IDs) or null",
  "order": "JSON string (array of service IDs) or null"
}
```

null values indicate the setting has never been saved; the UI falls back to showing all packages in default order.

### POST /api/admin/settings/pricelist

**Auth:** ADMIN only

**Body:**
```json
{
  "packages": "JSON string (optional) — serialized array of visible package IDs",
  "order": "JSON string (optional) — serialized array of service IDs in display order"
}
```

Persists the pricelist widget configuration to `SystemSetting`. Either field may be omitted to update only the other. Replaces any previously saved value.

**Response 200:** `{ "success": true }`  
**Errors:** 403

---

### GET /api/admin/settings/registration

**Auth:** Public

**Response 200:** `{ "message": "string" }` — current registration welcome message

### POST /api/admin/settings/registration

**Auth:** ADMIN only  
**Body:** `{ "message": "string" }`  
**Response 200:** `{ "success": true }`

---

### GET /api/admin/system-accounts

**Auth:** ADMIN only  
**Response 200:** `{ "kiosk": { email, updatedAt }, "store": { email, updatedAt } }`

### POST /api/admin/system-accounts

**Auth:** ADMIN only

**Body:**
```json
{
  "account": "kiosk | store (required)",
  "newPassword": "string min 6 (required)",
  "adminPassword": "string (required)"
}
```

**Business logic:** Verifies admin password, updates system account password.

**Response 200:** `{ "success": true }`  
**Errors:** 400, 401 (wrong admin password), 403, 404

---

### GET /api/admin/free-trial-leads

**Auth:** ADMIN, STAFF, STORE  
**Response 200:** `{ "count": number }` — count of INACTIVE members from "free-trial-registration" source

### GET /api/admin/store-pending

**Auth:** ADMIN, STAFF, STORE  
**Response 200:** `{ "count": number }` — count of sales missing paymentMode or receiptUrl

---

### GET /api/admin/notification-settings

**Auth:** ADMIN only  
**Response 200:**
```json
{
  "expiryWarningEnabled": true,
  "expiryWarningDays": 7,
  "expiredNotificationEnabled": true
}
```

### POST /api/admin/notification-settings

**Auth:** ADMIN only  
**Body:** `{ "expiryWarningEnabled": boolean, "expiryWarningDays": number, "expiredNotificationEnabled": boolean }`  
**Response 200:** `{ "ok": true }`

---

## Audit Logs

### GET /api/audit-logs

**Auth:** ADMIN only

| Param | Type | Description |
|-------|------|-------------|
| `userId` | string | Filter by user |
| `action` | string | Filter by action verb |
| `entityType` | string | Filter by entity type |
| `from` | ISO date | Start date |
| `to` | ISO date | End date |
| `limit` | integer (default 100, max 500) | Max results |
| `offset` | integer (default 0) | Pagination offset |

**Response 200:** `{ "logs": [...], "total": number }` — logs with user details, newest first

---

## Email

### GET /api/email/broadcast

**Auth:** ADMIN only  
**Response 200:** Last 50 broadcast records

### POST /api/email/broadcast

**Auth:** ADMIN only

**Body:**
```json
{
  "subject": "string (required)",
  "body": "string (required)",
  "audience": "active | inactive | specific | other",
  "memberIds": ["string (for specific audience)"],
  "serviceIds": ["string (optional, filter by active subscription)"]
}
```

**Business logic:** Batches of 50 via Resend batch API. Excludes members without user accounts or `@northsouth.local` emails.

**Response 200:** `{ "sent": number, "failed": number }`  
**Errors:** 400 (missing fields or no recipients), 403

---

### POST /api/email/send

**Auth:** ADMIN only (requires Gmail integration)

**Body:**
```json
{
  "to": "valid email (required)",
  "subject": "string (required)",
  "body": "string (required)",
  "inReplyTo": "string (optional)",
  "threadId": "string (optional)"
}
```

**Response 200:** `{ "id": "Gmail message ID", "threadId": "..." }`  
**Errors:** 400, 403, 404 (NO_INTEGRATION), 500

---

### GET /api/email/threads

**Auth:** ADMIN only (requires Gmail integration)

| Param | Type | Description |
|-------|------|-------------|
| `label` | string (default `INBOX`) | Gmail label to list |
| `limit` | integer (default 25) | Results per page |
| `pageToken` | string | Pagination token |

**Response 200:** `{ "threads": [...], "nextPageToken": string, "provider": "gmail", "connectedEmail": "..." }`  
**Errors:** 403, 404 (NO_INTEGRATION), 401 (TOKEN_EXPIRED), 500

---

### GET /api/email/thread/[id]

**Auth:** ADMIN only (requires Gmail integration)  
**Business logic:** Fetches full thread with all message bodies. Marks thread as read.  
**Response 200:** `{ "id": "...", "messages": [{ id, from, to, subject, date, html, body, snippet, labelIds, unread }] }`

---

### GET /api/email/connect

**Auth:** ADMIN only  
**Response 200:** `{ "provider": "gmail", "email": "...", "createdAt": "..." }` or `null`

### POST /api/email/connect

**Auth:** ADMIN only  
**Body:** `{ "provider": "gmail", "code": "OAuth authorization code" }`  
**Business logic:** Exchanges OAuth code, fetches user email, upserts EmailIntegration record.  
**Response 200:** `{ "success": true, "email": "..." }`  
**Errors:** 400, 403

### DELETE /api/email/connect

**Auth:** ADMIN only  
**Business logic:** Removes Gmail integration.  
**Response 200:** `{ "success": true }`

---

## SMS

### POST /api/sms/broadcast

**Auth:** ADMIN only

**Body:**
```json
{
  "message": "string (required)",
  "audience": "active | inactive | specific | other",
  "memberIds": ["string (for specific audience)"],
  "serviceIds": ["string (optional)"]
}
```

**Business logic:** Filters to members with phone numbers. Normalizes to `63XXXXXXXXXX` format. Sends via Semaphore SMS API (Philippines).

**Response 200:** `{ "sent": number, "failed": number }`  
**Errors:** 400 (missing message or no recipients with phones), 403

---

## Public Registration

### POST /api/register/initiate

**Auth:** Public  
**Rate limit:** 3 requests per IP per hour

**Body:**
```json
{
  "firstName": "string (required)",
  "lastName": "string (required)",
  "email": "string (required)",
  "phone": "string (required)"
}
```

**Business logic:** Returns `{ exists: true }` if email already registered. Creates `FreeTrialToken` (1-hour TTL), sends verification email.

**Response 200:** `{ "sent": true }` or `{ "exists": true }`  
**Errors:** 400, 429

---

### GET /api/register/verify

**Auth:** Public

| Param | Type | Description |
|-------|------|-------------|
| `token` | string (required) | Token from verification email |

**Response 200:**
```json
{ "valid": true, "firstName": "...", "lastName": "...", "email": "...", "expiresAt": "..." }
// or
{ "valid": false, "reason": "missing | not_found | used | expired" }
```

---

### POST /api/register/complete

**Auth:** Public

**Body:**
```json
{
  "token": "string (required)",
  "selections": [
    {
      "serviceId": "string",
      "scheduleId": "string",
      "classSessionId": "string",
      "date": "YYYY-MM-DD"
    }
  ]
}
```

**Business logic:** Validates token, creates User + Member (INACTIVE, no member number, source = "free-trial-registration"). For each selection: creates 1-day free trial subscription + CONFIRMED booking. Marks token used. Sends confirmation email and staff notification.

**Response 200:** `{ "success": true }`  
**Errors:** 400, 409 (email already registered)

---

### GET /api/register/classes

**Auth:** Public

| Param | Type | Description |
|-------|------|-------------|
| `kids` | `true` | Return kids classes only |

**Response 200:** Available free-trial slots for next 14 days, grouped by service:
```json
[
  {
    "serviceId": "...",
    "serviceName": "...",
    "serviceColor": "#3B82F6",
    "freePackageId": "...",
    "slots": [
      {
        "scheduleId": "...",
        "classSessionId": "...",
        "className": "...",
        "date": "YYYY-MM-DD",
        "startTime": "HH:MM",
        "endTime": "HH:MM",
        "location": "...",
        "coach": "..."
      }
    ]
  }
]
```

---

## Public Schedule

### GET /api/public/schedule

**Auth:** Public  
**Business logic:** Safe for embedding. No coach names, no internal IDs, no capacity data.  
**Response 200:** Array of `{ dayOfWeek, startTime, endTime, location, isRecurring, startDate, endDate, classDef: { name, color, classType } }`

---

## File Upload

### POST /api/upload

**Auth:** Any authenticated user  
**Content-Type:** `multipart/form-data`  
**Form fields:** `file` (image), `memberId` (string)

**Business logic:** Members may only upload for own record. Allowed types: jpg, jpeg, png, webp, gif. Uploads to Vercel Blob.

**Response 200:** `{ "url": "string" }`  
**Errors:** 400, 403, 415 (unsupported type)

---

### POST /api/upload-receipt

**Auth:** ADMIN, STAFF, STORE  
**Content-Type:** `multipart/form-data`  
**Form fields:** `file`, `memberId` (optional), `sport`, `package`, `amount`, `paymentMethod`, `lastName` (optional)

**Business logic:** Builds structured filename `MMDDYYYY_LastName_Sport_Package_PhpAmount_PaymentMethod.ext`. Uploads to Google Drive via service account. Allowed types: jpg, jpeg, png, webp, gif, pdf.

**Response 200:** `{ "id", "name", "link" (webViewLink), "imageUrl" (Drive thumbnail) }`  
**Errors:** 400, 401, 403, 415, 500, 503 (Drive not configured)

---

## Cron

### GET /api/cron/membership-notifications

**Auth:** Bearer token (`Authorization: Bearer {CRON_SECRET}`)

**Business logic:**
1. **Expiry warning** (if enabled): sends reminder to members whose subscriptions expire on `today + expiryWarningDays`
2. **Expiry notification** (if enabled): sends "membership ended" email for date-based subscriptions expiring today and session-based subscriptions exhausted today. Auto-expires date-based subscriptions past `endDate`.
3. **Auto-unfreeze**: restores PAUSED subscriptions where `frozenUntil <= now`; extends endDate by frozen duration; sets member status to ACTIVE.

**Response 200:** `{ "ok": true, "sent": number, "results": ["string"] }`  
**Errors:** 401 (missing or wrong cron secret)

---

## Library Utilities

### lib/time.ts

All date utilities use Asia/Manila timezone (UTC+8):

| Function | Returns | Description |
|----------|---------|-------------|
| `manilaDateStr(d?)` | `"YYYY-MM-DD"` | Current or given date as Manila date string |
| `todayManilaDateOnly()` | `Date` | UTC Date at Manila midnight |
| `manilaDayBoundaries(dateStr?)` | `{ start, end }` | UTC Date objects spanning the Manila calendar day |
| `manilaDayOfWeek(d?)` | `0-6` | Day of week in Manila time (0=Sun) |
| `manilaNow()` | `{ dateStr, hhmm, dayOfWeek }` | Current Manila time components |

### lib/audit.ts — `logAudit(params)`

Writes to the `AuditLog` table. Fields: `userId`, `userName`, `action`, `entityType`, `entityId`, `entityName`, `description`, `metadata`. Errors are caught and logged without throwing.

### lib/unfreeze-memberships.ts — `unfreezeMemberships(memberId)`

Unfreezes a single member's expired frozen subscriptions. Extends `endDate` by `frozenUntil - frozenAt` days, restores status to ACTIVE.
