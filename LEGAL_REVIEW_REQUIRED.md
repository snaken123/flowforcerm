# FlowForceRM — Legal/Privacy Review Required Before Commercial Launch

This document tracks what the Phase 1 legal/privacy/electronic-agreement system
(see `lib/legal-agreements.ts`, `control-plane/prisma/schema.prisma`'s
`LegalDocument` model, and `/superadmin/legal-documents`) is — and, just as
important, what it is not.

**What was built**: a technical framework for versioning FlowForceRM's own
platform-level legal documents, recording electronic acceptance with a
server-derived timestamp/IP/user-agent/document-hash, gating ADMIN/STAFF login
behind outstanding mandatory documents, and giving a superadmin a
draft → publish → supersede → archive workflow.

**What was not done, and must not be assumed**: none of the above makes
FlowForceRM "legally compliant." No content in this system should be treated as
final until reviewed by qualified Philippine legal/privacy counsel. In
particular:

## Items requiring counsel review before commercial launch

- **Final wording** of the Terms of Service / SaaS Agreement, Privacy Policy,
  Data Processing Agreement, and Acceptable Use Policy. The seeded documents
  (`scripts/seed-legal-documents.ts`) are structural placeholders only.
- **Lawful basis for processing** — the app does not label every processing
  activity as "consent"; the correct lawful basis per activity (contract
  performance, legitimate interest, consent, etc.) under RA 10173 needs
  confirmation.
- **Data-controller / data-processor roles** — this system assumes the gym is
  generally the controller of its own members' data and FlowForceRM is
  generally a processor, but the exact characterization per data category and
  per customer relationship needs legal confirmation, not a blanket assumption.
- **Sensitive personal information handling** — notably `Member.faceDescriptor`
  (biometric facial-recognition data used for kiosk check-in) and
  `Member.medicalNotes` (freeform health/injury notes), both identified during
  this feature's data-inventory audit.
- **Retention periods** — no retention period is hard-coded anywhere in this
  system; all retention is currently indefinite pending a legally reviewed
  policy.
- **Data-subject rights, exemptions, and response timelines** — Phase 1 does not
  implement a structured data-subject-request workflow (see Phase 2 scope
  below); no timeline (e.g. "30 days") should be assumed without NPC guidance.
- **International transfers** — subprocessors used by this codebase include
  Vercel (hosting), Neon (Postgres, provisioned via API per tenant), Resend
  (email), Cloudflare R2 and Vercel Blob (file storage), Google (OAuth +
  optional Gmail inbox sync), Microsoft (OAuth + optional Outlook inbox sync),
  Upstash (rate-limiting, transient IP only, not persisted), and Semaphore
  (Philippine SMS gateway). None of these has been assessed for an applicable
  Philippine international-transfer mechanism.
- **Breach notification obligations and timelines** — not implemented in Phase 1
  (see Phase 2 scope below); no deadline should be assumed without verification
  against RA 10173 / NPC requirements.
- **Organization representative authority** — this system assumes an ADMIN-role
  user is authorized to accept the SaaS Agreement/DPA on the gym's behalf (see
  `ORG_SCOPED_TYPES` in `lib/legal-agreements.ts`). Whether that assumption is
  legally sufficient, or whether a more formal authorization step is needed,
  requires review.
- **Governing law, dispute resolution, liability limitations, indemnification,
  and termination/data-deletion terms** — all marked as placeholders in the
  seeded documents, unwritten pending counsel.
- **Marketing communications** — no marketing-consent mechanism exists yet;
  if/when FlowForceRM sends promotional email/SMS, a separate, revocable consent
  mechanism should be built rather than bundling it into these agreements.
- **Cookies/tracking** — this codebase currently uses no analytics, tracking
  pixels, or third-party trackers (confirmed during this feature's audit), so no
  cookie-consent banner was built. Re-verify before adding any such technology.
- **Electronic contracting validity** — whether the acceptance record shape here
  (server timestamp, IP, user-agent, document hash, immutable row) is sufficient
  under RA 8792 (Electronic Commerce Act) for the intended contractual weight of
  each document type.

## Explicitly deferred to a Phase 2 pass (not built yet)

- Structured data-subject request workflow (submit → verify → review → act →
  close, with types ACCESS/CORRECTION/DELETION/OBJECTION/DATA_PORTABILITY/OTHER)
- Subprocessor registry surfaced in-product (the list above exists only in this
  document for now)
- Security/privacy incident management (recording, severity, containment,
  notification workflow)
- Data export/deletion infrastructure beyond what already existed
  (`app/api/member/privacy/export`, `app/api/member/privacy/deletion-request`)

## What this document is not

This is an engineering checklist, not a legal opinion. It exists so nothing in
Phase 1's implementation is mistaken for a compliance sign-off.
