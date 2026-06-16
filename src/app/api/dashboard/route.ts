import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const batches = await db.batch.findMany({
      include: {
        feedRecords: true,
        weightRecords: { orderBy: { date: 'desc' } },
      },
    })

    const activeBatches = batches.filter((b) => b.status === 'active')
    const harvestedBatches = batches.filter((b) => b.status === 'harvested')

    const totalChickens = activeBatches.reduce((sum, b) => sum + b.quantity, 0)
    const totalBatches = batches.length

    // Total feed across all batches
    const totalFeedKg = batches.reduce(
      (sum, b) => sum + b.feedRecords.reduce((s, f) => s + f.quantityKg, 0),
      0
    )

    // Total feed cost across all batches
    const totalFeedCost = batches.reduce(
      (sum, b) => sum + b.feedRecords.reduce((s, f) => s + f.quantityKg * f.pricePerKg, 0),
      0
    )

    // Per-batch calculations
    const batchSummaries = batches.map((batch) => {
      const totalFeed = batch.feedRecords.reduce((s, f) => s + f.quantityKg, 0)
      const totalCost = batch.feedRecords.reduce((s, f) => s + f.quantityKg * f.pricePerKg, 0)
      const latestWeight = batch.weightRecords[0]?.averageWeightGram || batch.initialWeight * 1000
      const weightGain = latestWeight - batch.initialWeight * 1000
      const fcr = weightGain > 0 && batch.quantity > 0 ? (totalFeed * 1000) / (batch.quantity * weightGain) : 0

      // Calculate age in days
      const now = new Date()
      const arrival = new Date(batch.arrivalDate)
      const ageDays = Math.floor((now.getTime() - arrival.getTime()) / (1000 * 60 * 60 * 24))

      return {
        id: batch.id,
        name: batch.name,
        terminNumber: batch.terminNumber,
        quantity: batch.quantity,
        status: batch.status,
        initialWeight: batch.initialWeight,
        latestWeightGram: latestWeight,
        ageDays,
        totalFeedKg: totalFeed,
        totalFeedCost: totalCost,
        fcr: Math.round(fcr * 100) / 100,
        feedPerEkor: batch.quantity > 0 ? Math.round((totalFeed / batch.quantity) * 100) / 100 : 0,
      }
    })

    return NextResponse.json({
      totalBatches,
      activeBatches: activeBatches.length,
      harvestedBatches: harvestedBatches.length,
      totalChickens,
      totalFeedKg: Math.round(totalFeedKg * 100) / 100,
      totalFeedCost: Math.round(totalFeedCost * 100) / 100,
      batchSummaries,
    })
  } catch (error) {
    console.error('Error fetching dashboard:', error)
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 })
  }
}
