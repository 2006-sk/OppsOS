import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// The scraper service (Python) writes to this same SQLite file concurrently.
// busy_timeout must be set per-connection (it is not persisted like
// journal_mode=WAL is), so we set it once when the client is first used.
let pragmasApplied = false;
export async function ensureSqlitePragmas() {
  if (pragmasApplied) return;
  pragmasApplied = true;
  await prisma.$executeRawUnsafe("PRAGMA journal_mode = WAL;");
  await prisma.$executeRawUnsafe("PRAGMA busy_timeout = 5000;");
}
