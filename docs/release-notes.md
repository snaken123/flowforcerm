# GymRM Release Notes

**FlowForceRM — GymRM**

This document records significant changes to the GymRM platform, derived from the current codebase state as of July 2026.

---

## July 2026 — Security Hardening Release

This release addressed all findings from a comprehensive red-team security audit of the platform. 22 findings were remediated across critical, high, and medium severity categories.

### Critical Fixes

**Atomic session deduction (`/api/subscriptions/[id]/use-session`)**
Sessions are now decremented using a conditional `updateMany` with `sessionsUsed < sessionsTotal`. This prevents overbilling when concurrent check-ins are submitted simultaneously.

**Admin password verification for destructive operations**
Deleting a subscription, deleting a member, and freezing memberships now require the admin to re-enter their password, which is verified server-side via bcrypt before the operation proceeds.

**Database-level duplicate booking prevention**
A unique constraint `[memberId, scheduleId, scheduledDate]` was added to the `Booking` table. This enforces at the database level that no member can have two bookings for the same class on the same date, regardless of concurrent requests.

**Cross-field date validation on subscription edits**
The subscription edit endpoint now validates that `endDate` is not earlier than `startDate`, returning 400 if violated.

**Subscription deletion blocked when attendance exists**
Subscriptions with any booking history cannot be deleted. They must be cancelled instead, preserving the attendance audit trail.

### High Severity Fixes

**Walk-in duplicate check-in prevention**
The `checkins/attend` endpoint now detects same-day walk-in check-ins using Manila timezone day boundaries. Previously, walk-ins were not checked for same-day duplicates.

**STORE role blocked from subscription data**
`GET /api/subscriptions` now returns 403 for the STORE role. Store terminal staff should not have access to member financial information.

**Auto-status correction on subscription edit**
When a subscription is edited and `sessionsUsed >= sessionsTotal`, the status is automatically set to EXPIRED. If sessions are added back, the status is restored to ACTIVE.

**Inactive shop items excluded from sales**
`POST /api/shop/sales` now pre-fetches items and verifies all are `isActive: true`. Previously, soft-deleted items could be added to sales.

**Subscription notes length cap**
`notes` on subscriptions is now validated with `max(500)` to prevent unbounded text input.

**Info icon for subscription notes**
Subscription cards on the member detail page now show an info icon when notes are present, with the notes text visible on hover.

**Duplicate membership warning dialog**
Assigning a new membership when the member already has an active non-exhausted membership for the same service now shows a confirmation dialog. Staff must explicitly confirm they want to assign a duplicate.

**Date field format validation on subscriptions**
`startDate` and `endDate` now validate against `YYYY-MM-DD` regex before accepting.

### Medium Severity Fixes

**Automatic member number generation**
`POST /api/members` auto-generates member numbers in `NS-XXXXX` format, with up to 3 retries on collision. Previously, member numbers could collide under concurrent member creation.

**Cart state cleanup on item removal**
In the Store POS, removing an item from the cart now also closes and resets any open special price panel for that item.

**Combined notes on store sales**
Special price justification notes and sale-level notes are now combined as `specialNotes | saleNotes` in the `notes` field, ensuring both are preserved.

**Inventory refresh after sale**
After a successful sale, the Store POS re-fetches item inventory so stock counts are current without a page reload.

---

## July 2026 — Open Questions Resolution

Following the documentation audit, 7 open questions were resolved with code changes.

### New Features

**Free trial service flag (`freeTrialEnabled` on Service)**
Services now have a `freeTrialEnabled` boolean (default: `false`). The public free trial registration form (`GET /api/register/classes`) returns only services where this flag is `true`. Admins can toggle the flag per-service in Settings > Memberships. Existing services default to `false` and must be enabled manually.

**Same-day duplicate check-in warning on staff route**
`POST /api/checkins` now detects if the member already checked in today (Manila timezone). On a duplicate, the API returns 409 with `{ "code": "already_checked_in_today" }`. The check-in page shows a confirmation dialog; staff must confirm before a second check-in is recorded. Pass `force: true` to bypass programmatically.

**Subscription notes editable via PATCH**
`PATCH /api/subscriptions/[id]` now accepts an optional `notes` field (max 500 chars). The subscription edit dialog in the member detail page pre-populates the existing notes and allows staff to update them alongside date and session changes.

**Pricelist widget config persisted to database**
The Web Integration pricelist widget configuration (visible packages, service display order) is now stored in `SystemSetting` via `POST /api/admin/settings/pricelist`. Previously saved to `localStorage` only, the config was lost when accessing the admin panel from a different device. `localStorage` still seeds the initial render; the database value is fetched on mount and takes precedence.

