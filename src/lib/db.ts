import { PrismaClient } from '@/generated/business-client/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import path from 'path';

const dbUrl = `file:${path.join(process.cwd(), 'prisma', 'dev.db')}`; // adjust the filename as needed
const adapter = new PrismaBetterSqlite3({ url: dbUrl });

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  (globalForPrisma.prisma = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  }));