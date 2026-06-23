import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Menghitung total panen dari array harvestRecords.
 * Fallback ke field legacy (harvestQuantity × harvestWeight × sellingPricePerKg)
 * jika tidak ada harvest records (untuk data lama yang belum dimigrasi).
 */
function calcHarvestTotals(batch: {
  harvestRecords: Array<{ quantity: number; weightPerEkor: number; sellingPricePerKg: number }>
  harvestQuantity: number | null
  harvestWeight: number | null
  sellingPricePerKg: number | null
}) {
  if (batch.harvestRecords.length > 0) {
    const totalHarvested = batch.harvestRecords.reduce((s, h) => s + h.quantity, 0)
    const totalHarvestKg = batch.harvestRecords.reduce(
      (s, h) => s + h.quantity * h.weightPerEkor,
      0
    )
    const totalHarvestValue = batch.harvestRecords.reduce(
      (s, h) => s + h.quantity * h.weightPerEkor * h.sellingPricePerKg,
      0
    )
    return { totalHarvested, totalHarvestKg, totalHarvestValue }
  }
  // Fallback ke legacy.
  const qty = batch.harvestQuantity ?? 0
  const wt = batch.harvestWeight ?? 0
  const price = batch.sellingPricePerKg ?? 0
  return {
    totalHarvested: qty,
    totalHarvestKg: qty * wt,
    totalHarvestValue: qty * wt * price,
  }
}

export async function GET() {
  try {
    const batches = await db.batch.findMany({
      include: {
        weightRecords: { orderBy: { date: 'desc' } },
        mortalityRecords: true,
        equipment: true,
        harvestRecords: true,
      },
    })

    const activeBatches = batches.filter((b) => b.status === 'active')
    const harvestedBatches = batches.filter((b) => b.status === 'harvested')

    // Total mortality across all batches
    const totalMortality = batches.reduce(
      (sum, b) => sum + b.mortalityRecords.reduce((s, m) => s + m.quantity, 0),
      0
    )

    // Total chickens still alive (active batches only)
    const totalAliveChickens = activeBatches.reduce((sum, b) => {
      const deadInBatch = b.mortalityRecords.reduce((s, m) => s + m.quantity, 0)
      return sum + b.quantity - deadInBatch
    }, 0)

    // Total harvest revenue — dihitung dari sum semua HarvestRecord (atau
    // fallback ke legacy field untuk batch lama yang belum dimigrasi).
    let totalHarvestRevenue = 0
    let totalHarvestedEkor = 0
    batches.forEach((b) => {
      const totals = calcHarvestTotals(b)
      totalHarvestRevenue += totals.totalHarvestValue
      totalHarvestedEkor += totals.totalHarvested
    })

    // ============================================================
    // Ringkasan metode pembayaran Cash vs BON (seluruh equipment
    // di semua termin). Dipakai dashboard untuk menampilkan 2 kartu
    // tambahan: Total Cash (tunai) & Total BON (utang/belum dibayar).
    // Catatan: equipment.paymentMethod default "cash" (lihat Prisma
    // schema), jadi data lama otomatis masuk ke total Cash.
    // ============================================================
    const allEquipment = batches.flatMap((b) => b.equipment)
    const totalCashSpent = allEquipment
      .filter((e) => e.paymentMethod !== 'bon')
      .reduce((s, e) => s + e.quantity * e.unitPrice, 0)
    const bonEquipments = allEquipment.filter((e) => e.paymentMethod === 'bon')
    const totalBonAmount = bonEquipments.reduce((s, e) => s + e.quantity * e.unitPrice, 0)
    const bonCount = bonEquipments.length

    // Per-batch calculations
    // Catatan: fitur Pakan sudah dihapus — totalCost sekarang murni dari
    // equipment (biaya operasional). FCR & feedPerEkor dihilangkan.
    const batchSummaries = batches.map((batch) => {
      const totalCost = batch.equipment.reduce((s, e) => s + e.quantity * e.unitPrice, 0)
      // BON amount per-batch (opsional, untuk tampilan ringkasan per termin).
      const bonAmount = batch.equipment
        .filter((e) => e.paymentMethod === 'bon')
        .reduce((s, e) => s + e.quantity * e.unitPrice, 0)
      const totalDead = batch.mortalityRecords.reduce((s, m) => s + m.quantity, 0)
      const aliveCount = batch.quantity - totalDead
      const latestWeight = batch.weightRecords[0]?.averageWeightGram || batch.initialWeight * 1000

      // Calculate age in days (for harvested batches, use latest harvest date)
      const latestHarvestDate = batch.harvestRecords.length > 0
        ? batch.harvestRecords.reduce((latest, h) => h.date > latest ? h.date : latest, batch.harvestRecords[0].date)
        : batch.harvestDate
      const referenceDate = batch.status === 'harvested' && latestHarvestDate
        ? new Date(latestHarvestDate)
        : new Date()
      const arrival = new Date(batch.arrivalDate)
      const ageDays = Math.floor((referenceDate.getTime() - arrival.getTime()) / (1000 * 60 * 60 * 24))

      // Mortality rate
      const mortalityRate = batch.quantity > 0 ? (totalDead / batch.quantity) * 100 : 0

      // Harvest calculations — dari sum harvestRecords (atau fallback legacy).
      const totals = calcHarvestTotals(batch)
      const harvestQuantity = totals.totalHarvested
      const totalHarvestKg = totals.totalHarvestKg
      const totalHarvestValue = totals.totalHarvestValue
      // Berat rata-rata per ekor (untuk info display).
      const harvestWeight = harvestQuantity > 0 ? totalHarvestKg / harvestQuantity : 0
      // Harga rata-rata tertimbang per kg (kg × price / total kg).
      const sellingPricePerKg = totalHarvestKg > 0 ? totalHarvestValue / totalHarvestKg : 0
      const profit = totalHarvestValue - totalCost

      return {
        id: batch.id,
        name: batch.name,
        terminNumber: batch.terminNumber,
        quantity: batch.quantity,
        status: batch.status,
        initialWeight: batch.initialWeight,
        latestWeightGram: latestWeight,
        ageDays,
        totalDead,
        aliveCount,
        mortalityRate: Math.round(mortalityRate * 100) / 100,
        harvestQuantity,
        harvestWeight: Math.round(harvestWeight * 100) / 100,
        sellingPricePerKg: Math.round(sellingPricePerKg * 100) / 100,
        totalHarvestKg: Math.round(totalHarvestKg * 100) / 100,
        totalHarvestValue,
        profit,
        harvestRecordsCount: batch.harvestRecords.length,
        bonAmount,
      }
    })

    return NextResponse.json({
      totalBatches: batches.length,
      activeBatches: activeBatches.length,
      harvestedBatches: harvestedBatches.length,
      totalChickens: totalAliveChickens,
      totalMortality,
      totalHarvestRevenue,
      totalHarvestedEkor,
      // Ringkasan Cash vs BON (lihat penjelasan di atas).
      totalCashSpent,
      totalBonAmount,
      bonCount,
      batchSummaries,
    })
  } catch (error) {
    console.error('Error fetching dashboard:', error)
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 })
  }
}
