# GymRM Undocumented Features Report

**NorthSouth Fight Sports — GymRM**
*Audit date: July 2026*

This report describes features and behaviours that are present in the codebase but were previously undocumented or incompletely described. Each item is derived from reading the implementation directly.

---

## 1. Face Recognition Check-in

**What it does:** The kiosk can identify members using facial recognition without requiring them to scan a card or enter a number. When a member approaches the kiosk, the camera captures their face and the system compares the descriptor against stored vectors for all active members.

**How it works:**
- A 128-float facial embedding vector is stored per member in `Member.faceDescriptor`
- On kiosk check-in, the browser (WebRTC camera) generates the descriptor client-side
- The descriptor is compared against all descriptors returned from `GET /api/members/face-descriptors`
- The best-match member ID is sent to `POST /api/checkins/kiosk`
- Face data is stored via `POST /api/members/[id]/face` and cleared via `DELETE /api/members/[id]/face`

**Who can manage it:** ADMIN, STAFF, STORE can set or clear a member's face descriptor.

---

## 2. 30-Minute Kiosk Cooldown

**What it does:** The kiosk check-in endpoint (`POST /api/checkins/kiosk`) enforces a 30-minute cooldown. If a member has checked in within the last 30 minutes, the endpoint returns `409` with the original `checkedInAt` timestamp.

**Why this exists:** Prevents a member from accidentally checking in twice if they step away from the kiosk and return. The 30-minute window is currently hardcoded in the route handler.

---

## 3. Auto-Linking to Current Running Class (Kiosk)

**What it does:** When a kiosk check-in occurs, the system automatically links it to the current running schedule slot — but only if exactly one class matching the member's active services is running at that moment in Manila time.

**Why this matters:** If two classes are running simultaneously for the same member, the auto-link is skipped (the check-in is recorded without a schedule link). This prevents incorrect attribution.

---

## 4. Orphaned User Cleanup on Employee Creation

**What it does:** When creating a new employee with an email address, if a User record already exists for that email but is not linked to any Member or Employee (i.e., an orphaned record), the system automatically deletes the orphaned User and creates a fresh one.

**Why this exists:** This handles cases where a registration attempt was made for that email address but never completed, leaving a dangling User record.

---

## 5. Employee Number Auto-Assignment on First Password Change

**What it does:** When an employee changes their password for the first time (clearing `mustChangePassword`), if they do not yet have an `employeeNumber`, the system auto-assigns one in `EM-00001` format via the `POST /api/change-password` route.

**Why this exists:** Employees are created by admins before they log in. The employee number is assigned on first login, when the system can confirm the account is active.

---

## 6. Inactive Members Auto-Activated on Subscription Assignment

**What it does:** When a subscription is created (`POST /api/subscriptions`) for a member with `status: INACTIVE`, the system automatically:
1. Sets the member's status to `ACTIVE`
2. Assigns a member number if one is not already set

**When this applies:** Primarily for converting free-trial registrants. A trial lead arrives as INACTIVE; the first subscription assignment activates them in one step.

---

## 7. Frozen Member Subscription Inheritance

**What it does:** When a new subscription is created for a member whose status is `FROZEN`, the new subscription is automatically created with `status: PAUSED`, and `frozenAt`/`frozenUntil` are copied from the existing freeze state.

**Why this matters:** Without this, a newly assigned membership would appear ACTIVE while the member is supposed to be on hold. The inherited freeze ensures the new membership starts paused and resumes together with the member's other memberships when they unfreeze.

---

## 8. Unfreeze Auto-Extends End Date

**What it does:** When a frozen subscription is unfrozen, the `endDate` is extended by the number of days the subscription was frozen (`frozenUntil - frozenAt`). This ensures members get their full membership validity regardless of how long they were on hold.

**Implementation:** In `lib/unfreeze-memberships.ts` and in the unfreeze-all endpoint.

---

## 9. Session Return on Booking Cancellation

**What it does:** When a booking is cancelled (`DELETE /api/bookings/[id]`), if `returnSession: true` (the default) and the booking was linked to a session-based subscription, the system decrements `sessionsUsed` by 1 on that subscription.

