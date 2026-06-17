import { db } from '@/lib/db'

type Backup = {
  exportedAt: string
  counts: Record<string, number>
  data: {
    batches: Array<{
      id: string
      name: string
      terminNumber: number
      arrivalDate: string
      initialWeight: number
      quantity: number
      status: string
      harvestDate: string | null
      harvestWeight: number | null
      harvestQuantity: number | null
      sellingPricePerKg: number | null
      notes: string | null
      createdAt: string
      updatedAt: string
    }>
    feedRecords: Array<{
      id: string
      batchId: string
      date: string
      feedType: string
      quantityKg: number
      pricePerKg: number
      notes: string | null
      createdAt: string
    }>
    weightRecords: Array<{
      id: string
      batchId: string
      date: string
      averageWeightGram: number
      ageDays: number
      sampleCount: number
      notes: string | null
      createdAt: string
    }>
    mortalityRecords: Array<{
      id: string
      batchId: string
      date: string
      quantity: number
      reason: string
      notes: string | null
      createdAt: string
    }>
    appSettings: Array<{
      key: string
      value: string
      updatedAt: string
    }>
  }
}

async function restoreFromBackup() {
  const file = Bun.file('prisma/backup.json')
  const exists = await file.exists()
  if (!exists) {
    console.log('ℹ️  No backup.json found, skipping restore.')
    return false
  }

  const backup: Backup = await file.json()
  console.log(`📦 Found backup from ${backup.exportedAt}`)
  console.log('   Counts:', backup.counts)

  // Restore batches first (parent records)
  for (const b of backup.data.batches) {
    await db.batch.upsert({
      where: { id: b.id },
      update: {
        name: b.name,
        terminNumber: b.terminNumber,
        arrivalDate: new Date(b.arrivalDate),
        initialWeight: b.initialWeight,
        quantity: b.quantity,
        status: b.status,
        harvestDate: b.harvestDate ? new Date(b.harvestDate) : null,
        harvestWeight: b.harvestWeight,
        harvestQuantity: b.harvestQuantity,
        sellingPricePerKg: b.sellingPricePerKg,
        notes: b.notes,
      },
      create: {
        id: b.id,
        name: b.name,
        terminNumber: b.terminNumber,
        arrivalDate: new Date(b.arrivalDate),
        initialWeight: b.initialWeight,
        quantity: b.quantity,
        status: b.status,
        harvestDate: b.harvestDate ? new Date(b.harvestDate) : null,
        harvestWeight: b.harvestWeight,
        harvestQuantity: b.harvestQuantity,
        sellingPricePerKg: b.sellingPricePerKg,
        notes: b.notes,
        createdAt: new Date(b.createdAt),
        updatedAt: new Date(b.updatedAt),
      },
    })
  }

  // Restore child records
  if (backup.data.feedRecords.length > 0) {
    await db.feedRecord.createMany({
      data: backup.data.feedRecords.map((r) => ({
        id: r.id,
        batchId: r.batchId,
        date: new Date(r.date),
        feedType: r.feedType,
        quantityKg: r.quantityKg,
        pricePerKg: r.pricePerKg,
        notes: r.notes,
        createdAt: new Date(r.createdAt),
      })),
      skipDuplicates: true,
    })
  }

  if (backup.data.weightRecords.length > 0) {
    await db.weightRecord.createMany({
      data: backup.data.weightRecords.map((r) => ({
        id: r.id,
        batchId: r.batchId,
        date: new Date(r.date),
        averageWeightGram: r.averageWeightGram,
        ageDays: r.ageDays,
        sampleCount: r.sampleCount,
        notes: r.notes,
        createdAt: new Date(r.createdAt),
      })),
      skipDuplicates: true,
    })
  }

  if (backup.data.mortalityRecords.length > 0) {
    await db.mortalityRecord.createMany({
      data: backup.data.mortalityRecords.map((r) => ({
        id: r.id,
        batchId: r.batchId,
        date: new Date(r.date),
        quantity: r.quantity,
        reason: r.reason,
        notes: r.notes,
        createdAt: new Date(r.createdAt),
      })),
      skipDuplicates: true,
    })
  }

  for (const s of backup.data.appSettings) {
    await db.appSetting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: { key: s.key, value: s.value, updatedAt: new Date(s.updatedAt) },
    })
  }

  console.log('✅ Data restored from backup successfully!')
  return true
}

