import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/setup — one-click database setup for Vercel deployment.
// Creates tables (via Prisma) is handled by the build script's `prisma db push`.
// This endpoint seeds the database from prisma/backup.json if it's empty.
// Visit https://your-app.vercel.app/api/setup after the first deploy to restore data.
export async function GET() {
  const steps: { step: string; status: 'ok' | 'skip' | 'error'; detail: string }[] = []

  try {
    // Step 1: Check database connection
    try {
      await db.$queryRaw`SELECT 1`
      steps.push({ step: 'Database connection', status: 'ok', detail: 'Connected successfully' })
    } catch (e) {
      steps.push({
        step: 'Database connection',
        status: 'error',
        detail: `Cannot connect to database. Make sure DATABASE_URL is set to a valid PostgreSQL connection string. Error: ${(e as Error).message}`,
      })
      return NextResponse.json({ steps, error: 'Database connection failed' }, { status: 500 })
    }

    // Step 2: Check if data already exists
    const existingBatches = await db.batch.count()
    if (existingBatches > 0) {
      steps.push({
        step: 'Existing data check',
        status: 'skip',
        detail: `Database already has ${existingBatches} batches. Seeding is skipped to avoid duplicates.`,
      })
      return NextResponse.json({
        steps,
        message: 'Database already contains data. No action needed.',
      })
    }
    steps.push({ step: 'Existing data check', status: 'ok', detail: 'Database is empty, proceeding with seed.' })

    // Step 3: Read backup file from the repository
    let backup: {
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

    try {
      const fs = await import('fs/promises')
      const path = await import('path')
      const backupPath = path.join(process.cwd(), 'prisma', 'backup.json')
      const backupContent = await fs.readFile(backupPath, 'utf-8')
      backup = JSON.parse(backupContent)
      steps.push({
        step: 'Read backup file',
        status: 'ok',
        detail: `Loaded backup from ${backup.exportedAt} (${backup.counts.batches} batches, ${backup.counts.feedRecords} feed records, ${backup.counts.weightRecords} weight records, ${backup.counts.mortalityRecords} mortality records)`,
      })
    } catch (e) {
      steps.push({
        step: 'Read backup file',
        status: 'error',
        detail: `Could not read prisma/backup.json: ${(e as Error).message}`,
      })
      return NextResponse.json({ steps, error: 'Backup file not found' }, { status: 500 })
    }

    // Step 4: Restore batches (parent records first)
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

    // Step 5: Restore child records
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
      steps.push({ step: 'Restore feed records', status: 'ok', detail: `${backup.data.feedRecords.length} records created` })
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
      steps.push({ step: 'Restore weight records', status: 'ok', detail: `${backup.data.weightRecords.length} records created` })
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
      steps.push({ step: 'Restore mortality records', status: 'ok', detail: `${backup.data.mortalityRecords.length} records created` })
    }

    // Step 6: Restore app settings
    for (const s of backup.data.appSettings) {
      await db.appSetting.upsert({
        where: { key: s.key as string },
        update: { value: s.value as string },
        create: { key: s.key as string, value: s.value as string, updatedAt: new Date(s.updatedAt as string) },
      })
    }
    steps.push({ step: 'Restore app settings', status: 'ok', detail: `${backup.data.appSettings.length} settings restored` })

    return NextResponse.json({
      steps,
      message: 'Database setup complete! Your data has been restored. You can now visit the home page.',
      counts: backup.counts,
    })
  } catch (e) {
    console.error('Setup error:', e)
    steps.push({ step: 'Unexpected error', status: 'error', detail: (e as Error).message })
    return NextResponse.json({ steps, error: 'Setup failed' }, { status: 500 })
  }
}
