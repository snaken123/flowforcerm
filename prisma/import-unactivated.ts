import { PrismaClient, Role, MemberStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

function parseCSV(content: string) {
  const lines = content.trim().split("\n");
  const headers = lines[0].split(",").map(h => h.trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values: string[] = [];
    let current = "";
    let inQuotes = false;
    for (const char of lines[i]) {
      if (char === '"') { inQuotes = !inQuotes; }
      else if (char === "," && !inQuotes) { values.push(current.trim()); current = ""; }
      else { current += char; }
    }
    values.push(current.trim());
    const row: any = {};
    headers.forEach((h, idx) => { row[h] = values[idx] ?? ""; });
    rows.push(row);
  }
  return rows;
}

async function main() {
  const csvPath = path.join(process.cwd(), "prisma", "Members as of 6-26-26 - Sheet1.csv");
  const content = fs.readFileSync(csvPath, "utf8");
  const rows = parseCSV(content);

  // Only rows WITHOUT an Athlete ID
  const unactivated = rows.filter(r => !r["Athlete ID"]?.trim());
  console.log(`Found ${unactivated.length} unactivated members to import`);

  const defaultPassword = await bcrypt.hash("member123", 12);
  let created = 0, skipped = 0, errors = 0;

  for (const r of unactivated) {
    const firstName = r["First name"]?.trim();
    const lastName = r["Last name"]?.trim();
    const email = r["Email"]?.trim();
    const phone = r["Phone"]?.trim() || null;
    const gender = r["Gender"]?.trim() || null;
    const dobRaw = r["Birthday"]?.trim();
    const joinRaw = r["Registered"]?.trim();

    if (!email || !firstName || !lastName) { skipped++; continue; }

    const dateOfBirth = dobRaw ? new Date(dobRaw) : null;
    const joinDate = joinRaw ? new Date(joinRaw) : new Date();

    try {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        const hasMember = await prisma.member.findUnique({ where: { userId: existing.id } });
        if (hasMember) { skipped++; continue; }
        await prisma.member.create({
          data: { userId: existing.id, firstName, lastName, phone, gender, dateOfBirth, joinDate, status: MemberStatus.INACTIVE },
        });
        created++;
        continue;
      }

      await prisma.user.create({
        data: {
          email,
          name: `${firstName} ${lastName}`,
          password: defaultPassword,
          role: Role.MEMBER,
          member: {
            create: { firstName, lastName, phone, gender, dateOfBirth, joinDate, status: MemberStatus.INACTIVE },
          },
        },
      });
      created++;
    } catch (e: any) {
      console.error(`Error [${email}]:`, e.message);
      errors++;
    }
  }

  console.log(`\nDone. Created: ${created} | Skipped: ${skipped} | Errors: ${errors}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
