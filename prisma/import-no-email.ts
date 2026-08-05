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

function slugify(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 20);
}

async function main() {
  const csvPath = path.join(process.cwd(), "prisma", "Members as of 6-26-26 - Sheet1.csv");
  const content = fs.readFileSync(csvPath, "utf8");
  const rows = parseCSV(content);

  // Only rows with NO email AND no athlete ID
  const noEmail = rows.filter(r => !r["Email"]?.trim() && !r["Athlete ID"]?.trim());
  console.log(`Found ${noEmail.length} members with no email to import`);

  const defaultPassword = await bcrypt.hash("member123", 12);
  let created = 0, skipped = 0, errors = 0;

  // Track name collisions for unique placeholders
  const usedEmails = new Set<string>();

  for (const r of noEmail) {
    const firstName = r["First name"]?.trim();
    const lastName = r["Last name"]?.trim();
    const phone = r["Phone"]?.trim() || null;
    const gender = r["Gender"]?.trim() || null;
    const dobRaw = r["Birthday"]?.trim();
    const joinRaw = r["Registered"]?.trim();

    if (!firstName || !lastName) { skipped++; continue; }

    const dateOfBirth = dobRaw ? new Date(dobRaw) : null;
    const joinDate = joinRaw ? new Date(joinRaw) : new Date();

    // Generate unique placeholder email
    const base = `noemail.${slugify(firstName)}.${slugify(lastName)}`;
    let email = `${base}@flowforcerm.local`;
    let suffix = 1;
    while (usedEmails.has(email)) {
      email = `${base}.${suffix}@flowforcerm.local`;
      suffix++;
    }

    // Also check DB for collision
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) { usedEmails.add(email); skipped++; continue; }

    usedEmails.add(email);

    try {
      await prisma.user.create({
        data: {
          email,
          name: `${firstName} ${lastName}`,
          password: defaultPassword,
          role: Role.MEMBER,
          member: {
            create: { firstName, lastName, phone, gender, dateOfBirth, joinDate, status: MemberStatus.ACTIVE },
          },
        },
      });
      created++;
    } catch (e: any) {
      console.error(`Error [${firstName} ${lastName}]:`, e.message);
      errors++;
    }
  }

  console.log(`\nDone. Created: ${created} | Skipped: ${skipped} | Errors: ${errors}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
