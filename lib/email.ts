import { Resend } from "resend";
import { prisma } from "@/lib/db";
import { getTenantIdOrNull } from "@/lib/tenant-context";

// Lazy singleton — constructed on first send, not at module load, so builds/routes
// that merely import this file don't crash when RESEND_API_KEY isn't set yet.
let resendClient: Resend | null = null;
export function getResend(): Resend {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) console.error("[email] RESEND_API_KEY is not set");
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

const APP_URL = process.env.NEXTAUTH_URL ?? "https://flowforcerm.com";
const FROM = process.env.EMAIL_FROM ?? "FlowForceRM <noreply@flowforcerm.com>";

// Platform owner's inbox — gets notified of business-relevant events that need a human
// (new sales leads, etc).
export const NOTIFY_EMAIL = "snaken123@gmail.com";

// Platform owner's action-item inbox — for things that need the owner to go do something
// manually in a third-party dashboard (e.g. approving an SMS sender name in Semaphore).
export const TODO_EMAIL = "ToDo-List@flowforcerm.com";

// Resolves the display name emails should be sent from: the tenant's own TenantBranding.emailFromName
// when this request is running in a resolved tenant context, falling back to the platform default
// otherwise (platform-level sends, or a tenant that hasn't set a custom name).
export async function resolveEmailFrom(): Promise<string> {
  const tenantId = getTenantIdOrNull();
  if (!tenantId) return FROM;
  try {
    const branding = await prisma.tenantBranding.findFirst();
    if (branding?.emailFromName) return `${branding.emailFromName} <noreply@flowforcerm.com>`;
  } catch (err) {
    console.error("[email] failed to resolve tenant branding for FROM name", err);
  }
  return FROM;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function sendActivationEmail({
  to,
  firstName,
  tempPassword,
}: {
  to: string;
  firstName: string;
  tempPassword: string;
}) {
  if (!to || to.endsWith("@flowforcerm.local")) return;
  const result = await getResend().emails.send({
    from: await resolveEmailFrom(),
    to,
    subject: "FlowForceRM — Activate Your Account",
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#111">
        <h2 style="margin-bottom:8px">Hi ${firstName},</h2>
        <p style="color:#555">Your FlowForceRM account credentials have been reset. Use the details below to log in.</p>

        <div style="background:#f4f4f5;border-radius:8px;padding:20px 24px;margin:24px 0">
          <p style="margin:0 0 8px 0;font-size:14px;color:#555">Your login credentials:</p>
          <p style="margin:4px 0;font-size:15px"><strong>Email:</strong> ${to}</p>
          <p style="margin:4px 0;font-size:15px"><strong>Temporary password:</strong> <code style="background:#e4e4e7;padding:2px 6px;border-radius:4px">${tempPassword}</code></p>
        </div>

        <a href="${APP_URL}/login" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:15px">
          Log in to the Member Portal →
        </a>

        <p style="margin-top:28px;font-size:13px;color:#888">
          For security, please change your password after your first login.<br>
          If you did not request this, please contact us at the gym.
        </p>
      </div>
    `,
  });
  console.log("[sendActivationEmail] result:", JSON.stringify(result));
  if (result.error) throw new Error(result.error.message);
}

export async function sendActivationLinkEmail({
  to,
  firstName,
  token,
}: {
  to: string;
  firstName: string;
  token: string;
}) {
  if (!to || to.endsWith("@flowforcerm.local")) return;
  const setupUrl = `${APP_URL}/reset-password?token=${token}`;
  const { error } = await getResend().emails.send({
    from: await resolveEmailFrom(),
    to,
    subject: "FlowForceRM — Set Up Your Account",
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#111">
        <h2 style="margin-bottom:8px">Hi ${firstName},</h2>
        <p style="color:#555">Your FlowForceRM account is ready. Click the button below to set your password and activate your account.</p>
        <p style="color:#555">Your existing password is unchanged — this link simply lets you create a new one if you haven't already.</p>

        <a href="${setupUrl}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:15px;margin:24px 0">
          Set Up My Account →
        </a>

        <p style="font-size:13px;color:#888">This link expires in <strong>24 hours</strong>. If you didn't expect this email, you can safely ignore it — your account and password are untouched.</p>
        <p style="font-size:12px;color:#aaa;margin-top:24px">FlowForceRM · flowforcerm.com</p>
      </div>
    `,
  });
  if (error) throw new Error(error.message);
}

export async function sendPasswordResetEmail({
  to,
  firstName,
  token,
}: {
  to: string;
  firstName: string;
  token: string;
}) {
  if (!to || to.endsWith("@flowforcerm.local")) return;
  const resetUrl = `${APP_URL}/reset-password?token=${token}`;
  const { error } = await getResend().emails.send({
    from: await resolveEmailFrom(),
    to,
    subject: "FlowForceRM — Reset Your Password",
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#111">
        <h2 style="margin-bottom:8px">Hi ${firstName},</h2>
        <p style="color:#555">We received a request to reset your password. Click the button below to set a new one.</p>
        <p style="color:#555">If you didn't request this, you can safely ignore this email — your current password will remain unchanged.</p>

        <a href="${resetUrl}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:15px;margin:24px 0">
          Reset My Password →
        </a>

        <p style="font-size:13px;color:#888">This link expires in <strong>1 hour</strong>.</p>
        <p style="font-size:12px;color:#aaa;margin-top:24px">FlowForceRM · flowforcerm.com</p>
      </div>
    `,
  });
  if (error) throw new Error(error.message);
}

// Notifies the platform owner of a new marketing-site contact-form submission. The
// inquiry itself is always persisted to ContactInquiry regardless of whether this
// succeeds -- see app/api/contact/route.ts -- so a down/unconfigured mail provider
// never loses a real business lead, just delays the owner noticing it.
export async function sendContactInquiryEmail({
  to,
  name,
  gymName,
  email,
  phone,
  message,
}: {
  to: string;
  name: string;
  gymName: string;
  email: string;
  phone?: string;
  message: string;
}) {
  const { error } = await getResend().emails.send({
    from: FROM,
    to,
    replyTo: email,
    subject: `New FlowForceRM inquiry — ${gymName}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#111">
        <h2 style="margin-bottom:16px">New inquiry from the marketing site</h2>
        <p style="margin:4px 0;font-size:15px"><strong>Name:</strong> ${escapeHtml(name)}</p>
        <p style="margin:4px 0;font-size:15px"><strong>Gym:</strong> ${escapeHtml(gymName)}</p>
        <p style="margin:4px 0;font-size:15px"><strong>Email:</strong> ${escapeHtml(email)}</p>
        ${phone ? `<p style="margin:4px 0;font-size:15px"><strong>Phone:</strong> ${escapeHtml(phone)}</p>` : ""}
        <p style="margin:16px 0 4px 0;font-size:15px"><strong>Message:</strong></p>
        <p style="color:#555;white-space:pre-wrap">${escapeHtml(message)}</p>
      </div>
    `,
  });
  if (error) throw new Error(error.message);
}

// Semaphore requires each SMS sender name to be pre-approved in its own dashboard before
// it can be used — the app has no API to do that itself, so this notifies the platform
// owner with everything needed to go register it by hand, without visiting superadmin.
export async function sendSemaphoreSetupNotification({
  gymName,
  subdomain,
  senderName,
}: {
  gymName: string;
  subdomain: string;
  senderName: string;
}) {
  const { error } = await getResend().emails.send({
    from: FROM,
    to: TODO_EMAIL,
    subject: `Action needed — approve SMS sender "${senderName}" in Semaphore`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#111">
        <h2 style="margin-bottom:16px">New SMS sender name needs Semaphore setup</h2>
        <p style="color:#555">A gym has set a custom SMS sender name in their Settings. Semaphore requires each sender name to be registered and approved in its dashboard before messages sent with it will deliver.</p>
        <div style="background:#f4f4f5;border-radius:8px;padding:20px 24px;margin:24px 0">
          <p style="margin:4px 0;font-size:15px"><strong>Gym:</strong> ${escapeHtml(gymName)}</p>
          <p style="margin:4px 0;font-size:15px"><strong>Subdomain:</strong> ${escapeHtml(subdomain)}.flowforcerm.com</p>
          <p style="margin:4px 0;font-size:15px"><strong>Sender name to register:</strong> <code style="background:#e4e4e7;padding:2px 6px;border-radius:4px">${escapeHtml(senderName)}</code></p>
        </div>
        <p style="font-size:13px;color:#888">Until this is approved in Semaphore, SMS sent for this gym using this sender name may fail to deliver.</p>
      </div>
    `,
  });
  if (error) throw new Error(error.message);
}

export async function sendWelcomeEmail({
  to,
  firstName,
  tempPassword,
}: {
  to: string;
  firstName: string;
  tempPassword: string;
}) {
  if (!to || to.endsWith("@flowforcerm.local")) return;
  const { error } = await getResend().emails.send({
    from: await resolveEmailFrom(),
    to,
    subject: "Welcome to FlowForceRM — Your Account is Ready",
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#111">
        <h2 style="margin-bottom:8px">Welcome, ${firstName}! 👊</h2>
        <p style="color:#555">Your FlowForceRM member account has been created.</p>

        <div style="background:#f4f4f5;border-radius:8px;padding:20px 24px;margin:24px 0">
          <p style="margin:0 0 8px 0;font-size:14px;color:#555">Your temporary login credentials:</p>
          <p style="margin:4px 0;font-size:15px"><strong>Email:</strong> ${to}</p>
          <p style="margin:4px 0;font-size:15px"><strong>Temporary password:</strong> <code style="background:#e4e4e7;padding:2px 6px;border-radius:4px">${tempPassword}</code></p>
        </div>

        <a href="${APP_URL}/login" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:15px">
          Log in to the Member Portal →
        </a>

        <p style="margin-top:28px;font-size:13px;color:#888">
          For security, please change your password after your first login.<br>
          If you have any questions, contact us at the gym.
        </p>
      </div>
    `,
  });
  if (error) throw new Error(error.message);
}
