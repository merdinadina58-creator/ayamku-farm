import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const batches = await db.batch.findMany({
      include: {
        weightRecords: { orderBy: { date: 'desc' } },
        mortalityRecords: true,
        equipment: true,
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

    // Total harvest revenue
    const totalHarvestRevenue = harvestedBatches.reduce((sum, b) => {
      const harvestQty = b.harvestQuantity || 0
      const harvestWt = b.harvestWeight || 0
      const price = b.sellingPricePerKg || 0
      return sum + (harvestQty * harvestWt * price)
    }, 0)

    // Per-batch calculations
    // Catatan: fitur Pakan sudah dihapus — totalCost sekarang murni dari
    // equipment (biaya operasional). FCR & feedPerEkor dihilangkan.
    const batchSummaries = batches.map((batch) => {
      const totalCost = batch.equipment.reduce((s, e) => s + e.quantity * e.unitPrice, 0)
      const totalDead = batch.mortalityRecords.reduce((s, m) => s + m.quantity, 0)
      const aliveCount = batch.quantity - totalDead
      const latestWeight = batch.weightRecords[0]?.averageWeightGram || batch.initialWeight * 1000

      // Calculate age in days (for harvested batches, use harvest date)
      const referenceDate = batch.status === 'harvested' && batch.harvestDate ? new Date(batch.harvestDate) : new Date()
      const arrival = new Date(batch.arrivalDate)
      const ageDays = Math.floor((referenceDate.getTime() - arrival.getTime()) / (1000 * 60 * 60 * 24))

      // Mortality rate
      const mortalityRate = batch.quantity > 0 ? (totalDead / batch.quantity) * 100 : 0

      // Harvest calculations
      const harvestQuantity = batch.harvestQuantity || 0
      const harvestWeight = batch.harvestWeight || 0
      const sellingPricePerKg = batch.sellingPricePerKg || 0
      const totalHarvestKg = harvestQuantity * harvestWeight
      const totalHarvestValue = totalHarvestKg * sellingPricePerKg
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
        harvestWeight,
        sellingPricePerKg,
        totalHarvestKg,
        totalHarvestValue,
        profit,
      }
    })

    return NextResponse.json({
      totalBatches: batches.length,
      activeBatches: activeBatches.length,
      harvestedBatches: harvestedBatches.length,
      totalChickens: totalAliveChickens,
      totalMortality,
      totalHarvestRevenue,
      batchSummaries,
    })
  } catch (error) {
    console.error('Error fetching dashboard:', error)
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 })
  }
}
