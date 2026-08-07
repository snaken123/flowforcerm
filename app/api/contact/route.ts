import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { controlPlanePrisma } from "@/control-plane/lib/db";
import { sendContactInquiryEmail } from "@/lib/email";
import { isRateLimited, getClientIp } from "@/lib/rate-limit";

const NOTIFY_EMAIL = "snaken123@gmail.com";

const contactSchema = z.object({
  name: z.string().min(1).max(100),
  gymName: z.string().min(1).max(100),
  email: z.string().email(),
  phone: z.string().max(30).optional(),
  message: z.string().min(1).max(2000),
  // Honeypot: real visitors never fill this hidden field, bots usually do.
  website: z.string().max(0).optional(),
});

export async function POST(req: NextRequest) {
  if (isRateLimited(`contact:${getClientIp(req)}`, 5, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

  const parsed = contactSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }
  if (parsed.data.website) {
    // Honeypot tripped — pretend success so the bot doesn't learn anything, but do nothing.
    return NextResponse.json({ success: true });
  }

  const { name, gymName, email, phone, message } = parsed.data;

  // Always persisted first -- a real business lead should never be lost just because
  // the notification email fails or RESEND_API_KEY isn't configured yet.
  await controlPlanePrisma.contactInquiry.create({
    data: { name, gymName, email, phone, message },
  });

  try {
    await sendContactInquiryEmail({ to: NOTIFY_EMAIL, name, gymName, email, phone, message });
  } catch (err) {
    console.error("[contact] failed to send notification email", err);
  }

  return NextResponse.json({ success: true });
}
