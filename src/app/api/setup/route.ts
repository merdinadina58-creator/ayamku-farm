import { NextResponse } from 'next/server'
import { Pool } from 'pg'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

// SQL to create all tables (idempotent — safe to run multiple times).
// Mirrors prisma/schema.prisma models.
const CREATE_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS "Batch" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "terminNumber" INTEGER NOT NULL,
  "arrivalDate" TIMESTAMP(3) NOT NULL,
  "initialWeight" DOUBLE PRECISION NOT NULL,
  "quantity" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "harvestDate" TIMESTAMP(3),
  "harvestWeight" DOUBLE PRECISION,
  "harvestQuantity" INTEGER,
  "sellingPricePerKg" DOUBLE PRECISION,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS "FeedRecord" (
  "id" TEXT PRIMARY KEY,
  "batchId" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "feedType" TEXT NOT NULL,
  "quantityKg" DOUBLE PRECISION NOT NULL,
  "pricePerKg" DOUBLE PRECISION NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FeedRecord_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "WeightRecord" (
  "id" TEXT PRIMARY KEY,
  "batchId" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "averageWeightGram" DOUBLE PRECISION NOT NULL,
  "ageDays" INTEGER NOT NULL,
  "sampleCount" INTEGER NOT NULL DEFAULT 1,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WeightRecord_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "MortalityRecord" (
  "id" TEXT PRIMARY KEY,
  "batchId" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "quantity" INTEGER NOT NULL,
  "reason" TEXT NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MortalityRecord_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "AppSetting" (
  "key" TEXT PRIMARY KEY,
  "value" TEXT NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
`

type Step = { step: string; status: 'ok' | 'skip' | 'error'; detail: string }

// GET /api/setup — one-click database setup for Vercel deployment.
// Creates tables (if missing) and seeds data from prisma/backup.json.
// Visit https://your-app.vercel.app/api/setup after deploying.
export async function GET() {
  const steps: Step[] = []

  // Step 1: Check DATABASE_URL
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    steps.push({
      step: 'Environment check',
      status: 'error',
      detail: 'DATABASE_URL is not set. Go to Vercel Dashboard → your project → Settings → Environment Variables → add DATABASE_URL from your Vercel Postgres database, then redeploy.',
    })
    return NextResponse.json({ steps, error: 'DATABASE_URL not configured' }, { status: 500 })
  }
  steps.push({ step: 'Environment check', status: 'ok', detail: 'DATABASE_URL is set.' })

  // Step 2: Create tables via raw SQL (using pg Pool directly)
  try {
    // Vercel Postgres / Neon requires SSL. The connection string usually
    // includes ?sslmode=require, but we also set ssl on the Pool as a fallback.
    const pool = new Pool({
      connectionString,
      ssl: connectionString.includes('sslmode=require')
        ? { rejectUnauthorized: false }
        : undefined,
    })
    await pool.query(CREATE_TABLES_SQL)
    await pool.end()
    steps.push({ step: 'Create tables', status: 'ok', detail: 'All 5 tables created (or already existed).' })
  } catch (e) {
    const msg = (e as Error).message
    // Provide diagnostic hints about the DATABASE_URL format
    const urlLen = connectionString.length
    const hasPrefix = connectionString.startsWith('postgres://') || connectionString.startsWith('postgresql://')
    const hint = !hasPrefix
      ? ` Hint: DATABASE_URL must start with 'postgres://' or 'postgresql://'. Currently it starts with '${connectionString.substring(0, 20)}...' (length ${urlLen}). Check Vercel Dashboard → Settings → Environment Variables → DATABASE_URL.`
      : msg.includes('Invalid URL')
        ? ` Hint: The URL format looks wrong. Make sure it's a complete connection string like: postgres://user:password@host:port/dbname?sslmode=require`
        : ''
    steps.push({
      step: 'Create tables',
      status: 'error',
      detail: `Failed to create tables: ${msg}${hint}`,
    })
    return NextResponse.json({ steps, error: 'Table creation failed' }, { status: 500 })
  }

  // Step 3: Check if data already exists
  try {
    const existingBatches = await db.batch.count()
    if (existingBatches > 0) {
      steps.push({
        step: 'Existing data check',
        status: 'skip',
        detail: `Database already has ${existingBatches} batches. Seeding is skipped to avoid duplicates.`,
      })
      return NextResponse.json({
        steps,
        message: 'Database is ready and already contains data. No action needed — visit the home page!',
      })
    }
    steps.push({ step: 'Existing data check', status: 'ok', detail: 'Database is empty, proceeding with seed.' })
  } catch (e) {
    steps.push({
      step: 'Existing data check',
      status: 'error',
      detail: `Failed to check existing data: ${(e as Error).message}`,
    })
    return NextResponse.json({ steps, error: 'Data check failed' }, { status: 500 })
  }

  // Step 4: Read backup file
  type BackupData = {
    exportedAt: string
    counts: Record<string, number>
    data: {
      batches: Array<Record<string, unknown>>
      feedRecords: Array<Record<string, unknown>>
      weightRecords: Array<Record<string, unknown>>
      mortalityRecords: Array<Record<string, unknown>>
      appSettings: Array<Record<string, unknown>>
    }
  }

  let backup: BackupData
  try {
    const fs = await import('fs/promises')
    const path = await import('path')
    const backupPath = path.join(process.cwd(), 'prisma', 'backup.json')
    const backupContent = await fs.readFile(backupPath, 'utf-8')
    backup = JSON.parse(backupContent) as BackupData
    steps.push({
      step: 'Read backup file',
      status: 'ok',
      detail: `Loaded backup from ${backup.exportedAt} (${backup.counts.batches} batches, ${backup.counts.feedRecords} feed records, ${backup.counts.weightRecords} weight records, ${backup.counts.mortalityRecords} mortality records).`,
    })
  } catch (e) {
    steps.push({
      step: 'Read backup file',
      status: 'error',
      detail: `Could not read prisma/backup.json: ${(e as Error).message}`,
    })
    return NextResponse.json({ steps, error: 'Backup file not found' }, { status: 500 })
  }

  // Step 5: Restore batches (parent records first)
  try {
    for (const b of backup.data.batches) {
      await db.batch.upsert({
        where: { id: b.id as string },
        update: {
          name: b.name as string,
          terminNumber: b.terminNumber as number,
          arrivalDate: new Date(b.arrivalDate as string),
          initialWeight: b.initialWeight as number,
          quantity: b.quantity as number,
          status: b.status as string,
          harvestDate: b.harvestDate ? new Date(b.harvestDate as string) : null,
          harvestWeight: (b.harvestWeight as number | null) ?? null,
          harvestQuantity: (b.harvestQuantity as number | null) ?? null,
          sellingPricePerKg: (b.sellingPricePerKg as number | null) ?? null,
          notes: (b.notes as string | null) ?? null,
        },
        create: {
          id: b.id as string,
          name: b.name as string,
          terminNumber: b.terminNumber as number,
          arrivalDate: new Date(b.arrivalDate as string),
          initialWeight: b.initialWeight as number,
          quantity: b.quantity as number,
          status: b.status as string,
          harvestDate: b.harvestDate ? new Date(b.harvestDate as string) : null,
          harvestWeight: (b.harvestWeight as number | null) ?? null,
          harvestQuantity: (b.harvestQuantity as number | null) ?? null,
          sellingPricePerKg: (b.sellingPricePerKg as number | null) ?? null,
          notes: (b.notes as string | null) ?? null,
          createdAt: new Date(b.createdAt as string),
          updatedAt: new Date(b.updatedAt as string),
        },
      })
    }
    steps.push({ step: 'Restore batches', status: 'ok', detail: `${backup.data.batches.length} batches created` })
  } catch (e) {
    steps.push({ step: 'Restore batches', status: 'error', detail: (e as Error).message })
    return NextResponse.json({ steps, error: 'Batch restore failed' }, { status: 500 })
  }

  // Step 6: Restore child records
  try {
    if (backup.data.feedRecords.length > 0) {
      await db.feedRecord.createMany({
        data: backup.data.feedRecords.map((r) => ({
          id: r.id as string,
          batchId: r.batchId as string,
          date: new Date(r.date as string),
          feedType: r.feedType as string,
          quantityKg: r.quantityKg as number,
          pricePerKg: r.pricePerKg as number,
          notes: (r.notes as string | null) ?? null,
          createdAt: new Date(r.createdAt as string),
        })),
        skipDuplicates: true,
      })
      steps.push({ step: 'Restore feed records', status: 'ok', detail: `${backup.data.feedRecords.length} records` })
    }

    if (backup.data.weightRecords.length > 0) {
      await db.weightRecord.createMany({
        data: backup.data.weightRecords.map((r) => ({
          id: r.id as string,
          batchId: r.batchId as string,
          date: new Date(r.date as string),
          averageWeightGram: r.averageWeightGram as number,
          ageDays: r.ageDays as number,
          sampleCount: r.sampleCount as number,
          notes: (r.notes as string | null) ?? null,
          createdAt: new Date(r.createdAt as string),
        })),
        skipDuplicates: true,
      })
      steps.push({ step: 'Restore weight records', status: 'ok', detail: `${backup.data.weightRecords.length} records` })
    }

    if (backup.data.mortalityRecords.length > 0) {
      await db.mortalityRecord.createMany({
        data: backup.data.mortalityRecords.map((r) => ({
          id: r.id as string,
          batchId: r.batchId as string,
          date: new Date(r.date as string),
          quantity: r.quantity as number,
          reason: r.reason as string,
          notes: (r.notes as string | null) ?? null,
          createdAt: new Date(r.createdAt as string),
        })),
        skipDuplicates: true,
      })
      steps.push({ step: 'Restore mortality records', status: 'ok', detail: `${backup.data.mortalityRecords.length} records` })
    }

    // Restore app settings
    for (const s of backup.data.appSettings) {
      await db.appSetting.upsert({
        where: { key: s.key as string },
        update: { value: s.value as string },
        create: { key: s.key as string, value: s.value as string, updatedAt: new Date(s.updatedAt as string) },
      })
    }
    steps.push({ step: 'Restore app settings', status: 'ok', detail: `${backup.data.appSettings.length} settings` })
  } catch (e) {
    steps.push({ step: 'Restore child records', status: 'error', detail: (e as Error).message })
    return NextResponse.json({ steps, error: 'Child record restore failed' }, { status: 500 })
  }

  return NextResponse.json({
    steps,
    message: '✅ Database setup complete! All tables created and data restored. Visit the home page to see your farm dashboard.',
    counts: backup.counts,
  })
}
