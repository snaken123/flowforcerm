# GymRM Hands-On Training Workbook
## FlowForceRM — Staff Training Exercises

*Last updated: July 2026*

---

## How to Use This Workbook

Complete each exercise in order. Use the test accounts provided by your trainer:
- **Admin account:** `admin@mygym.com` / `admin123`
- **Staff account:** `staff@mygym.com` / `staff123`

All exercises use fictional data. Do not practice on real member records.

Check the box next to each step as you complete it. At the end of each exercise, verify your expected result matches what you see on screen. If something goes wrong, refer to the Troubleshooting Guide or ask your trainer.

---

## Exercise 1 — Register a New Member
**Difficulty:** Beginner | **Estimated time:** 10 minutes | **Required role:** Staff or Admin

### Scenario
A new athlete, Maria Santos, has just walked into the gym for the first time. She wants to sign up.

### Objective
Add Maria Santos as a new member in GymRM.

### Steps
- [ ] 1. Log in as Staff at `flowforcerm.com`
- [ ] 2. Click **Athletes** in the left sidebar
- [ ] 3. Click the **Add Athlete** button (top right)
- [ ] 4. Enter First Name: `Maria`
- [ ] 5. Enter Last Name: `Santos`
- [ ] 6. Enter Email: `maria.santos.training@demo.com`
- [ ] 7. Enter Date of Birth: `1995-03-15`
- [ ] 8. Enter Phone: `09171234567`
- [ ] 9. Leave all other fields blank for now
- [ ] 10. Click **Save**

### Expected Result
Maria Santos appears in the Athletes list. A member number has been auto-assigned in the format `NS-XXXXX`. Her status is **INACTIVE** (no active membership yet).

### Reflection Questions
1. Where did you find the member number that was assigned?
2. What does the INACTIVE status tell you about this member?

---

## Exercise 2 — Assign a Membership and Log a Payment
**Difficulty:** Beginner | **Estimated time:** 15 minutes | **Required role:** Staff or Admin

### Scenario
Maria Santos wants to join the Gym Use program. She is paying ₱1,500 cash for a 1-month membership.

### Objective
Assign a Gym Use subscription to Maria Santos and record the payment.

### Steps
- [ ] 1. Go to **Athletes** → search `Maria Santos` → click **View**
- [ ] 2. Click **Assign Membership**
- [ ] 3. Select Service: **Gym Use**
- [ ] 4. Select a package (choose any monthly option)
- [ ] 5. Set Start Date: today's date
- [ ] 6. Set Payment Amount: `1500`
- [ ] 7. Set Payment Method: **Cash**
- [ ] 8. Click **Save**
- [ ] 9. Verify the subscription now appears on Maria's profile
- [ ] 10. Click **Log Payment** on the subscription card
- [ ] 11. Confirm the payment record appears in the payments list

### Expected Result
Maria's profile shows:
- One active **Gym Use** subscription
- Status changed to **ACTIVE**
- One payment record of ₱1,500 Cash

### Reflection Questions
1. What would happen if you assigned a second Gym Use membership without removing the first?
2. Could you assign a membership without logging a payment?

---

## Exercise 3 — Manual Check-in
**Difficulty:** Beginner | **Estimated time:** 5 minutes | **Required role:** Staff or Admin

### Scenario
Maria Santos arrives at the gym for her first visit. She does not have her phone to show the QR code.

### Objective
Check Maria in manually from the front desk.

### Steps
- [ ] 1. Click **Staff Check-in** in the left sidebar
- [ ] 2. Type `Maria Santos` in the search box
- [ ] 3. Click **Check In** next to her name
- [ ] 4. Confirm the check-in success message

**Now test the duplicate guard:**
- [ ] 5. Type `Maria Santos` again and try to check her in a second time
- [ ] 6. Observe the warning: "Already checked in today"
- [ ] 7. Click **Cancel** (do not confirm the second check-in)

### Expected Result
- First check-in: success
- Second attempt: warning dialog appears, asking for confirmation
- Check-in count on Dashboard increases by 1

### Reflection Questions
1. When would you confirm a second check-in for the same day?
2. How would Maria check in herself if she had her phone?

---

## Exercise 4 — Record a Store Sale
**Difficulty:** Beginner | **Estimated time:** 5 minutes | **Required role:** Staff, Admin, or Store

### Scenario
Maria buys a Gatorade (₱50) and a water bottle (₱25) after her workout. She is paying with GCash.

### Objective
Record the sale in the Store POS.

### Steps
- [ ] 1. Click **Store** in the left sidebar
- [ ] 2. Click **Gatorade** to add it to the cart (₱50)
- [ ] 3. Click **Water 1 liter** to add it to the cart (₱25)
- [ ] 4. Verify the cart total shows ₱75
- [ ] 5. Select payment mode: **eWallet**
- [ ] 6. Select sub-type: **GCash**
- [ ] 7. Click **Record Sale**

**Now try an intentional error:**
- [ ] 8. Add another item to the cart
- [ ] 9. Select **Bank Transfer** but do NOT select a sub-type (BDO or BPI)
- [ ] 10. Try to click **Record Sale** — observe the validation error
- [ ] 11. Select **BDO** and complete the sale

