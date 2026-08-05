# GymRM Undocumented Features
## FlowForceRM

*Features confirmed in the codebase that are not covered or are only partially covered in existing documentation.*

*Last updated: July 2026*

---

## How This List Was Created

During the July 2026 documentation audit, every API route, UI component, and schema model was reviewed. Features mentioned in the code but absent from or underrepresented in the user manual, API documentation, and database reference were recorded here.

Each entry includes the source (file path), a description, and a documentation priority.

---

## Priority: High (Should Be Documented Before Next Training)

### UF-001 — Child Member / Guardian Account Linkage

**Source:** `app/api/members/route.ts`, `prisma/schema.prisma` (Member.guardianId)

**Description:** Members can be created as child accounts linked to a guardian's account (`guardianId` FK). The guardian account can view the child's data. This flow is separate from standard member creation.

**Not documented in:** User Manual (Section 3 — Member Management)

**Recommended action:** Add a subsection: "Adding a Child Member" with the guardian linkage workflow.

---

### UF-002 — Face Recognition Check-in on Kiosk

**Source:** `app/(dashboard)/kiosk/kiosk-client.tsx`, `prisma/schema.prisma` (Member.faceDescriptor)

**Description:** The kiosk supports face recognition check-in using the browser's WebRTC camera API. The member's face descriptor (128-float array) is stored in the database. The kiosk matches live camera input against stored descriptors. Members must have their face enrolled before this can work.

**Not documented in:** User Manual (kiosk section mentions QR code only), API documentation

**Recommended action:** Document the face enrollment process for members and the face recognition flow on the kiosk.

---

### UF-003 — Waiver Signing Date Recording

**Source:** `prisma/schema.prisma` (Member.waiverSignedAt), member edit form

**Description:** A waiver signing date can be recorded on each member's profile. The User Manual does not describe this field or the gym's workflow around it.

**Not documented in:** User Manual

**Recommended action:** Add to the member profile section: what the waiver date field is, how it is set, and what it means legally.

---

### UF-004 — Free Trial Lead Registration (Public Form)

**Source:** `app/api/register/`, `app/(public)/register/page.tsx`

**Description:** A public registration form at `/register` allows prospective members to sign up for a free trial class. The form is rate-limited (3 submissions/IP/hour). A confirmation email is sent to the registrant; a notification email is sent to staff. Staff must convert the lead to a full member manually.

**Not documented in:** User Manual (briefly mentioned but no step-by-step), Trainer Guide

**Recommended action:** Document the full lead flow: public form → confirmation email → staff notification → how staff converts the lead to a member in GymRM.

---

### UF-005 — SMS Broadcast via Semaphore

**Source:** `app/api/sms/broadcast/route.ts`, `lib/semaphore.ts`

**Description:** The Communications module supports SMS broadcast to members via the Semaphore provider (Philippine SMS gateway). Philippines numbers only. The feature is functional but not mentioned in the User Manual's Communications section.

**Not documented in:** User Manual (Section 14 — Communications)

**Recommended action:** Add SMS broadcast workflow to the Communications section. Include note about Philippines-only number requirement.

---

## Priority: Medium

### UF-006 — Automated Membership Expiry Notifications (Cron)

**Source:** `app/api/cron/`, email notification templates

**Description:** A cron job sends automated emails to members when their memberships are expiring. The triggers (how many days before expiry, what the email says) are in the cron handler but not documented.

**Not documented in:** User Manual, API documentation

**Recommended action:** Document: when automatic emails fire, what they say, and how members can expect to receive them.

---

### UF-007 — Gmail Per-User OAuth Integration

**Source:** `app/api/email/connect/route.ts`, `app/(dashboard)/admin/communications/`

**Description:** Each admin account connects their own Gmail via OAuth to read member email threads. Threads where the member's email appears are surfaced in the Communications tab. This is per-user, not a shared inbox.

**Partially documented in:** User Manual mentions Gmail integration exists, but does not explain the per-user OAuth flow or limitations.

**Recommended action:** Expand the Communications section with: how to connect Gmail, what "per-user" means in practice, and what happens if the token expires.

