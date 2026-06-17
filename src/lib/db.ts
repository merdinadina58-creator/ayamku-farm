import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

// Reuse the client across hot-reloads in dev and across serverless invocations.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Sanitize the connection string — Vercel Postgres values copied from the
// dashboard sometimes include surrounding quotes or whitespace which cause
// "Invalid URL" errors in the pg driver.
function sanitizeConnectionString(raw: string): string {
  return raw.trim().replace(/^["'`]+|["'`]+$/g, '')
}

function createPrismaClient(): PrismaClient {
  const raw = process.env.DATABASE_URL
  if (!raw) {
    throw new Error(
      'DATABASE_URL is not set. Please provide a PostgreSQL connection string (e.g. from Vercel Postgres).'
    )
  }
  const connectionString = sanitizeConnectionString(raw)
  if (!connectionString.startsWith('postgres://') && !connectionString.startsWith('postgresql://')) {
    throw new Error(
      `DATABASE_URL must start with 'postgres://' or 'postgresql://'. Got: ${connectionString.substring(0, 30)}...`
    )
  }
  // PrismaPg adapter works for both pooled (pgBouncer) and direct connections.
  const adapter = new PrismaPg({ connectionString })
  return new PrismaClient({ adapter })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

