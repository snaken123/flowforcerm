# FlowForceRM — New Session Starter Prompt

Paste this entire prompt as your first message in a new Claude Code session opened at `C:\Code\flowforcerm`.

---

## Assignment

You are setting up **FlowForceRM** — a white-label fork of the NorthSouth GymCRM codebase. This is a production-grade multi-tenant SaaS application for gym management. The codebase already exists at `C:\Code\flowforcerm` (cloned from `https://github.com/snaken123/flowforcerm`). Your job is to rebrand it, reconfigure all external services, and apply one architectural change (receipt storage). Do not redesign anything. Do not add features. Do not remove features. Match the existing architecture exactly.

Work through every phase below in order. Commit and push after every phase. Verify the Vercel deployment succeeds before moving to the next phase.

---

## Phase 0 — Clone GymCRM into FlowForceRM

The `C:\Code\flowforcerm` folder exists but the GitHub repo `https://github.com/snaken123/flowforcerm` may be empty. Copy the entire GymCRM codebase into it and push as the starting point.

**Steps:**

1. Confirm the source repo is at `C:\Code\gym-crm` and the destination folder is `C:\Code\flowforcerm`.

2. Copy all files from gym-crm into flowforcerm, excluding git history, node_modules, and generated files:
   ```bash
   cd C:\Code
   robocopy gym-crm flowforcerm /E /XD ".git" "node_modules" ".next" /XF ".env" ".env.local"
   ```

3. Navigate into the flowforcerm folder and confirm the git remote is pointing to the correct repo:
   ```bash
   cd C:\Code\flowforcerm
   git remote -v
   ```
   It should show `https://github.com/snaken123/flowforcerm`. If not, set it:
   ```bash
   git remote set-url origin https://github.com/snaken123/flowforcerm
   ```

4. Stage everything, commit, and push:
   ```bash
   git add -A
   git commit -m "Initial: copy GymCRM codebase as FlowForceRM baseline"
   git push -u origin main
   ```

5. Install dependencies:
   ```bash
   npm install
   ```

6. Confirm the project builds before making any changes:
   ```bash
   npx tsc --noEmit
   ```
   Fix any pre-existing TypeScript errors before proceeding. Do not continue to Phase 1 until the build is clean.

Now proceed to Phase 1.

---

## Brand Identity

| Item | Value |
|---|---|
| App name | **FlowForceRM** |
| Tagline | **Manage Less. Train More.** |
| Replace all instances of | `NorthSouth Fight Sports` → `FlowForceRM` |
| Replace all instances of | `NorthSouth` → `FlowForceRM` |
| Replace all instances of | `northsouth` → `flowforcerm` (lowercase, in URLs, slugs, filenames) |
| Replace all instances of | `North South` → `FlowForce` |
| Tagline replaces | Any gym subtitle/description text that previously read like "NorthSouth Fight Sports" — use "Manage Less. Train More." |

---

## Logo Files

All logo files are at `C:\Code\FlowForceRM\Logo\`:

| File | Use |
|---|---|
| `FlowForceRM Main Logo.png` | Primary logo — light backgrounds (sidebar, login page, emails) |
| `FlowForceRM Main Banner.png` | Wide/banner format — header areas, cover pages |
| `FlowForceRM Manage Less Train More.png` | Logo + tagline lockup — splash screens, onboarding |

**Steps:**
1. Copy all three files into the repo at `public/` with cleaned filenames:
   - `public/logo.png` (Main Logo)
   - `public/logo-banner.png` (Main Banner)
   - `public/logo-tagline.png` (Logo + Tagline)
2. Find every place in the codebase where the NorthSouth logo (`NS LOGO.png`, `white circle on black.png`, or any `/NS` image) is referenced and replace with the appropriate FlowForceRM file above.
3. The sidebar logo, login page logo, email header logo, and any embed/pricelist logo must all be updated.
4. Generate a dark-background variant: if any UI location uses a logo on a dark/colored header, use `logo.png` (it has sufficient contrast). If a dedicated dark variant is needed, note it and use CSS `filter: brightness(0) invert(1)` as a fallback — do not generate new image files.

---

## External Services Configuration

### Environment Variables to Set

Set these in the **Vercel project** (`flowforcerm.vercel.app`) under Settings → Environment Variables. Also create a `.env.local` at `C:\Code\flowforcerm\.env.local` for local dev.

```env
# Database (Neon project: dry-base-48983992 at https://console.neon.tech/app/projects/dry-base-48983992)
DATABASE_URL=<pooled connection string from Neon project dry-base-48983992>
DIRECT_URL=<direct connection string from Neon project dry-base-48983992>

