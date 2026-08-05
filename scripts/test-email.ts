import { PrismaClient } from "@prisma/client";
import { Resend } from "resend";

const prisma = new PrismaClient();
const resend = new Resend(process.env.RESEND_API_KEY!);
const FROM = "NorthSouth Fight Sports <noreply@northsouth.com.ph>";

async function main() {
  const members = await prisma.member.findMany({
    select: { firstName: true, user: { select: { email: true } } },
  });

  const recipients = members.filter((m) => !!m.user?.email);
  console.log(`Sending to ${recipients.length} members...`);

  for (let i = 0; i < recipients.length; i += 50) {
    const batch = recipients.slice(i, i + 50);
    await resend.batch.send(batch.map((m) => ({
      from: FROM,
      to: m.user?.email!,
      subject: "Welcome to NorthSouth Fight Sports",
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;color:#111">
          <h2 style="margin-bottom:8px">Hi ${m.firstName}! 👊</h2>
          <p style="color:#555;line-height:1.6">
            Welcome to <strong>NorthSouth Fight Sports</strong> — we're glad to have you as part of our community.
          </p>
          <p style="color:#555;line-height:1.6">
            Whether you're training BJJ, Boxing, Judo, or any of our other programs, we're committed to helping you grow as an athlete.
          </p>
          <p style="color:#555;line-height:1.6">
            Stay tuned for updates on schedules, events, and announcements through this email and our member portal.
          </p>
          <p style="color:#555;line-height:1.6;margin-top:24px">
            Train hard. Stay humble.<br/>
            <strong>NorthSouth Fight Sports</strong>
          </p>
          <hr style="margin:32px 0;border:none;border-top:1px solid #e5e7eb"/>
          <p style="font-size:12px;color:#9ca3af">You received this email because you are a member of NorthSouth Fight Sports.</p>
        </div>
      `,
    })));
    console.log(`  Sent batch ${i / 50 + 1}`);
  }

  console.log("Done.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
