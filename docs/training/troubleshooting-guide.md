# GymRM Troubleshooting Guide
## FlowForceRM

*Last updated: July 2026*

---

## How to Use This Guide

Find your symptom in the section that matches the area of the application where the problem occurs. Each entry describes the symptom, the likely cause, and the steps to resolve it. If the steps do not resolve the issue, escalate to an admin or to GymRM support.

---

## Login & Access

### Cannot log in — page returns to login screen

**Cause:** Wrong password, inactive account, or account does not exist.

**Resolution:**
1. Confirm the email address is correct (exact match including case).
2. Use "Forgot password?" to reset the password.
3. If the member has never logged in, check that the activation email was sent and opened. Check spam folder.
4. If an employee account, confirm an admin has activated it (Settings → Employees → Activate).

---

### "403 Forbidden" error on any page

**Cause:** The account's role does not have access to that feature.

**Resolution:**
1. Confirm the correct account is logged in (check the profile icon or name).
2. If the account should have access, contact an admin to verify the role assignment.
3. Admin-only features: Reports, Settings, Activity Logs, Web Integration, Employee management.

---

### Session expires frequently

**Cause:** The browser's cookie storage is clearing on close, or the server session has timed out.

**Resolution:**
1. Do not use private/incognito mode for regular use.
2. Ensure the browser allows cookies for `flowforcerm.com`.
3. The kiosk account uses non-expiring sessions by design — check that the kiosk is logged in as the `kiosk@` account.

---

## Members

### Cannot find a member in the search

**Cause:** Misspelling, or the member is registered under a different name.

**Resolution:**
1. Try searching by the member number (NS-XXXXX format).
2. Try a partial first name only.
3. Try partial last name only.
4. If the member was recently added, try refreshing the page.

---

### Member cannot log in to the member portal

**Cause:** No user account exists (guest member), activation email not clicked, or wrong password.

**Resolution:**
1. Check the member's profile — if the **Email** field is empty, they are a guest member with no portal access.
2. If an email exists, check whether the activation link was sent. If not, re-send from the member profile.
3. If the link was clicked but they still cannot log in, they should use "Forgot password?" to reset.

---

### Delete Member button not appearing

**Cause:** Only admin accounts see this option.

**Resolution:** Log in with an admin account to delete members.

---

## Memberships & Subscriptions

### "Already has active membership" warning when assigning a new subscription

**Cause:** A duplicate-membership guard. The member has a non-exhausted subscription for the same service.

**Resolution:**
1. Review the existing subscription on the member's detail page.
2. If the new assignment is intentional (top-up, promotion), confirm the warning dialog to proceed.
3. If it is a mistake, cancel the new assignment.

---

### Subscription shows EXPIRED but member says they paid

**Cause:** Either the end date passed (date-based expiry), all sessions were used (session-based expiry), or the payment was not logged in the system.

**Resolution:**
1. Check the subscription end date and sessions remaining on the member's detail page.
2. If expired by date only and a payment was made, create a new subscription for the new billing period.
3. If payment is missing from the records, log the payment under the member's Payments tab.

---

### Sessions Remaining shows a negative number

**Cause:** A data entry error or concurrent session deduction. Should be rare after the July 2026 session-atomicity fix.

**Resolution:**
1. Admin: edit the subscription and correct the Sessions Used field.
2. Select edit reason "Admin entry error."
3. Log the correction in a note.

---

### Freeze All button asks for a password — which password?

**Cause:** This is the admin's own GymRM account password (not the member's password). It is re-entered to confirm the destructive action.

---

### End date extended incorrectly after unfreeze

**Cause:** The freeze day count is added to the end date when unfreezing. If the original end date was wrong, the extension will also be wrong.

**Resolution:**
1. Unfreeze normally.
2. Then edit the subscription's end date separately to correct it.

---

## Check-ins

### "Already checked in today" warning

**Cause:** The member has a check-in recorded for today (Manila timezone). The system is preventing a duplicate.

**Resolution:**
1. If the member genuinely visited twice, confirm the dialog — a second check-in will be recorded.
2. If it is a mistake (wrong member selected), dismiss the dialog and select the correct member.

---

### Check-in succeeds but sessions are not decrementing

**Cause:** Walk-in check-ins (not linked to a class booking) do not deduct sessions. Only class bookings deduct sessions on attendance confirmation.

**Resolution:** This is expected behavior. Walk-in check-ins are attendance records only. Sessions are deducted through the class booking flow (CONFIRMED → ATTENDED).

---

### Kiosk not scanning QR codes

**Cause:** Camera permission not granted, poor lighting, member's screen brightness too low, or the QR code is partially obscured.