async function seedDemo() {
  const existing = await db.batch.count()
  if (existing > 0) {
    console.log('Data already exists, skipping demo seed')
    return
  }

  // Create batch 1 - Already harvested
  const batch1 = await db.batch.create({
    data: {
      name: 'Termin DOC Januari',
      terminNumber: 1,
      arrivalDate: new Date('2025-01-15'),
      initialWeight: 0.038,
      quantity: 5000,
      status: 'harvested',
      harvestDate: new Date('2025-03-12'),
      harvestWeight: 1.85,
      harvestQuantity: 4750,
      sellingPricePerKg: 22000,
      notes: 'DOC dari PT. Charoen Pokphand',
    },
  })

  await db.feedRecord.createMany({
    data: [
      { batchId: batch1.id, date: new Date('2025-01-15'), feedType: 'Pre-Starter', quantityKg: 500, pricePerKg: 8500, notes: 'Hari 1-7' },
      { batchId: batch1.id, date: new Date('2025-01-22'), feedType: 'Starter', quantityKg: 1200, pricePerKg: 7800, notes: 'Hari 8-14' },
      { batchId: batch1.id, date: new Date('2025-01-29'), feedType: 'Starter', quantityKg: 1800, pricePerKg: 7800, notes: 'Hari 15-21' },
      { batchId: batch1.id, date: new Date('2025-02-05'), feedType: 'Grower', quantityKg: 2500, pricePerKg: 7200, notes: 'Hari 22-28' },
      { batchId: batch1.id, date: new Date('2025-02-12'), feedType: 'Grower', quantityKg: 3000, pricePerKg: 7200, notes: 'Hari 29-35' },
      { batchId: batch1.id, date: new Date('2025-02-19'), feedType: 'Grower', quantityKg: 3000, pricePerKg: 7200, notes: 'Hari 36-42' },
      { batchId: batch1.id, date: new Date('2025-02-26'), feedType: 'Finisher', quantityKg: 2500, pricePerKg: 6800, notes: 'Hari 43-49' },
      { batchId: batch1.id, date: new Date('2025-03-05'), feedType: 'Finisher', quantityKg: 2000, pricePerKg: 6800, notes: 'Hari 50-56' },
    ],
  })

  await db.weightRecord.createMany({
    data: [
      { batchId: batch1.id, date: new Date('2025-01-15'), averageWeightGram: 38, ageDays: 1, sampleCount: 50 },
      { batchId: batch1.id, date: new Date('2025-01-22'), averageWeightGram: 145, ageDays: 7, sampleCount: 50 },
      { batchId: batch1.id, date: new Date('2025-01-29'), averageWeightGram: 380, ageDays: 14, sampleCount: 50 },
      { batchId: batch1.id, date: new Date('2025-02-05'), averageWeightGram: 680, ageDays: 21, sampleCount: 50 },
      { batchId: batch1.id, date: new Date('2025-02-12'), averageWeightGram: 1020, ageDays: 28, sampleCount: 50 },
      { batchId: batch1.id, date: new Date('2025-02-19'), averageWeightGram: 1350, ageDays: 35, sampleCount: 50 },
      { batchId: batch1.id, date: new Date('2025-02-26'), averageWeightGram: 1580, ageDays: 42, sampleCount: 50 },
      { batchId: batch1.id, date: new Date('2025-03-05'), averageWeightGram: 1750, ageDays: 49, sampleCount: 50 },
      { batchId: batch1.id, date: new Date('2025-03-12'), averageWeightGram: 1850, ageDays: 56, sampleCount: 50 },
    ],
  })

  await db.mortalityRecord.createMany({
    data: [
      { batchId: batch1.id, date: new Date('2025-01-16'), quantity: 15, reason: 'stress', notes: 'Stress transportasi' },
      { batchId: batch1.id, date: new Date('2025-01-20'), quantity: 8, reason: 'sakit', notes: 'CRD awal' },
      { batchId: batch1.id, date: new Date('2025-01-28'), quantity: 12, reason: 'sakit', notes: 'Necrotic enteritis' },
      { batchId: batch1.id, date: new Date('2025-02-10'), quantity: 5, reason: 'kecelakaan', notes: 'Penumpukan' },
      { batchId: batch1.id, date: new Date('2025-02-25'), quantity: 10, reason: 'afkir', notes: 'Afkir - pertumbuhan lambat' },
    ],
  })

  const batch2 = await db.batch.create({
    data: {
      name: 'Termin DOC Februari',
      terminNumber: 2,
      arrivalDate: new Date('2025-02-20'),
      initialWeight: 0.04,
      quantity: 3000,
      status: 'active',
      notes: 'DOC dari PT. Japfa Comfeed',
    },
  })

  await db.feedRecord.createMany({
    data: [
      { batchId: batch2.id, date: new Date('2025-02-20'), feedType: 'Pre-Starter', quantityKg: 300, pricePerKg: 8500, notes: 'Hari 1-7' },
      { batchId: batch2.id, date: new Date('2025-02-27'), feedType: 'Starter', quantityKg: 750, pricePerKg: 7800, notes: 'Hari 8-14' },
      { batchId: batch2.id, date: new Date('2025-03-06'), feedType: 'Starter', quantityKg: 1050, pricePerKg: 7800, notes: 'Hari 15-21' },
      { batchId: batch2.id, date: new Date('2025-03-13'), feedType: 'Grower', quantityKg: 900, pricePerKg: 7200, notes: 'Hari 22-28' },
    ],
  })

  await db.weightRecord.createMany({
    data: [
      { batchId: batch2.id, date: new Date('2025-02-20'), averageWeightGram: 40, ageDays: 1, sampleCount: 30 },
      { batchId: batch2.id, date: new Date('2025-02-27'), averageWeightGram: 155, ageDays: 7, sampleCount: 30 },
      { batchId: batch2.id, date: new Date('2025-03-06'), averageWeightGram: 410, ageDays: 14, sampleCount: 30 },
      { batchId: batch2.id, date: new Date('2025-03-13'), averageWeightGram: 730, ageDays: 21, sampleCount: 30 },
    ],
  })

  await db.mortalityRecord.createMany({
    data: [
      { batchId: batch2.id, date: new Date('2025-02-21'), quantity: 10, reason: 'stress', notes: 'Stress DOC datang' },
      { batchId: batch2.id, date: new Date('2025-03-01'), quantity: 5, reason: 'sakit', notes: 'Diare' },
      { batchId: batch2.id, date: new Date('2025-03-10'), quantity: 3, reason: 'afkir', notes: 'Culling - cacat' },
    ],
  })

  console.log('✅ Demo seed data created successfully!')
}

async function main() {
  const existing = await db.batch.count()
  if (existing > 0) {
    console.log(`Database already has ${existing} batches, skipping seed.`)
    return
  }

  // Try to restore from backup first, otherwise seed demo data
  const restored = await restoreFromBackup()
  if (!restored) {
    await seedDemo()
  }
}

main()
  .catch((e) => {
    console.error('Seed failed:', e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
