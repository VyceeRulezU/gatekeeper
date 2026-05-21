// src/lib/prisma.ts
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const url = process.env.DATABASE_URL || "file:./dev.db";

let prisma: PrismaClient;

if (process.env.NODE_ENV === "production") {
  const adapter = new PrismaBetterSqlite3({ url }, { timestampFormat: "unixepoch-ms" });
  prisma = new PrismaClient({ adapter });
} else {
  // Prevent multiple instances in development hot-reload
  if (!(global as any).prisma) {
    const adapter = new PrismaBetterSqlite3({ url }, { timestampFormat: "unixepoch-ms" });
    (global as any).prisma = new PrismaClient({ adapter });
  }
  prisma = (global as any).prisma;
}

export default prisma;

