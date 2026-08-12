import { prisma } from "@/lib/db";

export type AnnouncementRecipient = { name: string; email?: string; phone?: string };

// Resolves who an announcement's audience tags actually reach. MEMBER mirrors the
// existing email/sms broadcast member-lookup; ADMIN/STAFF go through User.role since
// email always exists there (Employee.phone is joined in for SMS, optional); COACH is
// its own case -- not a Role, it's Employee.employeeTypes containing "COACH" -- so it
// starts from Employee instead. Dedupes by email/phone in case tags overlap (a
// coach-only employee matches both STAFF and COACH).
export async function resolveAnnouncementRecipients(
  audience: string[]
): Promise<{ email: AnnouncementRecipient[]; sms: AnnouncementRecipient[] }> {
  const emailByAddress = new Map<string, AnnouncementRecipient>();
  const smsByPhone = new Map<string, AnnouncementRecipient>();

  function add(name: string, email: string | null | undefined, phone: string | null | undefined) {
    if (email && !email.endsWith("@flowforcerm.local") && !emailByAddress.has(email)) {
      emailByAddress.set(email, { name, email });
    }
    if (phone && !smsByPhone.has(phone)) {
      smsByPhone.set(phone, { name, phone });
    }
  }

  if (audience.includes("MEMBER")) {
    const members = await prisma.member.findMany({
      where: { status: "ACTIVE" },
      select: { firstName: true, phone: true, user: { select: { email: true } } },
    });
    for (const m of members) add(m.firstName, m.user?.email, m.phone);
  }

  const roleTags = audience.filter((a) => a === "ADMIN" || a === "STAFF");
  if (roleTags.length > 0) {
    const users = await prisma.user.findMany({
      where: { role: { in: roleTags as ("ADMIN" | "STAFF")[] } },
      select: { name: true, email: true, employee: { select: { firstName: true, phone: true, isActive: true } } },
    });
    for (const u of users) {
      if (u.employee && !u.employee.isActive) continue;
      add(u.employee?.firstName ?? u.name ?? "there", u.email, u.employee?.phone);
    }
  }

  if (audience.includes("COACH")) {
    const coaches = await prisma.employee.findMany({
      where: { employeeTypes: { has: "COACH" }, isActive: true },
      select: { firstName: true, phone: true, user: { select: { email: true } } },
    });
    for (const c of coaches) add(c.firstName, c.user?.email, c.phone);
  }

  return { email: [...emailByAddress.values()], sms: [...smsByPhone.values()] };
}