# Auth
NEXTAUTH_URL=https://flowforcerm.com
NEXTAUTH_SECRET=<generate with: openssl rand -base64 32>

# App
APP_URL=https://flowforcerm.com
TZ=Asia/Manila

# Email (Resend — add flowforcerm.com domain on existing Resend account)
RESEND_API_KEY=<Resend API key for flowforcerm.com domain>

# SMS (Semaphore — same account, sender name: FlowForceRM)
SEMAPHORE_API_KEY=<existing Semaphore key>
SEMAPHORE_SENDER=FlowForceRM

# File Storage (Cloudflare R2 — see Phase 4)
R2_ACCOUNT_ID=<Cloudflare account ID — found in Cloudflare dashboard → right sidebar>
R2_ACCESS_KEY_ID=<R2 API token Access Key ID>
R2_SECRET_ACCESS_KEY=<R2 API token Secret Access Key>
R2_BUCKET_NAME=flowforcerm-receipts
R2_PUBLIC_URL=https://receipts.flowforcerm.com

# Google OAuth (Gmail integration — same Google Cloud project, update redirect URI)
GOOGLE_CLIENT_ID=<existing>
GOOGLE_CLIENT_SECRET=<existing>
NEXT_PUBLIC_GOOGLE_CLIENT_ID=<existing>