---

### UF-008 — Class Capacity Enforcement

**Source:** `app/api/bookings/route.ts`, `ClassSchedule.capacity`

**Description:** Class bookings are rejected when the class is at capacity. The capacity is set per schedule. There is no waitlist. The error message is not described in the troubleshooting guide.

**Not documented in:** Troubleshooting Guide, User Manual (class booking section)

**Recommended action:** Add to Troubleshooting Guide: "Member cannot book a class — class is full" scenario.

---

### UF-009 — Inventory Adjustment Log

**Source:** `app/api/shop/inventory/route.ts`, `InventoryLog` model

**Description:** Every stock change (sale, restock, manual adjustment) creates an `InventoryLog` entry with a type (`SALE`, `COUNT`, `ADJUSTMENT`) and a delta. Admins can view the log per item. Not mentioned in the User Manual's Store section.

**Not documented in:** User Manual

**Recommended action:** Add a brief mention of the inventory log to the Store section with how to access it.

---

### UF-010 — Store Sale "Incomplete" Flag

**Source:** `app/api/shop/sales/route.ts`, `Sale.isIncomplete`

**Description:** If a sale is started but not fully paid (e.g., partial payment scenario), it can be marked as incomplete. The store sales report has an "incomplete" filter. This flag's meaning and the workflow around it are not documented.

**Not documented in:** User Manual (Store section), API documentation

**Recommended action:** Clarify: what triggers an incomplete sale, how staff resolves it, and how it appears in the report.

---

## Priority: Low

### UF-011 — Booking `ATTENDED` vs `CONFIRMED` Status Flow

**Source:** `Booking.status`, `app/api/checkins/attend/route.ts`

**Description:** Class bookings go through: `CONFIRMED` (booked, not yet attended) → `ATTENDED` (coach/staff marked attendance) → session deducted. The manual describes check-in but not the distinction between booking statuses.

**Not documented in:** User Manual

**Recommended action:** Add a brief status flow diagram to the Schedule section.

---

### UF-012 — Employee Subscription (at Employee Rate)

**Source:** `Subscription.employeeId`, revenue report

**Description:** Subscriptions can be linked to an employee instead of a member, representing an employee benefit (gym access at employee rate). These now appear in the revenue report with "(Staff)" label (added July 2026). The workflow for creating an employee subscription is not documented.

**Not documented in:** User Manual

**Recommended action:** Add to Employee Management section: how to assign a subscription to an employee account.

---

### UF-013 — `nextBillDate` Field Is Informational Only

**Source:** `Subscription.nextBillDate`, resolved OQ-013

**Description:** The `nextBillDate` field is stored and shown on subscriptions but is not automated. It is set to `startDate + 1 month` on creation and never updated automatically. Staff should understand this is a reference field, not an automated billing trigger.

**Partially documented in:** Open Questions (OQ-013 resolved as informational)

**Recommended action:** Add a note in the User Manual's Memberships section clarifying that `nextBillDate` is informational and does not trigger automatic payments.

---

### UF-014 — KIOSK Session Never Expires

**Source:** `lib/auth.ts` — KIOSK role JWT, kiosk account

**Description:** The kiosk account uses a special non-expiring session so the tablet at the gym entrance never gets logged out. This is by design. Staff should not use the kiosk login as their own work account.

**Not documented in:** User Manual

**Recommended action:** Add a brief note to the Kiosk section explaining the non-expiring session design.

---

## Backlog

These are lower-confidence findings that require further investigation before documenting:

| ID | Area | Finding |
|----|------|---------|
| UF-B01 | Schedule | `ClassSession.startsAt` / `endsAt` fields — exist in schema, unused in UI (see OQ-005) |
| UF-B02 | Reports | Monthly revenue report aggregation logic — confirmed Manila timezone, details not documented |
| UF-B03 | Auth | Password reset token 1-hour expiry — confirmed in code, not described to members |
| UF-B04 | Web Integration | `/embed/schedule` — the embeddable schedule widget endpoint, not documented |

---

*FlowForceRM — Undocumented Features v2.0 — July 2026*