**Safety guard:** The decrement is guarded: it only applies if `sessionsUsed > 0`. If the subscription was EXPIRED because sessions were exhausted, cancelling a booking and returning the session automatically restores the status to ACTIVE.

---

## 10. Subscription Notes Displayed as Info Icon

**What it does:** On the member detail page, if a subscription has notes, a small `ℹ` icon appears on the subscription card. Hovering over it reveals the note text as a tooltip.

**Previously undocumented:** This feature was added as part of the July 2026 security hardening release. It was not described in any UI documentation.

---

## 11. Price Override Justification Enforcement

**What it does:** In the Store POS, if any item is sold at a price different from its listed `sellingPrice` by more than ₱0.001, the `notes` field on the sale must be non-empty. The API (`POST /api/shop/sales`) returns `400` if this condition is violated.

**In the UI:** The Store POS has a special price panel per cart item. When special pricing is used, the panel requires a reason selection or custom text. These notes are concatenated with any sale-level notes as `specialNotes | saleNotes`.

---

## 12. Stock Atomicity on Sale

**What it does:** When a sale is processed, each item's stock is decremented using a conditional `updateMany({ where: { id, stock: { gte: quantity } } })`. If the update count is 0 (stock insufficient), the entire sale transaction is rolled back and a `409` is returned.

**Why this matters:** Prevents negative stock under concurrent sales, which could otherwise happen if two sales were processed simultaneously for the last unit of an item.

---

## 13. Public Registration Rate Limiting

**What it does:** The registration initiation endpoint (`POST /api/register/initiate`) is rate-limited to 3 requests per IP address per hour. The forgot-password endpoint (`POST /api/auth/forgot-password`) is rate-limited to 5 per IP per 10 minutes.

**Implementation:** Both use an in-memory rate limit map (keyed by IP). This limit resets on server restart and does not persist across Vercel function instances.

---

## 14. Free-Trial Class Availability Filter

**What it does:** The public `GET /api/register/classes` endpoint filters available trial classes to:
- Adult mode: yoga, judo, jiujitsu services with an active free/trial package
- Kids mode (when `kids=true`): judo and jiujitsu services tagged for kids

Additionally, it only shows slots for the next 14 days (starting tomorrow), excludes dates with a schedule exception, and deduplicates by schedule+date.

**Previously undocumented:** The exact service and package filtering logic was not described.

---

## 15. Email Enumeration Prevention on Forgot Password

**What it does:** The `POST /api/auth/forgot-password` endpoint always returns `{ ok: true }` regardless of whether the email exists. This prevents an attacker from enumerating valid email addresses by observing different responses.

**Implementation detail:** The reset email is only sent if a user with that email and a password (not OAuth-only) exists. The response is identical either way.

---

## 16. Denormalised Staff Name in Sales and Audit Logs

**What it does:** `ShopSale.staffName`, `ShopInventoryLog.staffName`, and `AuditLog.userName` store the staff member's display name at the time of the action, not a foreign key to the User name.

**Why this matters:** If a staff account is renamed or deleted, historical records still show the correct name at the time of the action. This is intentional for audit trail integrity.

---

## 17. Kids vs. Adult Registration Toggle

**What it does:** The public free-trial registration page has a kids/adult toggle. When kids mode is selected, `GET /api/register/classes?kids=true` is called, returning only kids-programme schedule slots.

**Previously undocumented:** The existence of the kids mode toggle on the public registration widget was not described in any documentation.

---

## 18. Broadcast History

**What it does:** Every email broadcast sent through the Communications section is recorded in the `Broadcast` table, including the subject, body, audience, recipient count, and who sent it. The broadcast log is viewable via `GET /api/email/broadcast`.

**Previously undocumented:** The existence of the broadcast history was not described in user-facing documentation.

---

## 19. Guardian Account Creation Returns Plain-Text Password

**What it does:** When creating a guardian user via `POST /api/guardian`, the API response includes the temporary password in plain text. This is intentional: guardians have no email sending in this flow, so staff must relay the password directly.

**Security consideration:** The plain-text password is returned only in the API response and is not stored. Staff should relay it to the guardian immediately and ask them to change it on first login.