### Expected Result
- First sale: recorded successfully, cart clears, inventory decrements
- Second attempt without sub-type: form shows a validation error and does not proceed

### Reflection Questions
1. What happens to the stock count after the sale?
2. Where would you go to restock Gatorade if it runs out?

---

## Exercise 5 — Edit a Subscription's End Date
**Difficulty:** Intermediate | **Estimated time:** 10 minutes | **Required role:** Admin

### Scenario
Maria Santos was sick for two weeks in March. The gym owner has agreed to extend her Gym Use membership by 14 days.

### Objective
Extend Maria's Gym Use end date by 14 days.

### Steps
- [ ] 1. Go to **Athletes** → search `Maria Santos` → click **View**
- [ ] 2. Locate the Gym Use subscription card
- [ ] 3. Click the **pencil (edit) icon** on the subscription card
- [ ] 4. Note the current **End Date**
- [ ] 5. Change End Date to 14 days later
- [ ] 6. Select edit reason: **Medical/injury extension**
- [ ] 7. Add a note: `Extended 14 days — illness March 2026`
- [ ] 8. Click **Save**
- [ ] 9. Confirm the new end date appears on the subscription card

### Expected Result
End date extended by 14 days. The subscription remains ACTIVE. Edit reason and note are stored.

### Reflection Questions
1. What happens if you accidentally set the end date to before the start date?
2. Why does the system require an edit reason?

---

## Exercise 6 — Freeze and Unfreeze a Membership
**Difficulty:** Advanced | **Estimated time:** 15 minutes | **Required role:** Admin

### Scenario
Maria Santos is traveling abroad for 3 weeks and wants her membership frozen.

### Objective
Freeze Maria's membership and then restore it.

### Steps
**Freeze:**
- [ ] 1. Go to Maria Santos' athlete detail page
- [ ] 2. Click **Freeze All** button
- [ ] 3. Enter Reason: `Traveling abroad — 3 weeks`
- [ ] 4. Set Freeze From: today's date
- [ ] 5. Set Freeze Until: 21 days from today
- [ ] 6. Enter your admin password to confirm
- [ ] 7. Click **Confirm Freeze**
- [ ] 8. Observe Maria's status changes to **FROZEN**
- [ ] 9. Observe the subscription's end date has been extended by 21 days

**Unfreeze:**
- [ ] 10. Click **Remove Freeze** on Maria's profile
- [ ] 11. Enter Reason: `Member returned early`
- [ ] 12. Enter admin password → Confirm
- [ ] 13. Observe status returns to **ACTIVE**

### Expected Result
- During freeze: status FROZEN, end date extended
- After unfreeze: status ACTIVE, end date remains extended

### Reflection Questions
1. What is the purpose of extending the end date during a freeze?
2. What would happen if you unfroze without the admin password?

---

## Exercise 7 — Send a Broadcast Email
**Difficulty:** Intermediate | **Estimated time:** 10 minutes | **Required role:** Admin

### Scenario
The gym is hosting a special event and wants to notify all active members.

### Objective
Compose and send a broadcast email.

### Steps
- [ ] 1. Click **Communications** in the sidebar
- [ ] 2. Click **New Broadcast**
- [ ] 3. Enter Subject: `Training Exercise — Do Not Reply`
- [ ] 4. Enter Body: `This is a training exercise. Please ignore.`
- [ ] 5. Set Recipients: **Active Members**
- [ ] 6. **Stop here — do NOT click Send.** (In a training environment, we do not send real emails)
- [ ] 7. Review the recipient count shown on the form
- [ ] 8. Click Cancel

### Expected Result
You can see how many members would receive the email. No email was sent.

### Reflection Questions
1. What is the difference between sending to "All" vs "Active"?
2. Where would you go to see past broadcasts?

---

## Exercise 8 — View the Activity Log
**Difficulty:** Intermediate | **Estimated time:** 5 minutes | **Required role:** Admin

### Scenario
You want to verify that a staff member performed a specific action.

### Objective
Find the check-in record from Exercise 3 in the Activity Log.

### Steps
- [ ] 1. Click **Activity Logs** in the sidebar
- [ ] 2. Filter by Action Type: **CHECK_IN** (or similar)
- [ ] 3. Find the entry for Maria Santos' check-in from Exercise 3
- [ ] 4. Note what information is recorded: who did it, when, and what the result was

### Expected Result
The log shows the check-in event with timestamp, the acting user's name, and the member name.

### Reflection Questions
1. Can an admin delete an activity log entry?
2. Why is an immutable log important for a gym?

---

## Self-Assessment Checklist

After completing all exercises, confirm you can perform these tasks independently:

| Skill | Confident | Need Practice |
|-------|-----------|---------------|
| Add a new member | | |
| Assign a membership | | |
| Log a payment | | |
| Manually check in a member | | |
| Handle a duplicate check-in warning | | |
| Record a store sale with eWallet | | |
| Edit a subscription end date | | |
| Freeze and unfreeze a membership (admin) | | |
| View the activity log | | |

---

*FlowForceRM — GymRM Training Workbook v2.0 — July 2026*
