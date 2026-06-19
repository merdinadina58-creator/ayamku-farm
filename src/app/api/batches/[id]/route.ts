import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const batch = await db.batch.findUnique({
      where: { id },
      include: {
        feedRecords: { orderBy: { date: 'desc' } },
        weightRecords: { orderBy: { date: 'desc' } },
        mortalityRecords: { orderBy: { date: 'desc' } },
      },
    })

    if (!batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 })
    }

    return NextResponse.json(batch)
  } catch (error) {
    console.error('Error fetching batch:', error)
    return NextResponse.json({ error: 'Failed to fetch batch' }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const {
      name, terminNumber, arrivalDate, initialWeight, quantity,
      status, harvestDate, harvestWeight, harvestQuantity, sellingPricePerKg, notes
    } = body

    // ============================================================
    // Validation: Tanggal panen tidak boleh sebelum tanggal ayam masuk.
    // Hanya berlaku ketika status sedang di-set menjadi 'harvested' dan
    // sebuah harvestDate diberikan. Kita ambil arrivalDate yang ada di DB
    // (atau yang dikirim di body) sebagai acuan.
    // ============================================================
    if (status === 'harvested' && harvestDate) {
      const existing = await db.batch.findUnique({
        where: { id },
        select: { arrivalDate: true },
      })
      if (existing) {
        const refArrival = arrivalDate !== undefined ? new Date(arrivalDate) : existing.arrivalDate
        const hd = new Date(harvestDate)
        if (!isNaN(hd.getTime()) && !isNaN(refArrival.getTime())) {
          const hdDay = new Date(hd.getFullYear(), hd.getMonth(), hd.getDate())
          const adDay = new Date(refArrival.getFullYear(), refArrival.getMonth(), refArrival.getDate())
          if (hdDay.getTime() < adDay.getTime()) {
            return NextResponse.json(
              { error: 'Tanggal panen tidak boleh sebelum tanggal ayam masuk' },
              { status: 400 }
            )
          }
        }
      }
    }

    const batch = await db.batch.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(terminNumber !== undefined && { terminNumber: parseInt(terminNumber) }),
        ...(arrivalDate !== undefined && { arrivalDate: new Date(arrivalDate) }),
        ...(initialWeight !== undefined && { initialWeight: Math.round(parseFloat(initialWeight) * 1000) / 1000 }),
        ...(quantity !== undefined && { quantity: parseInt(quantity) }),
        ...(status !== undefined && { status }),
        ...(harvestDate !== undefined && { harvestDate: harvestDate ? new Date(harvestDate) : null }),
        ...(harvestWeight !== undefined && { harvestWeight: harvestWeight ? parseFloat(harvestWeight) : null }),
        ...(harvestQuantity !== undefined && { harvestQuantity: harvestQuantity ? parseInt(harvestQuantity) : null }),
        ...(sellingPricePerKg !== undefined && { sellingPricePerKg: sellingPricePerKg ? parseFloat(sellingPricePerKg) : null }),
        ...(notes !== undefined && { notes }),
      },
    })

    return NextResponse.json(batch)
  } catch (error) {
    console.error('Error updating batch:', error)
    return NextResponse.json({ error: 'Failed to update batch' }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.batch.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting batch:', error)
    return NextResponse.json({ error: 'Failed to delete batch' }, { status: 500 })
  }
}
