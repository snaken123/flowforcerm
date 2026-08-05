# GymRM Obsolete Documentation Report

**FlowForceRM — GymRM**
*Audit date: July 2026*

This report identifies documentation that existed prior to the July 2026 regeneration effort and is now obsolete, superseded, or inaccurate based on the current codebase.

---

## Findings

### 1. No Pre-Existing Documentation Directory Was Found

**Finding:** No `/docs` directory existed in the repository before this documentation regeneration effort. The July 2026 documentation suite is the first formal documentation for the GymRM codebase.

**Implication:** There is no old documentation to retire or archive. All documents in `/docs` created by this effort are new.

---

## Inline Documentation (Code Comments)

### 2. Schema Comments Are Accurate

The `prisma/schema.prisma` file contains minimal inline comments. Those present are accurate:
- `// 0=Sun, 1=Mon ... 6=Sat` on `ClassSchedule.dayOfWeek` — correct
- `// denormalized for display even if user deleted` on `AuditLog.userName` — correct
- `// e.g. "ASSIGN_MEMBERSHIP", "FREEZE", "DELETE_SCHEDULE"` on `AuditLog.action` — accurate as examples but not exhaustive
- `// "gmail" | "outlook"` on `EmailIntegration.provider` — the Outlook provider is referenced in the schema comment but the actual implementation only supports Gmail. This is a misleading comment. See the Open Questions report for the outstanding Outlook item.

### 3. Route Handler Comments Are Sparse

Route handler files contain very few comments. Where comments exist, they are brief and accurate. No stale or misleading comments were identified in API routes.

---

## Configuration Documentation

### 4. `vercel.json` Cron Configuration

The `vercel.json` cron schedule should be the canonical source of truth for the cron job timing. Any documentation describing the cron schedule should reference `vercel.json` rather than hardcode the time, as it may change.

---

## External References That May Be Outdated

### 5. Hardcoded Base URL in Web Integration

The web integration client component (`app/(dashboard)/admin/web-integration/web-integration-client.tsx`) has the base URL hardcoded as:
```
https://flowforcerm.com
```

If the application is deployed under a different domain (staging, development), the embed codes shown in the UI will be incorrect. Any documentation that describes the embed URLs should note this as the production URL only.

---

## Summary

| Item | Status |
|------|--------|
| Pre-existing /docs directory | None found — no content to retire |
| Prisma schema comments | Accurate (minor Outlook reference inaccuracy noted) |
| API route inline comments | Sparse but accurate |
| Vercel cron config | Source of truth; reference rather than hardcode in docs |
| Embed URL | Hardcoded to production domain — note in embed documentation |

**Overall:** No significant obsolete documentation was identified. The July 2026 documentation suite starts fresh with an accurate baseline derived from the current codebase.
