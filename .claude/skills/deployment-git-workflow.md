---
name: deployment-git-workflow
description: Git workflow and deployment process for the NorthSouth gym CRM. Invoke before committing or pushing to understand branching strategy, deploy targets, and post-deploy checks.
---

## Deployment

- **Platform:** Vercel
- **Trigger:** every `git push` to `main` auto-deploys to production
- **Production URL:** app.northsouth.com.ph
- **No staging environment** — changes go straight to prod; test locally before pushing

---

## Git workflow

### Branch strategy
- Work directly on `main` for this project (single developer, no PR review process)
- All commits go to `main` and auto-deploy

### Commit after every working change
After any feature or fix that leaves the app in a working state:

```bash
git add <specific files>
git commit -m "Short description of what and why"
git push
```

**Never use `git add .` or `git add -A`** — add files by name to avoid accidentally committing `.env`, test output, or build artifacts.

### Commit message format
- Present tense, imperative mood: "Fix delete route using wrong field" not "Fixed" or "Fixes"
- One line for simple changes; add a blank line + detail for complex ones
- Reference what broke and why the fix works (e.g., "was filtering by sessionId (sport type) instead of scheduleId (specific slot)")

---

## Before pushing

1. **Verify the app runs:** check for TypeScript errors, broken imports, missing fields
2. **Test the changed feature** in the browser (local dev server)
3. **Check related features** haven't regressed
4. **No console errors** in the browser dev tools
5. **No TODO comments** in the committed files

---

## Local development

```bash
# Start dev server
npm run dev
# or
npx next dev
```

Server runs at `http://localhost:3000`.

### Environment variables
Stored in `.env.local` (not committed). Required:
- `DATABASE_URL` — Neon PostgreSQL connection string
- `NEXTAUTH_SECRET` — NextAuth JWT secret
- `NEXTAUTH_URL` — `http://localhost:3000` for local dev

### Database changes
```bash
# After editing prisma/schema.prisma:
npx prisma db push

# Regenerate Prisma client after schema change:
npx prisma generate

# Open Prisma Studio (visual DB browser):
npx prisma studio
```

**Never run `prisma migrate` — this project uses `db push` only.**

---

## Vercel deployment notes

- Build command: `next build` (Vercel default)
- Output directory: `.next` (Vercel default)
- Environment variables are set in Vercel dashboard — match `.env.local` keys
- If a deploy fails, check Vercel dashboard → Deployments → latest → Function Logs
- Neon DB connection: uses pooled connection string in production (`?pgbouncer=true&connection_limit=1` may be needed if seeing connection exhaustion)

---

## Post-deploy checklist

After pushing to main, verify on production:
1. Open app.northsouth.com.ph — no 500 errors on load
2. Log in as admin — schedule page loads with correct data
3. Log in as member — member schedule renders without errors
4. Check Vercel Function Logs for any runtime errors
5. If a DB schema change was pushed: verify `npx prisma db push` was run against the production Neon DB (environment variable DATABASE_URL pointing to prod)

---

## Rollback

If a deploy breaks production:
```bash
# Revert the last commit locally
git revert HEAD
git push
# Vercel will auto-deploy the revert
```

Do not use `git reset --hard` on `main` — it rewrites history and makes push/rollback harder.
