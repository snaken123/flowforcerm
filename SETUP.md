# GymCRM — Setup Guide

## Prerequisites
- Node.js 18+ (https://nodejs.org)
- A PostgreSQL database (free options: https://neon.tech or https://supabase.com)

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
Copy `.env.example` to `.env.local` and fill in the values:

```bash
cp .env.example .env.local
```

**Minimum required to run locally:**
```
DATABASE_URL=postgresql://...   # from Neon or Supabase
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=any-random-string-here
```

Generate a secret with:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 3. Set up the database
```bash
npm run db:generate   # generates Prisma client
npm run db:push       # creates all tables
npm run db:seed       # adds demo data
```

### 4. Run the app
```bash
npm run dev
```

Open http://localhost:3000

---

## Demo Login Accounts

| Role       | Email                  | Password   |
|------------|------------------------|------------|
| Admin      | admin@mygym.com        | admin123   |
| Staff      | staff@mygym.com        | staff123   |
| Member     | carlos@example.com     | member123  |

---

## Email Integration (Gmail)

1. Go to https://console.cloud.google.com
2. Create a project → Enable **Gmail API**
3. Create OAuth 2.0 credentials (Web application)
4. Add authorized redirect URI:
   `http://localhost:3000/api/email/callback/gmail`
5. Add to `.env.local`:
   ```
   GOOGLE_CLIENT_ID=your-client-id
   GOOGLE_CLIENT_SECRET=your-client-secret
   ```
6. Log in as Admin → go to Email → click **Connect Gmail**

---

## Deployment (Vercel)

1. Push to GitHub
2. Import project at https://vercel.com/new
3. Add all environment variables from `.env.local`
4. For `NEXTAUTH_URL`, use your Vercel deployment URL
5. Add the Vercel URL to your Google OAuth allowed redirect URIs

---

## Role Access Matrix

| Feature              | Admin | Staff | Member |
|----------------------|-------|-------|--------|
| Dashboard overview   | ✅    | ✅    | ✅     |
| View all members     | ✅    | ✅    | ❌     |
| Add/edit members     | ✅    | ❌    | ❌     |
| Check-in members     | ✅    | ✅    | ❌     |
| Manage services      | ✅    | ❌    | ❌     |
| Manage employees     | ✅    | ❌    | ❌     |
| Manage subscriptions | ✅    | ❌    | ❌     |
| Email inbox          | ✅    | ❌    | ❌     |
| Reports              | ✅    | ❌    | ❌     |
| View own profile     | ❌    | ❌    | ✅     |
| View own schedule    | ❌    | ❌    | ✅     |
| View own billing     | ❌    | ❌    | ✅     |

---

## Project Structure

```
gym-crm/
├── app/
│   ├── (auth)/login/          # Login page
│   ├── (dashboard)/
│   │   ├── admin/             # Admin-only pages
│   │   │   ├── members/       # Member management
│   │   │   ├── employees/     # Employee management
│   │   │   ├── services/      # Services / martial arts
│   │   │   ├── subscriptions/ # Subscription management
│   │   │   ├── schedule/      # Weekly schedule
│   │   │   ├── email/         # Gmail/Outlook inbox
│   │   │   └── reports/       # Analytics charts
│   │   ├── staff/checkin/     # Quick check-in terminal
│   │   ├── member/            # Member self-service portal
│   │   └── dashboard/         # Main dashboard
│   └── api/                   # REST API routes
├── components/
│   ├── ui/                    # shadcn/ui components
│   └── layout/sidebar.tsx     # Navigation sidebar
├── lib/
│   ├── auth.ts                # NextAuth config
│   ├── db.ts                  # Prisma client
│   ├── gmail.ts               # Gmail API helpers
│   └── utils.ts               # Shared utilities
└── prisma/
    ├── schema.prisma           # Database schema
    └── seed.ts                 # Demo data seeder
```