**Resolution:**
1. Confirm the kiosk browser has camera permission.
2. Ask the member to increase phone screen brightness.
3. Ensure the QR code fills the scanner window without being cut off.
4. Use the manual member number entry on the kiosk as a backup.

---

### Kiosk "30-minute cooldown" error

**Cause:** The member already checked in via the kiosk within the past 30 minutes.

**Resolution:** This is an anti-fraud measure. If the member did not check in, it may be a shared device issue or a cached session. Have them check in via staff-assisted check-in at the front desk.

---

## Class Schedule

### Class slot is missing from the schedule

**Cause:** A schedule exception was created for that date, the recurring schedule was ended, or the class was not added to that day of the week.

**Resolution:**
1. Admin: go to **Schedule** and check if an exception exists for that date.
2. If a class was accidentally deleted, re-add it via **Add Class**.
3. If the series was terminated early via "This and succeeding", start a new series from today.

---

### "Cannot delete — active bookings exist"

**Cause:** Members are booked into this class. Deleting it would remove their attendance records.

**Resolution:**
1. Cancel all bookings for this class first.
2. Or change the class date/time instead of deleting it.
3. Or cancel the single occurrence (which creates an exception rather than deleting).

---

### Schedule edit applied to the wrong dates

**Cause:** Wrong scope selected when editing. "All sessions" modifies every past and future occurrence.

**Resolution:**
1. If the wrong scope was selected, reverse the change by editing again.
2. Use "Just this session" for one-off changes; "This and succeeding" for future changes from a point forward.

---

## Store

### Item is greyed out and cannot be added to the cart

**Cause:** The item is out of stock (`currentStock = 0`) or marked inactive by an admin.

**Resolution:**
1. For out of stock: admin goes to **Inventory** → **Restock** for that item.
2. For inactive: admin goes to **Inventory** → item → toggle Active to On.

---

### Payment method sub-type not appearing

**Cause:** Bank Transfer and eWallet require a sub-type selection (BDO/BPI for bank, GCash/Maya for eWallet). If the sub-type dropdown is not appearing, the initial payment mode may not have been selected.

**Resolution:** Click the payment mode button again. The sub-type radio buttons should appear beneath it.

---

### Receipt upload fails

**Cause:** Google Drive integration is required for receipt uploads. If the environment variables are not set, uploads return a 503 error.

**Resolution:** Contact admin to verify Google Drive integration is configured in the server environment. Receipt uploads are not available without a Google Drive service account.

---

## Reports

### Revenue report shows ₱0 for a date range where sales exist

**Cause:** Date range may be in the wrong timezone or the wrong month/day was selected.

**Resolution:**
1. Verify the date range using Manila timezone (UTC+8).
2. The revenue report uses Manila midnight boundaries — ensure the date selected matches the Manila calendar date, not UTC.
3. Try expanding the date range one day in each direction to see if the data appears.

---

### CSV export is blank

**Cause:** No data matches the current filter.

**Resolution:** Clear all filters and re-export. If data is still missing, check the date range.

---

## Communications

### Broadcast email not received by some members

**Cause:** The member's email may be in spam, the email address is wrong in the system, or the member's account is inactive and was filtered out.

**Resolution:**
1. Ask the affected member to check their spam/junk folder.
2. Verify the email address on the member's profile.
3. If the broadcast was sent to "Active" only, inactive members would not receive it.

---

### Gmail connection shows as disconnected

**Cause:** The Gmail OAuth token has expired or was revoked.

**Resolution:** Admin: go to **Communications** → **Connect Gmail** → re-authorize with Google. Each admin connects their own Gmail account.

---

## Performance

### Pages are loading slowly

**Cause:** Network conditions, or a large data set being loaded without filtering.

**Resolution:**
1. Check internet speed.
2. Use filters to reduce the number of records being loaded (e.g., filter member list by status or service).
3. If the problem is persistent, contact admin.

---

## Error Messages Reference

| Error | Meaning | Action |
|-------|---------|--------|
| 400 Bad Request | Invalid input data | Check all required fields; correct the input |
| 401 Unauthorized | Not logged in | Log in and retry |
| 403 Forbidden | Role does not have permission | Contact admin for access |
| 404 Not Found | Record does not exist | Verify the record was not deleted |
| 409 Conflict | Duplicate detected | Confirm dialog or correct the duplicate |
| 500 Internal Server Error | Server-side error | Try again; contact admin if persistent |
| 503 Service Unavailable | External service down (e.g., Google Drive) | Contact admin |

---

*FlowForceRM — GymRM Troubleshooting Guide v2.0 — July 2026*
