# GymRM Open Questions & Ambiguities

**NorthSouth Fight Sports — GymRM**
*Audit date: July 2026*

This document records open questions, ambiguous behaviours, and unresolved design decisions discovered during the documentation audit. Each item is a candidate for follow-up with the product owner or a future development decision.

---

## Priority: High

### ~~OQ-001 — STORE Role Can Read Subscription Data via Member Detail~~ ✓ Resolved

See Resolved Questions table below.

---

### OQ-002 — Outlook Email Integration Is Incomplete

**Context:** The `EmailIntegration.provider` field and schema comment reference `"gmail" | "outlook"` as valid values. However, the actual API implementation (`/api/email/connect`, `/api/email/threads`, `/api/email/thread/[id]`, `/api/email/send`) only handles the `gmail` case. The `outlook` branch returns a 400 error ("Unsupported provider").

**Question:** Is Outlook integration planned? If so, what is the timeline? If not, should the schema comment and validation enum be updated to remove `outlook` as an option to prevent confusion?

---

### OQ-003 — Kiosk Cooldown Duration Is Hardcoded

**Context:** The 30-minute kiosk check-in cooldown (`POST /api/checkins/kiosk`) is hardcoded in the route handler. There is no admin setting to configure it.

**Question:** Should the cooldown be configurable per the gym's needs? A busier gym might want a shorter cooldown (5-10 minutes); a quieter gym might want a longer one.

---

### ~~OQ-004 — Walk-in Duplicate Guard Not on `/api/checkins` Path~~ ✓ Resolved

See Resolved Questions table below.

---

### OQ-005 — ClassSession.startsAt / endsAt Fields Are Unused

**Context:** The `ClassSession` model has `startsAt` and `endsAt` fields, presumably for one-time event classes. No current API route or UI reads or filters on these fields for scheduling purposes.

**Question:** Are these fields intended for future use? Should they be used as the scheduling mechanism for one-time classes instead of `ClassSchedule.isRecurring = false`? If they are not going to be used, should they be removed from the schema to reduce confusion?

---

## Priority: Medium

### OQ-006 — Member Number Collision Retries May Fail Silently

**Context:** `POST /api/members` retries member number assignment up to 3 times on P2002 (unique constraint) collision. If all 3 retries fail, it returns 500. The retry interval is zero (no sleep between retries), meaning all 3 attempts are essentially simultaneous under Neon's atomic guarantees.

**Question:** Is 3 retries sufficient? At what scale does this become a reliability concern? Should the retry loop use a different strategy (e.g., exponential backoff, or a database-level sequence)?

---

### ~~OQ-007 — Free Trial Service Filter Is Hardcoded by Slug~~ ✓ Resolved

See Resolved Questions table below.

---

### OQ-008 — Rate Limiting Is In-Memory Only

**Context:** The rate limiters on `/api/register/initiate` (3/hour/IP) and `/api/auth/forgot-password` (5/10min/IP) use in-memory Maps. On Vercel, each serverless function instance has its own memory. Two requests hitting different instances will not see each other's rate limit state.

**Question:** Is the current in-memory rate limiting acceptable given the low-traffic nature of these endpoints? If not, should a Redis-based or edge-based rate limiter be implemented?

---

### OQ-009 — Broadcast History Has No Resend Capability

**Context:** `GET /api/email/broadcast` returns past broadcast records. There is no API endpoint to resend a past broadcast or to view per-recipient delivery status.

**Question:** Is resend capability needed? Should individual delivery failures be tracked per recipient?

---

### ~~OQ-010 — Subscription `notes` Field Not Editable via PATCH~~ ✓ Resolved

See Resolved Questions table below.

---

### OQ-011 — ClassScheduleException Date Is Stored as UTC Midnight

**Context:** Schedule exceptions are stored with the `date` field as a DateTime. The schedule filtering logic must convert Manila calendar dates to UTC for comparison. If the application is ever deployed in a different timezone or if UTC midnight is used inconsistently, exceptions could apply to the wrong date.

**Question:** Should exception dates be stored as a plain date string (`YYYY-MM-DD`) rather than a DateTime to avoid timezone ambiguity? This would require a schema migration.

---

## Priority: Low

### OQ-012 — No Soft Delete on Members

**Context:** `DELETE /api/members/[id]` performs a cascading hard delete (all related data is permanently removed). There is no soft delete, archive, or trash mechanism.

**Question:** Should there be a way to archive a member (keeping their history) rather than permanently deleting them? Currently the only option is setting status to CANCELLED.

