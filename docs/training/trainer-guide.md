# GymRM Trainer Guide
## FlowForceRM — Staff Training Facilitator Reference

*Last updated: July 2026*

---

## Purpose

This guide is for the person running the GymRM staff training session. It provides slide-by-slide objectives, talking points, expected questions, demonstration guidance, estimated times, and common mistakes to watch for.

---

## Before the Session

### Setup Checklist
- [ ] Projector or screen sharing is working
- [ ] Demo environment is accessible at `flowforcerm.com`
- [ ] Test accounts are confirmed working:
  - Admin: `admin@mygym.com` / `admin123`
  - Staff: `staff@mygym.com` / `staff123`
- [ ] Kiosk tablet is available for live demonstration (optional)
- [ ] Trainees have received login credentials for their accounts
- [ ] Workbooks are printed or shared digitally
- [ ] Break schedule is announced (recommend: 5-min break every 45 minutes)

### Session Duration
**Full onboarding:** 4–5 hours including breaks and hands-on exercises
**Refresher:** 1.5–2 hours covering Modules 1–4 only

---

## Module 1 — Introduction & System Overview
**Estimated time: 20 minutes**

### Objectives
- Trainees understand what GymRM is and why the gym uses it
- Trainees understand what their login role can and cannot do

### Talking Points
- GymRM replaces paper logs, spreadsheets, and ad-hoc tools
- Every action is logged — this protects staff and management
- Different roles see different menus — show this by logging in as both admin and staff
- The system is used simultaneously by front desk, kiosk, and store terminal

