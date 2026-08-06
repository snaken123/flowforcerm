import { PrismaClient } from "../generated/client";

const globalForPrisma = globalThis as unknown as { controlPlanePrisma: PrismaClient };

export const controlPlanePrisma =
  globalForPrisma.controlPlanePrisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.controlPlanePrisma = controlPlanePrisma;
