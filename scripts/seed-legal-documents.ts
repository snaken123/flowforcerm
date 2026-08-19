// Seeds DEVELOPMENT PLACEHOLDER versions of FlowForceRM's own platform-level
// legal documents (Terms of Service, Privacy Policy, DPA, Acceptable Use Policy)
// into the control-plane database, left in DRAFT status.
//
// Left in DRAFT deliberately: nothing gates any live tenant's ADMIN/STAFF login
// until a superadmin explicitly reviews and publishes a document via
// /superadmin/legal-documents. This script does not publish anything.
//
// Usage: npx tsx --env-file=.env.local scripts/seed-legal-documents.ts

import { controlPlanePrisma } from "../control-plane/lib/db";

const BANNER =
  "**DRAFT / PLACEHOLDER — REQUIRES REVIEW AND APPROVAL BY QUALIFIED PHILIPPINE LEGAL/PRIVACY COUNSEL BEFORE COMMERCIAL USE.**\n\n" +
  "This document is a technical placeholder only. It does not constitute legal advice and has not been reviewed by counsel.\n\n---\n\n";

const DOCUMENTS = [
  {
    type: "TERMS_OF_SERVICE" as const,
    title: "FlowForceRM Terms of Service",
    version: "1.0",
    content:
      BANNER +
      `## FlowForceRM SaaS Agreement

This is a placeholder Terms of Service between FlowForceRM ("we," "us," "the Platform") and the gym or organization ("Customer," "you") using the FlowForceRM software-as-a-service platform.

### 1. The Service
FlowForceRM provides a gym relationship management platform, including member management, scheduling, billing, and related tools, accessed as a hosted service.

### 2. Accounts and Authorized Representatives
Customer designates one or more administrators authorized to manage its account. [Placeholder — the scope of authority required to bind Customer to this agreement requires legal review.]

### 3. Fees and Billing
[Placeholder — billing terms, payment cycles, and late-payment consequences require legal and business review.]

### 4. Customer Data
Customer retains ownership of its own data (member records, schedules, payment records, and other Customer-generated content) processed through the Service. FlowForceRM's own intellectual property (source code, platform architecture, and branding) is separate from Customer Data. [Placeholder — full ownership, license, and data-return-on-termination terms require legal review.]

### 5. Data Processing
Where FlowForceRM processes personal information on Customer's behalf, the terms of the Data Processing Agreement apply.

### 6. Term and Termination
[Placeholder — requires legal review.]

### 7. Limitation of Liability
[Placeholder — requires legal review.]

### 8. Governing Law
[Placeholder — intended to be Philippine law; requires legal review before finalization.]
`,
    summaryOfChanges: "Initial placeholder version.",
  },
  {
    type: "PRIVACY_POLICY" as const,
    title: "FlowForceRM Privacy Policy",
    version: "1.0",
    content:
      BANNER +
      `## FlowForceRM Privacy Policy

This Privacy Policy describes how FlowForceRM ("we," "us") processes personal information as the operator of the FlowForceRM platform, in connection with the Philippine Data Privacy Act of 2012 (Republic Act No. 10173) and its Implementing Rules and Regulations.

This Privacy Policy is separate from — and does not replace — your gym's own privacy notice to its members, which your gym configures and is responsible for.

### 1. Who This Applies To
This policy applies to gym administrators, staff, and other individuals who directly access the FlowForceRM platform.

### 2. Information We Process
[Placeholder — the categories of information FlowForceRM processes as a platform operator (account credentials, usage logs, support communications, and technical data) require confirmation against the actual data inventory before finalization.]

### 3. Purposes and Lawful Basis
[Placeholder — the lawful basis for each processing activity (e.g. contract performance, legitimate interest, consent) requires review by qualified privacy counsel. Not every processing activity is "consent."]

### 4. FlowForceRM's Role
For most Customer/gym member data, FlowForceRM acts as a service provider processing information on the gym's instructions. The exact controller/processor relationship for each category of data requires legal confirmation and will be documented in the Data Processing Agreement.

### 5. Subprocessors
FlowForceRM uses third-party service providers (hosting, database, email delivery, and similar infrastructure providers) to operate the platform. [Placeholder — see the Subprocessors list once published.]

### 6. Your Rights
Subject to applicable law, you may have rights to access, correct, or request deletion of your personal information. [Placeholder — exact rights, exemptions, and verification requirements require confirmation against NPC guidance.]

### 7. Retention
[Placeholder — retention periods require legal/business review.]

### 8. Contact
[Placeholder — a designated privacy contact will be published once formally established.]
`,
    summaryOfChanges: "Initial placeholder version.",
  },
  {
    type: "DATA_PROCESSING_AGREEMENT" as const,
    title: "FlowForceRM Data Processing Agreement",
    version: "1.0",
    content:
      BANNER +
      `## FlowForceRM Data Processing Agreement (DPA)

This DPA supplements the FlowForceRM Terms of Service and describes how FlowForceRM processes personal information on behalf of Customer (the gym) in connection with the FlowForceRM platform.

### 1. Roles
Customer determines the purposes and means of processing its members' personal information for its own gym operations. FlowForceRM processes that information on Customer's behalf, according to Customer's instructions and this DPA. [Placeholder — the exact controller/processor characterization for each data category requires legal confirmation; it may not be identical across every Customer relationship.]

### 2. Scope of Processing
[Placeholder — categories of data, purposes, and duration of processing require confirmation against the actual data inventory.]

### 3. Subprocessors
FlowForceRM may engage subprocessors to provide the Service (hosting, database, email delivery, and similar infrastructure). [Placeholder — see the Subprocessors list once published; this section should describe the notification/objection process for new subprocessors.]

### 4. Security Measures
[Placeholder — technical and organizational measures require review against actual implemented controls.]

### 5. International Transfers
[Placeholder — if any subprocessor is located outside the Philippines, the applicable transfer mechanism requires legal review before this section can be finalized.]

### 6. Data Subject Requests
FlowForceRM will provide reasonable assistance to Customer in responding to data-subject requests concerning Customer's members. [Placeholder — requires legal review of scope and timelines.]

### 7. Breach Notification
[Placeholder — notification timelines and process require confirmation against applicable Philippine requirements before finalization; no deadline should be assumed without verification.]

### 8. Return or Deletion of Data on Termination
[Placeholder — requires legal/business review.]
`,
    summaryOfChanges: "Initial placeholder version.",
  },
  {
    type: "ACCEPTABLE_USE_POLICY" as const,
    title: "FlowForceRM Acceptable Use Policy",
    version: "1.0",
    content:
      BANNER +
      `## FlowForceRM Acceptable Use Policy

This policy describes acceptable use of the FlowForceRM platform by gym administrators and staff.

### 1. Permitted Use
The Service may be used only for legitimate gym management purposes consistent with the Terms of Service.

### 2. Prohibited Conduct
Users must not: attempt to access data belonging to another gym/tenant without authorization; attempt to circumvent security controls; use the Service to store or transmit unlawful content; or use the Service in a manner that disrupts its operation for other users.

### 3. Account Security
Users are responsible for maintaining the confidentiality of their own login credentials and for activity occurring under their account. [Placeholder — requires legal review of liability allocation.]

### 4. Member Data
Staff and administrators must handle gym members' personal information responsibly and in accordance with the gym's own privacy obligations to its members.

### 5. Enforcement
[Placeholder — consequences for violations (warning, suspension, termination) require legal/business review.]
`,
    summaryOfChanges: "Initial placeholder version.",
  },
];

async function main() {
  for (const doc of DOCUMENTS) {
    const result = await controlPlanePrisma.legalDocument.upsert({
      where: { type_version: { type: doc.type, version: doc.version } },
      update: {},
      create: {
        type: doc.type,
        title: doc.title,
        version: doc.version,
        content: doc.content,
        summaryOfChanges: doc.summaryOfChanges,
        status: "DRAFT",
      },
    });
    console.log(`[seed-legal-documents] ${result.type} v${result.version} — ${result.status} (${result.id})`);
  }
  console.log(
    "\nAll seeded as DRAFT. Review and publish explicitly via /superadmin/legal-documents when ready — nothing gates any tenant until then."
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => controlPlanePrisma.$disconnect());