**Employee payments shown in revenue report**
`GET /api/admin/revenue` now includes payments linked to employee subscriptions. These rows appear with `"FirstName LastName (Staff)"` in the member name column. Previously, employee payments were counted in the total but showed as `—` with no name.

**CheckIn → Service foreign key constraint**
`CheckIn.serviceId` is now a proper foreign key to the `Service` table with `ON DELETE SET NULL`. Previously a loose string, deleting a service could leave orphaned `serviceId` values in historical check-ins. Existing check-ins are unaffected; future service deletions will null the `serviceId` on associated check-ins.

### Security

**STORE role stripped from member detail response**
`GET /api/members/[id]` for STORE role now returns a safe subset of member fields. The `subscriptions`, `notes`, `medicalNotes`, `emergencyName`, `emergencyPhone`, and `emergencyRel` fields are excluded. Store terminal staff can confirm a member's identity without accessing financial or medical data.

---

## Pre-July 2026 — Platform Baseline

The following features were part of the platform prior to the security hardening release.

### Member Management

- Full member lifecycle: create, edit, activate, freeze, unfreeze, delete
- Guest member creation (no user account) and member accounts with email + password
- Child member creation with guardian account linkage
- Free-trial lead flow: public registration → gym staff converts to full member
- Face recognition for kiosk check-in (128-float facial descriptors stored on member)
- Member number assignment (format: `NS-XXXXX`)
- Member status management: ACTIVE, INACTIVE, FROZEN, CANCELLED
- Waiver signing with date recording

### Membership Management

- Service-based memberships with session-based or date-based packages
- Flexible package configuration: sessions, validity days, member and non-member pricing
- Multiple simultaneous memberships per member
- Freeze/unfreeze with automatic end-date extension
- Session tracking with auto-expiry on exhaustion
- Billing cycle tracking: MONTHLY, QUARTERLY, SEMI_ANNUAL, ANNUAL
- Payment records with method and status tracking

### Class Schedule

- Recurring weekly class schedule
- One-time schedule overrides
- Per-occurrence cancellation via schedule exceptions (does not affect other weeks)
- Class capacity limits with booking management
- Coach assignment to schedule slots
- Service-based class restrictions (e.g., BJJ members only)
- Class booking with session deduction on attendance

### Check-in and Attendance

- Staff-assisted check-in from the dashboard
- Kiosk check-in (KIOSK role, face recognition + member number lookup)
- Walk-in check-ins (not linked to a class)
- Booking management (CONFIRMED → ATTENDED flow)
- Session return on booking cancellation

### Store (Point of Sale)

- Product catalogue with DRINKS and MERCHANDISE categories
- Real-time stock tracking with atomic decrement on sale
- Price override with mandatory notes justification
- Receipt upload to Google Drive with structured filename
- Sale log with incomplete sale tracking
- Inventory adjustment log (COUNT and ADJUSTMENT entries)
- Restock workflow

### Reporting

- Revenue report: daily and monthly, Manila timezone boundaries
- Store sales report with category filter and incomplete sale flag

### Communications

- Gmail inbox integration for member communications
- Email broadcast (send to all/active/inactive/specific members by service)
- SMS broadcast via Semaphore (Philippines)
- Automated membership notifications via cron (expiry warnings, expiry notices)

### Web Integration

- Embeddable class schedule widget (`/embed/schedule`)
- Embeddable free-trial registration widget
- Embeddable membership pricing widget with package visibility control
- Welcome message configuration for the registration form

### Employee Management

- Employee profiles with roles (ADMIN, STAFF) and employee types (Coach, Staff, Admin)
- Coach dashboard showing today's assigned classes
- Services taught configuration
- Activation email with temporary credentials

### Special Accounts

- KIOSK system account (never-expiring sessions for the check-in tablet)
- STORE system account (restricted access for POS terminal)
- Admin password change with confirmation

### Audit Logging

- Immutable audit trail for all sensitive operations
- Filterable by user, action type, entity, and date range

### Public Registration Flow

- Rate-limited registration initiation (3/IP/hour)
- Email verification with 1-hour token
- Class selection from available free-trial slots (next 14 days)
- Confirmation email to registrant and staff notification

---

## Known Limitations

- The receipt upload integration requires a Google Drive service account with access to the configured folder ID. If not configured, receipt upload returns 503.
- Gmail integration is per-admin-user. Each admin must connect their own Gmail account. There is no shared inbox integration.
- SMS sending via Semaphore requires phone numbers to be in Philippine format. International numbers are not supported.
- Face recognition is client-side (browser WebRTC). The accuracy depends on lighting and camera quality on the kiosk device.
- The web integration pricelist visibility configuration is stored in browser localStorage, not in the database. Configuration is per-device.
