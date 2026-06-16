import { db } from '@/lib/db'

async function seed() {
  const existing = await db.batch.count()
  if (existing > 0) {
    console.log('Data already exists, skipping seed')
    return
  }

  // Create batch 1 - Already harvested (FCR target ~1.75)
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
      notes: 'DOC dari PT. Charoen Pokphand',
    },
  })

  // Feed records for batch 1 - realistic amounts for 5000 broilers over 56 days
  // Total ~16,500 kg for FCR ~1.82
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

  // Weight records for batch 1
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

  // Create batch 2 - Currently active (FCR target ~1.45 at day 21)
  const batch2 = await db.batch.create({
    data: {
      name: 'Termin DOC Februari',
      terminNumber: 2,
      arrivalDate: new Date('2025-02-20'),
      initialWeight: 0.040,
      quantity: 3000,
      status: 'active',
      notes: 'DOC dari PT. Japfa Comfeed',
    },
  })

  // Feed records for batch 2 - realistic for 3000 broilers at 21 days
  // Total ~3,000 kg for FCR ~1.45
  await db.feedRecord.createMany({
    data: [
      { batchId: batch2.id, date: new Date('2025-02-20'), feedType: 'Pre-Starter', quantityKg: 300, pricePerKg: 8500, notes: 'Hari 1-7' },
      { batchId: batch2.id, date: new Date('2025-02-27'), feedType: 'Starter', quantityKg: 750, pricePerKg: 7800, notes: 'Hari 8-14' },
      { batchId: batch2.id, date: new Date('2025-03-06'), feedType: 'Starter', quantityKg: 1050, pricePerKg: 7800, notes: 'Hari 15-21' },
      { batchId: batch2.id, date: new Date('2025-03-13'), feedType: 'Grower', quantityKg: 900, pricePerKg: 7200, notes: 'Hari 22-28' },
    ],
  })

  // Weight records for batch 2
  await db.weightRecord.createMany({
    data: [
      { batchId: batch2.id, date: new Date('2025-02-20'), averageWeightGram: 40, ageDays: 1, sampleCount: 30 },
      { batchId: batch2.id, date: new Date('2025-02-27'), averageWeightGram: 155, ageDays: 7, sampleCount: 30 },
      { batchId: batch2.id, date: new Date('2025-03-06'), averageWeightGram: 410, ageDays: 14, sampleCount: 30 },
      { batchId: batch2.id, date: new Date('2025-03-13'), averageWeightGram: 730, ageDays: 21, sampleCount: 30 },
    ],
  })

  console.log('✅ Seed data created successfully!')
}

seed()
  .catch(console.error)
  .finally(() => db.$disconnect())
