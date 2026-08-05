# GymRM Developer Documentation

**FlowForceRM — GymRM**
*Version: Current as of July 2026*

---

## Table of Contents

1. [Tech Stack](#1-tech-stack)
2. [Project Structure](#2-project-structure)
3. [Environment Variables](#3-environment-variables)
4. [Authentication Architecture](#4-authentication-architecture)
5. [Database and ORM](#5-database-and-orm)
6. [API Route Conventions](#6-api-route-conventions)
7. [Timezone Handling](#7-timezone-handling)
8. [Role-Based Access Control](#8-role-based-access-control)
9. [Audit Logging](#9-audit-logging)
10. [File Upload Architecture](#10-file-upload-architecture)
11. [Email and SMS](#11-email-and-sms)
12. [Cron Jobs](#12-cron-jobs)
13. [Frontend Architecture](#13-frontend-architecture)
14. [Key Libraries and Utilities](#14-key-libraries-and-utilities)
15. [Development Setup](#15-development-setup)
16. [Deployment](#16-deployment)

---

## 1. Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript 5 |
| Authentication | NextAuth 4 (JWT strategy) |
| Database | PostgreSQL (Neon Serverless) |
| ORM | Prisma 5 |
| Styling | Tailwind CSS |
| UI Components | shadcn/ui |
| Schema Validation | Zod |
| Email (transactional) | Resend |
| Email (integration) | Gmail OAuth |
| SMS | Semaphore (Philippines) |
| File Storage (photos) | Vercel Blob |
| File Storage (receipts) | Google Drive (service account) |
| Hosting | Vercel |

---

## 2. Project Structure

```
gym-crm/
├── app/
│   ├── (auth)/                    # Login, register, forgot/reset password pages
│   ├── (dashboard)/               # All authenticated app pages
│   │   ├── admin/                 # Admin-only pages
│   │   │   ├── members/           # Member management
│   │   │   │   └── [id]/          # Member detail page + client component
│   │   │   ├── schedule/          # Schedule management
│   │   │   ├── shop/              # Store POS
│   │   │   ├── settings/          # System settings
│   │   │   └── web-integration/   # Embed widget configuration
│   │   ├── dashboard/             # Main dashboard (role-aware)
│   │   └── schedule/              # Schedule viewer
│   ├── api/                       # API Route Handlers
│   │   ├── auth/                  # NextAuth + custom auth endpoints
│   │   ├── members/               # Member CRUD + sub-routes
│   │   ├── subscriptions/         # Subscription management
│   │   ├── checkins/              # Check-in endpoints
│   │   ├── bookings/              # Booking management
│   │   ├── schedules/             # Schedule CRUD
│   │   ├── classes/               # ClassSession CRUD
│   │   ├── services/              # Service + Package CRUD
│   │   ├── employees/             # Employee management
│   │   ├── shop/                  # Store items and sales
│   │   ├── payments/              # Payment records
│   │   ├── ranks/                 # Rank records
│   │   ├── email/                 # Gmail integration
│   │   ├── sms/                   # SMS broadcast
│   │   ├── upload/                # Photo upload (Vercel Blob)
│   │   ├── upload-receipt/        # Receipt upload (Google Drive)
│   │   ├── audit-logs/            # Audit log viewer
│   │   ├── admin/                 # Admin-only endpoints
│   │   ├── cron/                  # Scheduled jobs
│   │   ├── register/              # Public registration flow
│   │   └── public/                # Unauthenticated endpoints
│   ├── embed/                     # Public embeddable pages (schedule, pricing)
│   └── register/                  # Public registration pages
├── components/
│   ├── layout/                    # Sidebar, header, shell components
│   ├── ui/                        # shadcn/ui base components
│   └── [feature]/                 # Feature-specific components
├── lib/
│   ├── auth.ts                    # NextAuth config, getAuthSession()
│   ├── prisma.ts                  # Singleton PrismaClient
│   ├── audit.ts                   # logAudit() helper
│   ├── time.ts                    # Manila timezone utilities
│   ├── email.ts                   # Transactional email (Resend)
│   ├── sms.ts                     # SMS via Semaphore
│   └── unfreeze-memberships.ts    # Membership unfreeze logic
└── prisma/
    └── schema.prisma              # Database schema
```

---

## 3. Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Neon PostgreSQL connection string |
| `NEXTAUTH_URL` | Yes | Full app URL (e.g., `https://flowforcerm.com`) |
| `NEXTAUTH_SECRET` | Yes | JWT signing secret |
| `GOOGLE_CLIENT_ID` | Yes | Google OAuth for login + Gmail |
| `GOOGLE_CLIENT_SECRET` | Yes | Google OAuth secret |
| `RESEND_API_KEY` | Yes | Transactional email via Resend |
| `CRON_SECRET` | Yes | Bearer token for cron job auth |
| `GOOGLE_DRIVE_FOLDER_ID` | Yes | Drive folder for receipt uploads |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Yes | Service account for Drive |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | Yes | Private key for Drive service account (PEM, newlines as `\n`) |
| `SEMAPHORE_API_KEY` | No | Philippine SMS gateway |
| `BLOB_READ_WRITE_TOKEN` | No | Vercel Blob token for photo uploads |

---

## 4. Authentication Architecture

### NextAuth Configuration (`lib/auth.ts`)

GymRM uses NextAuth 4 with the **JWT strategy** (no database sessions). Sessions are client-side JWTs.

**Providers:**
1. `CredentialsProvider` — email + bcrypt password
2. `GoogleProvider` — Google OAuth (with Gmail scope: `openid email profile https://www.googleapis.com/auth/gmail.modify`)

**JWT callback** extends the token with:
- `role` — User.role enum
- `id` — User.id
- `mustChangePassword` — forces password change on next login
- `onboardingCompleted` — member onboarding state
- `employeeTypes` — array from Employee record (determines coach vs admin/staff access)
- `employeeId` — Employee.id
- `taughtServiceIds` — services the coach teaches

**Session TTL:** 12 hours (`maxAge: 12 * 60 * 60`)  
**Kiosk sessions:** Set `exp` to 10 years in the JWT callback for KIOSK role, effectively never expiring.

### Getting the Session

```typescript
import { getAuthSession } from "@/lib/auth";

// In any Route Handler:
const session = await getAuthSession();
if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
const role = (session.user as any).role;
```

### Must-Change-Password Gate

If `mustChangePassword` is `true`, users are redirected to `/change-password` before accessing any page. This is enforced in the layout middleware.

---

## 5. Database and ORM

### Prisma Client (`lib/prisma.ts`)

Singleton pattern to prevent connection exhaustion in Next.js serverless:

```typescript
// lib/prisma.ts
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
export const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

Import in route handlers:
```typescript
import { prisma } from "@/lib/prisma";
```

### Schema Changes

1. Modify `prisma/schema.prisma`
2. Review with the database-architect agent for data integrity concerns
3. Run `npx prisma db push` (dev) or generate a migration for production
4. If adding a unique constraint on existing data: use `npx prisma db push --accept-data-loss` only if you have verified there are no existing duplicates

### Atomic Operations

For concurrent-safe updates, use conditional `updateMany`:

```typescript
// Atomic session decrement (prevents overbilling under concurrent check-ins)
const result = await prisma.subscription.updateMany({
  where: { id: subId, sessionsUsed: { lt: sessionsTotal } },
  data: { sessionsUsed: { increment: 1 } },
});
if (result.count === 0) {
  // No sessions remaining or subscription already exhausted
}
```

### Transactions

Use `prisma.$transaction()` for multi-step operations that must be atomic:

```typescript
await prisma.$transaction(async (tx) => {
  const member = await tx.member.update({ ... });
  await tx.subscription.updateMany({ ... });
  await tx.payment.create({ ... });
});
```

---

## 6. API Route Conventions

### Route Structure

All routes are in `app/api/`. Each route file exports one or more HTTP method handlers:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const bodySchema = z.object({
  name: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  const role = (session.user as any).role;
  if (!["ADMIN", "STAFF"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  
  const body = await req.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors }, { status: 400 });
  }
  
  // ... implementation
}
```

### Standard HTTP Status Codes

| Code | When |
|------|------|
| 200 | Successful GET, PATCH, DELETE |
| 201 | Successful POST (resource created) |
| 400 | Validation failure or bad request |
| 401 | Not authenticated |
| 403 | Authenticated but wrong role or wrong password |
| 404 | Resource not found |
| 409 | Conflict (duplicate, capacity full, already checked in) |
| 429 | Rate limited |
| 500 | Internal server error |
| 503 | External service unavailable (e.g., Google Drive not configured) |

### Input Validation

Always validate with Zod before touching the database:

```typescript
const schema = z.object({
  email: z.string().email(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  price: z.number().min(0),
});

const parsed = schema.safeParse(await req.json());
if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });
```

---

## 7. Timezone Handling

**All date operations use Asia/Manila (UTC+8).** The server runs in UTC (Vercel). Never use `new Date()` directly for day-boundary calculations.

### Utility Functions (`lib/time.ts`)

```typescript
import { manilaDateStr, manilaDayBoundaries, manilaDayOfWeek, todayManilaDateOnly, manilaNow } from "@/lib/time";

// Current date string in Manila time
const today = manilaDateStr(); // "2026-07-28"

// Day boundaries as UTC Date objects (for Prisma where clauses)
const { start, end } = manilaDayBoundaries("2026-07-28");
// start = 2026-07-27T16:00:00.000Z (midnight Manila)
// end = 2026-07-28T15:59:59.999Z (end of day Manila)

// Today in Manila as a UTC Date at Manila midnight
const todayDate = todayManilaDateOnly();

// Day-of-week in Manila (0=Sunday)
const dow = manilaDayOfWeek();
```

### Common Mistakes to Avoid

```typescript
// WRONG — uses UTC midnight, not Manila midnight
const start = new Date(year, month - 1, day);

// CORRECT — pin to Manila offset
const start = new Date(`${year}-${pad(month)}-${pad(day)}T00:00:00+08:00`);

// WRONG — UTC date string (breaks near midnight Manila)
const today = new Date().toISOString().slice(0, 10);

// CORRECT
const today = manilaDateStr();
```

---

## 8. Role-Based Access Control

### Role Hierarchy

Roles are not hierarchical (ADMIN does not inherit STAFF). Each route explicitly lists allowed roles.

### Pattern

```typescript
const ALLOWED_ROLES = ["ADMIN", "STAFF", "STORE"] as const;

const role = (session.user as any).role;
if (!ALLOWED_ROLES.includes(role)) {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
```

### STORE Role Restrictions

STORE role is blocked from:
- `GET /api/subscriptions` (returns 403)
- Accessing any member's subscription details
- Any admin settings

### MEMBER Role Restrictions

MEMBER role may only:
- Read own member profile (sensitive fields stripped server-side)
- Read own subscriptions
- Read own check-ins and bookings
- Cancel own non-attended bookings

### Employee Type vs. Role

The `role` field controls API access. The `employeeTypes` array in the JWT controls the UI sidebar display:
- Contains "ADMIN" or "STAFF" → full staff navigation
- Contains neither → coach-only dashboard (see `isCoachOnly` check in sidebar)

---

## 9. Audit Logging

### `logAudit()` (`lib/audit.ts`)

```typescript
import { logAudit } from "@/lib/audit";

await logAudit({
  userId: session.user.id,
  userName: session.user.name ?? "Unknown",
  action: "ASSIGN_MEMBERSHIP",
  entityType: "Subscription",
  entityId: subscription.id,
  entityName: `${member.firstName} ${member.lastName}`,
  description: `Assigned ${service.name} membership to ${member.firstName}`,
  metadata: { serviceId, price, sessionsTotal },
});
```

Errors are caught internally and logged to console without throwing — a logging failure never interrupts the main operation.

### Action Naming Convention

Verbs in SCREAMING_SNAKE_CASE:
- `CREATE_MEMBER`, `UPDATE_MEMBER`, `DELETE_MEMBER`
- `ASSIGN_MEMBERSHIP`, `EDIT_SUBSCRIPTION`, `DELETE_MEMBERSHIP`
- `FREEZE_MEMBER`, `UNFREEZE_MEMBER`
- `CREATE_SCHEDULE`, `UPDATE_SCHEDULE`, `DELETE_SCHEDULE`, `CANCEL_SCHEDULE_SESSION`, `END_SCHEDULE`
- `CREATE_EMPLOYEE`, `UPDATE_EMPLOYEE`
- `CONVERT_TRIAL_TO_MEMBER`

---

## 10. File Upload Architecture

### Member Photos (`/api/upload`)

- **Storage:** Vercel Blob
- **Naming:** `member-{memberId}-{timestamp}.{ext}`
- **Allowed types:** jpg, jpeg, png, webp, gif
- **Auth:** Any authenticated user (members may only upload for own profile)

```typescript
const { url } = await put(filename, file, { access: "public" });
```

### Receipts (`/api/upload-receipt`)

- **Storage:** Google Drive (service account JWT auth)
- **Naming:** `MMDDYYYY_LastName_Sport_Package_PhpAmount_PaymentMethod.ext`
- **Allowed types:** jpg, jpeg, png, webp, gif, pdf
- **Auth:** ADMIN, STAFF, STORE
- **Required env:** `GOOGLE_DRIVE_FOLDER_ID`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SERVICE_ACCOUNT_KEY`

The response includes `link` (webViewLink for embedding) and `imageUrl` (Drive thumbnail URL). The `link` is stored in `ShopSale.receiptUrl`.

---

## 11. Email and SMS

### Transactional Emails (`lib/email.ts`)

Uses Resend for system emails. Skips sending to `@flowforcerm.local` addresses (system accounts).

```typescript
import { sendActivationEmail, sendPasswordResetEmail, sendWelcomeEmail } from "@/lib/email";

await sendActivationEmail({ to: "user@example.com", firstName: "Juan", tempPassword: "abc123" });
```

### Gmail Integration (`app/api/email/`)

Individual admins can connect their Gmail accounts via OAuth. Tokens stored in `EmailIntegration` table. Used for:
- Reading member inbox threads
- Sending replies to members

### SMS (`lib/sms.ts`)

```typescript
import { sendSMS, sendBulkSMS } from "@/lib/sms";

// Normalize to 63XXXXXXXXXX and send via Semaphore
await sendSMS("09171234567", "Your membership is expiring soon.");

const { sent, failed } = await sendBulkSMS(
  [{ name: "Juan", phone: "09171234567" }],
  "Class is cancelled today."
);
```

---

## 12. Cron Jobs

### Membership Notifications (`/api/cron/membership-notifications`)

Secured via Bearer token header: `Authorization: Bearer {CRON_SECRET}`

Configured in `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/membership-notifications",
      "schedule": "0 8 * * *"
    }
  ]
}
```

This runs daily at 8:00 UTC (4:00 PM Manila).

**Operations performed:**
1. Send expiry warning emails to members whose subscriptions expire in N days
2. Send "membership expired" emails
3. Auto-expire date-based subscriptions past endDate
4. Auto-unfreeze memberships where `frozenUntil <= now`

---

## 13. Frontend Architecture

### App Router Pages

Pages live in `app/(dashboard)/`. Most are server components that fetch data server-side and pass it to client components.

**Pattern:**
```
app/(dashboard)/admin/members/[id]/
  ├── page.tsx           # Server component — fetches member data
  └── member-detail-client.tsx  # Client component — all interactivity
```

### Client Components

Heavy interactive pages (member detail, shop POS, schedule) are implemented as Client Components (`"use client"`) receiving server-fetched data as props. They use:
- `useState` for local state
- `fetch()` for mutations via API routes
- `useRouter().refresh()` to re-render after mutations
- `useToast()` from shadcn/ui for success/error feedback

### Server Components

Data-fetching pages use async/await directly:
```typescript
// page.tsx (server component)
import { prisma } from "@/lib/prisma";
import MemberDetailClient from "./member-detail-client";

export default async function MemberPage({ params }: { params: { id: string } }) {
  const member = await prisma.member.findUnique({
    where: { id: params.id },
    include: { subscriptions: { include: { service: true } }, ... }
  });
  
  return <MemberDetailClient member={member} />;
}
```

### Layout and Navigation (`components/layout/sidebar.tsx`)

The sidebar renders role-aware navigation:
- `mainNavItems` — Athletes, Schedule, Classes, Store (ADMIN/STAFF/STORE)
- `commsNavItems` — Email, Broadcast (ADMIN only, collapsible)
- `settingsNavItems` — Employees, Memberships, System (ADMIN only, collapsible)
- STORE role sees: Athletes, Schedule, Classes, Store
- Coach-only employees (`isCoachOnly`) see: Dashboard, Schedule
- Badge counts: free-trial leads on Athletes, pending sales on Store

### UI Components

All UI uses shadcn/ui components. Install new components with:
```bash
npx shadcn@latest add [component-name]
```

Never write raw HTML for form elements, dialogs, tables, or buttons — always use the shadcn/ui equivalents for visual consistency.

---

## 14. Key Libraries and Utilities

### `lib/auth.ts`

- `getAuthSession()` — server-side session getter (wraps `getServerSession(authOptions)`)
- `authOptions` — NextAuth config object

### `lib/prisma.ts`

- `prisma` — singleton PrismaClient

### `lib/audit.ts`

- `logAudit(params)` — write to AuditLog, catches errors silently

### `lib/time.ts`

- `manilaDateStr(d?)` — "YYYY-MM-DD" in Manila time
- `todayManilaDateOnly()` — UTC Date at Manila midnight
- `manilaDayBoundaries(dateStr?)` — `{ start, end }` UTC Dates
- `manilaDayOfWeek(d?)` — 0-6 (Sun-Sat) in Manila time
- `manilaNow()` — `{ dateStr, hhmm, dayOfWeek }`

### `lib/email.ts`

- `sendActivationEmail({ to, firstName, tempPassword })`
- `sendPasswordResetEmail({ to, firstName, token })`
- `sendWelcomeEmail({ to, firstName, tempPassword })`

### `lib/sms.ts`

- `sendSMS(to, message)` → `{ success: boolean }`
- `sendBulkSMS(recipients, message)` → `{ sent, failed }`

### `lib/unfreeze-memberships.ts`

- `unfreezeMemberships(memberId)` — unfreezes expired frozen subscriptions for one member

---

## 15. Development Setup

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Fill in all required values

# Push schema to database
npx prisma db push

# Start development server
npm run dev
```

### Prisma Studio (database browser)

```bash
npx prisma studio
```

### Type Checking

```bash
npx tsc --noEmit
```

---

## 16. Deployment

Deployment is via Vercel (automatic on push to `main`).

### Pre-deployment Checklist

- [ ] TypeScript passes: `npx tsc --noEmit`
- [ ] No console.log left in production paths
- [ ] Environment variables set in Vercel dashboard
- [ ] Schema changes applied to Neon production DB
- [ ] Cron schedule verified in `vercel.json`

### Database Migrations

For schema changes that could cause data loss:
1. Verify no existing data violates the constraint
2. Run `npx prisma db push --accept-data-loss` only if confirmed safe
3. For production changes without data loss, prefer `npx prisma migrate deploy`

### Vercel Configuration

Key settings in `vercel.json`:
- `crons` — scheduled cron jobs
- Function regions should be set to a region close to the Neon database endpoint

### Rollback

GymRM does not use git tags for production rollbacks. Use the Vercel dashboard to roll back to a previous deployment instantly.
