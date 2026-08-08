import { prisma } from "@/lib/db";

// Splits a gym name into "words" on spaces AND on capital-letter transitions within a
// no-space token (e.g. "NorthSouth" -> "North"/"South", "FlowForceRM" -> "Flow"/"Force"/"RM").
// One word -> first 2 letters. 2+ words -> first letter of each of the first two words.
export function computeMemberNumberPrefix(gymName: string): string {
  const words = gymName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .flatMap((tok) => tok.split(/(?<=[a-z])(?=[A-Z])/));

  if (words.length === 0) return "FF";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase().padEnd(2, "X");
  return (words[0][0] + words[1][0]).toUpperCase();
}

// Computed once from the tenant's gym name, then locked forever -- never recomputed from
// a later gym-name change, so existing member IDs never end up mixed with a different
// prefix if the gym renames itself. Deterministic + idempotent, so a read-then-write race
// on first computation is harmless: concurrent callers compute and write the same value.
export async function getOrLockMemberNumberPrefix(): Promise<string> {
  const branding = await prisma.tenantBranding.findUnique({ where: { id: "singleton" } });
  if (branding?.memberNumberPrefix) return branding.memberNumberPrefix;

  const prefix = computeMemberNumberPrefix(branding?.gymName ?? "FlowForceRM");
  const updated = await prisma.tenantBranding.upsert({
    where: { id: "singleton" },
    update: { memberNumberPrefix: prefix },
    create: { id: "singleton", gymName: branding?.gymName ?? "FlowForceRM", memberNumberPrefix: prefix },
  });
  return updated.memberNumberPrefix!;
}

// Atomic sequential member number -- upserts the singleton counter and increments it
// atomically, then prefixes with the tenant's locked prefix. Single source of truth,
// replacing 3 previously-duplicated (2 of them non-atomic, race-prone) implementations.
export async function nextMemberNumber(): Promise<string> {
  const [prefix, seq] = await Promise.all([
    getOrLockMemberNumberPrefix(),
    prisma.memberNumberSequence.upsert({
      where: { id: "singleton" },
      update: { lastVal: { increment: 1 } },
      create: { id: "singleton", lastVal: 1 },
    }),
  ]);
  return `${prefix}-${String(seq.lastVal).padStart(5, "0")}`;
}