# Cron
CRON_SECRET=<generate with: openssl rand -base64 32>
```

**Remove these env vars — they are replaced by Cloudflare R2:**
```
GOOGLE_DRIVE_FOLDER_ID
GOOGLE_SERVICE_ACCOUNT_EMAIL
GOOGLE_SERVICE_ACCOUNT_KEY
```

---

## Phase 1 — Text & String Replacements

Search the entire codebase (all `.ts`, `.tsx`, `.js`, `.json`, `.html`, `.md` files) and apply these replacements:

| Find | Replace |
|---|---|
| `NorthSouth Fight Sports` | `FlowForceRM` |
| `NorthSouth fight sports` | `FlowForceRM` |
| `NorthSouth` | `FlowForceRM` |
| `northsouth` | `flowforcerm` |
| `north-south` | `flowforcerm` |
| `NORTHSOUTH` | `FLOWFORCERM` |
| `North South` | `FlowForce` |
| `app.northsouth.com.ph` | `flowforcerm.com` |
| `members@northsouth.com.ph` | `members@flowforcerm.com` |
| `no-reply@northsouth.com.ph` | `noreply@flowforcerm.com` |
| `kiosk.northsouth.com.ph` | `flowforcerm.com/kiosk` |

**Important files to check:**
- `lib/email.ts` — FROM address, all email HTML body copy
- `lib/auth.ts` — any hardcoded URLs
- `next.config.js` — kiosk rewrite rules (see Phase 3)
- `app/api/cron/membership-notifications/route.ts` — FROM address
- `app/api/sms/**` — sender name
- All email template strings
- `prisma/schema.prisma` — no changes needed, but verify no hardcoded strings
- `app/embed/pricelist/page.tsx` — gym name in embed
- `docs/` — any documentation files
- `public/` — any HTML or JSON files with the gym name

After replacements: run `npx tsc --noEmit` to confirm no TypeScript errors, then commit.

---

## Phase 2 — Logo Replacement

1. Copy logo files from `C:\Code\FlowForceRM\Logo\` to `public/` as described above.
2. Find every image reference in the codebase pointing to NorthSouth logos:
   ```bash
   grep -rn "NS LOGO\|white circle\|ns-logo\|northsouth.*logo\|logo.*northsouth" --include="*.ts" --include="*.tsx" --include="*.html" --include="*.css" .
   ```
3. Replace each reference with the appropriate FlowForceRM logo file.
4. Common locations:
   - Sidebar component — replace logo `<img>` or `<Image>` src
   - Login/auth pages — replace logo
   - Email templates in `lib/email.ts` — replace any logo `<img>` src with a hosted URL (use `https://flowforcerm.com/logo.png` once deployed)
   - Pricelist embed page
   - Any PDF/presentation export scripts

Commit after logo replacement.

---

## Phase 3 — Kiosk Routing Change

In the GymCRM codebase, the kiosk was accessed via a subdomain (`kiosk.northsouth.com.ph`). **FlowForceRM has no kiosk subdomain.** The kiosk must be accessible at `flowforcerm.com/kiosk`.

**Steps:**
1. Open `next.config.js` and find the rewrite rule for `kiosk.northsouth.com.ph`. Remove that rewrite entirely.
2. Open `middleware.ts` and find any logic that detects the kiosk subdomain via `req.headers.get("host")`. Replace the subdomain check with a pathname check: `req.nextUrl.pathname.startsWith("/kiosk")`.
3. Verify the kiosk login page, kiosk check-in flow, and KIOSK role routing all work via `/kiosk` path rather than subdomain.
4. Update any hardcoded kiosk URL strings to `https://flowforcerm.com/kiosk`.

Commit after kiosk routing is working.

---

## Phase 4 — Replace Google Drive with Cloudflare R2 Storage

Receipt/photo uploads currently go to Google Drive via a service account. Replace this entirely with **Cloudflare R2** — S3-compatible object storage on your existing Cloudflare account. R2 has no egress fees and a generous free tier (10 GB storage, 10M reads/month).

### Setup

**In Cloudflare Dashboard:**
1. Go to **R2 Object Storage → Create bucket**.
2. Name the bucket `flowforcerm-receipts`. Region: automatic.
3. Go to **R2 → Manage R2 API Tokens → Create API Token**.
   - Permissions: **Object Read & Write**
   - Scope: **Specific bucket → flowforcerm-receipts**
   - Copy the **Access Key ID** and **Secret Access Key** — they are only shown once.
4. Copy your **Cloudflare Account ID** from the right sidebar of the Cloudflare dashboard.
5. Enable **Public access** on the bucket:
   - Go to the bucket → Settings → Public Access → Allow Access.
   - Connect a custom subdomain: `receipts.flowforcerm.com` → add the CNAME in Cloudflare DNS (Cloudflare will prompt you).
   - This makes uploaded files accessible at `https://receipts.flowforcerm.com/<filename>`.

**Install the AWS SDK (R2 is S3-compatible):**
```bash
npm install @aws-sdk/client-s3
```

**Add env vars** to Vercel and `.env.local`:
```env
R2_ACCOUNT_ID=<your Cloudflare account ID>
R2_ACCESS_KEY_ID=<R2 API token Access Key ID>
R2_SECRET_ACCESS_KEY=<R2 API token Secret Access Key>
R2_BUCKET_NAME=flowforcerm-receipts
R2_PUBLIC_URL=https://receipts.flowforcerm.com
```

### Code Changes

**Create `lib/r2.ts`** — R2 client helper:

```typescript
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

export const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export async function uploadToR2(key: string, body: Buffer, contentType: string): Promise<string> {
  await r2.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
    Body: body,
    ContentType: contentType,
  }));
  return `${process.env.R2_PUBLIC_URL}/${key}`;
}
```

**`app/api/upload-receipt/route.ts`** — Rewrite this file completely:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { uploadToR2 } from "@/lib/r2";

function buildFileName(params: {
  date: string; lastName: string; sport: string;
  package: string; amount: number; paymentMethod: string; ext: string;
}): string {
  const d = new Date(params.date);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yyyy = d.getFullYear();
  const clean = (s: string) => s.replace(/[^a-zA-Z0-9]/g, "");
  return `receipts/${mm}${dd}${yyyy}_${clean(params.lastName)}_${clean(params.sport)}_${clean(params.package)}_Php${Math.round(params.amount)}_${clean(params.paymentMethod)}.${params.ext}`;
}

const ALLOWED = ["jpg", "jpeg", "png", "webp", "gif", "pdf"];

export async function POST(req: NextRequest) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as any).role;
  if (!["ADMIN", "STAFF", "STORE"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const memberId = formData.get("memberId") as string | null;
  const sport = formData.get("sport") as string;
  const pkg = formData.get("package") as string;
  const amount = parseFloat(formData.get("amount") as string);
  const paymentMethod = formData.get("paymentMethod") as string;

  let lastName = (formData.get("lastName") as string) || "";
  if (!lastName && memberId) {
    const m = await prisma.member.findUnique({ where: { id: memberId }, select: { lastName: true } });
    lastName = m?.lastName ?? "";
  }

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  const ext = (file.name.split(".").pop() ?? "").toLowerCase();
  if (!ALLOWED.includes(ext)) {
    return NextResponse.json({ error: "File type not allowed. Accepted: jpg, jpeg, png, webp, gif, pdf." }, { status: 415 });
  }

  const key = buildFileName({ date: new Date().toISOString(), lastName, sport, package: pkg, amount, paymentMethod, ext });
  const buffer = Buffer.from(await file.arrayBuffer());
  const publicUrl = await uploadToR2(key, buffer, file.type || "image/jpeg");

  return NextResponse.json({
    id: key,
    name: key.split("/").pop(),
    link: publicUrl,
    imageUrl: publicUrl,
  });
}
```

**Anywhere in the codebase that references Google Drive thumbnail URLs** (`https://drive.google.com/thumbnail?id=...`) or Drive `webViewLink` URLs — replace with the R2 public URL stored in the database. The URL returned from `uploadToR2()` is a direct public link.

**Do NOT remove `googleapis`** from `package.json` — it is still used by the Gmail email integration.

Commit after R2 upload is working and verified.

---

## Phase 5 — Database Setup

The Neon project `dry-base-48983992` may have existing data from a previous setup attempt. Clear it before pushing the schema:

```bash
# In Neon console (https://console.neon.tech/app/projects/dry-base-48983992):
# Drop all tables via SQL editor: DROP SCHEMA public CASCADE; CREATE SCHEMA public;
# Then push the schema:
npx prisma db push
npx prisma generate
```

Verify the schema pushes cleanly with no errors.

---

## Phase 6 — Resend Domain Setup

1. Log into Resend (same account used for NorthSouth).
2. Go to **Domains → Add Domain** → enter `flowforcerm.com`.
3. Resend will provide DNS records (SPF, DKIM, DMARC). Add them in **Cloudflare** for `flowforcerm.com`.
4. Verify the domain in Resend (usually takes a few minutes after DNS propagation).
5. Update the `RESEND_API_KEY` env var — use a new API key scoped to the `flowforcerm.com` domain, or the existing key if it is domain-agnostic.

---

## Phase 7 — Google OAuth Redirect URI

The Gmail email integration uses Google OAuth. Add the FlowForceRM redirect URI to the existing Google Cloud OAuth app:

1. Go to Google Cloud Console → APIs & Services → Credentials → your OAuth 2.0 client.
2. Add to **Authorized redirect URIs**:
   - `https://flowforcerm.com/api/email/callback/gmail`
   - `https://flowforcerm.com/api/auth/callback/google`
3. Save.

---

## Phase 8 — Vercel Deployment

1. The Vercel project `flowforcerm.vercel.app` is already linked to the `https://github.com/snaken123/flowforcerm` repo.
2. Set all environment variables from the Phase 0 table above in Vercel → Settings → Environment Variables (Production, Preview, Development).
3. Add custom domain in Vercel → Settings → Domains:
   - `flowforcerm.com`
   - `www.flowforcerm.com`
4. Vercel will provide an A record or CNAME. Add it in **Cloudflare**. Set Cloudflare proxy to **DNS only (grey cloud)** for the record Vercel requires — Vercel manages SSL.
5. Push the final commit and confirm the Vercel build succeeds (green).

---

## Phase 9 — Post-Deployment Verification

After the domain is live, test each flow:

| Test | Expected result |
|---|---|
| `https://flowforcerm.com` | Login page loads with FlowForceRM logo |
| `https://flowforcerm.com/kiosk` | Kiosk login page loads |
| Register first ADMIN user | Works via `/register` route |
| Upload a receipt (Shop or Assign Membership) | File stored in Cloudflare R2, URL saved to DB, image loads from `receipts.flowforcerm.com` |
| Send a test email via Communications | Arrives from `members@flowforcerm.com` |
| Send a test SMS | Sender shows `FlowForceRM` |
| Automated notifications cron | FROM shows `FlowForceRM` |
| Pricelist embed | Shows FlowForceRM branding |
| Gmail connect | Redirects to `flowforcerm.com/api/email/callback/gmail` |

---

## Files Known to Require Changes

| File | Change |
|---|---|
| `lib/email.ts` | FROM address, all HTML body copy, logo src URL |
| `lib/auth.ts` | Any hardcoded domain references |
| `next.config.js` | Remove kiosk subdomain rewrite |
| `middleware.ts` | Kiosk detection: subdomain → pathname |
| `lib/r2.ts` | New file — Cloudflare R2 client helper |
| `app/api/upload-receipt/route.ts` | Full rewrite to Cloudflare R2 |
| `app/api/cron/membership-notifications/route.ts` | FROM, APP_URL, replyTo |
| `app/api/sms/broadcast/route.ts` | Sender name env var |
| `app/embed/pricelist/page.tsx` | Gym name in embed |
| `app/(auth)/login/page.tsx` | Logo image |
| Sidebar component | Logo image |
| Any component showing gym name in header | Brand name |
| `public/` | Add FlowForceRM logo files |
| `.env.local` | All new env vars |
| `vercel.json` or `next.config.js` | Kiosk route |

---

## Assumptions

- The codebase at `C:\Code\flowforcerm` is a direct clone of the NorthSouth GymCRM repo — same code, same schema, same features.
- No feature additions or removals are in scope for this session. Pure rebrand + reconfiguration + storage swap.
- The `googleapis` package is **kept** because the Gmail email integration (inbox, compose, send) still uses it. Only the Google Drive service account code is removed.
- Color scheme remains the same (primary blue — no Tailwind theme changes needed).
- All admin/staff/member/kiosk roles and flows are identical to NorthSouth GymCRM.

---

## Definition of Done

This session is complete when:
- [ ] All text instances of NorthSouth/northsouth replaced with FlowForceRM/flowforcerm
- [ ] All logo references updated to FlowForceRM files
- [ ] Kiosk accessible at `/kiosk` path (no subdomain)
- [ ] Google Drive upload replaced with Cloudflare R2 (`lib/r2.ts` created, `upload-receipt` route rewritten)
- [ ] Schema pushed to Neon `dry-base-48983992`
- [ ] Resend domain `flowforcerm.com` verified
- [ ] All env vars set in Vercel and `.env.local`
- [ ] `flowforcerm.com` domain resolves to the app
- [ ] TypeScript builds clean (`npx tsc --noEmit` → no errors)
- [ ] Vercel deployment is green
- [ ] Post-deployment verification checklist passes
