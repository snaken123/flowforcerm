import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;
if (!apiKey) console.error("[email] RESEND_API_KEY is not set");
const resend = new Resend(apiKey);
const APP_URL = process.env.NEXTAUTH_URL ?? "https://flowforcerm.com";
const FROM = process.env.EMAIL_FROM ?? "FlowForceRM <noreply@flowforcerm.com>";

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
  const result = await resend.emails.send({
    from: FROM,
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
  const { error } = await resend.emails.send({
    from: FROM,
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
  const { error } = await resend.emails.send({
    from: FROM,
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
  const { error } = await resend.emails.send({
    from: FROM,
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
