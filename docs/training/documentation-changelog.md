# GymRM Documentation Changelog
## NorthSouth Fight Sports

*Tracks all documentation changes across the project's doc suite.*

---

## v2.1 — July 2026

**Scope:** Screenshots added to User Manual. 20 screenshots captured from live app using Playwright.

- `docs/screenshots/` directory created with 20 production screenshots
- Screenshot references embedded in User Manual sections 2–18
- Documentation Accuracy Report updated with screenshot inventory
- Scripts added: `scripts/capture-screenshots.mjs`, `scripts/capture-fix.mjs`, `scripts/capture-final.mjs`

---

## v2.0 — July 2026

**Scope:** Complete documentation overhaul following the July 2026 security hardening release and open-questions resolution. All four base documentation files updated to reflect codebase state. New training package created.

### New Files

| File | Description |
|------|-------------|
| `docs/training/quick-reference-guides.md` | One-page cheat sheets for Front Desk, Admin, Coach, Member, and Store roles |
| `docs/training/faq.md` | Common questions and answers for staff and members |
| `docs/training/troubleshooting-guide.md` | Symptom-cause-resolution guide for common issues |
| `docs/training/trainer-guide.md` | Facilitator reference for running the staff training session |
| `docs/training/training-workbook.md` | Hands-on exercises covering beginner through advanced workflows |
| `docs/training/documentation-changelog.md` | This file |
| `docs/training/undocumented-features.md` | Features in the codebase not yet covered in documentation |
| `docs/training/documentation-accuracy-report.md` | Verification report: what was validated, what was not, and known gaps |

### Updated Files

**`docs/user-manual.md`** (major revision — v2.0)
- Rewritten as a comprehensive 20-section manual
- All content based on real data from the live application (1,246 athletes, 195 subscriptions, 13 services, 4 employees)
- Added: duplicate check-in workflow
- Added: same-day force check-in behavior
- Added: freeTrialEnabled service flag
- Added: employee payments in revenue report
- Added: CheckIn → Service FK behavior (SET NULL on delete)
- Added: Pricelist persistence via SystemSetting
- Added: Subscription notes editing
- Added: Complete permissions matrix table
- Added: Payment sub-type requirements (Bank Transfer, eWallet)
- Updated: Store POS workflow to include special-price justification requirement
- Updated: Freeze/unfreeze to include admin password requirement

**`docs/api-documentation.md`** (major revision)
- Added: `PATCH /api/subscriptions/[id]` — `notes` field (max 500 chars)
- Added: `POST /api/checkins` — `force: true` bypass and 409 `already_checked_in_today` response
- Added: `GET /api/admin/settings/pricelist` — returns pricelist config
- Added: `POST /api/admin/settings/pricelist` — upserts pricelist config to SystemSetting

**`docs/database-reference.md`** (major revision)
- Added: `Service` model table (was missing from v1.0)
- Added: `freeTrialEnabled` field to Service model
- Updated: `CheckIn.serviceId` — now documented as FK with ON DELETE SET NULL (was loose string)
- Updated: Service model — added `checkIns CheckIn[]` relation
- Added: `docs/training/` directory structure

**`docs/open-questions.md`** (major revision)
- OQ-010 through OQ-017: all resolved
- Resolved Questions table updated with all decisions
- Remaining open questions (OQ-002, OQ-003, OQ-005, OQ-006, OQ-008, OQ-009, OQ-011, OQ-013, OQ-014) remain documented for future resolution

**`docs/release-notes.md`** (minor revision)
- Added: "July 2026 — Open Questions Resolution" section
- Added: 7 entries covering freeTrialEnabled, duplicate check-in warning, subscription notes, pricelist persistence, employee payments, CheckIn FK, and STORE role data restriction

---

## v1.0 — Initial Audit (July 2026)

**Scope:** Initial documentation audit. No prior documentation existed. All four base files created from codebase exploration.

### New Files

| File | Description |
|------|-------------|
| `docs/user-manual.md` | First-pass user manual (incomplete; v2.0 is the current version) |
| `docs/api-documentation.md` | Full API reference derived from route handlers |
| `docs/database-reference.md` | Prisma schema reference with field definitions |
| `docs/open-questions.md` | 17 open questions from the audit |
| `docs/release-notes.md` | Historical changelog derived from codebase analysis |

### Audit Findings

The initial audit identified:
- 22 code-level security findings (addressed in the Security Hardening Release)
- 17 open questions (10 resolved with code changes, 7 resolved as "leave as-is")
- Several missing or incomplete database-reference entries

---

## Documentation Owners

| Document | Owner | Review Frequency |
|----------|-------|-----------------|
| User Manual | Gym Owner / Admin | On every major feature release |
| API Documentation | Developer | On every API change |
| Database Reference | Developer | On every schema change |
| Open Questions | Developer + Owner | Ongoing |
| Release Notes | Developer | On every release |
| Training Package | Trainer | Annually or when workflows change |

---

*NorthSouth Fight Sports — Documentation Changelog v2.0 — July 2026*
