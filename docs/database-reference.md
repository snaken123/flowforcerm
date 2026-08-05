# GymRM Database Reference

**NorthSouth Fight Sports — GymRM**
*Version: Current as of July 2026*
*Database: Neon Serverless PostgreSQL via Prisma 5*

---

## Table of Contents

1. [Enumerations](#1-enumerations)
2. [Core Models](#2-core-models)
3. [Scheduling Models](#3-scheduling-models)
4. [Financial Models](#4-financial-models)
5. [Shop Models](#5-shop-models)
6. [Auth and Integration Models](#6-auth-and-integration-models)
7. [Relationships Overview](#7-relationships-overview)
8. [Key Indexes](#8-key-indexes)
9. [Business Rules Encoded in Schema](#9-business-rules-encoded-in-schema)

---

## 1. Enumerations

### Role

System access level for User accounts.

| Value | Description |
|-------|-------------|
| `ADMIN` | Full access to all features |
| `STAFF` | Manage members, schedule, store; no admin settings |
| `MEMBER` | Read-only access to own profile and bookings |
| `KIOSK` | Check-in terminal access; sessions never expire |
| `STORE` | Store terminal; no subscription access |

---

### MemberStatus

Lifecycle state of a Member.

| Value | Description |
|-------|-------------|
| `ACTIVE` | Currently training |
| `INACTIVE` | Not yet activated (trial leads) or lapsed |
| `FROZEN` | On hold; memberships paused |
| `CANCELLED` | Permanently left the gym |

---

### SubscriptionStatus

State of a member's membership package.

| Value | Description |
|-------|-------------|
| `ACTIVE` | Valid; sessions or time remaining |
| `PAUSED` | Frozen; time not counting |
| `EXPIRED` | Sessions exhausted or past end date |
| `CANCELLED` | Manually cancelled |

---

### BillingCycle

Billing frequency for subscriptions.

| Value |
|-------|
| `MONTHLY` |
| `QUARTERLY` |
| `SEMI_ANNUAL` |
| `ANNUAL` |

---

### PaymentStatus

State of a payment record.

| Value | Description |
|-------|-------------|
| `PAID` | Payment received |
| `PENDING` | Awaiting payment |
| `OVERDUE` | Past due |
| `WAIVED` | Forgiven / complimentary |

---

### BookingStatus

State of a class booking.

| Value | Description |
|-------|-------------|
| `CONFIRMED` | Booked, not yet attended |
| `CANCELLED` | Booking cancelled |
| `ATTENDED` | Attendance confirmed |

---

### ShopCategory

Category for store items.

| Value |
|-------|
| `DRINKS` |
| `MERCHANDISE` |

---

### ShopInventoryLogType

Type of stock adjustment record.

| Value | Description |
|-------|-------------|
| `COUNT` | Sets stock to a specific quantity (physical count) |
| `ADJUSTMENT` | Adds or subtracts from current stock |

---

## 2. Core Models

### User

Authentication account. Every person who can log in has a User record.

| Column | Type | Notes |
|--------|------|-------|
| `id` | String PK | CUID |
| `name` | String? | Display name |
| `email` | String UNIQUE | Login email |
| `emailVerified` | DateTime? | |
| `image` | String? | Avatar URL |
| `password` | String? | bcrypt hash; null for OAuth-only accounts |
| `role` | Role | Default: `MEMBER` |
| `mustChangePassword` | Boolean | Default: false; true for newly created staff accounts |
| `passwordResetToken` | String? UNIQUE | 32-byte hex token for password reset |
| `passwordResetExpires` | DateTime? | 1-hour TTL |
| `createdAt` | DateTime | |
| `updatedAt` | DateTime | Auto-updated |

**Relations:**
- `accounts` — OAuth provider tokens (Account[])
- `sessions` — browser sessions (Session[])
- `member` — linked Member profile (`OwnMember`)
- `managedMembers` — children or dependents the user is guardian of (`GuardianMembers`)
- `employee` — linked Employee profile
- `emailIntegration` — Gmail OAuth credentials
- `bookings` — bookings the user created
- `auditLogs` — audit log entries created by this user
- `shopSales` — sales processed by this user
- `shopInventoryLogs` — inventory adjustments by this user

---

### Member

Athlete profile. May or may not have a linked User account (guest/child members have no account).

| Column | Type | Notes |
|--------|------|-------|
| `id` | String PK | CUID |
| `userId` | String? UNIQUE | FK → User (nullable for guest members) |
| `guardianUserId` | String? | FK → User (for child members) |
| `memberNumber` | String? UNIQUE | Format: `NS-00001` |
| `firstName` | String | |
| `lastName` | String | |
| `dateOfBirth` | DateTime? | |
| `gender` | String? | |
| `phone` | String? | |
| `address` | String? | |
| `city` | String? | |
| `photoUrl` | String? | |
| `faceDescriptor` | Float[] | 128-float facial embedding vector for kiosk recognition |
| `emergencyName` | String? | |
| `emergencyPhone` | String? | |
| `emergencyRel` | String? | Relationship to emergency contact |
| `status` | MemberStatus | Default: `ACTIVE` |
| `joinDate` | DateTime | Default: now() |
| `activatedAt` | DateTime? | When member was first activated (triggers member number assignment) |
| `notes` | String? Text | Staff notes |
| `source` | String? | How they heard about the gym (e.g., "free-trial-registration") |
| `medicalNotes` | String? Text | Sensitive; not visible to MEMBER role |
| `waiverSigned` | Boolean | Default: false |
| `waiverDate` | DateTime? | Set when waiverSigned is set to true |
| `privacyAcceptedAt` | DateTime? | |
| `rulesAcknowledgedAt` | DateTime? | |
| `handbookReadAt` | DateTime? | |
| `onboardingCompletedAt` | DateTime? | |
| `createdAt` | DateTime | |
| `updatedAt` | DateTime | Auto-updated |

**Relations:** `subscriptions`, `checkIns`, `rankRecords`, `payments`, `bookings`, `shopSales`

---

### Employee

Staff profile. All employees have a linked User account.

| Column | Type | Notes |
|--------|------|-------|
| `id` | String PK | CUID |
| `userId` | String UNIQUE | FK → User (required) |
| `employeeNumber` | String? UNIQUE | Format: `EM-00001` |
| `firstName` | String | |
| `lastName` | String | |
| `phone` | String? | |
| `photoUrl` | String? | |
| `employeeTypes` | String[] | Array; values include "ADMIN", "STAFF", "COACH" |
| `title` | String? | Job title |
| `bio` | String? Text | Public bio |
| `certifications` | String? Text | |
| `belt` | String? | Belt rank (e.g., "Black Belt") |
| `hireDate` | DateTime | Default: now() |
| `dateOfBirth` | DateTime? | |
| `isActive` | Boolean | Default: true |
| `createdAt` | DateTime | |
| `updatedAt` | DateTime | Auto-updated |

**Relations:** `taughtServices` (ServiceEmployee[]), `schedules` (ClassScheduleCoach[]), `shopSales`, `subscriptions`, `bookings`, `payments`

---

### Service

A martial art or fitness program offered by the gym.

| Column | Type | Notes |
|--------|------|-------|
| `id` | String PK | |
| `name` | String | Display name |
| `slug` | String unique | URL-safe identifier |
| `description` | String? | Long description |
| `category` | String | e.g., "Martial Arts", "Fitness", "Kids" |
| `color` | String | Default: `#3B82F6`; used in UI cards |
| `iconName` | String? | Icon identifier |
| `monthlyPrice` | Float? | Reference monthly price |
| `dropInPrice` | Float? | Drop-in rate |
| `isActive` | Boolean | Default: true; inactive services hidden from public |
| `freeTrialEnabled` | Boolean | Default: false; when true, service appears in public free trial registration form |
| `createdAt` | DateTime | |
| `updatedAt` | DateTime | |

**Relations:** `subscriptions`, `instructors` (ServiceEmployee[]), `packages` (ServicePackage[]), `allowedInClasses` (ClassAllowedService[]), `checkIns`

**Key rules:**
- `freeTrialEnabled` must be manually set to `true` for each service that should appear in the public registration form. Defaults to `false` for all services including existing ones.
- The free trial registration form (`GET /api/register/classes`) returns only services where `isActive: true` AND `freeTrialEnabled: true`.

---

### Subscription

A membership package assigned to a member or employee.

| Column | Type | Notes |
|--------|------|-------|
| `id` | String PK | |
| `memberId` | String? | FK → Member (nullable if employee subscription) |
| `employeeId` | String? | FK → Employee (nullable if member subscription) |
| `serviceId` | String | FK → Service |
| `status` | SubscriptionStatus | Default: `ACTIVE` |
| `billingCycle` | BillingCycle | Default: `MONTHLY` |
| `price` | Float | Price paid |
| `startDate` | DateTime | Default: now() |
| `endDate` | DateTime? | null = open-ended |
| `nextBillDate` | DateTime? | For billing reminders |
| `sessionsTotal` | Int? | null = unlimited |
| `sessionsUsed` | Int | Default: 0 |
| `frozenAt` | DateTime? | When freeze started |
| `frozenUntil` | DateTime? | Expected return date |
| `notes` | String? | Staff notes about this membership |
| `createdAt` | DateTime | |
| `updatedAt` | DateTime | |

**Indexes:** `[memberId]`, `[memberId, status]`, `[status]`, `[serviceId]`

**Key rules:**
- `sessionsUsed` is atomically incremented via `updateMany` with condition `sessionsUsed < sessionsTotal`
- Auto-expires when `sessionsUsed >= sessionsTotal`
- Freeze extends `endDate` by the frozen duration when unfrozen

---

### RankRecord

Martial arts rank award history for a member.

| Column | Type | Notes |
|--------|------|-------|
| `id` | String PK | |
| `memberId` | String | FK → Member |
| `martialArt` | String | e.g., "Brazilian Jiu-Jitsu" |
| `rank` | String | e.g., "Blue Belt" |
| `stripes` | Int? | 1-4 stripes |
| `awardedAt` | DateTime | |
| `awardedBy` | String? | Coach name |
| `notes` | String? | |

---

## 3. Scheduling Models

### ClassSession

A class definition (what, not when). Think of this as the class "type".

| Column | Type | Notes |
|--------|------|-------|
| `id` | String PK | |
| `name` | String | Class name |
| `color` | String | Default: `#3B82F6` |
| `classType` | String? | |
| `startsAt` | DateTime? | For one-time events |
| `endsAt` | DateTime? | For one-time events |
| `location` | String? | |
| `notes` | String? | |
| `createdAt` | DateTime | |

**Relations:** `bookings`, `allowedServices` (ClassAllowedService[]), `schedules` (ClassSchedule[]), `checkIns`

---

### ClassSchedule

A recurring or one-time slot when a ClassSession runs.

| Column | Type | Notes |
|--------|------|-------|
| `id` | String PK | |
| `classId` | String | FK → ClassSession |
| `dayOfWeek` | Int | 0=Sunday, 6=Saturday |
| `startTime` | String | "HH:MM" 24h format |
| `endTime` | String | "HH:MM" 24h format |
| `location` | String? | |
| `maxCapacity` | Int? | null = unlimited |
| `isActive` | Boolean | Default: true |
| `isRecurring` | Boolean | Default: true; false = one-time slot |
| `startDate` | DateTime? | null = all time; for one-time = the specific date |
| `endDate` | DateTime? | null = runs forever; set to cut off "this and succeeding" |
| `createdAt` | DateTime | |
| `updatedAt` | DateTime | |

**Indexes:** `[classId]`, `[isActive, dayOfWeek]`

**Relations:** `coaches` (ClassScheduleCoach[]), `exceptions` (ClassScheduleException[]), `checkIns`

---

### ClassScheduleException

Cancels one occurrence of a recurring schedule.

| Column | Type | Notes |
|--------|------|-------|
| `id` | String PK | |
| `scheduleId` | String | FK → ClassSchedule |
| `date` | DateTime | The specific date to skip (midnight UTC) |
| `createdAt` | DateTime | |

**Unique:** `[scheduleId, date]`

---

### ClassScheduleCoach

Junction table linking coaches to schedule slots.

| Column | Type |
|--------|------|
| `scheduleId` | PK + FK → ClassSchedule |
| `employeeId` | PK + FK → Employee |

---

### ClassAllowedService

Restricts a class to members with specific service subscriptions.

| Column | Type |
|--------|------|
| `classSessionId` | PK + FK → ClassSession |
| `serviceId` | PK + FK → Service |

If no rows exist for a class, any active membership is accepted.

---

### Booking

A reservation for a class occurrence by a member or employee.

| Column | Type | Notes |
|--------|------|-------|
| `id` | String PK | |
| `memberId` | String? | FK → Member |
| `employeeId` | String? | FK → Employee |
| `sessionId` | String | FK → ClassSession |
| `scheduleId` | String? | FK → ClassSchedule |
| `scheduledDate` | DateTime? | The specific occurrence date |
| `subscriptionId` | String? | FK → Subscription (membership used) |
| `status` | BookingStatus | Default: `CONFIRMED` |
| `bookedById` | String? | FK → User who created the booking |
| `cancelledAt` | DateTime? | |
| `cancelReason` | String? | |
| `sessionReturned` | Boolean | Default: false; true if session was credited back on cancel |
| `createdAt` | DateTime | |

**Unique constraint:** `[memberId, scheduleId, scheduledDate]` — prevents duplicate bookings for the same member, schedule, and date at the database level.

**Indexes:** `[memberId]`, `[employeeId]`, `[sessionId]`, `[scheduleId, scheduledDate]`, `[memberId, scheduledDate]`

---

### CheckIn

Attendance record for a visit.

| Column | Type | Notes |
|--------|------|-------|
| `id` | String PK | |
| `memberId` | String | FK → Member |
| `serviceId` | String? | FK → Service (SET NULL on service delete) |
| `classSessionId` | String? | FK → ClassSession |
| `scheduleId` | String? | FK → ClassSchedule |
| `checkedInAt` | DateTime | Default: now() |
| `notes` | String? | e.g., "Face recognition kiosk" |

**Indexes:** `[memberId]`, `[checkedInAt]`

---

## 4. Financial Models

### Payment

A payment record linked to a member and optionally a subscription.

| Column | Type | Notes |
|--------|------|-------|
| `id` | String PK | |
| `memberId` | String? | FK → Member |
| `employeeId` | String? | FK → Employee |
| `subscriptionId` | String? | FK → Subscription |
| `amount` | Float | |
| `status` | PaymentStatus | Default: `PENDING` |
| `method` | String? | "cash", "card", "transfer", etc. |
| `reference` | String? | External reference/receipt number |
| `notes` | String? | |
| `paidAt` | DateTime? | |
| `dueDate` | DateTime? | |
| `createdAt` | DateTime | |
| `updatedAt` | DateTime | |

**Indexes:** `[memberId]`, `[paidAt]`, `[status, paidAt]`

---

## 5. Shop Models

### ShopItem

A product for sale in the store.

| Column | Type | Notes |
|--------|------|-------|
| `id` | String PK | |
| `name` | String | |
| `category` | ShopCategory | DRINKS or MERCHANDISE |
| `sellingPrice` | Float | Listed price |
| `costPrice` | Float | Default: 0; for margin tracking |
| `stock` | Int | Default: 0; decremented atomically on sale |
| `photoUrl` | String? | |
| `isActive` | Boolean | Default: true; soft-deleted items set to false |
| `createdAt` | DateTime | |
| `updatedAt` | DateTime | |

**Index:** `[category]`

---

### ShopSale

A completed or pending sale transaction.

| Column | Type | Notes |
|--------|------|-------|
| `id` | String PK | |
| `buyerMemberId` | String? | FK → Member (optional) |
| `buyerEmployeeId` | String? | FK → Employee (optional) |
| `buyerName` | String? | Free-text name if buyer has no account |
| `staffId` | String | FK → User who processed the sale |
| `staffName` | String | Denormalized for display |
| `paymentMode` | String? | null = incomplete sale |
| `receiptUrl` | String? | Google Drive link; null = incomplete sale |
| `total` | Float | Sum of all item totals |
| `notes` | String? | |
| `createdAt` | DateTime | |

**Indexes:** `[createdAt]`, `[buyerMemberId]`, `[staffId]`

A sale is considered "incomplete" if `paymentMode` or `receiptUrl` is null.

---

### ShopSaleItem

A line item within a sale.

| Column | Type | Notes |
|--------|------|-------|
| `id` | String PK | |
| `saleId` | String | FK → ShopSale (cascade delete) |
| `shopItemId` | String | FK → ShopItem |
| `quantity` | Int | |
| `priceAtSale` | Float | Price at time of sale (may differ from current sellingPrice) |

**Index:** `[saleId]`

---

### ShopInventoryLog

Audit trail for every stock change.

| Column | Type | Notes |
|--------|------|-------|
| `id` | String PK | |
| `shopItemId` | String | FK → ShopItem |
| `type` | ShopInventoryLogType | COUNT or ADJUSTMENT |
| `quantity` | Int | Set value (COUNT) or delta (ADJUSTMENT) |
| `reason` | String? | |
| `staffId` | String | FK → User |
| `staffName` | String | Denormalized |
| `createdAt` | DateTime | |

**Indexes:** `[shopItemId]`, `[createdAt]`

---

## 6. Auth and Integration Models

### Account

OAuth provider tokens (NextAuth).

| Column | Type |
|--------|------|
| `id` | String PK |
| `userId` | String FK → User |
| `type` | String |
| `provider` | String |
| `providerAccountId` | String |
| `refresh_token` | String? Text |
| `access_token` | String? Text |
| `expires_at` | Int? |
| `token_type` | String? |
| `scope` | String? |
| `id_token` | String? Text |
| `session_state` | String? |

**Unique:** `[provider, providerAccountId]`

---

### Session

Browser session tokens (NextAuth database strategy — not used in JWT mode, but kept for compatibility).

| Column | Type |
|--------|------|
| `id` | String PK |
| `sessionToken` | String UNIQUE |
| `userId` | String FK → User |
| `expires` | DateTime |

---

### VerificationToken

Email verification tokens (NextAuth).

| Column | Type |
|--------|------|
| `identifier` | String |
| `token` | String UNIQUE |
| `expires` | DateTime |

**Unique:** `[identifier, token]`

---

### EmailIntegration

Gmail OAuth credentials for a specific admin's connected mailbox.

| Column | Type | Notes |
|--------|------|-------|
| `id` | String PK | |
| `userId` | String UNIQUE | FK → User |
| `provider` | String | "gmail" |
| `accessToken` | String Text | OAuth access token |
| `refreshToken` | String? Text | OAuth refresh token |
| `expiresAt` | DateTime? | Access token expiry |
| `email` | String | Connected Gmail address |
| `createdAt` | DateTime | |
| `updatedAt` | DateTime | |

---

### FreeTrialToken

One-time token for public free-trial registration flow.

| Column | Type | Notes |
|--------|------|-------|
| `id` | String PK | |
| `token` | String UNIQUE | URL-safe random token |
| `email` | String | Registrant email |
| `firstName` | String | |
| `lastName` | String | |
| `phone` | String | |
| `expiresAt` | DateTime | 1 hour after creation |
| `usedAt` | DateTime? | null = not yet used |
| `createdAt` | DateTime | |

**Index:** `[email]`

---

### AuditLog

Immutable record of every sensitive operation.

| Column | Type | Notes |
|--------|------|-------|
| `id` | String PK | |
| `userId` | String | FK → User |
| `userName` | String | Denormalized (persists even if user is deleted) |
| `action` | String | e.g., `ASSIGN_MEMBERSHIP`, `FREEZE`, `DELETE_MEMBER` |
| `entityType` | String | e.g., `Member`, `Subscription`, `Schedule` |
| `entityId` | String? | |
| `entityName` | String? | e.g., member full name |
| `description` | String | Human-readable summary |
| `metadata` | Json? | Structured detail (old/new values, etc.) |
| `createdAt` | DateTime | |

**Indexes:** `[userId]`, `[createdAt]`, `[entityType, entityId]`

Audit logs cannot be deleted through the application UI.

---

### Broadcast

Record of a mass communication send.

| Column | Type | Notes |
|--------|------|-------|
| `id` | String PK | |
| `subject` | String | |
| `body` | String Text | |
| `audience` | String | "all", "active", "inactive", "specific" |
| `recipientCount` | Int | |
| `sentAt` | DateTime | |
| `sentById` | String | User ID who triggered the send |

---

### SystemSetting

Key-value store for application configuration.

| Column | Type |
|--------|------|
| `key` | String PK |
| `value` | String Text |
| `updatedAt` | DateTime |

**Known keys:**

| Key | Description |
|-----|-------------|
| `registration_welcome_message` | Free-trial registration page welcome text |
| `expiry_warning_enabled` | "true"/"false" — enable expiry warning emails |
| `expiry_warning_days` | Number of days before expiry to send warning |
| `expired_notification_enabled` | "true"/"false" — enable expired notification emails |

---

## 7. Relationships Overview

```
User
  ├── Member (OwnMember, 1:1 optional)
  ├── Member[] (GuardianMembers, 1:many — child members)
  └── Employee (1:1 optional)

Member
  ├── Subscription[] → Service
  ├── Booking[] → ClassSession → ClassSchedule
  ├── CheckIn[]
  ├── Payment[]
  ├── RankRecord[]
  └── ShopSale[]

Service
  ├── ServicePackage[]
  ├── Subscription[]
  ├── ServiceEmployee[] → Employee
  ├── ClassAllowedService[] → ClassSession
  └── CheckIn[] (SET NULL on delete)

ClassSession
  ├── ClassSchedule[]
  │   ├── ClassScheduleCoach[] → Employee
  │   └── ClassScheduleException[]
  ├── Booking[]
  ├── CheckIn[]
  └── ClassAllowedService[] → Service

ShopItem
  ├── ShopSaleItem[] → ShopSale
  └── ShopInventoryLog[]
```

---

## 8. Key Indexes

| Table | Index | Purpose |
|-------|-------|---------|
| `Booking` | `(memberId, scheduleId, scheduledDate)` UNIQUE | Prevents duplicate bookings |
| `Booking` | `(scheduleId, scheduledDate)` | Efficient class roster queries |
| `Booking` | `(memberId, scheduledDate)` | Member attendance history |
| `Subscription` | `(memberId, status)` | Fast active membership lookup |
| `Subscription` | `(status)` | Cron job targeting expired/paused |
| `CheckIn` | `(checkedInAt)` | Date-range attendance reports |
| `Payment` | `(status, paidAt)` | Revenue reports |
| `AuditLog` | `(entityType, entityId)` | Activity timeline for a specific record |
| `ShopInventoryLog` | `(shopItemId)` | Stock history per item |
| `ClassSchedule` | `(isActive, dayOfWeek)` | Schedule filtering for today's classes |

---

## 9. Business Rules Encoded in Schema

### Unique Booking Constraint

```prisma
@@unique([memberId, scheduleId, scheduledDate])
```

Enforces at the database level that no member can have two bookings for the same schedule slot on the same date. This prevents duplicate check-ins even under concurrent requests.

### Soft Delete on ShopItems

`isActive` flag rather than hard delete. Preserves `ShopSaleItem` foreign key integrity.

### Denormalised Names in Audit and Shop

`AuditLog.userName`, `ShopSale.staffName`, `ShopInventoryLog.staffName` are duplicated at write time. This ensures audit trail and sale history remain readable even if a user account is later deleted.

### Cascade Deletes

| Parent | Child | Behaviour |
|--------|-------|-----------|
| User | Account | Cascade delete |
| User | Session | Cascade delete |
| User | Member (OwnMember) | Cascade delete |
| User | Employee | Cascade delete |
| User | EmailIntegration | Cascade delete |
| Service | ServicePackage | Cascade delete |
| ClassSchedule | ClassScheduleCoach | Cascade delete |
| ClassSchedule | ClassScheduleException | Cascade delete |
| ClassSession | ClassAllowedService | Cascade delete |
| ShopSale | ShopSaleItem | Cascade delete |

### Nullable Foreign Keys

`Booking.memberId` and `Booking.employeeId` are both nullable — a booking may belong to either a member or an employee, or to neither (anonymous walk-ins). The unique constraint `[memberId, scheduleId, scheduledDate]` only applies when `memberId` is non-null.

### FreeTrialToken Expiry

Tokens are valid for 1 hour (`expiresAt = now + 1h`). The `usedAt` field marks a token as consumed. Both conditions are checked server-side on completion.
