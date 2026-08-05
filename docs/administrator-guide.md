# GymRM Administrator Guide

**NorthSouth Fight Sports — GymRM**
*Version: Current as of July 2026*

---

## Table of Contents

1. [Initial Setup](#1-initial-setup)
2. [User Accounts and Roles](#2-user-accounts-and-roles)
3. [Service and Package Configuration](#3-service-and-package-configuration)
4. [Employee Management](#4-employee-management)
5. [Special System Accounts](#5-special-system-accounts)
6. [Schedule Management](#6-schedule-management)
7. [Membership Administration](#7-membership-administration)
8. [Attendance and Check-in Rules](#8-attendance-and-check-in-rules)
9. [Store Configuration](#9-store-configuration)
10. [Web Integration](#10-web-integration)
11. [Communications Setup](#11-communications-setup)
12. [Audit and Activity Logs](#12-audit-and-activity-logs)
13. [Security Recommendations](#14-security-recommendations)
14. [Operational Checklists](#15-operational-checklists)

---

## 1. Initial Setup

### First Admin Account

The first admin account is provisioned directly in the database. Subsequent admin accounts can be created through the Employees section.

### Configuring Services and Packages

Before anything else, configure your services (disciplines) and their packages (pricing tiers). These drive memberships, scheduling, and the public pricelist.

See [Section 3 — Service and Package Configuration](#3-service-and-package-configuration).

### Setting Up Staff

Create employee accounts for all staff. Assign appropriate employee types (Coach, Staff) so the system routes them to the correct dashboard.

See [Section 4 — Employee Management](#4-employee-management).

### Kiosk and Store Accounts

Set passwords for the Kiosk and Store system accounts under **Settings > Special Logins**. These accounts allow the kiosk tablet and store terminal to log in without individual staff credentials.

See [Section 5 — Special System Accounts](#5-special-system-accounts).

### Web Integration

Embed the schedule, pricelist, and free-trial registration on your website.

See [Section 10 — Web Integration](#10-web-integration).

---

## 2. User Accounts and Roles

### Roles

GymRM uses a fixed set of roles. Each user has exactly one role.

| Role | Description |
|------|-------------|
| `ADMIN` | Full access to all features. Can manage employees, delete members, and change system settings. |
| `STAFF` | Can manage athletes, memberships, schedule, and store. Cannot access admin-only settings, reports, or delete members. |
| `STORE` | Access to Athletes list and Store only. Redirected to Store on login. Cannot access subscriptions. |
| `MEMBER` | Members can only view their own data. Cannot see other members. |
| `KIOSK` | Used only by the kiosk system account. Never expires. |

### Employee Types vs. Roles

Employees have a **Role** (the system access level) and one or more **Employee Types** (their job function). An employee whose types do not include "ADMIN" or "STAFF" is treated as a **Coach** — they can log in but see only their own dashboard and schedule.

| Employee Type | Access Behaviour |
|---------------|-----------------|
| Includes ADMIN | Full admin sidebar |
| Includes STAFF | Staff sidebar |
| Neither (e.g., Coach only) | Coach dashboard + Schedule only |

### Creating Staff Accounts

1. Go to **Settings > Employees**.
2. Click **+ Add Employee**.
3. Fill in: First Name, Last Name, Email, Phone, Employee Types (multi-select), Title, Belt, Bio, Certifications, Hire Date.
4. Click **Create Employee**.

A temporary password is generated and emailed to the new employee. They will be prompted to change it on first login.

### Resending Activation

If an employee has not activated their account, click the mail icon next to their name in the employee list to resend the activation email.

### Deactivating Staff

On the employee profile, toggle **Active** status to deactivate. Deactivated employees cannot log in but their records are preserved.

---

## 3. Service and Package Configuration

**Path:** Settings > Memberships

### Services

A **Service** represents a discipline or programme (e.g., Brazilian Jiu-Jitsu, Judo, Yoga). Each service has:
- **Name** and **Slug** (unique URL identifier)
- **Category** (e.g., Martial Arts, Fitness, Kids)
- **Color** — used throughout the UI for visual identification
- **Icon** (optional)
- **Monthly Price** (optional reference price)
- **Drop-in Price** (optional)
- **Active** flag — inactive services do not appear in new membership assignments

### Packages

Each service has one or more **Packages** — the actual purchaseable options. Each package has:
- **Name** (e.g., "10 Sessions", "1 Month Unlimited")
- **Sessions** — number of sessions included (`null` = unlimited)
- **Valid Days** — how many days from the start date until the package expires
- **Member Price** — price for members (those with an annual membership or similar)
- **Non-Member Price** — standard price
- **Active** — inactive packages are not shown in the assignment UI
- **Sort Order** — controls display order

### Adding a Package

1. Go to **Settings > Memberships**.
2. Click the service to expand it.
3. Click **+ Add Package**.
4. Fill in name, sessions, valid days, member price, non-member price.
5. Save.

### Editing and Archiving

Packages cannot be deleted once used, but can be set to **inactive** to hide them from future assignments. Existing subscriptions linked to archived packages are not affected.

---

## 4. Employee Management

**Path:** Settings > Employees

### Employee List

Shows all staff with: photo, name, employee types, title, belt, active status.

### Employee Profile

Each employee profile contains:
- **Personal Info**: Name, email, phone, date of birth, hire date
- **Job Info**: Employee types (multi-select), title, bio, certifications, belt
- **Assigned Classes**: Which scheduled classes they are a coach for
- **Services Taught**: Which disciplines they are linked to as instructors
- **Subscriptions**: If staff have their own memberships (e.g., for training)
- **Payment History**

### Changing Employee Roles

Only the database or an admin-level change can modify the role assigned to a user account. Contact the system owner if a role change is needed outside the employee type system.

---

## 5. Special System Accounts

**Path:** Settings > Special Logins

Two system-level accounts exist: **Kiosk** and **Store**. These are shared credentials used on dedicated devices.

### Kiosk Account

- Email is displayed (read-only) on the settings page
- Used to log in the kiosk tablet — sessions never expire
- Change the password by entering a new password and your admin password to confirm

### Store Account

- Similar to Kiosk but for store terminals
- Grants the STORE role, giving access to Athletes and Store only

### Security Practices

- Change both passwords upon staff turnover
- Use distinct passwords from personal admin accounts
- Do not share the kiosk or store password outside necessary staff

---

## 6. Schedule Management

**Path:** Schedule (sidebar)

### Recurring vs. One-Time Slots

Schedule slots can be:
- **Recurring** — runs every week on the specified day
- **One-time** — runs on a specific date only (`isRecurring = false`)

### Cancelling a Single Occurrence

Add a **Schedule Exception** for a specific date. The slot will be hidden for that occurrence only. All other weeks are unaffected.

### Capacity Management

Each schedule slot has an optional **Max Capacity**. When the class is full, no further bookings are accepted. Staff can manually override this from the schedule card.

### Coach Assignment

Assign one or more coaches to each schedule slot. These appear on the coach's dashboard for that day.

### Allowed Services

Classes can optionally restrict which membership types are valid for booking. Configure via **Settings > Classes** on the class definition. If no services are selected, any active membership is accepted.

---

## 7. Membership Administration

### Subscription Statuses

| Status | Meaning |
|--------|---------|
| ACTIVE | Currently valid, sessions or time remaining |
| PAUSED | Frozen — time not counting, will resume |
| EXPIRED | No sessions left or past end date |
| CANCELLED | Manually cancelled |

### Session-Based vs. Date-Based

- **Session-based**: `sessionsTotal` is set; `sessionsUsed` tracks consumption. Expires when `sessionsUsed >= sessionsTotal`.
- **Date-based**: Has an `endDate`; expires when that date passes. `sessionsTotal` is null.
- **Unlimited**: No `endDate`, no `sessionsTotal`. Never expires unless manually cancelled.

### Auto-Expiry on Edit

If an admin edits a membership and sets `sessionsUsed >= sessionsTotal`, the status is automatically changed to EXPIRED. If sessions are added back above the threshold, the status is restored to ACTIVE.

### Freezing

Freezing a membership:
1. Stores the freeze start date in `frozenAt`
2. Stores the expected return in `frozenUntil`
3. Sets status to PAUSED
4. When unfrozen: the expiry date is extended by the frozen duration

All active memberships for a member are frozen/unfrozen simultaneously via the freeze-all endpoint.

### Global Subscription Browser

**Path:** Settings > Subscriptions

Shows all subscriptions across all members with filters:
- Member/Employee
- Status
- Service

Useful for finding expired, paused, or cancelled memberships at scale.

### Deleting a Subscription

Admins can delete subscriptions only if they have **no attendance records** (bookings count = 0). If attendance exists, the subscription must be cancelled instead.

---

## 8. Attendance and Check-in Rules

### Duplicate Check-in Prevention

The system prevents double check-ins:
- **Scheduled class**: Cannot check in twice to the same class on the same day (Asia/Manila timezone)
- **Walk-in**: Cannot check in twice on the same day regardless of class

Day boundaries are calculated in **Asia/Manila time** (UTC+8), not server UTC.

### Database-Level Uniqueness

A database unique constraint enforces: `memberId + scheduleId + scheduledDate` cannot repeat on the `Booking` table. This prevents duplicate records even under concurrent requests.

### Session Deduction

Session deduction is atomic: the system uses a conditional database update that only decrements if `sessionsUsed < sessionsTotal`. This prevents overbilling if two check-ins are submitted simultaneously.

### Walk-ins

Check-ins without a class schedule ID are "walk-ins". They count as attendance but are not linked to a specific class slot.

---

## 9. Store Configuration

### Item Management

Items are organised into two categories:
- **DRINKS** — Beverages, protein shakes, supplements
- **MERCHANDISE** — Apparel, equipment, branded items

Each item has a selling price, cost price (for margin tracking), and stock count. Stock counts update automatically when sales are recorded.

### Receipt Storage

Receipts are uploaded to **Google Drive** via the `upload-receipt` API endpoint. A link to the Google Drive file is stored in the sale record. Ensure the Google Drive integration credentials are configured in environment variables.

### Incomplete Sales

Sales missing a payment mode or receipt are flagged as "incomplete" in the Log tab. Complete these to maintain accurate records.

### Price Overrides

Staff may override the listed price for any item when needed. A justification reason is required — sales with a price different from the listed price will be rejected if no notes are provided.

---

## 10. Web Integration

**Path:** Settings > Web Integration

GymRM provides three embeddable widgets for your public website.

### Class Schedule Widget

- **Direct link**: `https://app.northsouth.com.ph/embed/schedule`
- Embed with an `<iframe>` on your website
- Shows the public weekly class schedule
- Updates automatically

### Free Trial Registration Widget

- **Direct link**: `https://app.northsouth.com.ph/register/widget`
- Embed as an overlay button using the provided JavaScript snippet
- Visitors submit their name, email, phone, and preferred class
- Submissions appear in GymRM as free-trial leads (red badge on Athletes menu)

#### Welcome Message

Customise the message shown to visitors at the top of the registration form:
1. Click the pencil icon on the Free Trial Registration card.
2. Edit the welcome message.
3. Click Save.

### Membership Pricing Widget

- **Direct link**: configurable based on selected packages
- Embed with an `<iframe>` on your website
- Shows live pricing for selected packages

#### Configuring the Pricelist

Two controls appear on the Pricing card:
- **↕ (Arrange)** — Drag to reorder how services are displayed
- **⚙ (Visibility)** — Check/uncheck individual packages to include or exclude them

Selections are saved to browser local storage and persist between sessions on the same device.

---

## 11. Communications Setup

### Email (Gmail Integration)

1. Go to **Communications > Email**.
2. Click **Connect Gmail**.
3. Complete Google OAuth authentication.
4. Grant access to read and modify Gmail.

Once connected, use the inbox to respond to members and send emails directly from GymRM.

### SMS Broadcast

Configure SMS credentials in environment variables (`SEMAPHORE_API_KEY` or equivalent). Once configured, the SMS channel is available in the Broadcast section.

### Automated Notifications

A scheduled cron job (`/api/cron/membership-notifications`) sends automated email notifications for:
- Memberships expiring soon
- Memberships that have expired

Configure the cron schedule in your hosting environment (Vercel cron.json or equivalent).

---

## 12. Audit and Activity Logs

**Path:** Settings > Activity Logs

Every sensitive action is recorded in the audit log with:
- **Who** — User name and ID
- **What** — Action type (e.g., ASSIGN_MEMBERSHIP, FREEZE, DELETE_MEMBER)
- **When** — Timestamp
- **What entity** — The affected record (member name, subscription ID, etc.)
- **Details** — Human-readable description and structured metadata

### Logged Actions (partial list)

- Creating, updating, deleting members
- Assigning, editing, deleting memberships
- Freezing and unfreezing memberships
- Deleting bookings
- Changing employee accounts
- Sending broadcasts

Logs are permanent and cannot be deleted through the UI.

---

## 13. Security Recommendations

### Password Policy

- Require staff to use passwords of at least 8 characters
- The system enforces a minimum of 6 characters for system accounts
- New accounts created by admin have auto-generated temporary passwords (16-character hex string)

### Session Security

- Sessions expire after 12 hours
- Kiosk sessions are permanently valid — protect kiosk devices physically
- Admin passwords are verified server-side before destructive operations (membership deletion, freeze, member deletion)

### Multi-Factor

Google OAuth is supported. If the Google account has 2FA enabled, it is enforced at Google's login step.

### API Security

All API routes enforce:
- Authentication (session must be valid)
- Role-based authorisation (role must be in the allowed list)
- Input validation via Zod schemas
- Admin password verification for destructive operations

### Audit Trail

All sensitive operations are logged. Review the Activity Logs monthly or after any suspicious activity.

### STORE Role Isolation

The STORE role cannot access subscription or membership data. This prevents store staff from seeing sensitive financial information about members.

---

## 14. Operational Checklists

### Daily

- [ ] Check Dashboard for overdue payments
- [ ] Check for incomplete sales in Store > Log
- [ ] Review the "Expiring Soon" section on Dashboard
- [ ] Process any new free-trial leads (badge on Athletes)

### Weekly

- [ ] Review check-in counts by class to identify popular/quiet slots
- [ ] Run the Store Sales Report for the week
- [ ] Follow up on expiring memberships

### Monthly

- [ ] Generate Revenue Report for the month
- [ ] Review Activity Logs for unusual activity
- [ ] Check for any members who are inactive but haven't been contacted
- [ ] Update web integration if packages have changed

### Staff Onboarding

- [ ] Create employee account with correct employee types
- [ ] Set a temporary password (auto-generated by system)
- [ ] Assign to schedule slots as a coach if applicable
- [ ] Test login and confirm they see the correct dashboard
- [ ] Explain the kiosk and store account credentials if relevant

### Staff Offboarding

- [ ] Set employee to Inactive on their profile
- [ ] Change Kiosk and Store passwords if they had access
- [ ] Review Activity Logs for their recent actions