### Live Demonstration
1. Open `flowforcerm.com` on the projector
2. Log in as Admin — show the full sidebar
3. Log out and log in as Staff — show what disappears (Reports, Settings, Web Integration)
4. Show the Dashboard metrics (today's check-ins, expiring memberships)

### Expected Questions

**"Can staff accidentally delete a member?"**
No. Delete Member is admin-only and requires password confirmation.

**"What if I'm logged in on two devices?"**
Each session is independent. You can be logged in on your phone and a computer simultaneously.

### Common Trainer Mistakes
- Do not use a live member's data for the demo — use the test account
- Do not skip the role comparison — new staff often do not realize their account is limited

---

## Module 2 — Member Management
**Estimated time: 45 minutes**

### Objectives
- Trainees can find, add, edit, and manage members
- Trainees understand member statuses and when to use each
- Trainees can assign a membership and record a payment

### Talking Points
- Member numbers are permanent and auto-assigned (`NS-XXXXX` format)
- Guest members have no portal access — they cannot check in with QR code
- Child members link to a guardian account
- The system warns before assigning a duplicate membership

### Live Demonstration
1. **Find a member** — search by partial name, show result list
2. **Add a member** — create `Test Member` with `testmember@demo.com`
3. **Assign a membership** — Service: Gym Use → Package → Pricing → Payment method → Save
4. **Log a payment** — add a second payment to the same subscription
5. **Edit dates** — change the end date and show the edit reason dropdown
6. **Show member statuses** — filter the member list by FROZEN to show who is on hold

### Hands-On Exercise
Trainees add a fictional member with full details. Then they assign a Boxing membership and log a ₱1,500 cash payment. Allow 10 minutes.

### Expected Questions

**"What is the difference between Sessions Total and Sessions Used?"**
Total is what was purchased; Used is how many have been consumed. Remaining = Total − Used.

**"Can we have two members with the same name?"**
Yes. The system does not enforce unique names. Member numbers distinguish duplicates.

**"What happens if the end date passes but sessions remain?"**
The subscription expires by date. Unused sessions are forfeited unless staff extends the end date.

### Common Mistakes by New Staff
- Forgetting to log the payment after assigning the membership (membership is created even without a payment record — payment logging is separate)
- Setting end date to a past date accidentally

---

## Module 3 — Check-ins
**Estimated time: 30 minutes**

### Objectives
- Trainees can manually check in a member
- Trainees understand the kiosk flow
- Trainees know how to handle a duplicate check-in warning

### Talking Points
- Staff Check-in is for manual front-desk check-in
- The kiosk is self-service — members scan their QR code or type their member number
- The same-day duplicate guard prevents double-counting but can be overridden
- Walk-in check-ins do not deduct sessions — only class bookings do

### Live Demonstration
1. **Staff check-in** — check in "Test Member" via Staff Check-in sidebar
2. **Attempt duplicate** — check in the same member again; show the warning dialog
3. **Show Dashboard** — how the Today's Check-ins counter incremented
4. **Kiosk demo** (if tablet available) — show the QR code scan flow on the Athlete ID page

### Expected Questions

**"What if a member doesn't have their phone for the QR code?"**
They can enter their member number manually on the kiosk, or staff can check them in from the front desk.

**"Does check-in automatically deduct a session?"**
Walk-in check-ins do not deduct sessions. Only class attendance (CONFIRMED → ATTENDED) deducts sessions.

---

## Module 4 — Class Schedule
**Estimated time: 45 minutes**

### Objectives
- Trainees understand recurring vs one-time schedules
- Trainees can view, add, and cancel class occurrences
- Trainees understand the three edit scopes

### Talking Points
- Classes repeat weekly — one schedule record drives many calendar slots
- Cancelling a single occurrence does not affect the rest of the series
- The three edit scopes: "Just this session" / "This and succeeding" / "All sessions" — default to "Just this session" unless you mean to change more
- Coaches see only their own classes

### Live Demonstration
1. **View schedule** — show the weekly calendar view with class slots
2. **Cancel one class** — click a slot, cancel just this occurrence, verify next week is unchanged
3. **Add a class** — Add Class → fill in day, time, coach, service, capacity
4. **Coach view** — log in as a coach; show only their classes appear

### Edit Scope Decision Tree (draw on whiteboard)
```
Q: Does this change apply to:
  Just today? → "Just this session"
  Today + all future? → "This and succeeding"
  All sessions including past? → "All sessions" (use rarely)
```

### Expected Questions

**"What if I accidentally choose 'All sessions' and change something I didn't mean to?"**
Edit the schedule again with the correct values. The system does not log schedule edit history beyond the Activity Log.

**"Can a member be in two classes at the same time?"**
The system does not prevent this. It is a front-desk responsibility to catch scheduling conflicts.

---

## Module 5 — Store (Point of Sale)
**Estimated time: 30 minutes**

### Objectives
- Trainees can record a complete store sale
- Trainees know how to handle payment sub-types and special pricing
- Trainees can check inventory levels

### Talking Points
- Store role has its own login — the store terminal typically stays logged into the `store@` account
- Bank Transfer and eWallet require a sub-type — missing this blocks the sale
- Special pricing is available but requires a justification note
- Receipts can be photographed and uploaded to Google Drive after the sale

### Live Demonstration
1. **Record a sale** — add Gatorade (₱50) + Water (₱25) → select GCash (eWallet) → Record Sale
2. **Special price** — add an item, click it in the cart, change the price, enter justification
3. **Payment sub-type** — show what happens if you click Record Sale without selecting a sub-type (validation error)
4. **Inventory** — Admin: show Inventory page, current stock levels, Adjustment and Restock functions

### Expected Questions

**"What is 'Class Pass' as a payment method?"**
It is a note that the member is paying via a prepaid class pass. There is no automated deduction — staff log it manually.

---

## Module 6 — Reports & Administration (Admin Only)
**Estimated time: 30 minutes**

### Objectives
- Admin trainees understand revenue reports and date ranges
- Admin trainees can access Activity Logs
- Admin trainees understand Web Integration settings

### Talking Points
- Revenue report uses Manila timezone (UTC+8) — always
- Employee payments now appear in revenue with "(Staff)" label
- Activity Log is immutable — every admin and staff action is recorded forever
- Web Integration controls what appears on the public website (pricelist widget, schedule widget)

### Live Demonstration
1. **Revenue report** — select today's date, show the revenue breakdown
2. **Export CSV** — download and open in Excel/Sheets
3. **Activity Log** — filter by action type "DELETE" to see sensitive actions
4. **Web Integration** — show the pricelist visibility controls

---

## Module 7 — Hands-On Practice
**Estimated time: 60 minutes**

Use the exercises from the **Hands-On Training Workbook**. Each trainee should complete:
- Exercise 1: New member registration (Beginner)
- Exercise 2: Membership assignment + payment (Beginner)
- Exercise 3: Manual check-in + duplicate handling (Beginner)
- Exercise 4: Store sale with eWallet (Intermediate)
- Exercise 5: Freeze and unfreeze a membership (Advanced — admin only)

Allow trainees to work individually. Circulate to assist. Do not give answers — ask guiding questions.

---

## Closing (15 minutes)

### Review
- Ask trainees to explain back: "How do you freeze a membership?"
- Ask: "What does the kiosk 30-minute cooldown protect against?"
- Ask: "What are the three schedule edit scopes and when do you use each?"

### Resources
- User Manual: `docs/user-manual.md`
- Quick Reference Guides: `docs/training/quick-reference-guides.md`
- FAQ: `docs/training/faq.md`
- Troubleshooting Guide: `docs/training/troubleshooting-guide.md`
- Live app: `flowforcerm.com`

### Questions from Trainees
Record any questions that cannot be answered during the session and escalate to admin.

---

## Appendix: Handling Difficult Scenarios During Training

| Scenario | How to Handle |
|----------|--------------|
| Trainee deletes test data | Reassure them — the test account is for training. Reset as needed. |
| Trainee cannot log in | Check email/password carefully; try the "Forgot password?" flow |
| System is slow during demo | Explain it may be the training environment; move on; revisit later |
| Trainee asks about a feature not in scope | "Good question — that's covered in the admin-level training" |
| Trainee makes an error on a real member record | Admin must correct it. Emphasize using the test account during training. |

---

*FlowForceRM — GymRM Trainer Guide v2.0 — July 2026*
