import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// A single shared stub plays both roles: the top-level `prisma` export AND the
// `tx` object the route's $transaction callback receives -- since $transaction
// here just calls back with this same stub, `prisma.member.delete` and
// `tx.member.delete` are literally the same mock function, so assertions work
// regardless of which one the real code happens to call through.
vi.mock("@/lib/db", () => {
  const txStub = {
    freeTrialFollowUp: { deleteMany: vi.fn() },
    membershipFreezeRequest: { deleteMany: vi.fn() },
    shopSale: { updateMany: vi.fn() },
    payment: { deleteMany: vi.fn() },
    checkIn: { deleteMany: vi.fn() },
    rankRecord: { deleteMany: vi.fn() },
    booking: { deleteMany: vi.fn() },
    subscription: { deleteMany: vi.fn() },
    member: { delete: vi.fn(), findUnique: vi.fn() },
    auditLog: { deleteMany: vi.fn() },
    user: { delete: vi.fn(), findUnique: vi.fn() },
  };
  return {
    prisma: {
      ...txStub,
      $transaction: vi.fn((cb: any) => cb(txStub)),
    },
  };
});

vi.mock("@/lib/auth", () => ({
  getAuthSession: vi.fn(),
}));

vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn().mockResolvedValue(undefined),
}));

// The DELETE handler does `const bcrypt = await import("bcryptjs")` then
// `bcrypt.compare(...)` directly on the module namespace (unlike other routes
// that use a static default import) -- so `compare` needs to be a top-level
// export here, not just nested under `default`.
vi.mock("bcryptjs", () => ({
  compare: vi.fn(),
  default: { compare: vi.fn(), hash: vi.fn() },
}));

import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { compare as bcryptCompare } from "bcryptjs";
import { DELETE } from "@/app/api/members/[id]/route";

function makeRequest(body: unknown) {
  return new NextRequest(new URL("http://localhost/api/members/m1"), {
    method: "DELETE",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => vi.clearAllMocks());

describe("DELETE /api/members/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(getAuthSession).mockResolvedValue(null);
    const res = await DELETE(makeRequest({ adminPassword: "pw" }), { params: { id: "m1" } });
    expect(res.status).toBe(401);
  });

  it("returns 403 when the caller is not ADMIN", async () => {
    vi.mocked(getAuthSession).mockResolvedValue({ user: { id: "u1", role: "STAFF" } } as any);
    const res = await DELETE(makeRequest({ adminPassword: "pw" }), { params: { id: "m1" } });
    expect(res.status).toBe(403);
  });

  it("returns 400 when no admin password is provided", async () => {
    vi.mocked(getAuthSession).mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } } as any);
    const res = await DELETE(makeRequest({}), { params: { id: "m1" } });
    expect(res.status).toBe(400);
  });

  it("returns 403 when the admin password is wrong", async () => {
    vi.mocked(getAuthSession).mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } } as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "admin-1", password: "hashed" } as any);
    vi.mocked(bcryptCompare).mockResolvedValue(false as never);
    const res = await DELETE(makeRequest({ adminPassword: "wrong" }), { params: { id: "m1" } });
    expect(res.status).toBe(403);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("cleans up every dependent record for a member with a linked login account", async () => {
    vi.mocked(getAuthSession).mockResolvedValue({ user: { id: "admin-1", role: "ADMIN", name: "Admin" } } as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "admin-1", password: "hashed" } as any);
    vi.mocked(bcryptCompare).mockResolvedValue(true as never);
    vi.mocked(prisma.member.findUnique).mockResolvedValue({ firstName: "Jane", lastName: "Doe", userId: "member-user-1" } as any);

    const res = await DELETE(makeRequest({ adminPassword: "correct" }), { params: { id: "m1" } });

    expect(res.status).toBe(200);
    expect(prisma.freeTrialFollowUp.deleteMany).toHaveBeenCalledWith({ where: { memberId: "m1" } });
    expect(prisma.membershipFreezeRequest.deleteMany).toHaveBeenCalledWith({ where: { memberId: "m1" } });
    expect(prisma.shopSale.updateMany).toHaveBeenCalledWith({ where: { buyerMemberId: "m1" }, data: { buyerMemberId: null } });
    expect(prisma.payment.deleteMany).toHaveBeenCalledWith({ where: { memberId: "m1" } });
    expect(prisma.checkIn.deleteMany).toHaveBeenCalledWith({ where: { memberId: "m1" } });
    expect(prisma.rankRecord.deleteMany).toHaveBeenCalledWith({ where: { memberId: "m1" } });
    expect(prisma.booking.deleteMany).toHaveBeenCalledWith({ where: { memberId: "m1" } });
    expect(prisma.subscription.deleteMany).toHaveBeenCalledWith({ where: { memberId: "m1" } });
    expect(prisma.member.delete).toHaveBeenCalledWith({ where: { id: "m1" } });
    // The AuditLog.userId RESTRICT fix: rows where the member acted as
    // themselves must be cleared before the User row can be deleted.
    expect(prisma.auditLog.deleteMany).toHaveBeenCalledWith({ where: { userId: "member-user-1" } });
    expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: "member-user-1" } });
  });

  it("skips AuditLog cleanup and User deletion for a guest member with no login account", async () => {
    vi.mocked(getAuthSession).mockResolvedValue({ user: { id: "admin-1", role: "ADMIN", name: "Admin" } } as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "admin-1", password: "hashed" } as any);
    vi.mocked(bcryptCompare).mockResolvedValue(true as never);
    vi.mocked(prisma.member.findUnique).mockResolvedValue({ firstName: "Guest", lastName: "Walkin", userId: null } as any);

    const res = await DELETE(makeRequest({ adminPassword: "correct" }), { params: { id: "m2" } });

    expect(res.status).toBe(200);
    expect(prisma.member.delete).toHaveBeenCalledWith({ where: { id: "m2" } });
    expect(prisma.auditLog.deleteMany).not.toHaveBeenCalled();
    // user.delete must not be called for the guest member; the admin-password
    // lookup above (user.findUnique) is a different method on the same mock.
    expect(prisma.user.delete).not.toHaveBeenCalled();
  });
});
