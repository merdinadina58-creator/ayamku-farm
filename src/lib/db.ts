import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

// Reuse the client across hot-reloads in dev and across serverless invocations.
// `SCHEMA_VERSION` dipakai untuk memaksa PrismaClient dibuat ulang saat schema
// berubah (mis. setelah `prisma db push` menambah kolom baru). Tanpa ini, dev
// server Next.js akan terus memakai client lama yang di-cache di globalThis,
// sehingga field baru (mis. Equipment.paymentMethod) tidak ikut ter-return.
const SCHEMA_VERSION = 'v2-payment-method'
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  __prismaSchemaVersion?: string
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

// Jika schema version berubah (mis. setelah `prisma db push` baru), dispose
// client lama & buat ulang. Di production globalForPrisma.prisma tidak pernah
// di-set via SCHEMA_VERSION (NODE_ENV === 'production'), jadi tidak ada impact.
if (globalForPrisma.__prismaSchemaVersion !== SCHEMA_VERSION) {
  if (globalForPrisma.prisma) {
    try { void globalForPrisma.prisma.$disconnect() } catch {}
  }
  globalForPrisma.prisma = undefined
  globalForPrisma.__prismaSchemaVersion = SCHEMA_VERSION
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
