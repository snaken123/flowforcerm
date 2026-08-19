// Seeds the subprocessor registry from the factual third-party-service inventory
// compiled in LEGAL_REVIEW_REQUIRED.md during the Phase 1 audit. Location and
// data-category descriptions here are factual/technical, not legal conclusions
// about international-transfer mechanisms -- see that file for what still
// requires counsel review.
//
// Usage: npx tsx --env-file=.env.local scripts/seed-subprocessors.ts

import { controlPlanePrisma } from "../control-plane/lib/db";

const SUBPROCESSORS = [
  {
    name: "Vercel",
    service: "Hosting",
    purpose: "Application hosting, edge network, and Vercel Cron for scheduled jobs.",
    dataCategories: "All data in transit through the application; request logs.",
    location: "United States",
    referenceUrl: "https://vercel.com/legal/privacy-policy",
  },
  {
    name: "Neon",
    service: "Database (Postgres)",
    purpose: "Primary database hosting. One dedicated database is provisioned per tenant via Neon's API.",
    dataCategories: "All customer and personal data stored by the platform.",
    location: "Asia-Pacific (ap-southeast-1)",
    referenceUrl: "https://neon.tech/privacy-policy",
  },
  {
    name: "Resend",
    service: "Email delivery",
    purpose: "Transactional email (account activation, password reset, notifications).",
    dataCategories: "Recipient email addresses; email content.",
    location: "United States",
    referenceUrl: "https://resend.com/legal/privacy-policy",
  },
  {
    name: "Cloudflare",
    service: "File storage (R2)",
    purpose: "Storage for uploaded documents, receipts, and rank-record photos.",
    dataCategories: "Uploaded files, which may include images and payment receipts.",
    location: "Global (Cloudflare network)",
    referenceUrl: "https://www.cloudflare.com/privacypolicy/",
  },
  {
    name: "Vercel Blob",
    service: "File storage",
    purpose: "Storage for member/employee profile photos and branding assets.",
    dataCategories: "Uploaded profile photos and logo images.",
    location: "United States",
    referenceUrl: "https://vercel.com/legal/privacy-policy",
  },
  {
    name: "Google",
    service: "OAuth sign-in and optional Gmail inbox sync",
    purpose: "Google sign-in, and an opt-in feature letting a staff member connect their own Gmail inbox for an in-app email view.",
    dataCategories: "OAuth tokens; email content, only for staff who opt in.",
    location: "Global (Google infrastructure)",
    referenceUrl: "https://policies.google.com/privacy",
  },
  {
    name: "Microsoft",
    service: "OAuth and optional Outlook inbox sync",
    purpose: "The same opt-in email-inbox-connection feature as Google, for staff using Outlook.",
    dataCategories: "OAuth tokens; email content, only for staff who opt in.",
    location: "Global (Microsoft infrastructure)",
    referenceUrl: "https://privacy.microsoft.com/privacystatement",
  },
  {
    name: "Upstash",
    service: "Rate limiting (Redis)",
    purpose: "Login and password-reset rate limiting.",
    dataCategories: "IP addresses and email addresses, held only transiently for rate-limit windows; not persisted to the application database.",
    location: "Global (Upstash network)",
    referenceUrl: "https://upstash.com/trust/privacy.pdf",
  },
  {
    name: "Semaphore",
    service: "SMS delivery",
    purpose: "SMS notifications to members, where a gym has this enabled.",
    dataCategories: "Recipient phone numbers; message content.",
    location: "Philippines",
    referenceUrl: "https://semaphore.co/privacy-policy",
  },
];

async function main() {
  for (const sp of SUBPROCESSORS) {
    const existing = await controlPlanePrisma.subprocessor.findFirst({ where: { name: sp.name, service: sp.service } });
    if (existing) {
      console.log(`[seed-subprocessors] ${sp.name} (${sp.service}) already exists — skipping`);
      continue;
    }
    const created = await controlPlanePrisma.subprocessor.create({ data: sp });
    console.log(`[seed-subprocessors] ${created.name} (${created.service}) — created`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => controlPlanePrisma.$disconnect());