---

### OQ-013 — `nextBillDate` Field Is Not Automated

**Context:** The `Subscription.nextBillDate` field is set to `startDate + 1 month` on creation. There is no cron job or trigger that updates this date as time progresses. It is a static field with no automated billing.

**Question:** Is `nextBillDate` used for anything beyond display? If GymRM is purely manual in billing (no automatic charges), should this field be retired or renamed to clarify it is informational only?

---

### OQ-014 — Receipt Upload Requires Google Drive Service Account

**Context:** Receipt uploads fail with 503 if `GOOGLE_DRIVE_FOLDER_ID`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, or `GOOGLE_SERVICE_ACCOUNT_KEY` environment variables are not set.

**Question:** Should there be a fallback storage option (e.g., Vercel Blob) for receipts when Google Drive is not configured? Currently, the Store flow degrades if these variables are missing.

---

### ~~OQ-015 — Web Integration Pricelist Config Is Not Persisted to Database~~ ✓ Resolved

See Resolved Questions table below.

---

### ~~OQ-016 — Employee Subscriptions Are Not Reported in Revenue~~ ✓ Resolved

See Resolved Questions table below.

---

### ~~OQ-017 — `CheckIn.serviceId` Is Not a Foreign Key~~ ✓ Resolved

See Resolved Questions table below.

---

## Resolved Questions

| Question | Resolution |
|----------|-----------|
| Is the Booking unique constraint live in the database? | Yes — applied July 2026 via `npx prisma db push --accept-data-loss` |
| Does the session decrement use atomic operations? | Yes — `updateMany` with conditional `sessionsUsed < sessionsTotal` |
| Is admin password verified server-side for destructive operations? | Yes — bcrypt comparison in freeze-all, unfreeze-all, delete-member, delete-subscription |
| Are walk-in duplicates checked with Manila timezone? | Yes — `manilaDayBoundaries()` used in `checkins/attend` |
| OQ-001: Can STORE role read subscription data via member detail? | Fixed — `GET /api/members/[id]` strips subscriptions, notes, medicalNotes, and emergency contact fields for STORE role |
| OQ-002: Is Outlook email integration planned? | No — Gmail only. Schema comment left as-is for reference. |
| OQ-003: Should the 30-minute kiosk cooldown be configurable? | No — hardcoded at 30 minutes, acceptable for current usage. |
| OQ-004: Should `/api/checkins` have a same-day duplicate guard? | Yes — implemented with soft warning. Returns 409 with `code: "already_checked_in_today"` on first attempt; UI shows confirmation dialog; `force: true` bypasses. |
| OQ-005: Are `ClassSession.startsAt` / `endsAt` fields used? | Kept as-is for future use. No current logic reads them. |
| OQ-006: Are 3 member number collision retries sufficient? | Yes — acceptable at current scale. |
| OQ-007: Should free trial services be database-driven? | Yes — `freeTrialEnabled` boolean added to `Service` model. Public registration form now uses this flag. Defaults to `false`; must be enabled per service. |
| OQ-008: Is in-memory rate limiting acceptable? | Yes — acceptable for low-traffic endpoints on current scale. |
| OQ-009: Is broadcast resend capability needed? | No — broadcast history remains read-only. |
| OQ-010: Should subscription `notes` be editable via PATCH? | Yes — `notes` field added to `PATCH /api/subscriptions/[id]`. Subscription edit dialog pre-populates and saves notes. |
| OQ-011: Should exception dates be stored as strings instead of DateTime? | No — UTC midnight pattern is consistently applied. Leave as-is. |
| OQ-012: Should there be a soft delete on members? | No — CANCELLED status serves this role. Hard delete is ADMIN-only and intentional. |
| OQ-013: Is `nextBillDate` used for anything beyond display? | No — informational only. No automation planned. Leave as-is. |
| OQ-014: Should receipt upload have a fallback if Google Drive is not configured? | No — Google Drive is configured in production. Leave as-is. |
| OQ-015: Should pricelist config be persisted to the database? | Yes — `POST /api/admin/settings/pricelist` stores config in `SystemSetting`. `localStorage` remains as a fast initial seed. |
| OQ-016: Should employee subscriptions appear in revenue reports? | Yes — employee payments now shown with "FirstName LastName (Staff)" label in revenue report. |
| OQ-017: Should `CheckIn.serviceId` be a proper FK? | Yes — FK added with `ON DELETE SET NULL`. Applied to database July 2026. |
