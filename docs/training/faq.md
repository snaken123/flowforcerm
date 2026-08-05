# GymRM Frequently Asked Questions
## NorthSouth Fight Sports — Staff & Member FAQ

*Last updated: July 2026*

---

## General

**Q: What is GymRM?**
GymRM is NorthSouth Fight Sports' member management platform. It tracks memberships, class schedules, check-ins, payments, and store sales for the gym.

**Q: How do I access it?**
Go to **app.northsouth.com.ph** in any web browser. It works on phones, tablets, and computers.

**Q: What are the different login roles?**
- **Admin** — full access to everything
- **Staff** — member management, check-ins, store, schedule viewing
- **Coach** — their own class schedule and attendance only
- **Member** — their profile, schedule, and billing only
- **Kiosk** — check-in tablet only
- **Store** — store POS only

---

## Members

**Q: How do I add a new member?**
Go to **Athletes** → **Add Athlete**. Enter First Name, Last Name, and Email (optional). A member number is auto-assigned in `NS-XXXXX` format.

**Q: What's the difference between a Guest Member and a regular member?**
Guest members do not have a login account. They cannot access the member portal or check in with a QR code. They can still be assigned memberships and checked in manually by staff.

**Q: Can a member have more than one active membership at the same time?**
Yes. A member can have multiple active subscriptions across different services. If you assign a duplicate (same service already has an active membership), the system shows a warning and asks you to confirm.

**Q: How do I freeze a member's memberships?**
Go to the athlete's detail page → **Freeze All**. Enter the reason, the freeze date range, and your admin password. All active subscriptions are frozen and end dates are extended automatically.

**Q: How do I delete a member?**
Admin only. Athlete detail page → **Delete Member**. Enter the reason and admin password. This is permanent — all data is removed. Consider setting the status to **CANCELLED** instead if you may need the history later.

**Q: A member's email address changed. How do I update it?**
Staff cannot update the email address tied to a login account. Contact an admin. The admin updates it in the member edit form.

**Q: A member forgot their password. What do I do?**
Ask them to go to the login page and click **"Forgot password?"**. They'll receive a reset link at their email. If they can't access that email, contact an admin.

**Q: What do the member statuses mean?**
- **ACTIVE** — currently training, all good
- **INACTIVE** — account exists but no active memberships
- **FROZEN** — memberships on hold
- **CANCELLED** — left the gym; kept for history

---

## Memberships & Subscriptions

**Q: What is a Service vs a Package?**
A **Service** is a program (e.g., Brazilian Jiu-Jitsu). A **Package** is a pricing option within that service (e.g., 10 sessions for ₱3,500 or 1 month unlimited for ₱2,000).

**Q: A member says they have sessions remaining but can't check in. Why?**
Several possibilities:
1. The subscription end date has passed (expired by date even if sessions remain)
2. The subscription status is EXPIRED, FROZEN, or CANCELLED
3. They're trying to check in to a class that requires a different service than what their subscription covers
4. They already checked in today (same-day duplicate guard)

**Q: How do I extend a subscription end date?**
Admin only. Athlete detail → subscription card → **Edit** (pencil icon). Update the end date. You must select an edit reason from the dropdown.

**Q: Can I add session credits to an existing subscription?**
Yes, same edit flow. Increase the Sessions Total. The system recalculates remaining sessions automatically.

**Q: What is a "Free Trial" membership?**
Some services have free trial registration enabled. A prospective member fills in a form on the gym's website and gets a trial class. Staff converts them to a full paid member afterward.

**Q: The subscription shows EXPIRED but the member still has sessions remaining. What happened?**
If the end date passed, the subscription expires regardless of remaining sessions. Create a new subscription for the member.

---

## Check-ins

**Q: How do I check in a member manually?**
Go to **Staff Check-in** (sidebar) → type the member's name → click **Check In**.

**Q: The system says the member "already checked in today." What should I do?**
This is a duplicate guard. If it is a genuine second visit, confirm the dialog to proceed. If it is an error, dismiss it — the member is already checked in.

**Q: What is the kiosk?**
The kiosk is a tablet at the gym entrance running the self-service check-in screen. Members show their QR code (from the Athlete ID page on their phone) or enter their member number to check in without staff assistance.

**Q: The kiosk is not accepting check-ins. What do I do?**
1. Verify the tablet is logged in (should show the kiosk screen)
2. Check internet connectivity
3. Try a manual check-in from the Staff Check-in page while you troubleshoot

**Q: How do I see how many people are in the gym right now?**
Check the **Dashboard** → **Today's Check-ins** count. This shows all check-ins for today.

---

## Class Schedule

**Q: How do I cancel a single class occurrence without affecting future weeks?**
Go to **Schedule** → click the class slot → **Cancel This Class**. This creates a one-time exception for that date only. The recurring schedule continues the following week.

**Q: How do I cancel all future occurrences of a class?**
Edit the schedule → choose scope **"This and succeeding sessions"** → delete. This ends the recurring series from that date forward.

**Q: A class is full. Can I still add a member to it?**
The system enforces capacity limits at booking. An admin can override by editing the class capacity.

**Q: Can a member book a class themselves?**
Members can view the schedule and book from the **My Schedule** page on their member portal.

---

## Payments & Revenue

**Q: What payment methods are accepted?**
Cash, GCash, Credit Card, Bank Transfer (BDO / BPI), eWallet (GCash / Maya), Class Pass.

**Q: Do I need to select a sub-type for Bank Transfer and eWallet?**
Yes. When you select **Bank Transfer**, you must also choose BDO or BPI. When you select **eWallet**, you must choose GCash or Maya. The system will not save the payment without a sub-type.

**Q: Where do I view the revenue report?**
**Reports** (sidebar) → filter by date or month → view or export as CSV or PDF.

**Q: Can staff see financial reports?**
Yes. Staff can view Reports. Admin-only financial data (employee salary, specific audit logs) is hidden from staff.

---

## Store

**Q: How do I record a store sale?**
Store page → click items to add to cart → select payment mode → **Record Sale**.

**Q: An item is greyed out. Why?**
It is either out of stock or marked inactive by an admin. Contact admin to restock.

**Q: Can I give a discount?**
You can enter a special price for any item by clicking the item after it is in the cart. A special price requires a justification note.

**Q: How do I attach a receipt to a sale?**
After the sale is recorded, you can upload a photo of the receipt. Receipts are stored in Google Drive.

---

## Emails & Communications

**Q: How do I send an email to all members?**
**Communications** → **New Broadcast** → compose message → select recipients (All / Active / Inactive / by service) → Send.

**Q: How do I send an SMS?**
Same path — **Communications** → toggle SMS mode. Philippines numbers only.

**Q: Can I see a member's Gmail inbox?**
The email integration shows threads from the connected Gmail account where the member's email appears. Each admin connects their own Gmail; there is no shared inbox.

---

## Technical

**Q: The page is not loading. What should I do?**
1. Check internet connectivity
2. Refresh the page (F5 or Ctrl+R)
3. Clear browser cache (Ctrl+Shift+Delete → clear cached images and files)
4. Try a different browser

**Q: I see a "403 Forbidden" error.**
Your account does not have permission for that action. Contact an admin.

**Q: I see a "500 Internal Server Error."**
This is a server-side error. Note what you were doing and contact admin. Try the action again after a few minutes.

**Q: The QR code on the Athlete ID page is not scanning.**
1. Increase screen brightness on the member's phone
2. Ensure the QR code is fully visible (not cut off)
3. Use the member number manual entry on the kiosk as a backup

---

*NorthSouth Fight Sports — GymRM FAQ v2.0 — July 2026*
